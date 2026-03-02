/**
 * Chat routes (REST for history, real-time via Socket.io)
 * GET    /api/conversations              - List user conversations
 * GET    /api/conversations/:id          - Get conversation with messages
 * POST   /api/conversations              - Send message (new conversation)
 * POST   /api/conversations/:id/messages - Send message (existing conversation)
 * POST   /api/conversations/:id/archive  - Archive conversation
 */

import { Router } from 'express';
import * as chatCtrl from '../controllers/chat.controller.js';
import { validate } from '../middleware/validation.js';
import { paginationQuery, sendMessageSchema } from '../shared/validators.js';

const router = Router();

router.get('/', validate(paginationQuery, 'query'), chatCtrl.listConversations);
router.get('/:id', chatCtrl.getConversation);
router.post('/', validate(sendMessageSchema), chatCtrl.sendMessage);
router.post('/:id/messages', validate(sendMessageSchema), chatCtrl.sendMessage);
router.post('/:id/archive', chatCtrl.archiveConversation);

export default router;
