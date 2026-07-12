import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, ArrowUpRight, Plus, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Layout from '../components/Layout';
import SummaryCard from '../components/SummaryCard';
import TransactionModal from '../components/TransactionModal';
import { useAppDispatch, useAppSelector } from '../store';
import { addTransaction, fetchAllTransactions, updateTransaction, deleteTransaction } from '../store/transactionSlice';
import { TransactionForm, Transaction } from '../types';
import { toast } from '../utils/toast';
import { useRouter } from 'next/router';
import { formatISTDate } from '../lib/dateUtils';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { transactions, isLoading: txLoading, isFetched } = useAppSelector((state) => state.transactions);
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // Fetch all transactions on mount to populate the store
  useEffect(() => {
    if (user && !isFetched && !txLoading) {
      dispatch(fetchAllTransactions());
    }
  }, [user, dispatch, isFetched, txLoading]);

  // Compute summary instantly from the Redux store
  const summary = transactions.reduce((acc, t) => {
    if (t.type === 'credit') {
      acc.total_credit += t.amount;
      acc.balance += t.amount;
      acc.credit_count += 1;
    } else {
      acc.total_debit += t.amount;
      acc.balance -= t.amount;
      acc.debit_count += 1;
    }
    return acc;
  }, { total_credit: 0, total_debit: 0, balance: 0, credit_count: 0, debit_count: 0 });

  const totalCredit = summary.total_credit;
  const totalDebit = summary.total_debit;
  const balance = summary.balance;
  
  // Compute recent 5 transactions
  const recent = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const handleAdd = async (tx: TransactionForm) => {
    if (editTx) {
      await dispatch(updateTransaction({ id: editTx.id, tx })).unwrap();
      toast.success('Transaction updated!');
    } else {
      await dispatch(addTransaction(tx)).unwrap();
      toast.success('Transaction added!');
    }
    setEditTx(null);
  };

  const handleEdit = (tx: Transaction) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTransaction(id)).unwrap();
      toast.success('Transaction deleted');
    } catch (err) {
      toast.error('Failed to delete transaction');
    }
  };

  if (isLoading || !user) return null;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl sm:text-3xl font-extrabold text-txt-primary tracking-tight"
          >
            Good {getGreeting()}, <span className="bg-gradient-to-r from-accent-light to-credit-light bg-clip-text text-transparent">{user.name.split(' ')[0]}</span> 👋
          </motion.h1>
          <p className="text-sm text-txt-muted mt-1">Here&apos;s your financial overview</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus size={15} /> Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard title="Balance" amount={balance} icon={Wallet} color="accent" delay={0} subtitle="Net total" />
        <SummaryCard title="Total Credit" amount={totalCredit} icon={TrendingUp} color="credit" delay={0.07} subtitle={`${summary.credit_count} transactions`} />
        <SummaryCard title="Total Debit" amount={totalDebit} icon={TrendingDown} color="debit" delay={0.14} subtitle={`${summary.debit_count} transactions`} />
      </div>

      {/* Recent transactions */}
      <div className="bg-bg-card border border-white/[0.07] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
          <h2 className="text-sm font-bold text-txt-primary">Recent Transactions</h2>
          <Link href="/transactions" className="flex items-center gap-1 text-xs text-accent-light hover:text-accent transition-colors no-underline font-medium">
            View all <ArrowRight size={12} />
          </Link>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {txLoading && transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-sm text-txt-muted">Loading transactions...</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-4xl">💸</span>
              <p className="text-sm text-txt-muted">No transactions yet</p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-xs text-accent-light underline underline-offset-2 cursor-pointer"
              >
                Add your first one
              </button>
            </div>
          ) : (
            recent.map((tx, i) => {
              const isCredit = tx.type === 'credit';
              const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount);
              const date = formatISTDate(tx.date);
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                  onClick={() => handleEdit(tx)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isCredit ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      {isCredit ? <TrendingUp size={15} className="text-credit-light" /> : <TrendingDown size={15} className="text-debit-light" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-txt-primary truncate group-hover:text-accent-light transition-colors">{tx.description}</p>
                      <p className="text-xs text-txt-muted">{tx.category} · {date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${isCredit ? 'text-credit-light' : 'text-debit-light'}`}>
                      {isCredit ? '+' : '-'}{fmt}
                    </span>
                    <ArrowUpRight size={12} className="text-txt-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <TransactionModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setEditTx(null); }} 
        onSave={handleAdd} 
        initial={editTx}
      />
    </Layout>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
