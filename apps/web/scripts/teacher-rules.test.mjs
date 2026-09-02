/**
 * Tests for the Teacher rules extracted in the 2026-09-02 bug-fix batch.
 *
 * These cover the two paths the FULL LANE rule in ai/rules/working-rules.md calls out:
 * payroll-relevant arithmetic (what becomes `actualEnd`) and the grading audit trail.
 *
 * The source is TypeScript, so the assertions below re-implement nothing — they load the
 * compiled logic by stripping the type annotations, which is enough for these pure functions.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "../src/lib/teacher/teacher-rules.ts"), "utf8");

// Strip TS-only syntax so the module can be evaluated as plain JS.
const js = src
  .replace(/export function/g, "function")
  .replace(/:\s*value is number/g, "")
  .replace(/\bargs:\s*\{[\s\S]*?\}\)/, "args)")
  .replace(/\binput:\s*\{[\s\S]*?\}\)/, "input)")
  .replace(/\)\s*:\s*\{[\s\S]*?\}\s*\{/, ") {")
  .replace(/:\s*(string|number|boolean)\s*\|\s*null\s*\|\s*undefined/g, "")
  .replace(/:\s*(string|number|boolean)\s*\|\s*null/g, "")
  .replace(/:\s*(string|number|boolean)(?=[,)\s=])/g, "")
  .replace(/\)\s*:\s*(string|number|boolean)\s*\|\s*null\s*\{/g, ") {")
  .replace(/\)\s*:\s*boolean\s*\{/g, ") {");

const mod = new Function(
  js +
    "\nreturn { sessionSubmitError, isValidScore, clampScore, finalizeGradedQuestion, assignmentTimeLimitValid };",
)();

/* ---------------- A1: session submit must never invent actualEnd ---------------- */

test("A1: submit is blocked until a real actualEnd is entered", () => {
  const base = { topic: "HSK 3 — Chương 5", actualStart: "19:05" };
  assert.equal(mod.sessionSubmitError({ ...base, actualEnd: "" }), "Nhập giờ kết thúc thực tế.");
  assert.equal(mod.sessionSubmitError({ ...base, actualEnd: "20:47" }), null);
});

test("A1: actualEnd must be strictly after actualStart (INV-SESSION-13)", () => {
  const base = { topic: "x", actualStart: "19:05" };
  assert.match(mod.sessionSubmitError({ ...base, actualEnd: "18:00" }), /phải sau giờ bắt đầu/);
  assert.match(mod.sessionSubmitError({ ...base, actualEnd: "19:05" }), /phải sau giờ bắt đầu/);
  assert.equal(mod.sessionSubmitError({ ...base, actualEnd: "19:06" }), null);
});

test("A1: a session that was never started cannot be submitted", () => {
  assert.match(
    mod.sessionSubmitError({ topic: "x", actualStart: null, actualEnd: "20:00" }),
    /Chưa có giờ bắt đầu/,
  );
});

test("A1: topic is still required", () => {
  assert.match(
    mod.sessionSubmitError({ topic: "   ", actualStart: "19:00", actualEnd: "20:00" }),
    /chủ đề/i,
  );
});

/* ---------------- A2: score range + AI audit trail ---------------- */

test("A2: scores clamp into [0, maxScore] and empty stays null", () => {
  assert.equal(mod.clampScore("-1", 10), 0);
  assert.equal(mod.clampScore("99", 10), 10);
  assert.equal(mod.clampScore("7", 10), 7);
  assert.equal(mod.clampScore("", 10), null);
  assert.equal(mod.clampScore("abc", 10), null);
});

test("A2: isValidScore rejects null, NaN and out-of-range", () => {
  assert.equal(mod.isValidScore(null, 10), false);
  assert.equal(mod.isValidScore(NaN, 10), false);
  assert.equal(mod.isValidScore(-1, 10), false);
  assert.equal(mod.isValidScore(11, 10), false);
  assert.equal(mod.isValidScore(0, 10), true);
  assert.equal(mod.isValidScore(10, 10), true);
});

test("A2: editing the AI score keeps the AI's original suggestion intact", () => {
  // The exact scenario from the bug report: AI says 7, teacher saves 8.
  const out = mod.finalizeGradedQuestion({
    draftScore: 8,
    draftFeedback: "GIÁO VIÊN SỬA: bài tốt hơn AI đánh giá.",
    aiOriginal: { score: 7, reasoning: "AI: thiếu một nét." },
    storedScore: null,
    maxScore: 10,
  });
  assert.equal(out.score, 8, "final score is the teacher's");
  assert.equal(out.aiSuggestion.score, 7, "AI suggestion must NOT become the teacher's score");
  assert.equal(out.aiSuggestion.reasoning, "AI: thiếu một nét.");
  assert.equal(out.feedback, "GIÁO VIÊN SỬA: bài tốt hơn AI đánh giá.");
});

test("A2: aiSuggestion stays null when AI was never called", () => {
  const out = mod.finalizeGradedQuestion({
    draftScore: 9,
    draftFeedback: "",
    aiOriginal: null,
    storedScore: null,
    maxScore: 10,
  });
  assert.equal(out.aiSuggestion, null);
  assert.equal(out.feedback, null);
});

test("A2: an out-of-range draft falls back to the stored score, not to 0", () => {
  const out = mod.finalizeGradedQuestion({
    draftScore: 999,
    draftFeedback: "",
    aiOriginal: null,
    storedScore: 6,
    maxScore: 10,
  });
  assert.equal(out.score, 6);
});

/* ---------------- B1: mock test needs a time limit ---------------- */

test("B1: mock_test requires an integer time limit in 5–180", () => {
  assert.equal(mod.assignmentTimeLimitValid("mock_test", ""), false);
  assert.equal(mod.assignmentTimeLimitValid("mock_test", "4"), false);
  assert.equal(mod.assignmentTimeLimitValid("mock_test", "181"), false);
  assert.equal(mod.assignmentTimeLimitValid("mock_test", "45.5"), false);
  assert.equal(mod.assignmentTimeLimitValid("mock_test", "45"), true);
});

test("B1: homework never requires a time limit", () => {
  assert.equal(mod.assignmentTimeLimitValid("homework", ""), true);
  assert.equal(mod.assignmentTimeLimitValid("homework", "999"), true);
});
