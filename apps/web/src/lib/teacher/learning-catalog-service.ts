import { apiRequest } from "../api-client";

/**
 * Teacher-authored Learning Catalog (ADR-017, `docs/api/modules/teacher/07-learning-catalog.md`).
 *
 * The 13 endpoints below are contract-defined (contract "Blocked on: none").
 * The runtime lives in another lane (Slice 1B, `codex/learning-catalog-backend`,
 * unmerged at the time of writing). This file codes against the accepted contract
 * and invents nothing: an unreachable API surfaces as the page's Error state,
 * never as fabricated data.
 */

export type LearningPathStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "suspended";

export type LearningUnitKind = "authored" | "reference";

export interface LearningPath {
  id: string;
  title: string;
  description: string | null;
  curriculumKey: string;
  status: LearningPathStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  unitCount: number;
  publishedUnitCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningWord {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface LearningUnit {
  id: string;
  slug: string;
  order: number;
  title: string;
  level: number;
  kind: LearningUnitKind;
  published: boolean;
  wordCount: number;
  referenceSlug: string | null;
  /** Present on authored-unit detail only; never copied for `reference` units. */
  words?: LearningWord[];
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathDetail extends LearningPath {
  units: LearningUnit[];
}

/** A published catalog unit offered by the reference picker. */
export interface CatalogReferenceUnit {
  slug: string;
  title: string;
  level: number;
  wordCount: number;
  curriculum?: string;
  sourcePathTitle?: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export const learningPathStatusLabels: Record<LearningPathStatus, string> = {
  draft: "Bản nháp",
  pending_review: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
  suspended: "Tạm ẩn",
};

export const PATH_STATUSES: LearningPathStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
];

/** The contract's list shape is `data.items[]` with `meta.total`. */
interface PathListData {
  items: LearningPath[];
}

interface ReferenceListData {
  items: CatalogReferenceUnit[];
}

function readItems<T>(data: unknown): T[] {
  // Contract shape first; tolerate the flat-array convention other teacher
  // list endpoints use, so a Slice-1B shape choice cannot blank the page
  // silently — either way the rows come from the server, never invented.
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export async function fetchLearningPaths(params?: {
  status?: LearningPathStatus | "";
  page?: number;
}): Promise<{ items: LearningPath[]; meta: PageMeta }> {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  if (params?.page && params.page > 1) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";
  const res = await apiRequest<PathListData>(`/teacher/learning-paths${suffix}`);
  return {
    items: readItems<LearningPath>(res.data),
    meta: {
      page: res.meta?.page ?? 1,
      pageSize: res.meta?.limit ?? 20,
      total: res.meta?.total ?? 0,
    },
  };
}

export async function createLearningPath(input: {
  title: string;
  description?: string;
}): Promise<LearningPath> {
  const res = await apiRequest<LearningPath>("/teacher/learning-paths", {
    method: "POST",
    body: JSON.stringify({ title: input.title, ...(input.description ? { description: input.description } : {}) }),
  });
  return res.data;
}

export async function deleteLearningPath(pathId: string): Promise<void> {
  await apiRequest<unknown>(`/teacher/learning-paths/${pathId}`, { method: "DELETE" });
}

export async function fetchLearningPathDetail(pathId: string): Promise<LearningPathDetail> {
  const res = await apiRequest<LearningPathDetail>(`/teacher/learning-paths/${pathId}`);
  return { ...res.data, units: Array.isArray(res.data.units) ? res.data.units : [] };
}

export async function updateLearningPath(
  pathId: string,
  input: { title?: string; description?: string },
): Promise<LearningPath> {
  const res = await apiRequest<LearningPath>(`/teacher/learning-paths/${pathId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function submitLearningPath(pathId: string): Promise<LearningPathStatus> {
  const res = await apiRequest<{ status: LearningPathStatus }>(
    `/teacher/learning-paths/${pathId}/submit`,
    { method: "POST" },
  );
  return res.data.status;
}

export interface UnitDraft {
  kind: LearningUnitKind;
  title: string;
  level: number;
  words?: LearningWord[];
  referenceSlug?: string;
}

export async function createUnit(pathId: string, draft: UnitDraft): Promise<LearningUnit> {
  const res = await apiRequest<LearningUnit>(`/teacher/learning-paths/${pathId}/units`, {
    method: "POST",
    body: JSON.stringify(draft),
  });
  return res.data;
}

export async function reorderUnits(
  pathId: string,
  order: Array<{ id: string; order: number }>,
): Promise<void> {
  // The API rejects a partial permutation: always send the complete 1..N order.
  await apiRequest<unknown>(`/teacher/learning-paths/${pathId}/units/reorder`, {
    method: "PATCH",
    body: JSON.stringify(order),
  });
}

export async function updateUnit(
  unitId: string,
  input: { title?: string; level?: number; words?: LearningWord[] },
): Promise<LearningUnit> {
  const res = await apiRequest<LearningUnit>(`/teacher/learning-units/${unitId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function deleteUnit(unitId: string): Promise<void> {
  await apiRequest<unknown>(`/teacher/learning-units/${unitId}`, { method: "DELETE" });
}

export async function publishUnit(unitId: string): Promise<LearningUnit> {
  const res = await apiRequest<LearningUnit>(`/teacher/learning-units/${unitId}/publish`, {
    method: "POST",
  });
  return res.data;
}

export async function unpublishUnit(unitId: string): Promise<LearningUnit> {
  const res = await apiRequest<LearningUnit>(`/teacher/learning-units/${unitId}/unpublish`, {
    method: "POST",
  });
  return res.data;
}

export async function fetchReferenceUnits(params?: {
  level?: number;
  curriculum?: string;
  page?: number;
}): Promise<{ items: CatalogReferenceUnit[]; total: number }> {
  const query = new URLSearchParams();
  if (params?.level) query.set("level", String(params.level));
  if (params?.curriculum) query.set("curriculum", params.curriculum);
  if (params?.page && params.page > 1) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query}` : "";
  const res = await apiRequest<ReferenceListData>(`/teacher/learning-units${suffix}`);
  return { items: readItems<CatalogReferenceUnit>(res.data), total: res.meta?.total ?? 0 };
}

/** One place deciding what a failed catalog write says to the teacher. */
export function describeCatalogError(err: unknown): string {
  if (err instanceof Error && "code" in err) {
    switch ((err as { code: string }).code) {
      case "LEARNING_PATH_NOT_FOUND":
        return "Không tìm thấy lộ trình.";
      case "LEARNING_PATH_ACCESS_DENIED":
      case "LEARNING_UNIT_NOT_OWNED":
        return "Bạn không có quyền thao tác trên nội dung này.";
      case "LEARNING_PATH_FROZEN":
        return "Lộ trình đang chờ duyệt hoặc bị tạm ẩn nên tạm thời không sửa được.";
      case "LEARNING_PATH_EMPTY":
        return "Lộ trình cần ít nhất 1 bài học mới gửi duyệt được.";
      case "LEARNING_PATH_INVALID_STATUS":
        return "Trạng thái hiện tại không cho phép thao tác này. Hãy tải lại trang.";
      case "LEARNING_PATH_HAS_PUBLISHED_UNITS":
        return "Không xoá được: lộ trình đã có bài học được publish hoặc đã có học viên học.";
      case "LEARNING_UNIT_PUBLISHED_IMMUTABLE":
        return "Bài học đã từng publish nên không sửa hoặc xoá được — hãy tạo bài mới thay thế.";
      case "LEARNING_UNIT_ORDER_INVALID":
        return "Không lưu được thứ tự bài học. Hãy thử lại.";
      case "LEARNING_UNIT_REFERENCE_INVALID":
        return "Bài tham chiếu không còn hợp lệ (đã gỡ publish hoặc không tồn tại).";
      case "VALIDATION_ERROR":
        return "Dữ liệu chưa hợp lệ. Kiểm tra các trường được đánh dấu.";
      default:
        return err.message;
    }
  }
  return "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.";
}
