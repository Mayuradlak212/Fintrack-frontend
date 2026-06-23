import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, ImageIcon, Trash2, TrendingUp, TrendingDown, MapPin, Loader2 } from 'lucide-react';
import { z } from 'zod';
import {
  TransactionForm,
  TransactionFormSchema,
  Transaction,
  CategorySchema,
} from '../types';
import { toISO } from '../lib/dateUtils';

const CATEGORIES = CategorySchema.options;

// ── Modal form schema: uses same CategorySchema + TransactionTypeSchema as TransactionForm ──
const ModalFormSchema = TransactionFormSchema.extend({
  // Override date to accept YYYY-MM-DD from <input type="date"> instead of full ISO
  date: z.string().min(1, 'Date is required'),
});
type ModalErrors = Partial<Record<keyof z.infer<typeof ModalFormSchema>, string>>;

/** Safely maps Zod field errors to ModalErrors — filters non-string paths */
function parseZodErrors(error: z.ZodError): ModalErrors {
  const out: ModalErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && key in ({} as z.infer<typeof ModalFormSchema>)) {
      out[key as keyof ModalErrors] = issue.message;
    }
  }
  return out;
}

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (tx: TransactionForm) => Promise<void> | void;
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
  latitude: undefined,
  longitude: undefined,
  location_text: undefined,
});

export default function TransactionModal({ open, onClose, onSave, initial }: TransactionModalProps) {
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState<ModalErrors>({});
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        latitude: initial.latitude,
        longitude: initial.longitude,
        location_text: initial.location_text,
      });
    } else {
      setForm(emptyForm());
    }
    setErrors({});
  }, [initial, open]);

  // Request Geolocation when adding a new transaction
  useEffect(() => {
    if (open && !initial && !form.location_text && !isLocating) {
      if ('geolocation' in navigator) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setForm((f) => ({ ...f, latitude: lat, longitude: lng }));

            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`);
              const data = await res.json();
              if (data?.address) {
                const city = data.address.city || data.address.town || data.address.county || data.address.state;
                if (city) {
                  setForm((f) => ({ ...f, location_text: city }));
                }
              }
            } catch (err) {
              console.error('Failed to reverse geocode', err);
            } finally {
              setIsLocating(false);
            }
          },
          (err) => {
            console.error('Geolocation error:', err);
            setIsLocating(false);
          }
        );
      }
    }
  }, [open, initial, form.location_text, isLocating]);

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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Zod runtime validation ──
    const result = ModalFormSchema.safeParse(form);
    if (!result.success) {
      setErrors(parseZodErrors(result.error));
      return;
    }

    // Build a fully-typed TransactionForm payload
    const v = result.data;
    const payload: TransactionForm = {
      type:            v.type,
      amount:          v.amount,
      description:     v.description,
      category:        v.category,
      date:            toISO(v.date),
      receiptBase64:   v.receiptBase64,
      receiptName:     v.receiptName,
      receiptMimeType: v.receiptMimeType,
      latitude:        v.latitude,
      longitude:       v.longitude,
      location_text:   v.location_text,
    };
    
    try {
      setIsSaving(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      toast.error('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  }, [form, onSave, onClose]);

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
                  Amount (₹)
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

              {/* Receipt Upload & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Location
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.09] bg-white/[0.03]">
                    <MapPin size={16} className="text-accent shrink-0" />
                    {isLocating ? (
                      <div className="flex items-center gap-2 text-xs text-txt-muted">
                        <Loader2 size={12} className="animate-spin" /> Locating...
                      </div>
                    ) : form.location_text ? (
                      <span className="text-xs text-txt-secondary truncate flex-1">{form.location_text}</span>
                    ) : (
                      <span className="text-xs text-txt-muted flex-1 italic">Unknown</span>
                    )}
                  </div>
                </div>

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
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : null}
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
