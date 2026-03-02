-- 005: Tenant AI Configs (JSON tool definitions - core of the system)
CREATE TABLE tenant_ai_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    credential_id UUID NOT NULL REFERENCES crm_credentials(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    tool_definitions JSONB NOT NULL DEFAULT '[]',
    system_prompt_overrides JSONB NOT NULL DEFAULT '{}',
    detected_modules JSONB NOT NULL DEFAULT '{}',
    generated_by VARCHAR(50) NOT NULL DEFAULT 'config_agent',
    generation_log JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_configs_tenant ON tenant_ai_configs(tenant_id);
CREATE INDEX idx_ai_configs_active ON tenant_ai_configs(tenant_id, status) WHERE status = 'active';

CREATE TRIGGER trg_ai_configs_updated BEFORE UPDATE ON tenant_ai_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
