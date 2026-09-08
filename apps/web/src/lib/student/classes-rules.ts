export interface EnrolledClassTeacher {
  id: string;
  nickname: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface EnrolledClass {
  id: string;
  name: string;
  hskLevel: number;
  status: string;
  description: string | null;
  teacher: EnrolledClassTeacher;
  studentCount: number;
  lessonCount: number;
  joinedAt: string;
  rejoinedAt: string | null;
}

export const CLASSES_ROUTE = "/student/classes";

/**
 * Resolves teacher display name: prefers nickname, falls back to email.
 */
export function resolveTeacherName(teacher: EnrolledClassTeacher): string {
  if (teacher.nickname && teacher.nickname.trim().length > 0) {
    return teacher.nickname.trim();
  }
  return teacher.email;
}

export type ClassListOutcome = "loading" | "error" | "empty" | "ready";

/**
 * Determines the primary presentation state of the enrolled classes screen.
 */
export function resolveClassesOutcome(
  loading: boolean,
  error: unknown,
  count: number,
): ClassListOutcome {
  if (loading) return "loading";
  if (error) return "error";
  if (count === 0) return "empty";
  return "ready";
}

/* ------------------------------------------------------------------ */
/* Join-class rules (A07). Mirrors JoinClassDto on the server exactly: */
/* trim + uppercase first, then shape. No extra regex of our own.      */
/* ------------------------------------------------------------------ */

export type JoinCodeIssue = "length" | "charset";

/** Mirror of the two @Length/@Matches messages in join-class.dto.ts. */
export const JOIN_CODE_MESSAGES: Record<JoinCodeIssue, string> = {
  length: "Mã ghi danh gồm đúng 8 ký tự",
  charset: "Mã ghi danh chỉ gồm chữ in hoa và chữ số",
};

/**
 * The same normalization JoinClassDto applies server-side: trim, then uppercase.
 * Doing it client-side too keeps what the learner sees identical to what the
 * server will store, so " h3tt2645 " is a valid code, not a rejection.
 */
export function normalizeJoinCode(raw: string): string {
  return raw.trim().toUpperCase();
}

/**
 * Shape check on the normalized value. "Wrong shape" is a client-side answer
 * (the DTO's own messages) — it must not be sent just to be rejected by the
 * server, but it also must not be confused with CLASS_ENROLL_CODE_INVALID,
 * which means "this code names no class" and only the server can know that.
 */
export function validateJoinCode(raw: string): JoinCodeIssue | null {
  const code = normalizeJoinCode(raw);
  if (!/^[A-Z0-9]*$/.test(code)) return "charset";
  if (code.length !== 8) return "length";
  return null;
}

/**
 * Registry-code → message for a rejected join. Only codes the API contract
 * (student-classes-list.md + API_STUDENT.md) lists for this action; anything
 * else falls through to a generic failure rather than a guessed cause.
 */
export const JOIN_FAILURE_MESSAGES: Record<string, string> = {
  CLASS_ENROLL_CODE_INVALID: "Mã lớp không tồn tại. Kiểm tra lại mã với giáo viên.",
  CLASS_ALREADY_ARCHIVED: "Lớp học đã lưu trữ, không thể tham gia.",
  CLASS_ALREADY_ENROLLED: "Bạn đã ở trong lớp học này.",
  VALIDATION_ERROR: "Mã lớp không đúng định dạng — gồm đúng 8 ký tự in hoa và chữ số.",
};

export function joinFailureMessage(code: string): string {
  return JOIN_FAILURE_MESSAGES[code] ?? "Không tham gia được lớp lúc này. Thử lại sau ít phút.";
}