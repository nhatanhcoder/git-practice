import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

/**
 * TASK A12 — dead-code cleanup invariants.
 *
 * The A05 route move left the old Leitner mock's store state behind with zero
 * consumers (verified by a full-tree grep audit, recorded in the A12 session
 * file). These tests pin the removal so none of it comes back:
 *   - `vocabBox` (state + type + seed) and `rateVocab` (action) are gone from
 *     the store;
 *   - `vocabTopics` is gone from content.ts;
 *   - the persist layer migrates v1 localStorage (which still carries the old
 *     `vocabBox` key) to v2 by dropping it — otherwise the default merge
 *     re-attaches the stale key as junk state forever;
 *   - everything that IS still consumed stays: `vocabCards`, `advanceBox`,
 *     `boxInterval`, `mistakeSeed` (the audit caught its own first pass almost
 *     mislabeling mistakeSeed as dead because the script had excluded store.ts).
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const store = read("../src/lib/student/store.ts");
const content = read("../src/lib/student/content.ts");

describe("A12 · dead exports removed", () => {
  it("store no longer defines the Leitner vocabBox state, type or seed", () => {
    // The persist options block (from `name:` to the migration's closing
    // brace) legitimately names the key once to delete it from old
    // localStorage; everywhere else — the state field, the type entry, the
    // seed initializer — must be gone.
    const persistStart = store.indexOf('name: "hanlu-student"');
    const persistEnd = store.indexOf("},", store.indexOf("migrate:")) + 1;
    assert.ok(persistStart >= 0 && persistEnd > persistStart);
    const outsidePersist =
      store.slice(0, persistStart) + store.slice(persistEnd);
    assert.doesNotMatch(
      outsidePersist,
      /vocabBox/,
      "vocabBox state must be gone from the store (only the migration may name it)",
    );
  });

  it("store no longer defines the rateVocab action", () => {
    assert.doesNotMatch(store, /rateVocab/, "rateVocab action must be gone from the store");
  });

  it("content no longer exports vocabTopics", () => {
    assert.doesNotMatch(content, /vocabTopics/, "vocabTopics had zero consumers");
  });
});

describe("A12 · persist migration to v2", () => {
  it("bumps the persist version and declares a migration", () => {
    assert.match(store, /version:\s*2/);
    assert.match(store, /migrate|version\s*\(storedVersion\)/);
  });

  it("the migration deletes the stale vocabBox key from old persisted state", () => {
    // Find the migration body and require it to reference the removed key.
    const migrationMatch = store.match(/migrate[\s\S]{0,400}/);
    assert.ok(migrationMatch, "a migrate function must exist");
    assert.match(
      migrationMatch[0],
      /vocabBox/,
      "the v1→v2 migration must strip the vocabBox key, or old localStorage re-merges it",
    );
  });
});

describe("A12 · still-consumed neighbours survive", () => {
  it("keeps vocabCards (learning-path lesson quiz uses it)", () => {
    assert.match(content, /export const vocabCards/);
  });

  it("keeps advanceBox (reviewMistake uses it) and boxInterval (dashboard/notebook use it)", () => {
    const rules = read("../src/lib/student/student-rules.js");
    assert.match(rules, /export function advanceBox/);
    assert.match(rules, /export function boxInterval/);
  });

  it("keeps mistakeSeed (the notebook mistakes state is seeded from it)", () => {
    assert.match(content, /export const mistakeSeed/);
    assert.match(store, /mistakeSeed/);
  });
});
