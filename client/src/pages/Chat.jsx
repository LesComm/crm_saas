/**
 * Main chat page - sidebar + message area + input
 */

import { useState, useEffect } from 'react';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Header } from '../components/layout/Header.jsx';
import { MessageList } from '../components/chat/MessageList.jsx';
import { ChatInput } from '../components/chat/ChatInput.jsx';
import { VoiceButton } from '../components/chat/VoiceButton.jsx';
import { useChat } from '../hooks/useChat.js';
import { useVoice } from '../hooks/useVoice.js';

export function Chat({ onNavigate }) {
  const chat = useChat();
  const voice = useVoice();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load conversations on mount
  useEffect(() => {
    chat.loadConversations();
  }, []);

  const handleSelectConversation = (id) => {
    chat.loadMessages(id);
  };

  const handleSendMessage = (content) => {
    chat.sendMessage(content, chat.activeConversation?.id);
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block`}>
        <Sidebar
          conversations={chat.conversations}
          activeId={chat.activeConversation?.id}
          onSelect={handleSelectConversation}
          onNew={chat.newConversation}
          onArchive={chat.archiveConversation}
        />
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onNavigate={onNavigate} />

        {/* Messages */}
        <MessageList messages={chat.messages} isThinking={chat.isThinking} />

        {/* Error toast */}
        {chat.error && (
          <div className="mx-4 mb-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm flex items-center justify-between">
            <span>{chat.error}</span>
            <button onClick={() => chat.setError(null)} className="text-red-400 hover:text-red-600 ml-2">
              &#x2715;
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="flex items-end gap-2 border-t border-gray-200 bg-white p-4">
          <div className="flex-1">
            <ChatInput onSend={handleSendMessage} disabled={chat.isThinking} />
          </div>
          <div className="pb-4">
            <VoiceButton
              voiceState={voice}
              onStart={voice.startRecording}
              onStop={() => voice.stopRecording(chat.activeConversation?.id)}
              onCancel={voice.cancelRecording}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
