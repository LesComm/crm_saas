/**
 * CRM credentials repository - SQL queries for crm_credentials table
 */

import { pool } from '../config/database.js';

export async function findById(id, tenantId) {
  const { rows } = await pool.query(
    'SELECT * FROM crm_credentials WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function findPrimary(tenantId) {
  const { rows } = await pool.query(
    'SELECT * FROM crm_credentials WHERE tenant_id = $1 AND is_primary = true',
    [tenantId]
  );
  return rows[0] || null;
}

export async function findAllByTenant(tenantId) {
  const { rows } = await pool.query(
    'SELECT id, tenant_id, label, crm_type, base_url, connection_status, last_tested_at, is_primary, created_at FROM crm_credentials WHERE tenant_id = $1 ORDER BY created_at DESC',
    [tenantId]
  );
  return rows;
}

export async function create({ tenantId, label, crmType, baseUrl, apiTokenEncrypted, apiTokenIv, apiTokenTag, isPrimary }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // If this is primary, unset existing primary
    if (isPrimary) {
      await client.query(
        'UPDATE crm_credentials SET is_primary = false WHERE tenant_id = $1 AND is_primary = true',
        [tenantId]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO crm_credentials (tenant_id, label, crm_type, base_url, api_token_encrypted, api_token_iv, api_token_tag, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tenant_id, label, crm_type, base_url, connection_status, is_primary, created_at`,
      [tenantId, label, crmType, baseUrl, apiTokenEncrypted, apiTokenIv, apiTokenTag, isPrimary]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateConnectionStatus(id, tenantId, status) {
  const { rows } = await pool.query(
    `UPDATE crm_credentials SET connection_status = $1, last_tested_at = NOW()
     WHERE id = $2 AND tenant_id = $3
     RETURNING id, tenant_id, label, crm_type, base_url, connection_status, last_tested_at, is_primary`,
    [status, id, tenantId]
  );
  return rows[0] || null;
}

export async function remove(id, tenantId) {
  const { rowCount } = await pool.query(
    'DELETE FROM crm_credentials WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rowCount > 0;
}
