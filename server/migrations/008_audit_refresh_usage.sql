-- 008: Audit log, refresh tokens, usage metrics

-- Audit log (security trail)
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log(action, created_at DESC);

-- Refresh tokens (JWT rotation)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_expiry ON refresh_tokens(expires_at) WHERE revoked = false;

-- Usage metrics (per-tenant billing)
CREATE TABLE usage_metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    conversations_count INT NOT NULL DEFAULT 0,
    messages_count INT NOT NULL DEFAULT 0,
    tokens_used BIGINT NOT NULL DEFAULT 0,
    tts_characters_used BIGINT NOT NULL DEFAULT 0,
    api_calls_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(tenant_id, period_start)
);

CREATE INDEX idx_usage_tenant ON usage_metrics(tenant_id, period_start DESC);

CREATE TRIGGER trg_usage_updated BEFORE UPDATE ON usage_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
