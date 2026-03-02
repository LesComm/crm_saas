/**
 * Chat controller - REST endpoints for conversation history
 * Real-time chat happens via Socket.io, but REST is used for loading history
 */

import * as chatService from '../services/chat.service.js';

export async function listConversations(req, res, next) {
  try {
    const conversations = await chatService.getConversations(
      req.tenantId,
      req.user.userId,
      req.query
    );
    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req, res, next) {
  try {
    const result = await chatService.getMessages(
      req.tenantId,
      req.params.id,
      req.query
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function archiveConversation(req, res, next) {
  try {
    const conversation = await chatService.archiveConversation(req.tenantId, req.params.id);
    res.json({ success: true, data: conversation });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const result = await chatService.processMessage({
      tenantId: req.tenantId,
      userId: req.user.userId,
      conversationId: req.params.id || null,
      content: req.body.content,
      inputType: req.body.inputType || 'text',
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
