"""
Middleware for tenant isolation and context management
"""
import logging
import time
from typing import Callable, Optional
from uuid import UUID

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class TenantContext:
    """Thread-safe tenant context storage"""

    _tenant_id: Optional[UUID] = None
    _user_id: Optional[UUID] = None

    @classmethod
    def set_context(cls, tenant_id: UUID, user_id: Optional[UUID] = None):
        """Set the current tenant context"""
        cls._tenant_id = tenant_id
        cls._user_id = user_id

    @classmethod
    def get_tenant_id(cls) -> Optional[UUID]:
        """Get the current tenant ID"""
        return cls._tenant_id

    @classmethod
    def get_user_id(cls) -> Optional[UUID]:
        """Get the current user ID"""
        return cls._user_id

    @classmethod
    def clear_context(cls):
        """Clear the tenant context"""
        cls._tenant_id = None
        cls._user_id = None


class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware to enforce tenant isolation on all requests
    """

    def __init__(self, app: ASGIApp, exempt_paths: Optional[list[str]] = None):
        """
        Initialize tenant isolation middleware

        Args:
            app: ASGI application
            exempt_paths: List of path prefixes that don't require tenant isolation
        """
        super().__init__(app)
        self.exempt_paths = exempt_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
            "/auth/login",
            "/auth/register",
            "/auth/refresh",
        ]

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and enforce tenant isolation

        Args:
            request: FastAPI request
            call_next: Next middleware/handler

        Returns:
            Response
        """
        # Check if path is exempt from tenant isolation
        path = request.url.path
        is_exempt = any(path.startswith(exempt_path) for exempt_path in self.exempt_paths)

        if is_exempt:
            # Skip tenant isolation for exempt paths
            return await call_next(request)

        # Extract tenant context from request state (set by auth middleware)
        tenant_id = getattr(request.state, "tenant_id", None)
        user_id = getattr(request.state, "user_id", None)

        if tenant_id:
            # Set tenant context for this request
            TenantContext.set_context(tenant_id, user_id)
            logger.debug(f"Set tenant context: tenant_id={tenant_id}, user_id={user_id}")

            # Add tenant info to request headers for downstream services
            request.state.tenant_id = tenant_id
            request.state.user_id = user_id

        try:
            # Process request
            response = await call_next(request)

            # Add tenant ID to response headers (useful for debugging)
            if tenant_id:
                response.headers["X-Tenant-ID"] = str(tenant_id)

            return response

        finally:
            # Clear tenant context after request
            TenantContext.clear_context()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging requests with tenant information
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Log request details including tenant information

        Args:
            request: FastAPI request
            call_next: Next middleware/handler

        Returns:
            Response
        """
        start_time = time.time()

        # Extract request info
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"
        tenant_id = getattr(request.state, "tenant_id", None)
        user_id = getattr(request.state, "user_id", None)

        # Log request
        logger.info(
            f"Request started: {method} {path} | "
            f"IP: {client_ip} | Tenant: {tenant_id} | User: {user_id}"
        )

        try:
            # Process request
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Log response
            logger.info(
                f"Request completed: {method} {path} | "
                f"Status: {response.status_code} | "
                f"Duration: {duration:.3f}s | "
                f"Tenant: {tenant_id}"
            )

            # Add timing header
            response.headers["X-Response-Time"] = f"{duration:.3f}s"

            return response

        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: {method} {path} | "
                f"Error: {str(e)} | "
                f"Duration: {duration:.3f}s | "
                f"Tenant: {tenant_id}"
            )
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for per-tenant rate limiting
    """

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        exempt_paths: Optional[list[str]] = None
    ):
        """
        Initialize rate limit middleware

        Args:
            app: ASGI application
            requests_per_minute: Maximum requests per minute per tenant
            exempt_paths: List of path prefixes exempt from rate limiting
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.exempt_paths = exempt_paths or ["/health", "/docs", "/openapi.json", "/redoc"]
        # TODO: Implement Redis-based rate limiting
        # For now, this is a placeholder

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Check rate limit for tenant

        Args:
            request: FastAPI request
            call_next: Next middleware/handler

        Returns:
            Response
        """
        # Check if path is exempt from rate limiting
        path = request.url.path
        is_exempt = any(path.startswith(exempt_path) for exempt_path in self.exempt_paths)

        if is_exempt:
            return await call_next(request)

        tenant_id = getattr(request.state, "tenant_id", None)

        if tenant_id:
            # TODO: Implement actual rate limiting using Redis
            # For now, just pass through
            logger.debug(f"Rate limit check for tenant: {tenant_id}")

        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware for adding security headers to responses
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Add security headers to response

        Args:
            request: FastAPI request
            call_next: Next middleware/handler

        Returns:
            Response with security headers
        """
        response = await call_next(request)

        # Add security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Content Security Policy (adjust as needed)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'"
        )

        return response
