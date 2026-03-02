/**
 * Chat Service - Orchestrates the full chat flow
 *
 * Flow:
 * 1. User sends message
 * 2. Save user message to DB
 * 3. Load conversation history + system prompt + tools
 * 4. Send to Ollama
 * 5. If tool_call → execute tool → feed result back to Ollama → repeat
 * 6. Save assistant response to DB
 * 7. Return final response
 */

import * as conversationRepo from '../repositories/conversation.repo.js';
import * as messageRepo from '../repositories/message.repo.js';
import * as aiConfigRepo from '../repositories/aiConfig.repo.js';
import * as tenantRepo from '../repositories/tenant.repo.js';
import * as userRepo from '../repositories/user.repo.js';
import * as ollama from './ai/ollama.service.js';
import * as toolExecutor from './ai/toolExecutor.service.js';
import { buildSystemPrompt, formatMessages, truncateToolResult } from './ai/promptBuilder.service.js';

const MAX_TOOL_ROUNDS = 5; // Prevent infinite tool loops

/**
 * Process a user message and get AI response
 * @param {object} options
 * @param {string} options.tenantId
 * @param {string} options.userId
 * @param {string} options.conversationId - Existing conversation or null for new
 * @param {string} options.content - User message text
 * @param {string} [options.inputType='text']
 * @returns {Promise<object>} - { conversation, userMessage, assistantMessage, toolResults[] }
 */
export async function processMessage({ tenantId, userId, conversationId, content, inputType = 'text' }) {
  // 1. Get or create conversation
  let conversation;
  if (conversationId) {
    conversation = await conversationRepo.findById(conversationId, tenantId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }
  } else {
    conversation = await conversationRepo.create({
      tenantId,
      userId,
      title: content.slice(0, 100),
    });
  }

  // 2. Save user message
  const userMessage = await messageRepo.create({
    tenantId,
    conversationId: conversation.id,
    role: 'user',
    content,
    inputType,
  });
  await conversationRepo.incrementMessageCount(conversation.id, tenantId);

  // 3. Load context
  const [aiConfig, tenant, user, history] = await Promise.all([
    aiConfigRepo.findActive(tenantId),
    tenantRepo.findById(tenantId),
    userRepo.findById(userId),
    messageRepo.findRecentByConversation(conversation.id, tenantId),
  ]);

  const systemPrompt = buildSystemPrompt({
    tenant,
    user,
    overrides: aiConfig?.system_prompt_overrides || {},
  });

  const tools = aiConfig?.tool_definitions || [];

  // 4. Build messages for Ollama
  const messages = formatMessages(history, systemPrompt);

  // 5. Chat loop (handle tool calls)
  const toolResults = [];
  let finalResponse = null;
  let totalTokensPrompt = 0;
  let totalTokensCompletion = 0;

  for (let round = 0; round < MAX_TOOL_ROUNDS + 1; round++) {
    const response = await ollama.chat({
      messages,
      tools: tools.length > 0 ? tools : undefined,
    });

    totalTokensPrompt += response.tokens.prompt;
    totalTokensCompletion += response.tokens.completion;

    const assistantMsg = response.message;

    // Check for tool calls
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0 && round < MAX_TOOL_ROUNDS) {
      // Save assistant message with tool calls
      await messageRepo.create({
        tenantId,
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMsg.content || null,
        toolCalls: assistantMsg.tool_calls,
      });
      await conversationRepo.incrementMessageCount(conversation.id, tenantId);

      // Add assistant message to context
      messages.push({
        role: 'assistant',
        content: assistantMsg.content || '',
        tool_calls: assistantMsg.tool_calls,
      });

      // Execute each tool call
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function?.name || toolCall.name;
        const toolArgs = toolCall.function?.arguments || toolCall.arguments || {};

        const result = await toolExecutor.executeTool(tenantId, toolName, toolArgs);
        const truncated = truncateToolResult(result);

        toolResults.push({
          name: toolName,
          args: toolArgs,
          result,
        });

        // Save tool result message
        await messageRepo.create({
          tenantId,
          conversationId: conversation.id,
          role: 'tool',
          toolCallId: toolCall.id,
          toolName,
          toolResult: result,
        });
        await conversationRepo.incrementMessageCount(conversation.id, tenantId);

        // Add tool result to context
        messages.push({
          role: 'tool',
          content: truncated,
        });
      }

      // Continue loop to get AI's response after tool results
      continue;
    }

    // No tool calls - this is the final response
    finalResponse = assistantMsg.content || '';
    break;
  }

  // 6. Save final assistant response
  const assistantMessage = await messageRepo.create({
    tenantId,
    conversationId: conversation.id,
    role: 'assistant',
    content: finalResponse,
    tokensPrompt: totalTokensPrompt,
    tokensCompletion: totalTokensCompletion,
  });
  await conversationRepo.incrementMessageCount(conversation.id, tenantId);

  // 7. Auto-generate title on first exchange
  if (!conversationId && conversation.message_count === 0) {
    const autoTitle = content.length > 60 ? content.slice(0, 57) + '...' : content;
    await conversationRepo.updateTitle(conversation.id, tenantId, autoTitle);
    conversation.title = autoTitle;
  }

  return {
    conversation,
    userMessage,
    assistantMessage,
    toolResults,
  };
}

/**
 * Get conversation list for a user
 */
export async function getConversations(tenantId, userId, { limit, offset } = {}) {
  return conversationRepo.findAllByUser(tenantId, userId, { limit, offset });
}

/**
 * Get messages for a conversation
 */
export async function getMessages(tenantId, conversationId, { limit, offset } = {}) {
  const conversation = await conversationRepo.findById(conversationId, tenantId);
  if (!conversation) throw new Error('Conversation not found');
  const messages = await messageRepo.findByConversation(conversationId, tenantId, { limit, offset });
  return { conversation, messages };
}

/**
 * Archive a conversation
 */
export async function archiveConversation(tenantId, conversationId) {
  return conversationRepo.archive(conversationId, tenantId);
}
