"""
Pydantic models for multi-tenancy: Tenant, User, Role, Permission, APIKey
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID, uuid4
from enum import Enum

from pydantic import BaseModel, Field, EmailStr, field_validator


class SubscriptionTier(str, Enum):
    """Subscription tier for tenants"""
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class UserRole(str, Enum):
    """User roles for RBAC"""
    ADMIN = "admin"  # Full access to tenant resources
    MANAGER = "manager"  # Can manage scenarios and users
    ANALYST = "analyst"  # Can create and edit scenarios
    VIEWER = "viewer"  # Read-only access


# ===== Tenant Models =====

class TenantBase(BaseModel):
    """Base tenant model"""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")
    description: Optional[str] = Field(None, description="Tenant description")
    slug: str = Field(..., min_length=1, max_length=255, description="Unique URL-friendly identifier")
    subscription_tier: SubscriptionTier = Field(default=SubscriptionTier.FREE)

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v):
        """Validate slug format"""
        import re
        if not re.match(r'^[a-z0-9-]+$', v):
            raise ValueError('Slug must contain only lowercase letters, numbers, and hyphens')
        return v


class TenantCreate(TenantBase):
    """Model for creating a new tenant"""
    max_users: int = Field(default=5, ge=1, description="Maximum number of users")
    max_scenarios_per_month: int = Field(default=100, ge=1, description="Monthly scenario quota")
    max_storage_gb: float = Field(default=10.0, ge=0.1, description="Storage quota in GB")


class TenantUpdate(BaseModel):
    """Model for updating a tenant"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    subscription_tier: Optional[SubscriptionTier] = None
    max_users: Optional[int] = Field(None, ge=1)
    max_scenarios_per_month: Optional[int] = Field(None, ge=1)
    max_storage_gb: Optional[float] = Field(None, ge=0.1)
    is_active: Optional[bool] = None


class Tenant(TenantBase):
    """Full tenant model with all fields"""
    id: UUID = Field(default_factory=uuid4)
    max_users: int = Field(default=5, ge=1)
    max_scenarios_per_month: int = Field(default=100, ge=1)
    max_storage_gb: float = Field(default=10.0, ge=0.1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


# ===== User Models =====

class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr = Field(..., description="User email address")
    username: str = Field(..., min_length=3, max_length=255, description="Username")
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    role: UserRole = Field(default=UserRole.VIEWER)

    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        """Validate username format"""
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v


class UserCreate(UserBase):
    """Model for creating a new user"""
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    tenant_id: UUID = Field(..., description="Tenant ID this user belongs to")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """Model for updating a user"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=255)
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


class User(UserBase):
    """Full user model (without password)"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    is_active: bool = Field(default=True)
    email_verified: bool = Field(default=False)
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class UserWithTenant(User):
    """User model with tenant details"""
    tenant: Tenant


class UserInDB(User):
    """User model with password hash (for internal use only)"""
    password_hash: str


# ===== Authentication Models =====

class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 3600  # seconds


class TokenData(BaseModel):
    """Data encoded in JWT token"""
    user_id: UUID
    tenant_id: UUID
    username: str
    role: UserRole
    exp: Optional[datetime] = None


class LoginRequest(BaseModel):
    """Login request"""
    email: EmailStr
    password: str
    tenant_slug: Optional[str] = Field(None, description="Tenant slug (optional if email is unique)")


class RegisterRequest(BaseModel):
    """Registration request"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=255)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    tenant_slug: str = Field(..., description="Tenant to register with")


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8)


# ===== API Key Models =====

class APIKeyBase(BaseModel):
    """Base API key model"""
    name: str = Field(..., max_length=255, description="Descriptive name for the key")
    scopes: List[str] = Field(default=["read", "write"], description="Permissions for this key")


class APIKeyCreate(APIKeyBase):
    """Model for creating an API key"""
    expires_at: Optional[datetime] = Field(None, description="Expiration date (optional)")


class APIKey(APIKeyBase):
    """Full API key model (without the actual key)"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    user_id: UUID
    key_prefix: str = Field(..., description="First few characters for identification")
    last_used: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    is_active: bool = Field(default=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class APIKeyWithSecret(APIKey):
    """API key model with the actual key (only returned on creation)"""
    key: str = Field(..., description="The actual API key (only shown once)")


# ===== Role and Permission Models =====

class PermissionBase(BaseModel):
    """Base permission model"""
    action: str = Field(..., description="Action: create, read, update, delete, execute")
    resource: str = Field(..., description="Resource: scenario, evidence, signal, etc.")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Additional conditions")


class PermissionCreate(PermissionBase):
    """Model for creating a permission"""
    role_id: UUID


class Permission(PermissionBase):
    """Full permission model"""
    id: UUID = Field(default_factory=uuid4)
    role_id: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class RoleBase(BaseModel):
    """Base role model"""
    name: str = Field(..., max_length=255, description="Role name")
    description: Optional[str] = Field(None, description="Role description")


class RoleCreate(RoleBase):
    """Model for creating a role"""
    tenant_id: UUID
    permissions: List[PermissionBase] = Field(default_factory=list)


class Role(RoleBase):
    """Full role model"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    is_system: bool = Field(default=False, description="System roles cannot be deleted")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


class RoleWithPermissions(Role):
    """Role model with permissions"""
    permissions: List[Permission] = Field(default_factory=list)


# ===== Tenant Settings Models =====

class TenantSettingsBase(BaseModel):
    """Base tenant settings model"""
    logo_url: Optional[str] = Field(None, max_length=1000)
    custom_domain: Optional[str] = Field(None, max_length=255)
    notification_email: Optional[EmailStr] = None
    monthly_budget_usd: Optional[float] = Field(None, ge=0)
    data_retention_days: int = Field(default=365, ge=1)
    allowed_ip_ranges: List[str] = Field(default_factory=list)
    sso_enabled: bool = Field(default=False)
    sso_provider: Optional[str] = Field(None, max_length=100)
    sso_config: Dict[str, Any] = Field(default_factory=dict)
    settings_json: Dict[str, Any] = Field(default_factory=dict)


class TenantSettingsCreate(TenantSettingsBase):
    """Model for creating tenant settings"""
    tenant_id: UUID


class TenantSettings(TenantSettingsBase):
    """Full tenant settings model"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


# ===== Usage Metrics Models =====

class UsageMetricsBase(BaseModel):
    """Base usage metrics model"""
    period_start: datetime
    period_end: datetime
    scenarios_generated: int = Field(default=0, ge=0)
    api_calls: int = Field(default=0, ge=0)
    tokens_used: int = Field(default=0, ge=0)
    cost_usd: float = Field(default=0.0, ge=0)
    storage_gb_used: float = Field(default=0.0, ge=0)
    active_users: int = Field(default=0, ge=0)


class UsageMetricsCreate(UsageMetricsBase):
    """Model for creating usage metrics"""
    tenant_id: UUID


class UsageMetrics(UsageMetricsBase):
    """Full usage metrics model"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True


# ===== Audit Log Models =====

class AuditLogBase(BaseModel):
    """Base audit log model"""
    action: str = Field(..., description="Action performed")
    resource_type: Optional[str] = Field(None, description="Type of resource")
    resource_id: Optional[UUID] = Field(None, description="ID of resource")
    changes: Optional[Dict[str, Any]] = Field(None, description="Before/after state")
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class AuditLogCreate(AuditLogBase):
    """Model for creating an audit log entry"""
    tenant_id: UUID
    user_id: Optional[UUID] = None


class AuditLog(AuditLogBase):
    """Full audit log model"""
    id: UUID = Field(default_factory=uuid4)
    tenant_id: UUID
    user_id: Optional[UUID] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True
