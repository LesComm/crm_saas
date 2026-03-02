/**
 * Prompt Builder Service
 * Constructs the system prompt and tool definitions for AI chat
 *
 * Responsibilities:
 * - Build system prompt with tenant context
 * - Format tool definitions for Ollama function calling
 * - Manage context window (trim old messages if needed)
 */

const MAX_HISTORY_MESSAGES = 20; // Keep last N messages to fit context window

/**
 * Build the system prompt for a tenant's chat session
 * @param {object} options
 * @param {object} options.tenant - Tenant record
 * @param {object} options.user - User record
 * @param {object} [options.overrides] - Tenant-specific prompt overrides
 * @returns {string}
 */
export function buildSystemPrompt({ tenant, user, overrides = {} }) {
  const basePrompt = overrides.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const context = [
    basePrompt,
    '',
    '## Contexte',
    `- Entreprise: ${tenant.name}`,
    `- Utilisateur: ${user.first_name} ${user.last_name}`,
    `- Langue: ${user.language || 'fr'}`,
    `- Date: ${new Date().toISOString().split('T')[0]}`,
  ];

  if (overrides.additionalInstructions) {
    context.push('', '## Instructions additionnelles', overrides.additionalInstructions);
  }

  return context.join('\n');
}

/**
 * Format messages for Ollama API, trimming to fit context window
 * @param {object[]} dbMessages - Messages from DB (chronological)
 * @param {string} systemPrompt - System prompt text
 * @returns {object[]} - Formatted messages for Ollama
 */
export function formatMessages(dbMessages, systemPrompt) {
  const messages = [{ role: 'system', content: systemPrompt }];

  // Take the most recent messages to fit context
  const recent = dbMessages.slice(-MAX_HISTORY_MESSAGES);

  for (const msg of recent) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.tool_calls) {
        messages.push({
          role: 'assistant',
          content: msg.content || '',
          tool_calls: msg.tool_calls,
        });
      } else {
        messages.push({ role: 'assistant', content: msg.content });
      }
    } else if (msg.role === 'tool') {
      messages.push({
        role: 'tool',
        content: typeof msg.tool_result === 'string' ? msg.tool_result : JSON.stringify(msg.tool_result),
      });
    }
  }

  return messages;
}

/**
 * Truncate tool results to avoid blowing up context
 * @param {any} result - Raw tool result
 * @param {number} [maxLength=2000] - Max characters
 * @returns {string}
 */
export function truncateToolResult(result, maxLength = 2000) {
  const str = typeof result === 'string' ? result : JSON.stringify(result, null, 0);

  if (str.length <= maxLength) return str;

  return str.slice(0, maxLength) + '\n... (truncated)';
}

// ── Default System Prompt ────────────────────────────

const DEFAULT_SYSTEM_PROMPT = `Tu es un assistant CRM intelligent qui aide les utilisateurs à gérer leur Perfex CRM.

## Capacités
- Tu peux rechercher, créer, modifier et supprimer des données CRM (clients, leads, factures, projets, tâches, etc.)
- Tu utilises les outils disponibles pour interagir avec le CRM
- Tu réponds toujours en français sauf si l'utilisateur te parle dans une autre langue

## Règles
- Avant de modifier ou supprimer des données, confirme toujours avec l'utilisateur
- Quand tu cherches des données, présente les résultats de manière claire et structurée
- Si un outil échoue, explique l'erreur à l'utilisateur simplement
- Ne fabrique jamais de données : utilise toujours les outils pour obtenir les informations du CRM
- Sois concis mais complet dans tes réponses`;
