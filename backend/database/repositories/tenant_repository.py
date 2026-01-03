"""
Repository for tenant-related database operations
"""
import logging
from typing import Optional, List
from uuid import UUID

from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from ...shared.models.tenant import (
    Tenant, TenantCreate, TenantUpdate,
    User, UserCreate, UserUpdate, UserInDB,
    Role, RoleCreate,
    Permission, PermissionCreate,
    APIKey, APIKeyCreate,
    TenantSettings, TenantSettingsCreate,
    UsageMetrics, UsageMetricsCreate,
    AuditLog, AuditLogCreate,
)
from ...shared.auth import hash_password, generate_api_key

logger = logging.getLogger(__name__)


class TenantRepository:
    """Repository for tenant operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, tenant_create: TenantCreate) -> Tenant:
        """
        Create a new tenant

        Args:
            tenant_create: Tenant creation data

        Returns:
            Created tenant

        Raises:
            IntegrityError: If tenant with same slug already exists
        """
        # Note: In a real implementation, this would use SQLAlchemy models
        # For now, we'll use raw SQL or assume the ORM models exist

        # This is a placeholder - actual implementation would use SQLAlchemy ORM
        query = """
        INSERT INTO tenants (name, slug, description, subscription_tier, max_users, max_scenarios_per_month, max_storage_gb)
        VALUES (:name, :slug, :description, :subscription_tier, :max_users, :max_scenarios_per_month, :max_storage_gb)
        RETURNING *
        """

        try:
            result = await self.session.execute(
                query,
                {
                    "name": tenant_create.name,
                    "slug": tenant_create.slug,
                    "description": tenant_create.description,
                    "subscription_tier": tenant_create.subscription_tier.value,
                    "max_users": tenant_create.max_users,
                    "max_scenarios_per_month": tenant_create.max_scenarios_per_month,
                    "max_storage_gb": tenant_create.max_storage_gb,
                }
            )
            await self.session.commit()

            row = result.fetchone()
            return Tenant(**dict(row))

        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Failed to create tenant: {e}")
            raise

    async def get_by_id(self, tenant_id: UUID) -> Optional[Tenant]:
        """
        Get tenant by ID

        Args:
            tenant_id: Tenant UUID

        Returns:
            Tenant if found, None otherwise
        """
        # Placeholder implementation
        query = "SELECT * FROM tenants WHERE id = :tenant_id AND is_active = TRUE"
        result = await self.session.execute(query, {"tenant_id": str(tenant_id)})
        row = result.fetchone()

        if row:
            return Tenant(**dict(row))
        return None

    async def get_by_slug(self, slug: str) -> Optional[Tenant]:
        """
        Get tenant by slug

        Args:
            slug: Tenant slug

        Returns:
            Tenant if found, None otherwise
        """
        query = "SELECT * FROM tenants WHERE slug = :slug AND is_active = TRUE"
        result = await self.session.execute(query, {"slug": slug})
        row = result.fetchone()

        if row:
            return Tenant(**dict(row))
        return None

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Tenant]:
        """
        List all tenants

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of tenants
        """
        query = "SELECT * FROM tenants WHERE is_active = TRUE ORDER BY created_at DESC LIMIT :limit OFFSET :skip"
        result = await self.session.execute(query, {"skip": skip, "limit": limit})
        rows = result.fetchall()

        return [Tenant(**dict(row)) for row in rows]

    async def update(self, tenant_id: UUID, tenant_update: TenantUpdate) -> Optional[Tenant]:
        """
        Update tenant

        Args:
            tenant_id: Tenant UUID
            tenant_update: Tenant update data

        Returns:
            Updated tenant if found, None otherwise
        """
        # Build update query dynamically based on provided fields
        update_data = tenant_update.dict(exclude_unset=True)

        if not update_data:
            return await self.get_by_id(tenant_id)

        set_clause = ", ".join([f"{k} = :{k}" for k in update_data.keys()])
        query = f"UPDATE tenants SET {set_clause}, updated_at = CURRENT_TIMESTAMP WHERE id = :id RETURNING *"

        update_data["id"] = str(tenant_id)

        try:
            result = await self.session.execute(query, update_data)
            await self.session.commit()

            row = result.fetchone()
            if row:
                return Tenant(**dict(row))
            return None

        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Failed to update tenant: {e}")
            raise

    async def delete(self, tenant_id: UUID) -> bool:
        """
        Soft delete tenant (set is_active = False)

        Args:
            tenant_id: Tenant UUID

        Returns:
            True if deleted, False if not found
        """
        query = "UPDATE tenants SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = :id"
        result = await self.session.execute(query, {"id": str(tenant_id)})
        await self.session.commit()

        return result.rowcount > 0


class UserRepository:
    """Repository for user operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_create: UserCreate) -> User:
        """
        Create a new user

        Args:
            user_create: User creation data

        Returns:
            Created user (without password)

        Raises:
            IntegrityError: If user with same email/username already exists in tenant
        """
        # Hash password
        password_hash = hash_password(user_create.password)

        query = """
        INSERT INTO users (tenant_id, email, username, password_hash, first_name, last_name, role)
        VALUES (:tenant_id, :email, :username, :password_hash, :first_name, :last_name, :role)
        RETURNING id, tenant_id, email, username, first_name, last_name, role, is_active, email_verified, created_at, updated_at
        """

        try:
            result = await self.session.execute(
                query,
                {
                    "tenant_id": str(user_create.tenant_id),
                    "email": user_create.email,
                    "username": user_create.username,
                    "password_hash": password_hash,
                    "first_name": user_create.first_name,
                    "last_name": user_create.last_name,
                    "role": user_create.role.value,
                }
            )
            await self.session.commit()

            row = result.fetchone()
            return User(**dict(row))

        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Failed to create user: {e}")
            raise

    async def get_by_id(self, user_id: UUID, tenant_id: Optional[UUID] = None) -> Optional[User]:
        """
        Get user by ID

        Args:
            user_id: User UUID
            tenant_id: Optional tenant ID for filtering

        Returns:
            User if found, None otherwise
        """
        if tenant_id:
            query = "SELECT * FROM users WHERE id = :user_id AND tenant_id = :tenant_id AND is_active = TRUE"
            params = {"user_id": str(user_id), "tenant_id": str(tenant_id)}
        else:
            query = "SELECT * FROM users WHERE id = :user_id AND is_active = TRUE"
            params = {"user_id": str(user_id)}

        result = await self.session.execute(query, params)
        row = result.fetchone()

        if row:
            return User(**dict(row))
        return None

    async def get_by_email(self, email: str, tenant_id: Optional[UUID] = None) -> Optional[UserInDB]:
        """
        Get user by email (includes password hash)

        Args:
            email: User email
            tenant_id: Optional tenant ID for filtering

        Returns:
            User with password hash if found, None otherwise
        """
        if tenant_id:
            query = "SELECT * FROM users WHERE email = :email AND tenant_id = :tenant_id AND is_active = TRUE"
            params = {"email": email, "tenant_id": str(tenant_id)}
        else:
            query = "SELECT * FROM users WHERE email = :email AND is_active = TRUE"
            params = {"email": email}

        result = await self.session.execute(query, params)
        row = result.fetchone()

        if row:
            return UserInDB(**dict(row))
        return None

    async def get_by_username(self, username: str, tenant_id: UUID) -> Optional[User]:
        """
        Get user by username within a tenant

        Args:
            username: Username
            tenant_id: Tenant ID

        Returns:
            User if found, None otherwise
        """
        query = "SELECT * FROM users WHERE username = :username AND tenant_id = :tenant_id AND is_active = TRUE"
        result = await self.session.execute(query, {"username": username, "tenant_id": str(tenant_id)})
        row = result.fetchone()

        if row:
            return User(**dict(row))
        return None

    async def list_by_tenant(self, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[User]:
        """
        List all users in a tenant

        Args:
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of users
        """
        query = """
        SELECT id, tenant_id, email, username, first_name, last_name, role, is_active, email_verified, last_login, created_at, updated_at
        FROM users
        WHERE tenant_id = :tenant_id AND is_active = TRUE
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :skip
        """
        result = await self.session.execute(query, {"tenant_id": str(tenant_id), "skip": skip, "limit": limit})
        rows = result.fetchall()

        return [User(**dict(row)) for row in rows]

    async def update(self, user_id: UUID, tenant_id: UUID, user_update: UserUpdate) -> Optional[User]:
        """
        Update user

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID (for isolation)
            user_update: User update data

        Returns:
            Updated user if found, None otherwise
        """
        update_data = user_update.dict(exclude_unset=True, exclude={"password"})

        # Handle password update separately
        if user_update.password:
            update_data["password_hash"] = hash_password(user_update.password)

        if not update_data:
            return await self.get_by_id(user_id, tenant_id)

        set_clause = ", ".join([f"{k} = :{k}" for k in update_data.keys()])
        query = f"""
        UPDATE users
        SET {set_clause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = :id AND tenant_id = :tenant_id
        RETURNING id, tenant_id, email, username, first_name, last_name, role, is_active, email_verified, last_login, created_at, updated_at
        """

        update_data["id"] = str(user_id)
        update_data["tenant_id"] = str(tenant_id)

        try:
            result = await self.session.execute(query, update_data)
            await self.session.commit()

            row = result.fetchone()
            if row:
                return User(**dict(row))
            return None

        except IntegrityError as e:
            await self.session.rollback()
            logger.error(f"Failed to update user: {e}")
            raise

    async def delete(self, user_id: UUID, tenant_id: UUID) -> bool:
        """
        Soft delete user (set is_active = False)

        Args:
            user_id: User UUID
            tenant_id: Tenant UUID (for isolation)

        Returns:
            True if deleted, False if not found
        """
        query = """
        UPDATE users
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE id = :id AND tenant_id = :tenant_id
        """
        result = await self.session.execute(query, {"id": str(user_id), "tenant_id": str(tenant_id)})
        await self.session.commit()

        return result.rowcount > 0

    async def update_last_login(self, user_id: UUID) -> None:
        """
        Update user's last login timestamp

        Args:
            user_id: User UUID
        """
        query = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = :id"
        await self.session.execute(query, {"id": str(user_id)})
        await self.session.commit()


class AuditLogRepository:
    """Repository for audit log operations"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, audit_log: AuditLogCreate) -> AuditLog:
        """
        Create an audit log entry

        Args:
            audit_log: Audit log creation data

        Returns:
            Created audit log entry
        """
        query = """
        INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, changes, ip_address, user_agent)
        VALUES (:tenant_id, :user_id, :action, :resource_type, :resource_id, :changes, :ip_address, :user_agent)
        RETURNING *
        """

        result = await self.session.execute(
            query,
            {
                "tenant_id": str(audit_log.tenant_id),
                "user_id": str(audit_log.user_id) if audit_log.user_id else None,
                "action": audit_log.action,
                "resource_type": audit_log.resource_type,
                "resource_id": str(audit_log.resource_id) if audit_log.resource_id else None,
                "changes": audit_log.changes,
                "ip_address": audit_log.ip_address,
                "user_agent": audit_log.user_agent,
            }
        )
        await self.session.commit()

        row = result.fetchone()
        return AuditLog(**dict(row))

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        user_id: Optional[UUID] = None
    ) -> List[AuditLog]:
        """
        List audit logs for a tenant

        Args:
            tenant_id: Tenant UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
            action: Optional filter by action
            resource_type: Optional filter by resource type
            user_id: Optional filter by user

        Returns:
            List of audit logs
        """
        conditions = ["tenant_id = :tenant_id"]
        params = {"tenant_id": str(tenant_id), "skip": skip, "limit": limit}

        if action:
            conditions.append("action = :action")
            params["action"] = action

        if resource_type:
            conditions.append("resource_type = :resource_type")
            params["resource_type"] = resource_type

        if user_id:
            conditions.append("user_id = :user_id")
            params["user_id"] = str(user_id)

        where_clause = " AND ".join(conditions)
        query = f"""
        SELECT * FROM audit_logs
        WHERE {where_clause}
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :skip
        """

        result = await self.session.execute(query, params)
        rows = result.fetchall()

        return [AuditLog(**dict(row)) for row in rows]
