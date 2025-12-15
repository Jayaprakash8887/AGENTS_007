"""
AI Analysis Service

Generates AI analysis metadata for claims including:
- Confidence score (0.0 - 1.0)
- AI recommendation (approve/review)
- Scoring factors breakdown

Configuration is read from settings (config.py) which can be overridden via environment variables.
"""
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import date
import logging

from config import get_settings

logger = logging.getLogger(__name__)


def get_scoring_weights() -> Dict[str, float]:
    """Get scoring weights from configuration."""
    settings = get_settings()
    return settings.ai_scoring_weights


def get_category_limits() -> Dict[str, int]:
    """Get category limits from configuration."""
    settings = get_settings()
    return settings.ai_category_limits


def get_ai_thresholds() -> Dict[str, float]:
    """Get AI recommendation thresholds from configuration."""
    settings = get_settings()
    return {
        "auto_approve": settings.AI_THRESHOLD_AUTO_APPROVE,
        "quick_review": settings.AI_THRESHOLD_QUICK_REVIEW,
    }


# Default fallback values (used if config is not available)
DEFAULT_SCORING_WEIGHTS = {
    "document_attached": 0.20,
    "data_completeness": 0.25,
    "ocr_confidence": 0.20,
    "amount_reasonability": 0.15,
    "duplicate_risk": 0.10,
    "category_match": 0.10,
}

DEFAULT_CATEGORY_LIMITS = {
    "TRAVEL": 50000,
    "FOOD": 5000,
    "TEAM_LUNCH": 10000,
    "CERTIFICATION": 100000,
    "ACCOMMODATION": 20000,
    "EQUIPMENT": 50000,
    "SOFTWARE": 30000,
    "OFFICE_SUPPLIES": 5000,
    "MEDICAL": 25000,
    "MOBILE": 2000,
    "PASSPORT_VISA": 15000,
    "CONVEYANCE": 3000,
    "CLIENT_MEETING": 20000,
    "OTHER": 10000,
}

# Valid categories for each claim type
VALID_CATEGORIES = {
    "REIMBURSEMENT": [
        "TRAVEL", "FOOD", "TEAM_LUNCH", "CERTIFICATION", "ACCOMMODATION",
        "EQUIPMENT", "SOFTWARE", "OFFICE_SUPPLIES", "MEDICAL", "MOBILE",
        "PASSPORT_VISA", "CONVEYANCE", "CLIENT_MEETING", "OTHER"
    ],
    "ALLOWANCE": [
        "ONCALL", "OVERTIME", "SHIFT", "FOOD", "INTERNET", "MOBILE", "OTHER"
    ],
}


def generate_ai_analysis(
    claim_data: Dict[str, Any],
    has_document: bool = False,
    ocr_confidence: Optional[float] = None,
    is_potential_duplicate: bool = False
) -> Dict[str, Any]:
    """
    Generate AI analysis metadata for a claim.
    
    Args:
        claim_data: Dictionary containing claim information:
            - amount: float
            - category: str
            - claim_type: str (REIMBURSEMENT or ALLOWANCE)
            - claim_date: date
            - description: str (optional)
            - vendor: str (optional)
            - transaction_ref: str (optional)
            - title: str (optional)
        has_document: Whether claim has attached document
        ocr_confidence: OCR confidence score if document was processed
        is_potential_duplicate: Whether flagged as potential duplicate
    
    Returns:
        Dictionary with ai_confidence, ai_recommendation, and factor breakdown
    """
    # Load configuration
    try:
        scoring_weights = get_scoring_weights()
        thresholds = get_ai_thresholds()
    except Exception as e:
        logger.warning(f"Failed to load AI config, using defaults: {e}")
        scoring_weights = DEFAULT_SCORING_WEIGHTS
        thresholds = {"auto_approve": 90.0, "quick_review": 70.0}
    
    factors = {}
    
    # 1. Document Attached Score
    doc_score, doc_message = _score_document(has_document)
    factors["document_attached"] = {
        "score": doc_score,
        "weight": scoring_weights.get("document_attached", 0.20),
        "message": doc_message
    }
    
    # 2. Data Completeness Score
    completeness_score, completeness_message = _score_data_completeness(claim_data)
    factors["data_completeness"] = {
        "score": completeness_score,
        "weight": scoring_weights.get("data_completeness", 0.25),
        "message": completeness_message
    }
    
    # 3. OCR Confidence Score
    ocr_score, ocr_message = _score_ocr_confidence(ocr_confidence, has_document, claim_data)
    factors["ocr_confidence"] = {
        "score": ocr_score,
        "weight": scoring_weights.get("ocr_confidence", 0.20),
        "message": ocr_message
    }
    
    # 4. Amount Reasonability Score
    amount_score, amount_message = _score_amount_reasonability(claim_data)
    factors["amount_reasonability"] = {
        "score": amount_score,
        "weight": scoring_weights.get("amount_reasonability", 0.15),
        "message": amount_message
    }
    
    # 5. Duplicate Risk Score
    dup_score, dup_message = _score_duplicate_risk(is_potential_duplicate)
    factors["duplicate_risk"] = {
        "score": dup_score,
        "weight": scoring_weights.get("duplicate_risk", 0.10),
        "message": dup_message
    }
    
    # 6. Category Match Score
    cat_score, cat_message = _score_category_match(claim_data)
    factors["category_match"] = {
        "score": cat_score,
        "weight": scoring_weights.get("category_match", 0.10),
        "message": cat_message
    }
    
    # Calculate weighted average
    total_score = sum(
        factors[key]["score"] * factors[key]["weight"]
        for key in factors
    )
    
    # Normalize to percentage (0-100 for frontend display)
    ai_confidence = round(total_score * 100, 1)
    
    # Determine recommendation based on configurable thresholds
    auto_approve_threshold = thresholds.get("auto_approve", 90.0)
    quick_review_threshold = thresholds.get("quick_review", 70.0)
    
    if ai_confidence >= auto_approve_threshold:
        ai_recommendation = "approve"
        recommendation_text = "Auto-approve recommended"
    elif ai_confidence >= quick_review_threshold:
        ai_recommendation = "review"
        recommendation_text = "Quick review recommended"
    else:
        ai_recommendation = "review"
        recommendation_text = "Manual review required"
    
    return {
        "ai_confidence": ai_confidence,
        "ai_recommendation": ai_recommendation,
        "recommendation_text": recommendation_text,
        "factors": factors,
        "analysis_version": "1.1",
        "thresholds": {
            "auto_approve": auto_approve_threshold,
            "quick_review": quick_review_threshold
        }
    }


def _score_document(has_document: bool) -> tuple:
    """Score based on document attachment."""
    if has_document:
        return 1.0, "Document attached"
    return 0.4, "No supporting document"


def _score_data_completeness(claim_data: Dict[str, Any]) -> tuple:
    """Score based on data completeness."""
    required_fields = ["amount", "category", "claim_date"]
    optional_fields = ["description", "vendor", "transaction_ref", "title"]
    
    # Check required fields
    required_present = sum(
        1 for f in required_fields
        if claim_data.get(f) is not None and claim_data.get(f) != ""
    )
    required_score = required_present / len(required_fields)
    
    # Check optional fields
    optional_present = sum(
        1 for f in optional_fields
        if claim_data.get(f) is not None and claim_data.get(f) != ""
    )
    optional_score = optional_present / len(optional_fields)
    
    # Weighted: 70% required, 30% optional
    total_score = (required_score * 0.7) + (optional_score * 0.3)
    
    if total_score >= 0.9:
        message = "All fields complete"
    elif total_score >= 0.7:
        message = "Most fields complete"
    elif total_score >= 0.5:
        message = "Some fields missing"
    else:
        message = "Incomplete data"
    
    return total_score, message


def _score_ocr_confidence(
    ocr_confidence: Optional[float],
    has_document: bool,
    claim_data: Dict[str, Any]
) -> tuple:
    """Score based on OCR confidence or data source."""
    # Check if any fields were OCR extracted
    ocr_fields = [
        claim_data.get("amount_source"),
        claim_data.get("date_source"),
        claim_data.get("vendor_source"),
        claim_data.get("category_source"),
    ]
    
    has_ocr_data = any(f == "ocr" for f in ocr_fields if f)
    
    if ocr_confidence is not None:
        # Use actual OCR confidence
        return ocr_confidence, f"OCR confidence: {int(ocr_confidence * 100)}%"
    elif has_ocr_data:
        # OCR was used but no explicit confidence - assume moderate
        return 0.75, "Auto-extracted data"
    elif has_document:
        # Document attached but not OCR processed
        return 0.6, "Document not processed"
    else:
        # Manual entry - full confidence in user input
        return 0.85, "Manual data entry"


def _score_amount_reasonability(claim_data: Dict[str, Any]) -> tuple:
    """Score based on amount being within policy limits."""
    amount = claim_data.get("amount", 0)
    if isinstance(amount, Decimal):
        amount = float(amount)
    
    # Load category limits from configuration
    try:
        category_limits = get_category_limits()
    except Exception as e:
        logger.warning(f"Failed to load category limits, using defaults: {e}")
        category_limits = DEFAULT_CATEGORY_LIMITS
    
    category = str(claim_data.get("category", "OTHER")).upper()
    default_limit = category_limits.get("OTHER", 10000)
    limit = category_limits.get(category, default_limit)
    
    if amount <= 0:
        return 0.3, "Invalid amount"
    elif amount <= limit * 0.5:
        return 1.0, "Well within limit"
    elif amount <= limit * 0.8:
        return 0.9, "Within limit"
    elif amount <= limit:
        return 0.7, "Near limit"
    else:
        return 0.3, f"Exceeds limit (₹{limit:,})"


def _score_duplicate_risk(is_potential_duplicate: bool) -> tuple:
    """Score based on duplicate detection."""
    if is_potential_duplicate:
        return 0.3, "Potential duplicate detected"
    return 1.0, "No duplicates found"


def _score_category_match(claim_data: Dict[str, Any]) -> tuple:
    """Score based on category validity."""
    claim_type = str(claim_data.get("claim_type", "REIMBURSEMENT")).upper()
    category = str(claim_data.get("category", "OTHER")).upper()
    
    valid_cats = VALID_CATEGORIES.get(claim_type, VALID_CATEGORIES["REIMBURSEMENT"])
    
    if category in valid_cats:
        return 1.0, "Valid category"
    else:
        return 0.6, "Category may not apply"


def update_claim_with_ai_analysis(
    claim_payload: Dict[str, Any],
    claim_data: Dict[str, Any],
    has_document: bool = False,
    ocr_confidence: Optional[float] = None,
    is_potential_duplicate: bool = False
) -> Dict[str, Any]:
    """
    Update claim_payload with AI analysis metadata.
    
    Returns updated claim_payload dictionary.
    """
    ai_analysis = generate_ai_analysis(
        claim_data=claim_data,
        has_document=has_document,
        ocr_confidence=ocr_confidence,
        is_potential_duplicate=is_potential_duplicate
    )
    
    payload = dict(claim_payload or {})
    payload["ai_analysis"] = ai_analysis
    
    logger.info(
        f"Generated AI analysis: confidence={ai_analysis['ai_confidence']}%, "
        f"recommendation={ai_analysis['ai_recommendation']}"
    )
    
    return payload
