"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { avatarToneFor, initialsOf } from "../../../../lib/formatters";
import {
  fetchPendingSessions,
  approveSession,
  rejectSession,
  type PendingSessionItem,
} from "../../../../lib/admin-sessions-service";
import styles from "./sessions.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "drawer" | "forbidden";

interface AttendanceSummary {
  present: number;
  excused: number;
  unexcused: number;
  total: number;
}

interface SessionQueueItem {
  id: string;
  teacher: string;
  class: string;
  date: string;
  scheduled: string;
  actual: string;
  minutes: number;
  topic: string;
  notes: string;
  attendance: AttendanceSummary;
}

function mapToQueueItem(s: PendingSessionItem): SessionQueueItem {
  let minutes = 90;
  let actualStr = "Chưa ghi nhận";
  if (s.actualStart && s.actualEnd) {
    const diffMs = new Date(s.actualEnd).getTime() - new Date(s.actualStart).getTime();
    minutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
    actualStr = `${s.actualStart.slice(11, 16)} – ${s.actualEnd.slice(11, 16)}`;
  }

  return {
    id: s.id,
    teacher: s.teacherName,
    class: s.className,
    date: s.scheduledDate,
    scheduled: `${s.scheduledStart} – ${s.scheduledEnd}`,
    actual: actualStr,
    minutes,
    topic: s.topic,
    notes: s.notes ?? "",
    attendance: {
      present: s.attendanceSummary.present,
      excused: s.attendanceSummary.absentExcused,
      unexcused: s.attendanceSummary.absentUnexcused,
      total: s.attendanceSummary.marked,
    },
  };
}

export default function AdminSessionReviewPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionQueueItem[]>([]);
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [activeSession, setActiveSession] = useState<SessionQueueItem | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [sessionToReject, setSessionToReject] = useState<SessionQueueItem | null>(null);

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetchPendingSessions();
        setSessions(res.sessions.map(mapToQueueItem));
      } catch (err: any) {
        if (err?.statusCode === 403) {
          setReviewState("forbidden");
        } else {
          setErrorMessage(err?.message || "Không thể tải danh sách buổi học chờ duyệt");
        }
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => teacherFilter === "all" || s.teacher === teacherFilter);
  }, [sessions, teacherFilter]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  async function handleApprove(session: SessionQueueItem) {
    try {
      await approveSession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (activeSession?.id === session.id) {
        setActiveSession(null);
      }
      triggerToast("Đã duyệt buổi học");
    } catch (err: any) {
      triggerToast(err?.message || "Duyệt buổi học thất bại");
    }
  }

  function openRejectModal(session: SessionQueueItem) {
    setSessionToReject(session);
    setRejectReason("");
    setShowRejectModal(true);
  }

  async function confirmReject() {
    if (!sessionToReject || !rejectReason.trim()) return;
    try {
      await rejectSession(sessionToReject.id, rejectReason.trim());
      setSessions((prev) => prev.filter((s) => s.id !== sessionToReject.id));
      if (activeSession?.id === sessionToReject.id) {
        setActiveSession(null);
      }
      setShowRejectModal(false);
      triggerToast("Đã từ chối buổi học");
    } catch (err: any) {
      triggerToast(err?.message || "Từ chối buổi học thất bại");
    }
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "drawer") {
      setActiveSession(filteredSessions[0] || sessions[0] || null);
    } else {
      setActiveSession(null);
    }
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const teacherOptions = useMemo(() => {
    return Array.from(new Set(sessions.map((s) => s.teacher))).filter(Boolean);
  }, [sessions]);

  const isEmpty = reviewState === "empty" || (!loading && filteredSessions.length === 0);

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button className={styles.closeNav} onClick={() => setMobileNav(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Điều hướng quản trị">
          <Link className={styles.navItem} href="/admin">
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </Link>
          <Link className={styles.navItem} href="/admin/users">
            <Users size={20} />
            <span>Tài khoản</span>
          </Link>
          <Link className={styles.navItem} href="/admin/invoices">
            <CircleDollarSign size={20} />
            <span>Học phí</span>
          </Link>
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin/payroll">
            <WalletCards size={20} />
            <span>Lương</span>
          </Link>
          <Link className={styles.navItem} href="/admin/monitoring">
            <ShieldCheck size={20} />
            <span>Giám sát</span>
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <BookOpen size={18} />
          <div>
            <strong>HSK 1–9</strong>
            <span>Nền tảng học tập</span>
          </div>
        </div>
      </aside>
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}

      {/* Main Column */}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Mở menu">
              <Menu size={20} />
            </button>
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={14} />
            <Link href="/admin/payroll">Lương</Link>
            <ChevronRight size={14} />
            <strong>Buổi học chờ duyệt</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            <Link className={styles.profileButton} href="/admin/profile">
              <span className={styles.avatar} style={{ backgroundColor: "#E0E7FF", color: "#3730A3" }}>
                AT
              </span>
            </Link>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>QUY TRÌNH DUYỆT CÔNG</p>
              <h1>Buổi học chờ duyệt</h1>
              <p className={styles.subtitle}>Kiểm tra thời lượng thực tế và điểm danh của giáo viên trước khi tính lương.</p>
            </div>
            <div className={styles.titleActions}>
              <Link className={styles.secondaryButton} href="/admin/payroll">
                <span>Danh sách kỳ lương</span>
              </Link>
              {!isEmpty && <span className={styles.queueBadge}>{filteredSessions.length} buổi</span>}
            </div>
          </div>

          {/* Filter Toolbar */}
          <section className={styles.filterCard} aria-label="Bộ lọc hàng đợi">
            <div className={styles.selectField}>
              <label htmlFor="teacherSel">Giáo viên:</label>
              <select
                id="teacherSel"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
              >
                <option value="all">Tất cả giáo viên</option>
                {teacherOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Error Banner */}
          {(errorMessage || reviewState === "error") && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", color: "#991B1B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{errorMessage || "Không tải được danh sách buổi học chờ duyệt."}</span>
              <button style={{ backgroundColor: "#DC2626", color: "#fff", padding: "4px 10px", borderRadius: "4px", border: "none", cursor: "pointer" }} onClick={() => { setErrorMessage(null); setReviewState("ready"); }}>Thử lại</button>
            </div>
          )}

          {/* Loading Indicator */}
          {(loading || reviewState === "loading") && (
            <div style={{ padding: "32px", textAlign: "center", color: "#64748B" }}>
              Đang tải danh sách buổi học chờ duyệt...
            </div>
          )}

          {/* Table or Empty Success State */}
          <section className={styles.tableCard} aria-label="Danh sách buổi học chờ duyệt">
            {isEmpty ? (
              <div className={styles.emptyStateSuccess}>
                <CheckCircle className={styles.successIcon} />
                <h2>Không có buổi học chờ duyệt</h2>
                <p>Tất cả buổi học đã được xử lý.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giáo viên</th>
                      <th>Lớp</th>
                      <th>Ngày dạy</th>
                      <th className={styles.numeric}>Thời lượng thực tế</th>
                      <th>Chủ đề</th>
                      <th>Điểm danh</th>
                      <th className={styles.numeric}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => {
                      const tone = avatarToneFor(s.teacher);
                      const presentRatio = (s.attendance.present / s.attendance.total) * 100;
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setActiveSession(s)}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && setActiveSession(s)}
                        >
                          <td>
                            <div className={styles.teacherCell}>
                              <span
                                className={styles.teacherAvatar}
                                style={{ backgroundColor: tone.bg, color: tone.text }}
                              >
                                {initialsOf(s.teacher)}
                              </span>
                              <strong>{s.teacher}</strong>
                            </div>
                          </td>
                          <td>{s.class}</td>
                          <td>{s.date}</td>
                          <td className={styles.numeric} style={{ fontWeight: 600 }}>
                            {s.minutes} phút
                          </td>
                          <td className={styles.topicCell}>{s.topic}</td>
                          <td>
                            <div className={styles.attendanceCell}>
                              <span>
                                {s.attendance.present}/{s.attendance.total}
                              </span>
                              <div className={styles.meterTrack}>
                                <div className={styles.meterFill} style={{ width: `${presentRatio}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.quickRejectBtn}
                              title="Từ chối"
                              onClick={() => openRejectModal(s)}
                            >
                              <X size={16} />
                            </button>
                            <button
                              className={styles.quickApproveBtn}
                              title="Duyệt"
                              onClick={() => handleApprove(s)}
                            >
                              <Check size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Review Drawer */}
      {activeSession && (
        <div className={styles.drawerBackdrop} onClick={() => setActiveSession(null)}>
          <aside className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className={styles.drawerHeader}>
              <div>
                <h2>{activeSession.teacher}</h2>
                <span style={{ fontSize: "13px", color: "#64748B" }}>
                  {activeSession.class} • {activeSession.date}
                </span>
              </div>
              <button onClick={() => setActiveSession(null)} aria-label="Đóng ngăn xem lại">
                <X size={20} color="#64748B" />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.sectionBlock}>
                <label>Thời gian</label>
                <div className={styles.timeCompare}>
                  <div className={styles.timeCol}>
                    <small>Theo lịch</small>
                    <strong>{activeSession.scheduled}</strong>
                  </div>
                  <div className={`${styles.timeCol} ${styles.timeActual}`}>
                    <small>Thực tế</small>
                    <strong>
                      {activeSession.actual} ({activeSession.minutes} phút)
                    </strong>
                  </div>
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <label>Chủ đề bài học</label>
                <div className={styles.textContent}>{activeSession.topic}</div>
              </div>

              <div className={styles.sectionBlock}>
                <label>Ghi chú giảng dạy</label>
                <div className={styles.textContent}>
                  {activeSession.notes || <span style={{ color: "#64748B", fontStyle: "italic" }}>Không có ghi chú</span>}
                </div>
              </div>

              <div className={styles.sectionBlock}>
                <label>Điểm danh ({activeSession.attendance.present}/{activeSession.attendance.total} có mặt)</label>
                <div className={styles.attendanceList}>
                  {Array.from({ length: activeSession.attendance.present }).map((_, idx) => (
                    <div key={`p-${idx}`} className={styles.attendanceRow}>
                      <span>Học sinh {idx + 1}</span>
                      <span className={styles.pillSuccess}>Có mặt</span>
                    </div>
                  ))}
                  {Array.from({ length: activeSession.attendance.excused }).map((_, idx) => (
                    <div key={`e-${idx}`} className={styles.attendanceRow}>
                      <span>Học sinh {activeSession.attendance.present + idx + 1}</span>
                      <span className={styles.pillWarning}>Vắng có phép</span>
                    </div>
                  ))}
                  {Array.from({ length: activeSession.attendance.unexcused }).map((_, idx) => (
                    <div key={`u-${idx}`} className={styles.attendanceRow}>
                      <span>Học sinh {activeSession.attendance.present + activeSession.attendance.excused + idx + 1}</span>
                      <span className={styles.pillDanger}>Vắng không phép</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button className={styles.rejectBtn} onClick={() => openRejectModal(activeSession)}>
                Từ chối
              </button>
              <button className={styles.approveBtn} onClick={() => handleApprove(activeSession)}>
                Duyệt buổi học
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 style={{ color: "#DC2626" }}>Từ chối buổi học</h2>
            <p>Giáo viên sẽ nhận được lý do này và có thể chỉnh sửa rồi gửi lại.</p>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, display: "block", marginBottom: "6px" }}>
                Lý do từ chối *
              </label>
              <textarea
                placeholder="Nhập lý do từ chối buổi học (bắt buộc)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "#F1F5F9", color: "#475569" }}
                onClick={() => setShowRejectModal(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  backgroundColor: "#DC2626",
                  color: "#FFFFFF",
                  fontWeight: 500,
                  opacity: rejectReason.trim() ? 1 : 0.5,
                  cursor: rejectReason.trim() ? "pointer" : "not-allowed",
                }}
                disabled={!rejectReason.trim()}
                onClick={confirmReject}
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEB-004: design-review scaffolding, dev only. Over live data it lets a

          failed load be repainted as a healthy one. */}

      {process.env.NODE_ENV !== "production" && (

        <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
          <span>REVIEW STATE</span>
          {(["ready", "loading", "empty", "error", "drawer", "forbidden"] as ReviewState[]).map((state) => (
            <button
              key={state}
              className={reviewState === state ? styles.stateActive : ""}
              onClick={() => handleStateChange(state)}
            >
              {state}
            </button>
          ))}
        </aside>

      )}

      {/* Toast */}
      {toastMessage && (
        <div className={styles.toast}>
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
