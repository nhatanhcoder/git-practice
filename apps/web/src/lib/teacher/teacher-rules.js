/**
 * Pure rules shared by the Teacher screens.
 *
 * Plain `.js` with JSDoc types on purpose, following `src/lib/user-status.js`: the tests in
 * `apps/web/scripts/*.test.mjs` import this module directly. An earlier version was `.ts` and the
 * test hand-stripped the type annotations with regexes — that broke the moment a signature used
 * `string[]`, which is exactly the kind of silent test rot this avoids.
 *
 * These carry the risk in the Teacher bug-fix work:
 *  - session submit decides what lands in `actualEnd`, which prices per_hour payroll
 *    (INV-PAYROLL-06 forbids using scheduled times for this);
 *  - grading decides the final score and whether the AI's original suggestion survives;
 *  - assignment decides whether a mock test may be saved without a time limit, and which
 *    questions an assignment is allowed to hold.
 */

/**
 * ENTITY_CLASS_SESSION / INV-SESSION-13. `null` means OK to submit.
 * @param {{ topic: string, actualStart: string | null, actualEnd: string }} input
 * @returns {string | null}
 */
export function sessionSubmitError(input) {
  if (!input.topic.trim()) return "Nhập chủ đề bài dạy.";
  if (!input.actualStart) return "Chưa có giờ bắt đầu thực tế — bấm “Bắt đầu” trước khi gửi duyệt.";
  if (!input.actualEnd) return "Nhập giờ kết thúc thực tế.";
  // INV-SESSION-13: when both are non-NULL, actualEnd must be strictly after actualStart.
  if (input.actualEnd <= input.actualStart)
    return "Giờ kết thúc phải sau giờ bắt đầu (" + input.actualStart + ").";
  return null;
}

/**
 * A score is only usable when it is a real number inside [0, maxScore].
 * @param {number | null | undefined} value
 * @param {number} maxScore
 * @returns {boolean}
 */
export function isValidScore(value, maxScore) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maxScore;
}

/**
 * Raw input string → stored score. Empty stays null; out-of-range clamps; NaN never enters state.
 * @param {string} raw
 * @param {number} maxScore
 * @returns {number | null}
 */
export function clampScore(raw, maxScore) {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(maxScore, Math.max(0, n));
}

/**
 * What gets written when the teacher finishes grading one question.
 *
 * The bug this replaces wrote `aiSuggestion: { score: finalScore, reasoning: teacherFeedback }`,
 * i.e. it overwrote the AI's suggestion with the teacher's edit — destroying the only reason to
 * store both.
 *
 * @param {{ draftScore: number | null | undefined, draftFeedback: string,
 *           aiOriginal: { score: number, reasoning: string } | null,
 *           storedScore: number | null, maxScore: number }} args
 * @returns {{ score: number, feedback: string | null,
 *             aiSuggestion: { score: number, reasoning: string } | null }}
 */
export function finalizeGradedQuestion(args) {
  const score = isValidScore(args.draftScore, args.maxScore)
    ? /** @type {number} */ (args.draftScore)
    : (args.storedScore ?? 0);
  return {
    score,
    feedback: args.draftFeedback || null,
    // Independent of whatever the teacher typed.
    aiSuggestion: args.aiOriginal ?? null,
  };
}

/**
 * ENTITY_ASSIGNMENT: `timeLimitMinutes` is required, an integer 5–180, only for `mock_test`.
 * @param {string} type
 * @param {string} raw
 * @returns {boolean}
 */
export function assignmentTimeLimitValid(type, raw) {
  if (type !== "mock_test") return true;
  const n = Number(raw);
  return raw.trim() !== "" && Number.isInteger(n) && n >= 5 && n <= 180;
}

/**
 * The subset of `ids` whose questions belong to `hskLevel`.
 *
 * The single place that decides which questions an assignment may hold: used when opening one for
 * edit, when the class changes, when counting the selection, and at the write — so the checkbox
 * list, the "n đã chọn" count and the saved record cannot disagree. Before this existed, an
 * assignment could report "1 đã chọn" with no checkbox ticked and still save a hidden id.
 *
 * @param {string[]} ids
 * @param {number | null} hskLevel
 * @param {{ id: string, hskLevel: number }[]} bank
 * @returns {string[]}
 */
export function questionIdsForClass(ids, hskLevel, bank) {
  if (hskLevel === null || hskLevel === undefined) return [];
  return ids.filter((id) => bank.find((q) => q.id === id)?.hskLevel === hskLevel);
}
