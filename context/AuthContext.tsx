'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContextType, User } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

// Mock users — swap for real API later
const MOCK_USERS = [
  { email: 'demo@finance.app', password: 'demo1234', name: 'Demo User' },
  { email: 'admin@finance.app', password: 'admin1234', name: 'Admin' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session from localStorage (called once on mount) ─────────────
  const restoreSession = useCallback(() => {
    try {
      const stored = localStorage.getItem('ft_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // corrupted storage — start fresh
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // ── Auth actions ─────────────────────────────────────────────────────────
  const login = useCallback((email: string, password: string): boolean => {
    const found = MOCK_USERS.find(
      u => u.email === email && u.password === password
    );
    if (found) {
      const u: User = { email: found.email, name: found.name };
      setUser(u);
      localStorage.setItem('ft_user', JSON.stringify(u));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('ft_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
