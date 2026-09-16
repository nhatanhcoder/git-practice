/**
 * Placement pure rules (04-placement.md §4). No I/O here — the service owns Mongo
 * and Postgres; these functions own the decisions so the invariants are unit-testable.
 *
 * The level rule is the prototype's `placementLevel` (lib/student/student-rules.js)
 * ported server-side: ADR-005 forbids the client from being the grader, so the same
 * arithmetic now runs where the answers are graded.
 */

/** Highest band a paper can reach. Prototype parity; a content gap, not a range
 *  decision — DOC-004 keeps 1–9 everywhere else. */
export const PLACEMENT_MAX_BAND = 6;

/** Questions per band. "Câu hỏi nhẹ" per Task C — a paper tops out at 12. */
export const QUESTIONS_PER_BAND = 2;

export type QuestionContent = {
  prompt?: string;
  audioUrl?: string;
  transcript?: string;
  passage?: string;
  rubric?: string;
} | null;

export interface PoolQuestion {
  id: string;
  hskLevel: number;
  skill: string;
  subType: string;
  content: QuestionContent;
  options: { id: string; text: string }[];
  correctAnswer: string;
  createdAt: Date;
}

export interface PaperQuestion {
  questionId: string;
  hskLevel: number;
  skill: string;
  /** Same shape the attempt take payload carries: audioUrl/transcript/passage in,
   *  correctAnswer/explanation never. Single-answer MCQs are listening sub-types,
   *  so audioUrl is the norm here — the FE renders a play button for it. */
  content: QuestionContent;
  options: { id: string; text: string }[];
}

/**
 * INV-PLC-01 — eligibility: a placement question must be a single-answer MCQ with
 * at least two options. Writing (null answer) and multi-answer/ordering questions
 * (array answers) never enter a paper; nothing is fabricated to fill the gaps.
 */
export function isEligible(q: {
  options?: { id: string }[] | null;
  correctAnswer: unknown;
}): q is { options: { id: string; text: string }[]; correctAnswer: string } {
  return (
    Array.isArray(q.options) &&
    q.options.length >= 2 &&
    typeof q.correctAnswer === 'string' &&
    q.correctAnswer.length > 0 &&
    q.options.some((o) => o.id === q.correctAnswer)
  );
}

/**
 * INV-PLC-02 — contiguous bands from level 1, `QUESTIONS_PER_BAND` each, stopping at
 * the first band with no eligible question. The pool must be pre-sorted deterministically
 * (INV-PLC-03: createdAt asc, then _id) — this function only cuts, it never re-orders
 * and never tops up from a higher band.
 */
export function buildPaper(pool: PoolQuestion[]): {
  paper: PaperQuestion[];
  answers: Map<string, string>;
} {
  const byBand = new Map<number, PoolQuestion[]>();
  for (const q of pool) {
    if (q.hskLevel < 1 || q.hskLevel > PLACEMENT_MAX_BAND) continue;
    const list = byBand.get(q.hskLevel) ?? [];
    list.push(q);
    byBand.set(q.hskLevel, list);
  }

  const paper: PaperQuestion[] = [];
  const answers = new Map<string, string>();
  for (let band = 1; band <= PLACEMENT_MAX_BAND; band++) {
    const list = byBand.get(band);
    if (!list || list.length === 0) break;
    for (const q of list.slice(0, QUESTIONS_PER_BAND)) {
      paper.push({
        questionId: q.id,
        hskLevel: q.hskLevel,
        skill: q.skill,
        content: q.content,
        options: q.options,
      });
      answers.set(q.id, q.correctAnswer);
    }
  }
  return { paper, answers };
}

/**
 * INV-PLC-04 — exact set-match of the submitted option ids against the normalized
 * correct answer. Single-answer papers make this a one-element comparison, but the
 * set form keeps the rule identical to INV-ATLP-06's grading.
 */
export function isCorrect(selected: unknown, correctAnswer: string): boolean {
  if (!Array.isArray(selected)) return false;
  return (
    selected.length === 1 &&
    selected[0] === correctAnswer
  );
}

/**
 * INV-PLC-05 — the level rule: the highest band B such that every band 1..B has at
 * least one correct answer, floored at 1 and capped at the paper's highest band.
 * A lucky guess high up cannot skip bands; a wrong band 1 keeps the learner at 1.
 */
export function placementLevel(correctByBand: Map<number, number>, highestBand: number): number {
  let level = 1;
  while (level <= highestBand && (correctByBand.get(level) ?? 0) > 0) level++;
  return Math.max(1, level - 1);
}
