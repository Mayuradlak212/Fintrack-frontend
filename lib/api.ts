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

  let response = await fetch(url, config);

  if (response.status === 401 && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
    // Try to refresh the token
    const refreshToken = getRefreshToken();
    let refreshed = false;
    
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${refreshToken}` }
        });
        
        if (refreshRes.ok) {
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

  if (!response.ok) {
    throw new APIError(
      responseData?.error || 'An unexpected error occurred',
      response.status,
      responseData
    );
  }

  return responseData;
}
