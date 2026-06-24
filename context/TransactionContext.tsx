'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionForm, TransactionContextType } from '../types';
import { fetchApi } from '../lib/api';
import { useAuth } from './AuthContext';

const TransactionContext = createContext<TransactionContextType | null>(null);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  // ── Fetch from API (runs when user logs in) ──────────────────────────────
  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const data = await fetchApi('/api/transactions?per_page=100'); // increase limit as needed
      // Map API response fields from backend snake_case to frontend if needed
      // Our API sends both (using model_validate), but we use the frontend names here.
      // Assuming the backend schema sends created_at/updated_at but Next.js expects camelCase
      const mapped = data.items.map((t: any) => ({
        ...t,
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt,
        receiptBase64: t.receipt_base64 || t.receiptBase64,
        receiptName: t.receipt_name || t.receiptName,
        receiptMimeType: t.receipt_mime_type || t.receiptMimeType,
      }));
      setTransactions(mapped);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const addTransaction = useCallback(async (tx: TransactionForm) => {
    try {
      // API expects snake_case for receipt details
      const payload = {
        ...tx,
        receipt_base64: tx.receiptBase64,
        receipt_name: tx.receiptName,
        receipt_mime_type: tx.receiptMimeType,
      };
      
      const newTx = await fetchApi('/api/transactions', {
        method: 'POST',
        data: payload,
      });

      const mappedTx = {
        ...newTx,
        createdAt: newTx.created_at || newTx.createdAt,
        updatedAt: newTx.updated_at || newTx.updatedAt,
        receiptBase64: newTx.receipt_base64 || newTx.receiptBase64,
        receiptName: newTx.receipt_name || newTx.receiptName,
        receiptMimeType: newTx.receipt_mime_type || newTx.receiptMimeType,
      };

      setTransactions(prev => [mappedTx, ...prev]);
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

      const updatedTx = await fetchApi(`/api/transactions/${id}`, {
        method: 'PATCH',
        data: payload,
      });

      const mappedTx = {
        ...updatedTx,
        createdAt: updatedTx.created_at || updatedTx.createdAt,
        updatedAt: updatedTx.updated_at || updatedTx.updatedAt,
        receiptBase64: updatedTx.receipt_base64 || updatedTx.receiptBase64,
        receiptName: updatedTx.receipt_name || updatedTx.receiptName,
        receiptMimeType: updatedTx.receipt_mime_type || updatedTx.receiptMimeType,
      };

      setTransactions(prev => prev.map(t => (t.id === id ? mappedTx : t)));
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
      value={{ transactions, addTransaction, updateTransaction, deleteTransaction, isLoading }}
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
