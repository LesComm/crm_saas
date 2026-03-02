/**
 * Socket.io Chat Handler
 * Handles real-time chat events between client and AI
 *
 * Events (client → server):
 *   chat:send     { conversationId?, content, inputType? }
 *   chat:history  { conversationId, limit?, offset? }
 *
 * Events (server → client):
 *   chat:thinking    {}                    - AI is processing
 *   chat:tool_call   { name, args }        - AI is calling a tool
 *   chat:tool_result { name, result }      - Tool execution result
 *   chat:response    { conversation, message, toolResults }
 *   chat:error       { error }
 */

import * as chatService from '../services/chat.service.js';

export function chatHandler(_io, socket) {
  const { tenantId, userId } = socket;

  // ── Send message ──────────────────────────────────
  socket.on('chat:send', async (data, callback) => {
    try {
      const { conversationId, content, inputType } = data;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return emitError(socket, callback, 'Message content is required');
      }

      // Notify client that AI is thinking
      socket.emit('chat:thinking', {});

      const result = await chatService.processMessage({
        tenantId,
        userId,
        conversationId: conversationId || null,
        content: content.trim(),
        inputType: inputType || 'text',
      });

      // Emit tool results if any
      for (const tr of result.toolResults) {
        socket.emit('chat:tool_call', { name: tr.name, args: tr.args });
        socket.emit('chat:tool_result', { name: tr.name, result: tr.result });
      }

      // Emit final response
      const response = {
        conversation: {
          id: result.conversation.id,
          title: result.conversation.title,
        },
        message: {
          id: result.assistantMessage.id,
          role: 'assistant',
          content: result.assistantMessage.content,
          created_at: result.assistantMessage.created_at,
        },
        toolResults: result.toolResults,
      };

      socket.emit('chat:response', response);

      // ACK if callback provided
      if (typeof callback === 'function') {
        callback({ success: true, data: response });
      }
    } catch (err) {
      console.error('chat:send error:', err.message);
      emitError(socket, callback, err.message);
    }
  });

  // ── Get conversation history ──────────────────────
  socket.on('chat:history', async (data, callback) => {
    try {
      const { conversationId, limit, offset } = data;

      if (!conversationId) {
        return emitError(socket, callback, 'conversationId is required');
      }

      const result = await chatService.getMessages(tenantId, conversationId, { limit, offset });

      if (typeof callback === 'function') {
        callback({ success: true, data: result });
      }
    } catch (err) {
      console.error('chat:history error:', err.message);
      emitError(socket, callback, err.message);
    }
  });

  // ── List conversations ────────────────────────────
  socket.on('chat:list', async (data, callback) => {
    try {
      const { limit, offset } = data || {};
      const conversations = await chatService.getConversations(tenantId, userId, { limit, offset });

      if (typeof callback === 'function') {
        callback({ success: true, data: conversations });
      }
    } catch (err) {
      console.error('chat:list error:', err.message);
      emitError(socket, callback, err.message);
    }
  });

  // ── Archive conversation ──────────────────────────
  socket.on('chat:archive', async (data, callback) => {
    try {
      const { conversationId } = data;
      await chatService.archiveConversation(tenantId, conversationId);

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('chat:archive error:', err.message);
      emitError(socket, callback, err.message);
    }
  });
}

function emitError(socket, callback, message) {
  socket.emit('chat:error', { error: message });
  if (typeof callback === 'function') {
    callback({ success: false, error: message });
  }
}
