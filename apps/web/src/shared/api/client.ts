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

export const setCookie = (name: string, value: string | null, days: number = 14): void => {
  if (typeof document === 'undefined') return;
  if (!value) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax; Secure`;
    return;
  }
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

let inMemoryToken: string | null = null;
let inMemoryRefreshToken: string | null = null;

export const setClientAccessToken = (token: string | null): void => {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('dp_access_token', token);
    } else {
      localStorage.removeItem('dp_access_token');
    }
    setCookie('dp_access_token', token, 1);
  }
};

export const getClientAccessToken = (): string | null => {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('dp_access_token');
    if (fromStorage) return fromStorage;
    const fromCookie = getCookie('dp_access_token');
    if (fromCookie) return fromCookie;
  }
  return null;
};

export const setClientRefreshToken = (token: string | null): void => {
  inMemoryRefreshToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('dp_refresh_token', token);
    } else {
      localStorage.removeItem('dp_refresh_token');
    }
    setCookie('dp_refresh_token', token, 14);
  }
};

export const getClientRefreshToken = (): string | null => {
  if (inMemoryRefreshToken) return inMemoryRefreshToken;
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('dp_refresh_token');
    if (fromStorage) return fromStorage;
    const fromCookie = getCookie('dp_refresh_token');
    if (fromCookie) return fromCookie;
  }
  return null;
};

interface ExtendedRequestInit extends RequestInit {
  _isRetry?: boolean;
}

// Single in-flight refresh promise to deduplicate concurrent 401 refresh calls
let refreshPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  const baseUrl = getApiBaseUrl();
  const storedRefreshToken = getClientRefreshToken();

  try {
    const refreshUrl = `${baseUrl}/auth/refresh`;
    const refreshRes = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      credentials: 'include',
      body: JSON.stringify(storedRefreshToken ? { refresh_token: storedRefreshToken } : {}),
    });

    if (!refreshRes.ok) {
      setClientAccessToken(null);
      setClientRefreshToken(null);
      return null;
    }

    const refreshData = await refreshRes.json().catch(() => null);
    const newAccessToken = refreshData?.data?.tokens?.access_token;
    const newRefreshToken = refreshData?.data?.tokens?.refresh_token;

    if (newAccessToken) {
      setClientAccessToken(newAccessToken);
      if (newRefreshToken) {
        setClientRefreshToken(newRefreshToken);
      }
      return newAccessToken;
    }

    return null;
  } catch {
    return null;
  }
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
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const { _isRetry, ...fetchOptions } = options;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Send and receive HttpOnly cookies
  });

  // Handle 401: interceptor calls refresh endpoint for new access & refresh tokens, then retries
  if (
    response.status === 401 &&
    !_isRetry &&
    !endpoint.includes('/auth/refresh') &&
    !endpoint.includes('/auth/otp') &&
    !endpoint.includes('/auth/google')
  ) {
    try {
      if (!refreshPromise) {
        refreshPromise = executeTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;

      if (newToken) {
        return apiFetch<T>(endpoint, {
          ...options,
          _isRetry: true,
          headers: {
            ...((options.headers as Record<string, string>) || {}),
            Authorization: `Bearer ${newToken}`,
          },
        });
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
