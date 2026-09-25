"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Inbox,
  Pencil,
  Plus,
  Send,
} from "lucide-react";
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
  createUnit,
  describeCatalogError,
  fetchLearningPathDetail,
  fetchReferenceUnits,
  learningPathStatusLabels,
  publishUnit,
  reorderUnits,
  submitLearningPath,
  unpublishUnit,
  updateLearningPath,
  type CatalogReferenceUnit,
  type LearningPathDetail,
  type LearningUnit,
  type LearningWord,
} from "@/lib/teacher/learning-catalog-service";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/formatters";
import styles from "./detail.module.css";

const FROZEN_HINT =
  "Lộ trình đang chờ admin duyệt — tạm thời không sửa được.";

export default function TeacherLearningPathDetailPage({
  params,
}: {
  params: { pathId: string };
}) {
  const { pathId } = params;
  const router = useRouter();

  const [detail, setDetail] = useState<LearningPathDetail | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [addingAuthored, setAddingAuthored] = useState(false);
  const [picking, setPicking] = useState(false);
  const [publishTarget, setPublishTarget] = useState<LearningUnit | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<LearningUnit | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);
    fetchLearningPathDetail(pathId)
      .then((res) => {
        if (!isMounted) return;
        setDetail(res);
        setReviewState("ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        // Contract C1: a foreign path reads as "not found" — redirect, toast
        // on the list screen. Tolerate either backend code (404 or 403).
        if (
          err instanceof ApiError &&
          (err.code === "LEARNING_PATH_NOT_FOUND" || err.code === "LEARNING_PATH_ACCESS_DENIED")
        ) {
          router.replace("/teacher/learning-paths?notice=path-missing");
          return;
        }
        setDetail(null);
        setReviewState("error");
        setLoadError(describeCatalogError(err));
      });
    return () => {
      isMounted = false;
    };
  }, [pathId, refreshKey, router]);

  const units = useMemo(
    () => [...(detail?.units ?? [])].sort((a, b) => a.order - b.order),
    [detail],
  );

  const frozen = detail?.status === "pending_review" || detail?.status === "suspended";
  const approved = detail?.status === "approved";
  const canSubmit = detail?.status === "draft" || detail?.status === "rejected";

  function setUnits(next: LearningUnit[]) {
    setDetail((current) => (current ? { ...current, units: next } : current));
  }

  async function persistOrder(next: LearningUnit[]) {
    const previous = units;
    setUnits(next);
    setReorderError(null);
    try {
      // Complete 1..N permutation only — the API rejects a partial payload.
      await reorderUnits(
        pathId,
        next.map((u, i) => ({ id: u.id, order: i + 1 })),
      );
      setUnits(next.map((u, i) => ({ ...u, order: i + 1 })));
    } catch {
      // Never keep a local order the server never stored.
      setUnits(previous);
      setReorderError("Không lưu được thứ tự. Danh sách đã giữ nguyên.");
    }
  }

  function moveUnit(id: string, dir: -1 | 1) {
    const idx = units.findIndex((u) => u.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= units.length) return;
    const next = [...units];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    void persistOrder(next);
  }

  async function handleSubmit() {
    setSubmitBusy(true);
    try {
      const status = await submitLearningPath(pathId);
      setDetail((current) => (current ? { ...current, status } : current));
      setSubmitting(false);
      flash("Đã gửi duyệt");
    } catch (err) {
      setSubmitting(false);
      flash(describeCatalogError(err));
    } finally {
      setSubmitBusy(false);
    }
  }

  async function handlePublishToggle(unit: LearningUnit, toPublish: boolean) {
    setPublishBusy(true);
    try {
      const updated = toPublish ? await publishUnit(unit.id) : await unpublishUnit(unit.id);
      setUnits(units.map((u) => (u.id === unit.id ? { ...u, published: updated.published } : u)));
      setPublishTarget(null);
      setUnpublishTarget(null);
      setDetail((current) =>
        current
          ? {
              ...current,
              publishedUnitCount: current.publishedUnitCount + (toPublish ? 1 : -1),
            }
          : current,
      );
      flash(toPublish ? "Đã publish bài học" : "Đã bỏ publish");
    } catch (err) {
      setPublishTarget(null);
      setUnpublishTarget(null);
      flash(describeCatalogError(err));
    } finally {
      setPublishBusy(false);
    }
  }

  async function handleCreateAuthored(draft: {
    title: string;
    level: number;
    words: LearningWord[];
  }) {
    const created = await createUnit(pathId, { kind: "authored", ...draft });
    // The words are written in the unit editor, not here.
    router.push(`/teacher/learning-paths/${pathId}/units/${created.id}`);
  }

  async function handlePickReference(unit: CatalogReferenceUnit) {
    await createUnit(pathId, {
      kind: "reference",
      title: unit.title,
      level: unit.level,
      referenceSlug: unit.slug,
    });
    setPicking(false);
    setRefreshKey((k) => k + 1);
  }

  const submitLabel = detail?.status === "rejected" ? "Gửi duyệt lại" : "Gửi duyệt";

  return (
    <TeacherShell
      crumbs={[
        { label: "Giáo viên" },
        { label: "Lộ trình học", href: "/teacher/learning-paths" },
        { label: detail?.title || "Chi tiết" },
      ]}
    >
      {reviewState === "loading" ? (
        <div aria-busy="true" aria-label="Đang tải">
          <div className={styles.skeletonHead} />
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} className={styles.skeletonRow}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : reviewState === "error" || !detail ? (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được lộ trình.</strong>
            <span>{loadError}</span>
          </div>
          <button onClick={() => setRefreshKey((k) => k + 1)}>Thử lại</button>
        </div>
      ) : (
        <>
          <header className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>LỘ TRÌNH HỌC</p>
              <h1>{detail.title || "—"}</h1>
              <p className={styles.subtitle}>
                {detail.unitCount} bài học · {detail.publishedUnitCount} đã publish
              </p>
              <StatusPill status={detail.status} label={learningPathStatusLabels[detail.status]} />
            </div>
            <div className={styles.headerActions}>
              {!frozen && (
                <button className={styles.ghostButton} onClick={() => setEditing(true)}>
                  <Pencil size={16} />
                  <span>Sửa</span>
                </button>
              )}
              {canSubmit && (
                <button
                  className={styles.primaryButton}
                  onClick={() => setSubmitting(true)}
                  disabled={units.length === 0}
                  title={units.length === 0 ? "Cần ít nhất 1 bài học" : undefined}
                >
                  <Send size={16} />
                  <span>{submitLabel}</span>
                </button>
              )}
            </div>
          </header>

          {detail.status === "rejected" && detail.rejectionReason && (
            <section className={styles.reviewPanel} aria-label="Lý do từ chối">
              <AlertCircle size={19} />
              <div>
                <strong>Admin đã từ chối lộ trình này</strong>
                <p>{detail.rejectionReason}</p>
              </div>
            </section>
          )}

          {frozen && (
            <div className={styles.frozenBanner} role="status">
              <AlertCircle size={19} />
              <span>
                {detail.status === "pending_review"
                  ? `Lộ trình đang chờ admin duyệt — tạm thời không sửa được.${
                      detail.submittedAt ? ` (Đã gửi ${formatDate(detail.submittedAt)})` : ""
                    }`
                  : "Lộ trình đang bị tạm ẩn — không thể sửa hoặc publish."}
              </span>
            </div>
          )}

          {reorderError && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={19} />
              <div>
                <strong>Không lưu được thứ tự bài học.</strong>
                <span>{reorderError}</span>
              </div>
              <button onClick={() => setReorderError(null)}>Đã hiểu</button>
            </div>
          )}

          <section className={styles.listCard} aria-label="Danh sách bài học">
            <div className={styles.listHead}>
              <h2>Bài học</h2>
              {!frozen && (
                <div className={styles.splitButton} role="group" aria-label="Thêm bài học">
                  <button className={styles.primaryButton} onClick={() => setAddingAuthored(true)}>
                    <Plus size={16} />
                    <span>Tự soạn</span>
                  </button>
                  <button className={styles.ghostButton} onClick={() => setPicking(true)}>
                    <span>Chọn từ catalog</span>
                  </button>
                </div>
              )}
            </div>
            {units.length === 0 ? (
              <div className={styles.emptyState}>
                <Inbox size={38} />
                <h2>Chưa có bài học nào</h2>
                <p>Thêm bài học đầu tiên để bắt đầu soạn nội dung.</p>
                {!frozen && (
                  <button className={styles.primaryButton} onClick={() => setAddingAuthored(true)}>
                    <Plus size={16} />
                    <span>Thêm bài học đầu tiên</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <ul className={styles.unitList}>
                  {units.map((u, i) => (
                    <UnitRow
                      key={u.id}
                      unit={u}
                      frozen={frozen}
                      publishEnabled={approved}
                      onMoveUp={() => moveUnit(u.id, -1)}
                      onMoveDown={() => moveUnit(u.id, 1)}
                      onDragStart={(e) => e.dataTransfer.setData("text/unit-id", u.id)}
                      onDropUnit={(id) => {
                        const from = units.findIndex((x) => x.id === id);
                        if (from < 0 || from === i) return;
                        const next = [...units];
                        const [moved] = next.splice(from, 1);
                        next.splice(i, 0, moved);
                        void persistOrder(next);
                      }}
                      onOpen={() => router.push(`/teacher/learning-paths/${pathId}/units/${u.id}`)}
                      onPublish={() => setPublishTarget(u)}
                      onUnpublish={() => setUnpublishTarget(u)}
                    />
                  ))}
                </ul>
                <ul className={styles.mobileList}>
                  {units.map((u) => (
                    <li key={u.id} className={styles.mobileCard}>
                      <div className={styles.mobileCardHead}>
                        <strong>{u.title || "—"}</strong>
                        <StatusPill status={u.published ? "published" : "unpublished"} label={u.published ? "Đã publish" : "Nháp"} />
                      </div>
                      <div className={styles.mobileCardMeta}>
                        <span>HSK {u.level}</span>
                        <span>{u.kind === "authored" ? "Tự soạn" : "Tham chiếu"}</span>
                        <span>{u.wordCount ?? "—"} từ</span>
                      </div>
                      <div className={styles.mobileCardActions}>
                        <button onClick={() => moveUnit(u.id, -1)} disabled={frozen}>Lên</button>
                        <button onClick={() => moveUnit(u.id, 1)} disabled={frozen}>Xuống</button>
                        <button
                          onClick={() => (u.published ? setUnpublishTarget(u) : setPublishTarget(u))}
                          disabled={frozen || (!u.published && !approved)}
                          title={!u.published && !approved ? "Chỉ publish được khi lộ trình đã được duyệt." : undefined}
                        >
                          {u.published ? "Bỏ publish" : "Publish"}
                        </button>
                        <button onClick={() => router.push(`/teacher/learning-paths/${pathId}/units/${u.id}`)}>Mở</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {editing && detail && (
        <EditPathModal
          initialTitle={detail.title}
          initialDescription={detail.description ?? ""}
          onClose={() => setEditing(false)}
          onSave={async (title, description) => {
            const updated = await updateLearningPath(pathId, { title, description });
            setDetail((current) => (current ? { ...current, ...updated } : current));
            setEditing(false);
            flash("Đã lưu lộ trình");
          }}
        />
      )}
      {submitting && (
        <ConfirmModal
          title="Gửi duyệt lộ trình"
          description="Gửi lộ trình cho admin duyệt? Trong lúc chờ, lộ trình sẽ tạm khoá để admin duyệt đúng nội dung."
          confirmLabel="Gửi duyệt"
          onClose={() => setSubmitting(false)}
          onConfirm={() => void handleSubmit()}
        />
      )}
      {addingAuthored && (
        <AuthoredUnitModal
          onClose={() => setAddingAuthored(false)}
          onCreate={(draft) => handleCreateAuthored(draft).then(() => setAddingAuthored(false))}
        />
      )}
      {picking && (
        <ReferencePickerModal onClose={() => setPicking(false)} onPick={(u) => void handlePickReference(u)} />
      )}
      {publishTarget && (
        <ConfirmModal
          title="Publish bài học"
          description={`Bài học “${publishTarget.title || "—"}” sẽ hiển thị cho mọi học viên trên nền tảng. Nội dung đã publish không sửa được nữa — chỉ kiểm tra kỹ rồi publish.`}
          confirmLabel="Publish bài học"
          onClose={() => setPublishTarget(null)}
          onConfirm={() => void handlePublishToggle(publishTarget, true)}
        />
      )}
      {unpublishTarget && (
        <ConfirmModal
          title="Bỏ publish bài học"
          description="Bỏ publish bài học? Học viên sẽ không thấy bài này nữa. Tiến độ đã học vẫn được giữ."
          confirmLabel="Bỏ publish"
          danger
          onClose={() => setUnpublishTarget(null)}
          onConfirm={() => void handlePublishToggle(unpublishTarget, false)}
        />
      )}
      {publishBusy && <p className={styles.srOnly} role="status">Đang xử lý publish…</p>}
    </TeacherShell>
  );
}

function UnitRow({
  unit,
  frozen,
  publishEnabled,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDropUnit,
  onOpen,
  onPublish,
  onUnpublish,
}: {
  unit: LearningUnit;
  frozen: boolean;
  publishEnabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDropUnit: (id: string) => void;
  onOpen: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  return (
    <li
      className={styles.unitRow}
      onDragOver={(e) => {
        if (!frozen) e.preventDefault();
      }}
      onDrop={(e) => {
        if (frozen) return;
        e.preventDefault();
        onDropUnit(e.dataTransfer.getData("text/unit-id"));
      }}
    >
      <span
        className={styles.dragHandle}
        draggable={!frozen}
        onDragStart={onDragStart}
        aria-hidden={!frozen}
        title={frozen ? FROZEN_HINT : "Kéo để sắp xếp"}
      >
        <GripVertical size={18} />
      </span>
      <button
        type="button"
        className={styles.rowMain}
        onClick={onOpen}
        aria-label={"Mở bài học " + (unit.title || "")}
      >
        <strong>{unit.title || "—"}</strong>
        <span className={styles.rowMeta}>
          <span className={styles.levelBadge}>HSK {unit.level}</span>
          <span className={styles.kindChip}>{unit.kind === "authored" ? "Tự soạn" : "Tham chiếu"}</span>
          <span>{unit.wordCount ?? "—"} từ</span>
        </span>
      </button>
      <StatusPill status={unit.published ? "published" : "unpublished"} label={unit.published ? "Đã publish" : "Nháp"} />
      <span className={styles.rowOrder}>
        <button type="button" onClick={onMoveUp} disabled={frozen} aria-label={"Chuyển " + unit.title + " lên"}>
          <ChevronUp size={17} />
        </button>
        <button type="button" onClick={onMoveDown} disabled={frozen} aria-label={"Chuyển " + unit.title + " xuống"}>
          <ChevronDown size={17} />
        </button>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={unit.published}
        className={styles.publishToggle + (unit.published ? " " + styles.publishOn : "")}
        onClick={() => (unit.published ? onUnpublish() : onPublish())}
        disabled={frozen || (!unit.published && !publishEnabled)}
        title={frozen ? FROZEN_HINT : !unit.published && !publishEnabled ? "Chỉ publish được khi lộ trình đã được duyệt." : undefined}
        aria-label={(unit.published ? "Bỏ publish " : "Publish ") + (unit.title || "")}
      >
        <i />
      </button>
    </li>
  );
}

function EditPathModal({
  initialTitle,
  initialDescription,
  onClose,
  onSave,
}: {
  initialTitle: string;
  initialDescription: string;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: { title?: string; description?: string } = {};
    if (title.trim().length < 3) errors.title = "Tên lộ trình phải có ít nhất 3 ký tự.";
    else if (title.trim().length > 300) errors.title = "Tên lộ trình không quá 300 ký tự.";
    if (description.trim().length > 2000) errors.description = "Mô tả không quá 2000 ký tự.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSave(title.trim(), description.trim());
    } catch (err) {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details) {
        const mapped: { title?: string; description?: string } = {};
        if (err.details.title?.length) mapped.title = err.details.title.join(" ");
        if (err.details.description?.length) mapped.description = err.details.description.join(" ");
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(describeCatalogError(err));
      } else {
        // LEARNING_PATH_FROZEN included: the state changed underneath.
        setFormError(describeCatalogError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Overlay label="Sửa lộ trình" onClose={onClose} backdropClassName={styles.modalBackdrop} panelClassName={styles.modal}>
      <div className={styles.modalHead}>
        <h2>Sửa lộ trình</h2>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <label className={styles.field}>
          <span>Tên lộ trình *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={300} autoFocus />
          {fieldErrors.title && <small className={styles.fieldError}>{fieldErrors.title}</small>}
        </label>
        <label className={styles.field}>
          <span>Mô tả</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
          {fieldErrors.description && <small className={styles.fieldError}>{fieldErrors.description}</small>}
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
            {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function AuthoredUnitModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (draft: { title: string; level: number; words: LearningWord[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(3);
  const [word, setWord] = useState<LearningWord>({ hanzi: "", pinyin: "", meaning: "" });
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; word?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: { title?: string; word?: string } = {};
    if (title.trim().length < 3) errors.title = "Tên bài học phải có ít nhất 3 ký tự.";
    else if (title.trim().length > 300) errors.title = "Tên bài học không quá 300 ký tự.";
    if (!word.hanzi.trim() || !word.pinyin.trim() || !word.meaning.trim()) {
      errors.word = "Từ đầu tiên bắt buộc: Hán tự, pinyin và nghĩa đều phải có.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      // The unit API requires 1–8 words on create, so the first word is
      // collected here; the rest are written in the unit editor.
      await onCreate({
        title: title.trim(),
        level,
        words: [
          { hanzi: word.hanzi.trim(), pinyin: word.pinyin.trim(), meaning: word.meaning.trim() },
        ],
      });
    } catch (err) {
      setFormError(describeCatalogError(err));
      setSaving(false);
    }
  }

  return (
    <Overlay label="Tự soạn bài học" onClose={onClose} backdropClassName={styles.modalBackdrop} panelClassName={styles.modal}>
      <div className={styles.modalHead}>
        <h2>Tự soạn bài học</h2>
      </div>
      <form onSubmit={(e) => void handleSubmit(e)}>
        <label className={styles.field}>
          <span>Tên bài học *</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Bài 1 · Tin trong ngày"
            maxLength={300}
            autoFocus
          />
          {fieldErrors.title && <small className={styles.fieldError}>{fieldErrors.title}</small>}
        </label>
        <label className={styles.field}>
          <span>Cấp HSK *</span>
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>
                HSK {l}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={styles.wordFieldset}>
          <legend>Từ đầu tiên *</legend>
          <label className={styles.field}>
            <span>Hán tự</span>
            <input value={word.hanzi} onChange={(e) => setWord({ ...word, hanzi: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>Pinyin</span>
            <input value={word.pinyin} onChange={(e) => setWord({ ...word, pinyin: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span>Nghĩa tiếng Việt</span>
            <input value={word.meaning} onChange={(e) => setWord({ ...word, meaning: e.target.value })} />
          </label>
          {fieldErrors.word && <small className={styles.fieldError}>{fieldErrors.word}</small>}
        </fieldset>
        <p className={styles.hint}>Các từ còn lại được thêm trong màn hình soạn bài tiếp theo.</p>
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
            {saving ? "Đang tạo…" : "Tạo và soạn tiếp"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

function ReferencePickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (unit: CatalogReferenceUnit) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("");
  const [items, setItems] = useState<CatalogReferenceUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchReferenceUnits({ level: level ? Number(level) : undefined })
      .then((res) => {
        if (!isMounted) return;
        setItems(res.items);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setLoading(false);
        setError(describeCatalogError(err));
      });
    return () => {
      isMounted = false;
    };
  }, [level]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    if (!q) return items;
    return items.filter((u) => u.title.toLocaleLowerCase("vi").includes(q));
  }, [items, query]);

  return (
    <Overlay label="Chọn từ catalog" onClose={onClose} backdropClassName={styles.modalBackdrop} panelClassName={styles.modalWide}>
      <div className={styles.modalHead}>
        <h2>Chọn từ catalog</h2>
      </div>
      <p className={styles.hint}>
        Từ vựng thuộc về bài trong catalog, không được sao chép — bạn sẽ không sửa được ở đây.
      </p>
      <div className={styles.pickerFilters}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm theo tên bài…"
          aria-label="Tìm bài trong catalog"
        />
        <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Lọc theo cấp HSK">
          <option value="">Mọi cấp</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
            <option key={l} value={l}>
              HSK {l}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className={styles.hint} role="status">
          Đang tải catalog…
        </p>
      ) : error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : filtered.length === 0 ? (
        <p className={styles.hint}>Không có bài nào đã publish phù hợp.</p>
      ) : (
        <ul className={styles.pickerList}>
          {filtered.map((u) => (
            <li key={u.slug}>
              <div>
                <strong>{u.title}</strong>
                <span>
                  HSK {u.level} · {u.wordCount} từ{u.sourcePathTitle ? ` · ${u.sourcePathTitle}` : ""}
                </span>
              </div>
              <button
                type="button"
                className={styles.ghostButton}
                disabled={pickingSlug !== null}
                onClick={() => {
                  setPickingSlug(u.slug);
                  onPick(u);
                }}
              >
                {pickingSlug === u.slug ? "Đang thêm…" : "Chọn"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  );
}
