"""
Authentication and authorization utilities
"""

from .jwt_handler import (
    PasswordHandler,
    JWTHandler,
    APIKeyHandler,
    AuthenticationError,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_api_key,
    verify_api_key,
)

from .dependencies import (
    AuthContext,
    get_current_user,
    get_optional_user,
    get_current_user_or_api_key,
    get_tenant_id,
    get_user_id,
    RoleChecker,
    TenantChecker,
    require_admin,
    require_manager,
    require_analyst,
    require_viewer,
)

__all__ = [
    # Password handling
    "PasswordHandler",
    "hash_password",
    "verify_password",
    # JWT handling
    "JWTHandler",
    "create_access_token",
    "create_refresh_token",
    "verify_token",
    "AuthenticationError",
    # API key handling
    "APIKeyHandler",
    "generate_api_key",
    "verify_api_key",
    # FastAPI dependencies
    "AuthContext",
    "get_current_user",
    "get_optional_user",
    "get_current_user_or_api_key",
    "get_tenant_id",
    "get_user_id",
    # Role checking
    "RoleChecker",
    "require_admin",
    "require_manager",
    "require_analyst",
    "require_viewer",
    # Tenant checking
    "TenantChecker",
]
