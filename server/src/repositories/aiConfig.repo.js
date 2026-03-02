/**
 * AI Config repository - SQL queries for tenant_ai_configs table
 */

import { pool } from '../config/database.js';

export async function findById(id, tenantId) {
  const { rows } = await pool.query(
    'SELECT * FROM tenant_ai_configs WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function findActive(tenantId) {
  const { rows } = await pool.query(
    "SELECT * FROM tenant_ai_configs WHERE tenant_id = $1 AND status = 'active' ORDER BY version DESC LIMIT 1",
    [tenantId]
  );
  return rows[0] || null;
}

export async function findAllByTenant(tenantId) {
  const { rows } = await pool.query(
    'SELECT id, tenant_id, credential_id, version, status, detected_modules, generated_by, created_at FROM tenant_ai_configs WHERE tenant_id = $1 ORDER BY version DESC',
    [tenantId]
  );
  return rows;
}

export async function create({ tenantId, credentialId, toolDefinitions, detectedModules, generatedBy, generationLog }) {
  // Get next version number
  const { rows: vRows } = await pool.query(
    'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM tenant_ai_configs WHERE tenant_id = $1',
    [tenantId]
  );
  const version = vRows[0].next_version;

  const { rows } = await pool.query(
    `INSERT INTO tenant_ai_configs (tenant_id, credential_id, version, status, tool_definitions, detected_modules, generated_by, generation_log)
     VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)
     RETURNING *`,
    [tenantId, credentialId, version, JSON.stringify(toolDefinitions), JSON.stringify(detectedModules), generatedBy, JSON.stringify(generationLog)]
  );
  return rows[0];
}

export async function activate(id, tenantId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Deactivate all other configs for this tenant
    await client.query(
      "UPDATE tenant_ai_configs SET status = 'archived' WHERE tenant_id = $1 AND status = 'active'",
      [tenantId]
    );

    // Activate this one
    const { rows } = await client.query(
      "UPDATE tenant_ai_configs SET status = 'active' WHERE id = $1 AND tenant_id = $2 RETURNING *",
      [id, tenantId]
    );

    await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function remove(id, tenantId) {
  const { rowCount } = await pool.query(
    'DELETE FROM tenant_ai_configs WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );
  return rowCount > 0;
}
