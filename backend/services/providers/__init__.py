"""
Multi-vendor provider abstraction layer

Supports multiple cloud platforms and AI services:
- Storage: GCS, Azure Blob, AWS S3, Local
- LLM: Google Gemini, OpenAI, Azure OpenAI, Anthropic Claude, AWS Bedrock
- Vision/OCR: Google Vision, Azure Computer Vision, AWS Textract
"""

from services.providers.storage_provider import (
    StorageProvider,
    get_storage_provider,
)
from services.providers.llm_provider import (
    LLMProvider,
    get_llm_provider,
)
from services.providers.vision_provider import (
    VisionProvider,
    get_vision_provider,
)

__all__ = [
    "StorageProvider",
    "get_storage_provider",
    "LLMProvider", 
    "get_llm_provider",
    "VisionProvider",
    "get_vision_provider",
]
