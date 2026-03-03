/**
 * Config Agent Service
 * Generates a JSON AI configuration for a tenant by:
 * 1. Connecting to their Perfex CRM instance
 * 2. Detecting which modules are available
 * 3. Building a tool_definitions array from the master catalog
 * 4. Saving it as a new tenant_ai_configs version
 *
 * "Configuration Over Code Modification" - no tenant-specific code is generated
 */

import { PerfexClient } from '../../perfex/perfexClient.js';
import { PerfexMysqlClient } from '../../perfex/perfexMysqlClient.js';
import { getToolsForModules, getToolDefinitions } from '../../perfex/perfexModules.js';
import * as crmRepo from '../../repositories/crm.repo.js';
import * as aiConfigRepo from '../../repositories/aiConfig.repo.js';
import { decrypt } from '../../config/encryption.js';
import { NotFoundError, AppError } from '../../shared/errors.js';

/**
 * Generate a new AI configuration for a tenant
 * @param {string} tenantId
 * @param {string} credentialId - CRM credential to use
 * @param {object} [options]
 * @param {boolean} [options.autoActivate=false] - Activate immediately
 * @returns {Promise<object>} - The created ai_config record
 */
export async function generateConfig(tenantId, credentialId, options = {}) {
  const log = [];
  const logStep = (step, detail) => log.push({ step, detail, at: new Date().toISOString() });

  // 1. Get and decrypt credentials
  logStep('credentials', 'Loading CRM credentials');
  const credential = await crmRepo.findById(credentialId, tenantId);
  if (!credential) {
    throw new NotFoundError('CRM credential');
  }

  // 2. Build the appropriate client (API or MySQL)
  let client;
  if (credential.connection_mode === 'mysql') {
    const mysqlPassword = decrypt(
      credential.mysql_password_encrypted,
      credential.mysql_password_iv,
      credential.mysql_password_tag
    );
    client = new PerfexMysqlClient({
      host: credential.mysql_host,
      port: credential.mysql_port || 3306,
      user: credential.mysql_user,
      password: mysqlPassword,
      database: credential.mysql_database,
    });
    logStep('connection_test', `Testing MySQL connection to ${credential.mysql_host}:${credential.mysql_port}/${credential.mysql_database}`);
  } else {
    const apiToken = decrypt(
      credential.api_token_encrypted,
      credential.api_token_iv,
      credential.api_token_tag
    );
    client = new PerfexClient(credential.base_url, apiToken);
    logStep('connection_test', `Testing API connection to ${credential.base_url}`);
  }

  const connected = await client.testConnection();

  if (!connected) {
    if (client instanceof PerfexMysqlClient) await client.close().catch(() => {});
    throw new AppError('Cannot connect to CRM. Check credentials.', 400, 'CRM_CONNECTION_FAILED');
  }

  // Update connection status
  await crmRepo.updateConnectionStatus(credentialId, tenantId, 'connected');
  logStep('connection_test', 'Connection successful');

  // 3. Detect available modules
  logStep('module_detection', 'Detecting available Perfex modules');
  const detectedModules = await client.detectModules();
  if (client instanceof PerfexMysqlClient) await client.close().catch(() => {});
  const enabledModules = Object.entries(detectedModules)
    .filter(([, v]) => v)
    .map(([k]) => k);
  logStep('module_detection', `Found ${enabledModules.length} modules: ${enabledModules.join(', ')}`);

  // 4. Build tool definitions from master catalog
  logStep('tool_generation', 'Generating tool definitions from master catalog');
  const tools = getToolsForModules(detectedModules);
  const toolDefinitions = getToolDefinitions(tools);
  logStep('tool_generation', `Generated ${toolDefinitions.length} tool definitions`);

  // 5. Save as new config version
  logStep('save', 'Saving AI configuration');
  const config = await aiConfigRepo.create({
    tenantId,
    credentialId,
    toolDefinitions,
    detectedModules,
    generatedBy: 'config_agent',
    generationLog: log,
  });

  // 6. Auto-activate if requested
  if (options.autoActivate) {
    logStep('activate', 'Auto-activating configuration');
    const activated = await aiConfigRepo.activate(config.id, tenantId);
    return activated;
  }

  return config;
}

/**
 * Activate an existing config version
 */
export async function activateConfig(tenantId, configId) {
  const config = await aiConfigRepo.activate(configId, tenantId);
  if (!config) throw new NotFoundError('AI configuration');
  return config;
}

/**
 * List configs for a tenant
 */
export async function listConfigs(tenantId) {
  return aiConfigRepo.findAllByTenant(tenantId);
}

/**
 * Get active config
 */
export async function getActiveConfig(tenantId) {
  return aiConfigRepo.findActive(tenantId);
}
