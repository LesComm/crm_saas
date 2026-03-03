/**
 * CRM service - Manage CRM credentials with encryption
 * Supports two connection modes: 'api' (HTTP) and 'mysql' (direct database)
 */

import mysql from 'mysql2/promise';
import * as crmRepo from '../repositories/crm.repo.js';
import { encrypt, decrypt } from '../config/encryption.js';
import { NotFoundError } from '../shared/errors.js';

export async function getAll(tenantId) {
  return crmRepo.findAllByTenant(tenantId);
}

export async function getById(id, tenantId) {
  const cred = await crmRepo.findById(id, tenantId);
  if (!cred) throw new NotFoundError('CRM credential');
  return cred;
}

export async function create(tenantId, {
  label, crmType, connectionMode, isPrimary,
  // API mode
  baseUrl, apiToken,
  // MySQL mode
  mysqlHost, mysqlPort, mysqlUser, mysqlPassword, mysqlDatabase,
}) {
  const repoData = {
    tenantId, label, crmType, connectionMode: connectionMode || 'api', isPrimary,
  };

  if (connectionMode === 'mysql') {
    // Encrypt the MySQL password
    if (mysqlPassword) {
      const { encrypted, iv, tag } = encrypt(mysqlPassword);
      repoData.mysqlPasswordEncrypted = encrypted;
      repoData.mysqlPasswordIv = iv;
      repoData.mysqlPasswordTag = tag;
    }
    repoData.mysqlHost = mysqlHost;
    repoData.mysqlPort = mysqlPort || 3306;
    repoData.mysqlUser = mysqlUser;
    repoData.mysqlDatabase = mysqlDatabase;
  } else {
    // Encrypt the API token
    if (apiToken) {
      const { encrypted, iv, tag } = encrypt(apiToken);
      repoData.apiTokenEncrypted = encrypted;
      repoData.apiTokenIv = iv;
      repoData.apiTokenTag = tag;
    }
    repoData.baseUrl = baseUrl;
  }

  return crmRepo.create(repoData);
}

export async function testConnection(id, tenantId) {
  const cred = await crmRepo.findById(id, tenantId);
  if (!cred) throw new NotFoundError('CRM credential');

  if (cred.connection_mode === 'mysql') {
    return _testMysqlConnection(id, tenantId, cred);
  }
  return _testApiConnection(id, tenantId, cred);
}

async function _testApiConnection(id, tenantId, cred) {
  const apiToken = decrypt(
    cred.api_token_encrypted,
    cred.api_token_iv,
    cred.api_token_tag
  );

  try {
    const response = await fetch(`${cred.base_url}/api/clients`, {
      method: 'GET',
      headers: { 'authtoken': apiToken, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    const status = response.ok ? 'connected' : 'failed';
    return crmRepo.updateConnectionStatus(id, tenantId, status);
  } catch {
    return crmRepo.updateConnectionStatus(id, tenantId, 'failed');
  }
}

async function _testMysqlConnection(id, tenantId, cred) {
  const mysqlPassword = decrypt(
    cred.mysql_password_encrypted,
    cred.mysql_password_iv,
    cred.mysql_password_tag
  );

  let conn;
  try {
    conn = await mysql.createConnection({
      host: cred.mysql_host,
      port: cred.mysql_port || 3306,
      user: cred.mysql_user,
      password: mysqlPassword,
      database: cred.mysql_database,
      connectTimeout: 10_000,
    });
    await conn.query('SELECT 1');
    return crmRepo.updateConnectionStatus(id, tenantId, 'connected');
  } catch {
    return crmRepo.updateConnectionStatus(id, tenantId, 'failed');
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

export async function remove(id, tenantId) {
  const deleted = await crmRepo.remove(id, tenantId);
  if (!deleted) throw new NotFoundError('CRM credential');
}
