/**
 * Pure rules for student demo isolation and preference resolution.
 * Zero external imports so both Next.js and node --test can run it natively.
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

/** Rules for student progress display: never substitute local mock progress for real accounts. */
export function resolveStudentProgressStats(
  nodeEnv: string | undefined,
  mockStats: { xp: number; streakDays: number; currentLevel: number; rank: string },
): { xp: number; streakDays: number; currentLevel: number; rank: string; isMock: boolean } {
  if (nodeEnv === "production") {
    return {
      xp: 0,
      streakDays: 0,
      currentLevel: 1,
      rank: "Học viên",
      isMock: false,
    };
  }
  return {
    ...mockStats,
    isMock: true,
  };
}
