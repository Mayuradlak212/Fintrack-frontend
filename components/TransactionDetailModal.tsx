import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, TrendingUp, TrendingDown, Calendar, Tag, MapPin,
  Paperclip, Pencil, Trash2, Clock, Hash, CheckCircle2,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatISTDateTime } from '../lib/dateUtils';
import ReceiptViewer from './ReceiptViewer';
import ConfirmDialog from './ConfirmDialog';

const Row = ({
  icon,
  label,
  value,
  valueClass = '',
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-3 py-3 border-b border-white/[0.05] last:border-b-0">
    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted mb-0.5">{label}</p>
      <p className={`text-sm text-txt-primary break-words ${mono ? 'font-mono' : 'font-medium'} ${valueClass}`}>
        {value}
      </p>
    </div>
  </div>
);

interface TransactionDetailModalProps {
  tx: Transaction | null;
  open: boolean;
  onClose: () => void;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function TransactionDetailModal({
  tx,
  open,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailModalProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!tx) return null;

  const isCredit    = tx.type === 'credit';
  const formatted   = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(tx.amount);
  const dateStr     = formatISTDateTime(tx.date);
  const createdStr  = tx.createdAt  ? formatISTDateTime(tx.createdAt)  : '—';
  const updatedStr  = tx.updatedAt  ? formatISTDateTime(tx.updatedAt)  : '—';
  const wasEdited   = tx.updatedAt && tx.updatedAt !== tx.createdAt;


  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="detail-modal"
            initial={{ opacity: 0, scale: 0.93, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 28 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201]
              w-[95%] max-w-md max-h-[90vh] overflow-y-auto
              bg-bg-card border border-white/[0.09] rounded-2xl
              shadow-[0_28px_70px_rgba(0,0,0,0.7)]"
          >
            {/* ── Hero banner ─────────────────────────────────────────── */}
            <div
              className={`relative px-6 pt-6 pb-5 ${
                isCredit
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent'
                  : 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent'
              }`}
            >
              {/* Glow strip */}
              <div
                className={`absolute left-0 top-6 bottom-6 w-1 rounded-full ${
                  isCredit ? 'bg-credit-light' : 'bg-debit-light'
                } shadow-lg`}
              />

              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                  rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-txt-muted
                  hover:text-txt-primary transition-all cursor-pointer"
              >
                <X size={15} />
              </button>

              {/* Type icon + amount */}
              <div className="flex items-center gap-3 pl-3 mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    isCredit
                      ? 'bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-red-500/20 border border-red-500/30'
                  }`}
                >
                  {isCredit
                    ? <TrendingUp size={20} className="text-credit-light" />
                    : <TrendingDown size={20} className="text-debit-light" />
                  }
                </div>
                <div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider
                      px-2 py-0.5 rounded-full mb-1
                      ${isCredit ? 'bg-emerald-500/20 text-credit-light' : 'bg-red-500/20 text-debit-light'}`}
                  >
                    {isCredit ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {tx.type}
                  </span>
                  <p
                    className={`text-2xl font-extrabold ${
                      isCredit ? 'text-credit-light' : 'text-debit-light'
                    }`}
                  >
                    {isCredit ? '+' : '−'}{formatted}
                  </p>
                </div>
              </div>

              {/* Description — full, no truncate */}
              <p className="pl-3 text-base font-bold text-txt-primary leading-snug">
                {tx.description}
              </p>
            </div>

            {/* ── Details grid ────────────────────────────────────────── */}
            <div className="px-5 py-2">
              <Row
                icon={<Calendar size={13} className="text-txt-muted" />}
                label="Date & Time"
                value={dateStr}
              />
              <Row
                icon={<Tag size={13} className="text-txt-muted" />}
                label="Category"
                value={tx.category}
              />
              <Row
                icon={<MapPin size={13} className="text-txt-muted" />}
                label="Location"
                value={tx.location_text ?? 'No location recorded'}
                valueClass={!tx.location_text ? 'text-txt-muted italic' : ''}
              />
              {(tx.latitude && tx.longitude) && (
                <Row
                  icon={<MapPin size={13} className="text-accent-light" />}
                  label="Coordinates"
                  value={`${tx.latitude.toFixed(5)}, ${tx.longitude.toFixed(5)}`}
                  mono
                />
              )}
              <Row
                icon={<Hash size={13} className="text-txt-muted" />}
                label="Transaction ID"
                value={tx.id}
                mono
                valueClass="text-txt-muted text-xs"
              />
              <Row
                icon={<Clock size={13} className="text-txt-muted" />}
                label="Created"
                value={createdStr}
              />
              {wasEdited && (
                <Row
                  icon={<CheckCircle2 size={13} className="text-accent-light" />}
                  label="Last Edited"
                  value={updatedStr}
                  valueClass="text-accent-light"
                />
              )}
              {tx.receiptBase64 && (
                <div className="py-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <Paperclip size={13} className="text-txt-muted" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted mb-1">
                        Receipt
                      </p>
                      <button
                        onClick={() => setReceiptOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-accent-light font-medium
                          hover:text-accent transition-colors cursor-pointer"
                      >
                        <Paperclip size={11} />
                        {tx.receiptName ?? 'View Receipt'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer actions ───────────────────────────────────────── */}
            <div className="flex gap-3 px-5 pb-5 pt-3">
              <button
                onClick={() => { onClose(); onEdit(tx); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
                  text-txt-secondary border border-white/[0.09] bg-white/[0.04]
                  hover:bg-white/[0.08] hover:text-txt-primary transition-all cursor-pointer"
              >
                <Pencil size={14} /> Edit
              </button>
              <button
                onClick={() => setConfirmOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  text-debit-light border border-red-500/20 bg-red-500/8
                  hover:bg-red-500/15 transition-all cursor-pointer"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </motion.div>

          <ReceiptViewer
            open={receiptOpen}
            onClose={() => setReceiptOpen(false)}
            receiptBase64={tx.receiptBase64}
            receiptName={tx.receiptName}
            receiptMimeType={tx.receiptMimeType}
          />

          <ConfirmDialog
            open={confirmOpen}
            title="Delete Transaction"
            message={`Are you sure you want to delete "${tx.description}"? This cannot be undone.`}
            onConfirm={() => {
              onDelete(tx.id);
              setConfirmOpen(false);
              onClose();
            }}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
