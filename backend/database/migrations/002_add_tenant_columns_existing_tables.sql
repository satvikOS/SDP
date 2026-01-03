-- Add tenant_id columns to existing data tables
-- Version: 002
-- Description: Adds tenant foreign keys to evidence, signals, trends, drivers, and scenarios

-- Note: These tables may not exist yet if using DynamoDB exclusively
-- This migration is prepared for when PostgreSQL is used for these entities

-- Add tenant_id to evidence table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'evidence') THEN
        ALTER TABLE evidence
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_evidence_tenant_id ON evidence(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_evidence_tenant_created ON evidence(tenant_id, created_at);
    END IF;
END $$;

-- Add tenant_id to signals table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signals') THEN
        ALTER TABLE signals
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_signals_tenant_id ON signals(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_signals_tenant_created ON signals(tenant_id, created_at);
    END IF;
END $$;

-- Add tenant_id to trends table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trends') THEN
        ALTER TABLE trends
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_trends_tenant_id ON trends(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_trends_tenant_created ON trends(tenant_id, created_at);
    END IF;
END $$;

-- Add tenant_id to drivers table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers') THEN
        ALTER TABLE drivers
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_drivers_tenant_created ON drivers(tenant_id, created_at);
    END IF;
END $$;

-- Add tenant_id to scenarios table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scenarios') THEN
        ALTER TABLE scenarios
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_scenarios_tenant_id ON scenarios(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_tenant_created ON scenarios(tenant_id, created_at);
    END IF;
END $$;

-- Add tenant_id to actions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'actions') THEN
        ALTER TABLE actions
        ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

        CREATE INDEX IF NOT EXISTS idx_actions_tenant_id ON actions(tenant_id);
    END IF;
END $$;

-- Create Row Level Security (RLS) policies for tenant isolation
-- These ensure that even with direct database access, users can only see their tenant's data

-- Enable RLS on tables
ALTER TABLE IF EXISTS evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Note: These policies assume a current_tenant_id() function or session variable
-- The application will need to set this context before queries

-- Evidence RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'evidence') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON evidence;
        CREATE POLICY tenant_isolation_policy ON evidence
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- Signals RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signals') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON signals;
        CREATE POLICY tenant_isolation_policy ON signals
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- Trends RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trends') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON trends;
        CREATE POLICY tenant_isolation_policy ON trends
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- Drivers RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'drivers') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON drivers;
        CREATE POLICY tenant_isolation_policy ON drivers
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- Scenarios RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'scenarios') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON scenarios;
        CREATE POLICY tenant_isolation_policy ON scenarios
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

-- Actions RLS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'actions') THEN
        DROP POLICY IF EXISTS tenant_isolation_policy ON actions;
        CREATE POLICY tenant_isolation_policy ON actions
            USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

COMMENT ON POLICY tenant_isolation_policy ON evidence IS 'Ensures users can only access their tenants data';
