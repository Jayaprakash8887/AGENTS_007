"""
Dashboard and analytics endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from uuid import UUID

from database import get_sync_db
from models import Claim, User, Approval, AgentExecution

# Employee is now an alias for User (tables merged)
Employee = User

router = APIRouter()


@router.get("/summary")
async def get_dashboard_summary(
    employee_id: str = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get dashboard summary statistics"""
    
    # Base query conditions
    base_conditions = []
    if tenant_id:
        base_conditions.append(Claim.tenant_id == tenant_id)
    if employee_id:
        base_conditions.append(Claim.employee_id == employee_id)
    
    # Total claims
    query = db.query(func.count(Claim.id))
    if base_conditions:
        query = query.filter(and_(*base_conditions))
    total_claims = query.scalar() or 0
    
    # Pending claims
    pending_conditions = base_conditions + [Claim.status.in_(['PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE'])]
    pending_claims = db.query(func.count(Claim.id)).filter(
        and_(*pending_conditions)
    ).scalar() or 0
    
    # Approved claims (this month)
    first_day_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    approved_conditions = base_conditions + [
        Claim.status == 'FINANCE_APPROVED',
        Claim.updated_at >= first_day_of_month
    ]
    approved_this_month = db.query(func.count(Claim.id)).filter(
        and_(*approved_conditions)
    ).scalar() or 0
    
    # Total amount claimed (this month) - convert to INR
    amount_conditions = base_conditions + [Claim.submission_date >= first_day_of_month]
    total_amount_query = db.query(
        func.sum(Claim.amount)
    ).filter(and_(*amount_conditions))
    total_amount = total_amount_query.scalar() or 0
    
    # Average processing time (in days)
    avg_processing_time = 3.5  # TODO: Calculate actual average
    
    return {
        "total_claims": total_claims,
        "pending_claims": pending_claims,
        "approved_this_month": approved_this_month,
        "total_amount_claimed": float(total_amount),
        "average_processing_time_days": avg_processing_time
    }


@router.get("/claims-by-status")
async def get_claims_by_status(
    employee_id: str = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get claim counts grouped by status"""
    
    query = db.query(
        Claim.status,
        func.count(Claim.id).label('count')
    )
    
    if tenant_id:
        query = query.filter(Claim.tenant_id == tenant_id)
    
    if employee_id:
        query = query.filter(Claim.employee_id == employee_id)
    
    results = query.group_by(Claim.status).all()
    
    return [{"status": status, "count": count} for status, count in results]


@router.get("/claims-by-category")
async def get_claims_by_category(
    employee_id: str = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get claim counts and amounts grouped by category"""
    
    query = db.query(
        Claim.category,
        func.count(Claim.id).label('count'),
        func.sum(Claim.amount).label('total_amount')
    )
    
    if tenant_id:
        query = query.filter(Claim.tenant_id == tenant_id)
    
    if employee_id:
        query = query.filter(Claim.employee_id == employee_id)
    
    results = query.group_by(Claim.category).all()
    
    return [
        {
            "category": category,
            "count": count,
            "total_amount": float(total_amount or 0)
        }
        for category, count, total_amount in results
    ]


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 10,
    employee_id: str = None,
    status: str = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get recent claim activities"""
    
    query = db.query(Claim)
    
    if tenant_id:
        query = query.filter(Claim.tenant_id == tenant_id)
    
    if employee_id:
        query = query.filter(Claim.employee_id == employee_id)
    
    if status:
        query = query.filter(Claim.status == status)
    
    recent_claims = query.order_by(
        Claim.updated_at.desc()
    ).limit(limit).all()
    
    activities = []
    for claim in recent_claims:
        activities.append({
            "id": str(claim.id),
            "claim_number": claim.claim_number,
            "employee_name": claim.employee_name,
            "category": claim.category,
            "amount": float(claim.amount),
            "currency": claim.currency or "INR",
            "status": claim.status,
            "updated_at": claim.updated_at.isoformat()
        })
    
    return activities


@router.get("/ai-metrics")
async def get_ai_metrics(
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get AI processing metrics"""
    
    # Base query with tenant filter
    base_query = db.query(AgentExecution)
    if tenant_id:
        base_query = base_query.filter(AgentExecution.tenant_id == tenant_id)
    
    # Total AI processed claims
    total_ai_processed = base_query.count() or 0
    
    # Average confidence score
    avg_confidence = db.query(func.avg(AgentExecution.confidence_score))
    if tenant_id:
        avg_confidence = avg_confidence.filter(AgentExecution.tenant_id == tenant_id)
    avg_confidence = avg_confidence.scalar() or 0
    
    # Success rate
    success_query = db.query(func.count(AgentExecution.id)).filter(
        AgentExecution.status == 'COMPLETED'
    )
    if tenant_id:
        success_query = success_query.filter(AgentExecution.tenant_id == tenant_id)
    successful_executions = success_query.scalar() or 0
    
    success_rate = (successful_executions / total_ai_processed * 100) if total_ai_processed > 0 else 0
    
    return {
        "total_ai_processed": total_ai_processed,
        "average_confidence_score": float(avg_confidence),
        "success_rate_percentage": float(success_rate),
        "total_time_saved_hours": total_ai_processed * 0.5  # Estimated time saved per claim
    }


@router.get("/pending-approvals")
async def get_pending_approvals_count(
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get pending approvals count by level based on claim status"""
    
    # Count claims by pending status
    manager_query = db.query(func.count(Claim.id)).filter(
        Claim.status == 'PENDING_MANAGER'
    )
    if tenant_id:
        manager_query = manager_query.filter(Claim.tenant_id == tenant_id)
    manager_pending = manager_query.scalar() or 0
    
    hr_query = db.query(func.count(Claim.id)).filter(
        Claim.status == 'PENDING_HR'
    )
    if tenant_id:
        hr_query = hr_query.filter(Claim.tenant_id == tenant_id)
    hr_pending = hr_query.scalar() or 0
    
    finance_query = db.query(func.count(Claim.id)).filter(
        Claim.status == 'PENDING_FINANCE'
    )
    if tenant_id:
        finance_query = finance_query.filter(Claim.tenant_id == tenant_id)
    finance_pending = finance_query.scalar() or 0
    
    total_pending = manager_pending + hr_pending + finance_pending
    
    return {
        "manager_pending": manager_pending,
        "hr_pending": hr_pending,
        "finance_pending": finance_pending,
        "total_pending": total_pending
    }


@router.get("/allowance-summary")
async def get_allowance_summary(
    employee_id: str = None,
    tenant_id: Optional[UUID] = None,
    db: Session = Depends(get_sync_db)
):
    """Get allowance summary by category"""
    
    # Base query for allowance claims
    query = db.query(
        Claim.category,
        func.count(Claim.id).label('total_count'),
        func.sum(
            func.case(
                (Claim.status.in_(['PENDING_MANAGER', 'PENDING_HR', 'PENDING_FINANCE']), 1),
                else_=0
            )
        ).label('pending_count'),
        func.sum(
            func.case(
                (Claim.status == 'FINANCE_APPROVED', 1),
                else_=0
            )
        ).label('approved_count'),
        func.sum(Claim.amount).label('total_value')
    ).filter(
        Claim.claim_type == 'ALLOWANCE'
    )
    
    if tenant_id:
        query = query.filter(Claim.tenant_id == tenant_id)
    
    if employee_id:
        query = query.filter(Claim.employee_id == employee_id)
    
    # Filter for current month
    first_day_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    query = query.filter(Claim.created_at >= first_day_of_month)
    
    results = query.group_by(Claim.category).all()
    
    allowances = []
    for category, total, pending, approved, value in results:
        allowances.append({
            "category": category,
            "total": int(total or 0),
            "pending": int(pending or 0),
            "approved": int(approved or 0),
            "total_value": float(value or 0)
        })
    
    return allowances
