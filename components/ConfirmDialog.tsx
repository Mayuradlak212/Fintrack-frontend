import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
            onClick={onCancel}
          />
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201]
              w-[90%] max-w-sm bg-bg-card border border-red-500/20 rounded-2xl p-6
              shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
          >
            {/* Close button */}
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 text-txt-muted hover:text-txt-secondary transition-colors"
            >
              <X size={17} />
            </button>

            {/* Icon + title */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-debit-light" />
              </div>
              <h3 className="text-base font-bold text-txt-primary">{title}</h3>
            </div>

            <p className="text-sm text-txt-secondary leading-relaxed mb-6">{message}</p>

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm font-medium text-txt-secondary border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-debit-light shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.45)] transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
