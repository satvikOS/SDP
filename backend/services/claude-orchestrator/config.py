"""Configuration for Claude Orchestrator service."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Service settings."""

    # Anthropic API
    anthropic_api_key: str
    anthropic_default_model: str = "claude-sonnet-4-5-20250929"
    anthropic_fast_model: str = "claude-haiku-3-5-20241022"
    anthropic_max_tokens: int = 4096
    anthropic_timeout: int = 300

    # Rate limiting
    rate_limit_enabled: bool = True
    rate_limit_requests_per_minute: int = 50
    rate_limit_tokens_per_minute: int = 100000

    # Caching
    cache_enabled: bool = True
    redis_url: str = "redis://localhost:6379/0"
    cache_ttl_seconds: int = 3600

    # Safety and guardrails
    pii_detection_enabled: bool = True
    max_context_length: int = 150000
    output_validation_strict: bool = True

    # Observability
    log_level: str = "INFO"
    trace_enabled: bool = True
    log_prompts: bool = True
    log_outputs: bool = True

    # Multi-tenancy
    tenant_isolation_enabled: bool = True
    default_tenant_quota_requests_per_day: int = 1000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
