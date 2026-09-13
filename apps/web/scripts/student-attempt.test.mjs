import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  canSubmitAttempt,
  formatClock,
  isMultiAnswer,
  isQuestionAnswered,
  remainingMs,
  resolveTakeOutcome,
  shouldRefetchAfterSubmitFailure,
} from "../src/lib/student/attempt-session.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("Sprint 4 · take outcome resolution", () => {
  it("resolves invalid_id before anything else", () => {
    assert.equal(
      resolveTakeOutcome({ loading: true, error: new Error("x"), validId: false, status: "in_progress" }),
      "invalid_id",
    );
  });

  it("resolves loading while fetching", () => {
    assert.equal(
      resolveTakeOutcome({ loading: true, error: null, validId: true, status: null }),
      "loading",
    );
  });

  it("maps 404/403 to not_found/forbidden and 400 to invalid_id", () => {
    assert.equal(
      resolveTakeOutcome({ loading: false, error: { statusCode: 404, code: "ATTEMPT_NOT_FOUND" }, validId: true, status: null }),
      "not_found",
    );
    assert.equal(
      resolveTakeOutcome({ loading: false, error: { statusCode: 403, code: "ATTEMPT_NOT_OWNER" }, validId: true, status: null }),
      "forbidden",
    );
    assert.equal(
      resolveTakeOutcome({ loading: false, error: { statusCode: 400, code: "VALIDATION_ERROR" }, validId: true, status: null }),
      "invalid_id",
    );
  });

  it("resolves unknown failures to error", () => {
    assert.equal(
      resolveTakeOutcome({ loading: false, error: new Error("down"), validId: true, status: null }),
      "error",
    );
    assert.equal(
      resolveTakeOutcome({ loading: false, error: null, validId: true, status: null }),
      "error",
    );
  });

  it("closes submitted/graded attempts instead of offering inputs", () => {
    assert.equal(
      resolveTakeOutcome({ loading: false, error: null, validId: true, status: "submitted" }),
      "closed",
    );
    assert.equal(
      resolveTakeOutcome({ loading: false, error: null, validId: true, status: "graded" }),
      "closed",
    );
    assert.equal(
      resolveTakeOutcome({ loading: false, error: null, validId: true, status: "in_progress" }),
      "ready",
    );
  });
});

describe("Sprint 4 · submit guard and retry rule", () => {
  it("requires an attempt and a free submit path", () => {
    assert.equal(canSubmitAttempt({ hasAttempt: true, submitting: false }), true);
    assert.equal(canSubmitAttempt({ hasAttempt: true, submitting: true }), false);
    assert.equal(canSubmitAttempt({ hasAttempt: false, submitting: false }), false);
  });

  it("a failed submit always refetches state instead of replaying blindly", () => {
    assert.equal(shouldRefetchAfterSubmitFailure(), true);
  });
});

describe("Sprint 4 · countdown helpers", () => {
  it("derives remaining time from the server startedAt", () => {
    const startedAt = "2026-09-12T10:00:00.000Z";
    const at = new Date(startedAt).getTime();
    assert.equal(remainingMs(startedAt, 60, at + 30 * 60_000), 30 * 60_000);
    assert.equal(remainingMs(startedAt, 60, at + 61 * 60_000), 0);
    assert.equal(remainingMs(startedAt, null, at), null);
    assert.equal(remainingMs("not-a-date", 60, at), null);
  });

  it("formats the clock as mm:ss", () => {
    assert.equal(formatClock(125), "02:05");
    assert.equal(formatClock(0), "00:00");
    assert.equal(formatClock(3600), "60:00");
  });
});

describe("Sprint 4 · answer bookkeeping", () => {
  it("counts MCQ answers by selection and writing by non-blank text", () => {
    assert.equal(isQuestionAnswered({ selectedOptions: ["a"] }), true);
    assert.equal(isQuestionAnswered({ selectedOptions: [] }), false);
    assert.equal(isQuestionAnswered({ writtenAnswer: "  我家。 " }), true);
    assert.equal(isQuestionAnswered({ writtenAnswer: "   " }), false);
    assert.equal(isQuestionAnswered({}), false);
  });

  it("renders checkboxes only for the entity multi-answer sub-types", () => {
    assert.equal(isMultiAnswer("multiple_choice_multi"), true);
    assert.equal(isMultiAnswer("sentence_ordering"), true);
    assert.equal(isMultiAnswer("multiple_choice_single"), false);
    assert.equal(isMultiAnswer("essay"), false);
    assert.equal(isMultiAnswer(null), false);
  });
});

describe("Sprint 4 · live wiring invariants (static)", () => {
  const takePage = read("../src/app/student/(app)/attempts/[attemptId]/page.tsx");
  const resultPage = read("../src/app/student/(app)/attempts/[attemptId]/result/page.tsx");
  const gradingPage = read("../src/app/teacher/grading/page.tsx");
  const attemptsService = read("../src/lib/student/attempts-service.ts");
  const gradingService = read("../src/lib/teacher/teacher-attempts-service.ts");

  it("take page reads the attempt endpoints and keeps no mock data", () => {
    assert.match(takePage, /fetchAttemptState/);
    assert.match(takePage, /submitAttempt/);
    assert.match(takePage, /attempt-session/);
    assert.doesNotMatch(takePage, /lms-data/);
    assert.doesNotMatch(takePage, /MOCK\(/);
    assert.doesNotMatch(takePage, /UnavailableState/);
  });

  it("take page guards submit with a ref lock, not state alone", () => {
    assert.match(takePage, /submitLock\.current/);
    assert.match(takePage, /canSubmitAttempt/);
  });

  it("result page reads the result endpoint and never invents a total", () => {
    assert.match(resultPage, /fetchAttemptResult/);
    assert.match(resultPage, /formatStat\(attempt\.totalScore\)/);
    assert.doesNotMatch(resultPage, /lms-data/);
    assert.doesNotMatch(resultPage, /MOCK\(/);
    assert.doesNotMatch(resultPage, /DemoStateSwitcher/);
  });

  it("grading page reads the teacher endpoints with the AI draft kept apart", () => {
    assert.match(gradingPage, /fetchGradingQueue/);
    assert.match(gradingPage, /gradeAttempt/);
    assert.match(gradingPage, /suggestScores/);
    assert.match(gradingPage, /aiSuggestions/);
    assert.doesNotMatch(gradingPage, /grading-data/);
    assert.doesNotMatch(gradingPage, /mockAiSuggest/);
    assert.doesNotMatch(gradingPage, /MOCK\(/);
    assert.doesNotMatch(gradingPage, /ReviewSwitcher/);
  });

  it("services call the contracted paths", () => {
    assert.match(attemptsService, /\/student\/attempts\/\$\{encodeURIComponent\(attemptId\)\}\/answers/);
    assert.match(attemptsService, /\/submit/);
    assert.match(attemptsService, /\/result/);
    assert.match(gradingService, /\/teacher\/attempts/);
    assert.match(gradingService, /\/grade/);
    assert.match(gradingService, /ai-suggest/);
  });
});
