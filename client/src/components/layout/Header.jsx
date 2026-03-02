/**
 * Top header bar with user info and navigation
 */

import { useAuth } from '../../contexts/AuthContext.jsx';
import { useSocket } from '../../contexts/SocketContext.jsx';

export function Header({ onToggleSidebar, onNavigate }) {
  const { user, tenant, logout } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden rounded-md p-1.5 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="text-sm font-semibold text-gray-700">
          {tenant?.name || 'CRM Assistant'}
        </h1>

        <span className={`inline-flex items-center gap-1 text-xs ${connected ? 'text-green-600' : 'text-red-500'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {connected ? 'Connecte' : 'Deconnecte'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
          <button
            onClick={() => onNavigate?.('admin')}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Admin
          </button>
        )}
        <button
          onClick={() => onNavigate?.('settings')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          Parametres
        </button>
        <div className="h-4 w-px bg-gray-300" />
        <span className="text-sm text-gray-500">{user?.first_name}</span>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Deconnexion
        </button>
      </div>
    </header>
  );
}
