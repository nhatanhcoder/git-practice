"use client";

/**
 * Local UI preferences for the learner interface (theme, pinyin, meaning).
 *
 * A02: decoupled from the mock learning progress store (`hanlu-student`).
 * These settings are local to the current browser/device; they are NOT synced
 * across devices and do NOT represent account-level server progress.
 *
 * Migration (A02 review #2): the initial state is resolved through the tested
 * `resolveInitialPreferences` rule, which reads `hanlu-preferences` first and
 * falls back to the legacy `hanlu-student` choices — read-only, never deleted.
 * Wiring it here (not only in tests) is the point: a migration that the store
 * does not execute is dead code that silently drops the user's saved choices.
 *
 * `hydrated` (A02 review #7) tracks THIS store's rehydration, so render gates
 * key off the same lifecycle as the values they guard — not off the demo
 * progress store's separate hydration timeline.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
// Relative import on purpose: node --test runs this module without the "@/"
// alias, and the store must execute the same migration the tests exercise.
import {
  PREF_STORAGE_KEY,
  LEGACY_STUDENT_KEY,
  resolveInitialPreferences,
} from "./demo-rules";

export interface StudentPreferences {
  theme: "dark" | "light";
  showPinyin: boolean;
  showMeaning: boolean;
  hydrated: boolean;
  markHydrated: () => void;
  toggleTheme: () => void;
  togglePinyin: () => void;
  toggleMeaning: () => void;
  setTheme: (theme: "dark" | "light") => void;
}

function readStored(key: string): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private mode or blocked storage: defaults are safe
    return null;
  }
}

/** Resolved once per module load, before zustand-persist has anything stored. */
const initial = resolveInitialPreferences(
  readStored(PREF_STORAGE_KEY),
  readStored(LEGACY_STUDENT_KEY),
);

export const useStudentPreferences = create<StudentPreferences>()(
  persist(
    (set) => ({
      theme: initial.theme,
      showPinyin: initial.showPinyin,
      showMeaning: initial.showMeaning,
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
      toggleMeaning: () => set((s) => ({ showMeaning: !s.showMeaning })),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: PREF_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage
          ? window.localStorage
          : localStorage,
      ),
      skipHydration: true,
      // Keep the stored shape unchanged for existing users, and never persist
      // the transient hydration flag. The hydrated flag itself is set by the
      // consumer's mount effect (`persist.rehydrate()` then `markHydrated()`):
      // the post-rehydrate callback is not invoked with a usable state when
      // nothing is stored yet, so it cannot be the only trigger.
      partialize: (s) => ({
        theme: s.theme,
        showPinyin: s.showPinyin,
        showMeaning: s.showMeaning,
      }),
    },
  ),
);
