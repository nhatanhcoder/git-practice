import { apiRequest, type ApiResponse } from './api-client';

export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface AdminUserItem {
  id: string;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  avatarUrl?: string | null;
}

export interface AdminUserDetail extends AdminUserItem {
  avatarUrl: string | null;
  hskLevelGoal?: number | null;
  bio?: string | null;
  updatedAt?: string;
}

export interface FetchUsersParams {
  q?: string;
  role?: UserRole | 'all';
  status?: UserStatus | 'all';
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'lastLoginAt';
  order?: 'asc' | 'desc';
}

export interface AdminUsersPage {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * NO OFFLINE FALLBACK, deliberately.
 *
 * This module used to hold a FALLBACK_USERS array and return it whenever the API
 * call threw, flagged with `isFallback: true`. The calling screen ignored the
 * flag, so a 401 from an unauthenticated admin rendered eight invented accounts
 * that looked exactly like real ones — the screen appeared to work while being
 * completely disconnected. A screen that cannot reach its API must say so; the
 * one thing it must never do is quietly show fiction. Errors now propagate.
 */
export async function fetchAdminUsers(params: FetchUsersParams = {}): Promise<AdminUsersPage> {
  const query = new URLSearchParams();
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.role && params.role !== 'all') query.set('role', params.role);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.order) query.set('order', params.order);

  const queryString = query.toString();
  const res: ApiResponse<AdminUserItem[]> = await apiRequest<AdminUserItem[]>(
    `/admin/users${queryString ? `?${queryString}` : ''}`,
  );

  const users = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? {
    total: users.length,
    page: 1,
    limit: users.length,
    totalPages: 1,
  };

  return { users, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const res = await apiRequest<AdminUserDetail>(`/admin/users/${id}`);
  return res.data;
}

/**
 * The three lifecycle transitions, each its own endpoint (02-users.md).
 *
 * Every one returns the updated user, so the caller replaces the row with what
 * the server actually stored rather than with what it hoped happened. Guessing
 * the new status client-side is how a rejected transition still renders as
 * success.
 */
export async function approveUser(id: string): Promise<AdminUserDetail> {
  const res = await apiRequest<AdminUserDetail>(`/admin/users/${id}/approve`, { method: 'PATCH' });
  return res.data;
}

export async function suspendUser(id: string): Promise<AdminUserDetail> {
  // NOTE: the UI collects a reason, but `PATCH /admin/users/:id/suspend` accepts
  // no body — API_ADMIN.md defines no `reason` field and none is invented here.
  // Recorded as a gap; the reason is currently not persisted anywhere.
  const res = await apiRequest<AdminUserDetail>(`/admin/users/${id}/suspend`, { method: 'PATCH' });
  return res.data;
}

export async function activateUser(id: string): Promise<AdminUserDetail> {
  const res = await apiRequest<AdminUserDetail>(`/admin/users/${id}/activate`, { method: 'PATCH' });
  return res.data;
}
