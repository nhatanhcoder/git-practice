/**
 * Pure rules shared by the Teacher screens — extracted so they can be tested without a browser.
 *
 * These three carry the risk in the 2026-09-02 bug fixes:
 *  - session submit decides what lands in `actualEnd`, which prices per_hour payroll
 *    (INV-PAYROLL-06 forbids using scheduled times for this);
 *  - grading decides the final score and whether the AI's original suggestion survives;
 *  - assignment decides whether a mock test may be saved without a time limit.
 */

/** ENTITY_CLASS_SESSION / INV-SESSION-13. `null` = OK to submit. */
export function sessionSubmitError(input: {
  topic: string;
  actualStart: string | null;
  actualEnd: string;
}): string | null {
  if (!input.topic.trim()) return "Nhập chủ đề bài dạy.";
  if (!input.actualStart) return "Chưa có giờ bắt đầu thực tế — bấm “Bắt đầu” trước khi gửi duyệt.";
  if (!input.actualEnd) return "Nhập giờ kết thúc thực tế.";
  // INV-SESSION-13: when both are non-NULL, actualEnd must be strictly after actualStart.
  if (input.actualEnd <= input.actualStart)
    return "Giờ kết thúc phải sau giờ bắt đầu (" + input.actualStart + ").";
  return null;
}

/** A score is only usable when it is a real number inside [0, maxScore]. */
export function isValidScore(value: number | null | undefined, maxScore: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maxScore;
}

/** Raw input string → stored score. Empty stays null; out-of-range clamps; NaN never enters state. */
export function clampScore(raw: string, maxScore: number): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.min(maxScore, Math.max(0, n));
}

/**
 * What gets written when the teacher finishes grading one question.
 *
 * The bug this replaces wrote `aiSuggestion: { score: finalScore, reasoning: teacherFeedback }`,
 * i.e. it overwrote the AI's suggestion with the teacher's edit — destroying the only reason
 * to store both.
 */
export function finalizeGradedQuestion(args: {
  draftScore: number | null | undefined;
  draftFeedback: string;
  aiOriginal: { score: number; reasoning: string } | null;
  storedScore: number | null;
  maxScore: number;
}): { score: number; feedback: string | null; aiSuggestion: { score: number; reasoning: string } | null } {
  const score = isValidScore(args.draftScore, args.maxScore) ? args.draftScore : (args.storedScore ?? 0);
  return {
    score,
    feedback: args.draftFeedback || null,
    // Independent of whatever the teacher typed.
    aiSuggestion: args.aiOriginal ?? null,
  };
}

/** ENTITY_ASSIGNMENT: timeLimitMinutes is required, and an integer 5–180, only for mock_test. */
export function assignmentTimeLimitValid(type: string, raw: string): boolean {
  if (type !== "mock_test") return true;
  const n = Number(raw);
  return raw.trim() !== "" && Number.isInteger(n) && n >= 5 && n <= 180;
}
