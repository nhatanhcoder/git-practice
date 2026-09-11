"use client";

// Live against /api/v1/teacher/assignments (03-assignments spec, S3 backend).
// Edit/delete stay gated by real submission counts (T-ASGN-5): the server
// enforces INV-TASG-04 with 409 ASSIGNMENT_ALREADY_SUBMITTED and the UI
// mirrors the same gate so the button is not even offered once attempts exist.

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Inbox,
  MoreHorizontal,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  Overlay,
  ReviewSwitcher,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  assignmentTypeLabels,
  type Assignment,
  type AssignmentType,
} from "@/lib/teacher/assignment-data";
import type { Question } from "@/lib/teacher/question-data";
import {
  createAssignment,
  deleteAssignment,
  describeAssignmentError,
  fetchAssignmentDetail,
  fetchAssignments,
  updateAssignment,
} from "@/lib/teacher/teacher-assignments-service";
import { fetchQuestions } from "@/lib/teacher/question-service";
import { fetchTeacherClasses } from "@/lib/teacher-service";
import { useDismissMenu } from "@/hooks/use-overlay";
import { assignmentTimeLimitValid, questionIdsForClass } from "@/lib/teacher/teacher-rules.js";
import { formatDate } from "@/lib/formatters";
import styles from "./assignments.module.css";

type Step = 1 | 2;

interface Draft {
  title: string;
  type: AssignmentType;
  classId: string;
  dueDate: string;
  timeLimitMinutes: string;
  questionIds: string[];
}

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<AssignmentType | "all">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [editing, setEditing] = useState<Assignment | null | undefined>(undefined); // undefined closed, null create
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [stats, setStats] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState<Assignment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  // C3: outside-click / Escape dismissal for the open row menu.
  const menuRef = useDismissMenu<HTMLTableCellElement>(activeMenu !== null, () => setActiveMenu(null));
  const [toast, setToast] = useState("");

  // Real data, replacing the MOCK fixtures: own classes (active only) and the
  // teacher's question bank, plus the assignments list itself.
  const [ownClasses, setOwnClasses] = useState<{ id: string; name: string; hskLevel: number }[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [assignmentRows, classRows, questionRows] = await Promise.all([
          fetchAssignments(),
          fetchTeacherClasses(),
          fetchQuestions({}),
        ]);
        if (cancelled) return;
        setAssignments(assignmentRows);
        setOwnClasses(
          classRows.classes
            .filter((c) => c.status === "active")
            .map((c) => ({ id: c.id, name: c.name, hskLevel: c.hskLevel })),
        );
        setBankQuestions(questionRows.questions);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLoadError(describeAssignmentError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      assignments
        .filter((a) => classFilter === "all" || a.classId === classFilter)
        .filter((a) => typeFilter === "all" || a.type === typeFilter),
    [assignments, classFilter, typeFilter],
  );

  const hasFilters = classFilter !== "all" || typeFilter !== "all";
  const display = reviewState === "empty" ? [] : filtered;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function openCreate() {
    setDraft(emptyDraft());
    setStep(1);
    setEditing(null);
  }

  function openEdit(a: Assignment) {
    setActiveMenu(null);
    // C1 follow-up: a stored assignment can hold ids that do not match its class HSK — either
    // from legacy data or from a class change made before pruning existed. Prune on open, so the
    // count, the checkboxes and what gets saved all agree.
    const cls = ownClasses.find((c) => c.id === a.classId) ?? null;
    const kept = questionIdsForClass(a.questionIds, cls?.hskLevel ?? null, bankQuestions);
    if (kept.length !== a.questionIds.length) {
      flash("Đã bỏ " + (a.questionIds.length - kept.length) + " câu hỏi không thuộc HSK của lớp");
    }
    setDraft({
      title: a.title,
      type: a.type,
      classId: a.classId,
      dueDate: a.dueDate,
      timeLimitMinutes: a.timeLimitMinutes ? String(a.timeLimitMinutes) : "",
      questionIds: kept,
    });
    setStep(1);
    setEditing(a);
  }

  async function submitDraft() {
    if (!draft.title.trim() || !draft.classId || !draft.dueDate) return;
    // B1: guard the write too, not just the step-1 button.
    if (!timeLimitValid(draft)) return;
    const cls = ownClasses.find((c) => c.id === draft.classId);
    // C1 follow-up: never persist an id outside the class HSK, whatever the draft happens to hold.
    const questionIds = questionIdsForClass(draft.questionIds, cls?.hskLevel ?? null, bankQuestions);
    if (questionIds.length === 0) return;
    // homework always stores null; mock_test stores the validated integer.
    const timeLimit = draft.type === "mock_test" ? Number(draft.timeLimitMinutes) : null;

    // One write in flight at a time; a double-click must not create two
    // assignments (the same ref-lock lesson as the A09 leave flow).
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        title: draft.title.trim(),
        type: draft.type,
        classId: draft.classId,
        dueDate: new Date(draft.dueDate).toISOString(),
        timeLimitMinutes: timeLimit,
        questionIds,
      };
      if (editing) {
        const updated = await updateAssignment(editing.id, payload);
        setAssignments((current) =>
          current.map((a) =>
            a.id === editing.id
              ? { ...updated, className: cls?.name ?? updated.className, hskLevel: cls?.hskLevel ?? 0 }
              : a,
          ),
        );
        flash("Đã lưu bài tập");
      } else {
        const created = await createAssignment(payload);
        setAssignments((current) => [
          { ...created, className: cls?.name ?? "", hskLevel: cls?.hskLevel ?? 1 },
          ...current,
        ]);
        flash("Đã tạo bài tập");
      }
      setEditing(undefined);
    } catch (err) {
      flash(describeAssignmentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await deleteAssignment(deleting.id);
      setAssignments((current) => current.filter((a) => a.id !== deleting.id));
      flash("Đã xoá bài tập");
      setDeleting(null);
    } catch (err) {
      flash(describeAssignmentError(err));
    } finally {
      setSubmitting(false);
    }
  }

  // B1: ENTITY_ASSIGNMENT — `timeLimitMinutes` is required when type = mock_test.
  // Shared by the step-1 gate and submitDraft so the two cannot disagree.
  const timeLimitValid = (d: Draft) => assignmentTimeLimitValid(d.type, d.timeLimitMinutes);

  // C1: the picker hint always claimed "đã lọc theo HSK của lớp" but rendered every question.
  // Filter for real, from the class currently chosen in the draft.
  const selectedClass = ownClasses.find((c) => c.id === draft.classId) ?? null;
  const eligibleQuestions = useMemo(
    () => (selectedClass ? bankQuestions.filter((q) => q.hskLevel === selectedClass.hskLevel) : []),
    [selectedClass],
  );

  const step1Valid =
    draft.title.trim().length >= 3 && !!draft.classId && !!draft.dueDate && timeLimitValid(draft);
  // C1 follow-up: count only ids the picker can actually show. Counting hidden ids let the
  // save button enable with zero visible checkboxes.
  const eligibleSelectedIds = questionIdsForClass(
    draft.questionIds,
    selectedClass?.hskLevel ?? null,
    bankQuestions,
  );
  const step2Valid = eligibleSelectedIds.length > 0;

  // T-ASGN-4: submission stats are derived server-side from Attempt records
  // (INV-TASG-07) — fetch the detail, never a fixture roster.
  async function openStats(a: Assignment) {
    try {
      const detail = await fetchAssignmentDetail(a.id);
      setStats(detail);
    } catch (err) {
      flash(describeAssignmentError(err));
    }
  }

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Bài tập & Đề" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>BÀI TẬP & ĐỀ THI</p>
          <h1>Bài tập của tôi</h1>
          <p className={styles.subtitle}>
            {assignments.filter((a) => a.pendingGradingCount > 0).reduce((s, a) => s + a.pendingGradingCount, 0)} bài chờ chấm
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate}>
          <Plus size={16} />
          <span>Tạo bài tập</span>
        </button>
      </header>

      <section className={styles.filterCard} aria-label="Bộ lọc bài tập">
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Lớp học</span>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">Tất cả các lớp</option>
            {ownClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Loại</span>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AssignmentType | "all")}>
            <option value="all">Tất cả</option>
            <option value="homework">Bài tập</option>
            <option value="mock_test">Đề thi thử</option>
          </select>
        </label>
        <div className={styles.filterMeta}>
          {hasFilters && (
            <button className={styles.clearButton} onClick={() => { setClassFilter("all"); setTypeFilter("all"); setReviewState("ready"); }}>
              Xóa lọc
            </button>
          )}
          <span>{display.length} bài tập</span>
        </div>
      </section>

      {(reviewState === "error" || loadError) && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được danh sách bài tập.</strong>
            <span>{loadError ?? "Vui lòng kiểm tra kết nối và thử lại."}</span>
          </div>
          <button onClick={() => { setReviewState("ready"); setLoadError(null); window.location.reload(); }}>Thử lại</button>
        </div>
      )}

      <section className={styles.tableCard} aria-label="Danh sách bài tập">
        {reviewState === "loading" || loading ? (
          <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4].map((r) => <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>)}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={38} />
            <h2>{hasFilters ? "Không có bài tập phù hợp" : "Chưa có bài tập nào"}</h2>
            <p>{hasFilters ? "Thử bỏ bộ lọc." : "Tạo bài tập đầu tiên từ ngân hàng câu hỏi."}</p>
            {!hasFilters && (
              <button className={styles.primaryButton} onClick={openCreate}>
                <Plus size={16} />
                <span>Tạo bài tập đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th>Loại</th>
                    <th>Lớp</th>
                    <th>Hạn nộp</th>
                    <th>Giới hạn</th>
                    <th>Đã nộp</th>
                    <th>Chờ chấm</th>
                    <th><span className="sr-only">Thao tác</span></th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((a) => (
                    <tr
                      key={a.id}
                      tabIndex={0}
                      onClick={() => { void openStats(a); }}
                      onKeyDown={(e) => { if (e.key === "Enter") void openStats(a); }}
                    >
                      <td>
                        <div className={styles.nameCell}>
                          <strong>{a.title}</strong>
                          <small>{a.questionIds.length} câu hỏi</small>
                        </div>
                      </td>
                      <td>
                        <span className={a.type === "mock_test" ? styles.typeTest : styles.typeAssign}>
                          {assignmentTypeLabels[a.type]}
                        </span>
                      </td>
                      <td className={styles.classCol}>{a.className}</td>
                      <td className={styles.numeric}>{formatDate(a.dueDate)}</td>
                      <td className={styles.numeric}>
                        {a.timeLimitMinutes ? <span className={styles.limitChip}><Timer size={13} />{a.timeLimitMinutes} phút</span> : "—"}
                      </td>
                      <td className={styles.numeric}>{a.submittedCount}/{a.totalStudents || "—"}</td>
                      <td className={styles.numeric}>
                        {a.pendingGradingCount > 0 ? <span className={styles.pendingBadge}>{a.pendingGradingCount}</span> : "—"}
                      </td>
                      <td className={styles.actionCell} onClick={(e) => e.stopPropagation()} ref={activeMenu === a.id ? menuRef : undefined}>
                        <button
                          className={styles.moreButton}
                          onClick={() => setActiveMenu(activeMenu === a.id ? null : a.id)}
                          aria-label={"Thao tác cho " + a.title}
                          aria-haspopup="menu"
                          aria-expanded={activeMenu === a.id}
                          aria-controls={"amenu-" + a.id}
                        >
                          <MoreHorizontal size={19} />
                        </button>
                        {activeMenu === a.id && (
                          <div className={styles.actionMenu} id={"amenu-" + a.id} role="menu">
                            <button onClick={() => { void openStats(a); }}>Thống kê nộp bài</button>
                            <button disabled={a.submittedCount > 0} title={a.submittedCount > 0 ? "Đã có bài nộp — không sửa được (T-ASGN-5)" : undefined} onClick={() => openEdit(a)}>
                              <Pencil size={14} />Sửa
                            </button>
                            <button className={styles.dangerAction} disabled={a.submittedCount > 0} title={a.submittedCount > 0 ? "Đã có bài nộp — không xoá được" : undefined} onClick={() => { setActiveMenu(null); setDeleting(a); }}>
                              <Trash2 size={14} />Xoá
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((a) => (
                <article key={a.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHead}>
                    <span className={a.type === "mock_test" ? styles.typeTest : styles.typeAssign}>{assignmentTypeLabels[a.type]}</span>
                    <span className={styles.pendingBadge}>{a.pendingGradingCount} chờ chấm</span>
                  </div>
                  <p className={styles.mobileTitle}>{a.title}</p>
                  <p className={styles.mobileMeta}>
                    {a.className} · hạn {formatDate(a.dueDate)} · nộp {a.submittedCount}/{a.totalStudents || "—"}
                  </p>
                  <div className={styles.mobileCardActions}>
                    <button onClick={() => { void openStats(a); }}>Thống kê</button>
                    <button disabled={a.submittedCount > 0} onClick={() => openEdit(a)}>Sửa</button>
                    <button disabled={a.submittedCount > 0} onClick={() => setDeleting(a)}>Xoá</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}

      {editing !== undefined && (
        <Overlay
          label={editing ? "Sửa bài tập" : "Tạo bài tập"}
          onClose={() => setEditing(undefined)}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modalWide}
        >
            <div className={styles.wizardHead}>
              <h2>{editing ? "Sửa bài tập" : "Tạo bài tập"}</h2>
              <div className={styles.wizardSteps}>
                <span className={step === 1 ? styles.stepActive : styles.stepDone}>1 · Thông tin</span>
                <span className={step === 2 ? styles.stepActive : styles.stepIdle}>2 · Chọn câu hỏi</span>
              </div>
            </div>

            {step === 1 ? (
              <form
                onSubmit={(e) => { e.preventDefault(); if (step1Valid) setStep(2); }}
              >
                <label className={styles.field}>
                  <span>Tiêu đề *</span>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus required minLength={3} placeholder="VD: Bài tập 5 · Luyện viết" />
                </label>
                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Loại *</span>
                    <select value={draft.type} onChange={(e) => {
                      const nextType = e.target.value as AssignmentType;
                      // B1: homework stores null — drop any limit typed while it was a mock test.
                      setDraft({ ...draft, type: nextType, timeLimitMinutes: nextType === "mock_test" ? draft.timeLimitMinutes : "" });
                    }}>
                      <option value="homework">Bài tập</option>
                      <option value="mock_test">Đề thi thử (có giới hạn thời gian)</option>
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Lớp học *</span>
                    <select
                      value={draft.classId}
                      onChange={(e) => {
                        const nextClassId = e.target.value;
                        const nextClass = ownClasses.find((c) => c.id === nextClassId) ?? null;
                        // C1: drop already-picked questions that do not match the new class HSK,
                        // otherwise they stay hidden in the picker but still get submitted.
                        const keptIds = nextClass
                          ? draft.questionIds.filter((id) => {
                              const q = bankQuestions.find((x) => x.id === id);
                              return q ? q.hskLevel === nextClass.hskLevel : false;
                            })
                          : [];
                        if (keptIds.length !== draft.questionIds.length) {
                          flash("Đã bỏ chọn câu hỏi không thuộc HSK của lớp mới");
                        }
                        setDraft({ ...draft, classId: nextClassId, questionIds: keptIds });
                      }}
                      required
                    >
                      <option value="">— Chọn lớp —</option>
                      {ownClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </label>
                  <label className={styles.field}>
                    <span>Hạn nộp *</span>
                    <input type="date" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} required />
                  </label>
                  <label className={styles.field}>
                    <span>Giới hạn thời gian (phút){draft.type === "mock_test" ? " *" : ""}</span>
                    <input
                      type="number" min={5} max={180} step={5}
                      required={draft.type === "mock_test"}
                      value={draft.timeLimitMinutes}
                      disabled={draft.type !== "mock_test"}
                      placeholder={draft.type === "mock_test" ? "VD: 45" : "Chỉ áp dụng cho đề thi thử"}
                      onChange={(e) => setDraft({ ...draft, timeLimitMinutes: e.target.value })}
                    />
                  </label>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelButton} onClick={() => setEditing(undefined)}>Hủy</button>
                  <button type="submit" className={styles.primaryButton} disabled={!step1Valid}>Tiếp theo</button>
                </div>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (step2Valid) submitDraft(); }}>
                <p className={styles.pickerHint}>
                  Chọn câu hỏi từ ngân hàng ({eligibleSelectedIds.length} đã chọn) — chỉ hiển thị câu HSK {selectedClass?.hskLevel ?? "—"} theo lớp đã chọn.
                </p>
                <div className={styles.questionPicker}>
                  {eligibleQuestions.length === 0 && (
                    <p className={styles.pickerEmpty}>
                      Ngân hàng câu hỏi chưa có câu nào ở HSK {selectedClass?.hskLevel ?? "?"} — tạo câu hỏi ở mục Ngân hàng câu hỏi trước.
                    </p>
                  )}
                  {eligibleQuestions.map((q) => {
                    const checked = draft.questionIds.includes(q.id);
                    return (
                      <label key={q.id} className={checked ? styles.pickRowChecked : styles.pickRow}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              questionIds: e.target.checked
                                ? [...draft.questionIds, q.id]
                                : draft.questionIds.filter((id) => id !== q.id),
                            })
                          }
                        />
                        <span className={styles.pickContent}>
                          <strong>{q.content}</strong>
                          <small>HSK {q.hskLevel} · {q.subType}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelButton} onClick={() => setStep(1)}>Quay lại</button>
                  <button type="submit" className={styles.primaryButton} disabled={!step2Valid}>
                    {editing ? "Lưu thay đổi" : "Tạo bài tập"}
                  </button>
                </div>
              </form>
            )}
          </Overlay>
      )}

      {stats && (
        <Overlay
          label={"Thống kê nộp bài"}
          onClose={() => setStats(null)}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modal}
        >
            <div className={styles.statsHead}>
              <div>
                <h2>{stats.title}</h2>
                <p>{stats.className} · hạn {formatDate(stats.dueDate)} · {stats.questionIds.length} câu hỏi</p>
              </div>
              <button className={styles.modalClose} onClick={() => setStats(null)} aria-label="Đóng"><X size={17} /></button>
            </div>
            {/* INV-TASG-07: every number here is derived server-side from Attempt
                records at read time — nothing is stored, nothing is a fixture.
                The per-student name list needs the Sprint 4 attempts surface
                (GET /teacher/attempts), so the drawer shows real counts only. */}
            <div className={styles.statsGrid}>
              <div><strong>{stats.submittedCount}</strong><small>đã nộp</small></div>
              <div><strong>{stats.pendingGradingCount}</strong><small>chờ chấm</small></div>
              <div><strong>{stats.totalStudents}</strong><small>học viên active</small></div>
            </div>
            <div className={styles.rosterCols}>
              <div>
                <h3><Check size={14} />Đã nộp</h3>
                <ul>
                  <li><strong>{stats.submittedCount}</strong> lượt nộp</li>
                </ul>
              </div>
              <div>
                <h3><Users size={14} />Chưa nộp</h3>
                <ul>
                  <li className={styles.notSubmitted}><strong>{Math.max(0, stats.totalStudents - stats.submittedCount - 0)}</strong> học viên chưa nộp</li>
                </ul>
              </div>
            </div>
            <p className={styles.noRoster}>
              Danh sách tên học viên đã/chưa nộp sẽ khả dụng khi endpoint danh sách lượt làm
              (Sprint 4 — Attempts) hoàn tất. Số liệu trên lấy trực tiếp từ máy chủ.
            </p>
          </Overlay>
      )}

      {deleting && (
        <ConfirmModal
          title="Xoá bài tập"
          description={"Bài tập «" + deleting.title + "» sẽ bị xoá vĩnh viễn. " + deleting.questionIds.length + " câu hỏi trong ngân hàng không bị ảnh hưởng."}
          confirmLabel="Xoá bài tập"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </TeacherShell>
  );
}

function emptyDraft(): Draft {
  return {
    title: "",
    type: "homework",
    classId: "",
    dueDate: "",
    timeLimitMinutes: "",
    questionIds: [],
  };
}
