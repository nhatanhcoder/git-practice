"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Inbox, MoreHorizontal, Plus, X } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  Overlay,
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  PATH_STATUSES,
  createLearningPath,
  deleteLearningPath,
  describeCatalogError,
  fetchLearningPaths,
  learningPathStatusLabels,
  type LearningPath,
  type LearningPathStatus,
} from "@/lib/teacher/learning-catalog-service";
import { useDismissMenu } from "@/hooks/use-overlay";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import styles from "./learning-paths.module.css";

const FILTERED_EMPTY_COPY: Record<LearningPathStatus, string> = {
  draft: "Chưa có bản nháp nào",
  pending_review: "Không có lộ trình nào chờ duyệt",
  approved: "Chưa có lộ trình nào được duyệt",
  rejected: "Không có lộ trình nào bị từ chối",
  suspended: "Không có lộ trình nào bị tạm ẩn",
};

const DELETE_DISABLED_HINT =
  "Không xoá được: lộ trình đã có bài học được publish hoặc đã có học viên học.";

/** The menu item can only be disabled for what the list row knows (C4). */
function canDelete(p: LearningPath): boolean {
  return (
    (p.status === "draft" || p.status === "rejected") && (p.publishedUnitCount ?? 0) === 0
  );
}

export default function TeacherLearningPathsPage() {
  return (
    <Suspense fallback={<TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lộ trình học" }]}><p>Đang tải…</p></TeacherShell>}>
      <PathsContent />
    </Suspense>
  );
}

function PathsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status") ?? "";
  const status: LearningPathStatus | "" = (PATH_STATUSES as string[]).includes(rawStatus)
    ? (rawStatus as LearningPathStatus)
    : "";

  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [counts, setCounts] = useState<Partial<Record<LearningPathStatus, number>>>({});
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LearningPath | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  // Screens 2–3 redirect here with ?notice= on a 404/403, per contract.
  useEffect(() => {
    const notice = searchParams.get("notice");
    if (notice === "path-missing") flash("Không tìm thấy lộ trình.");
    else if (notice === "unit-missing") flash("Không tìm thấy bài học.");
    else return;
    router.replace("/teacher/learning-paths", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);
    fetchLearningPaths({ status: status || undefined, page })
      .then((res) => {
        if (!isMounted) return;
        setPaths(res.items);
        setTotal(res.meta.total);
        setPageSize(res.meta.pageSize);
        setReviewState(res.items.length === 0 ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setPaths([]);
        if (err instanceof ApiError && err.isForbidden) {
          setReviewState("forbidden");
        } else {
          setReviewState("error");
        }
        setLoadError(describeCatalogError(err));
      });
    return () => {
      isMounted = false;
    };
  }, [status, page, refreshKey]);

  // Tab badges show each tab's own total from `meta`, never a count of the
  // visible rows. A failed count fetch hides that badge only.
  useEffect(() => {
    let isMounted = true;
    void Promise.allSettled(
      PATH_STATUSES.map((s) =>
        fetchLearningPaths({ status: s, page: 1 }).then((res) => ({ status: s, total: res.meta.total })),
      ),
    ).then((results) => {
      if (!isMounted) return;
      const next: Partial<Record<LearningPathStatus, number>> = {};
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value.status] = r.value.total;
      }
      setCounts(next);
    });
    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = status !== "";

  async function handleCreate(title: string, description: string) {
    const created = await createLearningPath({
      title,
      ...(description ? { description } : {}),
    });
    // A fresh path is empty — the list is not where the teacher wants to be.
    router.push("/teacher/learning-paths/" + created.id);
  }

  async function handleDelete() {
    if (!deleting || deletingBusy) return;
    setDeletingBusy(true);
    setMutationError(null);
    try {
      await deleteLearningPath(deleting.id);
      setDeleting(null);
      setRefreshKey((k) => k + 1);
      flash("Đã xoá lộ trình");
    } catch (err) {
      // Reachable only for what the row could not know (e.g. recorded
      // learners): stated inline, never a success claim.
      setMutationError(describeCatalogError(err));
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  const tabHref = (s: LearningPathStatus | "") =>
    s ? `/teacher/learning-paths?status=${s}` : "/teacher/learning-paths";

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lộ trình học" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>LỘ TRÌNH HỌC</p>
          <h1>Lộ trình học</h1>
          <p className={styles.subtitle}>
            {reviewState === "error" ? "Chưa tải được danh sách" : `${total} lộ trình`} · lộ trình do bạn tạo và sở hữu, admin duyệt một lần
          </p>
        </div>
        <button className={styles.primaryButton} onClick={() => setCreating(true)}>
          <Plus size={16} />
          <span>Tạo lộ trình</span>
        </button>
      </header>

      <nav className={styles.tabs} aria-label="Lọc theo trạng thái">
        <Link
          href={tabHref("")}
          className={styles.tab + (status === "" ? " " + styles.tabActive : "")}
          aria-current={status === "" ? "page" : undefined}
        >
          Tất cả
        </Link>
        {PATH_STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={styles.tab + (status === s ? " " + styles.tabActive : "")}
            aria-current={status === s ? "page" : undefined}
          >
            {learningPathStatusLabels[s]}
            {counts[s] !== undefined && <span className={styles.tabCount}>{counts[s]}</span>}
          </Link>
        ))}
      </nav>

      {mutationError && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không xoá được lộ trình.</strong>
            <span>{mutationError}</span>
          </div>
          <button onClick={() => setMutationError(null)}>Đã hiểu</button>
        </div>
      )}

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được danh sách lộ trình.</strong>
            <span>{loadError}</span>
          </div>
          <button onClick={() => setRefreshKey((k) => k + 1)}>Thử lại</button>
        </div>
      )}

      {reviewState === "forbidden" && (
        <div className={styles.emptyState} role="alert">
          <AlertCircle size={38} />
          <h2>Không có quyền truy cập</h2>
          <p>Phiên đăng nhập đã hết hạn hoặc tài khoản không có quyền xem nội dung này.</p>
          <Link className={styles.primaryButton} href="/login">
            Đăng nhập lại
          </Link>
        </div>
      )}

      {reviewState !== "forbidden" && reviewState !== "error" && (
        <section className={styles.tableCard} aria-label="Danh sách lộ trình">
          {reviewState === "loading" ? (
            <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
              {[1, 2, 3, 4, 5].map((r) => (
                <div key={r} className={styles.skeletonRow}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          ) : paths.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={38} />
              <h2>{hasFilters ? FILTERED_EMPTY_COPY[status as LearningPathStatus] : "Bạn chưa có lộ trình nào"}</h2>
              <p>
                {hasFilters
                  ? "Thử chọn trạng thái khác."
                  : "Tạo lộ trình đầu tiên, thêm bài học rồi gửi admin duyệt."}
              </p>
              {!hasFilters && (
                <button className={styles.primaryButton} onClick={() => setCreating(true)}>
                  <Plus size={16} />
                  <span>Tạo lộ trình đầu tiên</span>
                </button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Lộ trình</th>
                      <th>Bài học</th>
                      <th>Đã publish</th>
                      <th>Trạng thái</th>
                      <th>Cập nhật</th>
                      <th>
                        <span className="sr-only">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paths.map((p) => (
                      <PathRow
                        key={p.id}
                        path={p}
                        activeMenu={activeMenu === p.id}
                        onToggleMenu={() => setActiveMenu(activeMenu === p.id ? null : p.id)}
                        onOpen={() => router.push("/teacher/learning-paths/" + p.id)}
                        onDelete={() => {
                          setActiveMenu(null);
                          setDeleting(p);
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={styles.mobileList}>
                {paths.map((p) => (
                  <PathCard
                    key={p.id}
                    path={p}
                    onOpen={() => router.push("/teacher/learning-paths/" + p.id)}
                    onDelete={() => setDeleting(p)}
                  />
                ))}
              </div>
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    Trước
                  </button>
                  <span>
                    Trang {page}/{totalPages}
                  </span>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                    Sau
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {creating && (
        <CreatePathModal onClose={() => setCreating(false)} onCreate={handleCreate} />
      )}
      {deleting && (
        <ConfirmModal
          title="Xoá lộ trình"
          description={`Xoá lộ trình “${deleting.title || "—"}”? Hành động không thể hoàn tác.`}
          confirmLabel="Xoá lộ trình"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
        />
      )}
    </TeacherShell>
  );
}

function PathRow({
  path,
  activeMenu,
  onToggleMenu,
  onOpen,
  onDelete,
}: {
  path: LearningPath;
  activeMenu: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const menuRef = useDismissMenu<HTMLTableCellElement>(activeMenu, () => {
    if (activeMenu) onToggleMenu();
  });
  const deletable = canDelete(path);
  return (
    <tr tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <td>
        <div className={styles.nameCell}>
          <strong>{path.title || "—"}</strong>
          {path.status === "rejected" && path.rejectionReason && (
            <small className={styles.rejectionLine}>{path.rejectionReason}</small>
          )}
        </div>
      </td>
      <td className={styles.numeric}>{path.unitCount ?? "—"}</td>
      <td className={styles.numeric}>{path.publishedUnitCount ?? "—"}</td>
      <td>
        <StatusPill status={path.status} label={learningPathStatusLabels[path.status]} />
      </td>
      <td className={styles.numeric}>{formatDate(path.updatedAt)}</td>
      <td className={styles.actionCell} onClick={(e) => e.stopPropagation()} ref={activeMenu ? menuRef : undefined}>
        <button
          className={styles.moreButton}
          onClick={onToggleMenu}
          aria-label={"Thao tác cho " + (path.title || "lộ trình")}
          aria-haspopup="menu"
          aria-expanded={activeMenu}
          aria-controls={"pmenu-" + path.id}
        >
          <MoreHorizontal size={19} />
        </button>
        {activeMenu && (
          <div className={styles.actionMenu} id={"pmenu-" + path.id} role="menu">
            <button onClick={onOpen}>Mở</button>
            <button
              className={styles.dangerAction}
              onClick={deletable ? onDelete : undefined}
              disabled={!deletable}
              title={deletable ? undefined : DELETE_DISABLED_HINT}
            >
              Xoá
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function PathCard({
  path,
  onOpen,
  onDelete,
}: {
  path: LearningPath;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const deletable = canDelete(path);
  return (
    <article className={styles.mobileCard}>
      <div className={styles.mobileCardHead}>
        <div className={styles.nameCell}>
          <strong>{path.title || "—"}</strong>
          {path.status === "rejected" && path.rejectionReason && (
            <small className={styles.rejectionLine}>{path.rejectionReason}</small>
          )}
        </div>
        <StatusPill status={path.status} label={learningPathStatusLabels[path.status]} />
      </div>
      <div className={styles.mobileCardMeta}>
        <span>{path.unitCount ?? "—"} bài học</span>
        <span>{path.publishedUnitCount ?? "—"} đã publish</span>
        <span>{formatDate(path.updatedAt)}</span>
      </div>
      <div className={styles.mobileCardActions}>
        <button onClick={onOpen}>Mở</button>
        <button onClick={deletable ? onDelete : undefined} disabled={!deletable} title={deletable ? undefined : DELETE_DISABLED_HINT}>
          Xoá
        </button>
      </div>
    </article>
  );
}

function CreatePathModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function validate(): boolean {
    const errors: { title?: string; description?: string } = {};
    const name = title.trim();
    if (name.length < 3) errors.title = "Tên lộ trình phải có ít nhất 3 ký tự.";
    else if (name.length > 300) errors.title = "Tên lộ trình không quá 300 ký tự.";
    if (description.trim().length > 2000) errors.description = "Mô tả không quá 2000 ký tự.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !validate()) return;
    setSaving(true);
    setFormError(null);
    try {
      await onCreate(title.trim(), description.trim());
      onClose();
    } catch (err) {
      // VALIDATION_ERROR.details is keyed by field name: map it into the form.
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details) {
        const mapped: { title?: string; description?: string } = {};
        if (err.details.title?.length) mapped.title = err.details.title.join(" ");
        if (err.details.description?.length) mapped.description = err.details.description.join(" ");
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(describeCatalogError(err));
      } else {
        setFormError(describeCatalogError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay label="Tạo lộ trình" onClose={onClose} backdropClassName={styles.modalBackdrop} panelClassName={styles.modal}>
        <div className={styles.modalHead}>
          <h2>Tạo lộ trình</h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Đóng" disabled={saving}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <label className={styles.field}>
            <span>Tên lộ trình *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Từ vựng HSK 3 · Chủ đề gia đình"
              autoFocus
              maxLength={300}
            />
            {fieldErrors.title && <small className={styles.fieldError}>{fieldErrors.title}</small>}
          </label>
          <label className={styles.field}>
            <span>Mô tả</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Mục tiêu và đối tượng của lộ trình…"
              maxLength={2000}
            />
            {fieldErrors.description && (
              <small className={styles.fieldError}>{fieldErrors.description}</small>
            )}
          </label>
          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className={styles.primaryButton} disabled={saving}>
              {saving ? "Đang tạo…" : "Tạo lộ trình"}
            </button>
          </div>
        </form>
    </Overlay>
  );
}
