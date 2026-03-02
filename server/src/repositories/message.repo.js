/**
 * Message repository - SQL queries for messages table
 */

import { pool } from '../config/database.js';

export async function findByConversation(conversationId, tenantId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE conversation_id = $1 AND tenant_id = $2
     ORDER BY created_at ASC
     LIMIT $3 OFFSET $4`,
    [conversationId, tenantId, limit, offset]
  );
  return rows;
}

export async function findRecentByConversation(conversationId, tenantId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE conversation_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT $3
     ) sub ORDER BY created_at ASC`,
    [conversationId, tenantId, limit]
  );
  return rows;
}

export async function create({ tenantId, conversationId, role, content, toolCalls, toolCallId, toolName, toolResult, inputType, tokensPrompt, tokensCompletion }) {
  const { rows } = await pool.query(
    `INSERT INTO messages (tenant_id, conversation_id, role, content, tool_calls, tool_call_id, tool_name, tool_result, input_type, tokens_prompt, tokens_completion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      tenantId,
      conversationId,
      role,
      content || null,
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolCallId || null,
      toolName || null,
      toolResult ? JSON.stringify(toolResult) : null,
      inputType || 'text',
      tokensPrompt || 0,
      tokensCompletion || 0,
    ]
  );
  return rows[0];
}

export async function countByConversation(conversationId, tenantId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM messages WHERE conversation_id = $1 AND tenant_id = $2',
    [conversationId, tenantId]
  );
  return rows[0].total;
}
