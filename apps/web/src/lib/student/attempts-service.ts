import { apiRequest } from "../api-client";

/**
 * Student attempt endpoints (03-attempt-lifecycle, S-ASGN-2..S-ASGN-7).
 * Thin wrappers — outcome decisions live in `attempt-session.ts`.
 */

export interface TakeQuestionOption {
  id: string;
  text: string;
}

export interface TakeAnswer {
  questionId: string;
  selectedOptions: string[];
  writtenAnswer: string | null;
  autoScore: number | null;
  teacherScore: number | null;
  aiSuggestedScore: number | null;
  aiFeedback: string | null;
  teacherFeedback: string | null;
  isCorrect: boolean | null;
  savedAt: string | null;
}

export interface TakeQuestion {
  questionId: string;
  skill: string | null;
  subType: string | null;
  hskLevel: number | null;
  content: { prompt?: string; rubric?: string; passage?: string } | null;
  options: TakeQuestionOption[];
  answer: TakeAnswer | null;
  /** Present only on the graded result (INV-ATLP-07). */
  correctAnswer?: string | string[] | null;
}

export interface TakeAttempt {
  id: string;
  assignmentId: string;
  status: "in_progress" | "submitted" | "graded";
  startedAt: string;
  submittedAt: string | null;
  gradedAt: string | null;
  totalScore: number | null;
  maxScore: number | null;
  isOfficialGrade: boolean;
}

export interface TakeAssignment {
  id: string;
  title: string;
  type: "homework" | "mock_test";
  status: string;
  dueDate: string | null;
  timeLimitMinutes: number | null;
}

export interface TakePayload {
  attempt: TakeAttempt;
  assignment: TakeAssignment;
  questions: TakeQuestion[];
  serverNow: string;
  /** Start only: true when re-entering an existing in_progress attempt. */
  resumed?: boolean;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

/** POST /student/assignments/:assignmentId/attempts (S-ASGN-2) — 201 always, `resumed` flag. */
export async function startAttempt(assignmentId: string): Promise<TakePayload> {
  const res = await apiRequest<TakePayload>(`/student/assignments/${encodeURIComponent(assignmentId)}/attempts`, {
    method: "POST",
  });
  return res.data;
}

/** GET /student/attempts/:id — state for taking (S-ASGN-2/5). */
export async function fetchAttemptState(attemptId: string): Promise<TakePayload> {
  const res = await apiRequest<TakePayload>(`/student/attempts/${encodeURIComponent(attemptId)}`);
  return res.data;
}

/** PATCH /student/attempts/:id/answers — one autosave upsert (S-ASGN-3). */
export async function saveAnswer(
  attemptId: string,
  input: { questionId: string; selectedOptions?: string[]; writtenAnswer?: string | null },
): Promise<TakeAnswer> {
  const res = await apiRequest<TakeAnswer>(`/student/attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

/** POST /student/attempts/:id/submit — finalizes + grades MCQ server-side (S-ASGN-6). */
export async function submitAttempt(attemptId: string): Promise<TakePayload> {
  const res = await apiRequest<TakePayload>(`/student/attempts/${encodeURIComponent(attemptId)}/submit`, {
    method: "POST",
  });
  return res.data;
}

/** GET /student/attempts/:id/result — scores + feedback (S-ASGN-7/8). */
export async function fetchAttemptResult(attemptId: string): Promise<TakePayload> {
  const res = await apiRequest<TakePayload>(`/student/attempts/${encodeURIComponent(attemptId)}/result`);
  return res.data;
}
