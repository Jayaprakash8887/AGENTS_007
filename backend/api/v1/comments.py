"""
Comments API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from pydantic import BaseModel

from database import get_async_db
from models import Comment, Claim, User
from api.v1.auth import require_tenant_id

router = APIRouter()


class CommentCreate(BaseModel):
    """Schema for creating a comment"""
    claim_id: UUID
    tenant_id: UUID
    comment_text: str
    comment_type: str = "GENERAL"
    user_name: str
    user_role: str
    visible_to_employee: bool = True


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: UUID
    claim_id: UUID
    comment_text: str
    comment_type: str
    user_id: Optional[UUID] = None
    user_name: str
    user_role: str
    visible_to_employee: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CommentResponse])
async def list_comments(
    tenant_id: UUID,
    claim_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_async_db),
):
    """List comments, filtered by tenant_id and optionally by claim_id"""
    require_tenant_id(tenant_id)
    
    query = select(Comment).where(Comment.tenant_id == tenant_id)
    
    if claim_id:
        query = query.where(Comment.claim_id == claim_id)
    
    query = query.order_by(Comment.created_at.desc())
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    return comments


@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_async_db),
):
    """Get a specific comment by ID"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comment not found: {comment_id}"
        )
    
    return comment


@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    db: AsyncSession = Depends(get_async_db),
):
    """Create a new comment on a claim"""
    require_tenant_id(comment_data.tenant_id)
    
    # Verify claim exists
    result = await db.execute(select(Claim).where(Claim.id == comment_data.claim_id))
    claim = result.scalar_one_or_none()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim not found: {comment_data.claim_id}"
        )
    
    # Find user by name or get the first user as fallback
    user_result = await db.execute(
        select(User).where(User.full_name == comment_data.user_name)
    )
    user = user_result.scalar_one_or_none()
    
    # If no exact match, try to find by partial name
    if not user:
        user_result = await db.execute(
            select(User).where(User.full_name.ilike(f"%{comment_data.user_name.split()[0]}%"))
        )
        user = user_result.scalar_one_or_none()
    
    # If still no user, get first available user
    if not user:
        user_result = await db.execute(select(User).limit(1))
        user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No users exist in the system. Please create users first."
        )
    
    # Create comment
    comment = Comment(
        id=uuid4(),
        tenant_id=comment_data.tenant_id,
        claim_id=comment_data.claim_id,
        comment_text=comment_data.comment_text,
        comment_type=comment_data.comment_type,
        user_id=user.id,  # Use actual user ID
        user_name=comment_data.user_name,
        user_role=comment_data.user_role,
        visible_to_employee=comment_data.visible_to_employee,
        created_at=datetime.utcnow(),
    )
    
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_async_db),
):
    """Delete a comment"""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Comment not found: {comment_id}"
        )
    
    await db.delete(comment)
    await db.commit()
