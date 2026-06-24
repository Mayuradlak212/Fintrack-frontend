'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, User, LoginForm, RegisterForm } from '../types';
import { fetchApi, setToken, removeToken } from '../lib/api';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    try {
      const res = await fetchApi('/api/auth/me', {
        method: 'PATCH',
        data,
      });
      setUser(res);
      return true;
    } catch (err) {
      throw err;
    }
  }, []);

  // ── Restore session from API (called once on mount) ──────────────────────
  const restoreSession = useCallback(async () => {
    try {
      const data = await fetchApi('/api/auth/me');
      setUser(data);
    } catch {
      // Token invalid or network error
      removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = useCallback(async (data: LoginForm): Promise<boolean> => {
    try {
      const res = await fetchApi('/api/auth/login', {
        method: 'POST',
        data,
      });
      setToken(res.access_token);
      import('../lib/api').then(api => api.setRefreshToken(res.refresh_token));
      setUser(res.user);
      return true;
    } catch (err) {
      throw err;
    }
  }, []);

  const register = useCallback(async (data: RegisterForm): Promise<boolean> => {
    try {
      const res = await fetchApi('/api/auth/register', {
        method: 'POST',
        data,
      });
      setToken(res.access_token);
      import('../lib/api').then(api => api.setRefreshToken(res.refresh_token));
      setUser(res.user);
      return true;
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    removeToken();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, updateProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

