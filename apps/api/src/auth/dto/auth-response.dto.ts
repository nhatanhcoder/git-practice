import type { UserRole, UserStatus } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
};

export type RefreshResult = {
  accessToken: string;
};

export type RegisterResult = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  nickname: string | null;
  createdAt: string;
};

export function toAuthUser(row: {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}): AuthUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: row.status,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    createdAt: row.createdAt.toISOString(),
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
  };
}
