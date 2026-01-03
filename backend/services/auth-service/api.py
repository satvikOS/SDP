"""
Authentication service API endpoints
"""
import logging
from datetime import timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...database.connection import get_db
from ...database.repositories import UserRepository, TenantRepository, AuditLogRepository
from ...shared.models.tenant import (
    LoginRequest,
    RegisterRequest,
    RefreshTokenRequest,
    Token,
    User,
    UserCreate,
    UserUpdate,
    AuditLogCreate,
)
from ...shared.auth import (
    AuthContext,
    create_access_token,
    create_refresh_token,
    verify_token,
    verify_password,
    get_current_user,
    AuthenticationError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=User, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Register a new user

    Args:
        request: Registration request with user details
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        Created user (without password)

    Raises:
        HTTPException: If tenant not found or user already exists
    """
    tenant_repo = TenantRepository(db)
    user_repo = UserRepository(db)
    audit_repo = AuditLogRepository(db)

    # Get tenant by slug
    tenant = await tenant_repo.get_by_slug(request.tenant_slug)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant '{request.tenant_slug}' not found"
        )

    # Check if user already exists
    existing_user = await user_repo.get_by_email(request.email, tenant.id)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists in this tenant"
        )

    # Create user
    user_create = UserCreate(
        tenant_id=tenant.id,
        email=request.email,
        username=request.username,
        password=request.password,
        first_name=request.first_name,
        last_name=request.last_name,
    )

    try:
        user = await user_repo.create(user_create)

        # Log audit event
        await audit_repo.create(AuditLogCreate(
            tenant_id=tenant.id,
            user_id=user.id,
            action="user_registered",
            resource_type="user",
            resource_id=user.id,
            ip_address=http_request.client.host if http_request and http_request.client else None,
            user_agent=http_request.headers.get("user-agent") if http_request else None,
        ))

        logger.info(f"User registered: {user.email} in tenant {tenant.slug}")
        return user

    except Exception as e:
        logger.error(f"Failed to register user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )


@router.post("/login", response_model=Token)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Login with email and password

    Args:
        request: Login request with credentials
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        JWT access and refresh tokens

    Raises:
        HTTPException: If credentials are invalid
    """
    user_repo = UserRepository(db)
    tenant_repo = TenantRepository(db)
    audit_repo = AuditLogRepository(db)

    # If tenant_slug provided, get tenant first
    tenant_id = None
    if request.tenant_slug:
        tenant = await tenant_repo.get_by_slug(request.tenant_slug)
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        tenant_id = tenant.id

    # Get user by email
    user_in_db = await user_repo.get_by_email(request.email, tenant_id)
    if not user_in_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Verify password
    if not verify_password(request.password, user_in_db.password_hash):
        # Log failed login attempt
        await audit_repo.create(AuditLogCreate(
            tenant_id=user_in_db.tenant_id,
            user_id=user_in_db.id,
            action="login_failed",
            resource_type="user",
            resource_id=user_in_db.id,
            ip_address=http_request.client.host if http_request and http_request.client else None,
            user_agent=http_request.headers.get("user-agent") if http_request else None,
        ))

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if user is active
    if not user_in_db.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Create tokens
    access_token = create_access_token(
        user_id=user_in_db.id,
        tenant_id=user_in_db.tenant_id,
        username=user_in_db.username,
        role=user_in_db.role,
    )

    refresh_token = create_refresh_token(
        user_id=user_in_db.id,
        tenant_id=user_in_db.tenant_id,
    )

    # Update last login
    await user_repo.update_last_login(user_in_db.id)

    # Log successful login
    await audit_repo.create(AuditLogCreate(
        tenant_id=user_in_db.tenant_id,
        user_id=user_in_db.id,
        action="login_success",
        resource_type="user",
        resource_id=user_in_db.id,
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    ))

    logger.info(f"User logged in: {user_in_db.email}")

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=3600,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token

    Args:
        request: Refresh token request
        db: Database session

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    try:
        # Verify refresh token
        token_data = verify_token(request.refresh_token, token_type="refresh")

        # Create new tokens
        access_token = create_access_token(
            user_id=token_data.user_id,
            tenant_id=token_data.tenant_id,
            username=token_data.username,
            role=token_data.role,
        )

        new_refresh_token = create_refresh_token(
            user_id=token_data.user_id,
            tenant_id=token_data.tenant_id,
        )

        logger.info(f"Token refreshed for user: {token_data.user_id}")

        return Token(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=3600,
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.get("/me", response_model=User)
async def get_current_user_profile(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's profile

    Args:
        auth: Authentication context
        db: Database session

    Returns:
        Current user's profile

    Raises:
        HTTPException: If user not found
    """
    user_repo = UserRepository(db)

    user = await user_repo.get_by_id(auth.user_id, auth.tenant_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return user


@router.patch("/me", response_model=User)
async def update_current_user_profile(
    user_update: UserUpdate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Update current user's profile

    Args:
        user_update: User update data
        auth: Authentication context
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        Updated user profile

    Raises:
        HTTPException: If update fails
    """
    user_repo = UserRepository(db)
    audit_repo = AuditLogRepository(db)

    try:
        user = await user_repo.update(auth.user_id, auth.tenant_id, user_update)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Log audit event
        await audit_repo.create(AuditLogCreate(
            tenant_id=auth.tenant_id,
            user_id=auth.user_id,
            action="user_profile_updated",
            resource_type="user",
            resource_id=auth.user_id,
            changes=user_update.dict(exclude_unset=True),
            ip_address=http_request.client.host if http_request and http_request.client else None,
            user_agent=http_request.headers.get("user-agent") if http_request else None,
        ))

        logger.info(f"User profile updated: {user.email}")
        return user

    except Exception as e:
        logger.error(f"Failed to update user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )


@router.post("/logout")
async def logout(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Logout current user

    Note: In a stateless JWT system, logout is primarily handled client-side
    by discarding the tokens. This endpoint is provided for audit logging.

    Args:
        auth: Authentication context
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        Success message
    """
    audit_repo = AuditLogRepository(db)

    # Log logout event
    await audit_repo.create(AuditLogCreate(
        tenant_id=auth.tenant_id,
        user_id=auth.user_id,
        action="user_logged_out",
        resource_type="user",
        resource_id=auth.user_id,
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    ))

    logger.info(f"User logged out: {auth.user_id}")

    return {"message": "Successfully logged out"}
