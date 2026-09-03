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
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // send cookies for refresh token
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError({
      statusCode: response.status,
      code: body?.code || 'REQUEST_FAILED',
      message: body?.message || `Yêu cầu thất bại (${response.status})`,
      details: body?.details,
    });
  }

  // Envelope returns `{ data, meta }` or just `{ data }`
  return body as ApiResponse<T>;
}
