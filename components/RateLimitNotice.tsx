import React, { useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import {
  getThrottleServerSnapshot,
  getThrottleSnapshot,
  subscribeThrottle,
} from '../lib/rateLimit';

/**
 * Shown while the API has us in a cooldown. A 429 with no explanation reads as
 * a broken app; a visible countdown reads as a queue, so the user waits instead
 * of reloading — which would only spend more of the quota they are waiting on.
 */

// What each policy means in the user's terms. Anything unmapped gets the
// generic line rather than leaking a backend policy name into the UI.
const LABELS: Record<string, string> = {
  'auth:login': 'Too many sign-in attempts',
  'auth:login_account': 'Too many sign-in attempts for this account',
  'auth:register': 'Too many sign-up attempts',
  'auth:mfa': 'Too many verification attempts',
  'auth:forgot_password': 'Too many password reset requests',
  'auth:forgot_password_account': 'Too many password reset requests for this address',
  'auth:reset_password': 'Too many password reset attempts',
  'auth:totp_manage': 'Too many two-factor changes',
  'auth:refresh': 'Session refresh is rate limited',
  'api:read': 'Loading data too quickly',
  'api:write': 'Saving changes too quickly',
  'api:report': 'Requesting reports too quickly',
};

// Whole-second clock, so the snapshot stays stable across re-renders inside the
// same second — useSyncExternalStore requires that.
function subscribeSecond(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function secondsNow(): number {
  return Math.floor(Date.now() / 1000);
}

function secondsNever(): number {
  return 0;
}

function formatCountdown(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export default function RateLimitNotice() {
  const throttle = useSyncExternalStore(
    subscribeThrottle,
    getThrottleSnapshot,
    getThrottleServerSnapshot,
  );

  // The deadline is fixed; only the clock moves. Treating the clock as another
  // external store keeps the countdown out of both render (Date.now is impure)
  // and effect state.
  const nowSeconds = useSyncExternalStore(subscribeSecond, secondsNow, secondsNever);

  const secondsLeft = throttle.policy
    ? Math.max(0, Math.ceil(throttle.until / 1000) - nowSeconds)
    : 0;

  const visible = !!throttle.policy && secondsLeft > 0;
  const label = (throttle.policy && LABELS[throttle.policy]) || 'Too many requests';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[min(28rem,calc(100vw-1.5rem))]"
        >
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 backdrop-blur-md shadow-lg">
            <Clock className="w-4 h-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-amber-100">{label}</p>
              <p className="text-xs text-amber-200/70">
                You can try again in{' '}
                <span className="tabular-nums font-semibold">{formatCountdown(secondsLeft)}</span>.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
