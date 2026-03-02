-- 006: Conversations (chat sessions)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(300),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata JSONB NOT NULL DEFAULT '{}',
    message_count INT NOT NULL DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conv_tenant_user ON conversations(tenant_id, user_id);
CREATE INDEX idx_conv_recent ON conversations(tenant_id, user_id, last_message_at DESC)
    WHERE status = 'active';

CREATE TRIGGER trg_conv_updated BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
