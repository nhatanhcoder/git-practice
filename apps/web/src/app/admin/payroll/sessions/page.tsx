"use client";

// MOCK(A-PAY-2/3): GET /api/v1/admin/sessions/pending and PATCH approve/reject endpoints mock
// ASSUMPTION(decision-2): Pay-rate unit basis supports per_session and per_hour (0.5h rounded up)

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
import { useMemo, useState } from "react";
import { avatarToneFor, initialsOf } from "../../../../lib/formatters";
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

const initialSessions: SessionQueueItem[] = [
  {
    id: "sess-1",
    teacher: "Phạm Thị Lan",
    class: "HSK 2 — Nhóm A",
    date: "08/08/2026",
    scheduled: "19:00 – 20:30",
    actual: "19:05 – 20:35",
    minutes: 90,
    topic: "Bài 12 — Trợ từ ngữ khí 吗 / 呢",
    notes: "Học sinh nắm bài tốt, cần luyện thêm phát âm.",
    attendance: { present: 7, excused: 1, unexcused: 0, total: 8 },
  },
  {
    id: "sess-2",
    teacher: "Phạm Thị Lan",
    class: "HSK 2 — Nhóm A",
    date: "06/08/2026",
    scheduled: "19:00 – 20:30",
    actual: "19:00 – 20:30",
    minutes: 90,
    topic: "Bài 11 — Câu hỏi lựa chọn",
    notes: "",
    attendance: { present: 8, excused: 0, unexcused: 0, total: 8 },
  },
  {
    id: "sess-3",
    teacher: "Đỗ Hải Yến",
    class: "HSK 3 — Nhóm B",
    date: "06/08/2026",
    scheduled: "18:00 – 19:30",
    actual: "18:10 – 19:25",
    minutes: 75,
    topic: "Bài 8 — Bổ ngữ kết quả",
    notes: "Kết thúc sớm 5 phút.",
    attendance: { present: 5, excused: 0, unexcused: 1, total: 6 },
  },
  {
    id: "sess-4",
    teacher: "Đỗ Hải Yến",
    class: "HSK 1 — Nhóm C",
    date: "05/08/2026",
    scheduled: "17:00 – 18:00",
    actual: "17:00 – 18:00",
    minutes: 60,
    topic: "Bài 5 — Số đếm và ngày tháng",
    notes: "",
    attendance: { present: 4, excused: 1, unexcused: 0, total: 5 },
  },
  {
    id: "sess-5",
    teacher: "Phạm Thị Lan",
    class: "HSK 2 — Nhóm A",
    date: "01/08/2026",
    scheduled: "19:00 – 20:30",
    actual: "19:00 – 20:50",
    minutes: 110,
    topic: "Bài 10 — Ôn tập giữa kỳ",
    notes: "Dạy bù 20 phút cho phần ôn tập.",
    attendance: { present: 8, excused: 0, unexcused: 0, total: 8 },
  },
];

export default function AdminSessionReviewPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionQueueItem[]>(initialSessions);
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [activeSession, setActiveSession] = useState<SessionQueueItem | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [sessionToReject, setSessionToReject] = useState<SessionQueueItem | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => teacherFilter === "all" || s.teacher === teacherFilter);
  }, [sessions, teacherFilter]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleApprove(session: SessionQueueItem) {
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    if (activeSession?.id === session.id) {
      setActiveSession(null);
    }
    triggerToast("Đã duyệt buổi học");
  }

  function openRejectModal(session: SessionQueueItem) {
    setSessionToReject(session);
    setRejectReason("");
    setShowRejectModal(true);
  }

  function confirmReject() {
    if (!sessionToReject || !rejectReason.trim()) return;
    setSessions((prev) => prev.filter((s) => s.id !== sessionToReject.id));
    if (activeSession?.id === sessionToReject.id) {
      setActiveSession(null);
    }
    setShowRejectModal(false);
    triggerToast("Đã từ chối buổi học");
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "drawer") {
      setActiveSession(filteredSessions[0] || initialSessions[0]);
    } else {
      setActiveSession(null);
    }
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const isEmpty = reviewState === "empty" || filteredSessions.length === 0;

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
            {!isEmpty && <span className={styles.queueBadge}>{filteredSessions.length} buổi</span>}
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
                <option value="Phạm Thị Lan">Phạm Thị Lan</option>
                <option value="Đỗ Hải Yến">Đỗ Hải Yến</option>
              </select>
            </div>
          </section>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", color: "#991B1B", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Không tải được danh sách buổi học chờ duyệt.</span>
              <button style={{ backgroundColor: "#DC2626", color: "#fff", padding: "4px 10px", borderRadius: "4px" }} onClick={() => setReviewState("ready")}>Thử lại</button>
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

      {/* Review State Switcher Widget */}
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
