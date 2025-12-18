from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
from database import get_sync_db
from models import Region, User
from schemas import RegionCreate, RegionUpdate, RegionResponse

router = APIRouter()

@router.get("/", response_model=List[RegionResponse])
async def list_regions(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """List all regions for the tenant"""
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant_id is required"
        )
    
    query = db.query(Region).filter(Region.tenant_id == tenant_id)
    
    if active_only:
        query = query.filter(Region.is_active == True)
        
    regions = query.order_by(Region.name).offset(skip).limit(limit).all()
    return regions

@router.post("/", response_model=RegionResponse)
async def create_region(
    region: RegionCreate,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Create a new region"""
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant_id is required"
        )
    
    # Verify uniqueness
    existing = db.query(Region).filter(
        Region.tenant_id == tenant_id,
        func.lower(Region.name) == region.name.lower()
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Region with name '{region.name}' already exists"
        )
        
    db_region = Region(
        tenant_id=tenant_id,
        **region.model_dump()
    )
    
    db.add(db_region)
    db.commit()
    db.refresh(db_region)
    return db_region

@router.put("/{region_id}", response_model=RegionResponse)
async def update_region(
    region_id: UUID,
    region_update: RegionUpdate,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Update a region"""
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant_id is required"
        )
    
    db_region = db.query(Region).filter(
        Region.id == region_id,
        Region.tenant_id == tenant_id
    ).first()
    
    if not db_region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
        
    # Check name uniqueness if name is being updated
    if region_update.name and region_update.name.lower() != db_region.name.lower():
        existing = db.query(Region).filter(
            Region.tenant_id == tenant_id,
            func.lower(Region.name) == region_update.name.lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Region with name '{region_update.name}' already exists"
            )

    update_data = region_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_region, field, value)
        
    db.commit()
    db.refresh(db_region)
    return db_region

@router.delete("/{region_id}")
async def delete_region(
    region_id: UUID,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Delete a region (soft delete preferred, but hard delete allowed if unused)"""
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="tenant_id is required"
        )
    
    db_region = db.query(Region).filter(
        Region.id == region_id,
        Region.tenant_id == tenant_id
    ).first()
    
    if not db_region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
        
    # TODO: Check if region is in use by employees or policies before deleting?
    # For now, we'll allow deletion
    
    db.delete(db_region)
    db.commit()
    return {"message": "Region deleted successfully"}
