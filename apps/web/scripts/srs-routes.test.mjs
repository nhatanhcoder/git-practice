import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MISTAKES_REVIEW_ROUTE,
  MISTAKES_ROUTE,
  SRS_ROUTE,
  isMistakeDemoEnabled,
} from "../src/lib/student/srs-routes.ts";

/**
 * A05 regression tests. The defect this task fixed was a link literal naming one screen and
 * opening another, so the tests check the routes AND the files that sit on them — a constant
 * that agrees with itself would have passed before the fix too.
 */

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("A05 · canonical SRS route", () => {
  it("puts the vocabulary SRS on /student/flashcards", () => {
    assert.equal(SRS_ROUTE, "/student/flashcards");
  });

  it("keeps the mistake notebook on its own route", () => {
    assert.notEqual(MISTAKES_ROUTE, SRS_ROUTE, "the notebook is not the flashcard SRS");
    assert.equal(MISTAKES_ROUTE, "/student/mistakes");
    assert.equal(MISTAKES_REVIEW_ROUTE, "/student/mistakes/review");
  });
});

describe("A05 · the real screen is the one on the canonical route", () => {
  const srsPage = read("../src/app/student/(app)/flashcards/page.tsx");
  const notebookPage = read("../src/app/student/(app)/mistakes/page.tsx");

  it("serves the API-backed screen at /student/flashcards", () => {
    assert.match(
      srsPage,
      /flashcards-service/,
      "the canonical route must render the screen that calls the real endpoints",
    );
    assert.match(srsPage, /reviewFlashcard/);
  });

  it("no longer serves the local Leitner mock there", () => {
    assert.doesNotMatch(
      srsPage,
      /rateVocab|vocabBox/,
      "the mock scheduler must not be back on the canonical route",
    );
  });

  it("does not render a card queue on the mistake notebook", () => {
    assert.doesNotMatch(
      notebookPage,
      /flashcards-service|reviewFlashcard/,
      "the notebook must not be re-badged flashcards; its endpoints are Sprint 4",
    );
  });
});

describe("S-MSTK · legacy demo helper stays gated; live review is available", () => {
  it("is enabled in development", () => {
    assert.equal(isMistakeDemoEnabled("development"), true);
    assert.equal(isMistakeDemoEnabled("test"), true);
  });

  it("is refused in production", () => {
    assert.equal(isMistakeDemoEnabled("production"), false);
  });

  it("serves real practice on the production deep link", () => {
    const review = read("../src/app/student/(app)/mistakes/review/page.tsx");
    assert.doesNotMatch(review, /isMistakeDemoEnabled|MOCK\(|useStudentStore|awardXp/);
    assert.match(review, /fetchMistakeSession/);
    assert.match(review, /reviewMistake/);
  });
});
