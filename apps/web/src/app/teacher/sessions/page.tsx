"use client";

// MOCK(T-SES-*): sessions in-memory until /api/v1/teacher/sessions exists.
// State machine per FLOW_SESSION_ATTENDANCE.md §2: scheduled → completed_pending
// → approved | rejected. submit carries topic + notes + actual times + attendance.

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Play,
  Send,
  Users,
  X,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  attendanceLabels,
  attendanceSummary,
  mockSessions,
  sessionStatusLabels,
  type AttendanceRecord,
  type AttendanceValue,
  type Session,
} from "@/lib/teacher/session-data";
import { mockTeacherClasses } from "@/lib/teacher-data";
import { formatDate } from "@/lib/formatters";
import styles from "./sessions.module.css";

export default function TeacherSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<Session["status"] | "all">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState({ classId: "", date: "", start: "", end: "" });
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, { value: AttendanceValue; note: string }>>({});
  const [submitting, setSubmitting] = useState<Session | null>(null);
  const [submitDraft, setSubmitDraft] = useState({ topic: "", notes: "", actualEnd: "" });
  const [reasonSession, setReasonSession] = useState<Session | null>(null);
  const [toast, setToast] = useState("");

  const ownClasses = useMemo(() => mockTeacherClasses.filter((c) => c.status === "active"), []);

  const filtered = useMemo(
    () =>
      sessions
        .filter((s) => classFilter === "all" || s.classId === classFilter)
        .filter((s) => statusFilter === "all" || s.status === statusFilter)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [sessions, classFilter, statusFilter],
  );

  const hasFilters = classFilter !== "all" || statusFilter !== "all";
  const display = reviewState === "empty" ? [] : filtered;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function handleCreate() {
    if (!createDraft.classId || !createDraft.date || !createDraft.start || !createDraft.end) return;
    const cls = ownClasses.find((c) => c.id === createDraft.classId);
    // MOCK: POST /api/v1/teacher/sessions — status scheduled
    const roster = cls ? cls.id : "";
    const created: Session = {
      id: "ss-" + Date.now(),
      classId: createDraft.classId,
      className: cls?.name ?? "",
      date: createDraft.date,
      startTime: createDraft.start,
      endTime: createDraft.end,
      actualStart: null,
      actualEnd: null,
      topic: null,
      notes: null,
      status: "scheduled",
      rejectionReason: null,
      attendance: [],
    };
    void roster;
    setSessions((current) => [created, ...current]);
    setCreating(false);
    flash("Đã tạo buổi học — trạng thái Đã lên lịch");
  }

  function handleStart(session: Session) {
    const now = new Date();
    const hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
    // MOCK: PATCH /api/v1/teacher/sessions/:id/start — records actualStartTime
    setSessions((current) =>
      current.map((s) => (s.id === session.id ? { ...s, actualStart: hhmm } : s)),
    );
    flash("Đã ghi nhận giờ bắt đầu: " + hhmm);
  }

  function openAttendance(session: Session) {
    const draft: Record<string, { value: AttendanceValue; note: string }> = {};
    session.attendance.forEach((a) => {
      draft[a.studentId] = { value: a.attendance, note: a.note ?? "" };
    });
    setAttendanceDraft(draft);
    setAttendanceSession(session);
  }

  function saveAttendance() {
    if (!attendanceSession) return;
    // MOCK: POST /api/v1/teacher/sessions/:id/attendance
    setSessions((current) =>
      current.map((s) =>
        s.id === attendanceSession.id
          ? {
              ...s,
              attendance: s.attendance.map((a) => ({
                ...a,
                attendance: attendanceDraft[a.studentId]?.value ?? a.attendance,
                note: attendanceDraft[a.studentId]?.note || null,
              })),
            }
          : s,
      ),
    );
    flash("Đã lưu điểm danh");
    setAttendanceSession(null);
  }

  function openSubmit(session: Session) {
    // Prefill ONLY from a real recorded end time. Never from `endTime` (the scheduled end):
    // that would launder an expected time into an actual one — see submitError below.
    setSubmitDraft({
      topic: session.topic ?? "",
      notes: session.notes ?? "",
      actualEnd: session.actualEnd ?? "",
    });
    setSubmitting(session);
  }

  // A1: the submit gate. `actualEnd` feeds per_hour payroll (INV-PAYROLL-06), so it must be a
  // time the teacher actually entered — never derived, never defaulted.
  const submitError: string | null = (() => {
    if (!submitting) return null;
    if (!submitting.actualStart) return "Chưa có giờ bắt đầu thực tế — bấm “Bắt đầu” trước khi gửi duyệt.";
    if (!submitDraft.actualEnd) return "Nhập giờ kết thúc thực tế.";
    // INV-SESSION-13: when both are non-NULL, actualEnd > actualStart.
    if (submitDraft.actualEnd <= submitting.actualStart)
      return "Giờ kết thúc phải sau giờ bắt đầu (" + submitting.actualStart + ").";
    return null;
  })();

  const submitValid = !!submitting && !!submitDraft.topic.trim() && submitError === null;

  function handleSubmit() {
    if (!submitting || !submitValid) return;
    // MOCK: PATCH /api/v1/teacher/sessions/:id/submit — payload per FLOW §3.2
    // (topic + notes + actual times + attendance) → completed_pending
    setSessions((current) =>
      current.map((s) =>
        s.id === submitting.id
          ? {
              ...s,
              topic: submitDraft.topic.trim(),
              notes: submitDraft.notes.trim() || null,
              actualEnd: submitDraft.actualEnd,
              status: "completed_pending" as const,
            }
          : s,
      ),
    );
    flash("Đã gửi duyệt — Admin sẽ xem xét buổi học");
    setSubmitting(null);
  }

  const createValid =
    createDraft.classId && createDraft.date && createDraft.start && createDraft.end &&
    createDraft.start < createDraft.end;

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Buổi học & Điểm danh" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>BUỔI HỌC & ĐIỂM DANH</p>
          <h1>Buổi học của tôi</h1>
          <p className={styles.subtitle}>
            Buổi được duyệt mới tính vào lương — gửi duyệt ngay sau khi dạy xong.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={() => { setCreateDraft({ classId: "", date: "", start: "", end: "" }); setCreating(true); }}>
          <Play size={15} />
          <span>Tạo buổi học</span>
        </button>
      </header>

      <section className={styles.filterCard} aria-label="Bộ lọc buổi học">
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Lớp học</span>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">Tất cả các lớp</option>
            {ownClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Trạng thái</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as Session["status"] | "all")}>
            <option value="all">Tất cả</option>
            <option value="scheduled">Đã lên lịch</option>
            <option value="completed_pending">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
            <option value="rejected">Bị từ chối</option>
          </select>
        </label>
        <div className={styles.filterMeta}>
          {hasFilters && (
            <button className={styles.clearButton} onClick={() => { setClassFilter("all"); setStatusFilter("all"); setReviewState("ready"); }}>
              Xóa lọc
            </button>
          )}
          <span>{display.length} buổi</span>
        </div>
      </section>

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được danh sách buổi học.</strong>
            <span>Vui lòng kiểm tra kết nối và thử lại.</span>
          </div>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
        </div>
      )}

      <section className={styles.listCard} aria-label="Danh sách buổi học">
        {reviewState === "loading" ? (
          <div aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4].map((r) => <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>)}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertCircle size={38} className={styles.emptyIcon} />
            <h2>{hasFilters ? "Không có buổi học phù hợp" : "Chưa có buổi học nào"}</h2>
            <p>{hasFilters ? "Thử bỏ bộ lọc." : "Tạo buổi học đầu tiên để bắt đầu ghi nhận giờ dạy."}</p>
          </div>
        ) : (
          <ol className={styles.sessionList}>
            {display.map((s) => {
              const summary = attendanceSummary(s);
              const canStart = s.status === "scheduled" && !s.actualStart;
              const canAttendance = s.status === "scheduled";
              const canSubmit = s.status === "scheduled" && !!s.actualStart;
              return (
                <li key={s.id} className={styles.sessionRow}>
                  <div className={styles.rowTop}>
                    <div className={styles.rowWhen}>
                      <span className={styles.rowDate}>{formatDate(s.date)}</span>
                      <span className={styles.rowTime}>
                        <Clock size={13} /> {s.startTime}–{s.endTime}
                        {s.actualStart ? <small> · thực tế {s.actualStart}{s.actualEnd ? "–" + s.actualEnd : ""}</small> : null}
                      </span>
                    </div>
                    <StatusPill status={s.status} label={sessionStatusLabels[s.status]} />
                  </div>
                  <p className={styles.rowClass}>{s.className}</p>
                  <p className={styles.rowTopic}>{s.topic ?? "— chưa có chủ đề —"}</p>
                  <div className={styles.rowBottom}>
                    <span className={styles.attSummary}>
                      <Users size={13} />
                      {s.attendance.length === 0 ? "chưa điểm danh" : `${summary.present} có mặt · ${summary.excused} vắng CL · ${summary.unexcused} vắng KCL`}
                    </span>
                    <span className={styles.rowActions}>
                      {s.status === "rejected" && (
                        <button className={styles.ghostDanger} onClick={() => setReasonSession(s)}>Xem lý do</button>
                      )}
                      {canStart && <button className={styles.ghostButton} onClick={() => handleStart(s)}>Bắt đầu</button>}
                      {canAttendance && <button className={styles.ghostButton} onClick={() => openAttendance(s)}>Điểm danh</button>}
                      {canSubmit && <button className={styles.primaryButtonSm} onClick={() => openSubmit(s)}><Send size={13} />Gửi duyệt</button>}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}

      {creating && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Tạo buổi học">
          <div className={styles.modal}>
            <h2>Tạo buổi học</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <label className={styles.field}>
                <span>Lớp học *</span>
                <select value={createDraft.classId} onChange={(e) => setCreateDraft({ ...createDraft, classId: e.target.value })} required>
                  <option value="">— Chọn lớp —</option>
                  {ownClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Ngày *</span>
                  <input type="date" value={createDraft.date} onChange={(e) => setCreateDraft({ ...createDraft, date: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  <span>Bắt đầu *</span>
                  <input type="time" value={createDraft.start} onChange={(e) => setCreateDraft({ ...createDraft, start: e.target.value })} required />
                </label>
                <label className={styles.field}>
                  <span>Kết thúc *</span>
                  <input type="time" value={createDraft.end} onChange={(e) => setCreateDraft({ ...createDraft, end: e.target.value })} required />
                </label>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelButton} onClick={() => setCreating(false)}>Hủy</button>
                <button type="submit" className={styles.primaryButton} disabled={!createValid}>Tạo buổi học</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceSession && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Điểm danh">
          <div className={styles.modal}>
            <div className={styles.modalHeadRow}>
              <h2>Điểm danh — {formatDate(attendanceSession.date)}</h2>
              <button className={styles.modalClose} onClick={() => setAttendanceSession(null)} aria-label="Đóng"><X size={17} /></button>
            </div>
            <p className={styles.modalSub}>{attendanceSession.className}</p>
            <div className={styles.attendanceList}>
              {attendanceSession.attendance.length === 0 ? (
                <p className={styles.noRoster}>Lớp chưa có học sinh nào — không cần điểm danh.</p>
              ) : (
                attendanceSession.attendance.map((a: AttendanceRecord) => (
                  <div key={a.studentId} className={styles.attRow}>
                    <strong>{a.nickname}</strong>
                    <div className={styles.attButtons} role="group" aria-label={"Trạng thái của " + a.nickname}>
                      {(["present", "absent_excused", "absent_unexcused"] as const).map((v) => (
                        <button
                          key={v}
                          className={
                            (attendanceDraft[a.studentId]?.value ?? a.attendance) === v
                              ? v === "present" ? styles.attActive + " " + styles.attPresent
                                : v === "absent_excused" ? styles.attActive + " " + styles.attExcused
                                  : styles.attActive + " " + styles.attUnexcused
                              : styles.attOption
                          }
                          onClick={() =>
                            setAttendanceDraft((d) => ({
                              ...d,
                              [a.studentId]: { value: v, note: d[a.studentId]?.note ?? "" },
                            }))
                          }
                          aria-pressed={(attendanceDraft[a.studentId]?.value ?? a.attendance) === v}
                        >
                          {attendanceLabels[v]}
                        </button>
                      ))}
                    </div>
                    {(attendanceDraft[a.studentId]?.value ?? a.attendance) === "absent_excused" && (
                      <input
                        className={styles.attNote}
                        placeholder="Lý do (vd: bệnh)"
                        value={attendanceDraft[a.studentId]?.note ?? a.note ?? ""}
                        onChange={(e) =>
                          setAttendanceDraft((d) => ({
                            ...d,
                            [a.studentId]: { value: d[a.studentId]?.value ?? a.attendance, note: e.target.value },
                          }))
                        }
                      />
                    )}
                  </div>
                ))
              )}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setAttendanceSession(null)}>Đóng</button>
              <button type="button" className={styles.primaryButton} onClick={saveAttendance} disabled={attendanceSession.attendance.length === 0}>
                <Check size={15} />Lưu điểm danh
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Gửi duyệt buổi học">
          <div className={styles.modal}>
            <h2>Gửi duyệt buổi học</h2>
            <p className={styles.modalSub}>
              {submitting.className} · {formatDate(submitting.date)} · theo lịch {submitting.startTime}–{submitting.endTime}
            </p>
            <label className={styles.field}>
              <span>Chủ đề bài dạy *</span>
              <input value={submitDraft.topic} onChange={(e) => setSubmitDraft({ ...submitDraft, topic: e.target.value })} autoFocus placeholder="VD: HSK 3 — Chương 5: Du lịch" />
            </label>
            <label className={styles.field}>
              <span>Giờ kết thúc thực tế *</span>
              <input
                type="time"
                required
                value={submitDraft.actualEnd}
                onChange={(e) => setSubmitDraft({ ...submitDraft, actualEnd: e.target.value })}
                aria-describedby="submit-actualend-help"
                aria-invalid={submitError !== null && submitError !== "Nhập giờ kết thúc thực tế." ? true : undefined}
              />
              <small id="submit-actualend-help" className={styles.fieldHint}>
                Giờ bắt đầu thực tế đã ghi nhận: <strong>{submitting.actualStart ?? "chưa có"}</strong>. Giờ này dùng để tính lương theo giờ — nhập giờ dạy thật, không phải giờ theo lịch.
              </small>
            </label>
            <label className={styles.field}>
              <span>Ghi chú cho Admin</span>
              <textarea rows={3} value={submitDraft.notes} onChange={(e) => setSubmitDraft({ ...submitDraft, notes: e.target.value })} placeholder="VD: Học sinh làm tốt phần nghe, cần luyện thêm viết" />
            </label>
            {submitError && (
              <p className={styles.fieldError} role="alert">{submitError}</p>
            )}
            <p className={styles.submitNote}>
              Sau khi gửi, buổi học chuyển sang <strong>Chờ duyệt</strong> và Admin sẽ xem xét — buổi được duyệt mới tính lương.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setSubmitting(null)}>Hủy</button>
              <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={!submitValid}>
                <Send size={15} />Gửi duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {reasonSession && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Lý do từ chối">
          <div className={styles.modal}>
            <h2>Buổi học bị từ chối</h2>
            <p className={styles.modalSub}>{reasonSession.className} · {formatDate(reasonSession.date)}</p>
            <div className={styles.reasonBox} role="alert">
              <AlertCircle size={17} />
              <p>{reasonSession.rejectionReason ?? "Không có lý do được ghi lại."}</p>
            </div>
            <p className={styles.submitNote}>
              Sửa buổi học và gửi duyệt lại hiện <strong>chưa được hợp đồng</strong> (không có endpoint) — xem teacher-sessions.md § Out of scope.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.primaryButton} onClick={() => setReasonSession(null)}>Đã hiểu</button>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
