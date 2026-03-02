/**
 * Auth context - manages user authentication state
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../config/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    const storedTenant = localStorage.getItem('tenant');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      if (storedTenant) setTenant(JSON.parse(storedTenant));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const result = data.data;

    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('tenant', JSON.stringify(result.tenant));

    setUser(result.user);
    setTenant(result.tenant);
    return result;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    const result = data.data;

    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('tenant', JSON.stringify(result.tenant));

    setUser(result.user);
    setTenant(result.tenant);
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    localStorage.clear();
    setUser(null);
    setTenant(null);
  }, []);

  const value = {
    user,
    tenant,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
