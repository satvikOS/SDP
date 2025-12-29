"""Multi-model orchestrator using AWS Bedrock with intelligent model selection and fallback."""

import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import UUID, uuid4

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from botocore.exceptions import ClientError

from config import settings, BedrockModelId
from bedrock_client import bedrock_client
import sys
import os

# Add path to shared models
sys.path.append(os.path.join(os.path.dirname(__file__), '../..'))
from shared.models import *

# Add path to agent definitions (reuse from AI orchestrator)
sys.path.append(os.path.join(os.path.dirname(__file__), '../ai-orchestrator'))
from agents import AgentType, get_agent_template

logger = logging.getLogger(__name__)


class CostTracker:
    """Track costs across different models."""

    # Approximate costs per 1M tokens (update with actual Bedrock pricing)
    MODEL_COSTS = {
        # AI models (per 1M tokens)
        BedrockModelId.CLAUDE_SONNET_4_5: {"input": 3.00, "output": 15.00},
        BedrockModelId.CLAUDE_OPUS_4: {"input": 15.00, "output": 75.00},
        BedrockModelId.CLAUDE_HAIKU_3_5: {"input": 0.25, "output": 1.25},

        # Titan models
        BedrockModelId.TITAN_TEXT_EXPRESS: {"input": 0.20, "output": 0.60},
        BedrockModelId.TITAN_TEXT_LITE: {"input": 0.15, "output": 0.20},

        # Llama models
        BedrockModelId.LLAMA_3_1_70B: {"input": 0.99, "output": 0.99},
        BedrockModelId.LLAMA_3_1_8B: {"input": 0.30, "output": 0.30},

        # Cohere models
        BedrockModelId.COHERE_COMMAND_R_PLUS: {"input": 2.50, "output": 10.00},
        BedrockModelId.COHERE_COMMAND_R: {"input": 0.50, "output": 1.50},

        # AI21
        BedrockModelId.JAMBA_INSTRUCT: {"input": 0.50, "output": 0.70},
    }

    def __init__(self):
        """Initialize cost tracker."""
        self.total_cost = 0.0
        self.cost_by_model: Dict[str, float] = {}
        self.cost_by_agent: Dict[str, float] = {}

    def calculate_cost(self, model_id: str, tokens: Dict[str, int]) -> float:
        """Calculate cost for a model invocation."""
        if model_id not in self.MODEL_COSTS:
            logger.warning(f"Unknown model for cost calculation: {model_id}")
            return 0.0

        costs = self.MODEL_COSTS[model_id]

        input_cost = (tokens.get("input", 0) / 1_000_000) * costs["input"]
        output_cost = (tokens.get("output", 0) / 1_000_000) * costs["output"]

        return input_cost + output_cost

    def track(self, model_id: str, agent_type: str, tokens: Dict[str, int]):
        """Track cost for an invocation."""
        cost = self.calculate_cost(model_id, tokens)

        self.total_cost += cost

        if model_id not in self.cost_by_model:
            self.cost_by_model[model_id] = 0.0
        self.cost_by_model[model_id] += cost

        if agent_type not in self.cost_by_agent:
            self.cost_by_agent[agent_type] = 0.0
        self.cost_by_agent[agent_type] += cost

        logger.info(f"Cost for {agent_type} with {model_id}: ${cost:.4f}")

        # Check budget
        if settings.monthly_budget_usd:
            usage_pct = (self.total_cost / settings.monthly_budget_usd) * 100
            if usage_pct > settings.cost_alert_threshold * 100:
                logger.warning(
                    f"Cost alert: {usage_pct:.1f}% of monthly budget used "
                    f"(${self.total_cost:.2f} / ${settings.monthly_budget_usd:.2f})"
                )

    def get_report(self) -> Dict[str, Any]:
        """Get cost report."""
        return {
            "total_cost_usd": round(self.total_cost, 4),
            "by_model": {k: round(v, 4) for k, v in self.cost_by_model.items()},
            "by_agent": {k: round(v, 4) for k, v in self.cost_by_agent.items()},
            "budget_usage_pct": (self.total_cost / settings.monthly_budget_usd * 100) if settings.monthly_budget_usd else None
        }


class MultiModelOrchestrator:
    """Orchestrator that intelligently selects and uses different AI models via AWS Bedrock."""

    def __init__(self):
        """Initialize orchestrator."""
        self.client = bedrock_client
        self.cost_tracker = CostTracker() if settings.cost_tracking_enabled else None
        self.cache: Dict[str, Any] = {}  # In production, use Redis
        logger.info("Multi-Model Bedrock Orchestrator initialized")

    def get_model_for_agent(self, agent_type: AgentType) -> tuple[str, str]:
        """Get primary and fallback model for agent type."""
        mapping = settings.model_mapping

        model_map = {
            AgentType.SIGNAL_SYNTHESIZER: (
                mapping.signal_synthesizer_model,
                mapping.signal_synthesizer_fallback
            ),
            AgentType.DRIVER_EXTRACTOR: (
                mapping.driver_extractor_model,
                mapping.driver_extractor_fallback
            ),
            AgentType.SCENARIO_CONSTRUCTOR: (
                mapping.scenario_constructor_model,
                mapping.scenario_constructor_fallback
            ),
            AgentType.NARRATIVE_GENERATOR: (
                mapping.narrative_generator_model,
                mapping.narrative_generator_fallback
            ),
            AgentType.SIGNPOST_DESIGNER: (
                mapping.signpost_designer_model,
                mapping.signpost_designer_fallback
            ),
            AgentType.ACTION_PLANNER: (
                mapping.action_planner_model,
                mapping.action_planner_fallback
            ),
            AgentType.QUALITY_CRITIC: (
                mapping.quality_critic_model,
                mapping.quality_critic_fallback
            ),
        }

        return model_map.get(agent_type, (BedrockModelId.CLAUDE_SONNET_4_5.value, BedrockModelId.CLAUDE_HAIKU_3_5.value))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(ClientError)
    )
    def invoke_with_fallback(
        self,
        agent_type: AgentType,
        system_prompt: str,
        user_prompt: str,
        temperature: float
    ) -> tuple[str, Dict[str, int], str]:
        """Invoke model with automatic fallback to secondary model on failure."""
        primary_model, fallback_model = self.get_model_for_agent(agent_type)

        try:
            text, tokens = self.client.invoke_model(
                model_id=primary_model,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=temperature
            )
            return text, tokens, primary_model

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')

            if settings.enable_model_fallback and error_code in [
                'ThrottlingException',
                'ModelNotReadyException',
                'ServiceUnavailableException'
            ]:
                logger.warning(
                    f"Primary model {primary_model} failed with {error_code}. "
                    f"Falling back to {fallback_model}"
                )

                # Try fallback model
                text, tokens = self.client.invoke_model(
                    model_id=fallback_model,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature
                )
                return text, tokens, fallback_model

            else:
                raise

    async def execute(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent request with multi-model support."""
        request_id = uuid4()
        start_time = datetime.now()

        agent_type = AgentType(request["agent_type"])
        context = request.get("context", {})

        logger.info(f"Executing agent: {agent_type.value}, Request ID: {request_id}")

        # Get agent template
        template = get_agent_template(agent_type)

        # Render prompts
        system_prompt = template.system_prompt
        user_prompt = template.user_prompt_template.format(
            **context,
            output_schema=json.dumps(template.output_schema, indent=2) if template.output_schema else "{}"
        )

        # Invoke model with fallback
        try:
            raw_output, tokens_used, model_used = self.invoke_with_fallback(
                agent_type=agent_type,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=template.temperature
            )

            # Parse JSON output
            output = self._parse_json_output(raw_output)

            latency_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            # Track costs
            if self.cost_tracker:
                self.cost_tracker.track(model_used, agent_type.value, tokens_used)

            response = {
                "request_id": str(request_id),
                "agent_type": agent_type.value,
                "output": output,
                "raw_output": raw_output,
                "model_used": model_used,
                "tokens_used": tokens_used,
                "latency_ms": latency_ms,
                "timestamp": datetime.now().isoformat(),
                "cost_usd": self.cost_tracker.calculate_cost(model_used, tokens_used) if self.cost_tracker else None
            }

            logger.info(
                f"Agent execution successful. Agent: {agent_type.value}, "
                f"Model: {model_used}, Latency: {latency_ms}ms"
            )

            return response

        except Exception as e:
            logger.error(f"Error executing agent {agent_type.value}: {e}", exc_info=True)
            raise

    def _parse_json_output(self, text: str) -> Dict[str, Any]:
        """Parse JSON from model output."""
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
            logger.error(f"Failed to parse JSON: {e}")
            import re
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                try:
                    return json.loads(json_match.group(0))
                except:
                    pass
            raise ValueError(f"Could not parse JSON from output: {e}")

    def get_cost_report(self) -> Dict[str, Any]:
        """Get cost tracking report."""
        if self.cost_tracker:
            return self.cost_tracker.get_report()
        return {"message": "Cost tracking not enabled"}


# Global orchestrator instance
multi_model_orchestrator = MultiModelOrchestrator()
