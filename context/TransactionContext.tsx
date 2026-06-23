'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionForm, TransactionContextType } from '../types';
import { toISO } from '../lib/dateUtils';

const TransactionContext = createContext<TransactionContextType | null>(null);

const now = new Date().toISOString();

const SEED_DATA: Transaction[] = [
  {
    id: '1',
    type: 'credit',
    amount: 5000,
    description: 'Monthly Salary',
    category: 'Salary',
    date: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '2',
    type: 'debit',
    amount: 120,
    description: 'Grocery Shopping',
    category: 'Food & Dining',
    date: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '3',
    type: 'debit',
    amount: 45,
    description: 'Uber Ride',
    category: 'Transport',
    date: new Date().toISOString(),
    createdAt: now,
    updatedAt: now,
  },
  {
    id: '4',
    type: 'credit',
    amount: 250,
    description: 'Freelance Payment',
    category: 'Other',
    date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    createdAt: now,
    updatedAt: now,
  },
];

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // ── Persist to localStorage ──────────────────────────────────────────────
  const persist = useCallback((data: Transaction[]) => {
    setTransactions(data);
    localStorage.setItem('ft_transactions', JSON.stringify(data));
  }, []);

  // ── Migrate old records: backfill updatedAt + normalize all date fields ──
  const migrateAndLoad = useCallback((raw: Transaction[]): Transaction[] =>
    raw.map(t => ({
      ...t,
      date:      toISO(t.date),
      createdAt: toISO(t.createdAt),
      updatedAt: t.updatedAt ? toISO(t.updatedAt) : toISO(t.createdAt),
    }))
  , []);

  // ── Hydrate from localStorage (runs once on mount) ───────────────────────
  const hydrate = useCallback(() => {
    try {
      const stored = localStorage.getItem('ft_transactions');
      if (stored) {
        const migrated = migrateAndLoad(JSON.parse(stored) as Transaction[]);
        setTransactions(migrated);
        localStorage.setItem('ft_transactions', JSON.stringify(migrated));
      } else {
        setTransactions(SEED_DATA);
        localStorage.setItem('ft_transactions', JSON.stringify(SEED_DATA));
      }
    } catch {
      setTransactions(SEED_DATA);
    }
  }, [migrateAndLoad]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const addTransaction = useCallback((tx: TransactionForm) => {
    const ts = new Date().toISOString();
    const newTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
      createdAt: ts,
      updatedAt: ts,
    };
    setTransactions(prev => {
      const next = [newTx, ...prev];
      localStorage.setItem('ft_transactions', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateTransaction = useCallback((id: string, tx: TransactionForm) => {
    setTransactions(prev => {
      const next = prev.map(t =>
        t.id === id ? { ...t, ...tx, updatedAt: new Date().toISOString() } : t
      );
      localStorage.setItem('ft_transactions', JSON.stringify(next));
      return next;
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => {
      const next = prev.filter(t => t.id !== id);
      localStorage.setItem('ft_transactions', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <TransactionContext.Provider
      value={{ transactions, addTransaction, updateTransaction, deleteTransaction }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx) throw new Error('useTransactions must be inside TransactionProvider');
  return ctx;
}
