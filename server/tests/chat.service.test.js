/**
 * Tests for chat service
 */

import './setup.js';
import { jest } from '@jest/globals';

const mockConversationRepo = {
  findById: jest.fn(),
  findAllByUser: jest.fn(),
  create: jest.fn(),
  updateTitle: jest.fn(),
  incrementMessageCount: jest.fn(),
  archive: jest.fn(),
};

const mockMessageRepo = {
  findByConversation: jest.fn(),
  findRecentByConversation: jest.fn(),
  create: jest.fn(),
};

const mockAiConfigRepo = {
  findActive: jest.fn(),
};

const mockTenantRepo = {
  findById: jest.fn(),
};

const mockUserRepo = {
  findById: jest.fn(),
};

const mockOllama = {
  chat: jest.fn(),
};

const mockToolExecutor = {
  executeTool: jest.fn(),
};

const mockPromptBuilder = {
  buildSystemPrompt: jest.fn(),
  formatMessages: jest.fn(),
  truncateToolResult: jest.fn(),
};

jest.unstable_mockModule('../src/repositories/conversation.repo.js', () => mockConversationRepo);
jest.unstable_mockModule('../src/repositories/message.repo.js', () => mockMessageRepo);
jest.unstable_mockModule('../src/repositories/aiConfig.repo.js', () => mockAiConfigRepo);
jest.unstable_mockModule('../src/repositories/tenant.repo.js', () => mockTenantRepo);
jest.unstable_mockModule('../src/repositories/user.repo.js', () => mockUserRepo);
jest.unstable_mockModule('../src/services/ai/ollama.service.js', () => mockOllama);
jest.unstable_mockModule('../src/services/ai/toolExecutor.service.js', () => mockToolExecutor);
jest.unstable_mockModule('../src/services/ai/promptBuilder.service.js', () => mockPromptBuilder);

const chatService = await import('../src/services/chat.service.js');

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = '660e8400-e29b-41d4-a716-446655440001';

const CONVERSATION = {
  id: '880e8400-e29b-41d4-a716-446655440003',
  tenant_id: TENANT_ID,
  user_id: USER_ID,
  title: 'Test conversation',
  message_count: 0,
};

describe('Chat Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should create a new conversation and return AI response', async () => {
      mockConversationRepo.create.mockResolvedValue(CONVERSATION);
      mockMessageRepo.create.mockResolvedValue({ id: 'msg-1', content: 'Test' });
      mockConversationRepo.incrementMessageCount.mockResolvedValue();

      mockAiConfigRepo.findActive.mockResolvedValue(null);
      mockTenantRepo.findById.mockResolvedValue({ id: TENANT_ID, name: 'Test Corp' });
      mockUserRepo.findById.mockResolvedValue({ id: USER_ID, first_name: 'Jean' });
      mockMessageRepo.findRecentByConversation.mockResolvedValue([]);

      mockPromptBuilder.buildSystemPrompt.mockReturnValue('Tu es un assistant CRM.');
      mockPromptBuilder.formatMessages.mockReturnValue([
        { role: 'system', content: 'Tu es un assistant CRM.' },
        { role: 'user', content: 'Bonjour' },
      ]);

      mockOllama.chat.mockResolvedValue({
        message: { content: 'Bonjour! Comment puis-je vous aider?' },
        tokens: { prompt: 50, completion: 20 },
      });

      mockConversationRepo.updateTitle.mockResolvedValue();

      const result = await chatService.processMessage({
        tenantId: TENANT_ID,
        userId: USER_ID,
        conversationId: null,
        content: 'Bonjour',
      });

      expect(result.conversation.id).toBe(CONVERSATION.id);
      expect(result.assistantMessage).toBeDefined();
      expect(result.toolResults).toHaveLength(0);
      expect(mockConversationRepo.create).toHaveBeenCalled();
      expect(mockOllama.chat).toHaveBeenCalled();
    });

    it('should use existing conversation if conversationId is provided', async () => {
      mockConversationRepo.findById.mockResolvedValue({ ...CONVERSATION, message_count: 4 });
      mockMessageRepo.create.mockResolvedValue({ id: 'msg-2', content: 'Oui' });
      mockConversationRepo.incrementMessageCount.mockResolvedValue();

      mockAiConfigRepo.findActive.mockResolvedValue(null);
      mockTenantRepo.findById.mockResolvedValue({ id: TENANT_ID, name: 'Test Corp' });
      mockUserRepo.findById.mockResolvedValue({ id: USER_ID, first_name: 'Jean' });
      mockMessageRepo.findRecentByConversation.mockResolvedValue([]);

      mockPromptBuilder.buildSystemPrompt.mockReturnValue('Tu es un assistant.');
      mockPromptBuilder.formatMessages.mockReturnValue([]);

      mockOllama.chat.mockResolvedValue({
        message: { content: 'Bien sur!' },
        tokens: { prompt: 30, completion: 10 },
      });

      const result = await chatService.processMessage({
        tenantId: TENANT_ID,
        userId: USER_ID,
        conversationId: CONVERSATION.id,
        content: 'Oui',
      });

      expect(mockConversationRepo.findById).toHaveBeenCalledWith(CONVERSATION.id, TENANT_ID);
      expect(mockConversationRepo.create).not.toHaveBeenCalled();
      expect(result.assistantMessage).toBeDefined();
    });

    it('should throw if conversation not found', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);

      await expect(
        chatService.processMessage({
          tenantId: TENANT_ID,
          userId: USER_ID,
          conversationId: 'non-existent',
          content: 'Hello',
        })
      ).rejects.toThrow('Conversation not found');
    });

    it('should handle tool calls from Ollama', async () => {
      mockConversationRepo.create.mockResolvedValue(CONVERSATION);
      mockMessageRepo.create.mockResolvedValue({ id: 'msg-3' });
      mockConversationRepo.incrementMessageCount.mockResolvedValue();

      mockAiConfigRepo.findActive.mockResolvedValue({
        tool_definitions: [{ type: 'function', function: { name: 'list_customers' } }],
      });
      mockTenantRepo.findById.mockResolvedValue({ id: TENANT_ID, name: 'Test Corp' });
      mockUserRepo.findById.mockResolvedValue({ id: USER_ID, first_name: 'Jean' });
      mockMessageRepo.findRecentByConversation.mockResolvedValue([]);

      mockPromptBuilder.buildSystemPrompt.mockReturnValue('System prompt');
      mockPromptBuilder.formatMessages.mockReturnValue([]);
      mockPromptBuilder.truncateToolResult.mockReturnValue('{"clients":[]}');

      // First call: tool_call
      mockOllama.chat.mockResolvedValueOnce({
        message: {
          content: '',
          tool_calls: [
            { function: { name: 'list_customers', arguments: { limit: 5 } } },
          ],
        },
        tokens: { prompt: 100, completion: 30 },
      });

      mockToolExecutor.executeTool.mockResolvedValue({ success: true, data: [] });

      // Second call: final response
      mockOllama.chat.mockResolvedValueOnce({
        message: { content: 'Vous avez 0 clients.' },
        tokens: { prompt: 150, completion: 15 },
      });

      mockConversationRepo.updateTitle.mockResolvedValue();

      const result = await chatService.processMessage({
        tenantId: TENANT_ID,
        userId: USER_ID,
        conversationId: null,
        content: 'Liste mes clients',
      });

      expect(result.toolResults).toHaveLength(1);
      expect(result.toolResults[0].name).toBe('list_customers');
      expect(mockToolExecutor.executeTool).toHaveBeenCalledWith(TENANT_ID, 'list_customers', { limit: 5 });
    });
  });

  describe('getConversations', () => {
    it('should return conversations for a user', async () => {
      mockConversationRepo.findAllByUser.mockResolvedValue([CONVERSATION]);

      const result = await chatService.getConversations(TENANT_ID, USER_ID);

      expect(result).toHaveLength(1);
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(CONVERSATION);
      mockMessageRepo.findByConversation.mockResolvedValue([
        { id: 'm1', role: 'user', content: 'Bonjour' },
        { id: 'm2', role: 'assistant', content: 'Salut!' },
      ]);

      const result = await chatService.getMessages(TENANT_ID, CONVERSATION.id);

      expect(result.conversation.id).toBe(CONVERSATION.id);
      expect(result.messages).toHaveLength(2);
    });

    it('should throw if conversation not found', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);

      await expect(
        chatService.getMessages(TENANT_ID, 'unknown')
      ).rejects.toThrow('Conversation not found');
    });
  });

  describe('archiveConversation', () => {
    it('should archive a conversation', async () => {
      mockConversationRepo.archive.mockResolvedValue({ ...CONVERSATION, status: 'archived' });

      const result = await chatService.archiveConversation(TENANT_ID, CONVERSATION.id);

      expect(mockConversationRepo.archive).toHaveBeenCalledWith(CONVERSATION.id, TENANT_ID);
    });
  });
});
