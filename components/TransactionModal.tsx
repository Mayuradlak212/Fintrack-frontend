import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, ImageIcon, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { z } from 'zod';
import {
  TransactionForm,
  Transaction,
  CategorySchema,
} from '../types';
import { toISO } from '../lib/dateUtils';

const CATEGORIES = CategorySchema.options;

// ── Explicit modal form schema (date stored as YYYY-MM-DD string from <input type="date">) ──
const ModalFormSchema = z.object({
  type: z.enum(['credit', 'debit']),
  amount: z.number({ invalid_type_error: 'Enter a valid amount' }).positive('Amount must be greater than 0'),
  description: z.string().min(1, 'Description is required').max(200, 'Too long'),
  category: CategorySchema,
  date: z.string().min(1, 'Date is required'),
  receiptBase64: z.string().optional(),
  receiptName: z.string().optional(),
  receiptMimeType: z.string().optional(),
});
type ModalErrors = Partial<Record<keyof z.infer<typeof ModalFormSchema>, string>>;

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tx: TransactionForm) => void;
  initial?: Transaction | null;
}

const emptyForm = (): z.infer<typeof ModalFormSchema> => ({
  type: 'credit',
  amount: 0,
  description: '',
  category: 'Other',
  date: new Date().toISOString().slice(0, 10),
  receiptBase64: undefined,
  receiptName: undefined,
  receiptMimeType: undefined,
});

export default function TransactionModal({ open, onClose, onSave, initial }: TransactionModalProps) {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ModalErrors>({});

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type,
        amount: initial.amount,
        description: initial.description,
        category: initial.category,
        date: initial.date.slice(0, 10),
        receiptBase64: initial.receiptBase64,
        receiptName: initial.receiptName,
        receiptMimeType: initial.receiptMimeType,
      });
    } else {
      setForm(emptyForm());
    }
    setErrors({});
  }, [initial, open]);

  const onDrop = useCallback((accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({
        ...f,
        receiptBase64: reader.result as string,
        receiptName: file.name,
        receiptMimeType: file.type,
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ── Zod runtime validation ──
    const result = ModalFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: ModalErrors = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof ModalErrors;
        if (field) fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Coerce date string → ISO datetime for storage
    const validated = result.data;
    onSave({
      ...validated,
      date: toISO(validated.date),
    });
    onClose();
  };

  const inputCls = (field: keyof ModalErrors) =>
    `w-full bg-white/[0.04] border rounded-xl px-4 py-2.5 text-sm text-txt-primary placeholder:text-txt-muted outline-none transition-all
     focus:ring-2 focus:ring-accent/40 focus:border-accent
     ${errors[field] ? 'border-red-500/60' : 'border-white/[0.09]'}`;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]
              w-[95%] max-w-lg max-h-[92vh] overflow-y-auto
              bg-bg-card border border-white/[0.09] rounded-2xl
              shadow-[0_28px_70px_rgba(0,0,0,0.7)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.07]">
              <h2 className="text-base font-bold text-txt-primary">
                {initial ? 'Edit Transaction' : 'Add Transaction'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-txt-muted transition-colors cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

              {/* Type toggle */}
              <div>
                <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.07]">
                  {(['credit', 'debit'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer
                        ${form.type === t
                          ? t === 'credit'
                            ? 'bg-gradient-to-r from-credit to-credit-light text-white shadow-[0_4px_14px_rgba(16,185,129,0.35)]'
                            : 'bg-gradient-to-r from-red-600 to-debit-light text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)]'
                          : 'text-txt-muted hover:text-txt-secondary'
                        }`}
                    >
                      {t === 'credit' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount || ''}
                  onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className={inputCls('amount')}
                />
                {errors.amount && (
                  <p className="text-xs text-debit-light mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="What was this for?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputCls('description')}
                />
                {errors.description && (
                  <p className="text-xs text-debit-light mt-1">{errors.description}</p>
                )}
              </div>

              {/* Category + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({
                      ...f,
                      category: CategorySchema.parse(e.target.value),
                    }))}
                    className="w-full bg-bg-card border border-white/[0.09] rounded-xl px-3 py-2.5 text-sm text-txt-primary outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="bg-bg-card">{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className={`w-full bg-white/[0.04] border rounded-xl px-3 py-2.5 text-sm text-txt-primary outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all ${errors.date ? 'border-red-500/60' : 'border-white/[0.09]'}`}
                  />
                  {errors.date && (
                    <p className="text-xs text-debit-light mt-1">{errors.date}</p>
                  )}
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                  Receipt (optional)
                </label>
                {form.receiptBase64 ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.09] bg-white/[0.03]">
                    {form.receiptMimeType === 'application/pdf'
                      ? <FileText size={18} className="text-accent-light shrink-0" />
                      : <ImageIcon size={18} className="text-credit-light shrink-0" />
                    }
                    <span className="text-xs text-txt-secondary truncate flex-1">{form.receiptName}</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        receiptBase64: undefined,
                        receiptName: undefined,
                        receiptMimeType: undefined,
                      }))}
                      className="text-txt-muted hover:text-debit-light transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all
                      ${isDragActive
                        ? 'border-accent bg-accent/10'
                        : 'border-white/[0.12] bg-white/[0.02] hover:border-accent/50 hover:bg-accent/5'
                      }`}
                  >
                    <input {...getInputProps()} />
                    <Upload size={20} className={isDragActive ? 'text-accent-light' : 'text-txt-muted'} />
                    <p className="text-xs text-txt-muted text-center">
                      {isDragActive
                        ? 'Drop file here…'
                        : 'Drop or click to upload PDF / image (max 5 MB)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-txt-secondary border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] transition-all cursor-pointer"
                >
                  {initial ? 'Save Changes' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
