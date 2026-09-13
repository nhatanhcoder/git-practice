import { ApiError, apiRequest } from "../api-client";
import {
  describeLeaveFailure,
  joinFailureMessage,
  normalizeJoinCode,
  type EnrolledClass,
} from "./classes-rules";
import type { EnrolledClassDetail, EnrolledLesson } from "./classes-rules";

export * from "./classes-rules";

/**
 * Fetches all classes the authenticated student is currently enrolled in (F2.6).
 * Endpoint: GET /student/classes
 */
export async function fetchMyEnrolledClasses(): Promise<EnrolledClass[]> {
  const response = await apiRequest<EnrolledClass[]>("/student/classes");
  return response.data;
}

/** What POST /student/classes/join returns inside `data` (classes.service toEnrollmentResult). */
export interface JoinResult {
  classId: string;
  name: string;
  hskLevel: number;
  enrollmentStatus: string;
  joinedAt: string;
  rejoinedAt: string | null;
}

/**
 * Joins a class by its 8-character enrollment code (F2.3).
 * Endpoint: POST /student/classes/join — payload exactly { enrollmentCode }.
 *
 * The rejoin rule (owner decision 2026-09-05, §8.1 of 03-classes-enrollment.md) is
 * server-side: a dropped enrollment is reactivated, keeping joinedAt. To this
 * function that is just a success like any other — the FE never re-implements it.
 */
export async function joinClassByCode(rawCode: string): Promise<JoinResult> {
  const response = await apiRequest<JoinResult>("/student/classes/join", {
    method: "POST",
    body: JSON.stringify({ enrollmentCode: normalizeJoinCode(rawCode) }),
  });
  return response.data;
}

/**
 * One place deciding what a failed join says to the learner. Registry code when
 * the server answered (ApiError carries it), network wording when it never did.
 * The input is kept by the caller either way — a failure never clears the field
 * the person just typed.
 */
export function describeJoinFailure(err: unknown): string {
  if (err instanceof ApiError) return joinFailureMessage(err.code);
  return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
}

/**
 * Fetches detail of an enrolled class, including its ordered lessons (F2.6).
 * Endpoint: GET /student/classes/:id
 */
export async function fetchEnrolledClassDetail(classId: string): Promise<EnrolledClassDetail> {
  const response = await apiRequest<EnrolledClassDetail>(`/student/classes/${encodeURIComponent(classId)}`);
  return response.data;
}

/**
 * Fetches one lesson of an enrolled class (S-LESSON-2).
 * Endpoint: GET /student/classes/:classId/lessons/:lessonId
 *
 * Access is enforced server-side: active enrollment in :classId, and the
 * lesson must belong to :classId. A lesson id from another class answers
 * LESSON_NOT_FOUND (404) — the client never filters a class payload itself.
 */
export async function fetchEnrolledLessonDetail(
  classId: string,
  lessonId: string,
): Promise<EnrolledLesson> {
  const response = await apiRequest<EnrolledLesson>(
    `/student/classes/${encodeURIComponent(classId)}/lessons/${encodeURIComponent(lessonId)}`,
  );
  return response.data;
}

export interface LeaveClassResult {
  classId: string;
  status: "dropped";
  joinedAt: string | null;
  rejoinedAt: string | null;
}

/**
 * Leaves an enrolled class. The API keeps the enrollment row and changes its status to dropped.
 * Endpoint: DELETE /student/classes/:id/leave
 */
export async function leaveEnrolledClass(classId: string): Promise<LeaveClassResult> {
  const response = await apiRequest<LeaveClassResult>(
    `/student/classes/${encodeURIComponent(classId)}/leave`,
    { method: "DELETE" },
  );
  return response.data;
}

export function describeLeaveError(err: unknown): string {
  if (err instanceof ApiError) return describeLeaveFailure(err.code);
  return "Không thể kết nối máy chủ. Kiểm tra kết nối rồi thử lại.";
}
