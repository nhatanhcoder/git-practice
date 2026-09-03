import { apiRequest, ApiError } from './api-client';
import { initialAdminProfile, type UserProfile } from './auth-profile-data';

export async function fetchMyProfile(): Promise<{ profile: UserProfile; isFallback?: boolean }> {
  try {
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
  } catch (err) {
    return {
      profile: initialAdminProfile,
      isFallback: true,
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
