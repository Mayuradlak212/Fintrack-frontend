import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pencil, Trash2, Paperclip, TrendingUp, TrendingDown,
  ChevronUp, ChevronDown, MapPin, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Transaction } from '../types';
import ConfirmDialog from './ConfirmDialog';
import ReceiptViewer from './ReceiptViewer';
import { formatISTDateTime } from '../lib/dateUtils';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  // Pagination props
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

type SortKey = 'date' | 'amount' | 'description' | 'type';
type SortDir = 'asc' | 'desc';

// ── Pagination Controls ───────────────────────────────────────────────────────

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

  // Build visible page numbers with ellipsis
  const getPages = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    if (page <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    
    if (page >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    
    return [1, '...', page, '...', totalPages];
  };

  const btnBase =
    'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-4 px-1 gap-4">
      <p className="text-xs text-txt-muted w-full text-center sm:text-left">
        {total} transaction{total !== 1 ? 's' : ''}
      </p>

      <div className="flex items-center justify-center gap-1 flex-wrap w-full sm:w-auto">
        {/* Prev */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${btnBase} border border-white/[0.07] bg-bg-card text-txt-muted
            hover:bg-white/[0.08] hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronLeft size={13} />
        </button>

        {/* Page numbers */}
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

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={`${btnBase} border border-white/[0.07] bg-bg-card text-txt-muted
            hover:bg-white/[0.08] hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Main Table ────────────────────────────────────────────────────────────────

export default function TransactionTable({
  transactions,
  onEdit,
  onDelete,
  page,
  totalPages,
  total,
  onPageChange,
  isLoading,
}: TransactionTableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date') cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    else if (sortKey === 'amount') cmp = a.amount - b.amount;
    else if (sortKey === 'description') cmp = a.description.localeCompare(b.description);
    else if (sortKey === 'type') cmp = a.type.localeCompare(b.type);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ChevronUp size={12} className="text-txt-muted opacity-40" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-accent-light" />
      : <ChevronDown size={12} className="text-accent-light" />;
  };

  const thCls = 'text-left text-[11px] font-semibold text-txt-muted uppercase tracking-wider py-3 px-4';
  const tdCls = 'py-3 px-4 text-sm text-txt-secondary';

  return (
    <>
      {/* Responsive table wrapper */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/[0.07] bg-bg-card">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {([
                ['type', 'Type'],
                ['description', 'Description'],
                ['amount', 'Amount'],
                ['date', 'Date'],
              ] as [SortKey, string][]).map(([k, label]) => (
                <th key={k} className={thCls}>
                  <button
                    onClick={() => toggleSort(k)}
                    className="flex items-center gap-1.5 hover:text-txt-primary transition-colors cursor-pointer"
                  >
                    {label}
                    <SortIcon k={k} />
                  </button>
                </th>
              ))}
              <th className={thCls}>Category</th>
              <th className={thCls}>Receipt</th>
              <th className={thCls}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {isLoading ? (
                // Skeleton rows while loading
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-white/[0.04]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className={tdCls}>
                        <div className="h-4 rounded bg-white/[0.06] animate-pulse w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                sorted.map((tx, i) => {
                  const isCredit = tx.type === 'credit';
                  const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount);
                  const date = formatISTDateTime(tx.date);

                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
                    >
                      {/* Type badge */}
                      <td className={tdCls}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider
                          ${isCredit ? 'bg-emerald-500/15 text-credit-light' : 'bg-red-500/15 text-debit-light'}`}>
                          {isCredit ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {tx.type}
                        </span>
                      </td>

                      {/* Description */}
                      <td className={`${tdCls} font-medium text-txt-primary max-w-[180px]`}>
                        <span className="truncate block">{tx.description}</span>
                      </td>

                      {/* Amount */}
                      <td className={`${tdCls} font-bold ${isCredit ? 'text-credit-light' : 'text-debit-light'}`}>
                        {isCredit ? '+' : '-'}{fmt}
                      </td>

                      {/* Date + Location */}
                      <td className={`${tdCls} text-txt-muted whitespace-nowrap`}>
                        <div className="flex flex-col gap-0.5">
                          <span>{date}</span>
                          {/* Location — always visible */}
                          <span
                            className={`text-[10px] flex items-center gap-1 ${
                              tx.location_text ? 'opacity-70' : 'opacity-30 italic'
                            }`}
                          >
                            <MapPin size={9} />
                            {tx.location_text ?? 'No location'}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className={tdCls}>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/[0.06] text-txt-muted">
                          {tx.category}
                        </span>
                      </td>

                      {/* Receipt */}
                      <td className={tdCls}>
                        {tx.receiptBase64 ? (
                          <button
                            onClick={() => setReceiptTx(tx)}
                            className="flex items-center gap-1 text-accent-light hover:text-accent-light/80 text-xs cursor-pointer transition-colors"
                          >
                            <Paperclip size={12} /> View
                          </button>
                        ) : (
                          <span className="text-txt-muted text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={tdCls}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-txt-muted hover:text-txt-primary transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmId(tx.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-txt-muted hover:text-debit-light transition-all cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>
        </table>

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <span className="text-3xl">💸</span>
            <p className="text-txt-muted text-sm">No transactions found</p>
          </div>
        )}
      </div>

      {/* Numbered pagination */}
      <PaginationControls
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={onPageChange}
      />

      <ConfirmDialog
        open={!!confirmId}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This cannot be undone."
        onConfirm={() => { if (confirmId) onDelete(confirmId); setConfirmId(null); }}
        onCancel={() => setConfirmId(null)}
      />
      <ReceiptViewer
        open={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        receiptBase64={receiptTx?.receiptBase64}
        receiptName={receiptTx?.receiptName}
        receiptMimeType={receiptTx?.receiptMimeType}
      />
    </>
  );
}
