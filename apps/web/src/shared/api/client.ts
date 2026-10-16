export const getApiBaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  return url.replace(/\/+$/, '');
};

export const BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'API_ERROR',
    public readonly status: number = 500,
    public readonly details: unknown = null
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let inMemoryToken: string | null = null;

export const setClientAccessToken = (token: string | null): void => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('dp_access_token', token);
    } else {
      localStorage.removeItem('dp_access_token');
    }
  }
};

export const getClientAccessToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('dp_access_token');
  }
  return null;
};

interface ExtendedRequestInit extends RequestInit {
  _isRetry?: boolean;
}

export async function apiFetch<T>(
  endpoint: string,
  options: ExtendedRequestInit = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`;
  const token = getClientAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const { _isRetry, ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Send and receive HttpOnly cookies
  });

  // Handle 401: attempt automatic token refresh once and retry
  if (
    response.status === 401 &&
    !_isRetry &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/otp') &&
    !endpoint.includes('/auth/google')
  ) {
    try {
      const refreshUrl = `${baseUrl}/auth/refresh`;
      const refreshRes = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        const newToken = refreshData?.data?.tokens?.access_token;
        if (newToken) {
          setClientAccessToken(newToken);
          headers['Authorization'] = `Bearer ${newToken}`;

          const retryRes = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: 'include',
          });

          const retryData = await retryRes.json().catch(() => null);
          if (retryRes.ok) {
            return retryData?.data as T;
          }
        }
      }
    } catch {
      // Refresh failed, proceed to handle original error below
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorObj = data?.error || {};
    throw new ApiError(
      errorObj.message || `Request failed with status ${response.status}`,
      errorObj.code || 'REQUEST_FAILED',
      response.status,
      errorObj.details
    );
  }

  return data?.data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: ExtendedRequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: ExtendedRequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: ExtendedRequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: ExtendedRequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: ExtendedRequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
