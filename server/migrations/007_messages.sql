-- 007: Messages (individual messages in conversations)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    tool_calls JSONB,
    tool_call_id VARCHAR(100),
    tool_name VARCHAR(100),
    tool_result JSONB,
    input_type VARCHAR(20) NOT NULL DEFAULT 'text',
    tokens_prompt INT DEFAULT 0,
    tokens_completion INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_msg_tenant ON messages(tenant_id);
CREATE INDEX idx_msg_conv_recent ON messages(conversation_id, created_at DESC);
