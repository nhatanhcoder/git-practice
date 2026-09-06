"use client";

/**
 * Display identity for the learner shell — the account's name and initials.
 *
 * A01: the shell and dashboard used to render the mock fixture
 * ("Nguyễn Minh Anh" / "MA" from `lib/student/store.ts`) even for a signed-in
 * user. This hook is the single place identity comes from for:
 * greeting, sidebar userchip, profile panel (desktop + mobile sheet).
 *
 * Rules it enforces:
 * - name/initials come ONLY from the live session (`AuthUser.nickname`,
 *   the field `GET /auth/me` returns) — never from the mock progress store;
 * - while the session is still restoring (`unknown`) the hook reports
 *   `ready: false`, so callers render a neutral placeholder instead of
 *   flashing the fixture name for a frame;
 * - a missing/blank nickname falls back to a neutral word, never to an
 *   invented profile or personal detail.
 *
 * Deliberately NOT covered here (still mock, other tasks own them):
 * xp, streak, rank, level and every other progress figure.
 */

import { useAuthStore } from "@/lib/auth/auth-store";
import { resolveIdentity, NEUTRAL_STUDENT_NAME } from "./identity-rules";

export { resolveIdentity, NEUTRAL_STUDENT_NAME };

export interface DisplayIdentity {
  /**
   * False until the session resolved to an authenticated user.
   * Render a placeholder while false — never a real-looking name.
   */
  ready: boolean;
  name: string;
  initials: string;
}

export function useDisplayIdentity(): DisplayIdentity {
  const status = useAuthStore((s) => s.status);
  const nickname = useAuthStore((s) => s.user?.nickname);

  if (status !== "authenticated") {
    const fallback = resolveIdentity(null);
    return { ready: false, ...fallback };
  }
  return { ready: true, ...resolveIdentity(nickname) };
}
