/**
 * Pure identity rules for the learner shell.
 * Zero external dependencies so that node --test and Next.js can both use it.
 */

/** Neutral fallback when the account has no display name. Not a person. */
export const NEUTRAL_STUDENT_NAME = "Học viên";

export function initialsOf(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Pure derivation, exported for unit tests: no store, no React. */
export function resolveIdentity(nickname: string | null | undefined): {
  name: string;
  initials: string;
} {
  const clean = (nickname ?? "").trim();
  if (!clean) {
    return { name: NEUTRAL_STUDENT_NAME, initials: initialsOf(NEUTRAL_STUDENT_NAME) };
  }
  return { name: clean, initials: initialsOf(clean) };
}
