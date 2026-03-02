-- 002: Tenants (organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    max_users INT NOT NULL DEFAULT 3,
    max_conversations_per_month INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;

CREATE TRIGGER trg_tenants_updated BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
