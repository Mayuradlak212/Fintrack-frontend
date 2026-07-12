import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Wallet, Mail, ArrowLeft, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import { toast } from '../../utils/toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email.'); return; }

    setLoading(true);
    try {
      await fetchApi('/api/auth/forgot-password', {
        method: 'POST',
        data: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch {
      // Always show success to prevent enumeration; backend does the same
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-bg-card border border-white/[0.08] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">

          {/* Header stripe */}
          <div className="bg-gradient-to-r from-accent to-accent-light px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur mb-3">
              <Wallet size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">FinTrack</h1>
          </div>

          <div className="px-8 py-8">
            {!sent ? (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-bold text-txt-primary mb-1.5">Forgot your password?</h2>
                  <p className="text-sm text-txt-muted leading-relaxed">
                    No worries! Enter your email and we'll send you a reset link valid for 30 minutes.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
                      <input
                        type="email"
                        autoFocus
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.09] rounded-xl
                          text-sm text-txt-primary placeholder:text-txt-muted outline-none
                          focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-debit-light mt-1.5">{error}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold
                      text-white bg-gradient-to-r from-accent to-accent-light
                      shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.55)]
                      disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            ) : (
              /* ── Success state ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 mb-4">
                  <CheckCircle2 size={32} className="text-credit-light" />
                </div>
                <h3 className="text-lg font-bold text-txt-primary mb-2">Check your inbox!</h3>
                <p className="text-sm text-txt-muted leading-relaxed mb-1">
                  If <span className="text-txt-secondary font-medium">{email}</span> is registered,
                  you'll receive a password reset link shortly.
                </p>
                <p className="text-xs text-txt-muted/60 mt-3">
                  Didn't get it? Check spam, or{' '}
                  <button
                    onClick={() => { setSent(false); }}
                    className="text-accent-light hover:underline cursor-pointer"
                  >
                    try again
                  </button>.
                </p>
              </motion.div>
            )}

            {/* Back to login */}
            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-sm text-txt-muted hover:text-txt-secondary transition-colors"
              >
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
