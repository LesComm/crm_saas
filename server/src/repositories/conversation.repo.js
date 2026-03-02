/**
 * Conversation repository - SQL queries for conversations table
 */

import { pool } from '../config/database.js';

export async function findById(id, tenantId) {
  const { rows } = await pool.query(
    'SELECT * FROM conversations WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function findAllByUser(tenantId, userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT * FROM conversations
     WHERE tenant_id = $1 AND user_id = $2 AND status = 'active'
     ORDER BY last_message_at DESC NULLS LAST, created_at DESC
     LIMIT $3 OFFSET $4`,
    [tenantId, userId, limit, offset]
  );
  return rows;
}

export async function create({ tenantId, userId, title, metadata }) {
  const { rows } = await pool.query(
    `INSERT INTO conversations (tenant_id, user_id, title, metadata)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, userId, title || null, JSON.stringify(metadata || {})]
  );
  return rows[0];
}

export async function updateTitle(id, tenantId, title) {
  const { rows } = await pool.query(
    'UPDATE conversations SET title = $1 WHERE id = $2 AND tenant_id = $3 RETURNING *',
    [title, id, tenantId]
  );
  return rows[0] || null;
}

export async function incrementMessageCount(id, tenantId) {
  await pool.query(
    'UPDATE conversations SET message_count = message_count + 1, last_message_at = NOW() WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
}

export async function archive(id, tenantId) {
  const { rows } = await pool.query(
    "UPDATE conversations SET status = 'archived' WHERE id = $1 AND tenant_id = $2 RETURNING *",
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function remove(id, tenantId) {
  const { rowCount } = await pool.query(
    'DELETE FROM conversations WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rowCount > 0;
}
