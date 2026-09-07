"use client";

/**
 * Local UI preferences for the learner interface (theme, pinyin, meaning).
 *
 * A02: decoupled from the mock learning progress store (`hanlu-student`).
 * These settings are local to the current browser/device; they are NOT synced
 * across devices and do NOT represent account-level server progress.
 *
 * Non-destructive migration: if `hanlu-preferences` does not exist in localStorage
 * yet, initial state safely inspects `hanlu-student` to preserve existing user
 * choices without clearing or modifying the legacy key.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface StudentPreferences {
  theme: "dark" | "light";
  showPinyin: boolean;
  showMeaning: boolean;
  toggleTheme: () => void;
  togglePinyin: () => void;
  toggleMeaning: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

const PREF_KEY = "hanlu-preferences";
const LEGACY_KEY = "hanlu-student";

/** Pure fallback reader from legacy storage: non-destructive read only. */
export function getInitialPreferences(): {
  theme: "dark" | "light";
  showPinyin: boolean;
  showMeaning: boolean;
} {
  const defaults = {
    theme: "dark" as const,
    showPinyin: true,
    showMeaning: true,
  };

  if (typeof window === "undefined" || !window.localStorage) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.state) {
        return {
          theme: parsed.state.theme === "light" ? "light" : "dark",
          showPinyin: parsed.state.showPinyin !== false,
          showMeaning: parsed.state.showMeaning !== false,
        };
      }
    }

    // Safe fallback inspection of legacy store
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
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
    // Private mode or corrupt JSON: safe fallback
  }

  return defaults;
}

export const useStudentPreferences = create<StudentPreferences>()(
  persist(
    (set) => ({
      theme: "dark",
      showPinyin: true,
      showMeaning: true,
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
      toggleMeaning: () => set((s) => ({ showMeaning: !s.showMeaning })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: PREF_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
