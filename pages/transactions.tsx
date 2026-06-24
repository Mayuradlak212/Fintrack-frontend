import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, List, Search, Filter, Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, TransactionForm } from '../types';
import { toast } from 'react-toastify';

type FilterType = 'all' | 'credit' | 'debit';

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, isLoading: txLoading } = useTransactions();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<'card' | 'table'>('card');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);

  React.useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filter === 'all' || t.type === filter)
      .filter(t =>
        search === '' ||
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, search]);

  const handleSave = async (tx: TransactionForm) => {
    if (editTx) {
      await updateTransaction(editTx.id, tx);
      toast.success('Transaction updated!');
    } else {
      await addTransaction(tx);
      toast.success('Transaction added!');
    }
    setEditTx(null);
  };

  const handleEdit = (tx: Transaction) => {
    setEditTx(tx);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    toast.error('Transaction deleted');
  };

  if (isLoading || !user) return null;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-txt-primary tracking-tight">Transactions</h1>
          <p className="text-sm text-txt-muted mt-0.5">{filtered.length} of {transactions.length} entries</p>
        </div>
        <button
          onClick={() => { setEditTx(null); setModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] transition-all self-start cursor-pointer"
        >
          <Plus size={15} /> Add Transaction
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-bg-card border border-white/[0.09] rounded-xl text-sm text-txt-primary placeholder:text-txt-muted outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 p-1 bg-bg-card border border-white/[0.07] rounded-xl shrink-0">
          <Filter size={13} className="text-txt-muted ml-2 shrink-0" />
          {(['all', 'credit', 'debit'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer
                ${filter === f
                  ? f === 'credit' ? 'bg-emerald-500/20 text-credit-light'
                    : f === 'debit' ? 'bg-red-500/20 text-debit-light'
                    : 'bg-accent/20 text-accent-light'
                  : 'text-txt-muted hover:text-txt-secondary'
                }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 p-1 bg-bg-card border border-white/[0.07] rounded-xl shrink-0">
          <button
            onClick={() => setView('card')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'card' ? 'bg-accent/20 text-accent-light' : 'text-txt-muted hover:text-txt-secondary'}`}
            title="Card view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView('table')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${view === 'table' ? 'bg-accent/20 text-accent-light' : 'text-txt-muted hover:text-txt-secondary'}`}
            title="Table view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {txLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-32 gap-3"
          >
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
            <p className="text-sm text-txt-muted">Fetching your transactions...</p>
          </motion.div>
        ) : view === 'card' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-txt-muted">No transactions match your filter</p>
              </div>
            ) : (
              filtered.map((tx, i) => (
                <TransactionCard key={tx.id} tx={tx} index={i} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TransactionTable transactions={filtered} onEdit={handleEdit} onDelete={handleDelete} />
          </motion.div>
        )}
      </AnimatePresence>

      <TransactionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTx(null); }}
        onSave={handleSave}
        initial={editTx}
      />
    </Layout>
  );
}
