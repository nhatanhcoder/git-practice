import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * Word-bank FE service — structural checks mirroring 02-word-bank.md's contract, in the
 * same spirit as srs-routes.test.mjs: the file asserts the *shape* the pages rely on
 * (paths, DTO guards, upsert semantics) without standing up a server.
 *
 * Live behavior (save → list → delete → review over the real API) is covered by the
 * backend e2e suite; this file locks the FE's own wiring so a renamed path or a dropped
 * meta read fails here instead of in a browser.
 */

const file = readFileSync(
  new URL("../src/lib/student/word-bank-service.ts", import.meta.url),
  "utf8",
);

test("word-bank service: paths match the implemented module", () => {
  assert.ok(file.includes('"/student/word-bank"'));
  assert.ok(file.includes("`/student/word-bank?page=${page}&limit=${limit}`"));
  assert.ok(file.includes("`/student/word-bank/${id}`"));
  assert.ok(file.includes('"/student/word-bank/review"'));
});

test("word-bank service: save reads the upsert envelope's row, not the top level", () => {
  // The API returns { data: { row, created } } — reading res.data.row is the contract;
  // reading res.data directly would put an { row, created } object into SavedWord state.
  assert.ok(file.includes("res.data.row"));
  assert.ok(file.includes("created: boolean"));
});

test("word-bank service: the bank bookmark never claims to schedule SRS", () => {
  // S-SRS-6/7 boundary: the module owns no scheduling. The service must not import or
  // call any review/scheduling function of its own — review goes through
  // flashcards-service in the component.
  assert.ok(!file.includes("reviewFlashcard"));
  assert.ok(!file.includes("sm2"));
});

test("word-bank service: sourceType is the four entity values only", () => {
  assert.ok(file.includes('"lesson" | "passage" | "flashcard_browser" | "other"'));
});

test("flashcards page: the save button waits for the server before turning saved", () => {
  const page = readFileSync(
    new URL("../src/app/student/(app)/flashcards/page.tsx", import.meta.url),
    "utf8",
  );
  // The saved-state set is only updated past the awaited saveWord call, never before.
  const saveIdx = page.indexOf("await saveWord(");
  const setIdx = page.indexOf("setSavedHanzi((prev) => new Set(prev).add(card.hanzi))");
  assert.ok(saveIdx > -1 && setIdx > saveIdx, "setSavedHanzi.add must follow the awaited save");
  // The bank tab exists and shows a honest empty state.
  assert.ok(page.includes('"bank"'), "the bank tab id exists");
  assert.ok(page.includes("Kho từ còn trống"));
  // The unreviewable banked word (id: null) must not offer rating buttons.
  assert.ok(page.includes("card.id === null"));
});
