import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, Copy, Check, Loader2, AlertTriangle, Download } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from '../utils/toast';

interface TotpSetupModalProps {
  open: boolean;
  onClose: () => void;
  /** Called once 2FA is fully enabled. */
  onEnabled: () => void;
}

interface SetupData {
  secret: string;
  otpauth_uri: string;
  qr_base64: string;
}

type Step = 'loading' | 'scan' | 'codes' | 'error';

export default function TotpSetupModal({ open, onClose, onEnabled }: TotpSetupModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedAcknowledged, setSavedAcknowledged] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Reset for a clean run each time the modal is opened. The component stays
    // mounted while closed (so AnimatePresence can play its exit), so the reset
    // has to happen here rather than via a remount key.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('loading');
    setSetup(null);
    setBackupCodes([]);
    setCode('');
    setError('');
    setSavedAcknowledged(false);

    fetchApi<SetupData>('/api/auth/totp/setup', { method: 'POST' })
      .then((data) => {
        setSetup(data);
        setStep('scan');
      })
      .catch((err: Error) => {
        setError(err.message || 'Could not start setup');
        setStep('error');
      });
  }, [open]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean.length !== 6) {
      setError('Enter the 6-digit code from your app.');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const res = await fetchApi<{ backup_codes: string[] }>('/api/auth/totp/activate', {
        method: 'POST',
        data: { code: clean },
      });
      setBackupCodes(res.backup_codes);
      setStep('codes');
    } catch (err: unknown) {
      setError((err as Error).message || 'That code was not accepted.');
    } finally {
      setIsVerifying(false);
    }
  };

  const copySecret = () => {
    if (!setup) return;
    navigator.clipboard.writeText(setup.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadCodes = () => {
    const blob = new Blob(
      [
        'FinTrack — two-factor backup codes\n',
        'Each code works once. Keep these somewhere safe.\n\n',
        backupCodes.join('\n'),
        '\n',
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fintrack-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    setSavedAcknowledged(true);
  };

  const finish = () => {
    onEnabled();
    onClose();
    toast.success('Two-factor authentication enabled');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="totp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
            // No dismiss-on-backdrop during the codes step — closing there loses them.
            onClick={step === 'codes' ? undefined : onClose}
          />
          <motion.div
            key="totp-dialog"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            role="dialog"
            aria-modal="true"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201]
              w-[90%] max-w-md max-h-[90vh] overflow-y-auto bg-bg-card border border-white/[0.08]
              rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
          >
            {step !== 'codes' && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 text-txt-muted hover:text-txt-secondary transition-colors cursor-pointer"
              >
                <X size={17} />
              </button>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-accent-light" />
              </div>
              <div>
                <h3 className="text-base font-bold text-txt-primary">
                  {step === 'codes' ? 'Save your backup codes' : 'Set up authenticator app'}
                </h3>
                <p className="text-xs text-txt-muted mt-0.5">
                  {step === 'codes' ? 'Shown once — store them now' : 'Google Authenticator, Authy, 1Password…'}
                </p>
              </div>
            </div>

            {step === 'loading' && (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-7 h-7 text-accent-light animate-spin" />
              </div>
            )}

            {step === 'error' && (
              <div className="py-6 text-center">
                <p className="text-sm text-debit-light">{error}</p>
                <button
                  onClick={onClose}
                  className="mt-5 px-4 py-2 rounded-xl text-sm font-medium text-txt-secondary border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}

            {step === 'scan' && setup && (
              <form onSubmit={handleVerify} className="space-y-5">
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${setup.qr_base64}`}
                    alt="Authenticator QR code"
                    className="w-44 h-44 rounded-xl bg-white p-2"
                  />
                </div>

                <div>
                  <p className="text-xs text-txt-muted text-center mb-2">
                    Can&apos;t scan? Enter this key manually:
                  </p>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.09] hover:bg-white/[0.07] transition-colors cursor-pointer"
                  >
                    <code className="text-xs font-mono tracking-wider text-txt-primary break-all">
                      {setup.secret}
                    </code>
                    {copied ? (
                      <Check size={14} className="text-credit-light shrink-0" />
                    ) : (
                      <Copy size={14} className="text-txt-muted shrink-0" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">
                    Enter the 6-digit code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-center text-lg font-semibold tracking-[0.4em] text-txt-primary placeholder:text-txt-muted outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                  />
                </div>

                {error && (
                  <p className="text-xs text-debit-light bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isVerifying || code.length !== 6}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Enable'}
                </button>
              </form>
            )}

            {step === 'codes' && (
              <div className="space-y-5">
                <div className="flex gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-txt-secondary leading-relaxed">
                    These are the only way back into your account if you lose your phone.
                    Each code works once, and they will never be shown again.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((c) => (
                    <code
                      key={c}
                      className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.07] text-xs font-mono text-center tracking-wider text-txt-primary"
                    >
                      {c}
                    </code>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={downloadCodes}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-txt-secondary border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
                >
                  <Download size={15} /> Download as .txt
                </button>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={savedAcknowledged}
                    onChange={(e) => setSavedAcknowledged(e.target.checked)}
                    className="mt-0.5 accent-[var(--color-accent)] cursor-pointer"
                  />
                  <span className="text-xs text-txt-secondary leading-relaxed">
                    I have saved these codes somewhere safe
                  </span>
                </label>

                <button
                  type="button"
                  onClick={finish}
                  disabled={!savedAcknowledged}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
