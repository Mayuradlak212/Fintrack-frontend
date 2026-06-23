export class APIError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any = null) {
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

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('ft_token');
  }
};

interface FetchOptions extends RequestInit {
  data?: any;
}

export async function fetchApi<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
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

  const response = await fetch(url, config);

  if (response.status === 401) {
    // Unauthorized: token might be expired. Handle it gracefully by clearing token.
    removeToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/')) {
      window.location.href = '/auth/login';
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
