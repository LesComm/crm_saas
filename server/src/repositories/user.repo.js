/**
 * User repository - SQL queries for users table
 */

import { pool } from '../config/database.js';

export async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function findByEmail(tenantId, email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE tenant_id = $1 AND email = $2',
    [tenantId, email]
  );
  return rows[0] || null;
}

export async function findByEmailAcrossTenants(email) {
  const { rows } = await pool.query(
    'SELECT u.*, t.slug AS tenant_slug, t.name AS tenant_name FROM users u JOIN tenants t ON t.id = u.tenant_id WHERE u.email = $1',
    [email]
  );
  return rows;
}

export async function findAllByTenant(tenantId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    'SELECT id, tenant_id, email, first_name, last_name, role, language, is_active, last_login_at, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [tenantId, limit, offset]
  );
  return rows;
}

export async function create({ tenantId, email, passwordHash, firstName, lastName, role, language }) {
  const { rows } = await pool.query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, tenant_id, email, first_name, last_name, role, language, is_active, created_at`,
    [tenantId, email, passwordHash, firstName, lastName, role || 'user', language || 'fr']
  );
  return rows[0];
}

export async function update(id, tenantId, fields) {
  const allowed = ['email', 'password_hash', 'first_name', 'last_name', 'role', 'language', 'is_active'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (sets.length === 0) return findById(id);

  values.push(id, tenantId);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1}
     RETURNING id, tenant_id, email, first_name, last_name, role, language, is_active, created_at`,
    values
  );
  return rows[0] || null;
}

export async function updateLastLogin(id) {
  await pool.query(
    'UPDATE users SET last_login_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function remove(id, tenantId) {
  const { rowCount } = await pool.query(
    'DELETE FROM users WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rowCount > 0;
}
