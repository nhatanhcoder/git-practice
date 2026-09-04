import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  actionForAssignment,
  gradedMaxScore,
  gradedScore,
  isAnswered,
  isProvisional,
  questionMark,
  remainingSeconds,
} from "../src/lib/student/lms-rules.js";

describe("actionForAssignment", () => {
  test("offers Start only before an attempt exists", () => {
    assert.equal(actionForAssignment("not_started"), "start");
  });

  test("offers Resume while the attempt is open", () => {
    assert.equal(actionForAssignment("in_progress"), "resume");
  });

  test("offers nothing once submitted but not yet graded", () => {
    // The important one. A result link here would promise a score that does not exist:
    // Writing waits for the teacher while MCQ grades itself (S-ASGN-7).
    assert.equal(actionForAssignment("submitted"), "none");
  });

  test("offers the result once graded", () => {
    assert.equal(actionForAssignment("graded"), "result");
  });
});

describe("partial grading", () => {
  const halfGraded = {
    questions: [
      { questionId: "q-1", score: 5 },
      { questionId: "q-2", score: 5 },
      { questionId: "q-3", score: null },
      { questionId: "q-4", score: null },
    ],
  };
  const fullyGraded = {
    questions: [
      { questionId: "q-1", score: 5 },
      { questionId: "q-2", score: 3 },
    ],
  };

  test("flags a half-graded attempt as provisional", () => {
    assert.equal(isProvisional(halfGraded), true);
  });

  test("does not flag a fully graded attempt", () => {
    assert.equal(isProvisional(fullyGraded), false);
  });

  test("counts only the graded questions toward the score", () => {
    assert.equal(gradedScore(halfGraded), 10);
  });

  test("scales the denominator to the graded questions", () => {
    // 10/10 of what has been marked, not 10/20 of the whole paper — showing the latter
    // reads as half the answers being wrong when they simply are not marked yet.
    const questions = [
      { id: "q-1", maxScore: 5 },
      { id: "q-2", maxScore: 5 },
      { id: "q-3", maxScore: 5 },
      { id: "q-4", maxScore: 5 },
    ];
    assert.equal(gradedMaxScore(halfGraded, questions), 10);
  });

  test("treats an ungraded question as absent, not as zero", () => {
    const allUngraded = { questions: [{ questionId: "q-1", score: null }] };
    assert.equal(gradedScore(allUngraded), 0);
    assert.equal(gradedMaxScore(allUngraded, [{ id: "q-1", maxScore: 5 }]), 0);
  });
});

describe("remainingSeconds", () => {
  const started = "2026-09-04T10:00:00.000Z";
  const startedMs = Date.parse(started);

  test("returns null for untimed homework", () => {
    assert.equal(remainingSeconds(started, null, startedMs), null);
  });

  test("counts down from the limit", () => {
    assert.equal(remainingSeconds(started, 45, startedMs), 45 * 60);
    assert.equal(remainingSeconds(started, 45, startedMs + 60_000), 44 * 60);
  });

  test("floors at zero instead of going negative", () => {
    assert.equal(remainingSeconds(started, 45, startedMs + 60 * 60_000), 0);
  });

  test("derives from startedAt, so a reload cannot buy time", () => {
    const afterReload = remainingSeconds(started, 45, startedMs + 10 * 60_000);
    assert.equal(afterReload, 35 * 60);
  });

  test("returns null rather than NaN on an unparseable timestamp", () => {
    assert.equal(remainingSeconds("not-a-date", 45, startedMs), null);
  });
});

describe("navigator marks", () => {
  test("flagged wins over answered", () => {
    // The flag exists to mark something answered but worth revisiting; letting
    // "answered" hide it would defeat the feature.
    assert.equal(questionMark({ answered: true, flagged: true }), "flagged");
  });

  test("answered when not flagged", () => {
    assert.equal(questionMark({ answered: true, flagged: false }), "answered");
  });

  test("unanswered by default", () => {
    assert.equal(questionMark({ answered: false, flagged: false }), "unanswered");
  });
});

describe("isAnswered", () => {
  test("rejects an empty or whitespace-only writing answer", () => {
    assert.equal(isAnswered(""), false);
    assert.equal(isAnswered("   "), false);
    assert.equal(isAnswered("\n\t"), false);
  });

  test("accepts real text and a chosen option id", () => {
    assert.equal(isAnswered("我去商场"), true);
    assert.equal(isAnswered("o-b"), true);
  });

  test("rejects null and undefined", () => {
    assert.equal(isAnswered(null), false);
    assert.equal(isAnswered(undefined), false);
  });
});
