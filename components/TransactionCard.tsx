import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Paperclip, TrendingUp, TrendingDown, Calendar, Tag } from 'lucide-react';
import { Transaction } from '../types';
import ConfirmDialog from './ConfirmDialog';
import ReceiptViewer from './ReceiptViewer';
import { formatISTDateTime } from '../lib/dateUtils';

interface TransactionCardProps {
  tx: Transaction;
  index: number;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionCard({ tx, index, onEdit, onDelete }: TransactionCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const isCredit = tx.type === 'credit';
  const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'USD' }).format(tx.amount);
  const dateStr = formatISTDateTime(tx.date);
  const wasEdited = tx.updatedAt && tx.updatedAt !== tx.createdAt;
  const updatedStr = wasEdited ? formatISTDateTime(tx.updatedAt!) : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        whileHover={{ y: -3, transition: { duration: 0.18 } }}
        className="relative overflow-hidden bg-bg-card border border-white/[0.07] rounded-2xl p-4 sm:p-5 hover:border-white/[0.14] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] transition-all"
      >
        {/* Glow strip on left */}
        <div className={`absolute left-0 top-4 bottom-4 w-0.5 rounded-full ${isCredit ? 'bg-credit-light' : 'bg-debit-light'}`} />

        <div className="pl-3">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                ${isCredit ? 'bg-emerald-500/15 border border-emerald-500/20' : 'bg-red-500/15 border border-red-500/20'}`}>
                {isCredit
                  ? <TrendingUp size={16} className="text-credit-light" />
                  : <TrendingDown size={16} className="text-debit-light" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-txt-primary truncate">{tx.description}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5
                  ${isCredit ? 'bg-emerald-500/15 text-credit-light' : 'bg-red-500/15 text-debit-light'}`}>
                  {isCredit ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {tx.type}
                </span>
              </div>
            </div>
            <span className={`text-base font-extrabold shrink-0 ${isCredit ? 'text-credit-light' : 'text-debit-light'}`}>
              {isCredit ? '+' : '-'}{formatted}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-txt-muted">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {tx.category}
            </span>
            {updatedStr && (
              <span className="flex items-center gap-1 text-accent-light/70 italic">
                ✏️ Edited {updatedStr}
              </span>
            )}
            {tx.receiptBase64 && (
              <button
                onClick={() => setReceiptOpen(true)}
                className="flex items-center gap-1 text-accent-light hover:text-accent transition-colors cursor-pointer"
              >
                <Paperclip size={11} />
                Receipt
              </button>
            )}
          </div>


          {/* Actions */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.05]">
            <button
              onClick={() => onEdit(tx)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.07] text-txt-secondary text-xs font-medium hover:bg-white/[0.09] hover:text-txt-primary transition-all cursor-pointer"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20 text-debit-light text-xs font-medium hover:bg-red-500/15 transition-all cursor-pointer"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Transaction"
        message={`Are you sure you want to delete "${tx.description}"? This cannot be undone.`}
        onConfirm={() => { onDelete(tx.id); setConfirmOpen(false); }}
        onCancel={() => setConfirmOpen(false)}
      />
      <ReceiptViewer
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receiptBase64={tx.receiptBase64}
        receiptName={tx.receiptName}
        receiptMimeType={tx.receiptMimeType}
      />
    </>
  );
}
