import { apiRequest, ApiError } from "./api-client";

export const catalogStatuses = ["pending_review", "approved", "rejected", "suspended", "draft"] as const;
export type CatalogStatus = (typeof catalogStatuses)[number];
export type CatalogFilter = CatalogStatus | "all";
export const catalogLabels: Record<CatalogStatus, string> = {
  pending_review: "Chờ duyệt", approved: "Đã duyệt", rejected: "Bị từ chối",
  suspended: "Tạm ẩn", draft: "Bản nháp",
};
export interface CatalogPerson { id: string; nickname: string }
export interface CatalogUnit {
  id: string; slug: string; order: number; title: string; level: number;
  kind: "authored" | "reference"; published: boolean; wordCount: number;
  referenceSlug: string | null;
  words?: Array<{ hanzi: string; pinyin: string; meaning: string }>;
  moderation?: { moderatedById: string | null; moderatedAt: string | null } | null;
}
export interface CatalogPath {
  id: string; title: string; description: string | null; status: CatalogStatus;
  owner: CatalogPerson | null; unitCount: number; publishedUnitCount: number;
  submittedAt: string | null; createdAt: string; reviewedAt: string | null;
  reviewedBy?: CatalogPerson | null; rejectionReason: string | null;
  suspendedAt?: string | null; suspendedBy?: CatalogPerson | null;
  restoredAt?: string | null; restoredBy?: CatalogPerson | null;
}
export interface CatalogDetail extends CatalogPath { units: CatalogUnit[] }
export interface CatalogPage<T> { items: T[]; total: number; page: number; limit: number }
export type CatalogAction = "approve" | "reject" | "suspend" | "restore";

async function readPage<T>(endpoint: string): Promise<CatalogPage<T>> {
  const response = await apiRequest<T[] | { items: T[] }>(endpoint);
  // Runtime uses data[]; the Page Contract still describes data.items[].
  const items = Array.isArray(response.data) ? response.data : response.data?.items;
  if (!Array.isArray(items) || !response.meta) throw new Error("Không đọc được danh sách. Vui lòng tải lại.");
  return { items, total: response.meta.total, page: response.meta.page, limit: response.meta.limit };
}

function pathPage(status: CatalogStatus, page: number, teacherId?: string) {
  const query = new URLSearchParams({ status, page: String(page) });
  if (teacherId) query.set("teacherId", teacherId);
  return readPage<CatalogPath>(`/admin/learning-paths?${query}`);
}

export async function fetchAdminCatalogPaths(status: CatalogFilter, page = 1, teacherId?: string): Promise<CatalogPage<CatalogPath>> {
  if (status !== "all") return pathPage(status, page, teacherId);
  // No status=all exists. Merge the first P pages of each supported status to
  // obtain the exact global FIFO page P, without inventing a query value.
  const first = await Promise.all(catalogStatuses.map((value) => pathPage(value, 1, teacherId)));
  const remaining = await Promise.all(first.flatMap((result, index) =>
    Array.from({ length: Math.max(0, Math.min(page, Math.ceil(result.total / result.limit)) - 1) },
      (_, offset) => pathPage(catalogStatuses[index], offset + 2, teacherId)),
  ));
  const rows = [...first, ...remaining].flatMap((result) => result.items);
  const compareDate = (left: string | null, right: string | null) =>
    (left ? Date.parse(left) : Infinity) - (right ? Date.parse(right) : Infinity);
  rows.sort((a, b) => compareDate(a.submittedAt, b.submittedAt) ||
    compareDate(a.createdAt, b.createdAt) || a.id.localeCompare(b.id));
  const limit = first[0].limit;
  return { items: rows.slice((page - 1) * limit, page * limit), total: first.reduce((sum, result) => sum + result.total, 0), page, limit };
}

export function fetchAdminCatalogUnits(page = 1) {
  return readPage<CatalogUnit>(`/admin/learning-units?page=${page}`);
}
export async function fetchAdminCatalogDetail(pathId: string) {
  return (await apiRequest<CatalogDetail>(`/admin/learning-paths/${encodeURIComponent(pathId)}`)).data;
}
export async function moderateCatalogPath(pathId: string, action: CatalogAction, reason?: string) {
  return (await apiRequest<CatalogDetail>(`/admin/learning-paths/${encodeURIComponent(pathId)}/${action}`, {
    method: "PATCH", body: JSON.stringify(action === "reject" ? { rejectionReason: reason?.trim() } : {}),
  })).data;
}
export async function unpublishCatalogUnit(unitId: string) {
  return (await apiRequest<CatalogUnit>(`/admin/learning-units/${encodeURIComponent(unitId)}/unpublish`, {
    method: "PATCH", body: "{}",
  })).data;
}
export function isCatalogConflict(error: unknown) {
  return error instanceof ApiError && error.code === "LEARNING_PATH_INVALID_STATUS";
}
export function catalogError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "LEARNING_PATH_EMPTY") return "Lộ trình chưa có bài học nào nên chưa thể duyệt.";
    if (error.code === "LEARNING_PATH_REJECTION_REASON_REQUIRED") return "Lý do từ chối phải có từ 10 đến 2000 ký tự.";
    if (isCatalogConflict(error)) return "Lộ trình đã được xử lý bởi người khác. Danh sách đã được tải lại.";
    if (error.isForbidden) return "Tài khoản không có quyền quản trị nội dung này.";
    return error.message;
  }
  return "Không kết nối được máy chủ. Vui lòng tải lại để kiểm tra trạng thái trước khi thao tác tiếp.";
}
