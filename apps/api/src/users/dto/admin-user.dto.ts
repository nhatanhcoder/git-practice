import type { User } from '@prisma/client';

/**
 * Response shapes for the Admin user endpoints (`02-users.md` §3).
 *
 * These are built by explicit field lists, never by spreading the Prisma row. The
 * repository already restricts its `select`, and this is the second barrier: adding a
 * column to the schema must not silently publish it, and `passwordHash` must never
 * appear in any response (INV-USERS-02).
 *
 * Every DateTime leaves as UTC ISO 8601 (INV-USERS-18) — formatting for display is the
 * UI layer's job and nowhere else's (`working-rules.md` § API Rules).
 */
export type AdminUserListItem = {
  id: string;
  email: string;
  role: User['role'];
  status: User['status'];
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
};

export type AdminUserDetail = AdminUserListItem & {
  hskLevelGoal: number | null;
  bio: string | null;
  updatedAt: string;
};

/** Columns the list endpoint reads. Keep in step with `AdminUserListItem`. */
export const LIST_SELECT = {
  id: true,
  email: true,
  role: true,
  status: true,
  nickname: true,
  avatarUrl: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

/** Columns the detail endpoint reads. Keep in step with `AdminUserDetail`. */
export const DETAIL_SELECT = {
  ...LIST_SELECT,
  hskLevelGoal: true,
  bio: true,
  updatedAt: true,
} as const;

type ListRow = Pick<User, keyof typeof LIST_SELECT>;
type DetailRow = Pick<User, keyof typeof DETAIL_SELECT>;

export function toListItem(row: ListRow): AdminUserListItem {
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

export function toDetail(row: DetailRow): AdminUserDetail {
  return {
    ...toListItem(row),
    hskLevelGoal: row.hskLevelGoal,
    bio: row.bio,
    updatedAt: row.updatedAt.toISOString(),
  };
}
