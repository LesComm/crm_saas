import { useEffect, useRef } from 'react';
import { ToolCallCard } from './ToolCallCard.jsx';
import { Spinner } from '../ui/Spinner.jsx';

export function MessageList({ messages, isThinking }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 mt-20">
          <p className="text-2xl mb-2">Bonjour!</p>
          <p>Posez une question sur votre CRM pour commencer.</p>
        </div>
      )}

      {messages.map((msg) => {
        if (msg.role === 'tool_call') {
          return <ToolCallCard key={msg.id} name={msg.toolName} args={msg.toolArgs} />;
        }

        const isUser = msg.role === 'user';

        return (
          <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                isUser
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        );
      })}

      {isThinking && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Spinner size="sm" />
              <span>Reflexion en cours...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
