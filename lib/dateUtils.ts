/**
 * Safe date parser — returns null for any invalid/missing date string.
 */
function safeDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/** Full datetime in IST — e.g. "22 Jun 2026, 09:15 PM" */
export function formatISTDateTime(dateStr: string | undefined): string {
  const d = safeDate(dateStr);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/** Date only in IST — e.g. "22 Jun 2026" */
export function formatISTDate(dateStr: string | undefined): string {
  const d = safeDate(dateStr);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/** Month/year label in IST — e.g. "Jun 26" */
export function formatIST(
  dateStr: string | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const d = safeDate(dateStr);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/**
 * Coerces any date-like string to a full ISO 8601 string.
 * Handles YYYY-MM-DD, existing ISO strings, and falls back to now.
 */
export function toISO(dateStr: string | undefined): string {
  const d = safeDate(dateStr);
  return d ? d.toISOString() : new Date().toISOString();
}
