"""Claude Orchestrator - Core service for managing Claude API interactions."""

import json
import hashlib
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from uuid import UUID, uuid4

import anthropic
from anthropic import Anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel, ValidationError

from config import settings
from agents import AgentType, get_agent_template, PromptTemplate


# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


class OrchestratorRequest(BaseModel):
    """Request to the orchestrator."""
    agent_type: AgentType
    context: Dict[str, Any]
    user_id: Optional[UUID] = None
    tenant_id: Optional[UUID] = None
    trace_id: Optional[UUID] = None
    override_model: Optional[str] = None
    override_temperature: Optional[float] = None


class OrchestratorResponse(BaseModel):
    """Response from the orchestrator."""
    request_id: UUID
    agent_type: AgentType
    output: Dict[str, Any]
    raw_output: str
    model_used: str
    tokens_used: Dict[str, int]
    latency_ms: int
    cached: bool = False
    timestamp: datetime
    trace_id: Optional[UUID] = None
    citations_count: int = 0
    validation_passed: bool = True
    validation_errors: List[str] = []


class AuditLog(BaseModel):
    """Audit log entry for Claude interactions."""
    id: UUID
    request_id: UUID
    tenant_id: Optional[UUID]
    user_id: Optional[UUID]
    agent_type: AgentType
    model_used: str
    system_prompt: str
    user_prompt: str
    context_hash: str  # Hash of input context for privacy
    output: Dict[str, Any]
    raw_output: str
    tokens_input: int
    tokens_output: int
    latency_ms: int
    timestamp: datetime
    success: bool
    error: Optional[str] = None


class SafetyFilter:
    """Safety and guardrail filters."""

    @staticmethod
    def detect_pii(text: str) -> bool:
        """Detect potential PII in text (simplified)."""
        # In production, use proper PII detection library
        import re
        patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b\d{16}\b',  # Credit card
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email (basic)
        ]
        for pattern in patterns:
            if re.search(pattern, text):
                return True
        return False

    @staticmethod
    def sanitize_context(context: Dict[str, Any]) -> Dict[str, Any]:
        """Remove potential PII from context."""
        # Simplified - in production, implement comprehensive PII removal
        sanitized = context.copy()
        for key, value in sanitized.items():
            if isinstance(value, str) and SafetyFilter.detect_pii(value):
                logger.warning(f"Potential PII detected in field: {key}")
                # In production, either remove or mask
        return sanitized

    @staticmethod
    def validate_output_schema(output: Dict[str, Any], schema: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Validate output against JSON schema."""
        # Simplified validation - in production use jsonschema library
        errors = []
        if schema and "properties" in schema:
            for prop in schema.get("required", []):
                if prop not in output:
                    errors.append(f"Required property missing: {prop}")
        return len(errors) == 0, errors


class ClaudeOrchestrator:
    """Orchestrator for Claude API calls with caching, guardrails, and observability."""

    def __init__(self):
        """Initialize orchestrator."""
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.cache: Dict[str, Any] = {}  # In production, use Redis
        logger.info("Claude Orchestrator initialized")

    def _get_cache_key(self, agent_type: AgentType, context_hash: str) -> str:
        """Generate cache key."""
        return f"claude:{agent_type.value}:{context_hash}"

    def _hash_context(self, context: Dict[str, Any]) -> str:
        """Hash context for caching and audit."""
        context_str = json.dumps(context, sort_keys=True)
        return hashlib.sha256(context_str.encode()).hexdigest()

    def _check_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Check if result is cached."""
        if not settings.cache_enabled:
            return None

        # In production, use Redis with TTL
        if cache_key in self.cache:
            cached_item = self.cache[cache_key]
            if datetime.now() < cached_item["expires_at"]:
                logger.info(f"Cache hit for key: {cache_key[:16]}...")
                return cached_item["data"]
            else:
                del self.cache[cache_key]
        return None

    def _set_cache(self, cache_key: str, data: Dict[str, Any]):
        """Cache result."""
        if settings.cache_enabled:
            self.cache[cache_key] = {
                "data": data,
                "expires_at": datetime.now() + timedelta(seconds=settings.cache_ttl_seconds)
            }

    def _render_prompt(self, template: PromptTemplate, context: Dict[str, Any]) -> str:
        """Render user prompt from template."""
        try:
            user_prompt = template.user_prompt_template.format(
                **context,
                output_schema=json.dumps(template.output_schema, indent=2) if template.output_schema else "{}"
            )
            return user_prompt
        except KeyError as e:
            logger.error(f"Missing context key: {e}")
            raise ValueError(f"Missing required context key: {e}")

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def _call_claude(
        self,
        system_prompt: str,
        user_prompt: str,
        model: str,
        temperature: float,
        max_tokens: int = None
    ) -> tuple[str, Dict[str, int]]:
        """Call Claude API with retries."""
        start_time = datetime.now()

        try:
            response = self.client.messages.create(
                model=model,
                max_tokens=max_tokens or settings.anthropic_max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ]
            )

            latency = (datetime.now() - start_time).total_seconds() * 1000

            # Extract text from response
            output_text = response.content[0].text

            # Token usage
            tokens = {
                "input": response.usage.input_tokens,
                "output": response.usage.output_tokens,
            }

            logger.info(f"Claude API call successful. Model: {model}, "
                       f"Tokens: {tokens}, Latency: {latency:.0f}ms")

            return output_text, tokens

        except anthropic.APIError as e:
            logger.error(f"Claude API error: {e}")
            raise

    def _parse_json_output(self, text: str) -> Dict[str, Any]:
        """Parse JSON from Claude output."""
        # Claude might wrap JSON in markdown code blocks
        text = text.strip()

        # Remove markdown code blocks if present
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]

        text = text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from Claude output: {e}")
            logger.debug(f"Raw output: {text[:500]}...")
            # Try to extract JSON from text
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except:
                    pass
            raise ValueError(f"Could not parse JSON from output: {e}")

    def _count_citations(self, output: Dict[str, Any]) -> int:
        """Count citations in output."""
        count = 0
        if "citations" in output:
            count = len(output["citations"])
        elif "evidence_map" in output:
            if isinstance(output["evidence_map"], list):
                count = len(output["evidence_map"])
        # Recursively check nested structures
        for value in output.values():
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, dict) and "citations" in item:
                        count += len(item["citations"])
        return count

    async def execute(self, request: OrchestratorRequest) -> OrchestratorResponse:
        """Execute Claude agent request."""
        request_id = uuid4()
        start_time = datetime.now()

        logger.info(f"Executing agent: {request.agent_type.value}, Request ID: {request_id}")

        # Safety: Check for PII
        if settings.pii_detection_enabled:
            sanitized_context = SafetyFilter.sanitize_context(request.context)
        else:
            sanitized_context = request.context

        # Get agent template
        template = get_agent_template(request.agent_type)

        # Generate cache key
        context_hash = self._hash_context(sanitized_context)
        cache_key = self._get_cache_key(request.agent_type, context_hash)

        # Check cache
        cached_result = self._check_cache(cache_key)
        if cached_result:
            return OrchestratorResponse(
                request_id=request_id,
                agent_type=request.agent_type,
                output=cached_result["output"],
                raw_output=cached_result["raw_output"],
                model_used=cached_result["model_used"],
                tokens_used=cached_result["tokens_used"],
                latency_ms=cached_result["latency_ms"],
                cached=True,
                timestamp=datetime.now(),
                trace_id=request.trace_id,
                citations_count=cached_result.get("citations_count", 0)
            )

        # Render prompts
        system_prompt = template.system_prompt
        user_prompt = self._render_prompt(template, sanitized_context)

        # Select model
        model = request.override_model or settings.anthropic_default_model
        temperature = request.override_temperature if request.override_temperature is not None else template.temperature

        # Log prompts if enabled
        if settings.log_prompts:
            logger.debug(f"System prompt: {system_prompt[:200]}...")
            logger.debug(f"User prompt: {user_prompt[:200]}...")

        # Call Claude
        try:
            raw_output, tokens_used = self._call_claude(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=model,
                temperature=temperature
            )

            # Parse output
            output = self._parse_json_output(raw_output)

            # Validate output schema
            validation_passed = True
            validation_errors = []
            if template.output_schema and settings.output_validation_strict:
                validation_passed, validation_errors = SafetyFilter.validate_output_schema(
                    output, template.output_schema
                )
                if not validation_passed:
                    logger.warning(f"Output validation failed: {validation_errors}")

            # Count citations
            citations_count = self._count_citations(output)

            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            # Audit logging
            audit_entry = AuditLog(
                id=uuid4(),
                request_id=request_id,
                tenant_id=request.tenant_id,
                user_id=request.user_id,
                agent_type=request.agent_type,
                model_used=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt[:1000],  # Truncate for storage
                context_hash=context_hash,
                output=output,
                raw_output=raw_output[:2000],  # Truncate
                tokens_input=tokens_used["input"],
                tokens_output=tokens_used["output"],
                latency_ms=latency_ms,
                timestamp=datetime.now(),
                success=True
            )

            # In production, store audit log to database
            if settings.log_outputs:
                logger.info(f"Audit log: {audit_entry.model_dump_json()}")

            response = OrchestratorResponse(
                request_id=request_id,
                agent_type=request.agent_type,
                output=output,
                raw_output=raw_output,
                model_used=model,
                tokens_used=tokens_used,
                latency_ms=latency_ms,
                cached=False,
                timestamp=datetime.now(),
                trace_id=request.trace_id,
                citations_count=citations_count,
                validation_passed=validation_passed,
                validation_errors=validation_errors
            )

            # Cache result
            cache_data = {
                "output": output,
                "raw_output": raw_output,
                "model_used": model,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "citations_count": citations_count
            }
            self._set_cache(cache_key, cache_data)

            return response

        except Exception as e:
            logger.error(f"Error executing agent {request.agent_type.value}: {e}", exc_info=True)

            # Audit log error
            audit_entry = AuditLog(
                id=uuid4(),
                request_id=request_id,
                tenant_id=request.tenant_id,
                user_id=request.user_id,
                agent_type=request.agent_type,
                model_used=model,
                system_prompt=system_prompt,
                user_prompt=user_prompt[:1000],
                context_hash=context_hash,
                output={},
                raw_output="",
                tokens_input=0,
                tokens_output=0,
                latency_ms=int((datetime.now() - start_time).total_seconds() * 1000),
                timestamp=datetime.now(),
                success=False,
                error=str(e)
            )

            logger.error(f"Audit log (error): {audit_entry.model_dump_json()}")

            raise


# Global orchestrator instance
orchestrator = ClaudeOrchestrator()
