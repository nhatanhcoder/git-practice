/**
 * Pure rules for the SRS review session (task A04).
 *
 * Kept out of the component so each hazard can be tested directly instead of by trying to
 * reproduce a race in a browser. The component holds the refs and the fetch calls; every
 * decision about *what the UI is allowed to show* is made here.
 *
 * Nothing in this file talks to the network, and none of it changes SM-2, the payloads or the
 * schema — A04 hardens the client around an unchanged backend.
 */

export type SrsMode = "browse" | "due";

/**
 * A response may only be applied if it belongs to the newest request.
 *
 * Without this, switching HSK 9 → HSK 1 while HSK 9 is still in flight leaves whichever
 * response happens to land last on screen. Slow networks make that the common case, not the
 * rare one, and the symptom — "I picked HSK 1 and got HSK 9 words" — looks like a backend bug.
 */
export function isStaleResponse(responseFor: number, latestRequest: number): boolean {
  return responseFor !== latestRequest;
}

/**
 * Guards the rating submit.
 *
 * `submitting` alone is not enough in the component: React state updates are asynchronous, so
 * two clicks in the same tick both read `submitting === false` and both fire a POST. The
 * component pairs this with a ref, and this function states the full condition in one place.
 */
export function canSubmitRating(input: {
  hasCard: boolean;
  revealed: boolean;
  submitting: boolean;
}): boolean {
  return input.hasCard && input.revealed && !input.submitting;
}

export type ListOutcome =
  | "loading"
  | "error"
  | "session-complete"
  | "catalog-empty"
  | "due-empty"
  | "has-cards";

/**
 * Decides which of the mutually exclusive list states to render.
 *
 * The distinction that matters is the last two: an empty list because the person just finished
 * every card is NOT the same as an empty list because no vocabulary has been imported. Before
 * A04 both showed "Chưa có từ vựng HSK n — nguồn từ vựng production chưa được nhập", so
 * finishing a session told the learner the catalog was missing. `reviewedInSession` is what
 * separates them.
 */
export function resolveListOutcome(input: {
  loading: boolean;
  error: boolean;
  cardCount: number;
  reviewedInSession: number;
  mode: SrsMode;
}): ListOutcome {
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.cardCount > 0) return "has-cards";
  if (input.reviewedInSession > 0) return "session-complete";
  return input.mode === "due" ? "due-empty" : "catalog-empty";
}

/**
 * Formats a stat for display.
 *
 * A missing value renders as an em dash, never as 0. "Nothing came back" and "the answer is
 * zero" are different facts, and showing 0 for the first is how a broken stats call turns into
 * a confident-looking wrong number. `streak` is the live example: the API deliberately returns
 * null until the calendar/timezone rule is approved.
 */
export function formatStat(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value}${suffix}`;
}

/**
 * Whether a failed review may be retried by re-sending the same POST.
 *
 * Answer: only when the request never reached the server. A request that failed *in transit*
 * after the server may have processed it must not be replayed, because
 * `POST /student/flashcards/:id/review` carries no idempotency key in the approved contract —
 * replaying it would advance SM-2 twice for one answer.
 *
 * `networkError` means fetch itself rejected (DNS, refused, aborted) with no HTTP response, so
 * nothing was processed. Any HTTP status means the server answered and the outcome is known.
 */
export function canRetryReview(input: { networkError: boolean; status?: number }): boolean {
  return input.networkError && input.status === undefined;
}
