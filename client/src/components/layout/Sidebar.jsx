/**
 * Sidebar - conversation list + new chat button
 */

import { useEffect } from 'react';

export function Sidebar({ conversations, activeId, onSelect, onNew, onArchive }) {
  return (
    <aside className="w-72 bg-gray-900 text-white flex flex-col h-full">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-lg border border-gray-600 px-3 py-2.5 text-sm hover:bg-gray-800 transition-colors flex items-center gap-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle conversation
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
              conv.id === activeId
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <span className="flex-1 truncate">{conv.title || 'Sans titre'}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive(conv.id);
              }}
              className="hidden group-hover:block text-gray-500 hover:text-red-400 ml-2"
              title="Archiver"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-700 p-3 text-xs text-gray-500">
        CRM Assistant IA
      </div>
    </aside>
  );
}
