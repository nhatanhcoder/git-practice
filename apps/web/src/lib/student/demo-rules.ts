/**
 * Pure rules for student demo isolation and preference resolution.
 * Zero external imports so both Next.js and node --test can run it natively.
 *
 * The app must CALL these functions rather than re-deriving the same decisions
 * inline — a rule that is tested but not wired protects nothing (A02 review #5).
 */

export const DEMO_STORAGE_KEY = "hanlu-demo";
export const PREF_STORAGE_KEY = "hanlu-preferences";
export const LEGACY_STUDENT_KEY = "hanlu-student";

export interface ResolvedPreferences {
  theme: "dark" | "light";
  showPinyin: boolean;
  showMeaning: boolean;
}

/** Pure fallback reader for preferences from storage: non-destructive read only. */
export function resolveInitialPreferences(
  prefRaw: string | null | undefined,
  legacyRaw: string | null | undefined,
): ResolvedPreferences {
  const defaults: ResolvedPreferences = {
    theme: "dark",
    showPinyin: true,
    showMeaning: true,
  };

  try {
    if (prefRaw) {
      const parsed = JSON.parse(prefRaw);
      if (parsed?.state) {
        return {
          theme: parsed.state.theme === "light" ? "light" : "dark",
          showPinyin: parsed.state.showPinyin !== false,
          showMeaning: parsed.state.showMeaning !== false,
        };
      }
    }

    if (legacyRaw) {
      const legacyParsed = JSON.parse(legacyRaw);
      const legacyState = legacyParsed?.state;
      if (legacyState) {
        return {
          theme: legacyState.theme === "light" ? "light" : "dark",
          showPinyin: legacyState.showPinyin !== false,
          showMeaning: legacyState.showMeaning !== false,
        };
      }
    }
  } catch {
    // Malformed JSON: safe fallback to defaults
  }

  return defaults;
}

/** Rules for enabling demo scaffolding switcher (WEB-004, WEB-016). */
export function shouldEnableDemoTools(
  nodeEnv: string | undefined,
  queryFlag: string | null | undefined,
  storageFlag: string | null | undefined,
): boolean {
  if (nodeEnv === "production") return false;
  if (queryFlag !== undefined && queryFlag !== null) {
    return queryFlag === "1";
  }
  return storageFlag === "1";
}

/** Rules for XP content unlocking: demo only, never in production. */
export function shouldUnlockWithXp(nodeEnv: string | undefined, xp: number, cost: number): boolean {
  if (nodeEnv === "production") return false;
  return xp >= cost;
}

/**
 * A02 review #1: production has no progress endpoints, so there is NO measured
 * XP, streak or level for a signed-in account. The rule is "leave the numbers
 * absent" (the WEB-015 fix plan) — null, never a fabricated 0.
 */
export interface ProgressStats {
  xp: number | null;
  streakDays: number | null;
  currentLevel: number | null;
  rank: string | null;
}

export function resolveStudentProgressStats(
  nodeEnv: string | undefined,
  mockStats: { xp: number; streakDays: number; currentLevel: number; rank?: string },
): ProgressStats {
  if (nodeEnv === "production") {
    return { xp: null, streakDays: null, currentLevel: null, rank: null };
  }
  return {
    xp: mockStats.xp,
    streakDays: mockStats.streakDays,
    currentLevel: mockStats.currentLevel,
    rank: mockStats.rank ?? null,
  };
}

/** Renders an absent measurement as "—", a present one in the UI locale. */
export function formatProgressStat(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("vi-VN");
}

/**
 * A02 review #4: the one classification of what actually works against a real
 * backend (or is repo-static content) in a production build. The sidebar, the
 * mobile tab bar and the "more" sheet are filtered by this same list, so the
 * navigation can never invite the learner into a screen that cannot serve them.
 *
 * Live backend: dashboard, classes, flashcards SRS, mistake notebook.
 * Repo-static content (no server needed): grammar library, pinyin/radicals.
 * Everything else needs Sprint 4/5 backends and is hidden in production.
 */
export const LIVE_PROD_STUDENT_ROUTES: readonly string[] = [
  "/student",
  "/student/classes",
  "/student/flashcards",
  "/student/mistakes",
  "/student/grammar",
  "/student/foundation",
];

export function isLiveStudentRoute(path: string): boolean {
  return LIVE_PROD_STUDENT_ROUTES.includes(path);
}
