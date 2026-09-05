import { apiRequest, ApiError, type ApiResponse } from './api-client';

export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'pending' | 'active' | 'suspended';

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

const FALLBACK_USERS: AdminUserItem[] = [
  { id: "1", nickname: "Nguyễn Minh Anh", email: "minhanh@example.com", role: "student", status: "pending", createdAt: "2026-08-09T00:00:00.000Z", lastLoginAt: null },
  { id: "2", nickname: "Trần Thu Hà", email: "thuha.teacher@example.com", role: "teacher", status: "pending", createdAt: "2026-08-08T00:00:00.000Z", lastLoginAt: null },
  { id: "3", nickname: "Hoàng Văn Nam", email: "namhoang@example.com", role: "student", status: "active", createdAt: "2026-06-14T00:00:00.000Z", lastLoginAt: "2026-08-10T20:05:00.000Z" },
  { id: "4", nickname: "Lê Quang Dũng", email: "quangdung@example.com", role: "student", status: "active", createdAt: "2026-05-21T00:00:00.000Z", lastLoginAt: "2026-08-11T09:14:00.000Z" },
  { id: "5", nickname: "Vũ Ngọc Bích", email: "bichvu@example.com", role: "student", status: "suspended", createdAt: "2026-04-30T00:00:00.000Z", lastLoginAt: "2026-07-28T15:33:00.000Z" },
  { id: "6", nickname: "Phạm Thị Lan", email: "lan.pham@example.com", role: "teacher", status: "active", createdAt: "2026-03-02T00:00:00.000Z", lastLoginAt: "2026-08-11T07:42:00.000Z" },
  { id: "7", nickname: "Đỗ Hải Yến", email: "haiyen.teacher@example.com", role: "teacher", status: "active", createdAt: "2026-01-19T00:00:00.000Z", lastLoginAt: "2026-08-11T08:58:00.000Z" },
  { id: "8", nickname: "Bùi Anh Tuấn", email: "tuanbui@example.com", role: "admin", status: "active", createdAt: "2025-11-05T00:00:00.000Z", lastLoginAt: "2026-08-11T09:31:00.000Z" },
];

export async function fetchAdminUsers(
  params: FetchUsersParams = {},
): Promise<{ users: AdminUserItem[]; total: number; page: number; totalPages: number; isFallback?: boolean }> {
  try {
    const query = new URLSearchParams();
    if (params.q?.trim()) query.set('q', params.q.trim());
    if (params.role && params.role !== 'all') query.set('role', params.role);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.order) query.set('order', params.order);

    const queryString = query.toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;

    const res = await apiRequest<AdminUserItem[]>(endpoint);
    const users = Array.isArray(res.data) ? res.data : [];
    const meta = res.meta || { total: users.length, page: 1, limit: users.length, totalPages: 1 };

    return {
      users,
      total: meta.total,
      page: meta.page,
      totalPages: meta.totalPages,
    };
  } catch (err) {
    // Graceful fallback for offline dev / static SSG builds
    const normalized = (params.q || '').trim().toLocaleLowerCase('vi');
    let filtered = FALLBACK_USERS.filter((u) => {
      if (params.role && params.role !== 'all' && u.role !== params.role) return false;
      if (params.status && params.status !== 'all' && u.status !== params.status) return false;
      if (normalized && !(u.nickname + ' ' + u.email).toLocaleLowerCase('vi').includes(normalized)) return false;
      return true;
    });

    const sortField = params.sortBy || 'createdAt';
    filtered.sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      return params.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return {
      users: filtered,
      total: filtered.length,
      page: 1,
      totalPages: 1,
      isFallback: true,
    };
  }
}

export async function fetchAdminUserDetail(
  id: string,
): Promise<{ user: AdminUserDetail | null; isFallback?: boolean }> {
  try {
    const res = await apiRequest<AdminUserDetail>(`/admin/users/${id}`);
    return { user: res.data };
  } catch (err) {
    const fallback = FALLBACK_USERS.find((u) => u.id === id);
    if (fallback) {
      return {
        user: {
          ...fallback,
          avatarUrl: null,
          hskLevelGoal: fallback.role === 'student' ? 4 : null,
          bio: 'Dữ liệu mẫu chế độ ngoại tuyến',
        },
        isFallback: true,
      };
    }
    return { user: null, isFallback: true };
  }
}
