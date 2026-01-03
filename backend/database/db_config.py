"""
Database configuration for multi-tenant PostgreSQL setup
"""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""

    # PostgreSQL connection settings
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ai_foresight")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")

    # Connection pool settings
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))

    # SSL settings
    DB_SSL_MODE: str = os.getenv("DB_SSL_MODE", "prefer")  # disable, allow, prefer, require
    DB_SSL_CERT: Optional[str] = os.getenv("DB_SSL_CERT")
    DB_SSL_KEY: Optional[str] = os.getenv("DB_SSL_KEY")
    DB_SSL_ROOT_CERT: Optional[str] = os.getenv("DB_SSL_ROOT_CERT")

    # Multi-tenancy settings
    TENANT_ISOLATION_ENABLED: bool = os.getenv("TENANT_ISOLATION_ENABLED", "true").lower() == "true"
    ROW_LEVEL_SECURITY_ENABLED: bool = os.getenv("ROW_LEVEL_SECURITY_ENABLED", "true").lower() == "true"

    # Migration settings
    MIGRATIONS_DIR: str = os.getenv("MIGRATIONS_DIR", "/home/user/SDP/backend/database/migrations")

    @property
    def database_url(self) -> str:
        """Construct the database URL"""
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def async_database_url(self) -> str:
        """Construct the async database URL"""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global configuration instance
db_config = DatabaseConfig()
