import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, ImageIcon, Download } from 'lucide-react';

interface ReceiptViewerProps {
  open: boolean;
  onClose: () => void;
  receiptBase64?: string;
  receiptName?: string;
  receiptMimeType?: string;
}

export default function ReceiptViewer({ open, onClose, receiptBase64, receiptName, receiptMimeType }: ReceiptViewerProps) {
  const isPdf = receiptMimeType === 'application/pdf';

  const handleDownload = () => {
    if (!receiptBase64 || !receiptName) return;
    const a = document.createElement('a');
    a.href = receiptBase64;
    a.download = receiptName;
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-lg z-[200]"
            onClick={onClose}
          />
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201]
              w-[95%] max-w-2xl max-h-[88vh] flex flex-col
              bg-bg-card border border-white/[0.08] rounded-2xl p-5
              shadow-[0_32px_80px_rgba(0,0,0,0.7)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                {isPdf
                  ? <FileText size={18} className="text-debit-light" />
                  : <ImageIcon size={18} className="text-accent-light" />
                }
                <span className="text-sm font-semibold text-txt-primary truncate max-w-[200px] sm:max-w-xs">
                  {receiptName || 'Receipt'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-txt-secondary text-xs hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Download
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06] text-txt-secondary hover:bg-white/[0.1] transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto rounded-xl bg-black/30 min-h-[200px]">
              {receiptBase64 ? (
                isPdf ? (
                  <iframe
                    src={receiptBase64}
                    className="w-full h-[60vh] border-none rounded-xl"
                    title="Receipt PDF"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptBase64}
                    alt="Receipt"
                    className="w-full h-auto rounded-xl block"
                  />
                )
              ) : (
                <div className="flex items-center justify-center h-48 text-txt-muted text-sm">
                  No receipt available
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
