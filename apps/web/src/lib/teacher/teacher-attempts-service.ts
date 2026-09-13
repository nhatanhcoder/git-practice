import { apiRequest } from "../api-client";

/**
 * Teacher grading endpoints (04-attempts-grading, T-GRADE-1..5).
 * The drawer keeps the AI's original suggestion apart from the teacher's draft
 * (WEB-006/A2) — these wrappers return both; the page never merges them.
 */

export interface GradingQueueRow {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  classId: string;
  className: string | null;
  studentId: string;
  studentName: string | null;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  maxScore: number | null;
}

export interface GradingAnswer {
  questionId: string;
  skill: string | null;
  subType: string | null;
  prompt: string | null;
  rubric: string | null;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string | string[] | null;
  selectedOptions: string[];
  writtenAnswer: string | null;
  autoScore: number | null;
  teacherScore: number | null;
  teacherFeedback: string | null;
  aiSuggestedScore: number | null;
  aiFeedback: string | null;
  isCorrect: boolean | null;
}

export interface GradingDetail {
  attempt: {
    id: string;
    assignmentId: string;
    assignmentTitle: string;
    classId: string;
    studentId: string;
    studentName: string | null;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    gradedAt: string | null;
    totalScore: number | null;
    maxScore: number | null;
    isOfficialGrade: boolean;
  };
  answers: GradingAnswer[];
}

/** GET /teacher/attempts?status= — grading queue, own assignments only. */
export async function fetchGradingQueue(params?: {
  status?: "submitted" | "graded";
  assignmentId?: string;
  classId?: string;
}): Promise<{ data: GradingQueueRow[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.assignmentId) q.set("assignmentId", params.assignmentId);
  if (params?.classId) q.set("classId", params.classId);
  const suffix = q.size > 0 ? `?${q.toString()}` : "";
  const res = await apiRequest<GradingQueueRow[]>(`/teacher/attempts${suffix}`);
  return { data: res.data, meta: res.meta! };
}

/** GET /teacher/attempts/:id — attempt + answers + question data. */
export async function fetchGradingDetail(attemptId: string): Promise<GradingDetail> {
  const res = await apiRequest<GradingDetail>(`/teacher/attempts/${encodeURIComponent(attemptId)}`);
  return res.data;
}

/** PATCH /teacher/attempts/:id/grade — final scores + feedback (teacher's alone). */
export async function gradeAttempt(
  attemptId: string,
  grades: Array<{ questionId: string; teacherScore: number; teacherFeedback?: string }>,
): Promise<GradingDetail> {
  const res = await apiRequest<GradingDetail>(`/teacher/attempts/${encodeURIComponent(attemptId)}/grade`, {
    method: "PATCH",
    body: JSON.stringify({ grades }),
  });
  return res.data;
}

/** POST /teacher/attempts/:id/ai-suggest — suggestion only, writing answers. */
export async function suggestScores(
  attemptId: string,
  questionIds?: string[],
): Promise<{ answers: Array<{ questionId: string; aiSuggestedScore: number | null; aiFeedback: string | null }> }> {
  const res = await apiRequest<{ answers: Array<{ questionId: string; aiSuggestedScore: number | null; aiFeedback: string | null }> }>(
    `/teacher/attempts/${encodeURIComponent(attemptId)}/ai-suggest`,
    { method: "POST", body: JSON.stringify(questionIds ? { questionIds } : {}) },
  );
  return res.data;
}
