"""
LLM Provider Abstraction Layer

Supports:
- Google Gemini
- OpenAI (GPT-4, GPT-3.5)
- Azure OpenAI
- Anthropic Claude
- AWS Bedrock (Claude, Titan)
- Ollama (local models)
"""
import os
import json
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List, Union
from functools import lru_cache

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        response_format: Optional[str] = None  # 'json' or None
    ) -> str:
        """Generate text response from prompt"""
        pass
    
    @abstractmethod
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],  # bytes or base64 string
        system_instruction: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """Generate text response from prompt with image input"""
        pass
    
    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model name being used"""
        pass


class GeminiLLMProvider(LLMProvider):
    """Google Gemini provider"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.0-flash-exp",
        temperature: float = 0.7,
        max_tokens: int = 5000
    ):
        self.api_key = api_key
        self.model_name = model
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        self._model = None
        self._init_client()
    
    def _init_client(self):
        try:
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            self._model = genai.GenerativeModel(self.model_name)
            logger.info(f"Gemini LLM initialized with model: {self.model_name}")
        except ImportError:
            logger.error("google-generativeai package not installed. Run: pip install google-generativeai")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        if not self._model:
            raise ValueError("Gemini model not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import google.generativeai as genai
            
            generation_config = genai.GenerationConfig(
                temperature=temp,
                max_output_tokens=tokens
            )
            
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            if response_format == 'json':
                full_prompt += "\n\nRespond with valid JSON only."
            
            response = self._model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        if not self._model:
            raise ValueError("Gemini model not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import google.generativeai as genai
            from PIL import Image
            import io
            import base64
            
            # Convert image data to PIL Image
            if isinstance(image_data, str):
                # Assume base64
                image_bytes = base64.b64decode(image_data)
            else:
                image_bytes = image_data
            
            image = Image.open(io.BytesIO(image_bytes))
            
            generation_config = genai.GenerationConfig(
                temperature=temp,
                max_output_tokens=tokens
            )
            
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            response = self._model.generate_content(
                [full_prompt, image],
                generation_config=generation_config
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"Gemini vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return self.model_name


class OpenAILLMProvider(LLMProvider):
    """OpenAI provider (GPT-4, GPT-3.5)"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4-turbo-preview",
        temperature: float = 0.7,
        max_tokens: int = 4096,
        organization: Optional[str] = None
    ):
        self.api_key = api_key
        self.model_name = model
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        self.organization = organization
        self._client = None
        self._init_client()
    
    def _init_client(self):
        try:
            from openai import AsyncOpenAI
            
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                organization=self.organization
            )
            logger.info(f"OpenAI LLM initialized with model: {self.model_name}")
            
        except ImportError:
            logger.error("openai package not installed. Run: pip install openai")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        if not self._client:
            raise ValueError("OpenAI client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            kwargs = {
                "model": self.model_name,
                "messages": messages,
                "temperature": temp,
                "max_tokens": tokens
            }
            
            if response_format == 'json':
                kwargs["response_format"] = {"type": "json_object"}
            
            response = await self._client.chat.completions.create(**kwargs)
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        if not self._client:
            raise ValueError("OpenAI client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import base64
            
            # Convert to base64 if bytes
            if isinstance(image_data, bytes):
                image_b64 = base64.b64encode(image_data).decode('utf-8')
            else:
                image_b64 = image_data
            
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            })
            
            # Use vision model
            vision_model = self.model_name
            if 'gpt-4' in vision_model and 'vision' not in vision_model:
                vision_model = "gpt-4-vision-preview"
            
            response = await self._client.chat.completions.create(
                model=vision_model,
                messages=messages,
                temperature=temp,
                max_tokens=tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"OpenAI vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return self.model_name


class AzureOpenAILLMProvider(LLMProvider):
    """Azure OpenAI provider"""
    
    def __init__(
        self,
        api_key: str,
        endpoint: str,
        deployment_name: str,
        api_version: str = "2024-02-15-preview",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        self.api_key = api_key
        self.endpoint = endpoint
        self.deployment_name = deployment_name
        self.api_version = api_version
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        self._client = None
        self._init_client()
    
    def _init_client(self):
        try:
            from openai import AsyncAzureOpenAI
            
            self._client = AsyncAzureOpenAI(
                api_key=self.api_key,
                api_version=self.api_version,
                azure_endpoint=self.endpoint
            )
            logger.info(f"Azure OpenAI initialized with deployment: {self.deployment_name}")
            
        except ImportError:
            logger.error("openai package not installed. Run: pip install openai")
        except Exception as e:
            logger.error(f"Failed to initialize Azure OpenAI: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        if not self._client:
            raise ValueError("Azure OpenAI client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            messages.append({"role": "user", "content": prompt})
            
            kwargs = {
                "model": self.deployment_name,
                "messages": messages,
                "temperature": temp,
                "max_tokens": tokens
            }
            
            if response_format == 'json':
                kwargs["response_format"] = {"type": "json_object"}
            
            response = await self._client.chat.completions.create(**kwargs)
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Azure OpenAI generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        if not self._client:
            raise ValueError("Azure OpenAI client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import base64
            
            if isinstance(image_data, bytes):
                image_b64 = base64.b64encode(image_data).decode('utf-8')
            else:
                image_b64 = image_data
            
            messages = []
            if system_instruction:
                messages.append({"role": "system", "content": system_instruction})
            
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_b64}"
                        }
                    }
                ]
            })
            
            response = await self._client.chat.completions.create(
                model=self.deployment_name,
                messages=messages,
                temperature=temp,
                max_tokens=tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Azure OpenAI vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return f"azure/{self.deployment_name}"


class AnthropicLLMProvider(LLMProvider):
    """Anthropic Claude provider"""
    
    def __init__(
        self,
        api_key: str,
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        self.api_key = api_key
        self.model_name = model
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        self._client = None
        self._init_client()
    
    def _init_client(self):
        try:
            import anthropic
            
            self._client = anthropic.AsyncAnthropic(api_key=self.api_key)
            logger.info(f"Anthropic Claude initialized with model: {self.model_name}")
            
        except ImportError:
            logger.error("anthropic package not installed. Run: pip install anthropic")
        except Exception as e:
            logger.error(f"Failed to initialize Anthropic: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        if not self._client:
            raise ValueError("Anthropic client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            messages = [{"role": "user", "content": prompt}]
            
            if response_format == 'json':
                prompt += "\n\nRespond with valid JSON only."
            
            kwargs = {
                "model": self.model_name,
                "messages": messages,
                "temperature": temp,
                "max_tokens": tokens
            }
            
            if system_instruction:
                kwargs["system"] = system_instruction
            
            response = await self._client.messages.create(**kwargs)
            
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Anthropic generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        if not self._client:
            raise ValueError("Anthropic client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import base64
            
            if isinstance(image_data, bytes):
                image_b64 = base64.b64encode(image_data).decode('utf-8')
            else:
                image_b64 = image_data
            
            messages = [{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/jpeg",
                            "data": image_b64
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }]
            
            kwargs = {
                "model": self.model_name,
                "messages": messages,
                "temperature": temp,
                "max_tokens": tokens
            }
            
            if system_instruction:
                kwargs["system"] = system_instruction
            
            response = await self._client.messages.create(**kwargs)
            
            return response.content[0].text
            
        except Exception as e:
            logger.error(f"Anthropic vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return self.model_name


class AWSBedrockLLMProvider(LLMProvider):
    """AWS Bedrock provider (supports Claude, Titan, etc.)"""
    
    def __init__(
        self,
        model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0",
        region: str = "us-east-1",
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        self.model_id = model_id
        self.region = region
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        self._client = None
        self._init_client(access_key_id, secret_access_key)
    
    def _init_client(
        self,
        access_key_id: Optional[str],
        secret_access_key: Optional[str]
    ):
        try:
            import boto3
            
            if access_key_id and secret_access_key:
                self._client = boto3.client(
                    'bedrock-runtime',
                    region_name=self.region,
                    aws_access_key_id=access_key_id,
                    aws_secret_access_key=secret_access_key
                )
            else:
                self._client = boto3.client('bedrock-runtime', region_name=self.region)
            
            logger.info(f"AWS Bedrock initialized with model: {self.model_id}")
            
        except ImportError:
            logger.error("boto3 package not installed. Run: pip install boto3")
        except Exception as e:
            logger.error(f"Failed to initialize AWS Bedrock: {e}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        if not self._client:
            raise ValueError("AWS Bedrock client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import asyncio
            
            if response_format == 'json':
                prompt += "\n\nRespond with valid JSON only."
            
            # Build request based on model type
            if 'anthropic' in self.model_id.lower():
                body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": tokens,
                    "temperature": temp,
                    "messages": [{"role": "user", "content": prompt}]
                }
                if system_instruction:
                    body["system"] = system_instruction
            elif 'titan' in self.model_id.lower():
                body = {
                    "inputText": f"{system_instruction}\n\n{prompt}" if system_instruction else prompt,
                    "textGenerationConfig": {
                        "maxTokenCount": tokens,
                        "temperature": temp
                    }
                }
            else:
                # Generic format
                body = {
                    "prompt": f"{system_instruction}\n\n{prompt}" if system_instruction else prompt,
                    "max_tokens": tokens,
                    "temperature": temp
                }
            
            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body)
                )
            )
            
            response_body = json.loads(response['body'].read())
            
            # Parse response based on model type
            if 'anthropic' in self.model_id.lower():
                return response_body['content'][0]['text']
            elif 'titan' in self.model_id.lower():
                return response_body['results'][0]['outputText']
            else:
                return response_body.get('completion', response_body.get('generated_text', str(response_body)))
            
        except Exception as e:
            logger.error(f"AWS Bedrock generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        if not self._client:
            raise ValueError("AWS Bedrock client not initialized")
        
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import asyncio
            import base64
            
            if isinstance(image_data, bytes):
                image_b64 = base64.b64encode(image_data).decode('utf-8')
            else:
                image_b64 = image_data
            
            # Claude on Bedrock with vision
            if 'anthropic' in self.model_id.lower():
                body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": tokens,
                    "temperature": temp,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_b64
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }]
                }
                if system_instruction:
                    body["system"] = system_instruction
            else:
                raise ValueError(f"Vision not supported for model: {self.model_id}")
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body)
                )
            )
            
            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']
            
        except Exception as e:
            logger.error(f"AWS Bedrock vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return f"bedrock/{self.model_id}"


class OllamaLLMProvider(LLMProvider):
    """Ollama local LLM provider"""
    
    def __init__(
        self,
        model: str = "llama3.2",
        base_url: str = "http://localhost:11434",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ):
        self.model_name = model
        self.base_url = base_url
        self.default_temperature = temperature
        self.default_max_tokens = max_tokens
        logger.info(f"Ollama LLM initialized with model: {self.model_name}")
    
    async def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None,
        response_format: Optional[str] = None
    ) -> str:
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import httpx
            
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            if response_format == 'json':
                full_prompt += "\n\nRespond with valid JSON only."
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model_name,
                        "prompt": full_prompt,
                        "stream": False,
                        "options": {
                            "temperature": temp,
                            "num_predict": tokens
                        }
                    },
                    timeout=120.0
                )
                response.raise_for_status()
                return response.json()["response"]
                
        except Exception as e:
            logger.error(f"Ollama generation error: {e}")
            raise
    
    async def generate_with_image(
        self,
        prompt: str,
        image_data: Union[bytes, str],
        system_instruction: Optional[str] = None,
        temperature: float = None,
        max_tokens: int = None
    ) -> str:
        temp = temperature if temperature is not None else self.default_temperature
        tokens = max_tokens if max_tokens is not None else self.default_max_tokens
        
        try:
            import httpx
            import base64
            
            if isinstance(image_data, bytes):
                image_b64 = base64.b64encode(image_data).decode('utf-8')
            else:
                image_b64 = image_data
            
            full_prompt = prompt
            if system_instruction:
                full_prompt = f"{system_instruction}\n\n{prompt}"
            
            # Use vision-capable model (llava, bakllava, etc.)
            vision_model = self.model_name
            if 'llava' not in vision_model.lower():
                vision_model = "llava"
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": vision_model,
                        "prompt": full_prompt,
                        "images": [image_b64],
                        "stream": False,
                        "options": {
                            "temperature": temp,
                            "num_predict": tokens
                        }
                    },
                    timeout=120.0
                )
                response.raise_for_status()
                return response.json()["response"]
                
        except Exception as e:
            logger.error(f"Ollama vision generation error: {e}")
            raise
    
    def get_model_name(self) -> str:
        return f"ollama/{self.model_name}"


# Provider factory
_llm_provider: Optional[LLMProvider] = None


def get_llm_provider() -> LLMProvider:
    """Get the configured LLM provider singleton"""
    global _llm_provider
    
    if _llm_provider is None:
        from config import settings
        
        provider = getattr(settings, 'LLM_PROVIDER', 'gemini').lower()
        
        if provider == 'gemini' or provider == 'google':
            _llm_provider = GeminiLLMProvider(
                api_key=settings.GOOGLE_API_KEY,
                model=getattr(settings, 'GEMINI_MODEL', 'gemini-2.0-flash-exp'),
                temperature=getattr(settings, 'GEMINI_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'GEMINI_MAX_TOKENS', 5000)
            )
        elif provider == 'openai':
            _llm_provider = OpenAILLMProvider(
                api_key=getattr(settings, 'OPENAI_API_KEY', ''),
                model=getattr(settings, 'OPENAI_MODEL', 'gpt-4-turbo-preview'),
                temperature=getattr(settings, 'OPENAI_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'OPENAI_MAX_TOKENS', 4096),
                organization=getattr(settings, 'OPENAI_ORGANIZATION', None)
            )
        elif provider == 'azure_openai' or provider == 'azure':
            _llm_provider = AzureOpenAILLMProvider(
                api_key=getattr(settings, 'AZURE_OPENAI_API_KEY', ''),
                endpoint=getattr(settings, 'AZURE_OPENAI_ENDPOINT', ''),
                deployment_name=getattr(settings, 'AZURE_OPENAI_DEPLOYMENT', ''),
                api_version=getattr(settings, 'AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
                temperature=getattr(settings, 'AZURE_OPENAI_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'AZURE_OPENAI_MAX_TOKENS', 4096)
            )
        elif provider == 'anthropic' or provider == 'claude':
            _llm_provider = AnthropicLLMProvider(
                api_key=getattr(settings, 'ANTHROPIC_API_KEY', ''),
                model=getattr(settings, 'ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
                temperature=getattr(settings, 'ANTHROPIC_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'ANTHROPIC_MAX_TOKENS', 4096)
            )
        elif provider == 'bedrock' or provider == 'aws':
            _llm_provider = AWSBedrockLLMProvider(
                model_id=getattr(settings, 'BEDROCK_MODEL_ID', 'anthropic.claude-3-sonnet-20240229-v1:0'),
                region=getattr(settings, 'AWS_REGION', 'us-east-1'),
                access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                temperature=getattr(settings, 'BEDROCK_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'BEDROCK_MAX_TOKENS', 4096)
            )
        elif provider == 'ollama' or provider == 'local':
            _llm_provider = OllamaLLMProvider(
                model=getattr(settings, 'OLLAMA_MODEL', 'llama3.2'),
                base_url=getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434'),
                temperature=getattr(settings, 'OLLAMA_TEMPERATURE', 0.7),
                max_tokens=getattr(settings, 'OLLAMA_MAX_TOKENS', 4096)
            )
        else:
            logger.warning(f"Unknown LLM provider '{provider}', falling back to Gemini")
            _llm_provider = GeminiLLMProvider(
                api_key=settings.GOOGLE_API_KEY,
                model='gemini-2.0-flash-exp'
            )
    
    return _llm_provider


def reset_llm_provider():
    """Reset the LLM provider (useful for testing)"""
    global _llm_provider
    _llm_provider = None
