import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRetryReview,
  canSubmitRating,
  formatStat,
  isStaleResponse,
  resolveListOutcome,
} from "../src/lib/student/srs-session.ts";

/**
 * A04 regression tests. Each one names the hazard it exists to catch, because a test called
 * "returns true" tells the next reader nothing about why deleting it would be expensive.
 */

describe("A04 · out-of-order responses", () => {
  it("drops a response whose request has been superseded", () => {
    // HSK 9 requested (seq 1), then HSK 1 requested (seq 2). HSK 9's slow response arrives
    // last and must not repaint the list.
    assert.equal(isStaleResponse(1, 2), true);
  });

  it("applies the response that belongs to the newest request", () => {
    assert.equal(isStaleResponse(2, 2), false);
  });

  it("treats a mode switch the same way as a level switch", () => {
    // browse (seq 3) → due (seq 4): the browse payload must not be merged into the due queue.
    assert.equal(isStaleResponse(3, 4), true);
  });
});

describe("A04 · one action, one POST", () => {
  it("allows a rating on a flipped card that is not already submitting", () => {
    assert.equal(canSubmitRating({ hasCard: true, revealed: true, submitting: false }), true);
  });

  it("refuses a rating before the card is flipped", () => {
    assert.equal(canSubmitRating({ hasCard: true, revealed: false, submitting: false }), false);
  });

  it("refuses a second rating while one is in flight", () => {
    assert.equal(canSubmitRating({ hasCard: true, revealed: true, submitting: true }), false);
  });

  it("refuses a rating when there is no card", () => {
    assert.equal(canSubmitRating({ hasCard: false, revealed: true, submitting: false }), false);
  });
});

describe("A04 · finishing a session is not an empty catalog", () => {
  it("reports session-complete after the last card was rated", () => {
    const outcome = resolveListOutcome({
      loading: false,
      error: false,
      cardCount: 0,
      reviewedInSession: 3,
      mode: "browse",
    });
    assert.equal(outcome, "session-complete");
  });

  it("reports catalog-empty only when nothing was reviewed", () => {
    const outcome = resolveListOutcome({
      loading: false,
      error: false,
      cardCount: 0,
      reviewedInSession: 0,
      mode: "browse",
    });
    assert.equal(outcome, "catalog-empty");
  });

  it("distinguishes an empty due queue from a missing catalog", () => {
    const outcome = resolveListOutcome({
      loading: false,
      error: false,
      cardCount: 0,
      reviewedInSession: 0,
      mode: "due",
    });
    assert.equal(outcome, "due-empty");
  });

  it("keeps error distinct from empty", () => {
    const outcome = resolveListOutcome({
      loading: false,
      error: true,
      cardCount: 0,
      reviewedInSession: 0,
      mode: "browse",
    });
    assert.equal(outcome, "error", "a failed load must not render as an empty catalog");
  });

  it("keeps loading distinct from empty", () => {
    const outcome = resolveListOutcome({
      loading: true,
      error: false,
      cardCount: 0,
      reviewedInSession: 0,
      mode: "browse",
    });
    assert.equal(outcome, "loading");
  });

  it("shows the list whenever cards are present, whatever else is true", () => {
    const outcome = resolveListOutcome({
      loading: false,
      error: false,
      cardCount: 2,
      reviewedInSession: 5,
      mode: "browse",
    });
    assert.equal(outcome, "has-cards");
  });
});

describe("A04 · missing stats never become invented numbers", () => {
  it("renders null as an em dash, not 0", () => {
    assert.equal(formatStat(null), "—", "null streak must not display as 0");
  });

  it("renders undefined as an em dash", () => {
    assert.equal(formatStat(undefined), "—");
  });

  it("renders a real zero as 0", () => {
    assert.equal(formatStat(0), "0", "a genuine zero is a fact and must be shown");
  });

  it("keeps the suffix on a real value", () => {
    assert.equal(formatStat(67, "%"), "67%");
  });

  it("does not attach a suffix to a missing value", () => {
    assert.equal(formatStat(null, "%"), "—", "null% would read as a real measurement");
  });
});

describe("A04 · replay safety on a failed review", () => {
  it("allows a retry when the request never reached the server", () => {
    assert.equal(canRetryReview({ networkError: true }), true);
  });

  it("refuses an automatic retry when the server answered", () => {
    // 500 means the request was processed and the outcome is known to the server. Replaying it
    // could advance SM-2 twice for one answer, because the review endpoint carries no
    // idempotency key in the approved contract.
    assert.equal(canRetryReview({ networkError: true, status: 500 }), false);
    assert.equal(canRetryReview({ networkError: false, status: 409 }), false);
  });
});
