import {
  classifyEndpoint,
  cooldownRemainingMs,
  noteThrottled,
  parseRateLimitHeaders,
  resetCooldowns,
  retryAfterSeconds,
  type RateLimitInfo,
} from './rateLimit';

export class APIError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown = null) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'APIError';
  }
}

/**
 * Thrown for 429s, and for requests short-circuited locally while a cooldown
 * is still running. Callers that already handle APIError keep working; those
 * that want the wait time can check `instanceof RateLimitError`.
 */
export class RateLimitError extends APIError {
  /** Seconds until the caller may retry. */
  retryAfter: number;
  /** Server policy that rejected the call, e.g. "auth:login". */
  policy: string | null;
  /** True when this never left the browser — we knew the limit was still hot. */
  local: boolean;

  constructor(
    message: string,
    retryAfter: number,
    policy: string | null,
    data: unknown = null,
    local = false,
  ) {
    super(message, 429, data);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.policy = policy;
    this.local = local;
  }
}

/** Last seen quota for each policy, for anything that wants to show headroom. */
const quota = new Map<string, RateLimitInfo>();

export function getQuota(policy: string): RateLimitInfo | undefined {
  return quota.get(policy);
}

function waitMessage(seconds: number): string {
  if (seconds < 60) return `Too many requests. Try again in ${seconds}s.`;
  const minutes = Math.ceil(seconds / 60);
  return `Too many requests. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ft_token');
  }
  return null;
};

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ft_token', token);
  }
};

export const getRefreshToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ft_refresh_token');
  }
  return null;
};

export const setRefreshToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('ft_refresh_token', token);
  }
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_refresh_token');
    // Cooldowns are keyed to the previous session's traffic. Keeping them
    // would make the login screen refuse requests the next user never made.
    resetCooldowns();
  }
};

interface FetchOptions extends RequestInit {
  data?: unknown;
}

export async function fetchApi<T = unknown>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers: customHeaders, ...customOptions } = options;

  const token = getToken();
  
  const headers = new Headers(customHeaders);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (data) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...customOptions,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  // Use the NEXT_PUBLIC_API_URL environment variable based on environment
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV || 'local';
  let baseUrl = '';
  if (appEnv === 'prod') {
    baseUrl = process.env.NEXT_PUBLIC_API_URL_PROD || '';
  } else {
    baseUrl = process.env.NEXT_PUBLIC_API_URL_LOCAL || 'http://127.0.0.1:5000';
  }

  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  // Don't spend a round trip on a bucket we already know is empty. The server
  // would reject it anyway, and the attempt pushes the reset time out further.
  const policy = classifyEndpoint(endpoint, config.method ?? 'GET');
  const cooling = cooldownRemainingMs(policy);
  if (cooling > 0) {
    const seconds = Math.ceil(cooling / 1000);
    throw new RateLimitError(waitMessage(seconds), seconds, policy, null, true);
  }

  let response = await fetch(url, config);

  if (response.status === 401 && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
    // Try to refresh the token
    const refreshToken = getRefreshToken();
    let refreshed = false;
    let throttled = false;

    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${refreshToken}` }
        });

        if (refreshRes.status === 429) {
          // A throttled refresh says nothing about whether the session is
          // still valid. Logging the user out here would turn a momentary
          // limit into a forced re-login.
          throttled = true;
          const seconds = retryAfterSeconds(refreshRes.headers);
          noteThrottled('auth:refresh', seconds, '/api/auth/refresh');
        } else if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setToken(refreshData.access_token);
          // Retry original request with new token
          headers.set('Authorization', `Bearer ${refreshData.access_token}`);
          config.headers = headers;
          response = await fetch(url, config);
          refreshed = true;
        }
      } catch {
        // ignore and let it fall through to logout
      }
    }
    
    if (!refreshed && throttled) {
      const seconds = Math.ceil(cooldownRemainingMs('auth:refresh') / 1000) || 30;
      throw new RateLimitError(waitMessage(seconds), seconds, 'auth:refresh', null, true);
    }

    if (!refreshed) {
      // Unauthorized: token expired and refresh failed.
      removeToken();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
        window.location.href = '/auth/login';
      }
    }
  }

  const contentType = response.headers.get('content-type');
  let responseData = null;
  if (contentType && contentType.includes('application/json')) {
    responseData = await response.json();
  } else if (response.status !== 204) {
    responseData = await response.text();
  }

  const info = parseRateLimitHeaders(response.headers);
  if (info && policy) {
    quota.set(policy, { ...info, policy });
  }

  if (response.status === 429) {
    // Prefer the policy the server names — our client-side classification is a
    // mirror of the backend's table and can drift.
    const serverPolicy =
      (responseData && typeof responseData === 'object' && 'policy' in responseData
        ? String((responseData as { policy: unknown }).policy)
        : null) ?? policy;
    const seconds = retryAfterSeconds(response.headers, responseData);
    noteThrottled(serverPolicy, seconds, endpoint);
    throw new RateLimitError(
      responseData?.error || waitMessage(seconds),
      seconds,
      serverPolicy,
      responseData,
    );
  }

  if (!response.ok) {
    throw new APIError(
      responseData?.error || 'An unexpected error occurred',
      response.status,
      responseData
    );
  }

  return responseData;
}
