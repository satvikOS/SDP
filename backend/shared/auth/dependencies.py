"""
FastAPI dependencies for authentication and authorization
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..models.tenant import TokenData, UserRole
from .jwt_handler import verify_token, AuthenticationError

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


class AuthContext:
    """Authentication context containing user and tenant information"""

    def __init__(self, token_data: TokenData):
        self.user_id = token_data.user_id
        self.tenant_id = token_data.tenant_id
        self.username = token_data.username
        self.role = token_data.role

    def __repr__(self):
        return f"AuthContext(user_id={self.user_id}, tenant_id={self.tenant_id}, role={self.role})"


async def get_token_from_header(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """
    Extract JWT token from Authorization header

    Args:
        credentials: HTTP authorization credentials

    Returns:
        JWT token string

    Raises:
        HTTPException: If token is missing
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials


async def get_current_user(
    token: str = Depends(get_token_from_header)
) -> AuthContext:
    """
    Get current authenticated user from JWT token

    Args:
        token: JWT token from header

    Returns:
        AuthContext with user information

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        token_data = verify_token(token, token_type="access")
        auth_context = AuthContext(token_data)
        logger.debug(f"Authenticated user: {auth_context}")
        return auth_context

    except AuthenticationError as e:
        logger.warning(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_api_key_from_header(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> Optional[str]:
    """
    Extract API key from X-API-Key header

    Args:
        x_api_key: API key from header

    Returns:
        API key string or None
    """
    return x_api_key


async def get_current_user_or_api_key(
    token: Optional[str] = Depends(get_token_from_header),
    api_key: Optional[str] = Depends(get_api_key_from_header)
) -> AuthContext:
    """
    Get current user from either JWT token or API key

    Args:
        token: JWT token from Authorization header
        api_key: API key from X-API-Key header

    Returns:
        AuthContext with user information

    Raises:
        HTTPException: If neither token nor API key is valid
    """
    # Try JWT token first
    if token:
        try:
            token_data = verify_token(token, token_type="access")
            return AuthContext(token_data)
        except AuthenticationError as e:
            logger.warning(f"JWT authentication failed: {e}")

    # Try API key
    if api_key:
        # TODO: Implement API key verification against database
        # For now, raise an error
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="API key authentication not yet implemented",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No valid authentication credentials provided",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[AuthContext]:
    """
    Get current user if authenticated, otherwise return None

    Args:
        credentials: Optional HTTP authorization credentials

    Returns:
        AuthContext if authenticated, None otherwise
    """
    if not credentials:
        return None

    try:
        token_data = verify_token(credentials.credentials, token_type="access")
        return AuthContext(token_data)
    except AuthenticationError:
        return None


class RoleChecker:
    """Dependency for checking user roles"""

    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, auth: AuthContext = Depends(get_current_user)) -> AuthContext:
        """
        Check if user has required role

        Args:
            auth: Authentication context

        Returns:
            AuthContext if authorized

        Raises:
            HTTPException: If user doesn't have required role
        """
        if auth.role not in self.allowed_roles:
            logger.warning(
                f"User {auth.user_id} with role {auth.role} "
                f"attempted to access resource requiring roles {self.allowed_roles}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in self.allowed_roles]}",
            )
        return auth


# Pre-configured role checkers for common use cases
require_admin = RoleChecker([UserRole.ADMIN])
require_manager = RoleChecker([UserRole.ADMIN, UserRole.MANAGER])
require_analyst = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST])
require_viewer = RoleChecker([UserRole.ADMIN, UserRole.MANAGER, UserRole.ANALYST, UserRole.VIEWER])


class TenantChecker:
    """Dependency for verifying tenant access"""

    def __init__(self, tenant_id: UUID):
        self.tenant_id = tenant_id

    def __call__(self, auth: AuthContext = Depends(get_current_user)) -> AuthContext:
        """
        Check if user belongs to specified tenant

        Args:
            auth: Authentication context

        Returns:
            AuthContext if authorized

        Raises:
            HTTPException: If user doesn't belong to tenant
        """
        if auth.tenant_id != self.tenant_id:
            logger.warning(
                f"User {auth.user_id} from tenant {auth.tenant_id} "
                f"attempted to access resources of tenant {self.tenant_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You don't have permission to access this tenant's resources",
            )
        return auth


def get_tenant_id(auth: AuthContext = Depends(get_current_user)) -> UUID:
    """
    Extract tenant ID from authentication context

    Args:
        auth: Authentication context

    Returns:
        Tenant UUID
    """
    return auth.tenant_id


def get_user_id(auth: AuthContext = Depends(get_current_user)) -> UUID:
    """
    Extract user ID from authentication context

    Args:
        auth: Authentication context

    Returns:
        User UUID
    """
    return auth.user_id
