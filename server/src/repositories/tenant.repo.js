/**
 * Tenant repository - SQL queries for tenants table
 */

import { pool } from '../config/database.js';

export async function findById(id) {
  const { rows } = await pool.query(
    'SELECT * FROM tenants WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function findBySlug(slug) {
  const { rows } = await pool.query(
    'SELECT * FROM tenants WHERE slug = $1',
    [slug]
  );
  return rows[0] || null;
}

export async function findAll({ limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(
    'SELECT * FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  return rows;
}

export async function count() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM tenants');
  return rows[0].total;
}

export async function create({ name, slug, plan, maxUsers, maxConversationsPerMonth }) {
  const { rows } = await pool.query(
    `INSERT INTO tenants (name, slug, plan, max_users, max_conversations_per_month)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [name, slug, plan || 'free', maxUsers || 3, maxConversationsPerMonth || 100]
  );
  return rows[0];
}

export async function update(id, fields) {
  const allowed = ['name', 'plan', 'max_users', 'max_conversations_per_month', 'is_active', 'settings'];
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

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE tenants SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function countUsers(tenantId) {
  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM users WHERE tenant_id = $1',
    [tenantId]
  );
  return rows[0].total;
}
