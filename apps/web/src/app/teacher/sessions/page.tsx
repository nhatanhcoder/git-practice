"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import { Overlay, StatusPill, Toast } from "@/components/teacher/teacher-widgets";
import { ApiError } from "@/lib/api-client";
import { fetchTeacherClasses } from "@/lib/teacher-service";
import type { TeacherClass } from "@/lib/teacher-data";
import {
  createTeacherSession,
  fetchTeacherSessions,
  type CreateTeacherSessionInput,
  type TeacherSession,
  type TeacherSessionStatus,
} from "@/lib/teacher/teacher-session-service";
import {
  shiftScheduleWeek,
  todayInVietnam,
  validateSessionDraft,
  weekForDate,
} from "@/lib/teacher/schedule-rules.js";
import { formatDate } from "@/lib/formatters";
import styles from "./sessions.module.css";

type LoadState = "loading" | "ready" | "error" | "forbidden";
type SessionDraft = CreateTeacherSessionInput & { notes: string };

const statusLabels: Record<TeacherSessionStatus, string> = {
  scheduled: "Đã lên lịch",
  in_progress: "Đang diễn ra",
  completed_pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
};

function dayLabel(dateOnly: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${dateOnly}T00:00:00.000Z`));
}

function actualTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function initialDraft(date: string): SessionDraft {
  return {
    classId: "",
    scheduledDate: date,
    scheduledStart: "",
    scheduledEnd: "",
    topic: "",
    notes: "",
  };
}

function isAccessError(error: unknown): boolean {
  return error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403);
}

export default function TeacherSessionsPage() {
  // A date-only value avoids shifting the scheduled day through a browser timezone.
  const [anchorDate, setAnchorDate] = useState("");
  const visibleWeek = useMemo(() => (anchorDate ? weekForDate(anchorDate) : null), [anchorDate]);
  const [classFilter, setClassFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeacherSessionStatus | "">("");
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [total, setTotal] = useState(0);
  const [agendaState, setAgendaState] = useState<LoadState>("loading");
  const [agendaError, setAgendaError] = useState("");
  const [agendaRetry, setAgendaRetry] = useState(0);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [classesState, setClassesState] = useState<LoadState>("loading");
  const [classesRetry, setClassesRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<SessionDraft>(initialDraft(""));
  const [fieldErrors, setFieldErrors] = useState<ReturnType<typeof validateSessionDraft>>({});
  const [createError, setCreateError] = useState("");
  const [createOutcomeUnknown, setCreateOutcomeUnknown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const savingRef = useRef(false);

  useEffect(() => {
    setAnchorDate(todayInVietnam());
  }, []);

  useEffect(() => {
    let active = true;
    setClassesState("loading");
    fetchTeacherClasses()
      .then(({ classes: ownClasses }) => {
        if (!active) return;
        setClasses(ownClasses);
        setClassesState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setClasses([]);
        setClassesState(isAccessError(error) ? "forbidden" : "error");
      });
    return () => { active = false; };
  }, [classesRetry]);

  useEffect(() => {
    if (!visibleWeek) return;
    const controller = new AbortController();
    setSessions([]); // Never show the previous class/week as this filter's result.
    setTotal(0);
    setAgendaError("");
    setAgendaState("loading");
    fetchTeacherSessions({
      from: visibleWeek.from,
      to: visibleWeek.to,
      classId: classFilter || undefined,
      status: statusFilter || undefined,
    }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setSessions(result.sessions);
        setTotal(result.total);
        setAgendaState("ready");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setAgendaState(isAccessError(error) ? "forbidden" : "error");
        setAgendaError(error instanceof Error ? error.message : "Không tải được lịch dạy.");
      });
    return () => controller.abort();
  }, [visibleWeek, classFilter, statusFilter, agendaRetry]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const activeClasses = useMemo(() => classes.filter((item) => item.status === "active"), [classes]);
  const canCreate = classesState === "ready" && activeClasses.length > 0 && !createOutcomeUnknown;
  const days = useMemo(() => {
    const ordered = [...sessions].sort((a, b) =>
      a.scheduledDate.localeCompare(b.scheduledDate) ||
      a.scheduledStart.localeCompare(b.scheduledStart) ||
      a.id.localeCompare(b.id),
    );
    const groups = new Map<string, TeacherSession[]>();
    for (const session of ordered) {
      const group = groups.get(session.scheduledDate) ?? [];
      group.push(session);
      groups.set(session.scheduledDate, group);
    }
    return Array.from(groups, ([date, items]) => ({ date, items }));
  }, [sessions]);

  function openCreate() {
    if (!canCreate) return;
    setDraft(initialDraft(todayInVietnam()));
    setFieldErrors({});
    setCreateError("");
    setCreating(true);
  }

  function updateDraft(field: keyof SessionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setCreateError("");
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const errors = validateSessionDraft(draft);
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }
    if (!activeClasses.some((item) => item.id === draft.classId)) {
      setFieldErrors({ classId: "Chọn một lớp đang hoạt động của bạn." });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setCreateError("");
    let postSucceeded = false;
    try {
      await createTeacherSession({
        classId: draft.classId,
        scheduledDate: draft.scheduledDate,
        scheduledStart: draft.scheduledStart,
        scheduledEnd: draft.scheduledEnd,
        topic: draft.topic.trim(),
        ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
      });
      postSucceeded = true;

      // POST lacks className/summary. Refetch the new session's week before confirmation.
      const targetWeek = weekForDate(draft.scheduledDate);
      const refreshed = await fetchTeacherSessions(targetWeek);
      setAnchorDate(draft.scheduledDate);
      setClassFilter("");
      setStatusFilter("");
      setSessions(refreshed.sessions);
      setTotal(refreshed.total);
      setAgendaState("ready");
      setCreating(false);
      setCreateOutcomeUnknown(false);
      setToast("Đã tạo buổi học.");
    } catch (error) {
      if (postSucceeded) {
        // Never invite a second POST when only the list refresh failed.
        setCreating(false);
        setAnchorDate(draft.scheduledDate);
        setClassFilter("");
        setStatusFilter("");
        setSessions([]);
        setTotal(0);
        setAgendaState("error");
        setAgendaError("Buổi học đã được tạo, nhưng chưa tải lại được lịch. Hãy thử tải lại.");
      } else if (error instanceof ApiError && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408 && error.statusCode !== 429) {
        // A definite client rejection leaves the draft editable. A lost response or
        // server error does not prove the insert failed and must not invite another POST.
        if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && error.details) {
          const serverFields: ReturnType<typeof validateSessionDraft> = {};
          for (const field of ["classId", "scheduledDate", "scheduledStart", "scheduledEnd", "topic"] as const) {
            if (error.details[field]?.length) serverFields[field] = error.details[field].join(" ");
          }
          setFieldErrors(serverFields);
        }
        setCreateError(error instanceof Error ? error.message : "Không tạo được buổi học.");
      } else {
        setCreateOutcomeUnknown(true);
        setCreating(false);
        setAnchorDate(draft.scheduledDate);
        setClassFilter("");
        setStatusFilter("");
        setAgendaRetry((value) => value + 1);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const hasFilters = Boolean(classFilter || statusFilter);

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Buổi học & Điểm danh" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>LỊCH DẠY</p>
          <h1>Buổi học của tôi</h1>
          <p className={styles.subtitle}>Xem lịch của các lớp bạn phụ trách và lên một buổi học mới.</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreate} disabled={!canCreate}>
          <Plus size={16} aria-hidden="true" /> Tạo buổi học
        </button>
      </header>

      <section className={styles.periodCard} aria-label="Khoảng ngày lịch dạy">
        <div className={styles.periodHeading}>
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <span>Tuần đang xem</span>
            <strong>{visibleWeek ? `${formatDate(visibleWeek.from)} – ${formatDate(visibleWeek.to)}` : "Đang tải..."}</strong>
          </div>
        </div>
        <div className={styles.periodActions}>
          <button type="button" onClick={() => setAnchorDate(shiftScheduleWeek(anchorDate, -1))} disabled={!anchorDate} aria-label="Tuần trước">
            <ChevronLeft size={17} aria-hidden="true" /> Trước
          </button>
          <button type="button" onClick={() => setAnchorDate(todayInVietnam())} disabled={!anchorDate}>Hôm nay</button>
          <button type="button" onClick={() => setAnchorDate(shiftScheduleWeek(anchorDate, 1))} disabled={!anchorDate} aria-label="Tuần sau">
            Sau <ChevronRight size={17} aria-hidden="true" />
          </button>
        </div>
      </section>

      <section className={styles.filterCard} aria-label="Bộ lọc buổi học">
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Lớp học</span>
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)} disabled={classesState !== "ready"}>
            <option value="">Tất cả các lớp</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TeacherSessionStatus | "")}>
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className={styles.filterMeta}>
          {hasFilters && <button className={styles.clearButton} onClick={() => { setClassFilter(""); setStatusFilter(""); }}>Xóa lọc</button>}
          <span aria-live="polite">{agendaState === "ready" ? `${total} buổi trong tuần` : "— buổi"}</span>
        </div>
      </section>

      {(classesState === "error" || classesState === "forbidden") && agendaState !== "forbidden" && (
        <div className={styles.noticeBanner} role="status">
          <AlertCircle size={19} aria-hidden="true" />
          <span>{classesState === "forbidden" ? "Không có quyền tải danh sách lớp. Chưa thể tạo buổi học." : "Không tải được danh sách lớp. Lịch vẫn có thể xem, nhưng chưa thể tạo buổi học."}</span>
          <button onClick={() => setClassesRetry((value) => value + 1)}>Thử lại</button>
        </div>
      )}

      {createOutcomeUnknown && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>Chưa xác nhận được kết quả tạo buổi học</strong>
            <span>Máy chủ có thể đã lưu buổi học. Hãy kiểm tra lịch vừa tải lại hoặc liên hệ quản trị viên; đừng gửi lại yêu cầu. Nút tạo buổi học được khóa trong trang này.</span>
          </div>
        </div>
      )}

      {classesState === "ready" && activeClasses.length === 0 && agendaState !== "forbidden" && (
        <div className={styles.noticeBanner} role="status">
          <AlertCircle size={19} aria-hidden="true" />
          <span>Bạn chưa có lớp đang hoạt động để tạo buổi học.</span>
        </div>
      )}

      {(agendaState === "error" || agendaState === "forbidden") && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} aria-hidden="true" />
          <div>
            <strong>{agendaState === "forbidden" ? "Không có quyền xem lịch dạy" : "Không tải được lịch dạy"}</strong>
            <span>{agendaState === "forbidden" ? "Hãy đăng nhập bằng tài khoản giáo viên có quyền truy cập." : agendaError || "Vui lòng kiểm tra kết nối và thử lại."}</span>
          </div>
          {agendaState === "error" && <button onClick={() => setAgendaRetry((value) => value + 1)}>Thử lại</button>}
        </div>
      )}

      {agendaState !== "error" && agendaState !== "forbidden" && (
        <section className={styles.listCard} aria-label="Lịch dạy theo ngày" aria-busy={agendaState === "loading"}>
          {agendaState === "loading" ? (
            <div aria-label="Đang tải lịch dạy">
              {[1, 2, 3, 4].map((item) => <div key={item} className={styles.skeletonRow}><span /><span /><span /></div>)}
            </div>
          ) : days.length === 0 ? (
            <div className={styles.emptyState}>
              <CalendarDays size={38} className={styles.emptyIcon} aria-hidden="true" />
              <h2>{hasFilters ? "Không có buổi học phù hợp" : "Chưa có buổi học nào trong khoảng này"}</h2>
              <p>{hasFilters ? "Thử bỏ bộ lọc hoặc chuyển sang tuần khác." : "Chuyển sang tuần khác hoặc tạo một buổi học mới."}</p>
              {canCreate && <button className={styles.ghostButton} onClick={openCreate}>Tạo buổi học</button>}
            </div>
          ) : (
            <div className={styles.agendaDays}>
              {days.map((day) => (
                <section key={day.date} className={styles.agendaDay} aria-label={dayLabel(day.date)}>
                  <div className={styles.dayHeader}>
                    <h2>{dayLabel(day.date)}</h2>
                    <span>{day.items.length} buổi</span>
                  </div>
                  <ol className={styles.sessionList}>
                    {day.items.map((session) => (
                      <li key={session.id} className={styles.sessionRow}>
                        <div className={styles.rowTop}>
                          <div className={styles.rowWhen}>
                            <span className={styles.rowTime}><Clock size={14} aria-hidden="true" /> {session.scheduledStart}–{session.scheduledEnd}</span>
                            <span className={styles.rowClass}>{session.className}</span>
                          </div>
                          <StatusPill status={session.status} label={statusLabels[session.status]} />
                        </div>
                        <p className={styles.rowTopic}>{session.topic}</p>
                        {(session.actualStart || session.actualEnd) && (
                          <p className={styles.actualTime}>Giờ thực tế: {session.actualStart ? actualTime(session.actualStart) : "—"}–{session.actualEnd ? actualTime(session.actualEnd) : "—"}</p>
                        )}
                        {session.status === "rejected" && session.rejectionReason && (
                          <p className={styles.rejectionReason}>Lý do từ chối: {session.rejectionReason}</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </section>
      )}

      {toast && <Toast message={toast} />}

      {creating && (
        <Overlay
          label="Tạo buổi học"
          onClose={() => { if (!savingRef.current) setCreating(false); }}
          closeOnBackdrop={!saving}
          closeDisabled={saving}
          backdropClassName={styles.modalBackdrop}
          panelClassName={styles.modal}
        >
          <h2>Tạo buổi học</h2>
          <p className={styles.modalSub}>Lên lịch một buổi dạy cho lớp bạn đang phụ trách.</p>
          {createError && <p className={styles.fieldError} role="alert">{createError}</p>}
          <form onSubmit={submitCreate} noValidate>
            <label className={styles.field}>
              <span>Lớp học *</span>
              <select value={draft.classId} onChange={(event) => updateDraft("classId", event.target.value)} aria-invalid={Boolean(fieldErrors.classId)} required>
                <option value="">— Chọn lớp —</option>
                {activeClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {fieldErrors.classId && <small className={styles.inlineError}>{fieldErrors.classId}</small>}
            </label>
            <label className={styles.field}>
              <span>Ngày dạy *</span>
              <input type="date" value={draft.scheduledDate} onChange={(event) => updateDraft("scheduledDate", event.target.value)} aria-invalid={Boolean(fieldErrors.scheduledDate)} required />
              {fieldErrors.scheduledDate && <small className={styles.inlineError}>{fieldErrors.scheduledDate}</small>}
            </label>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Bắt đầu *</span>
                <input type="time" value={draft.scheduledStart} onChange={(event) => updateDraft("scheduledStart", event.target.value)} aria-invalid={Boolean(fieldErrors.scheduledStart)} required />
                {fieldErrors.scheduledStart && <small className={styles.inlineError}>{fieldErrors.scheduledStart}</small>}
              </label>
              <label className={styles.field}>
                <span>Kết thúc *</span>
                <input type="time" value={draft.scheduledEnd} onChange={(event) => updateDraft("scheduledEnd", event.target.value)} aria-invalid={Boolean(fieldErrors.scheduledEnd)} required />
                {fieldErrors.scheduledEnd && <small className={styles.inlineError}>{fieldErrors.scheduledEnd}</small>}
              </label>
            </div>
            <label className={styles.field}>
              <span>Chủ đề bài dạy *</span>
              <input value={draft.topic} onChange={(event) => updateDraft("topic", event.target.value)} aria-invalid={Boolean(fieldErrors.topic)} maxLength={300} required placeholder="VD: HSK 3 — Chương 5: Du lịch" />
              {fieldErrors.topic && <small className={styles.inlineError}>{fieldErrors.topic}</small>}
            </label>
            <label className={styles.field}>
              <span>Ghi chú (không bắt buộc)</span>
              <textarea rows={3} value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} />
            </label>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setCreating(false)} disabled={saving}>Hủy</button>
              <button type="submit" className={styles.primaryButton} disabled={saving}>{saving ? "Đang tạo..." : "Tạo buổi học"}</button>
            </div>
          </form>
        </Overlay>
      )}
    </TeacherShell>
  );
}
