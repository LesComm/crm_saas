/**
 * CRM service - Manage CRM credentials with encryption
 */

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

export async function create(tenantId, { label, crmType, baseUrl, apiToken, isPrimary }) {
  // Encrypt the API token
  const { encrypted, iv, tag } = encrypt(apiToken);

  return crmRepo.create({
    tenantId,
    label,
    crmType,
    baseUrl,
    apiTokenEncrypted: encrypted,
    apiTokenIv: iv,
    apiTokenTag: tag,
    isPrimary,
  });
}

export async function testConnection(id, tenantId) {
  const cred = await crmRepo.findById(id, tenantId);
  if (!cred) throw new NotFoundError('CRM credential');

  // Decrypt token
  const apiToken = decrypt(
    cred.api_token_encrypted,
    cred.api_token_iv,
    cred.api_token_tag
  );

  // Test the Perfex CRM connection
  try {
    const response = await fetch(`${cred.base_url}/api/clients`, {
      method: 'GET',
      headers: {
        'authtoken': apiToken,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    });

    const status = response.ok ? 'connected' : 'failed';
    return crmRepo.updateConnectionStatus(id, tenantId, status);
  } catch {
    return crmRepo.updateConnectionStatus(id, tenantId, 'failed');
  }
}

export async function remove(id, tenantId) {
  const deleted = await crmRepo.remove(id, tenantId);
  if (!deleted) throw new NotFoundError('CRM credential');
}
