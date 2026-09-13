import { apiRequest } from "../api-client";

/**
 * Student placement endpoints (04-placement.md, Task C).
 * Thin wrappers — the paper is sampled server-side, grading and the level rule
 * run server-side (ADR-005); this module never sees a correctAnswer.
 */

export interface PlacementQuestion {
  questionId: string;
  hskLevel: number;
  skill: string;
  /** Same shape the attempt take payload carries (audioUrl/transcript/passage in,
   *  correctAnswer/explanation never). */
  content: { prompt?: string; audioUrl?: string; transcript?: string; passage?: string } | null;
  options: { id: string; text: string }[];
}

export interface PlacementPaper {
  questions: PlacementQuestion[];
  /** The student's current hskLevelGoal, or null before the first placement. */
  savedLevel: number | null;
}

export interface PlacementResult {
  level: number;
  /** Band → correct count, only for bands on the paper (post-hoc reveal). */
  correctByLevel: Record<string, number>;
  total: number;
  savedLevel: number;
}

/** GET /student/placement — the deterministic paper (INV-PLC-03). */
export async function fetchPlacementPaper(): Promise<PlacementPaper> {
  const res = await apiRequest<PlacementPaper>("/student/placement");
  return res.data;
}

/** POST /student/placement — server grades, computes and saves the level. */
export async function submitPlacement(
  answers: { questionId: string; selectedOptions: string[] }[],
): Promise<PlacementResult> {
  const res = await apiRequest<PlacementResult>("/student/placement", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
  return res.data;
}

/** GET /student/assignments/:id/attempt — INV-ATLP-12, ids only. Nulls mean "never started"
 *  (a literal null cannot ride this wire — the envelope interceptor passes it through bare). */
export async function fetchMyAttempt(
  assignmentId: string,
): Promise<{ attemptId: string | null; status: string | null }> {
  const res = await apiRequest<{ attemptId: string | null; status: string | null }>(
    `/student/assignments/${encodeURIComponent(assignmentId)}/attempt`,
  );
  return res.data;
}
