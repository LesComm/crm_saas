/**
 * App root - routing + providers
 */

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { SocketProvider } from './contexts/SocketContext.jsx';
import { Login } from './pages/Login.jsx';
import { Chat } from './pages/Chat.jsx';
import { Settings } from './pages/Settings.jsx';
import { Admin } from './pages/Admin.jsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('chat');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (page === 'settings') {
    return <Settings onBack={() => setPage('chat')} />;
  }

  if (page === 'admin') {
    return <Admin onBack={() => setPage('chat')} />;
  }

  return <Chat onNavigate={setPage} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
