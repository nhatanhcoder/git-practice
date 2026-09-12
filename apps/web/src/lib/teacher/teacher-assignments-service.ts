import { apiRequest } from "../api-client";
import type { Assignment, AssignmentType } from "./assignment-data";

/**
 * TASK S3 — the teacher Assignments screen against the real API.
 * Endpoints: /api/v1/teacher/assignments (per docs/api/modules/teacher/03-assignments.md,
 * implemented 2026-09-11). The in-memory MOCK era ends here.
 */

/** What the API returns for one assignment row (list shape, spec §3.2). */
interface ApiAssignment {
  id: string;
  classId: string;
  className?: string;
  title: string;
  type: AssignmentType;
  status?: "draft" | "published";
  dueDate: string | null;
  timeLimitMinutes: number | null;
  questionCount?: number;
  questionIds?: string[];
  /** Detail shape only (spec §3.3) — absent on list rows. */
  stats?: {
    enrolledActive: number;
    submittedCount: number;
    gradedCount: number;
    pendingGradingCount: number;
    inProgressCount: number;
    notStartedCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentDraft {
  title: string;
  type: AssignmentType;
  classId: string;
  dueDate: string | null;
  timeLimitMinutes: number | null;
  questionIds: string[];
  status?: "draft" | "published";
}

function toAssignment(a: ApiAssignment): Assignment {
  return {
    id: a.id,
    title: a.title,
    type: a.type,
    classId: a.classId,
    className: a.className ?? "",
    // The list API does not carry hskLevel; the page joins it from its own
    // class list (same source the class filter uses).
    hskLevel: 0,
    dueDate: a.dueDate ?? "",
    timeLimitMinutes: a.timeLimitMinutes,
    questionIds: a.questionIds ?? [],
    submittedCount: a.stats ? a.stats.submittedCount : 0,
    totalStudents: a.stats ? a.stats.enrolledActive : 0,
    pendingGradingCount: a.stats ? a.stats.pendingGradingCount : 0,
    createdAt: a.createdAt.slice(0, 10),
  };
}

export async function fetchAssignments(params?: {
  classId?: string;
  status?: "draft" | "published";
  type?: AssignmentType;
}): Promise<Assignment[]> {
  const query = new URLSearchParams();
  if (params?.classId) query.set("classId", params.classId);
  if (params?.status) query.set("status", params.status);
  if (params?.type) query.set("type", params.type);
  const suffix = query.toString() ? `?${query}` : "";
  const res = await apiRequest<ApiAssignment[]>(`/teacher/assignments${suffix}`);
  return res.data.map(toAssignment);
}

export async function fetchAssignmentDetail(id: string): Promise<Assignment> {
  const res = await apiRequest<ApiAssignment>(`/teacher/assignments/${id}`);
  return toAssignment(res.data);
}

export async function createAssignment(draft: AssignmentDraft): Promise<Assignment> {
  const res = await apiRequest<ApiAssignment>("/teacher/assignments", {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return toAssignment(res.data);
}

export async function updateAssignment(
  id: string,
  draft: Partial<AssignmentDraft>,
): Promise<Assignment> {
  const res = await apiRequest<ApiAssignment>(`/teacher/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(draft),
  });
  return toAssignment(res.data);
}

export async function deleteAssignment(id: string): Promise<void> {
  await apiRequest<unknown>(`/teacher/assignments/${id}`, { method: "DELETE" });
}

/** One place deciding what a failed assignment write says to the teacher. */
export function describeAssignmentError(err: unknown): string {
  if (err instanceof Error && "code" in err) {
    const code = (err as { code: string }).code;
    switch (code) {
      case "CLASS_NOT_FOUND":
        return "Không tìm thấy lớp học.";
      case "QUESTION_NOT_FOUND":
        return "Có câu hỏi không còn tồn tại trong ngân hàng đề.";
      case "ASSIGNMENT_ALREADY_SUBMITTED":
        return "Bài tập đã có lượt làm — không thể sửa hoặc xoá.";
      case "ASSIGNMENT_NO_QUESTIONS":
        return "Bài tập cần ít nhất một câu hỏi.";
      case "VALIDATION_ERROR":
        return "Dữ liệu bài tập không hợp lệ.";
      default:
        return err.message;
    }
  }
  return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
}
