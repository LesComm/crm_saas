/**
 * Refresh token repository - SQL queries for refresh_tokens table
 */

import { pool } from '../config/database.js';

export async function create({ userId, tokenHash, expiresAt }) {
  const { rows } = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, expires_at, created_at`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
}

export async function findByHash(tokenHash) {
  const { rows } = await pool.query(
    `SELECT rt.*, u.tenant_id, u.role, u.email, u.is_active AS user_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function revoke(id) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE id = $1',
    [id]
  );
}

export async function revokeAllForUser(userId) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
    [userId]
  );
}

export async function cleanup() {
  const { rowCount } = await pool.query(
    'DELETE FROM refresh_tokens WHERE revoked = true OR expires_at < NOW()'
  );
  return rowCount;
}
