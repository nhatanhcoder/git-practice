/**
 * Pure rules for the student attempt-take session (Sprint 4, S-ASGN-2..6).
 *
 * Mirrors `srs-session.ts` (A04) on purpose: sequence-numbered requests so a slow
 * autosave cannot repaint newer answers, a ref-lock (not state) around submit so two
 * clicks in one tick fire one POST, no automatic replay of a failed submit (the
 * endpoint carries no idempotency key — replaying could double-grade), and stats
 * go through `formatStat` so a missing total reads "—", never 0.
 *
 * Nothing here talks to the network. The component holds the refs and the fetch
 * calls; every decision about what the UI may show lives here and is unit-tested
 * in `apps/web/scripts/student-attempt.test.mjs`.
 */

export type TakeOutcome =
  | "loading"
  | "invalid_id"
  | "not_found"
  | "forbidden"
  | "error"
  | "closed"
  | "ready";

export interface AttemptApiError {
  statusCode?: number;
  code?: string;
}

function asApiError(error: unknown): AttemptApiError | null {
  if (typeof error === "object" && error !== null) return error as AttemptApiError;
  return null;
}

/**
 * Which screen the take route shows. `closed` means the attempt exists but is no
 * longer answerable (submitted/graded) — the page links to the result instead of
 * offering inputs. `status` comes from the server payload, never local state.
 */
export function resolveTakeOutcome(input: {
  loading: boolean;
  error: unknown;
  validId: boolean;
  status: string | null;
}): TakeOutcome {
  if (!input.validId) return "invalid_id";
  if (input.loading) return "loading";
  if (input.error) {
    const err = asApiError(input.error);
    if (err) {
      if (err.statusCode === 400 || err.code === "VALIDATION_ERROR") return "invalid_id";
      if (err.statusCode === 404) return "not_found";
      if (err.statusCode === 403) return "forbidden";
    }
    return "error";
  }
  if (input.status === null) return "error";
  if (input.status !== "in_progress") return "closed";
  return "ready";
}

/**
 * Submit guard — the full condition in one place. React state updates are
 * asynchronous, so the component pairs this with a ref lock: two clicks in the
 * same tick both read `submitting === false` and both would fire.
 */
export function canSubmitAttempt(input: { hasAttempt: boolean; submitting: boolean }): boolean {
  return input.hasAttempt && !input.submitting;
}

/**
 * A failed submit is always followed by a state refetch, never a blind replay.
 * After an ambiguous failure the attempt may already be `submitted` — replaying
 * the POST is safe server-side (second submit is 409, never a double grade),
 * but the UI must show the truth, so retry reloads first.
 */
export function shouldRefetchAfterSubmitFailure(): boolean {
  return true;
}

/**
 * Milliseconds left on the server clock. Display only: the server decides
 * expiry (a client clock is editable), and a reload recomputes from
 * `startedAt`, so it can never buy extra time. `null` = no time limit.
 */
export function remainingMs(
  startedAtISO: string,
  timeLimitMinutes: number | null,
  nowMs: number,
): number | null {
  if (timeLimitMinutes === null || timeLimitMinutes === undefined) return null;
  const deadline = new Date(startedAtISO).getTime() + timeLimitMinutes * 60_000;
  if (Number.isNaN(deadline)) return null;
  return Math.max(0, deadline - nowMs);
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Whether a question counts as answered for the sidebar chips and the submit
 * confirm count. MCQ = at least one option; writing = non-blank text.
 */
export function isQuestionAnswered(input: {
  selectedOptions?: string[];
  writtenAnswer?: string | null;
}): boolean {
  if (input.selectedOptions && input.selectedOptions.length > 0) return true;
  return (input.writtenAnswer ?? "").trim().length > 0;
}

/**
 * Multi-answer rendering per ENTITY_QUESTION.md: these sub-types take an array
 * answer (checkboxes); every other sub-type takes a single option (radio).
 * Kept in exactly one place — the take page and the sidebar both import it.
 */
const MULTI_ANSWER_SUB_TYPES = new Set(["multiple_choice_multi", "sentence_ordering"]);

export function isMultiAnswer(subType: string | null): boolean {
  return subType !== null && MULTI_ANSWER_SUB_TYPES.has(subType);
}
