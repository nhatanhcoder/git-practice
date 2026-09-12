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

const LEAVE_FAILURE_MESSAGES: Record<string, string> = {
  CLASS_NOT_ENROLLED: "Bạn không còn ở trong lớp này.",
  CLASS_ACCESS_DENIED: "Bạn không có quyền truy cập lớp này.",
  CLASS_NOT_FOUND: "Không tìm thấy lớp học.",
  VALIDATION_ERROR: "Mã lớp không hợp lệ.",
};

export function describeLeaveFailure(code: string): string {
  return LEAVE_FAILURE_MESSAGES[code] ?? "Không thể rời lớp lúc này. Thử lại sau ít phút.";
}

export interface EnrolledLesson {
  id: string;
  title: string;
  description: string | null;
  contentType: string;
  contentUrl: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface EnrolledClassDetail {
  id: string;
  name: string;
  hskLevel: number;
  status: string;
  description: string | null;
  createdAt: string;
  teacher: EnrolledClassTeacher;
  lessons: EnrolledLesson[];
  studentCount: number;
  joinedAt: string;
  rejoinedAt: string | null;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export type ClassDetailOutcome =
  | "loading"
  | "invalid_id"
  | "not_found"
  | "forbidden"
  | "error"
  | "empty"
  | "ready";

export interface ApiErrorLike {
  statusCode?: number;
  code?: string;
  message?: string;
}

export function extractApiError(error: unknown): ApiErrorLike | null {
  if (typeof error === "object" && error !== null) {
    const err = error as ApiErrorLike;
    return {
      statusCode: typeof err.statusCode === "number" ? err.statusCode : undefined,
      code: typeof err.code === "string" ? err.code : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
    };
  }
  return null;
}

export function resolveClassDetailOutcome(
  loading: boolean,
  error: unknown,
  detail: EnrolledClassDetail | null,
  validId = true,
): ClassDetailOutcome {
  if (!validId) return "invalid_id";
  if (loading) return "loading";
  if (error) {
    const err = extractApiError(error);
    if (err) {
      if (err.statusCode === 400 || err.code === "VALIDATION_ERROR") return "invalid_id";
      if (err.statusCode === 404 || err.code === "CLASS_NOT_FOUND") return "not_found";
      if (err.statusCode === 403 || err.code === "CLASS_ACCESS_DENIED") return "forbidden";
    }
    return "error";
  }
  if (!detail) return "error";
  if (!detail.lessons || detail.lessons.length === 0) return "empty";
  return "ready";
}

export type LessonDetailOutcome =
  | "loading"
  | "invalid_id"
  | "not_found"
  | "forbidden"
  | "error"
  | "ready";

export function resolveLessonDetailOutcome(
  loading: boolean,
  error: unknown,
  detail: EnrolledClassDetail | null,
  lessonId: string,
  validIds = true,
): LessonDetailOutcome {
  if (!validIds) return "invalid_id";
  if (loading) return "loading";
  if (error) {
    const err = extractApiError(error);
    if (err) {
      if (err.statusCode === 400 || err.code === "VALIDATION_ERROR") return "invalid_id";
      if (err.statusCode === 404 || err.code === "CLASS_NOT_FOUND") return "not_found";
      if (err.statusCode === 403 || err.code === "CLASS_ACCESS_DENIED") return "forbidden";
    }
    return "error";
  }
  if (!detail) return "error";
  const lesson = detail.lessons?.find((l) => l.id === lessonId);
  if (!lesson) return "not_found";
  return "ready";
}

/**
 * Outcome for the dedicated lesson-detail endpoint
 * (GET /student/classes/:classId/lessons/:lessonId, S-LESSON-2).
 * Unlike resolveLessonDetailOutcome above — which finds the lesson inside a
 * class payload — this resolves a single-lesson payload. A lesson id from
 * another class arrives as LESSON_NOT_FOUND (404), never as a cross-class leak.
 */
export function resolveSingleLessonOutcome(
  loading: boolean,
  error: unknown,
  lesson: EnrolledLesson | null,
  validIds = true,
): LessonDetailOutcome {
  if (!validIds) return "invalid_id";
  if (loading) return "loading";
  if (error) {
    const err = extractApiError(error);
    if (err) {
      if (err.statusCode === 400 || err.code === "VALIDATION_ERROR") return "invalid_id";
      if (
        err.statusCode === 404 ||
        err.code === "CLASS_NOT_FOUND" ||
        err.code === "LESSON_NOT_FOUND"
      )
        return "not_found";
      if (err.statusCode === 403 || err.code === "CLASS_ACCESS_DENIED") return "forbidden";
    }
    return "error";
  }
  if (!lesson) return "error";
  return "ready";
}

export function formatClassJoinedDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return isoString;
  }
}
