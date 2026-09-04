import { SUB_TYPES_BY_SKILL, type QuestionSkill } from '../mongodb/schemas/question.schema';

/**
 * Pure cross-field rules for a question. No database, no Nest — so the test suite
 * can exercise every branch without a Mongo connection.
 *
 * These are the rules ENTITY_QUESTION.md states but that no per-field validator
 * can enforce, because each one depends on `skill` and `subType` together.
 */

/** Sub-types whose answer is a set, not a single value. */
const MULTI_ANSWER = new Set(['multiple_choice_multi', 'sentence_ordering', 'matching']);

/** Sub-types that present a fixed list of options to choose from. */
const NEEDS_OPTIONS = new Set(['multiple_choice_single', 'multiple_choice_multi', 'matching']);

export type QuestionShape = {
  skill: QuestionSkill;
  subType: string;
  content?: { audioUrl?: string; rubric?: string } | null;
  options?: Array<{ id: string; text: string }> | null;
  correctAnswer?: string | string[] | null;
};

export type RuleViolation = { field: string; message: string };

export function validateQuestion(q: QuestionShape): RuleViolation[] {
  const problems: RuleViolation[] = [];

  // 1. The sub-type has to belong to the skill. "essay" with skill=listening is
  //    accepted by two independent enum checks and is still nonsense.
  if (!SUB_TYPES_BY_SKILL[q.skill]?.includes(q.subType)) {
    problems.push({
      field: 'subType',
      message: `subType "${q.subType}" không thuộc kỹ năng "${q.skill}"`,
    });
    // Everything below reads subType; stop rather than pile on derived noise.
    return problems;
  }

  // 2. Writing has no correct answer at all — it is graded by a teacher against a
  //    rubric. Storing one would give auto-grading something to match against and
  //    silently mark essays.
  if (q.skill === 'writing') {
    if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
      problems.push({
        field: 'correctAnswer',
        message: 'Câu hỏi Viết phải có correctAnswer = null; tiêu chí chấm đặt ở content.rubric',
      });
    }
    if (!q.content?.rubric?.trim()) {
      problems.push({ field: 'content.rubric', message: 'Câu hỏi Viết cần content.rubric' });
    }
    return problems;
  }

  // 3. Everything that is not Writing must be answerable.
  const answer = q.correctAnswer;
  if (answer === null || answer === undefined || (Array.isArray(answer) && answer.length === 0)) {
    problems.push({ field: 'correctAnswer', message: 'Thiếu correctAnswer' });
  }

  const wantsArray = MULTI_ANSWER.has(q.subType);
  if (answer != null) {
    if (wantsArray && !Array.isArray(answer)) {
      problems.push({
        field: 'correctAnswer',
        message: `subType "${q.subType}" cần correctAnswer dạng mảng`,
      });
    }
    if (!wantsArray && Array.isArray(answer)) {
      problems.push({
        field: 'correctAnswer',
        message: `subType "${q.subType}" cần correctAnswer dạng chuỗi đơn`,
      });
    }
  }

  // 4. An option-based question must have options, and the answer must point at
  //    ids that exist. This is the WEB-006 B2 defect made impossible: an answer
  //    that references nothing marks every choice wrong forever.
  if (NEEDS_OPTIONS.has(q.subType)) {
    const options = q.options ?? [];
    if (options.length < 2) {
      problems.push({ field: 'options', message: 'Cần ít nhất 2 lựa chọn' });
    }
    const ids = new Set(options.map((o) => o.id));
    if (ids.size !== options.length) {
      problems.push({ field: 'options', message: 'Id lựa chọn bị trùng' });
    }
    for (const value of answer == null ? [] : Array.isArray(answer) ? answer : [answer]) {
      if (!ids.has(value)) {
        problems.push({
          field: 'correctAnswer',
          message: `correctAnswer "${value}" không khớp id lựa chọn nào`,
        });
      }
    }
  }

  // 5. A listening question without audio is unanswerable. QUESTION_AUDIO_REQUIRED
  //    exists in the registry precisely for this.
  if (q.skill === 'listening' && !q.content?.audioUrl?.trim()) {
    problems.push({ field: 'content.audioUrl', message: 'Câu hỏi Nghe cần content.audioUrl' });
  }

  return problems;
}

/** Groups violations into the `details` shape API_CONVENTIONS.md defines. */
export function toDetails(problems: RuleViolation[]): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const p of problems) (details[p.field] ??= []).push(p.message);
  return details;
}
