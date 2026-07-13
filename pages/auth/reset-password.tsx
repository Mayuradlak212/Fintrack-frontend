/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Wallet, Lock, Eye, EyeOff, KeyRound, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { fetchApi } from '../../lib/api';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = router.query;

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [showCf, setShowCf]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  // Redirect if no token in URL
  useEffect(() => {
    if (router.isReady && !token) {
      router.replace('/auth/forgot-password');
    }
  }, [router.isReady, token, router]);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await fetchApi('/api/auth/reset-password', {
        method: 'POST',
        data: { token, password },
      });
      setSuccess(true);
      // Auto-redirect to login after 3s
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: unknown) {
      type ApiErr = { response?: { data?: { error?: string } } };
      const errorData = err as ApiErr;
      const msg = errorData?.response?.data?.error || (err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
      setError(msg);
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
        <div className="bg-bg-card border border-white/[0.08] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.6)] overflow-hidden">

          {/* Header stripe */}
          <div className="bg-gradient-to-r from-accent to-accent-light px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur mb-3">
              <Wallet size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">FinTrack</h1>
          </div>

          <div className="px-8 py-8">
            {!success ? (
              <>
                <div className="mb-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent/15 border border-accent/20 mb-3">
                    <KeyRound size={22} className="text-accent-light" />
                  </div>
                  <h2 className="text-xl font-bold text-txt-primary mb-1.5">Set new password</h2>
                  <p className="text-sm text-txt-muted">
                    Choose a strong password for your account.
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5"
                  >
                    <AlertCircle size={15} className="text-debit-light mt-0.5 shrink-0" />
                    <p className="text-sm text-debit-light">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* New Password */}
                  <div>
                    <label className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                      New password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        autoFocus
                        className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.09] rounded-xl
                          text-sm text-txt-primary placeholder:text-txt-muted outline-none
                          focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary transition-colors cursor-pointer"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1">
                          {[1,2,3,4].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i <= strength ? strengthColor : 'bg-white/[0.08]'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] mt-1 font-medium ${
                          strength <= 1 ? 'text-red-400' :
                          strength === 2 ? 'text-orange-400' :
                          strength === 3 ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>{strengthLabel}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-txt-muted uppercase tracking-wider mb-1.5">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-muted" />
                      <input
                        type={showCf ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat password"
                        className={`w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border rounded-xl
                          text-sm text-txt-primary placeholder:text-txt-muted outline-none
                          focus:ring-2 focus:ring-accent/40 transition-all ${
                          confirm && password !== confirm
                            ? 'border-red-500/40 focus:border-red-500'
                            : confirm && password === confirm
                            ? 'border-emerald-500/40 focus:border-emerald-500'
                            : 'border-white/[0.09] focus:border-accent'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCf(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary transition-colors cursor-pointer"
                      >
                        {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {confirm && password !== confirm && (
                      <p className="text-xs text-debit-light mt-1">Passwords don't match.</p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading || !password || !confirm}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold
                      text-white bg-gradient-to-r from-accent to-accent-light
                      shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_28px_rgba(124,58,237,0.55)]
                      disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={15} />}
                    {loading ? 'Updating…' : 'Update Password'}
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
                <h3 className="text-lg font-bold text-txt-primary mb-2">Password updated!</h3>
                <p className="text-sm text-txt-muted leading-relaxed mb-4">
                  Your password has been reset successfully. Redirecting you to login…
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                    text-white bg-gradient-to-r from-accent to-accent-light
                    shadow-[0_4px_16px_rgba(124,58,237,0.4)] transition-all"
                >
                  Go to Login
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
