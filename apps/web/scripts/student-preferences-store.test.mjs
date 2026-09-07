import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { register } from "node:module";

/**
 * A02 review #2: the legacy-preferences migration must be executed by the
 * STORE the app actually uses, not only by the pure helper the tests call.
 *
 * The store module reads localStorage at import time (module-level initial
 * state), so the window mock has to exist BEFORE the dynamic import — which is
 * why this lives in its own test file: node --test runs each file in its own
 * process, giving the import a clean module cache. The resolver hook bridges
 * the app's extensionless imports, which bare node ESM cannot resolve.
 */

register("./ts-resolution-loader.mjs", import.meta.url);

const storeMap = new Map();
const mockStorage = {
  getItem: (key) => storeMap.get(key) ?? null,
  setItem: (key, val) => storeMap.set(key, String(val)),
  removeItem: (key) => storeMap.delete(key),
  clear: () => storeMap.clear(),
};

globalThis.window = { localStorage: mockStorage };
globalThis.localStorage = mockStorage;

const LEGACY = JSON.stringify({
  state: {
    theme: "light",
    showPinyin: false,
    showMeaning: false,
    student: { xp: 5240, streakDays: 12 },
  },
});

describe("useStudentPreferences executes the legacy migration (A02 review #2)", () => {
  beforeEach(() => {
    storeMap.clear();
    storeMap.set("hanlu-student", LEGACY);
  });

  it("store initial state comes from the legacy hanlu-student choices", async () => {
    const { useStudentPreferences } = await import("../src/lib/student/preferences.ts");
    const state = useStudentPreferences.getState();

    assert.equal(state.theme, "light", "theme must migrate from the legacy store");
    assert.equal(state.showPinyin, false, "pinyin choice must migrate");
    assert.equal(state.showMeaning, false, "meaning choice must migrate");
  });

  it("legacy store survives module load untouched; nothing written until a toggle", async () => {
    const { useStudentPreferences } = await import("../src/lib/student/preferences.ts");
    useStudentPreferences.getState();

    assert.equal(
      window.localStorage.getItem("hanlu-student"),
      LEGACY,
      "legacy key must not be mutated or deleted",
    );
    assert.equal(
      window.localStorage.getItem("hanlu-preferences"),
      null,
      "no write until the user changes something",
    );
  });

  it("explicit rehydration lets a stored hanlu-preferences value win over the legacy one", async () => {
    window.localStorage.setItem(
      "hanlu-preferences",
      JSON.stringify({ state: { theme: "dark", showPinyin: true, showMeaning: true } }),
    );
    const { useStudentPreferences } = await import("../src/lib/student/preferences.ts");

    // Module-load initial state migrates from the legacy store…
    assert.equal(useStudentPreferences.getState().theme, "light");

    // …and an explicit rehydrate applies the newer stored choices over it.
    await useStudentPreferences.persist.rehydrate();
    assert.equal(useStudentPreferences.getState().theme, "dark");
  });

  it("markHydrated flips the render gate the shell keys off", async () => {
    const { useStudentPreferences } = await import("../src/lib/student/preferences.ts");
    assert.equal(useStudentPreferences.getState().hydrated, false);
    useStudentPreferences.getState().markHydrated();
    assert.equal(useStudentPreferences.getState().hydrated, true);
  });
});
