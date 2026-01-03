# Multi-Tenancy Implementation Guide

## Overview

This document describes the multi-tenancy architecture implemented in the AI-Driven Strategic Foresight Platform (SDP). The system supports multiple organizations (tenants) sharing the same infrastructure while maintaining complete data isolation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Deployment](#deployment)
7. [Security Considerations](#security-considerations)
8. [Usage Examples](#usage-examples)

---

## Architecture Overview

### Multi-Tenancy Model

The platform implements a **shared database, shared schema** multi-tenancy model with the following characteristics:

- **Tenant Isolation**: All data tables include a `tenant_id` foreign key
- **Row-Level Security (RLS)**: PostgreSQL RLS policies enforce automatic tenant filtering
- **Authentication**: JWT-based authentication with tenant context
- **Authorization**: Role-Based Access Control (RBAC) within each tenant

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│              JWT Token in Authorization Header              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │  Auth Middleware          │
                    │  - Verify JWT             │
                    │  - Extract tenant_id      │
                    │  - Set tenant context     │
                    └────┬──────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │  Tenant Isolation         │
                    │  - Enforce RLS            │
                    │  - Filter by tenant_id    │
                    └────┬──────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │  Business Logic           │
                    │  - Scenario generation    │
                    │  - Evidence processing    │
                    └────┬──────────────────────┘
                         │
                    ┌────▼──────────────────────┐
                    │  Multi-Tenant Database    │
                    │  - PostgreSQL + RLS       │
                    │  - DynamoDB (partitioned) │
                    └───────────────────────────┘
```

---

## Database Schema

### Core Tables

#### 1. Tenants (Organizations)

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'free',
    max_users INT DEFAULT 5,
    max_scenarios_per_month INT DEFAULT 100,
    max_storage_gb DECIMAL(10, 2) DEFAULT 10.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Subscription Tiers**:
- `free`: 5 users, 100 scenarios/month, 10GB storage
- `pro`: 50 users, 1,000 scenarios/month, 100GB storage
- `enterprise`: Unlimited users, unlimited scenarios, unlimited storage

#### 2. Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, email)
);
```

**User Roles**:
- `admin`: Full access to all tenant resources and settings
- `manager`: Can manage scenarios, users, and settings
- `analyst`: Can create and edit scenarios
- `viewer`: Read-only access

#### 3. API Keys

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read', 'write'],
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 4. Audit Logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id UUID,
    changes JSONB,
    ip_address INET,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. Usage Metrics

```sql
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    scenarios_generated INT DEFAULT 0,
    api_calls INT DEFAULT 0,
    tokens_used BIGINT DEFAULT 0,
    cost_usd DECIMAL(10, 4) DEFAULT 0
);
```

### Row-Level Security (RLS)

All data tables have RLS policies that automatically filter by `tenant_id`:

```sql
CREATE POLICY tenant_isolation_policy ON scenarios
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```

This ensures that even with direct database access, users can only see their tenant's data.

---

## Authentication & Authorization

### JWT Token Structure

Access tokens contain the following claims:

```json
{
  "sub": "user-uuid",
  "user_id": "user-uuid",
  "tenant_id": "tenant-uuid",
  "username": "john.doe",
  "role": "analyst",
  "exp": 1234567890,
  "iat": 1234567000,
  "type": "access"
}
```

### Token Types

1. **Access Token**: Short-lived (1 hour), used for API requests
2. **Refresh Token**: Long-lived (30 days), used to obtain new access tokens

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

### API Key Format

```
sdp_<random_32_chars>
```

API keys are hashed using bcrypt before storage.

---

## API Endpoints

### Authentication Endpoints

#### Register a New User

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "tenant_slug": "acme-corp"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "viewer",
  "created_at": "2025-01-03T12:00:00Z"
}
```

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "tenant_slug": "acme-corp"
}
```

**Response**: `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

#### Get Current User Profile

```http
GET /auth/me
Authorization: Bearer <access_token>
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "tenant_id": "tenant-uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "role": "analyst",
  "first_name": "John",
  "last_name": "Doe"
}
```

#### Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Tenant Management Endpoints

#### Create a New Tenant

```http
POST /tenants
Content-Type: application/json

{
  "name": "Acme Corporation",
  "slug": "acme-corp",
  "description": "Leading provider of innovative solutions",
  "subscription_tier": "pro",
  "max_users": 50,
  "max_scenarios_per_month": 1000
}
```

#### Get Current Tenant

```http
GET /tenants/me
Authorization: Bearer <access_token>
```

#### Update Current Tenant (Admin Only)

```http
PATCH /tenants/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Acme Corp (Updated)",
  "subscription_tier": "enterprise"
}
```

#### List Tenant Users (Manager/Admin)

```http
GET /tenants/me/users?skip=0&limit=100
Authorization: Bearer <access_token>
```

### Scenario Endpoints (with Tenant Context)

All scenario endpoints automatically filter by the authenticated user's tenant:

```http
POST /scenarios/generate/async
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "company_name": "Acme Energy",
  "industry": "Energy",
  "region": "Global"
}
```

The `tenant_id` is automatically extracted from the JWT token and added to the scenario.

---

## Frontend Integration

### API Client Configuration

Update the API client to include JWT tokens:

```typescript
// frontend/web-app/src/lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 900000,
});

// Add request interceptor to include JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Login Page Example

```tsx
// frontend/web-app/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
        tenant_slug: tenantSlug,
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      router.push('/scenarios');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Organization</label>
          <input
            type="text"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="acme-corp"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
}
```

---

## Deployment

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ai_foresight
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password

# JWT Configuration
JWT_SECRET_KEY=your_super_secret_key_here  # Generate with: openssl rand -hex 32
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
DB_POOL_RECYCLE=3600
```

### Database Migration

Run the migration scripts to create the multi-tenancy schema:

```bash
# Apply migrations
psql -h localhost -U postgres -d ai_foresight -f backend/database/migrations/001_create_multi_tenancy_schema.sql
psql -h localhost -U postgres -d ai_foresight -f backend/database/migrations/002_add_tenant_columns_existing_tables.sql
```

### Docker Compose

Update `docker-compose.yml` to include PostgreSQL:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ai_foresight
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/database/migrations:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Security Considerations

### 1. Data Isolation

- **RLS Policies**: Every query automatically filters by `tenant_id`
- **Middleware Validation**: Double-check tenant context in middleware
- **Foreign Key Constraints**: Prevent cross-tenant data references

### 2. Authentication

- **Password Hashing**: bcrypt with salt rounds
- **JWT Secret**: Store in environment variable, rotate periodically
- **Token Expiration**: Short-lived access tokens (1 hour)
- **HTTPS Only**: Always use HTTPS in production

### 3. Authorization

- **Role-Based Access**: Four roles with clear permission boundaries
- **Least Privilege**: Users start with `viewer` role
- **Audit Logging**: All actions logged with user/tenant context

### 4. Rate Limiting

- **Per-Tenant Quotas**: Enforce scenario generation limits
- **API Rate Limiting**: Prevent abuse (60 requests/minute default)
- **Cost Tracking**: Monitor usage per tenant

### 5. Input Validation

- **Pydantic Models**: Automatic validation on all inputs
- **SQL Injection**: Use parameterized queries only
- **XSS Protection**: Sanitize all user inputs

---

## Usage Examples

### Example 1: Create a New Organization

```bash
curl -X POST https://api.sdp.example.com/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Defense Analytics Corp",
    "slug": "defense-analytics",
    "description": "Strategic foresight for defense sector",
    "subscription_tier": "enterprise"
  }'
```

### Example 2: Register First User

```bash
curl -X POST https://api.sdp.example.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@defense-analytics.com",
    "password": "SecurePassword123!",
    "username": "admin",
    "first_name": "John",
    "last_name": "Smith",
    "tenant_slug": "defense-analytics"
  }'
```

### Example 3: Login and Generate Scenario

```bash
# Login
TOKEN=$(curl -X POST https://api.sdp.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@defense-analytics.com",
    "password": "SecurePassword123!",
    "tenant_slug": "defense-analytics"
  }' | jq -r '.access_token')

# Generate scenario (automatically associated with tenant)
curl -X POST https://api.sdp.example.com/scenarios/generate/async \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Defense Analytics Corp",
    "industry": "Defense",
    "region": "Global",
    "horizon_years": 10
  }'
```

---

## Troubleshooting

### Common Issues

1. **"Invalid credentials" on login**
   - Verify email and tenant_slug combination
   - Check user exists: `SELECT * FROM users WHERE email = 'user@example.com';`

2. **"Access denied" errors**
   - Verify user role has required permissions
   - Check RBAC middleware configuration

3. **Scenarios not appearing**
   - Verify JWT token has correct `tenant_id`
   - Check RLS policy is active: `SELECT * FROM pg_policies WHERE tablename = 'scenarios';`

4. **Token expired errors**
   - Use refresh token to get new access token
   - Increase `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` if needed

---

## Next Steps

1. **Email Verification**: Implement email verification for new users
2. **Password Reset**: Add password reset flow
3. **SSO Integration**: Support SAML/OAuth2 for enterprise customers
4. **Custom Domains**: Allow tenants to use custom domains
5. **Billing Integration**: Integrate with Stripe for subscription management
6. **Advanced Analytics**: Per-tenant usage dashboards

---

## Support

For questions or issues, please contact:
- Email: support@sdp.example.com
- Documentation: https://docs.sdp.example.com
- GitHub Issues: https://github.com/your-org/sdp/issues
