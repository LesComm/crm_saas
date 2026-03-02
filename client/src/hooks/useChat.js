/**
 * useChat hook - manages chat state and Socket.io communication
 */

import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext.jsx';
import api from '../config/api.js';

export function useChat() {
  const { socket } = useSocket();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/conversations');
      setConversations(data.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const { data } = await api.get(`/conversations/${conversationId}`);
      setActiveConversation(data.data.conversation);
      setMessages(data.data.messages);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }, []);

  // Send a message via Socket.io
  const sendMessage = useCallback((content, conversationId = null) => {
    if (!socket) return;

    setError(null);

    // Optimistic: add user message immediately
    const tempMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    socket.emit('chat:send', {
      content,
      conversationId: conversationId || activeConversation?.id,
    });
  }, [socket, activeConversation]);

  // Start new conversation
  const newConversation = useCallback(() => {
    setActiveConversation(null);
    setMessages([]);
  }, []);

  // Archive conversation
  const archiveConversation = useCallback((conversationId) => {
    if (!socket) return;
    socket.emit('chat:archive', { conversationId });
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (activeConversation?.id === conversationId) {
      newConversation();
    }
  }, [socket, activeConversation, newConversation]);

  // Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    const onThinking = () => setIsThinking(true);

    const onResponse = (data) => {
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          created_at: data.message.created_at,
        },
      ]);

      // Update active conversation
      if (data.conversation) {
        setActiveConversation(data.conversation);
        // Refresh conversation list
        loadConversations();
      }
    };

    const onToolCall = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `tool-${Date.now()}`,
          role: 'tool_call',
          content: `Appel: ${data.name}`,
          toolName: data.name,
          toolArgs: data.args,
          created_at: new Date().toISOString(),
        },
      ]);
    };

    const onError = (data) => {
      setIsThinking(false);
      setError(data.error);
    };

    socket.on('chat:thinking', onThinking);
    socket.on('chat:response', onResponse);
    socket.on('chat:tool_call', onToolCall);
    socket.on('chat:error', onError);

    return () => {
      socket.off('chat:thinking', onThinking);
      socket.off('chat:response', onResponse);
      socket.off('chat:tool_call', onToolCall);
      socket.off('chat:error', onError);
    };
  }, [socket, loadConversations]);

  return {
    conversations,
    activeConversation,
    messages,
    isThinking,
    error,
    loadConversations,
    loadMessages,
    sendMessage,
    newConversation,
    archiveConversation,
    setError,
  };
}
