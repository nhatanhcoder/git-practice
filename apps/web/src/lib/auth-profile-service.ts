import { apiRequest } from './api-client';
import type { UserProfile } from './auth-profile-data';

/**
 * The signed-in user's own profile.
 *
 * Throws on failure. It used to return `initialAdminProfile` — a hardcoded admin
 * — whenever the call failed, flagged `isFallback: true`, and the screen ignored
 * the flag. The result was a profile page showing someone else's name and email
 * to whoever could not reach the API.
 */
export async function fetchMyProfile(): Promise<{ profile: UserProfile }> {
  {
    const res = await apiRequest<{
      id: string;
      email: string;
      role: 'admin' | 'teacher' | 'student';
      status: string;
      nickname: string | null;
      avatarUrl: string | null;
      createdAt: string;
      lastLoginAt: string | null;
    }>('/auth/me');

    const d = res.data;
    const fullName = d.nickname || d.email;
    const initials = (fullName.trim().slice(0, 2) || 'AD').toUpperCase();

    return {
      profile: {
        id: d.id,
        fullName,
        nickname: d.nickname || '',
        email: d.email,
        avatarUrl: d.avatarUrl,
        role: d.role,
        createdAt: d.createdAt,
        lastLoginAt: d.lastLoginAt,
        initials,
      },
    };
  }
}

export async function updateMyProfile(data: {
  nickname?: string;
  avatarUrl?: string | null;
  bio?: string;
}): Promise<{ profile: UserProfile }> {
  const res = await apiRequest<{
    id: string;
    email: string;
    role: 'admin' | 'teacher' | 'student';
    status: string;
    nickname: string | null;
    avatarUrl: string | null;
    createdAt: string;
    lastLoginAt: string | null;
  }>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  const d = res.data;
  const fullName = d.nickname || d.email;
  const initials = (fullName.trim().slice(0, 2) || 'AD').toUpperCase();

  return {
    profile: {
      id: d.id,
      fullName,
      nickname: d.nickname || '',
      email: d.email,
      avatarUrl: d.avatarUrl,
      role: d.role,
      createdAt: d.createdAt,
      lastLoginAt: d.lastLoginAt,
      initials,
    },
  };
}

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ message: string }> {
  const res = await apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data || { message: 'Đổi mật khẩu thành công' };
}
