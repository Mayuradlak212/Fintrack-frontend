import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../store';
import { setSupported, setEnabled, lock, unlock } from '../store/biometricSlice';
import { logout, resetStore } from '../store/authSlice';
import { isBiometricSupported, verifyBiometric, readBiometric, clearBiometric } from '../lib/biometric';

/** Re-lock after the tab has been hidden this long. */
const RELOCK_AFTER_MS = 5 * 60 * 1000;

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { enabled, isLocked } = useAppSelector((state) => state.biometric);
  const user = useAppSelector((state) => state.auth.user);

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const autoPrompted = useRef(false);

  // Probe device capability once.
  useEffect(() => {
    isBiometricSupported().then((ok) => dispatch(setSupported(ok)));
  }, [dispatch]);

  // Keep slice state in sync with the stored credential once we know who is
  // signed in. The credential is bound to one account: a different user signing
  // in on this browser drops the enrollment rather than being gated by it, while
  // the original user re-logging in (which reset the slice) gets it restored.
  useEffect(() => {
    if (!user) return;
    const stored = readBiometric();
    if (!stored) return;

    if (stored.userEmail !== user.email) {
      clearBiometric();
      dispatch(setEnabled(false));
    } else if (!enabled) {
      // Re-enable only; `isLocked` stays false so a fresh login isn't re-gated.
      dispatch(setEnabled(true));
    }
  }, [user, enabled, dispatch]);

  const handleUnlock = useCallback(async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const ok = await verifyBiometric();
      if (ok) {
        dispatch(unlock());
      } else {
        setError('Could not verify. Please try again.');
      }
    } catch (err: unknown) {
      const name = (err as Error)?.name;
      setError(
        name === 'NotAllowedError'
          ? 'Verification was cancelled or timed out.'
          : 'Biometric check failed. Try again, or sign in with your password.'
      );
    } finally {
      setIsVerifying(false);
    }
  }, [dispatch]);

  // Prompt automatically the first time the gate goes up.
  useEffect(() => {
    if (enabled && isLocked && !autoPrompted.current) {
      autoPrompted.current = true;
      handleUnlock();
    }
    if (!isLocked) autoPrompted.current = false;
  }, [enabled, isLocked, handleUnlock]);

  // Re-lock when the user comes back to a backgrounded tab.
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt.current = Date.now();
      } else if (hiddenAt.current && Date.now() - hiddenAt.current > RELOCK_AFTER_MS) {
        hiddenAt.current = null;
        dispatch(lock());
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled, dispatch]);

  /** Escape hatch — without this a reset authenticator locks the user out for good. */
  const handleUsePassword = () => {
    clearBiometric();
    dispatch(logout());
    dispatch(resetStore());
    router.replace('/auth/login');
  };

  const showGate = enabled && isLocked;

  return (
    <>
      {/* Keep children mounted but visually sealed off while locked. */}
      <div aria-hidden={showGate} className={showGate ? 'blur-xl pointer-events-none select-none' : undefined}>
        {children}
      </div>

      <AnimatePresence>
        {showGate && (
          <motion.div
            key="biometric-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label="Biometric unlock required"
            className="fixed inset-0 z-[300] bg-bg-primary/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="w-full max-w-sm bg-bg-card border border-white/[0.07] rounded-3xl p-8 text-center
                shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-accent/15 border border-accent/25 flex items-center justify-center">
                {isVerifying ? (
                  <Loader2 className="w-9 h-9 text-accent-light animate-spin" />
                ) : (
                  <Fingerprint className="w-9 h-9 text-accent-light" />
                )}
              </div>

              <h2 className="mt-6 text-lg font-bold text-txt-primary">Unlock FinTrack</h2>
              <p className="mt-1.5 text-sm text-txt-secondary leading-relaxed">
                {isVerifying
                  ? 'Waiting for your device…'
                  : 'Confirm your identity to access your finances.'}
              </p>

              {error && <p className="mt-4 text-xs text-debit-light leading-relaxed">{error}</p>}

              <button
                type="button"
                onClick={handleUnlock}
                disabled={isVerifying}
                className="mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                  text-white bg-gradient-to-r from-accent to-accent-light shadow-[0_4px_14px_rgba(124,58,237,0.35)]
                  hover:shadow-[0_6px_20px_rgba(124,58,237,0.45)] transition-all cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Fingerprint className="w-4 h-4" />
                <span>{isVerifying ? 'Verifying…' : 'Unlock'}</span>
              </button>

              <button
                type="button"
                onClick={handleUsePassword}
                className="mt-3 w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-medium
                  text-txt-secondary border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign in with password instead</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
