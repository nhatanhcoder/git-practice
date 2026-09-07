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