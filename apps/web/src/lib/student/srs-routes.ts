/**
 * Canonical learner routes for the SRS slice (task A05).
 *
 * A00 settled two facts that the code had crossed over:
 *
 *  1. **`/student/flashcards` is the vocabulary SRS.** The API-backed screen had been sitting at
 *     `/student/mistakes` while `/student/flashcards` served a local Leitner mock, so the menu
 *     item named "Flashcard" opened the fake one and the real one was reachable only by a link
 *     nobody would guess.
 *  2. **The mistake notebook is a different feature**, collecting questions answered wrongly in
 *     assignments and mock exams. Its endpoints belong to Sprint 4 (Assignments & Attempts) and
 *     do not exist yet. It is not "flashcards with another name", and merging the two would
 *     invent a feature no contract describes.
 *
 * These are exported as constants rather than typed at each call site because the defect A05
 * fixes *was* a link literal drifting away from the screen it named.
 */

export const SRS_ROUTE = "/student/flashcards";
export const MISTAKES_ROUTE = "/student/mistakes";
export const MISTAKES_REVIEW_ROUTE = "/student/mistakes/review";

/**
 * Whether the mistake-notebook demo may run.
 *
 * Development only. The notebook's queue, its five boxes and its XP awards all come from
 * `localStorage`; nothing is submitted anywhere. Shipping that to a signed-in learner would
 * present invented review history as their own — the defect class of `WEB-011`/`WEB-015` — and
 * a deep link straight to `/student/mistakes/review` must not slip past the check either, which
 * is why both routes ask this and not just the entry page.
 */
export function isMistakeDemoEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}
