import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LayoutGrid, List, Search, Filter, Loader2, Download } from 'lucide-react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import TransactionCard from '../components/TransactionCard';
import TransactionTable from '../components/TransactionTable';
import TransactionModal from '../components/TransactionModal';
import DateRangePicker from '../components/DateRangePicker';
import { useTransactions } from '../context/TransactionContext';
import { useAuth } from '../context/AuthContext';
import { Transaction, TransactionForm } from '../types';
import { toast } from 'react-toastify';
import { exportTransactionsToXlsx } from '../lib/exportXlsx';

type FilterType = 'all' | 'credit' | 'debit';

const PER_PAGE_CARD  = 12; // cards per infinite-scroll batch
const PER_PAGE_TABLE = 10; // rows per table page

/** Debounce a value: returns the latest value only after `delay` ms of no changes. */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function TransactionsPage() {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isLoading: txLoading,
    fetchPage,
    fetchNextPage,
    resetAndFetch,
    pagination,
  } = useTransactions();

  const { user, isLoading } = useAuth();
  const router = useRouter();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [view, setView]         = useState<'card' | 'table'>('card');
  const [filter, setFilter]     = useState<FilterType>('all');
  const [search, setSearch]     = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx]     = useState<Transaction | null>(null);
  const [tablePage, setTablePage] = useState(1);

  // Debounce date range — backend fetch fires 500 ms after user stops picking
  const debouncedDateRange = useDebouncedValue(dateRange, 500);

  // Infinite scroll state
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cardPageRef = useRef(1); // track current card page without re-renders

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login');
  }, [user, isLoading, router]);

  // ── Build params helper ───────────────────────────────────────────────────
  const buildParams = useCallback(
    (page: number, per_page: number) => ({
      page,
      per_page,
      type: filter !== 'all' ? filter : undefined,
      date_from: debouncedDateRange.from || undefined,
      date_to:   debouncedDateRange.to   || undefined,
    }),
    [filter, debouncedDateRange]
  );

  // ── Reset when filters change ─────────────────────────────────────────────
  useEffect(() => {
    cardPageRef.current = 1;
    setHasMore(true);
    setTablePage(1);

    if (view === 'card') {
      resetAndFetch(buildParams(1, PER_PAGE_CARD));
    } else {
      fetchPage(buildParams(1, PER_PAGE_TABLE));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedDateRange, view]);

  // ── Table page change ─────────────────────────────────────────────────────
  const handleTablePageChange = useCallback(
    (page: number) => {
      setTablePage(page);
      fetchPage(buildParams(page, PER_PAGE_TABLE));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [buildParams, fetchPage]
  );

  // ── Intersection Observer (infinite scroll for card view) ─────────────────
  useEffect(() => {
    if (view !== 'card') return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting || isFetchingMore || !hasMore) return;

        const nextPage = cardPageRef.current + 1;
        setIsFetchingMore(true);
        const moreExist = await fetchNextPage(buildParams(nextPage, PER_PAGE_CARD));
        if (moreExist) {
          cardPageRef.current = nextPage;
          setHasMore(true);
        } else {
          setHasMore(false);
        }
        setIsFetchingMore(false);
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => { if (sentinel) observer.unobserve(sentinel); };
  }, [view, isFetchingMore, hasMore, fetchNextPage, buildParams]);

  // ── Client-side search filter (applied on top of backend results) ─────────
  const filtered = search
    ? transactions.filter(
        t =>
          t.description.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase())
      )
    : transactions;

  // ── CRUD handlers ─────────────────────────────────────────────────────────
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

  const handleEdit   = (tx: Transaction) => { setEditTx(tx); setModalOpen(true); };
  const handleDelete = (id: string) => { deleteTransaction(id); toast.error('Transaction deleted'); };

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
            {filtered.length} shown · {pagination.total} total
            {isActive && (
              <span className="ml-1.5 text-accent-light font-medium">
                (date filtered)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start flex-wrap">
          {/* Export button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
              text-txt-secondary bg-bg-card border border-white/[0.09]
              hover:border-accent/40 hover:text-accent-light hover:bg-accent/5
              shadow-sm transition-all cursor-pointer"
          >
            <Download size={15} /> Export XLSX
          </button>

          {/* Add button */}
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

      {/* ── Filter toolbar ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Row 1: Search + Type Filter + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input
              type="text"
              placeholder="Search by description or category…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-bg-card border border-white/[0.09] rounded-xl text-sm
                text-txt-primary placeholder:text-txt-muted outline-none
                focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
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

        {/* Row 2: Date Range Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          {isActive && (
            <span className="text-xs text-accent-light/80 font-medium">
              📅 Showing{dateRange.from ? ` from ${dateRange.from}` : ''}{dateRange.to ? ` to ${dateRange.to}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {txLoading && !isFetchingMore ? (
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
                  {filtered.map((tx, i) => (
                    <TransactionCard
                      key={tx.id}
                      tx={tx}
                      index={i}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {/* Sentinel for IntersectionObserver */}
                <div ref={sentinelRef} className="h-4 mt-4" />

                {/* Fetch-more spinner */}
                {isFetchingMore && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-6 h-6 text-accent animate-spin" />
                  </div>
                )}

                {/* End-of-list message */}
                {!hasMore && filtered.length > 0 && (
                  <p className="text-center text-xs text-txt-muted py-6">
                    All {pagination.total} transactions loaded ✓
                  </p>
                )}
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
              transactions={filtered}
              onEdit={handleEdit}
              onDelete={handleDelete}
              page={tablePage}
              totalPages={pagination.pages}
              total={pagination.total}
              onPageChange={handleTablePageChange}
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
