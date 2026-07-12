import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, List, Search, Filter, Loader2, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal';
import DateRangePicker from '../components/DateRangePicker';
import { useAppDispatch, useAppSelector } from '../store';
import { addTransaction, updateTransaction, deleteTransaction, fetchAllTransactions } from '../store/transactionSlice';
import { Transaction, TransactionForm } from '../types';
import { toast } from '../utils/toast';
import { exportTransactionsToXlsx } from '../lib/exportXlsx';

type FilterType = 'all' | 'credit' | 'debit';

const PER_PAGE_CARD  = 12; // items per card view page
const PER_PAGE_TABLE = 10; // items per table view page

/** Debounce a value: returns the latest value only after `delay` ms of no changes. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/** Unified Pagination Controls Component */
function PaginationControls({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const btnBase =
    'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer';

  return (
    <div className="flex items-center justify-between mt-6 px-1">
      <p className="text-xs text-txt-muted">
        {total} transaction{total !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${btnBase} border border-white/[0.07] bg-bg-card text-txt-muted hover:bg-white/[0.08] hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeft size={13} />
        </button>

        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-txt-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${btnBase} ${
                p === page
                  ? 'bg-accent/20 border border-accent/40 text-accent-light'
                  : 'border border-white/[0.07] bg-bg-card text-txt-muted hover:bg-white/[0.08] hover:text-txt-primary'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btnBase} border border-white/[0.07] bg-bg-card text-txt-muted hover:bg-white/[0.08] hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const dispatch = useAppDispatch();
  const { transactions, isLoading: txLoading, isFetched } = useAppSelector((state) => state.transactions);
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const router = useRouter();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [view, setView]         = useState<'card' | 'table'>('card');
  const [filter, setFilter]     = useState<FilterType>('all');
  const [search, setSearch]     = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx]     = useState<Transaction | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Debounce date range
  const debouncedDateRange = useDebouncedValue(dateRange, 500);
  const debouncedSearch = useDebouncedValue(search, 300);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // ── Fetch all on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !isFetched && !txLoading) {
      dispatch(fetchAllTransactions());
    }
  }, [user, dispatch, isFetched, txLoading]);

  // ── Client-side Filtering ─────────────────────────────────────────────────
  const filtered = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;

    if (debouncedDateRange.from) {
      if (t?.createdAt && t.createdAt < debouncedDateRange.from) return false;
    }
    if (debouncedDateRange.to) {
      if (t?.createdAt && t.createdAt.slice(0, 10) > debouncedDateRange.to) return false;
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (!t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) {
        return false;
      }
    }

    return true;
  });

  // ── Client-side Summary ───────────────────────────────────────────────────
  const summary = filtered.reduce((acc, t) => {
    if (t.type === 'credit') {
      acc.total_credit += t.amount;
      acc.balance += t.amount;
    } else {
      acc.total_debit += t.amount;
      acc.balance -= t.amount;
    }
    return acc;
  }, { total_credit: 0, total_debit: 0, balance: 0 });

  // ── Client-side Pagination ────────────────────────────────────────────────
  const perPage = view === 'card' ? PER_PAGE_CARD : PER_PAGE_TABLE;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedTransactions = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSave = async (tx: TransactionForm) => {
    if (editTx) {
      await dispatch(updateTransaction({ id: editTx.id, tx })).unwrap();
      toast.success('Transaction updated!');
    } else {
      await dispatch(addTransaction(tx)).unwrap();
      toast.success('Transaction added!');
    }
    setEditTx(null);
  };

  const handleEdit   = (tx: Transaction) => { setEditTx(tx); setModalOpen(true); };

  const handleDelete = async (id: string) => {
    try {
      await dispatch(deleteTransaction(id)).unwrap();
      toast.error('Transaction deleted');
    } catch (err: unknown) {
      toast.error((err as string) || 'Failed to delete transaction');
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warn('No transactions to export');
      return;
    }
    exportTransactionsToXlsx(filtered, 'transactions');
    toast.success(`Exported ${filtered.length} transactions`);
  };

  if (isLoading || !user) return null;

  const isActive = dateRange.from || dateRange.to;

  return (
    <Layout>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-txt-primary tracking-tight">
            Transactions
          </h1>
          <p className="text-sm text-txt-muted mt-0.5">
            {filtered.length} shown · {transactions.length} total
            {isActive && (
              <span className="ml-1.5 text-accent-light font-medium">
                (date filtered)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-txt-secondary bg-bg-card border border-white/[0.09]
              hover:border-accent/40 hover:text-accent-light hover:bg-accent/5
              shadow-sm transition-all cursor-pointer"
          >
            <Download size={15} /> Export XLSX
          </button>

          <button
            onClick={() => { setEditTx(null); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-gradient-to-r from-accent to-accent-light
              shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)]
              transition-all cursor-pointer"
          >
            <Plus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="flex flex-row gap-2.5 sm:gap-4 mb-4 overflow-x-auto w-full">
        {/* Total Credit */}
        <div className="flex-1 min-w-[100px] bg-bg-card border border-white/[0.07] rounded-xl py-2 px-3 sm:p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <p className="text-[9px] sm:text-xs font-semibold text-txt-muted uppercase tracking-wider">Total Credit</p>
          <p className="text-xs sm:text-lg font-extrabold text-credit-light mt-0.5">
            +{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.total_credit)}
          </p>
        </div>

        {/* Total Debit */}
        <div className="flex-1 min-w-[100px] bg-bg-card border border-white/[0.07] rounded-xl py-2 px-3 sm:p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
          <p className="text-[9px] sm:text-xs font-semibold text-txt-muted uppercase tracking-wider">Total Debit</p>
          <p className="text-xs sm:text-lg font-extrabold text-debit-light mt-0.5">
            -{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.total_debit)}
          </p>
        </div>

        {/* Net Balance */}
        <div className="flex-1 min-w-[100px] bg-bg-card border border-white/[0.07] rounded-xl py-2 px-3 sm:p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-accent/5 rounded-full blur-xl pointer-events-none" />
          <p className="text-[9px] sm:text-xs font-semibold text-txt-muted uppercase tracking-wider">Net Balance</p>
          <p className={`text-xs sm:text-lg font-extrabold mt-0.5 ${summary.balance >= 0 ? 'text-credit-light' : 'text-debit-light'}`}>
            {summary.balance >= 0 ? '+' : ''}{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(summary.balance)}
          </p>
        </div>
      </div>

      {/* ── Filter toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="Search by description or category…"
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 bg-bg-card border border-white/[0.09] rounded-xl text-sm
                text-txt-primary placeholder:text-txt-muted outline-none
                focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
            />
          </div>

          <div className="flex flex-row items-center justify-between gap-2 w-full md:w-auto">
            {/* Type filter */}
            <div className="flex items-center gap-1 p-1 bg-bg-card border border-white/[0.07] rounded-xl shrink-0 flex-1 md:flex-initial justify-between">
              <Filter size={13} className="text-txt-muted ml-2 shrink-0" />
              <div className="flex items-center gap-1">
                {(['all', 'credit', 'debit'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setCurrentPage(1); }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer
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
        </div>

        {/* Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={dateRange} onChange={(dr) => { setDateRange(dr); setCurrentPage(1); }} />
          {isActive && (
            <span className="text-xs text-accent-light/80 font-medium">
              📅 Showing{dateRange.from ? ` from ${dateRange.from}` : ''}{dateRange.to ? ` to ${dateRange.to}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
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
          >
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <span className="text-4xl">🔍</span>
                <p className="text-sm text-txt-muted">No transactions match your filter</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {paginatedTransactions.map((tx, i) => (
                    <TransactionCard
                      key={tx.id}
                      tx={tx}
                      index={i}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                <PaginationControls
                  page={currentPage}
                  totalPages={totalPages}
                  total={filtered.length}
                  onPageChange={handlePageChange}
                />
              </>
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
            <TransactionTable
              transactions={paginatedTransactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              page={currentPage}
              totalPages={totalPages}
              total={filtered.length}
              onPageChange={handlePageChange}
              isLoading={txLoading}
            />
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
