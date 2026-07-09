import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Wallet, Eye, EyeOff, Lock, Mail, ArrowRight, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { LoginFormSchema, RegisterFormSchema } from '../../types';
import Link from 'next/link';

export default function LoginPage() {
  const { login, register, user, isLoading } = useAuth();
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
        const ok = await register({ name, email, password });
        if (ok) {
          toast.success('Account created successfully! 👋');
          router.push('/');
        }
      } else {
        const ok = await login({ email, password });
        if (ok) {
          toast.success('Welcome back! 👋');
          router.push('/');
        }
      }
    } catch (err: any) {
      let msg = err?.message || 'Something went wrong';
      
      // If the backend sent a 422 Unprocessable Entity, extract the validation detail
      if (err?.data?.detail && Array.isArray(err.data.detail)) {
        msg = err.data.detail.map((d: any) => `${d.loc?.[d.loc.length-1]}: ${d.msg}`).join(', ');
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
        </div>

      </motion.div>
    </div>
  );
}
