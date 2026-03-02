/**
 * Visual card showing an AI tool call in the chat
 */

export function ToolCallCard({ name, args }) {
  return (
    <div className="flex justify-start">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 max-w-[80%]">
        <div className="flex items-center gap-1.5 font-medium mb-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {name}
        </div>
        {args && Object.keys(args).length > 0 && (
          <pre className="text-blue-600 opacity-75 overflow-x-auto">
            {JSON.stringify(args, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
