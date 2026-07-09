'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Transaction, TransactionForm, TransactionContextType } from '../types';
import { fetchApi } from '../lib/api';
import { useAuth } from './AuthContext';

// ── Extended context type ────────────────────────────────────────────────────

export interface PaginatedFetchParams {
  page: number;
  per_page?: number;
  type?: string;
  date_from?: string;
  date_to?: string;
}

export interface PaginationState {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface ExtendedTransactionContextType extends TransactionContextType {
  /** Fetch a specific page with filters — replaces transactions list */
  fetchPage: (params: PaginatedFetchParams) => Promise<void>;
  /** Append next page (for infinite scroll) */
  fetchNextPage: (params: PaginatedFetchParams) => Promise<boolean>; // returns false when no more pages
  pagination: PaginationState;
  resetAndFetch: (params: PaginatedFetchParams) => Promise<void>;
}

// ── Context ──────────────────────────────────────────────────────────────────

const TransactionContext = createContext<ExtendedTransactionContextType | null>(null);

// ── Helper: map API snake_case → camelCase ───────────────────────────────────

function mapTx(t: any): Transaction {
  return {
    ...t,
    createdAt: t.created_at || t.createdAt,
    updatedAt: t.updated_at || t.updatedAt,
    receiptBase64: t.receipt_base64 || t.receiptBase64,
    receiptName: t.receipt_name || t.receiptName,
    receiptMimeType: t.receipt_mime_type || t.receiptMimeType,
  };
}

// ── Build query string ───────────────────────────────────────────────────────

function buildUrl(params: PaginatedFetchParams): string {
  const p = new URLSearchParams();
  p.set('page', String(params.page));
  p.set('per_page', String(params.per_page ?? 12));
  if (params.type && params.type !== 'all') p.set('type', params.type);
  if (params.date_from) p.set('date_from', params.date_from);
  if (params.date_to) p.set('date_to', params.date_to);
  return `/api/transactions?${p.toString()}`;
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    per_page: 12,
    total: 0,
    pages: 1,
  });

  const { user } = useAuth();
  const isFetchingRef = useRef(false);

  // ── Initial load ─────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (params: PaginatedFetchParams) => {
    if (!user) return;
    try {
      setIsLoading(true);
      const data = await fetchApi(buildUrl(params));
      setTransactions(data.items.map(mapTx));
      setPagination({
        page: data.page,
        per_page: data.per_page,
        total: data.total,
        pages: data.pages,
      });
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /** Reset list and fetch page 1 (used when filters change) */
  const resetAndFetch = useCallback(async (params: PaginatedFetchParams) => {
    setTransactions([]);
    await fetchPage({ ...params, page: 1 });
  }, [fetchPage]);

  /** Append next page items (infinite scroll for card view) */
  const fetchNextPage = useCallback(async (params: PaginatedFetchParams): Promise<boolean> => {
    if (!user || isFetchingRef.current) return false;
    isFetchingRef.current = true;
    try {
      const data = await fetchApi(buildUrl(params));
      if (data.items.length === 0) return false;
      setTransactions(prev => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newItems = data.items.map(mapTx).filter((t: Transaction) => !existingIds.has(t.id));
        return [...prev, ...newItems];
      });
      setPagination({
        page: data.page,
        per_page: data.per_page,
        total: data.total,
        pages: data.pages,
      });
      return data.page < data.pages; // true = more pages exist
    } catch (err) {
      console.error('Failed to fetch next page:', err);
      return false;
    } finally {
      isFetchingRef.current = false;
    }
  }, [user]);

  // Initial load when user logs in
  useEffect(() => {
    if (user) {
      fetchPage({ page: 1, per_page: 12 });
    } else {
      setTransactions([]);
      setIsLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (tx: TransactionForm) => {
    try {
      const payload = {
        ...tx,
        receipt_base64: tx.receiptBase64,
        receipt_name: tx.receiptName,
        receipt_mime_type: tx.receiptMimeType,
      };
      const newTx = await fetchApi('/api/transactions', { method: 'POST', data: payload });
      setTransactions(prev => [mapTx(newTx), ...prev]);
    } catch (err) {
      console.error('Failed to add transaction:', err);
      throw err;
    }
  }, []);

  const updateTransaction = useCallback(async (id: string, tx: TransactionForm) => {
    try {
      const payload = {
        ...tx,
        receipt_base64: tx.receiptBase64,
        receipt_name: tx.receiptName,
        receipt_mime_type: tx.receiptMimeType,
      };
      const updatedTx = await fetchApi(`/api/transactions/${id}`, { method: 'PATCH', data: payload });
      setTransactions(prev => prev.map(t => (t.id === id ? mapTx(updatedTx) : t)));
    } catch (err) {
      console.error('Failed to update transaction:', err);
      throw err;
    }
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await fetchApi(`/api/transactions/${id}`, { method: 'DELETE' });
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      throw err;
    }
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        isLoading,
        fetchPage,
        fetchNextPage,
        resetAndFetch,
        pagination,
      }}
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
