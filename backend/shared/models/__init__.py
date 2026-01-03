"""Shared data models for the AI Foresight Platform."""

from .evidence import Evidence, EvidenceSource
from .signal import Signal, SignalCluster
from .trend import Trend, TrendForecast
from .driver import Driver, Uncertainty
from .scenario import Scenario, ScenarioSet, Signpost
from .action import Action, ActionPlan, RobustAction
from .tenant import (
    Tenant, TenantCreate, TenantUpdate,
    User, UserCreate, UserUpdate, UserWithTenant, UserInDB,
    Role, RoleCreate, RoleWithPermissions,
    Permission, PermissionCreate,
    APIKey, APIKeyCreate, APIKeyWithSecret,
    TenantSettings, TenantSettingsCreate,
    UsageMetrics, UsageMetricsCreate,
    AuditLog, AuditLogCreate,
    Token, TokenData, LoginRequest, RegisterRequest, RefreshTokenRequest,
    PasswordResetRequest, PasswordResetConfirm,
    SubscriptionTier, UserRole,
)

__all__ = [
    "Evidence",
    "EvidenceSource",
    "Signal",
    "SignalCluster",
    "Trend",
    "TrendForecast",
    "Driver",
    "Uncertainty",
    "Scenario",
    "ScenarioSet",
    "Signpost",
    "Action",
    "ActionPlan",
    "RobustAction",
    # Multi-tenancy models
    "Tenant",
    "TenantCreate",
    "TenantUpdate",
    "User",
    "UserCreate",
    "UserUpdate",
    "UserWithTenant",
    "UserInDB",
    "Role",
    "RoleCreate",
    "RoleWithPermissions",
    "Permission",
    "PermissionCreate",
    "APIKey",
    "APIKeyCreate",
    "APIKeyWithSecret",
    "TenantSettings",
    "TenantSettingsCreate",
    "UsageMetrics",
    "UsageMetricsCreate",
    "AuditLog",
    "AuditLogCreate",
    "Token",
    "TokenData",
    "LoginRequest",
    "RegisterRequest",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "SubscriptionTier",
    "UserRole",
]
