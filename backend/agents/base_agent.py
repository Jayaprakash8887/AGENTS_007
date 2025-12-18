"""
Base Agent class for all AI agents

Uses the multi-vendor LLM provider abstraction layer to support:
- Google Gemini
- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic Claude
- AWS Bedrock
- Ollama (local models)

Configuration is done via environment variables:
- LLM_PROVIDER: gemini | openai | azure_openai | anthropic | bedrock | ollama
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Union
from datetime import datetime
import logging
from config import settings

logger = logging.getLogger(__name__)

# Import provider abstraction
try:
    from services.providers.llm_provider import get_llm_provider, reset_llm_provider, LLMProvider
    USE_PROVIDER_ABSTRACTION = True
except ImportError:
    USE_PROVIDER_ABSTRACTION = False
    logger.warning("LLM Provider abstraction not available, using direct Gemini client")

# Direct Gemini import (fallback when provider abstraction unavailable)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class BaseAgent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, agent_name: str, version: str = "1.0"):
        self.agent_name = agent_name
        self.version = version
        self.logger = logging.getLogger(f"agents.{agent_name}")
        
        # Initialize LLM provider
        self._llm_provider: Optional[LLMProvider] = None
        self.model = None  # Direct Gemini model instance (fallback)
        
        if settings.ENABLE_AI_VALIDATION:
            if USE_PROVIDER_ABSTRACTION:
                try:
                    self._llm_provider = get_llm_provider()
                    self.logger.info(f"Using LLM provider: {self._llm_provider.get_model_name()}")
                except Exception as e:
                    self.logger.warning(f"Failed to initialize LLM provider: {e}, falling back to direct Gemini")
                    self._init_legacy_gemini()
            else:
                self._init_legacy_gemini()
    
    def _init_legacy_gemini(self):
        """Initialize legacy Gemini client"""
        if GEMINI_AVAILABLE:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
            self.logger.info("Using legacy Gemini client")
        else:
            self.model = None
    
    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's task
        
        Args:
            context: Dictionary containing task context and data
            
        Returns:
            Dictionary containing execution results
        """
        pass
    
    def log_execution(
        self, 
        claim_id: Optional[str], 
        status: str, 
        result_data: Dict[str, Any],
        execution_time_ms: int,
        error_message: Optional[str] = None,
        tenant_id: Optional[str] = None
    ):
        """Log agent execution for learning and monitoring"""
        try:
            from database import get_sync_db
            from models import AgentExecution, Claim
            from uuid import UUID
            
            db = next(get_sync_db())
            
            # Get tenant_id from claim if not provided
            resolved_tenant_id = None
            if tenant_id:
                resolved_tenant_id = UUID(tenant_id)
            elif claim_id:
                claim = db.query(Claim).filter(Claim.id == UUID(claim_id)).first()
                if claim:
                    resolved_tenant_id = claim.tenant_id
            
            if not resolved_tenant_id:
                self.logger.warning("No tenant_id available for logging execution")
                return
            
            execution = AgentExecution(
                tenant_id=resolved_tenant_id,
                claim_id=UUID(claim_id) if claim_id else None,
                agent_name=self.agent_name,
                agent_version=self.version,
                status=status,
                result_data=result_data,
                error_message=error_message,
                execution_time_ms=execution_time_ms,
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                confidence_score=result_data.get("confidence"),
                llm_tokens_used=result_data.get("tokens_used"),
            )
            
            db.add(execution)
            db.commit()
            
        except Exception as e:
            self.logger.error(f"Error logging execution: {e}")
    
    async def call_llm(
        self, 
        prompt: str, 
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None,
        response_format: Optional[str] = None  # 'json' or None
    ) -> str:
        """
        Call LLM with prompt (uses configured provider)
        
        Args:
            prompt: User prompt
            system_instruction: System instruction for the model
            temperature: Temperature for generation
            response_format: Response format ('json' for JSON output)
            
        Returns:
            Generated text response
        """
        # Use provider abstraction if available
        if self._llm_provider:
            try:
                return await self._llm_provider.generate(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    temperature=temperature,
                    response_format=response_format
                )
            except Exception as e:
                self.logger.error(f"LLM provider call failed: {e}")
                if self.model:
                    self.logger.info("Falling back to direct Gemini")
                else:
                    raise
        
        # Direct Gemini implementation (fallback)
        if not self.model:
            raise ValueError("LLM is not enabled")
        
        try:
            temp = temperature if temperature is not None else settings.GEMINI_TEMPERATURE
            
            if system_instruction:
                model = genai.GenerativeModel(
                    settings.GEMINI_MODEL,
                    system_instruction=system_instruction
                )
            else:
                model = self.model
            
            full_prompt = prompt
            if response_format == 'json':
                full_prompt += "\n\nRespond with valid JSON only."
            
            response = model.generate_content(
                full_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temp,
                    max_output_tokens=settings.GEMINI_MAX_TOKENS,
                )
            )
            
            return response.text
            
        except Exception as e:
            self.logger.error(f"LLM call failed: {e}")
            raise
    
    async def call_llm_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],  # bytes or base64 string
        system_instruction: Optional[str] = None,
        temperature: Optional[float] = None
    ) -> str:
        """
        Call LLM with prompt and image input (uses configured provider)
        
        Args:
            prompt: User prompt
            image_data: Image as bytes or base64 string
            system_instruction: System instruction for the model
            temperature: Temperature for generation
            
        Returns:
            Generated text response
        """
        # Use provider abstraction if available
        if self._llm_provider:
            try:
                return await self._llm_provider.generate_with_image(
                    prompt=prompt,
                    image_data=image_data,
                    system_instruction=system_instruction,
                    temperature=temperature
                )
            except Exception as e:
                self.logger.error(f"LLM provider vision call failed: {e}")
                if self.model:
                    self.logger.info("Falling back to direct Gemini")
                else:
                    raise
        
        # Direct Gemini implementation (fallback)
        if not self.model:
            raise ValueError("LLM is not enabled")
        
        try:
            from PIL import Image
            import io
            import base64
            
            temp = temperature if temperature is not None else settings.GEMINI_TEMPERATURE
            
            # Convert image data to PIL Image
            if isinstance(image_data, str):
                # Assume base64
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data
            
            image = Image.open(io.BytesIO(image_bytes))
            
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            response = self.model.generate_content(
                [full_prompt, image],
                generation_config=genai.GenerationConfig(
                    temperature=temp,
                    max_output_tokens=settings.GEMINI_MAX_TOKENS,
                )
            )
            
            return response.text
            
        except Exception as e:
            self.logger.error(f"LLM vision call failed: {e}")
            raise
    
    def validate_context(self, context: Dict[str, Any], required_keys: list) -> bool:
        """Validate that required context keys are present"""
        missing_keys = [key for key in required_keys if key not in context]
        if missing_keys:
            raise ValueError(f"Missing required context keys: {missing_keys}")
        return True
