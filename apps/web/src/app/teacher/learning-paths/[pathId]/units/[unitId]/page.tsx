"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, GripVertical, Plus, X } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  deleteUnit,
  describeCatalogError,
  fetchLearningPathDetail,
  publishUnit,
  unpublishUnit,
  updateUnit,
  type LearningPathDetail,
  type LearningUnit,
  type LearningWord,
} from "@/lib/teacher/learning-catalog-service";
import { ApiError } from "@/lib/api-client";
import styles from "./editor.module.css";

const MAX_WORDS = 8;

function wordsKey(words: LearningWord[]): string {
  return JSON.stringify(words.map((w) => [w.hanzi.trim(), w.pinyin.trim(), w.meaning.trim()]));
}

export default function TeacherLearningUnitEditorPage({
  params,
}: {
  params: { pathId: string; unitId: string };
}) {
  const { pathId, unitId } = params;
  const router = useRouter();
  const parentHref = `/teacher/learning-paths/${pathId}`;

  const [path, setPath] = useState<LearningPathDetail | null>(null);
  const [unit, setUnit] = useState<LearningUnit | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState(3);
  const [words, setWords] = useState<LearningWord[]>([]);
  const [baseline, setBaseline] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingUnpublish, setConfirmingUnpublish] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function missing() {
    router.replace("/teacher/learning-paths?notice=unit-missing");
  }

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);
    fetchLearningPathDetail(pathId)
      .then((res) => {
        if (!isMounted) return;
        const found = (res.units ?? []).find((u) => u.id === unitId) ?? null;
        if (!found) {
          missing();
          return;
        }
        setPath(res);
        setUnit(found);
        setTitle(found.title);
        setLevel(found.level);
        const loaded: LearningWord[] = (found.words ?? []).map((w) => ({ ...w }));
        setWords(loaded);
        setBaseline(
          JSON.stringify({ title: found.title, level: found.level, words: wordsKey(loaded) }),
        );
        setFieldErrors({});
        setFormError(null);
        setReviewState("ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        if (
          err instanceof ApiError &&
          (err.code === "LEARNING_PATH_NOT_FOUND" || err.code === "LEARNING_PATH_ACCESS_DENIED")
        ) {
          router.replace("/teacher/learning-paths?notice=path-missing");
          return;
        }
        setPath(null);
        setUnit(null);
        setReviewState("error");
        setLoadError(describeCatalogError(err));
      });
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathId, unitId, refreshKey]);

  const frozen = path?.status === "pending_review" || path?.status === "suspended";
  const isReference = unit?.kind === "reference";
  const published = unit?.published ?? false;

  const dirtyKey = useMemo(
    () => JSON.stringify({ title, level, words: wordsKey(words) }),
    [title, level, words],
  );
  const dirty = dirtyKey !== baseline;
  const overLimit = words.length > MAX_WORDS;

  // Warn once about leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirtyKey, baseline, saving, title, level, words, unit]);

  function validateLocal(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!unit || isReference) return errors;
    if (title.trim().length < 3) errors.title = "Tên bài học phải có ít nhất 3 ký tự.";
    else if (title.trim().length > 300) errors.title = "Tên bài học không quá 300 ký tự.";
    if (level < 1 || level > 9) errors.level = "Cấp HSK phải từ 1 đến 9.";
    const seen = new Map<string, number>();
    words.forEach((w, i) => {
      if (!w.hanzi.trim()) errors[`words.${i}.hanzi`] = "Hán tự không được để trống.";
      if (!w.pinyin.trim()) errors[`words.${i}.pinyin`] = "Pinyin không được để trống.";
      if (!w.meaning.trim()) errors[`words.${i}.meaning`] = "Nghĩa không được để trống.";
      const key = w.hanzi.trim();
      if (key) {
        if (seen.has(key)) {
          errors[`words.${i}.hanzi`] = `Hán tự này đã có ở dòng ${(seen.get(key) ?? 0) + 1}`;
        } else {
          seen.set(key, i);
        }
      }
    });
    return errors;
  }

  async function save() {
    if (!unit || isReference || published || frozen || saving) return;
    if (!dirty || overLimit) return;
    const localErrors = validateLocal();
    setFieldErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;
    setSaving(true);
    setFormError(null);
    try {
      // Send only the changed fields; the bar returns to clean on success.
      const loaded = JSON.parse(baseline) as { title: string; level: number; words: string };
      const patch: { title?: string; level?: number; words?: LearningWord[] } = {};
      if (title.trim() !== loaded.title) patch.title = title.trim();
      if (level !== loaded.level) patch.level = level;
      if (wordsKey(words) !== loaded.words) {
        patch.words = words.map((w) => ({
          hanzi: w.hanzi.trim(),
          pinyin: w.pinyin.trim(),
          meaning: w.meaning.trim(),
        }));
      }
      const updated = await updateUnit(unit.id, patch);
      setUnit(updated);
      if (updated.words) setWords(updated.words.map((w) => ({ ...w })));
      setTitle(updated.title);
      setLevel(updated.level);
      setBaseline(
        JSON.stringify({
          title: updated.title,
          level: updated.level,
          words: wordsKey(updated.words ?? words),
        }),
      );
      setFieldErrors({});
      flash("Đã lưu bài học");
    } catch (err) {
      // Failure keeps the typed values on screen and states the error —
      // never a success toast.
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details) {
        const mapped: Record<string, string> = {};
        for (const [field, messages] of Object.entries(err.details)) {
          if (messages.length) mapped[field] = messages.join(" ");
        }
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(describeCatalogError(err));
      } else {
        setFormError(describeCatalogError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  function updateWord(i: number, patch: Partial<LearningWord>) {
    setWords((current) => current.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  }

  function removeWord(i: number) {
    setWords((current) => current.filter((_, idx) => idx !== i));
  }

  function moveWord(from: number, to: number) {
    if (to < 0 || to >= words.length) return;
    setWords((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function handlePublish() {
    if (!unit) return;
    setMutating(true);
    try {
      const updated = await publishUnit(unit.id);
      setUnit(updated);
      setConfirmingPublish(false);
      flash("Đã publish");
    } catch (err) {
      setConfirmingPublish(false);
      setFormError(describeCatalogError(err));
    } finally {
      setMutating(false);
    }
  }

  async function handleUnpublish() {
    if (!unit) return;
    setMutating(true);
    try {
      const updated = await unpublishUnit(unit.id);
      setUnit(updated);
      // Words stay as stored; only the flag flips (INV-LCAT-14).
      if (updated.words) {
        setWords(updated.words.map((w) => ({ ...w })));
        setBaseline(
          JSON.stringify({ title: updated.title, level: updated.level, words: wordsKey(updated.words) }),
        );
      }
      setConfirmingUnpublish(false);
      flash("Đã bỏ publish");
    } catch (err) {
      setConfirmingUnpublish(false);
      setFormError(describeCatalogError(err));
    } finally {
      setMutating(false);
    }
  }

  async function handleDelete() {
    if (!unit) return;
    setMutating(true);
    try {
      await deleteUnit(unit.id);
      router.replace(parentHref);
    } catch (err) {
      setConfirmingDelete(false);
      setFormError(describeCatalogError(err));
    } finally {
      setMutating(false);
    }
  }

  const inputsDisabled = frozen || published || saving;
  const pathApproved = path?.status === "approved";

  return (
    <TeacherShell
      crumbs={[
        { label: "Giáo viên" },
        { label: "Lộ trình học", href: "/teacher/learning-paths" },
        { label: path?.title || "…", href: parentHref },
        { label: unit?.title || "Bài học" },
      ]}
    >
      {reviewState === "loading" ? (
        <div aria-busy="true" aria-label="Đang tải">
          <div className={styles.skeletonHead} />
          {[1, 2, 3, 4].map((r) => (
            <div key={r} className={styles.skeletonRow}>
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : reviewState === "error" || !unit || !path ? (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được bài học.</strong>
            <span>{loadError}</span>
          </div>
          <button onClick={() => setRefreshKey((k) => k + 1)}>Thử lại</button>
        </div>
      ) : (
        <>
          <header className={styles.titleRow}>
            <div>
              <Link className={styles.backLink} href={parentHref}>
                <ArrowLeft size={15} /> {path.title || "—"}
              </Link>
              <h1>{unit.title || "Bài học"}</h1>
              <p className={styles.subtitle}>
                <span className={styles.levelBadge}>HSK {unit.level}</span>
                <StatusPill status={published ? "published" : "unpublished"} label={published ? "Đã publish" : "Nháp"} />
                <span>{unit.kind === "authored" ? "Tự soạn" : "Tham chiếu"}</span>
              </p>
            </div>
            {!published && !isReference && (
              <button
                className={styles.primaryButton}
                onClick={() => setConfirmingPublish(true)}
                disabled={frozen || !pathApproved}
                title={!pathApproved ? "Chỉ publish được khi lộ trình đã được duyệt." : undefined}
              >
                Publish
              </button>
            )}
          </header>

          {frozen && (
            <div className={styles.frozenBanner} role="status">
              <AlertCircle size={19} />
              <span>
                {path.status === "pending_review"
                  ? "Lộ trình đang chờ admin duyệt — tạm thời không sửa được."
                  : "Lộ trình đang bị tạm ẩn — không thể sửa hoặc publish."}
              </span>
            </div>
          )}

          {published && (
            <div className={styles.publishedBanner} role="status">
              <AlertCircle size={19} />
              <div>
                <p>Bài học đã publish nên không sửa được nội dung. Tiến độ học viên đang gắn với bài này.</p>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => setConfirmingUnpublish(true)}
                  disabled={frozen}
                  title={frozen ? "Lộ trình đang bị khoá nên tạm thời không bỏ publish được." : undefined}
                >
                  Bỏ publish để sửa
                </button>
              </div>
            </div>
          )}

          {isReference ? (
            <section className={styles.referencePanel} aria-label="Bài tham chiếu">
              <h2>Bài tham chiếu</h2>
              <p>Bài học này dùng từ vựng của một bài có sẵn trong catalog — không sửa được ở đây.</p>
              <dl>
                <div>
                  <dt>Mã tham chiếu</dt>
                  <dd>
                    <code>{unit.referenceSlug ?? "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt>Số từ</dt>
                  <dd>{unit.wordCount ?? "—"}</dd>
                </div>
              </dl>
            </section>
          ) : (
            <section className={styles.editorCard} aria-label="Soạn từ vựng">
              <p className={styles.quizNote}>Câu hỏi luyện tập được tạo tự động từ các từ ở trên.</p>
              {overLimit && (
                <p className={styles.formError} role="alert">
                  Bài học có hơn {MAX_WORDS} từ — hãy xoá bớt trước khi lưu.
                </p>
              )}
              <ul className={styles.wordList}>
                {words.map((w, i) => (
                  <li key={i} className={styles.wordRow}>
                    <span className={styles.wordIndex}>{i + 1}</span>
                    <label>
                      <span>Hán tự</span>
                      <input
                        value={w.hanzi}
                        onChange={(e) => updateWord(i, { hanzi: e.target.value })}
                        disabled={inputsDisabled}
                        aria-invalid={Boolean(fieldErrors[`words.${i}.hanzi`])}
                      />
                      {fieldErrors[`words.${i}.hanzi`] && (
                        <small className={styles.fieldError}>{fieldErrors[`words.${i}.hanzi`]}</small>
                      )}
                    </label>
                    <label>
                      <span>Pinyin</span>
                      <input
                        value={w.pinyin}
                        onChange={(e) => updateWord(i, { pinyin: e.target.value })}
                        disabled={inputsDisabled}
                        aria-invalid={Boolean(fieldErrors[`words.${i}.pinyin`])}
                      />
                      {fieldErrors[`words.${i}.pinyin`] && (
                        <small className={styles.fieldError}>{fieldErrors[`words.${i}.pinyin`]}</small>
                      )}
                    </label>
                    <label>
                      <span>Nghĩa tiếng Việt</span>
                      <input
                        value={w.meaning}
                        onChange={(e) => setWords((current) =>
                          current.map((row, idx) => (idx === i ? { ...row, meaning: e.target.value } : row)),
                        )}
                        disabled={inputsDisabled}
                        aria-invalid={Boolean(fieldErrors[`words.${i}.meaning`])}
                      />
                      {fieldErrors[`words.${i}.meaning`] && (
                        <small className={styles.fieldError}>{fieldErrors[`words.${i}.meaning`]}</small>
                      )}
                    </label>
                    <span className={styles.wordControls}>
                      <button
                        type="button"
                        draggable={!inputsDisabled}
                        onDragStart={(e) => e.dataTransfer.setData("text/word-index", String(i))}
                        onDragOver={(e) => {
                          if (!inputsDisabled) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          if (inputsDisabled) return;
                          e.preventDefault();
                          moveWord(Number(e.dataTransfer.getData("text/word-index")), i);
                        }}
                        aria-label={`Sắp xếp từ dòng ${i + 1}`}
                        title="Kéo để sắp xếp"
                        disabled={inputsDisabled}
                      >
                        <GripVertical size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeWord(i)}
                        disabled={inputsDisabled}
                        aria-label={`Xoá dòng ${i + 1}`}
                      >
                        <X size={17} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              {words.length === 0 && (
                <div className={styles.addPrompt}>
                  <p>Chưa có từ nào — thêm từ đầu tiên để bắt đầu.</p>
                </div>
              )}
              <button
                type="button"
                className={styles.ghostButton}
                onClick={() => setWords((current) => [...current, { hanzi: "", pinyin: "", meaning: "" }])}
                disabled={inputsDisabled || words.length >= MAX_WORDS}
                title={words.length >= MAX_WORDS ? "Tối đa 8 từ mỗi bài học." : undefined}
              >
                <Plus size={16} />
                <span>Thêm từ</span>
              </button>

              <div className={styles.metaFields}>
                <label className={styles.field}>
                  <span>Tên bài học *</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={inputsDisabled}
                    maxLength={300}
                    aria-invalid={Boolean(fieldErrors.title)}
                  />
                  {fieldErrors.title && <small className={styles.fieldError}>{fieldErrors.title}</small>}
                </label>
                <label className={styles.field}>
                  <span>Cấp độ HSK *</span>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    disabled={inputsDisabled}
                    aria-invalid={Boolean(fieldErrors.level)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                      <option key={l} value={l}>
                        HSK {l}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.level && <small className={styles.fieldError}>{fieldErrors.level}</small>}
                </label>
              </div>

              {formError && (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              )}

              <div className={styles.saveBar}>
                <span className={styles.dirtyNote} role="status">
                  {dirty ? "Có thay đổi chưa lưu" : ""}
                </span>
                <span className={styles.saveActions}>
                  {!published && (
                    <button
                      type="button"
                      className={styles.dangerGhost}
                      onClick={() => setConfirmingDelete(true)}
                      disabled={frozen || saving}
                    >
                      Xoá bài học
                    </button>
                  )}
                  {published && (
                    <button
                      type="button"
                      className={styles.ghostButton}
                      onClick={() => setConfirmingUnpublish(true)}
                      disabled={frozen || saving}
                    >
                      Bỏ publish
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => void save()}
                    disabled={!dirty || saving || overLimit || frozen || published}
                  >
                    {saving ? "Đang lưu…" : "Lưu"}
                  </button>
                </span>
              </div>
            </section>
          )}

          {isReference && (
            <div className={styles.saveBar}>
              <span />
              <span className={styles.saveActions}>
                {!published && (
                  <button
                    type="button"
                    className={styles.dangerGhost}
                    onClick={() => setConfirmingDelete(true)}
                    disabled={frozen}
                  >
                    Xoá bài học
                  </button>
                )}
                {published && (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => setConfirmingUnpublish(true)}
                    disabled={frozen}
                  >
                    Bỏ publish
                  </button>
                )}
              </span>
            </div>
          )}
        </>
      )}

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {confirmingPublish && (
        <ConfirmModal
          title="Publish bài học"
          description="Bài học sẽ hiển thị cho mọi học viên trên nền tảng, không chỉ một lớp. Nội dung đã publish không sửa được nữa — kiểm tra kỹ rồi publish."
          confirmLabel="Publish bài học"
          onClose={() => setConfirmingPublish(false)}
          onConfirm={() => void handlePublish()}
        />
      )}
      {confirmingUnpublish && (
        <ConfirmModal
          title="Bỏ publish bài học"
          description="Bỏ publish bài học? Học viên sẽ không thấy bài này nữa. Tiến độ đã học vẫn được giữ."
          confirmLabel="Bỏ publish"
          danger
          onClose={() => setConfirmingUnpublish(false)}
          onConfirm={() => void handleUnpublish()}
        />
      )}
      {confirmingDelete && (
        <ConfirmModal
          title="Xoá bài học"
          description="Xoá bài học này? Hành động không thể hoàn tác."
          confirmLabel="Xoá bài học"
          danger
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => void handleDelete()}
        />
      )}
      {mutating && <p className={styles.srOnly} role="status">Đang xử lý…</p>}
    </TeacherShell>
  );
}
