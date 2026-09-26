"use client";

import { useEffect, useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  GripVertical,
  Inbox,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  Overlay,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  contentTypeLabels,
  type ClassLesson,
  type TeacherClass,
  type LessonContentType,
} from "@/lib/teacher-data";
import { ApiError } from "@/lib/api-client";
import {
  fetchClassLessons,
  fetchTeacherClassDetail,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
} from "@/lib/teacher-service";
import {
  attachSupplement,
  fetchCatalogGrammar,
  fetchCatalogUnits,
  fetchLessonSupplements,
  removeSupplement,
  reorderSupplements,
  type CatalogGrammar,
  type CatalogUnit,
  type LessonSupplement,
  type SupplementSourceType,
} from "@/lib/teacher/teacher-supplements-service";
import { useDismissMenu } from "@/hooks/use-overlay";
import styles from "./lessons.module.css";

interface LessonDraft {
  title: string;
  description: string;
  contentType: LessonContentType;
}

export default function TeacherLessonsPage({
  params,
}: {
  params: { classId: string };
}) {
  const { classId } = params;
  const router = useRouter();
  // `cls` used to be looked up in mockTeacherClasses. Real class ids are uuids and
  // are never in that array, so every genuine class rendered the "Không tìm thấy"
  // branch — this screen was unreachable for any class that actually exists.
  const [cls, setCls] = useState<TeacherClass | null>(null);
  const [lessons, setLessons] = useState<ClassLesson[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ lesson: ClassLesson | null } | null>(null);
  const [draft, setDraft] = useState<LessonDraft>({ title: "", description: "", contentType: "document" });
  const [deleting, setDeleting] = useState<ClassLesson | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // C3: outside-click / Escape dismissal for the open row menu.
  const menuRef = useDismissMenu<HTMLSpanElement>(activeMenu !== null, () => setActiveMenu(null));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState("");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [supplements, setSupplements] = useState<Record<string, LessonSupplement[]>>({});
  const [suppLoading, setSuppLoading] = useState(false);
  const [suppError, setSuppError] = useState<{ lessonId: string; message: string } | null>(null);
  const [suppDrag, setSuppDrag] = useState<{ lessonId: string; index: number } | null>(null);
  const [picker, setPicker] = useState<{ lessonId: string } | null>(null);
  const [pickerTab, setPickerTab] = useState<'units' | 'grammar'>('units');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLevel, setPickerLevel] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerUnits, setPickerUnits] = useState<CatalogUnit[]>([]);
  const [pickerGrammar, setPickerGrammar] = useState<CatalogGrammar[]>([]);
  const [attachingKey, setAttachingKey] = useState<string | null>(null);
  const [removingSupp, setRemovingSupp] = useState<{ lessonId: string; supp: LessonSupplement } | null>(null);

  useEffect(() => {
    let isMounted = true;
    Promise.all([fetchTeacherClassDetail(classId), fetchClassLessons(classId)])
      .then(([detail, res]) => {
        if (!isMounted) return;
        setCls(detail.classItem);
        setLessons(res.lessons);
        setReviewState("ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setCls(null);
        setLessons([]);
        setReviewState("error");
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Không kết nối được máy chủ. Kiểm tra API có đang chạy không.",
        );
      });
    return () => {
      isMounted = false;
    };
  }, [classId, reloadKey]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  if (!cls) {
    const loading = reviewState === "loading";
    const failed = reviewState === "error";
    return (
      <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lớp học", href: "/teacher/classes" }, { label: "Không tìm thấy" }]}>
        <div className={styles.notFound}>
          {failed ? <AlertCircle size={38} /> : <Inbox size={38} />}
          <h2>{loading ? "Đang tải bài học" : failed ? "Không tải được bài học" : "Không tìm thấy lớp"}</h2>
          <p>{failed ? loadError : loading ? "Vui lòng đợi trong giây lát." : "Lớp này không tồn tại hoặc bạn không có quyền truy cập."}</p>
          <button className={styles.primaryButton} onClick={() => {
            if (failed) {
              setReviewState("loading");
              setLoadError(null);
              setReloadKey((key) => key + 1);
            } else {
              router.push("/teacher/classes");
            }
          }} disabled={loading}>
            <ArrowLeft size={16} />
            <span>{failed ? "Thử lại" : "Quay lại danh sách lớp"}</span>
          </button>
        </div>
      </TeacherShell>
    );
  }

  function openCreate() {
    setMutationError(null);
    setDraft({ title: "", description: "", contentType: "document" });
    setEditing({ lesson: null });
  }

  function openEdit(lesson: ClassLesson) {
    setMutationError(null);
    setDraft({
      title: lesson.title,
      description: lesson.description,
      contentType: lesson.contentType,
    });
    setEditing({ lesson });
    setActiveMenu(null);
  }

  async function submitDraft() {
    if (draft.title.trim().length < 3 || mutationPending) return;
    setMutationPending(true);
    setMutationError(null);
    try {
      if (editing?.lesson) {
        const res = await updateLesson(editing.lesson.id, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          contentType: draft.contentType,
        });
        setLessons((current) => current.map((lesson) =>
          lesson.id === res.lesson.id
            ? { ...lesson, ...res.lesson, assignmentCount: lesson.assignmentCount }
            : lesson,
        ));
        flash("Đã lưu bài học");
      } else {
        const res = await createLesson(classId, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          contentType: draft.contentType,
        });
        setLessons((current) => [...current, res.lesson]);
        flash("Đã tạo bài học");
      }
      setEditing(null);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Không lưu được bài học. Thử lại.");
    } finally {
      setMutationPending(false);
    }
  }

  async function handleDelete() {
    if (!deleting || mutationPending) return;
    setMutationPending(true);
    setMutationError(null);
    try {
      await deleteLesson(deleting.id);
      setLessons((current) => current.filter((l) => l.id !== deleting.id));
      flash("Đã xóa bài học");
      setDeleting(null);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Không xoá được bài học. Thử lại.");
    } finally {
      setMutationPending(false);
    }
  }

  async function persistReorder(next: ClassLesson[]) {
    if (mutationPending) return;
    const previous = lessons;
    setLessons(next);
    setMutationPending(true);
    setMutationError(null);
    try {
      await reorderLessons(classId, next.map((lesson, index) => ({ id: lesson.id, orderIndex: index + 1 })));
      flash("Đã đổi thứ tự bài học");
    } catch (error) {
      setLessons(previous);
      setMutationError(error instanceof Error ? error.message : "Không lưu được thứ tự bài học. Thử lại.");
    } finally {
      setMutationPending(false);
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (mutationPending || target < 0 || target >= lessons.length) return;
    const next = [...lessons];
    [next[index], next[target]] = [next[target], next[index]];
    await persistReorder(next);
  }

  async function dropOn(target: number) {
    if (mutationPending || dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    const next = [...lessons];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(target, 0, moved);
    setDragIndex(null);
    await persistReorder(next);
  }

  function supplementList(lessonId: string): LessonSupplement[] {
    return supplements[lessonId] ?? [];
  }

  async function toggleSupplements(lessonId: string) {
    if (expandedLesson === lessonId) {
      setExpandedLesson(null);
      return;
    }
    setExpandedLesson(lessonId);
    setSuppError(null);
    if (supplements[lessonId] !== undefined) return;
    setSuppLoading(true);
    try {
      const res = await fetchLessonSupplements(lessonId);
      setSupplements((current) => ({ ...current, [lessonId]: res.supplements }));
    } catch (error) {
      setSuppError({
        lessonId,
        message: error instanceof Error ? error.message : "Không tải được nội dung bổ trợ. Thử lại.",
      });
    } finally {
      setSuppLoading(false);
    }
  }

  async function loadPicker(
    tab: 'units' | 'grammar',
    filters: { search: string; level: string; category: string },
  ) {
    if (pickerLoading) return;
    setPickerLoading(true);
    setPickerError(null);
    try {
      if (tab === 'units') {
        const res = await fetchCatalogUnits({
          level: filters.level ? Number(filters.level) : undefined,
          search: filters.search.trim() || undefined,
        });
        setPickerUnits(res.units);
      } else {
        const res = await fetchCatalogGrammar({
          level: filters.level ? Number(filters.level) : undefined,
          category: filters.category || undefined,
          search: filters.search.trim() || undefined,
        });
        setPickerGrammar(res.points);
      }
    } catch (error) {
      setPickerError(error instanceof Error ? error.message : "Không tải được catalog. Thử lại.");
    } finally {
      setPickerLoading(false);
    }
  }

  function openPicker(lessonId: string) {
    setPickerError(null);
    setPickerSearch('');
    setPickerLevel('');
    setPickerCategory('');
    setPickerUnits([]);
    setPickerGrammar([]);
    setPickerTab('units');
    setPicker({ lessonId });
    void loadPicker('units', { search: '', level: '', category: '' });
  }

  async function handleAttach(sourceType: SupplementSourceType, sourceKey: string) {
    if (!picker || mutationPending) return;
    setMutationPending(true);
    setAttachingKey(sourceType + ':' + sourceKey);
    setPickerError(null);
    try {
      const res = await attachSupplement(picker.lessonId, { sourceType, sourceKey });
      setSupplements((current) => ({
        ...current,
        [picker.lessonId]: [...(current[picker.lessonId] ?? []), res.supplement].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        ),
      }));
      flash("Đã gắn nội dung bổ trợ");
    } catch (error) {
      // No fake success: a duplicate (409) or any failure stays visible here.
      setPickerError(error instanceof Error ? error.message : "Không gắn được nội dung. Thử lại.");
    } finally {
      setMutationPending(false);
      setAttachingKey(null);
    }
  }

  async function handleRemoveSupplement() {
    if (!removingSupp || mutationPending) return;
    setMutationPending(true);
    setMutationError(null);
    try {
      await removeSupplement(removingSupp.lessonId, removingSupp.supp.id);
      const gone = removingSupp.supp.id;
      const lid = removingSupp.lessonId;
      setSupplements((current) => ({
        ...current,
        [lid]: (current[lid] ?? []).filter((s) => s.id !== gone),
      }));
      flash("Đã gỡ nội dung bổ trợ");
      setRemovingSupp(null);
    } catch (error) {
      // The item stays: failed remove keeps the row, error shows in the modal.
      setMutationError(error instanceof Error ? error.message : "Không gỡ được nội dung. Thử lại.");
    } finally {
      setMutationPending(false);
    }
  }

  async function persistSuppReorder(lessonId: string, next: LessonSupplement[]) {
    if (mutationPending) return;
    const previous = supplementList(lessonId);
    setSupplements((current) => ({ ...current, [lessonId]: next }));
    setMutationPending(true);
    setMutationError(null);
    try {
      await reorderSupplements(
        lessonId,
        next.map((s, index) => ({ id: s.id, orderIndex: index + 1 })),
      );
      flash("Đã đổi thứ tự nội dung bổ trợ");
    } catch (error) {
      setSupplements((current) => ({ ...current, [lessonId]: previous }));
      setMutationError(error instanceof Error ? error.message : "Không lưu được thứ tự. Thử lại.");
    } finally {
      setMutationPending(false);
    }
  }

  async function moveSupp(lessonId: string, index: number, delta: -1 | 1) {
    const list = supplementList(lessonId);
    const target = index + delta;
    if (mutationPending || target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    await persistSuppReorder(lessonId, next);
  }

  async function dropSuppOn(lessonId: string, target: number) {
    if (mutationPending || !suppDrag || suppDrag.lessonId !== lessonId || suppDrag.index === target) {
      setSuppDrag(null);
      return;
    }
    const list = supplementList(lessonId);
    const next = [...list];
    const [moved] = next.splice(suppDrag.index, 1);
    next.splice(target, 0, moved);
    setSuppDrag(null);
    await persistSuppReorder(lessonId, next);
  }

  const valid = draft.title.trim().length >= 3;
  const crumbs = [
    { label: "Giáo viên" },
    { label: "Lớp học", href: "/teacher/classes" },
    { label: cls.name, href: "/teacher/classes/" + cls.id },
    { label: "Bài học" },
  ];

  return (
    <TeacherShell crumbs={crumbs}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>BÀI HỌC</p>
          <h1>Bài học của {cls.name}</h1>
          <p className={styles.subtitle}>
            Thứ tự dưới đây là thứ tự học sinh nhìn thấy. Kéo để sắp xếp lại.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>
          <Plus size={16} />
          <span>Thêm bài học</span>
        </button>
      </header>

      <nav className={styles.tabRow} aria-label="Phân khu của lớp">
        <Link className={styles.tab} href={"/teacher/classes/" + cls.id}>
          Học sinh
        </Link>
        <span className={styles.tab + " " + styles.tabActive}>Bài học</span>
      </nav>

      {mutationError && !editing && !deleting && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không lưu được thay đổi.</strong>
            <span>{mutationError}</span>
          </div>
          <button onClick={() => setMutationError(null)}>Đóng</button>
        </div>
      )}

      <section className={styles.listCard} aria-label="Danh sách bài học">
        {reviewState === "loading" ? (
          <div aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3].map((r) => (
              <div key={r} className={styles.skeletonRow}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : reviewState === "empty" || lessons.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={38} />
            <h2>Chưa có bài học nào</h2>
            <p>Thêm bài học đầu tiên để học sinh bắt đầu học.</p>
            <button className={styles.primaryButton} onClick={openCreate}>
              <Plus size={16} />
              <span>Thêm bài học đầu tiên</span>
            </button>
          </div>
        ) : (
          <ol className={styles.lessonList}>
            {lessons.map((lesson, i) => {
              const Icon = lesson.contentType === "video" ? Film : FileText;
              const suppList = supplementList(lesson.id);
              const suppOpen = expandedLesson === lesson.id;
              return (
              <Fragment key={lesson.id}>
                <li
                  className={
                    styles.lessonRow +
                    (dragIndex === i ? " " + styles.rowDragging : "") +
                    (reviewState === "error" ? " " + styles.rowDisabled : "")
                  }
                  draggable={!mutationPending}
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(i)}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className={styles.dragHandle} aria-hidden="true" title="Kéo để sắp xếp">
                    <GripVertical size={16} />
                  </span>
                  <span className={styles.orderNo}>{i + 1}</span>
                  <span className={styles.contentType} title={contentTypeLabels[lesson.contentType]}>
                    <Icon size={17} />
                  </span>
                  <span className={styles.lessonInfo}>
                    <strong>{lesson.title}</strong>
                    <small>
                      {lesson.description || "—"} · {lesson.assignmentCount} bài tập gắn
                    </small>
                  </span>
                  <span className={styles.rowActions}>
                    <button
                      className={styles.moveButton}
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || mutationPending}
                      aria-label={"Chuyển " + lesson.title + " lên"}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className={styles.moveButton}
                      onClick={() => move(i, 1)}
                      disabled={i === lessons.length - 1 || mutationPending}
                      aria-label={"Chuyển " + lesson.title + " xuống"}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <span className={styles.menuWrap} ref={activeMenu === lesson.id ? menuRef : undefined}>
                      <button
                        className={styles.moreButton}
                        aria-haspopup="menu"
                        aria-expanded={activeMenu === lesson.id}
                        aria-controls={"lmenu-" + lesson.id}
                        onClick={() => setActiveMenu(activeMenu === lesson.id ? null : lesson.id)}
                        aria-label={"Thao tác cho " + lesson.title}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                        {activeMenu === lesson.id && (
                          <span className={styles.actionMenu} id={"lmenu-" + lesson.id} role="menu">
                            <button onClick={() => openEdit(lesson)}>
                              <Pencil size={14} /> Sửa
                            </button>
                            <button onClick={() => { setActiveMenu(null); toggleSupplements(lesson.id); }}>
                              <Link2 size={14} /> Bổ trợ{suppList.length > 0 ? ` (${suppList.length})` : ""}
                            </button>
                            <button className={styles.dangerAction} onClick={() => { setActiveMenu(null); setDeleting(lesson); }}>
                              <Trash2 size={14} /> Xoá
                            </button>
                          </span>
                        )}
                      </span>
                    </span>
                  </li>
                  {suppOpen && (
                    <li className={styles.suppRow} aria-label={"Nội dung bổ trợ của " + lesson.title}>
                      <div className={styles.suppHead}>
                        <strong>Nội dung bổ trợ</strong>
                        <button
                          className={styles.ghostButton}
                          onClick={() => openPicker(lesson.id)}
                          disabled={mutationPending}
                        >
                          <Plus size={14} />
                          <span>Thêm từ catalog</span>
                        </button>
                      </div>
                      {suppLoading && supplements[lesson.id] === undefined ? (
                        <p className={styles.suppHint} role="status">Đang tải nội dung bổ trợ…</p>
                      ) : suppError && suppError.lessonId === lesson.id ? (
                        <div className={styles.suppError} role="alert">
                          <span>{suppError.message}</span>
                          <button onClick={() => toggleSupplements(lesson.id)}>Thử lại</button>
                        </div>
                      ) : suppList.length === 0 ? (
                        <p className={styles.suppHint}>Chưa gắn nội dung bổ trợ nào.</p>
                      ) : (
                        <ul className={styles.suppList}>
                          {suppList.map((s, si) => (
                            <li
                              key={s.id}
                              className={styles.suppItem}
                              draggable={!mutationPending}
                              onDragStart={(e) => { e.stopPropagation(); setSuppDrag({ lessonId: lesson.id, index: si }); }}
                              onDragOver={(e) => { e.stopPropagation(); e.preventDefault(); }}
                              onDrop={(e) => { e.stopPropagation(); e.preventDefault(); void dropSuppOn(lesson.id, si); }}
                              onDragEnd={() => setSuppDrag(null)}
                            >
                              <span className={styles.dragHandle} aria-hidden="true" title="Kéo để sắp xếp">
                                <GripVertical size={14} />
                              </span>
                              <span className={styles.orderNo}>{si + 1}</span>
                              <span className={styles.kindChip}>
                                {s.sourceType === 'learning_unit' ? 'Bài học' : 'Ngữ pháp'}
                              </span>
                              {s.available ? (
                                <strong className={styles.suppTitle}>{s.title}</strong>
                              ) : (
                                <span className={styles.suppUnavail}>
                                  <strong>Không khả dụng</strong>
                                  <small>Nội dung gốc đã gỡ hoặc ẩn</small>
                                </span>
                              )}
                              <span className={styles.rowActions}>
                                <button
                                  className={styles.moveButton}
                                  onClick={() => void moveSupp(lesson.id, si, -1)}
                                  disabled={si === 0 || mutationPending}
                                  aria-label={"Chuyển nội dung bổ trợ lên"}
                                >
                                  <ArrowUp size={14} />
                                </button>
                                <button
                                  className={styles.moveButton}
                                  onClick={() => void moveSupp(lesson.id, si, 1)}
                                  disabled={si === suppList.length - 1 || mutationPending}
                                  aria-label={"Chuyển nội dung bổ trợ xuống"}
                                >
                                  <ArrowDown size={14} />
                                </button>
                                <button
                                  className={styles.moveButton}
                                  onClick={() => setRemovingSupp({ lessonId: lesson.id, supp: s })}
                                  disabled={mutationPending}
                                  aria-label={"Gỡ " + (s.title || "nội dung bổ trợ")}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )}
                </Fragment>
                );
              })}
            </ol>
        )}
      </section>

      {toast && <Toast message={toast} />}
      {editing && (
        <Overlay
          label={editing.lesson ? "Sửa bài học" : "Thêm bài học"}
          onClose={() => { if (!mutationPending) setEditing(null); }}
          closeDisabled={mutationPending}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modal}
        >
            <h2>{editing.lesson ? "Sửa bài học" : "Thêm bài học"}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitDraft();
              }}
            >
              <label className={styles.field}>
                <span>Tiêu đề *</span>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="VD: Bài 6 · Mua sắm và trả giá"
                  autoFocus
                  required
                  minLength={3}
                />
              </label>
              <label className={styles.field}>
                <span>Mô tả</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={3}
                  placeholder="Nội dung chính của bài học…"
                />
              </label>
              <fieldset className={styles.field}>
                <span>Loại nội dung *</span>
                <div className={styles.contentTypePicker}>
                  {(["document", "video"] as const).map((t) => {
                    const Icon = t === "video" ? Film : FileText;
                    return (
                      <button
                        key={t}
                        type="button"
                        className={draft.contentType === t ? " " + styles.typeActive : styles.typeOption}
                        onClick={() => setDraft({ ...draft, contentType: t })}
                        aria-pressed={draft.contentType === t}
                      >
                        <Icon size={16} />
                        {contentTypeLabels[t]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              {mutationError && <p className={styles.mutationError} role="alert">{mutationError}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setEditing(null)} disabled={mutationPending}>
                  Hủy
                </button>
                <button type="submit" className={styles.primaryButton} disabled={!valid || mutationPending}>
                  {mutationPending ? "Đang lưu..." : editing.lesson ? "Lưu thay đổi" : "Thêm bài học"}
                </button>
              </div>
            </form>
          </Overlay>
      )}
      {deleting && (
        <ConfirmModal
          title="Xoá bài học"
          description={"Bài học «" + deleting.title + "» sẽ bị xoá khỏi danh sách. Hành động này không thể hoàn tác."}
          confirmLabel="Xoá bài học"
          danger
          pending={mutationPending}
          onClose={() => { if (!mutationPending) setDeleting(null); }}
          onConfirm={handleDelete}
        >
          {mutationError && <p className={styles.mutationError} role="alert">{mutationError}</p>}
        </ConfirmModal>
      )}
      {removingSupp && (
        <ConfirmModal
          title="Gỡ nội dung bổ trợ"
          description={
            removingSupp.supp.available && removingSupp.supp.title
              ? "«" + removingSupp.supp.title + "» sẽ bị gỡ khỏi bài học. Nội dung gốc trong catalog không bị xoá."
              : "Nội dung này sẽ bị gỡ khỏi bài học."
          }
          confirmLabel="Gỡ nội dung"
          danger
          pending={mutationPending}
          onClose={() => { if (!mutationPending) setRemovingSupp(null); }}
          onConfirm={handleRemoveSupplement}
        >
          {mutationError && <p className={styles.mutationError} role="alert">{mutationError}</p>}
        </ConfirmModal>
      )}
      {picker && (
        <Overlay
          label="Gắn nội dung bổ trợ"
          onClose={() => { if (!mutationPending) setPicker(null); }}
          closeDisabled={mutationPending}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modalWide}
        >
          <h2>Gắn nội dung bổ trợ</h2>
          <p className={styles.pickerHint}>Chỉ hiện nội dung đã publish trong catalog.</p>
          <div className={styles.pickerTabs} role="tablist" aria-label="Loại nội dung">
            {(['units', 'grammar'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={pickerTab === t}
                className={pickerTab === t ? styles.pickerTabActive : styles.pickerTab}
                disabled={mutationPending}
                onClick={() => {
                  setPickerTab(t);
                  setPickerError(null);
                  void loadPicker(t, { search: pickerSearch, level: pickerLevel, category: pickerCategory });
                }}
              >
                {t === 'units' ? 'Bài học' : 'Ngữ pháp'}
              </button>
            ))}
          </div>
          <form
            className={styles.pickerFilters}
            onSubmit={(e) => {
              e.preventDefault();
              void loadPicker(pickerTab, { search: pickerSearch, level: pickerLevel, category: pickerCategory });
            }}
          >
            <label className={styles.pickerSearch}>
              <Search size={15} />
              <input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Tìm theo tên…"
                aria-label="Tìm trong catalog"
              />
            </label>
            <select
              value={pickerLevel}
              onChange={(e) => {
                setPickerLevel(e.target.value);
                void loadPicker(pickerTab, { search: pickerSearch, level: e.target.value, category: pickerCategory });
              }}
              aria-label="Lọc theo cấp HSK"
            >
              <option value="">Mọi cấp</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                <option key={l} value={l}>HSK {l}</option>
              ))}
            </select>
            {pickerTab === 'grammar' && (
              <select
                value={pickerCategory}
                onChange={(e) => {
                  setPickerCategory(e.target.value);
                  void loadPicker(pickerTab, { search: pickerSearch, level: pickerLevel, category: e.target.value });
                }}
                aria-label="Lọc theo nhóm ngữ pháp"
              >
                <option value="">Mọi nhóm</option>
                {Array.from(new Set(pickerGrammar.map((g) => g.category).filter(Boolean))).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <button type="submit" className={styles.ghostButton} disabled={pickerLoading}>
              <Search size={14} />
              <span>Tìm</span>
            </button>
          </form>
          {pickerError && <p className={styles.mutationError} role="alert">{pickerError}</p>}
          {pickerLoading ? (
            <p className={styles.suppHint} role="status">Đang tải catalog…</p>
          ) : (pickerTab === 'units' ? pickerUnits.length === 0 : pickerGrammar.length === 0) ? (
            <p className={styles.suppHint}>Không tìm thấy nội dung phù hợp.</p>
          ) : (
            <ul className={styles.pickerList}>
              {(pickerTab === 'units'
                ? pickerUnits.map((u) => ({ key: 'learning_unit:' + u.slug, title: u.title, meta: 'HSK ' + u.level, type: 'learning_unit' as const, sourceKey: u.slug }))
                : pickerGrammar.map((g) => ({ key: 'grammar_point:' + g.id, title: g.name, meta: 'HSK ' + g.level + (g.category ? ' · ' + g.category : ''), type: 'grammar_point' as const, sourceKey: g.id }))
              ).map((item) => {
                const attached = picker && supplementList(picker.lessonId).some(
                  (s) => s.sourceType === item.type && s.sourceKey === item.sourceKey,
                );
                const busy = attachingKey === item.key;
                return (
                  <li key={item.key} className={styles.pickerRow}>
                    <span className={styles.pickerInfo}>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </span>
                    <button
                      type="button"
                      className={styles.ghostButton}
                      disabled={mutationPending || attached}
                      title={attached ? "Đã gắn vào bài học" : undefined}
                      onClick={() => void handleAttach(item.type, item.sourceKey)}
                    >
                      {busy ? "Đang gắn…" : attached ? "Đã gắn" : "Gắn"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={() => setPicker(null)} disabled={mutationPending}>
              Đóng
            </button>
          </div>
        </Overlay>
      )}
    </TeacherShell>
  );
}
