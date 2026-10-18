'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isApproved: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (input: {
    username: string;
    email: string;
    password: string;
  }) => Promise<{ pendingApproval: boolean }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<{ user: AuthUser }>('/auth/me');
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    // api.ts dispatches this on any 401; nothing in localStorage to clear.
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    const data = await apiPost<{ user: AuthUser }>('/auth/login', { email, password, rememberMe });
    setUser(data?.user ?? null);
  }, []);

  const register = useCallback(
    async (input: { username: string; email: string; password: string }) => {
      const data = await apiPost<{ user?: AuthUser; pendingApproval?: boolean }>(
        '/auth/register',
        input,
      );
      if (data?.pendingApproval) {
        return { pendingApproval: true };
      }
      setUser(data?.user ?? null);
      return { pendingApproval: false };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } finally {
      setUser(null);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin: !!user && (user.isAdmin || user.role === 'admin'),
    loading,
    login,
    register,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
