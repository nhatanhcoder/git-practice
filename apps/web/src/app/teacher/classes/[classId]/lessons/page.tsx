"use client";

// MOCK(T-LESSON-1,2,4,5): every lesson action is local-only. API_TEACHER.md has no
// Lessons section at all — see the contract's "Blocked on" and KNOWN_ISSUES API-007.
// Do NOT wire these to real endpoints until a Lessons API exists.

import { useState } from "react";
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
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  ReviewSwitcher,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  contentTypeLabels,
  mockClassLessons,
  mockTeacherClasses,
  type ClassLesson,
  type LessonContentType,
} from "@/lib/teacher-data";
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
  const cls = mockTeacherClasses.find((c) => c.id === classId) ?? null;
  const [lessons, setLessons] = useState<ClassLesson[]>(cls ? mockClassLessons[cls.id] ?? [] : []);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [editing, setEditing] = useState<{ lesson: ClassLesson | null } | null>(null);
  const [draft, setDraft] = useState<LessonDraft>({ title: "", description: "", contentType: "document" });
  const [deleting, setDeleting] = useState<ClassLesson | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // C3: outside-click / Escape dismissal for the open row menu.
  const menuRef = useDismissMenu<HTMLSpanElement>(activeMenu !== null, () => setActiveMenu(null));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  if (!cls) {
    return (
      <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lớp học", href: "/teacher/classes" }, { label: "Không tìm thấy" }]}>
        <div className={styles.notFound}>
          <Inbox size={38} />
          <h2>Không tìm thấy lớp</h2>
          <p>Lớp này không tồn tại hoặc bạn không có quyền truy cập.</p>
          <button className={styles.primaryButton} onClick={() => router.push("/teacher/classes")}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách lớp</span>
          </button>
        </div>
      </TeacherShell>
    );
  }

  function openCreate() {
    setDraft({ title: "", description: "", contentType: "document" });
    setEditing({ lesson: null });
  }

  function openEdit(lesson: ClassLesson) {
    setDraft({
      title: lesson.title,
      description: lesson.description,
      contentType: lesson.contentType,
    });
    setEditing({ lesson });
    setActiveMenu(null);
  }

  function submitDraft() {
    if (draft.title.trim().length < 3) return;
    // MOCK(⛔): no endpoint — POST/PATCH lessons do not exist in API_TEACHER.md
    if (editing?.lesson) {
      setLessons((current) =>
        current.map((l) => (l.id === editing.lesson!.id ? { ...l, ...draft, title: draft.title.trim(), description: draft.description.trim() } : l)),
      );
      flash("Đã lưu bài học");
    } else {
      setLessons((current) => [
        ...current,
        {
          id: "l-" + Date.now(),
          title: draft.title.trim(),
          description: draft.description.trim(),
          contentType: draft.contentType,
          assignmentCount: 0,
        },
      ]);
      flash("Đã thêm bài học vào cuối danh sách");
    }
    setEditing(null);
  }

  function handleDelete() {
    if (!deleting) return;
    // MOCK(⛔): no endpoint — DELETE lessons does not exist in API_TEACHER.md
    setLessons((current) => current.filter((l) => l.id !== deleting.id));
    flash("Đã xoá bài học");
    setDeleting(null);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= lessons.length) return;
    // MOCK(⛔): no endpoint — reorder does not exist in API_TEACHER.md
    setLessons((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropOn(target: number) {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    // MOCK(⛔): optimistic reorder, no failure path while mocked
    setLessons((current) => {
      const next = [...current];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDragIndex(null);
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

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được danh sách bài học.</strong>
            <span>Thao tác sắp xếp bị tắt cho đến khi tải thành công.</span>
          </div>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
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
              return (
                <li
                  key={lesson.id}
                  className={
                    styles.lessonRow +
                    (dragIndex === i ? " " + styles.rowDragging : "") +
                    (reviewState === "error" ? " " + styles.rowDisabled : "")
                  }
                  draggable={reviewState !== "error"}
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
                      disabled={i === 0 || reviewState === "error"}
                      aria-label={"Chuyển " + lesson.title + " lên"}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className={styles.moveButton}
                      onClick={() => move(i, 1)}
                      disabled={i === lessons.length - 1 || reviewState === "error"}
                      aria-label={"Chuyển " + lesson.title + " xuống"}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <span className={styles.menuWrap}>
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
                          <button className={styles.dangerAction} onClick={() => { setActiveMenu(null); setDeleting(lesson); }}>
                            <Trash2 size={14} /> Xoá
                          </button>
                        </span>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {editing && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={editing.lesson ? "Sửa bài học" : "Thêm bài học"}>
          <div className={styles.modal}>
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
              <p className={styles.hint}>⚠ MOCK: hành động này chưa có API — dữ liệu chỉ nằm trong trình duyệt.</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setEditing(null)}>
                  Hủy
                </button>
                <button type="submit" className={styles.primaryButton} disabled={!valid}>
                  {editing.lesson ? "Lưu thay đổi" : "Thêm bài học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deleting && (
        <ConfirmModal
          title="Xoá bài học"
          description={"Bài học «" + deleting.title + "» sẽ bị xoá khỏi danh sách. Hành động này không thể hoàn tác."}
          confirmLabel="Xoá bài học"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
        >
          <p className={styles.warnNote}>
            ⚠ MOCK + chưa xác nhận nghiệp vụ: việc bài tập gắn với bài học ({deleting.assignmentCount}) có chặn xoá
            hay không chưa được ghi nhận ở đâu — xem contract teacher-lessons-list.md.
          </p>
        </ConfirmModal>
      )}
    </TeacherShell>
  );
}
