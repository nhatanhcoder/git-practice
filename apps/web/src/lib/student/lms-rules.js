/**
 * Pure rules for the Student LMS half. No React, no fixtures, no formatting.
 *
 * JavaScript with JSDoc rather than TypeScript, following `lib/user-status.js` and
 * `lib/teacher/teacher-rules.js`: the Node test runner imports this file directly.
 * The Teacher suite used to hand-strip TypeScript with regexes and broke the first
 * time a signature used a generic — see `WEB-006`.
 *
 * @typedef {"not_started" | "in_progress" | "submitted" | "graded"} AssignmentStatus
 * @typedef {"start" | "resume" | "result" | "none"} AssignmentAction
 */

/**
 * Which single action a row offers, given the learner's status.
 *
 * `submitted` deliberately maps to `none`. Offering "Xem kết quả" there would promise a
 * score that does not exist: MCQ grades itself but Writing waits for the teacher, so a
 * submitted attempt routinely has no mark yet (S-ASGN-7).
 *
 * @param {AssignmentStatus} status
 * @returns {AssignmentAction}
 */
export function actionForAssignment(status) {
  switch (status) {
    case "not_started":
      return "start";
    case "in_progress":
      return "resume";
    case "graded":
      return "result";
    case "submitted":
    default:
      return "none";
  }
}

/**
 * True when at least one question is still ungraded, which makes the total provisional.
 *
 * @param {{ questions: { score: number | null }[] }} result
 * @returns {boolean}
 */
export function isProvisional(result) {
  return result.questions.some((q) => q.score === null);
}

/**
 * Points actually awarded so far. Ungraded questions contribute nothing rather than
 * zero — the difference matters, because zero reads as "you got it wrong".
 *
 * @param {{ questions: { score: number | null }[] }} result
 * @returns {number}
 */
export function gradedScore(result) {
  return result.questions.reduce((sum, q) => sum + (q.score ?? 0), 0);
}

/**
 * The maximum reachable from the questions graded so far. Pairing `gradedScore` with the
 * assignment's full `maxScore` while half the paper is unmarked understates the result.
 *
 * @param {{ questions: { score: number | null }[] }} result
 * @param {{ id: string, maxScore: number }[]} questions
 * @returns {number}
 */
export function gradedMaxScore(result, questions) {
  return result.questions
    .filter((q) => q.score !== null)
    .reduce((sum, q) => {
      const question = questions.find((x) => x.id === q.questionId);
      return sum + (question ? question.maxScore : 0);
    }, 0);
}

/**
 * Seconds left on a timed attempt, floored at 0.
 *
 * Derived from `startedAt` and the limit rather than counted down in the client, so a
 * reload cannot buy extra time. This is display only: the server decides expiry, because
 * a client clock is trivially editable and a timer the UI alone enforces is not an exam
 * constraint (S-ASGN-4).
 *
 * @param {string} startedAtIso
 * @param {number | null} timeLimitMinutes null for untimed homework
 * @param {number} nowMs
 * @returns {number | null} null when the attempt is untimed
 */
export function remainingSeconds(startedAtIso, timeLimitMinutes, nowMs) {
  if (timeLimitMinutes === null || timeLimitMinutes === undefined) return null;
  const started = Date.parse(startedAtIso);
  if (Number.isNaN(started)) return null;
  const endsAt = started + timeLimitMinutes * 60_000;
  return Math.max(0, Math.round((endsAt - nowMs) / 1000));
}

/**
 * How a question appears in the navigator (S-ASGN-5).
 *
 * Flagged wins over answered: the flag exists precisely to mark something the learner
 * answered but wants to revisit, so letting "answered" hide it would defeat it.
 *
 * @param {{ answered: boolean, flagged: boolean }} state
 * @returns {"flagged" | "answered" | "unanswered"}
 */
export function questionMark(state) {
  if (state.flagged) return "flagged";
  return state.answered ? "answered" : "unanswered";
}

/**
 * Whether an answer counts as given. An empty or whitespace-only writing answer is not
 * an answer, and must not colour the navigator chip as done.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isAnswered(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
