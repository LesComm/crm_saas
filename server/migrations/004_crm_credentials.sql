-- 004: CRM Credentials (encrypted API keys)
CREATE TABLE crm_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    label VARCHAR(200) NOT NULL DEFAULT 'Production',
    crm_type VARCHAR(50) NOT NULL DEFAULT 'perfex',
    base_url VARCHAR(500) NOT NULL,
    api_token_encrypted BYTEA NOT NULL,
    api_token_iv BYTEA NOT NULL,
    api_token_tag BYTEA NOT NULL,
    connection_status VARCHAR(30) NOT NULL DEFAULT 'untested',
    last_tested_at TIMESTAMPTZ,
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_creds_tenant ON crm_credentials(tenant_id);
CREATE UNIQUE INDEX idx_crm_creds_primary ON crm_credentials(tenant_id) WHERE is_primary = true;

CREATE TRIGGER trg_crm_creds_updated BEFORE UPDATE ON crm_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
