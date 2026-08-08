/**
 * Client half of the rate limiter.
 *
 * Two jobs:
 *   1. Read the RateLimit-* headers the API sends back, so the UI can say how
 *      long the wait is instead of "something went wrong".
 *   2. Hold a cooldown once the server has said 429. Retrying into a limit that
 *      has not reset yet only spends quota the user needs for their next real
 *      action, and every retry pushes the reset further out.
 *
 * State lives in this module rather than in Redux on purpose: the store's
 * slices import lib/api, so anything lib/api imports must not reach back into
 * the store. Components subscribe with useSyncExternalStore instead.
 */

export interface RateLimitInfo {
  /** Requests allowed per window. */
  limit: number;
  /** Requests left in the current window. */
  remaining: number;
  /** Seconds until quota is available again. */
  reset: number;
  /** Server-side policy name, e.g. "api:write". */
  policy?: string;
}

export interface ThrottleState {
  /** Policy currently in cooldown, or null when nothing is throttled. */
  policy: string | null;
  /** Epoch ms at which the cooldown lifts. */
  until: number;
  /** The request that tripped it, for the message. */
  endpoint: string;
}

const IDLE: ThrottleState = { policy: null, until: 0, endpoint: '' };

// ── Endpoint → policy classification ─────────────────────────────────────────
// Mirrors backend/app/core/rate_limit/policy.py. It only needs to be right
// enough to know which cooldown a request would land in; anything unmatched
// falls through to null and is never blocked client-side.

export function classifyEndpoint(endpoint: string, method = 'GET'): string | null {
  const path = endpoint.split('?')[0];
  const verb = method.toUpperCase();

  if (path.startsWith('/api/auth/')) {
    if (path === '/api/auth/register') return 'auth:register';
    if (path === '/api/auth/login') return 'auth:login';
    if (path === '/api/auth/login/verify') return 'auth:mfa';
    if (path === '/api/auth/forgot-password') return 'auth:forgot_password';
    if (path === '/api/auth/reset-password') return 'auth:reset_password';
    if (path.startsWith('/api/auth/totp/')) return 'auth:totp_manage';
    if (path === '/api/auth/refresh') return 'auth:refresh';
    if (path === '/api/auth/me') return verb === 'GET' ? 'api:read' : 'api:write';
  }

  if (path.startsWith('/api/transactions')) {
    if (path.endsWith('/summary')) return 'api:report';
    return verb === 'GET' ? 'api:read' : 'api:write';
  }

  return null;
}

// ── Header parsing ───────────────────────────────────────────────────────────

function toInt(value: string | null): number | null {
  if (value === null) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = toInt(headers.get('RateLimit-Limit'));
  const remaining = toInt(headers.get('RateLimit-Remaining'));
  if (limit === null || remaining === null) return null;

  return {
    limit,
    remaining,
    reset: toInt(headers.get('RateLimit-Reset')) ?? 0,
    policy: headers.get('RateLimit-Policy') ?? undefined,
  };
}

/**
 * How long to wait after a 429. Prefers Retry-After, falls back to
 * RateLimit-Reset, and finally to a conservative default — the header can be
 * missing if a proxy strips it or the response never reached our handler.
 */
export function retryAfterSeconds(headers: Headers, body?: unknown): number {
  const header = toInt(headers.get('Retry-After'));
  if (header !== null && header > 0) return header;

  const reset = toInt(headers.get('RateLimit-Reset'));
  if (reset !== null && reset > 0) return reset;

  if (body && typeof body === 'object' && 'retry_after' in body) {
    const fromBody = Number((body as { retry_after: unknown }).retry_after);
    if (Number.isFinite(fromBody) && fromBody > 0) return fromBody;
  }

  return 30;
}

// ── Cooldown store ───────────────────────────────────────────────────────────

const cooldowns = new Map<string, number>(); // policy -> epoch ms
let snapshot: ThrottleState = IDLE;
const listeners = new Set<() => void>();
let sweepTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function recomputeSnapshot() {
  const now = Date.now();
  let worstPolicy: string | null = null;
  let worstUntil = 0;

  cooldowns.forEach((until, policy) => {
    if (until <= now) {
      cooldowns.delete(policy);
      return;
    }
    if (until > worstUntil) {
      worstUntil = until;
      worstPolicy = policy;
    }
  });

  const next: ThrottleState =
    worstPolicy === null ? IDLE : { policy: worstPolicy, until: worstUntil, endpoint: snapshot.endpoint };

  const changed = next.policy !== snapshot.policy || next.until !== snapshot.until;
  snapshot = next;
  if (changed) emit();

  scheduleSweep();
}

function scheduleSweep() {
  if (sweepTimer) clearTimeout(sweepTimer);
  sweepTimer = null;
  if (snapshot.policy === null) return;

  // Wake once when the cooldown lapses rather than polling every second — the
  // countdown in the UI ticks on its own.
  const delay = Math.max(250, snapshot.until - Date.now() + 100);
  sweepTimer = setTimeout(recomputeSnapshot, delay);
}

/** Records a 429 from the server and starts the cooldown for its policy. */
export function noteThrottled(policy: string | null, retryAfterSec: number, endpoint = ''): void {
  if (!policy) return;
  const until = Date.now() + retryAfterSec * 1000;
  const existing = cooldowns.get(policy) ?? 0;
  if (until > existing) cooldowns.set(policy, until);
  snapshot = { ...snapshot, endpoint };
  recomputeSnapshot();
}

/** Milliseconds left on a policy's cooldown; 0 when it is clear to send. */
export function cooldownRemainingMs(policy: string | null): number {
  if (!policy) return 0;
  const until = cooldowns.get(policy);
  if (!until) return 0;
  const left = until - Date.now();
  if (left <= 0) {
    cooldowns.delete(policy);
    return 0;
  }
  return left;
}

/** Clears every cooldown. Used on logout, and by tests. */
export function resetCooldowns(): void {
  cooldowns.clear();
  recomputeSnapshot();
}

export function subscribeThrottle(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getThrottleSnapshot(): ThrottleState {
  return snapshot;
}

/** Server snapshot for useSyncExternalStore — nothing is throttled during SSR. */
export function getThrottleServerSnapshot(): ThrottleState {
  return IDLE;
}
