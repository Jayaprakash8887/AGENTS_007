"""
Duplicate claim detection service

Checks for potential duplicate claims based on:
- Amount
- Expense Date (claim_date)
- Transaction Reference ID
"""
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from decimal import Decimal
import logging

from models import Claim

logger = logging.getLogger(__name__)


async def check_duplicate_claim(
    db: AsyncSession,
    employee_id: UUID,
    amount: float,
    claim_date: date,
    transaction_ref: Optional[str] = None,
    exclude_claim_id: Optional[UUID] = None,
    tenant_id: Optional[UUID] = None
) -> Dict[str, Any]:
    """
    Check for duplicate claims for the same employee.
    
    Args:
        db: Database session
        employee_id: UUID of the employee
        amount: Claim amount
        claim_date: Date of the expense
        transaction_ref: Transaction reference ID (optional)
        exclude_claim_id: Claim ID to exclude (for updates)
        tenant_id: Tenant ID for multi-tenant filtering
    
    Returns:
        {
            "is_duplicate": bool,
            "duplicate_claims": List[Dict],  # Matching claims info
            "match_type": str | None  # "exact" | "partial" | None
        }
    """
    result = {
        "is_duplicate": False,
        "duplicate_claims": [],
        "match_type": None
    }
    
    try:
        # Build base query - find claims for same employee with same amount and date
        # Exclude rejected claims from duplicate check
        query = select(Claim).where(
            and_(
                Claim.employee_id == employee_id,
                Claim.amount == Decimal(str(amount)),
                Claim.claim_date == claim_date,
                Claim.status != "REJECTED"  # Don't consider rejected claims
            )
        )
        
        # Exclude current claim if updating
        if exclude_claim_id:
            query = query.where(Claim.id != exclude_claim_id)
        
        # Filter by tenant if provided
        if tenant_id:
            query = query.where(Claim.tenant_id == tenant_id)
        
        # Execute query
        db_result = await db.execute(query)
        matching_claims = db_result.scalars().all()
        
        if not matching_claims:
            return result
        
        # Check for exact matches (same transaction_ref)
        exact_matches = []
        partial_matches = []
        
        for claim in matching_claims:
            claim_info = {
                "claim_id": str(claim.id),
                "claim_number": claim.claim_number,
                "amount": float(claim.amount),
                "claim_date": claim.claim_date.isoformat() if claim.claim_date else None,
                "transaction_ref": claim.claim_payload.get("transaction_ref") if claim.claim_payload else None,
                "status": claim.status,
                "submitted_on": claim.submission_date.isoformat() if claim.submission_date else None
            }
            
            existing_txn_ref = claim.claim_payload.get("transaction_ref") if claim.claim_payload else None
            
            # Check for exact match: same transaction_ref (both non-empty and equal)
            if transaction_ref and existing_txn_ref:
                if transaction_ref.strip().lower() == existing_txn_ref.strip().lower():
                    exact_matches.append(claim_info)
                else:
                    partial_matches.append(claim_info)
            else:
                # If either transaction_ref is missing, it's a partial match
                partial_matches.append(claim_info)
        
        if exact_matches:
            result["is_duplicate"] = True
            result["match_type"] = "exact"
            result["duplicate_claims"] = exact_matches
            logger.warning(
                f"Exact duplicate found for employee {employee_id}: "
                f"amount={amount}, date={claim_date}, txn_ref={transaction_ref}"
            )
        elif partial_matches:
            result["is_duplicate"] = True
            result["match_type"] = "partial"
            result["duplicate_claims"] = partial_matches
            logger.info(
                f"Partial duplicate found for employee {employee_id}: "
                f"amount={amount}, date={claim_date}"
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Error checking for duplicate claims: {e}")
        # Don't block claim creation on duplicate check errors
        return result


async def check_batch_duplicates(
    db: AsyncSession,
    employee_id: UUID,
    claims_data: List[Dict[str, Any]],
    tenant_id: Optional[UUID] = None
) -> Dict[str, Any]:
    """
    Check for duplicates in a batch of claims.
    
    Also checks for duplicates within the batch itself.
    
    Args:
        db: Database session
        employee_id: UUID of the employee
        claims_data: List of claim data dicts with 'amount', 'claim_date', 'transaction_ref'
        tenant_id: Tenant ID for multi-tenant filtering
    
    Returns:
        {
            "has_duplicates": bool,
            "exact_duplicates": List[int],  # Indices of claims with exact duplicates
            "partial_duplicates": List[int],  # Indices with partial duplicates
            "duplicate_details": Dict[int, Dict]  # Index -> duplicate info
        }
    """
    result = {
        "has_duplicates": False,
        "exact_duplicates": [],
        "partial_duplicates": [],
        "duplicate_details": {}
    }
    
    # First, check for duplicates within the batch itself
    seen_claims = {}  # key: (amount, date, txn_ref) -> index
    
    for idx, claim_data in enumerate(claims_data):
        amount = claim_data.get("amount")
        claim_date = claim_data.get("claim_date")
        transaction_ref = claim_data.get("transaction_ref")
        
        # Create key for deduplication
        key = (float(amount), str(claim_date), (transaction_ref or "").strip().lower())
        
        if key in seen_claims and transaction_ref:
            # Duplicate within batch
            result["has_duplicates"] = True
            result["exact_duplicates"].append(idx)
            result["duplicate_details"][idx] = {
                "match_type": "batch_duplicate",
                "duplicate_of_index": seen_claims[key],
                "message": f"Duplicate of claim #{seen_claims[key] + 1} in this batch"
            }
        else:
            seen_claims[key] = idx
        
        # Check against existing claims in database
        dup_check = await check_duplicate_claim(
            db=db,
            employee_id=employee_id,
            amount=amount,
            claim_date=claim_date,
            transaction_ref=transaction_ref,
            tenant_id=tenant_id
        )
        
        if dup_check["is_duplicate"]:
            result["has_duplicates"] = True
            if dup_check["match_type"] == "exact":
                if idx not in result["exact_duplicates"]:
                    result["exact_duplicates"].append(idx)
            else:
                if idx not in result["partial_duplicates"]:
                    result["partial_duplicates"].append(idx)
            
            result["duplicate_details"][idx] = {
                "match_type": dup_check["match_type"],
                "duplicate_claims": dup_check["duplicate_claims"],
                "message": _get_duplicate_message(dup_check)
            }
    
    return result


def _get_duplicate_message(dup_check: Dict[str, Any]) -> str:
    """Generate human-readable message for duplicate detection result."""
    if not dup_check.get("duplicate_claims"):
        return ""
    
    first_dup = dup_check["duplicate_claims"][0]
    claim_number = first_dup.get("claim_number", "Unknown")
    
    if dup_check["match_type"] == "exact":
        return f"Exact duplicate of existing claim {claim_number}"
    else:
        return f"Potential duplicate of existing claim {claim_number} (same amount and date)"
