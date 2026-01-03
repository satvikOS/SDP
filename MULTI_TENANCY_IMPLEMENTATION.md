# Multi-Tenancy Implementation Summary

## Overview

This document summarizes the multi-tenancy support added to the AI-Driven Strategic Foresight Platform (SDP). The implementation enables multiple organizations to securely share the same infrastructure while maintaining complete data isolation.

## What Was Added

### 1. Database Layer

#### New Tables Created
- **`tenants`**: Organizations/tenants with subscription tiers and quotas
- **`users`**: Users belonging to tenants with role-based access
- **`roles`**: Custom roles per tenant
- **`permissions`**: Fine-grained permissions for roles
- **`api_keys`**: Programmatic access keys per tenant
- **`audit_logs`**: Complete audit trail of all actions
- **`tenant_settings`**: Tenant-specific configuration
- **`usage_metrics`**: Usage tracking and billing data
- **`refresh_tokens`**: JWT refresh token management

#### Row-Level Security (RLS)
- PostgreSQL RLS policies on all data tables
- Automatic filtering by `tenant_id`
- Protection against cross-tenant data access

**Location**: `/backend/database/migrations/`
- `001_create_multi_tenancy_schema.sql`
- `002_add_tenant_columns_existing_tables.sql`

### 2. Pydantic Models

Created comprehensive data models for multi-tenancy:

- **Tenant Models**: `Tenant`, `TenantCreate`, `TenantUpdate`, `TenantSettings`
- **User Models**: `User`, `UserCreate`, `UserUpdate`, `UserInDB`, `UserWithTenant`
- **Auth Models**: `Token`, `TokenData`, `LoginRequest`, `RegisterRequest`
- **Role Models**: `Role`, `RoleCreate`, `Permission`, `PermissionCreate`
- **API Key Models**: `APIKey`, `APIKeyCreate`, `APIKeyWithSecret`
- **Audit Models**: `AuditLog`, `AuditLogCreate`
- **Metrics Models**: `UsageMetrics`, `UsageMetricsCreate`

**Location**: `/backend/shared/models/tenant.py`

### 3. Authentication System

#### JWT-Based Authentication
- **Access Tokens**: Short-lived (1 hour) for API requests
- **Refresh Tokens**: Long-lived (30 days) for token renewal
- **Token Claims**: Include `user_id`, `tenant_id`, `username`, `role`

#### Password Security
- **Hashing**: bcrypt with automatic salt generation
- **Requirements**: 8+ chars, uppercase, lowercase, digit
- **Validation**: Pydantic validators on all inputs

#### API Key Support
- **Format**: `sdp_<random_32_chars>`
- **Hashing**: bcrypt for secure storage
- **Scopes**: Configurable permissions per key

**Location**: `/backend/shared/auth/`
- `jwt_handler.py` - Token creation and verification
- `dependencies.py` - FastAPI authentication dependencies

### 4. Middleware

Created middleware for tenant isolation and security:

- **`TenantIsolationMiddleware`**: Enforces tenant context on all requests
- **`RequestLoggingMiddleware`**: Logs all requests with tenant info
- **`RateLimitMiddleware`**: Per-tenant rate limiting (placeholder)
- **`SecurityHeadersMiddleware`**: Adds security headers (CSP, HSTS, etc.)

**Location**: `/backend/shared/middleware/tenant_middleware.py`

### 5. Database Repositories

Repository pattern for database operations with automatic tenant filtering:

- **`TenantRepository`**: CRUD operations for tenants
- **`UserRepository`**: User management with tenant isolation
- **`AuditLogRepository`**: Audit trail management

**Location**: `/backend/database/repositories/tenant_repository.py`

### 6. API Endpoints

#### Authentication Service (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user profile
- `PATCH /auth/me` - Update user profile
- `POST /auth/logout` - Logout (audit only)

#### Tenant Service (`/tenants`)
- `POST /tenants` - Create new tenant
- `GET /tenants/me` - Get current tenant
- `PATCH /tenants/me` - Update tenant (admin only)
- `GET /tenants/me/users` - List tenant users (manager+)
- `GET /tenants/{id}` - Get tenant by ID
- `GET /tenants/slug/{slug}` - Get tenant by slug

**Location**:
- `/backend/services/auth-service/api.py`
- `/backend/services/tenant-service/api.py`

### 7. Database Connection Management

Enhanced database connection layer with tenant context:

- **Async/Sync Support**: Both async and sync database sessions
- **Connection Pooling**: Configurable pool size and overflow
- **Tenant Context**: Automatic tenant_id setting for RLS
- **Session Management**: Context managers for safe transactions

**Location**:
- `/backend/database/db_config.py`
- `/backend/database/connection.py`

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│                  JWT Token in Headers                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                ┌────────▼────────────────────┐
                │  Authentication Middleware  │
                │  • Verify JWT               │
                │  • Extract tenant_id        │
                │  • Validate permissions     │
                └────────┬────────────────────┘
                         │
                ┌────────▼────────────────────┐
                │  Tenant Isolation Middleware│
                │  • Set tenant context       │
                │  • Enforce RLS              │
                │  • Rate limiting            │
                └────────┬────────────────────┘
                         │
                ┌────────▼────────────────────┐
                │  Business Logic             │
                │  • Scenario generation      │
                │  • Evidence processing      │
                │  • Auto tenant filtering    │
                └────────┬────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                  │
┌───────▼────────┐              ┌─────────▼────────┐
│  PostgreSQL    │              │    DynamoDB      │
│  + RLS         │              │  + Tenant Keys   │
│  • tenants     │              │  • scenarios     │
│  • users       │              │  • cache         │
│  • audit_logs  │              └──────────────────┘
└────────────────┘
```

## Security Features

### Data Isolation
- ✅ Row-Level Security (RLS) on all tables
- ✅ Foreign key constraints prevent cross-tenant references
- ✅ Automatic tenant filtering in queries
- ✅ Middleware validation of tenant context

### Authentication
- ✅ JWT tokens with secure signing (HS256)
- ✅ Password hashing with bcrypt
- ✅ Token expiration and rotation
- ✅ Refresh token mechanism

### Authorization
- ✅ Role-Based Access Control (RBAC)
- ✅ Four predefined roles: admin, manager, analyst, viewer
- ✅ Permission checking at endpoint level
- ✅ Custom roles per tenant (extensible)

### Audit & Compliance
- ✅ Complete audit trail of all actions
- ✅ IP address and user agent logging
- ✅ Change tracking (before/after state)
- ✅ Per-tenant audit log access

### Security Headers
- ✅ Content Security Policy (CSP)
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ X-Frame-Options (clickjacking protection)
- ✅ X-Content-Type-Options (MIME sniffing protection)

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_foresight
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure_password>

# JWT
JWT_SECRET_KEY=<generate_with_openssl_rand_-hex_32>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Multi-Tenancy
TENANT_ISOLATION_ENABLED=true
ROW_LEVEL_SECURITY_ENABLED=true

# Database Pool
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

### Generate JWT Secret

```bash
openssl rand -hex 32
```

## Database Setup

### 1. Create Database

```bash
createdb -U postgres ai_foresight
```

### 2. Run Migrations

```bash
psql -U postgres -d ai_foresight -f backend/database/migrations/001_create_multi_tenancy_schema.sql
psql -U postgres -d ai_foresight -f backend/database/migrations/002_add_tenant_columns_existing_tables.sql
```

### 3. Verify Schema

```bash
psql -U postgres -d ai_foresight -c "\dt"
```

You should see:
- tenants
- users
- roles
- permissions
- api_keys
- audit_logs
- tenant_settings
- usage_metrics
- refresh_tokens

## Quick Start Guide

### 1. Create a Tenant

```bash
curl -X POST http://localhost:8000/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "subscription_tier": "pro"
  }'
```

### 2. Register First User

```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme-corp.com",
    "password": "SecurePass123",
    "username": "admin",
    "tenant_slug": "acme-corp"
  }'
```

### 3. Login

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@acme-corp.com",
    "password": "SecurePass123",
    "tenant_slug": "acme-corp"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 4. Use Token

```bash
TOKEN="<access_token_from_login>"

curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## User Roles & Permissions

| Role | Can View | Can Create | Can Edit | Can Delete | Can Manage Users | Can Manage Settings |
|------|----------|------------|----------|------------|------------------|---------------------|
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Analyst** | ✅ | ✅ | ✅ (own) | ✅ (own) | ❌ | ❌ |
| **Manager** | ✅ | ✅ | ✅ (all) | ✅ (all) | ✅ | ⚠️ (limited) |
| **Admin** | ✅ | ✅ | ✅ (all) | ✅ (all) | ✅ | ✅ |

## Subscription Tiers

| Tier | Users | Scenarios/Month | Storage | Price |
|------|-------|-----------------|---------|-------|
| **Free** | 5 | 100 | 10 GB | $0 |
| **Pro** | 50 | 1,000 | 100 GB | $299/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Custom |

## Testing

### Unit Tests

```bash
# Test authentication
pytest backend/tests/test_auth.py

# Test tenant isolation
pytest backend/tests/test_tenant_isolation.py

# Test RBAC
pytest backend/tests/test_rbac.py
```

### Integration Tests

```bash
# Test full user flow
pytest backend/tests/integration/test_user_flow.py
```

## Monitoring & Observability

### Audit Logs

Query audit logs for a tenant:

```sql
SELECT
    timestamp,
    action,
    resource_type,
    resource_id,
    u.email as user_email
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.tenant_id = '<tenant-uuid>'
ORDER BY timestamp DESC
LIMIT 100;
```

### Usage Metrics

Track tenant usage:

```sql
SELECT
    period_start,
    period_end,
    scenarios_generated,
    api_calls,
    cost_usd
FROM usage_metrics
WHERE tenant_id = '<tenant-uuid>'
ORDER BY period_start DESC;
```

## Migration Path for Existing Data

If you have existing scenarios without tenant_id:

```sql
-- 1. Create a default tenant for existing data
INSERT INTO tenants (name, slug, subscription_tier)
VALUES ('Legacy Organization', 'legacy', 'enterprise')
RETURNING id;

-- 2. Update existing scenarios (if using PostgreSQL)
UPDATE scenarios
SET tenant_id = '<legacy-tenant-id>'
WHERE tenant_id IS NULL;

-- 3. For DynamoDB, use a migration script
-- See: backend/scripts/migrate_dynamodb_tenant.py
```

## Known Limitations

1. **API Key Authentication**: Placeholder implementation, needs database lookup
2. **Rate Limiting**: Middleware exists but needs Redis integration
3. **Email Verification**: Not yet implemented
4. **Password Reset**: Not yet implemented
5. **SSO Integration**: Not yet implemented
6. **Custom Domains**: Not yet implemented

## Next Steps

### High Priority
- [ ] Implement email verification
- [ ] Add password reset flow
- [ ] Complete API key authentication
- [ ] Integrate Redis for rate limiting
- [ ] Create frontend login/register components

### Medium Priority
- [ ] Add usage-based billing integration
- [ ] Implement SSO (SAML/OAuth2)
- [ ] Create admin dashboard for tenant management
- [ ] Add multi-factor authentication (MFA)
- [ ] Implement custom domain support

### Low Priority
- [ ] Add tenant theming/branding
- [ ] Create tenant analytics dashboard
- [ ] Implement data export/import
- [ ] Add webhook notifications
- [ ] Create mobile app support

## Troubleshooting

### Common Issues

**Issue**: "Invalid credentials" on login
**Solution**: Check that user exists in the correct tenant. Email must be unique per tenant.

**Issue**: "Access denied" errors
**Solution**: Verify user role has required permissions. Check RBAC middleware configuration.

**Issue**: Token expired
**Solution**: Use refresh token endpoint to get new access token.

**Issue**: Can't see scenarios
**Solution**: Verify JWT token has correct tenant_id. Check RLS policy is active.

## Documentation

For detailed documentation, see:
- [Multi-Tenancy Guide](/docs/MULTI_TENANCY_GUIDE.md) - Complete implementation guide
- [API Documentation](/docs/API.md) - Full API reference
- [Database Schema](/docs/DATABASE_SCHEMA.md) - Database design

## Support

For questions or issues:
- Create an issue on GitHub
- Contact: support@sdp.example.com
- Documentation: https://docs.sdp.example.com

---

**Implementation Status**: ✅ Core multi-tenancy complete
**Last Updated**: 2025-01-03
**Version**: 1.0.0
