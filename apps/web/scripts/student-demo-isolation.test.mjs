import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  resolveInitialPreferences,
  shouldEnableDemoTools,
  shouldUnlockWithXp,
  resolveStudentProgressStats,
  formatProgressStat,
  isLiveStudentRoute,
  DEMO_STORAGE_KEY,
  PREF_STORAGE_KEY,
  LEGACY_STUDENT_KEY,
} from "../src/lib/student/demo-rules.ts";

/** Mock minimal localStorage for Node test runner */
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get _store() {
      return store;
    },
  };
}

describe("Student Demo Isolation & Preferences (A02)", () => {
  beforeEach(() => {
    globalThis.window = {
      localStorage: createMockLocalStorage(),
      location: { search: "" },
    };
  });

  describe("Preference Resolution & Non-destructive migration", () => {
    it("returns default preferences when storage is empty", () => {
      const pure = resolveInitialPreferences(null, null);
      assert.equal(pure.theme, "dark");
      assert.equal(pure.showPinyin, true);
      assert.equal(pure.showMeaning, true);
    });

    it("reads existing hanlu-preferences directly when present", () => {
      const prefData = JSON.stringify({
        state: { theme: "light", showPinyin: false, showMeaning: false },
      });
      window.localStorage.setItem(PREF_STORAGE_KEY, prefData);

      const pure = resolveInitialPreferences(prefData, null);
      assert.equal(pure.theme, "light");
      assert.equal(pure.showPinyin, false);
      assert.equal(pure.showMeaning, false);
    });

    it("safely falls back to legacy hanlu-student without mutating or deleting it", () => {
      const legacyData = JSON.stringify({
        state: {
          theme: "light",
          showPinyin: false,
          showMeaning: true,
          student: { xp: 5240, streakDays: 12 },
        },
      });
      window.localStorage.setItem(LEGACY_STUDENT_KEY, legacyData);

      const pure = resolveInitialPreferences(null, legacyData);
      assert.equal(pure.theme, "light");
      assert.equal(pure.showPinyin, false);
      assert.equal(pure.showMeaning, true);

      // CRITICAL: Assert legacy store was NOT deleted or mutated
      assert.equal(window.localStorage.getItem(LEGACY_STUDENT_KEY), legacyData);
      assert.equal(window.localStorage.getItem(PREF_STORAGE_KEY), null);
    });

    it("prefers hanlu-preferences over the legacy store when both exist", () => {
      const prefData = JSON.stringify({ state: { theme: "dark", showPinyin: true } });
      const legacyData = JSON.stringify({ state: { theme: "light" } });
      const pure = resolveInitialPreferences(prefData, legacyData);
      assert.equal(pure.theme, "dark");
    });

    it("handles corrupt JSON gracefully with defaults", () => {
      const pure = resolveInitialPreferences("{corrupt", "invalid");
      assert.equal(pure.theme, "dark");
      assert.equal(pure.showPinyin, true);
      assert.equal(pure.showMeaning, true);
    });
  });

  describe("Demo Switcher Gating (WEB-016)", () => {
    it("disables demo tools unconditionally when NODE_ENV is production", () => {
      // Regardless of query param ?demo=1 or storage flag hanlu-demo=1
      assert.equal(shouldEnableDemoTools("production", "1", "1"), false);
      assert.equal(shouldEnableDemoTools("production", "1", null), false);
      assert.equal(shouldEnableDemoTools("production", null, "1"), false);
      assert.equal(shouldEnableDemoTools("production", null, null), false);
    });

    it("allows demo tools in development when flag is set", () => {
      assert.equal(shouldEnableDemoTools("development", "1", null), true);
      assert.equal(shouldEnableDemoTools("development", null, "1"), true);
      assert.equal(shouldEnableDemoTools("development", "0", "1"), false);
      assert.equal(shouldEnableDemoTools("development", null, null), false);
    });
  });

  describe("XP Content Unlocking Gating", () => {
    it("blocks unlocking via XP in production even if user has plenty of XP", () => {
      const allowed = shouldUnlockWithXp("production", 99999, 100);
      assert.equal(allowed, false, "Production must not allow unlock with mock XP");
    });

    it("allows unlocking via XP in demo/development mode when affordable", () => {
      assert.equal(shouldUnlockWithXp("development", 500, 100), true);
      assert.equal(shouldUnlockWithXp("development", 50, 100), false);
    });
  });

  describe("Real Account Progress Isolation (A02 review #1: absent, not zero)", () => {
    it("returns ABSENT progress (null, not 0) in production", () => {
      const mockStats = { xp: 5240, streakDays: 12, currentLevel: 3, rank: "Thám hoa" };
      const resolved = resolveStudentProgressStats("production", mockStats);

      assert.equal(resolved.xp, null, "XP must be null (absent), never a fabricated 0");
      assert.equal(resolved.streakDays, null, "Streak must be null (absent)");
      assert.equal(resolved.currentLevel, null, "Level must be null (absent)");
      assert.equal(resolved.rank, null, "Rank must be null (absent)");
    });

    it("returns mock stats in development/demo mode", () => {
      const mockStats = { xp: 5240, streakDays: 12, currentLevel: 3, rank: "Thám hoa" };
      const resolved = resolveStudentProgressStats("development", mockStats);

      assert.equal(resolved.xp, 5240);
      assert.equal(resolved.streakDays, 12);
      assert.equal(resolved.currentLevel, 3);
      assert.equal(resolved.rank, "Thám hoa");
    });
  });

  describe("formatProgressStat (absent numbers render as em dash)", () => {
    it("renders null as —", () => {
      assert.equal(formatProgressStat(null), "—");
    });

    it("renders present numbers in the vi-VN locale", () => {
      assert.equal(formatProgressStat(5240), "5.240");
      assert.equal(formatProgressStat(0), "0");
    });
  });

  describe("isLiveStudentRoute (A02 review #4: one classification drives the nav)", () => {
    it("marks the live-backend and repo-static routes as live", () => {
      for (const path of [
        "/student",
        "/student/classes",
        "/student/flashcards",
        "/student/mistakes",
        "/student/grammar",
        "/student/foundation",
      ]) {
        assert.equal(isLiveStudentRoute(path), true, `${path} must be live`);
      }
    });

    it("marks backend-less routes as not live, so the nav hides them", () => {
      for (const path of [
        "/student/assignments",
        "/student/exams",
        "/student/learning-path",
        "/student/placement",
        "/student/writing",
        "/student/lego",
        "/student/workplace",
        "/student/badges",
        "/student/leaderboard",
        "/student/progress",
      ]) {
        assert.equal(isLiveStudentRoute(path), false, `${path} must NOT be live`);
      }
    });
  });
});
