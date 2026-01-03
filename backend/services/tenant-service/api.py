"""
Tenant management service API endpoints
"""
import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from ...database.connection import get_db
from ...database.repositories import TenantRepository, UserRepository, AuditLogRepository
from ...shared.models.tenant import (
    Tenant,
    TenantCreate,
    TenantUpdate,
    User,
    AuditLogCreate,
    UsageMetrics,
)
from ...shared.auth import (
    AuthContext,
    get_current_user,
    require_admin,
    require_manager,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.post("", response_model=Tenant, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_create: TenantCreate,
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Create a new tenant (public endpoint for self-service signup)

    Args:
        tenant_create: Tenant creation data
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        Created tenant

    Raises:
        HTTPException: If tenant with same slug already exists
    """
    tenant_repo = TenantRepository(db)
    audit_repo = AuditLogRepository(db)

    # Check if tenant with same slug exists
    existing_tenant = await tenant_repo.get_by_slug(tenant_create.slug)
    if existing_tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tenant with slug '{tenant_create.slug}' already exists"
        )

    try:
        tenant = await tenant_repo.create(tenant_create)

        # Log audit event (no user context for public signup)
        await audit_repo.create(AuditLogCreate(
            tenant_id=tenant.id,
            user_id=None,
            action="tenant_created",
            resource_type="tenant",
            resource_id=tenant.id,
            ip_address=http_request.client.host if http_request and http_request.client else None,
            user_agent=http_request.headers.get("user-agent") if http_request else None,
        ))

        logger.info(f"Tenant created: {tenant.slug}")
        return tenant

    except Exception as e:
        logger.error(f"Failed to create tenant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create tenant"
        )


@router.get("/me", response_model=Tenant)
async def get_current_tenant(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's tenant

    Args:
        auth: Authentication context
        db: Database session

    Returns:
        Current tenant

    Raises:
        HTTPException: If tenant not found
    """
    tenant_repo = TenantRepository(db)

    tenant = await tenant_repo.get_by_id(auth.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    return tenant


@router.patch("/me", response_model=Tenant)
async def update_current_tenant(
    tenant_update: TenantUpdate,
    auth: AuthContext = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    http_request: Request = None
):
    """
    Update current user's tenant (admin only)

    Args:
        tenant_update: Tenant update data
        auth: Authentication context (admin required)
        db: Database session
        http_request: HTTP request for audit logging

    Returns:
        Updated tenant

    Raises:
        HTTPException: If update fails
    """
    tenant_repo = TenantRepository(db)
    audit_repo = AuditLogRepository(db)

    try:
        tenant = await tenant_repo.update(auth.tenant_id, tenant_update)

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )

        # Log audit event
        await audit_repo.create(AuditLogCreate(
            tenant_id=auth.tenant_id,
            user_id=auth.user_id,
            action="tenant_updated",
            resource_type="tenant",
            resource_id=auth.tenant_id,
            changes=tenant_update.dict(exclude_unset=True),
            ip_address=http_request.client.host if http_request and http_request.client else None,
            user_agent=http_request.headers.get("user-agent") if http_request else None,
        ))

        logger.info(f"Tenant updated: {tenant.slug}")
        return tenant

    except Exception as e:
        logger.error(f"Failed to update tenant: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update tenant"
        )


@router.get("/me/users", response_model=List[User])
async def list_tenant_users(
    skip: int = 0,
    limit: int = 100,
    auth: AuthContext = Depends(require_manager),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users in current tenant (manager or admin only)

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        auth: Authentication context (manager required)
        db: Database session

    Returns:
        List of users in tenant
    """
    user_repo = UserRepository(db)

    users = await user_repo.list_by_tenant(auth.tenant_id, skip=skip, limit=limit)
    return users


@router.get("/{tenant_id}", response_model=Tenant)
async def get_tenant_by_id(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant by ID (public endpoint)

    Args:
        tenant_id: Tenant UUID
        db: Database session

    Returns:
        Tenant

    Raises:
        HTTPException: If tenant not found
    """
    tenant_repo = TenantRepository(db)

    tenant = await tenant_repo.get_by_id(tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    return tenant


@router.get("/slug/{slug}", response_model=Tenant)
async def get_tenant_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get tenant by slug (public endpoint for tenant discovery)

    Args:
        slug: Tenant slug
        db: Database session

    Returns:
        Tenant

    Raises:
        HTTPException: If tenant not found
    """
    tenant_repo = TenantRepository(db)

    tenant = await tenant_repo.get_by_slug(slug)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant with slug '{slug}' not found"
        )

    return tenant
