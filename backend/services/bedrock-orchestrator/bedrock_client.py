"""AWS Bedrock client wrapper for multi-model orchestration."""

import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
import boto3
from botocore.exceptions import ClientError, BotoCoreError

from config import settings, BedrockModelId, ModelProvider

logger = logging.getLogger(__name__)


class BedrockClient:
    """AWS Bedrock client for multi-model AI orchestration."""

    def __init__(self):
        """Initialize Bedrock client."""
        # Create Bedrock Runtime client
        session_config = {
            "region_name": settings.aws_region
        }

        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session_config.update({
                "aws_access_key_id": settings.aws_access_key_id,
                "aws_secret_access_key": settings.aws_secret_access_key
            })

        self.bedrock_runtime = boto3.client(
            service_name='bedrock-runtime',
            **session_config
        )

        logger.info(f"Bedrock client initialized for region: {settings.aws_region}")

    def get_model_provider(self, model_id: str) -> ModelProvider:
        """Determine provider from model ID."""
        if "anthropic" in model_id:
            return ModelProvider.ANTHROPIC
        elif "amazon" in model_id:
            return ModelProvider.AMAZON
        elif "meta" in model_id:
            return ModelProvider.META
        elif "ai21" in model_id:
            return ModelProvider.AI21
        elif "cohere" in model_id:
            return ModelProvider.COHERE
        elif "stability" in model_id:
            return ModelProvider.STABILITY
        else:
            raise ValueError(f"Unknown model provider for: {model_id}")

    def format_anthropic_request(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Format request for Anthropic Claude models."""
        return {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": user_prompt
                }
            ]
        }

    def format_meta_request(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Format request for Meta Llama models."""
        # Llama uses a different format
        combined_prompt = f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{user_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

        return {
            "prompt": combined_prompt,
            "max_gen_len": max_tokens,
            "temperature": temperature,
            "top_p": 0.9
        }

    def format_cohere_request(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Format request for Cohere models."""
        # Combine system and user prompts
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        return {
            "message": full_prompt,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "p": 0.9,
            "k": 0,
            "stop_sequences": [],
            "return_likelihoods": "NONE"
        }

    def format_titan_request(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Format request for Amazon Titan models."""
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        return {
            "inputText": full_prompt,
            "textGenerationConfig": {
                "maxTokenCount": max_tokens,
                "temperature": temperature,
                "topP": 0.9,
                "stopSequences": []
            }
        }

    def format_ai21_request(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> Dict[str, Any]:
        """Format request for AI21 models."""
        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        return {
            "messages": [
                {
                    "role": "user",
                    "content": full_prompt
                }
            ],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "top_p": 1,
            "top_k": 0
        }

    def format_request(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """Format request based on model provider."""
        provider = self.get_model_provider(model_id)

        if provider == ModelProvider.ANTHROPIC:
            body = self.format_anthropic_request(system_prompt, user_prompt, max_tokens, temperature)
        elif provider == ModelProvider.META:
            body = self.format_meta_request(system_prompt, user_prompt, max_tokens, temperature)
        elif provider == ModelProvider.COHERE:
            body = self.format_cohere_request(system_prompt, user_prompt, max_tokens, temperature)
        elif provider == ModelProvider.AMAZON:
            body = self.format_titan_request(system_prompt, user_prompt, max_tokens, temperature)
        elif provider == ModelProvider.AI21:
            body = self.format_ai21_request(system_prompt, user_prompt, max_tokens, temperature)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

        return json.dumps(body)

    def parse_anthropic_response(self, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse Anthropic Claude response."""
        content = response_body.get("content", [])
        text = content[0].get("text", "") if content else ""

        tokens = {
            "input": response_body.get("usage", {}).get("input_tokens", 0),
            "output": response_body.get("usage", {}).get("output_tokens", 0)
        }

        return text, tokens

    def parse_meta_response(self, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse Meta Llama response."""
        text = response_body.get("generation", "")

        tokens = {
            "input": response_body.get("prompt_token_count", 0),
            "output": response_body.get("generation_token_count", 0)
        }

        return text, tokens

    def parse_cohere_response(self, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse Cohere response."""
        text = response_body.get("text", "")

        # Cohere doesn't always provide token counts
        tokens = {
            "input": 0,  # Estimate if needed
            "output": len(text.split()) * 1.3  # Rough approximation
        }

        return text, tokens

    def parse_titan_response(self, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse Amazon Titan response."""
        results = response_body.get("results", [])
        text = results[0].get("outputText", "") if results else ""

        tokens = {
            "input": response_body.get("inputTextTokenCount", 0),
            "output": results[0].get("tokenCount", 0) if results else 0
        }

        return text, tokens

    def parse_ai21_response(self, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse AI21 response."""
        choices = response_body.get("choices", [])
        message = choices[0].get("message", {}) if choices else {}
        text = message.get("content", "")

        tokens = {
            "input": response_body.get("usage", {}).get("prompt_tokens", 0),
            "output": response_body.get("usage", {}).get("completion_tokens", 0)
        }

        return text, tokens

    def parse_response(self, model_id: str, response_body: Dict[str, Any]) -> Tuple[str, Dict[str, int]]:
        """Parse response based on model provider."""
        provider = self.get_model_provider(model_id)

        if provider == ModelProvider.ANTHROPIC:
            return self.parse_anthropic_response(response_body)
        elif provider == ModelProvider.META:
            return self.parse_meta_response(response_body)
        elif provider == ModelProvider.COHERE:
            return self.parse_cohere_response(response_body)
        elif provider == ModelProvider.AMAZON:
            return self.parse_titan_response(response_body)
        elif provider == ModelProvider.AI21:
            return self.parse_ai21_response(response_body)
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    def invoke_model(
        self,
        model_id: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = None,
        temperature: float = None
    ) -> Tuple[str, Dict[str, int]]:
        """Invoke a model via Bedrock."""
        start_time = datetime.now()

        try:
            # Format request
            body = self.format_request(
                model_id=model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                max_tokens=max_tokens or settings.max_tokens,
                temperature=temperature if temperature is not None else settings.temperature_default
            )

            # Invoke model
            logger.info(f"Invoking model: {model_id}")

            response = self.bedrock_runtime.invoke_model(
                modelId=model_id,
                body=body,
                accept="application/json",
                contentType="application/json"
            )

            # Parse response
            response_body = json.loads(response['body'].read())

            text, tokens = self.parse_response(model_id, response_body)

            latency = (datetime.now() - start_time).total_seconds() * 1000

            logger.info(
                f"Model invocation successful. Model: {model_id}, "
                f"Tokens: {tokens}, Latency: {latency:.0f}ms"
            )

            return text, tokens

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_message = e.response.get('Error', {}).get('Message', str(e))

            logger.error(f"AWS ClientError invoking {model_id}: {error_code} - {error_message}")

            # Check if we should fallback
            if error_code in ['ThrottlingException', 'ModelNotReadyException', 'ServiceUnavailableException']:
                raise  # Let orchestrator handle fallback

            raise

        except BotoCoreError as e:
            logger.error(f"BotoCoreError invoking {model_id}: {e}")
            raise

        except Exception as e:
            logger.error(f"Unexpected error invoking {model_id}: {e}", exc_info=True)
            raise

    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Titan model."""
        embeddings = []

        for text in texts:
            body = json.dumps({
                "inputText": text
            })

            try:
                response = self.bedrock_runtime.invoke_model(
                    modelId=settings.model_mapping.embedding_model,
                    body=body,
                    accept="application/json",
                    contentType="application/json"
                )

                response_body = json.loads(response['body'].read())
                embedding = response_body.get("embedding", [])
                embeddings.append(embedding)

            except Exception as e:
                logger.error(f"Error generating embedding: {e}")
                # Return zero vector on error
                embeddings.append([0.0] * 1536)  # Titan embedding dimension

        return embeddings


# Global client instance
bedrock_client = BedrockClient()
