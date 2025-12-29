"""Configuration for AWS Bedrock Multi-Model Orchestrator."""

from pydantic_settings import BaseSettings
from typing import Optional, Dict
from enum import Enum


class ModelProvider(str, Enum):
    """Available model providers in Bedrock."""
    ANTHROPIC = "anthropic"
    AMAZON = "amazon"
    AI21 = "ai21"
    COHERE = "cohere"
    META = "meta"
    STABILITY = "stability"


class BedrockModelId(str, Enum):
    """AWS Bedrock model identifiers."""
    # Anthropic AI models
    CLAUDE_SONNET_4_5 = "us.anthropic.ai-sonnet-4-5-v1:0"
    CLAUDE_OPUS_4 = "us.anthropic.ai-opus-4-v1:0"
    CLAUDE_HAIKU_3_5 = "us.anthropic.ai-haiku-3-5-v1:0"

    # Amazon Titan models
    TITAN_TEXT_EXPRESS = "amazon.titan-text-express-v1"
    TITAN_TEXT_LITE = "amazon.titan-text-lite-v1"
    TITAN_EMBEDDINGS = "amazon.titan-embed-text-v2:0"

    # Meta Llama models
    LLAMA_3_1_70B = "meta.llama3-1-70b-instruct-v1:0"
    LLAMA_3_1_8B = "meta.llama3-1-8b-instruct-v1:0"

    # AI21 models
    JAMBA_INSTRUCT = "ai21.jamba-instruct-v1:0"

    # Cohere models
    COHERE_COMMAND_R_PLUS = "cohere.command-r-plus-v1:0"
    COHERE_COMMAND_R = "cohere.command-r-v1:0"


class AgentModelMapping(BaseSettings):
    """Model selection for each agent type - optimize cost vs performance."""

    # Signal Synthesizer: Complex reasoning, needs strong model
    signal_synthesizer_model: str = BedrockModelId.CLAUDE_SONNET_4_5.value
    signal_synthesizer_fallback: str = BedrockModelId.COHERE_COMMAND_R_PLUS.value

    # Driver Extractor: Critical task, use best model
    driver_extractor_model: str = BedrockModelId.CLAUDE_SONNET_4_5.value
    driver_extractor_fallback: str = BedrockModelId.LLAMA_3_1_70B.value

    # Scenario Constructor: Creative + logical, needs strong model
    scenario_constructor_model: str = BedrockModelId.CLAUDE_SONNET_4_5.value
    scenario_constructor_fallback: str = BedrockModelId.CLAUDE_OPUS_4.value

    # Narrative Generator: Creative writing, can use various models
    narrative_generator_model: str = BedrockModelId.CLAUDE_SONNET_4_5.value
    narrative_generator_fallback: str = BedrockModelId.COHERE_COMMAND_R_PLUS.value

    # Signpost Designer: Analytical, can use lighter model
    signpost_designer_model: str = BedrockModelId.CLAUDE_HAIKU_3_5.value
    signpost_designer_fallback: str = BedrockModelId.TITAN_TEXT_EXPRESS.value

    # Action Planner: Strategic reasoning, needs strong model
    action_planner_model: str = BedrockModelId.CLAUDE_SONNET_4_5.value
    action_planner_fallback: str = BedrockModelId.LLAMA_3_1_70B.value

    # Quality Critic: Analytical, can use cost-effective model
    quality_critic_model: str = BedrockModelId.CLAUDE_HAIKU_3_5.value
    quality_critic_fallback: str = BedrockModelId.COHERE_COMMAND_R.value

    # Embeddings
    embedding_model: str = BedrockModelId.TITAN_EMBEDDINGS.value


class Settings(BaseSettings):
    """Bedrock Orchestrator settings."""

    # AWS Configuration
    aws_region: str = "us-east-1"
    aws_access_key_id: Optional[str] = None  # If not using IAM role
    aws_secret_access_key: Optional[str] = None  # If not using IAM role

    # Model Configuration
    model_mapping: AgentModelMapping = AgentModelMapping()

    # Performance Settings
    max_tokens: int = 4096
    temperature_default: float = 1.0
    temperature_creative: float = 1.0
    temperature_analytical: float = 0.7

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests_per_minute: int = 100
    rate_limit_tokens_per_minute: int = 200000

    # Caching
    cache_enabled: bool = True
    redis_url: str = "redis://localhost:6379/1"
    cache_ttl_seconds: int = 3600

    # Safety and Guardrails
    pii_detection_enabled: bool = True
    content_filtering_enabled: bool = True
    max_context_length: int = 200000
    output_validation_strict: bool = True

    # Retry & Fallback
    retry_attempts: int = 3
    retry_delay_seconds: int = 2
    enable_model_fallback: bool = True

    # Cost Optimization
    cost_tracking_enabled: bool = True
    monthly_budget_usd: Optional[float] = None
    cost_alert_threshold: float = 0.8  # Alert at 80% of budget

    # Observability
    log_level: str = "INFO"
    trace_enabled: bool = True
    log_prompts: bool = True
    log_outputs: bool = True
    metrics_enabled: bool = True

    # Multi-tenancy
    tenant_isolation_enabled: bool = True
    default_tenant_quota_requests_per_day: int = 2000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
