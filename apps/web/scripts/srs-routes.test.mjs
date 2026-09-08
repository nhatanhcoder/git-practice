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

describe("A05 · the demo notebook session is development only", () => {
  it("is enabled in development", () => {
    assert.equal(isMistakeDemoEnabled("development"), true);
    assert.equal(isMistakeDemoEnabled("test"), true);
  });

  it("is refused in production", () => {
    assert.equal(isMistakeDemoEnabled("production"), false);
  });

  it("guards the deep link, not just the entry page", () => {
    const review = read("../src/app/student/(app)/mistakes/review/page.tsx");
    assert.match(
      review,
      /isMistakeDemoEnabled/,
      "a deep link straight to the review session must be checked too",
    );
  });

  it("checks after the hooks, so the hook order is never conditional", () => {
    const review = read("../src/app/student/(app)/mistakes/review/page.tsx");
    const gate = review.indexOf("isMistakeDemoEnabled(process.env.NODE_ENV)");
    const lastHook = Math.max(review.lastIndexOf("useState("), review.lastIndexOf("useMemo("));
    assert.ok(gate > lastHook, "the production gate must sit below every hook call");
  });
});
