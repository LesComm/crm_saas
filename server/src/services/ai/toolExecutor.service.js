/**
 * Tool Executor Service
 * Validates and executes Perfex CRM tools based on the tenant's AI config
 *
 * Flow:
 * 1. AI returns a tool_call (name + arguments)
 * 2. This service validates the call against the tenant's allowed tools
 * 3. Builds a PerfexClient with the tenant's decrypted credentials
 * 4. Executes the tool and returns the result
 */

import { PerfexClient } from '../../perfex/perfexClient.js';
import { TOOLS_BY_NAME } from '../../perfex/perfexModules.js';
import * as crmRepo from '../../repositories/crm.repo.js';
import * as aiConfigRepo from '../../repositories/aiConfig.repo.js';
import { decrypt } from '../../config/encryption.js';
import { AppError, NotFoundError } from '../../shared/errors.js';

/**
 * Execute a tool call from the AI
 * @param {string} tenantId
 * @param {string} toolName - Tool name from AI function call
 * @param {object} args - Parsed arguments from AI
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function executeTool(tenantId, toolName, args) {
  // 1. Validate tool exists in master catalog
  const toolDef = TOOLS_BY_NAME[toolName];
  if (!toolDef) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // 2. Check tenant has an active config with this tool
  const config = await aiConfigRepo.findActive(tenantId);
  if (!config) {
    return { success: false, error: 'No active AI configuration for this tenant' };
  }

  const allowedTools = config.tool_definitions.map((t) => t.function?.name || t.name);
  if (!allowedTools.includes(toolName)) {
    return { success: false, error: `Tool "${toolName}" is not enabled for this tenant` };
  }

  // 3. Get and decrypt CRM credentials
  const credential = await crmRepo.findById(config.credential_id, tenantId);
  if (!credential) {
    return { success: false, error: 'CRM credentials not found' };
  }

  const apiToken = decrypt(
    credential.api_token_encrypted,
    credential.api_token_iv,
    credential.api_token_tag
  );

  // 4. Execute the tool
  const client = new PerfexClient(credential.base_url, apiToken);

  try {
    const result = await toolDef.execute(client, args || {});
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: `Tool execution failed: ${err.message}`,
    };
  }
}

/**
 * Get the list of available tools for a tenant (for AI system prompt)
 * @param {string} tenantId
 * @returns {Promise<object[]>} - Tool definitions (without execute functions)
 */
export async function getAvailableTools(tenantId) {
  const config = await aiConfigRepo.findActive(tenantId);
  if (!config) return [];
  return config.tool_definitions;
}
