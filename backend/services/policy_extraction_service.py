"""
Policy Extraction Service
Uses AI (Gemini) to extract claim categories and rules from policy documents.
"""
import os
import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from models import PolicyUpload, PolicyCategory
from config import settings

logger = logging.getLogger(__name__)


# Default categories if AI extraction fails
DEFAULT_CATEGORIES = [
    {
        "category_name": "Travel",
        "category_code": "TRAVEL",
        "category_type": "REIMBURSEMENT",
        "description": "Travel expenses including transportation, accommodation, and meals during business trips",
        "max_amount": 50000,
        "requires_receipt": True,
        "frequency_limit": "MONTHLY",
        "submission_window_days": 30
    },
    {
        "category_name": "Certification",
        "category_code": "CERTIFICATION",
        "category_type": "REIMBURSEMENT",
        "description": "Professional certification and course fees",
        "max_amount": 25000,
        "requires_receipt": True,
        "frequency_limit": "YEARLY",
        "submission_window_days": 60
    },
    {
        "category_name": "Team Lunch",
        "category_code": "TEAM_LUNCH",
        "category_type": "REIMBURSEMENT",
        "description": "Team lunch and celebration expenses",
        "max_amount": 5000,
        "requires_receipt": True,
        "frequency_limit": "MONTHLY",
        "submission_window_days": 15
    },
    {
        "category_name": "Food",
        "category_code": "FOOD",
        "category_type": "REIMBURSEMENT",
        "description": "Meal expenses during work hours",
        "max_amount": 3000,
        "requires_receipt": True,
        "frequency_limit": "MONTHLY",
        "submission_window_days": 15
    },
    {
        "category_name": "On-Call Allowance",
        "category_code": "ONCALL",
        "category_type": "ALLOWANCE",
        "description": "Allowance for on-call duty",
        "max_amount": 10000,
        "requires_receipt": False,
        "frequency_limit": "MONTHLY"
    },
    {
        "category_name": "Internet Allowance",
        "category_code": "INTERNET",
        "category_type": "ALLOWANCE",
        "description": "Monthly internet reimbursement for work from home",
        "max_amount": 1500,
        "requires_receipt": True,
        "frequency_limit": "MONTHLY"
    },
    {
        "category_name": "Mobile Allowance",
        "category_code": "MOBILE",
        "category_type": "ALLOWANCE",
        "description": "Mobile phone bill reimbursement",
        "max_amount": 1000,
        "requires_receipt": True,
        "frequency_limit": "MONTHLY"
    },
    {
        "category_name": "Conveyance",
        "category_code": "CONVEYANCE",
        "category_type": "ALLOWANCE",
        "description": "Daily commute expenses",
        "max_amount": 5000,
        "requires_receipt": False,
        "frequency_limit": "MONTHLY"
    },
    {
        "category_name": "Relocation",
        "category_code": "RELOCATION",
        "category_type": "REIMBURSEMENT",
        "description": "Relocation expenses for job transfer",
        "max_amount": 100000,
        "requires_receipt": True,
        "frequency_limit": "ONCE",
        "submission_window_days": 90
    },
    {
        "category_name": "Equipment",
        "category_code": "EQUIPMENT",
        "category_type": "REIMBURSEMENT",
        "description": "Work equipment and supplies",
        "max_amount": 15000,
        "requires_receipt": True,
        "frequency_limit": "YEARLY"
    }
]


class PolicyExtractionService:
    """Service to extract policy categories using AI"""
    
    def __init__(self, db: Session):
        self.db = db
        self.gemini_client = None
        self._init_gemini()
    
    def _init_gemini(self):
        """Initialize Gemini client"""
        try:
            import google.generativeai as genai
            # Try multiple possible API key names
            api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or getattr(settings, 'GOOGLE_API_KEY', None)
            if api_key:
                genai.configure(api_key=api_key)
                # Use model from settings, default to gemini-2.0-flash-exp
                model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-2.0-flash-exp')
                self.gemini_client = genai.GenerativeModel(model_name)
                logger.info(f"Gemini client initialized for policy extraction with model: {model_name}")
            else:
                logger.warning("GEMINI/GOOGLE_API_KEY not found, will use default categories")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
    
    async def extract_and_save_categories(self, policy_id: UUID) -> List[PolicyCategory]:
        """Extract categories from policy document and save to database"""
        policy = self.db.query(PolicyUpload).filter(PolicyUpload.id == policy_id).first()
        if not policy:
            raise ValueError(f"Policy {policy_id} not found")
        
        try:
            # Delete existing categories for re-extraction
            existing_categories = self.db.query(PolicyCategory).filter(
                PolicyCategory.policy_upload_id == policy_id
            ).all()
            if existing_categories:
                logger.info(f"Deleting {len(existing_categories)} existing categories for re-extraction")
                for cat in existing_categories:
                    self.db.delete(cat)
                self.db.flush()
            
            # Extract text from document
            extracted_text = await self._extract_text(policy)
            policy.extracted_text = extracted_text
            
            # Use AI to extract categories
            if self.gemini_client and extracted_text:
                logger.info(f"Using AI to extract categories from {len(extracted_text)} chars of text")
                categories_data = await self._extract_categories_with_ai(extracted_text, policy.description)
                logger.info(f"AI extracted {len(categories_data)} categories")
            else:
                # Use default categories
                logger.info("Using default categories (no AI or no text)")
                categories_data = DEFAULT_CATEGORIES
            
            # Save extracted data
            policy.extracted_data = {
                "categories": categories_data,
                "extracted_at": datetime.utcnow().isoformat()
            }
            policy.extracted_at = datetime.utcnow()
            policy.status = "EXTRACTED"
            
            # Create category records
            categories = []
            for idx, cat_data in enumerate(categories_data):
                category = PolicyCategory(
                    tenant_id=policy.tenant_id,
                    policy_upload_id=policy.id,
                    category_name=cat_data.get("category_name", "Unknown"),
                    category_code=cat_data.get("category_code", f"CAT_{idx}"),
                    category_type=cat_data.get("category_type", "REIMBURSEMENT"),
                    description=cat_data.get("description"),
                    max_amount=cat_data.get("max_amount"),
                    min_amount=cat_data.get("min_amount"),
                    currency=cat_data.get("currency", "INR"),
                    frequency_limit=cat_data.get("frequency_limit"),
                    frequency_count=cat_data.get("frequency_count"),
                    eligibility_criteria=cat_data.get("eligibility_criteria", {}),
                    requires_receipt=cat_data.get("requires_receipt", True),
                    requires_approval_above=cat_data.get("requires_approval_above"),
                    allowed_document_types=cat_data.get("allowed_document_types", ["PDF", "JPG", "PNG"]),
                    submission_window_days=cat_data.get("submission_window_days"),
                    is_active=True,
                    display_order=idx,
                    source_text=cat_data.get("source_text"),
                    ai_confidence=cat_data.get("confidence")
                )
                self.db.add(category)
                categories.append(category)
            
            self.db.commit()
            logger.info(f"Extracted {len(categories)} categories for policy {policy_id}")
            return categories
            
        except Exception as e:
            logger.error(f"Error extracting categories: {e}")
            policy.extraction_error = str(e)
            policy.status = "EXTRACTED"  # Still mark as extracted with defaults
            
            # Use default categories on error
            for idx, cat_data in enumerate(DEFAULT_CATEGORIES):
                category = PolicyCategory(
                    tenant_id=policy.tenant_id,
                    policy_upload_id=policy.id,
                    category_name=cat_data["category_name"],
                    category_code=cat_data["category_code"],
                    category_type=cat_data["category_type"],
                    description=cat_data.get("description"),
                    max_amount=cat_data.get("max_amount"),
                    requires_receipt=cat_data.get("requires_receipt", True),
                    frequency_limit=cat_data.get("frequency_limit"),
                    submission_window_days=cat_data.get("submission_window_days"),
                    is_active=True,
                    display_order=idx
                )
                self.db.add(category)
            
            self.db.commit()
            return []
    
    async def _extract_text(self, policy: PolicyUpload) -> str:
        """Extract text from policy document"""
        if not policy.storage_path or not os.path.exists(policy.storage_path):
            logger.warning(f"Policy file not found: {policy.storage_path}")
            return ""
        
        try:
            if policy.file_type == "PDF":
                return await self._extract_pdf_text(policy.storage_path)
            elif policy.file_type == "DOCX":
                return await self._extract_docx_text(policy.storage_path)
            elif policy.file_type in ["JPG", "PNG", "JPEG"]:
                return await self._extract_image_text(policy.storage_path)
            else:
                return ""
        except Exception as e:
            logger.error(f"Error extracting text: {e}")
            return ""
    
    async def _extract_pdf_text(self, file_path: str) -> str:
        """Extract text from PDF"""
        try:
            import fitz  # PyMuPDF
            text_parts = []
            with fitz.open(file_path) as doc:
                for page in doc:
                    text_parts.append(page.get_text())
            return "\n".join(text_parts)
        except ImportError:
            logger.warning("PyMuPDF not installed, trying pdfplumber")
            try:
                import pdfplumber
                text_parts = []
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        text_parts.append(page.extract_text() or "")
                return "\n".join(text_parts)
            except ImportError:
                logger.error("No PDF library available")
                return ""
    
    async def _extract_docx_text(self, file_path: str) -> str:
        """Extract text from DOCX"""
        try:
            from docx import Document
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        except ImportError:
            logger.error("python-docx not installed")
            return ""
    
    async def _extract_image_text(self, file_path: str) -> str:
        """Extract text from image using OCR"""
        try:
            import pytesseract
            from PIL import Image
            image = Image.open(file_path)
            return pytesseract.image_to_string(image)
        except ImportError:
            logger.error("pytesseract or PIL not installed")
            return ""
    
    async def _extract_categories_with_ai(self, text: str, policy_description: str = None) -> List[Dict[str, Any]]:
        """Use Gemini to extract categories from policy text"""
        if not self.gemini_client:
            return DEFAULT_CATEGORIES
        
        # Build context from policy description if provided
        description_context = ""
        if policy_description:
            description_context = f"""

POLICY CONTEXT (provided by uploader):
{policy_description}

Use this context to better understand the policy scope and focus areas.
"""
        
        prompt = f"""
You are an expert HR policy analyst. Analyze the following document and extract ALL expense reimbursement and allowance categories mentioned.{description_context}

IMPORTANT: Look for ANY mentions of:
- Expenses that can be claimed or reimbursed
- Allowances provided to employees  
- Benefits with monetary value
- Travel-related expenses (airfare, taxi, hotels, per diem, etc.)
- Relocation benefits
- Work equipment costs
- Communication costs (mobile, internet)
- Food/meal allowances
- Training/certification costs
- On-site assignment benefits

For EACH category found, extract:
1. Category name (use clear, descriptive name)
2. Category code (short uppercase identifier)
3. Type: REIMBURSEMENT (employee pays first, gets reimbursed) or ALLOWANCE (fixed amount provided)
4. Description of what it covers
5. Maximum amount (in INR, estimate if not specified - use reasonable corporate standards)
6. Whether receipt/invoice is required (true/false)
7. Frequency: ONCE, DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, or UNLIMITED
8. Submission window in days (how many days to submit claim)
9. Any eligibility criteria (who can claim this)
10. Your confidence level (0.0 to 1.0)

Return a JSON array with this structure:
[
  {{
    "category_name": "Category Name",
    "category_code": "CATEGORY_CODE",
    "category_type": "REIMBURSEMENT",
    "description": "What this category covers",
    "max_amount": 50000,
    "requires_receipt": true,
    "frequency_limit": "MONTHLY",
    "submission_window_days": 30,
    "eligibility_criteria": {{"note": "any eligibility rules"}},
    "confidence": 0.9,
    "source_text": "relevant text from document"
  }}
]

Even if the document is a PROCESS document (not a policy document), extract any expense categories mentioned.
If amounts are in foreign currency, convert to INR using standard rates.
If amounts are not specified, use reasonable corporate defaults for India.

Document to analyze:
{text[:15000]}  

Return ONLY the valid JSON array, no explanations or other text.
"""
        
        try:
            response = self.gemini_client.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean up response - handle various markdown formats
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            categories = json.loads(response_text)
            
            # Validate and fix categories
            valid_categories = []
            for cat in categories:
                if isinstance(cat, dict) and "category_name" in cat:
                    # Ensure required fields
                    cat["category_code"] = cat.get("category_code", cat["category_name"].upper().replace(" ", "_"))
                    cat["category_type"] = cat.get("category_type", "REIMBURSEMENT")
                    if cat["category_type"] not in ["REIMBURSEMENT", "ALLOWANCE"]:
                        cat["category_type"] = "REIMBURSEMENT"
                    valid_categories.append(cat)
            
            if valid_categories:
                return valid_categories
            else:
                return DEFAULT_CATEGORIES
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            return DEFAULT_CATEGORIES
        except Exception as e:
            logger.error(f"AI extraction failed: {e}")
            return DEFAULT_CATEGORIES
