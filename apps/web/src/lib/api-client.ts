import { readAccessToken, useAuthStore, type AuthUser } from './auth/auth-store';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiErrorPayload {
  statusCode: number;
  error?: string;
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(payload: ApiErrorPayload) {
    super(payload.message || 'Lỗi hệ thống');
    this.name = 'ApiError';
    this.statusCode = payload.statusCode;
    this.code = payload.code || 'INTERNAL_SERVER_ERROR';
    this.details = payload.details;
  }

  /** True when the caller is not signed in (or no longer is). */
  get isUnauthenticated(): boolean {
    return this.statusCode === 401;
  }

  /** True when the caller IS signed in but this role may not do this. */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Endpoints that must never trigger the refresh-and-retry path.
 *
 * `/auth/refresh` returning 401 means the refresh cookie itself is dead — retrying
 * it recurses. `/auth/login` returning 401 means wrong credentials, which is an
 * answer, not a session problem: retrying would swallow the error the form needs.
 */
const NO_RETRY = ['/auth/refresh', '/auth/login', '/auth/register'];

function toUrl(endpoint: string): string {
  if (endpoint.startsWith('http')) return endpoint;
  return `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

async function rawRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = readAccessToken();
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(toUrl(endpoint), {
    ...options,
    headers,
    // Required, not cosmetic: without it the browser never sends the httpOnly
    // refresh_token cookie and /auth/refresh can never work cross-origin.
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type');
  const body =
    contentType && contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

  if (!response.ok) {
    throw new ApiError({
      statusCode: response.status,
      code: body?.code || 'REQUEST_FAILED',
      message: body?.message || `Yêu cầu thất bại (${response.status})`,
      details: body?.details,
    });
  }

  return body as ApiResponse<T>;
}

/**
 * At most ONE refresh in flight, ever.
 *
 * This is not an optimisation. Refresh tokens rotate: the server marks the old
 * token `rotated` and issues a child. Two tabs (or two parallel 401s in one tab)
 * that each POST /auth/refresh with the same cookie make the second one look
 * exactly like a stolen token being replayed — and the server's replay defence
 * revokes the whole family, logging the real user out mid-work. Sharing one
 * promise means the second caller awaits the first instead of racing it.
 */
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      // Verified against the running API: /auth/refresh returns `{ accessToken }`
      // and nothing else — no user object. Assuming otherwise would have written
      // `undefined` over a valid signed-in user on every silent refresh.
      const res = await rawRequest<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
      });
      useAuthStore.getState().setAccessToken(res.data.accessToken);
      return true;
    } catch {
      useAuthStore.getState().clearSession();
      return false;
    } finally {
      // Cleared in `finally` so a failed refresh does not pin every later call
      // to the same rejected promise for the rest of the page's life.
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * The single entry point for every API call.
 *
 * On 401 it refreshes once and retries once — per working-rules.md § Auth Rules.
 * It does NOT redirect: routing is the shell's job (see RequireAuth), and a fetch
 * helper that navigates makes every caller's error handling unreachable.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    return await rawRequest<T>(endpoint, options);
  } catch (err) {
    const isAuthFailure = err instanceof ApiError && err.statusCode === 401;
    const retryable = isAuthFailure && !NO_RETRY.some((p) => endpoint.startsWith(p));

    if (!retryable) throw err;

    const refreshed = await refreshSession();
    if (!refreshed) throw err;

    return rawRequest<T>(endpoint, options);
  }
}

/**
 * Called once when the app mounts. The access token is memory-only, so after any
 * page reload the only proof of a session is the refresh cookie. Without this the
 * user is bounced to /login on every F5 despite holding a valid 7-day cookie.
 */
export async function restoreSession(): Promise<boolean> {
  const refreshed = await refreshSession();
  if (!refreshed) {
    useAuthStore.getState().markAnonymous();
    return false;
  }

  // The new access token proves the session; it does not describe the user, so
  // who it belongs to still has to be asked for. Without this the shell has a
  // token and no role, and every role-gated redirect misfires.
  try {
    const me = await rawRequest<AuthUser>('/auth/me');
    useAuthStore.getState().setSession(
      useAuthStore.getState().accessToken as string,
      me.data,
    );
    return true;
  } catch {
    useAuthStore.getState().markAnonymous();
    return false;
  }
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await rawRequest<{ accessToken: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  useAuthStore.getState().setSession(res.data.accessToken, res.data.user);
  return res.data.user;
}

export async function logout(): Promise<void> {
  try {
    await rawRequest('/auth/logout', { method: 'POST' });
  } finally {
    // Clear locally even if the server call failed — a network error must not
    // leave a signed-out user looking signed in.
    useAuthStore.getState().clearSession();
  }
}
