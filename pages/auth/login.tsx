import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Wallet, Eye, EyeOff, Lock, Mail, ArrowRight, User as UserIcon, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store';
import { login, register, verifyMfa } from '../../store/authSlice';
import { toast } from '../../utils/toast';
import { LoginFormSchema, RegisterFormSchema } from '../../types';
import Link from 'next/link';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  
  React.useEffect(() => {
    if (!isLoading && user) {
      router.push('/');
    }
  }, [user, isLoading, router]);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Set once the password is accepted but 2FA is still outstanding.
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const resetToPassword = () => {
    setMfaToken(null);
    setCode('');
    setError('');
    setPassword('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken) return;

    const clean = code.trim();
    if (clean.length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await dispatch(verifyMfa({ mfa_token: mfaToken, code: clean })).unwrap();
      toast.success('Welcome back! 👋');
      router.push('/');
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : 'Verification failed';
      setError(msg);
      // The challenge is burned after too many tries — send them back to step 1.
      if (msg.toLowerCase().includes('sign in again')) {
        setMfaToken(null);
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // ── Client-side Zod Validation ──
    if (isRegister) {
      const result = RegisterFormSchema.safeParse({ name, email, password });
      if (!result.success) {
        const firstError = result.error.issues[0].message;
        setError(firstError);
        toast.error('Validation failed');
        return;
      }
    } else {
      const result = LoginFormSchema.safeParse({ email, password });
      if (!result.success) {
        const firstError = result.error.issues[0].message;
        setError(firstError);
        toast.error('Validation failed');
        return;
      }
    }

    setLoading(true);
    
    try {
      if (isRegister) {
        await dispatch(register({ name, email, password })).unwrap();
        toast.success('Account created successfully! 👋');
        router.push('/');
      } else {
        const result = await dispatch(login({ email, password })).unwrap();
        // 2FA enabled — swap to the code step instead of navigating.
        if (result && typeof result === 'object' && 'mfaToken' in result) {
          setMfaToken(result.mfaToken);
          setLoading(false);
          return;
        }
        toast.success('Welcome back! 👋');
        router.push('/');
      }
    } catch (err: unknown) {
      let msg = typeof err === 'string' ? err : 'Something went wrong';
      
      // If the backend sent a 422 Unprocessable Entity, extract the validation detail
      type ApiErr = { data?: { detail?: Array<{ loc?: string[]; msg: string }> } };
      const errorData = (err as ApiErr)?.data;
      if (errorData?.detail && Array.isArray(errorData.detail)) {
        msg = errorData.detail.map(d => `${d.loc?.[d.loc.length-1]}: ${d.msg}`).join(', ');
      }

      setError(msg);
      toast.error(isRegister ? 'Registration failed' : 'Login failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-accent/8 blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-credit/6 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-[0_8px_32px_rgba(124,58,237,0.45)] mb-4"
          >
            <Wallet size={30} className="text-white" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-txt-primary tracking-tight">FinTrack</h1>
          <p className="text-sm text-txt-muted mt-1">Your personal finance companion</p>
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-white/[0.08] rounded-2xl p-6 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          {mfaToken ? (
            /* ── Step 2: two-factor code ── */
            <>
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center mb-3">
                  <ShieldCheck size={22} className="text-accent-light" />
                </div>
                <h2 className="text-lg font-bold text-txt-primary mb-1">Two-Factor Authentication</h2>
                <p className="text-xs text-txt-muted">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <form onSubmit={handleVerify} className="flex flex-col gap-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\w-]/g, '').slice(0, 20))}
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-center text-lg font-semibold tracking-[0.4em] text-txt-primary placeholder:text-txt-muted placeholder:tracking-[0.4em] outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                />

                <p className="text-[11px] text-txt-muted text-center -mt-1">
                  Lost your device? Enter one of your backup codes instead.
                </p>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-debit-light bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Verify <ArrowRight size={15} /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetToPassword}
                  className="text-xs text-txt-muted hover:text-txt-secondary transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to sign in
                </button>
              </form>
            </>
          ) : (
          <>
          <div className="flex justify-between items-end mb-5">
            <div>
              <h2 className="text-lg font-bold text-txt-primary mb-1">
                {isRegister ? 'Create Account' : 'Sign In'}
              </h2>
              <p className="text-xs text-txt-muted">
                {isRegister ? 'Sign up to get started' : 'Enter your credentials to continue'}
              </p>
            </div>
            <button 
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs font-semibold text-accent-light hover:text-accent transition-colors"
            >
              {isRegister ? 'Log in instead' : 'Create account'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name (Register only) */}
            {isRegister && (
              <div>
                <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">Name</label>
                <div className="relative">
                  <UserIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-txt-primary placeholder:text-txt-muted outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-txt-primary placeholder:text-txt-muted outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-medium text-txt-muted uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-10 py-2.5 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-txt-primary placeholder:text-txt-muted outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-muted hover:text-txt-secondary transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Forgot password — login mode only */}
            {!isRegister && (
              <div className="text-right -mt-1">
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-accent-light hover:text-accent transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-debit-light bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl"
              >
                {error}
              </motion.p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_16px_rgba(124,58,237,0.4)] hover:shadow-[0_6px_22px_rgba(124,58,237,0.5)] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>
          </>
          )}
        </div>

      </motion.div>
    </div>
  );
}
