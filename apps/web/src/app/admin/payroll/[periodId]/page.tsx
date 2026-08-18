"use client";

// MOCK(A-PAY-5/6/7): GET /api/v1/admin/payroll/:id and PATCH finalize/paid mock
// ASSUMPTION(decision-3): Payroll period boundary defaults to calendar month with custom date-range support

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Lock,
  Menu,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { formatVnd } from "../../../../lib/formatters";
import { getStatusColor } from "../../../../lib/status";
import styles from "./detail.module.css";

type PayrollStatus = "draft" | "finalized" | "paid";
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface SessionLine {
  date: string;
  class: string;
  time: string;
  rateBasis: string;
  amount: number;
}

interface TeacherBreakdown {
  id: string;
  name: string;
  avatarBg: string;
  avatarText: string;
  sessions: number;
  total: number;
  lines: SessionLine[];
}

const statusLabels: Record<PayrollStatus, string> = {
  draft: "Nháp",
  finalized: "Đã chốt",
  paid: "Đã trả",
};

const initialTeachers: TeacherBreakdown[] = [
  {
    id: "t1",
    name: "Phạm Thị Lan",
    avatarBg: "#F3E8FF",
    avatarText: "#7E22CE",
    sessions: 10,
    total: 4200000,
    lines: [
      { date: "30/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "28/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "23/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "21/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "16/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "14/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "09/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "07/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "02/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 20:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "01/07/2026", class: "HSK 2 — Nhóm A", time: "19:00 – 21:00 (120 phút)", rateBasis: "300.000 ₫ / giờ (2h)", amount: 600000 },
    ],
  },
  {
    id: "t2",
    name: "Đỗ Hải Yến",
    avatarBg: "#E0E7FF",
    avatarText: "#3730A3",
    sessions: 8,
    total: 3300000,
    lines: [
      { date: "29/07/2026", class: "HSK 3 — Nhóm B", time: "18:00 – 19:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "27/07/2026", class: "HSK 3 — Nhóm B", time: "18:00 – 19:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "22/07/2026", class: "HSK 3 — Nhóm B", time: "18:00 – 19:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "20/07/2026", class: "HSK 3 — Nhóm B", time: "18:00 – 19:30 (90 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "15/07/2026", class: "HSK 1 — Nhóm C", time: "17:00 – 18:00 (60 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "13/07/2026", class: "HSK 1 — Nhóm C", time: "17:00 – 18:00 (60 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "08/07/2026", class: "HSK 1 — Nhóm C", time: "17:00 – 18:00 (60 phút)", rateBasis: "400.000 ₫ / buổi", amount: 400000 },
      { date: "06/07/2026", class: "HSK 1 — Nhóm C", time: "17:00 – 18:30 (90 phút)", rateBasis: "350.000 ₫ / 1.5h", amount: 500000 },
    ],
  },
];

export default function AdminPayrollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = (params?.periodId as string) || "1";

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [periodStatus, setPeriodStatus] = useState<PayrollStatus>("draft");
  const [paidDate, setPaidDate] = useState<string | null>(null);
  const [expandedTeachers, setExpandedTeachers] = useState<string[]>(["t1", "t2"]);

  // Modals
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [paidInputDate, setPaidInputDate] = useState("2026-08-03");

  const statusTheme = getStatusColor(periodStatus);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function toggleTeacher(id: string) {
    if (expandedTeachers.includes(id)) {
      setExpandedTeachers(expandedTeachers.filter((item) => item !== id));
    } else {
      setExpandedTeachers([...expandedTeachers, id]);
    }
  }

  function confirmFinalize() {
    setPeriodStatus("finalized");
    setShowFinalizeModal(false);
    triggerToast("Đã chốt kỳ lương");
  }

  function confirmMarkPaid() {
    setPeriodStatus("paid");
    setPaidDate(paidInputDate);
    setShowPaidModal(false);
    triggerToast("Đã ghi nhận chi trả kỳ lương");
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

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
            <strong>Chi tiết kỳ lương</strong>
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
          <Link className={styles.backLink} href="/admin/payroll">
            <ChevronLeft size={16} />
            <span>Quay lại danh sách kỳ lương</span>
          </Link>

          {reviewState === "error" ? (
            <div className={styles.emptyCard}>
              <AlertCircle size={44} color="#DC2626" style={{ margin: "0 auto 12px" }} />
              <h2>Không tìm thấy kỳ lương này</h2>
              <p>Mã kỳ lương không tồn tại trong hệ thống.</p>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <section className={styles.headerCard} aria-label="Thông tin kỳ lương">
                <div>
                  <div className={styles.periodTitle}>
                    <h1>01/07 – 31/07/2026</h1>
                    <span
                      className={styles.statusPill}
                      style={{ backgroundColor: statusTheme.bg, color: statusTheme.text }}
                    >
                      <i className={styles.statusDot} />
                      {statusLabels[periodStatus]}
                    </span>
                  </div>
                  <span className={styles.periodSubtitle}>Tháng 7 · 2026 • Mã kỳ: PER-2607</span>
                </div>

                <div className={styles.headerMetrics}>
                  <div className={styles.metricItem}>
                    <small>Số buổi học</small>
                    <strong>{reviewState === "empty" ? 0 : 18} buổi</strong>
                  </div>
                  <div className={styles.metricItem}>
                    <small>Giáo viên</small>
                    <strong>{reviewState === "empty" ? 0 : 2} GV</strong>
                  </div>
                  <div className={`${styles.metricItem} ${styles.metricHeadline}`}>
                    <small>Tổng chi lương</small>
                    <strong>{reviewState === "empty" ? "0 ₫" : "7.500.000 ₫"}</strong>
                  </div>
                </div>

                <div className={styles.headerActionsGroup}>
                  {periodStatus === "draft" && (
                    <>
                      <button
                        className={styles.primaryAction}
                        disabled={reviewState === "empty"}
                        onClick={() => setShowFinalizeModal(true)}
                      >
                        <Lock size={15} />
                        <span>Chốt kỳ lương</span>
                      </button>
                      {reviewState === "empty" && (
                        <span className={styles.actionHelp}>Không thể chốt kỳ lương rỗng.</span>
                      )}
                    </>
                  )}

                  {periodStatus === "finalized" && (
                    <button className={styles.primaryAction} onClick={() => setShowPaidModal(true)}>
                      <Check size={16} />
                      <span>Đánh dấu đã trả</span>
                    </button>
                  )}

                  {periodStatus === "paid" && (
                    <div className={styles.paidBadge}>
                      <Check size={15} />
                      <span>Đã chi trả ngày {paidDate || "03/08/2026"}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Teacher Breakdown Accordions */}
              {reviewState === "empty" ? (
                <div className={styles.emptyCard}>
                  <Inbox size={44} color="#64748B" style={{ margin: "0 auto 12px", opacity: 0.25 }} />
                  <h2>Kỳ lương chưa có dữ liệu</h2>
                  <p>Chưa có buổi học nào được duyệt trong khoảng thời gian này.</p>
                </div>
              ) : (
                <section className={styles.teachersContainer} aria-label="Bảng chi tiết theo giáo viên">
                  {initialTeachers.map((teacher) => {
                    const isOpen = expandedTeachers.includes(teacher.id);
                    return (
                      <article key={teacher.id} className={styles.teacherCard}>
                        <div className={styles.teacherHeader} onClick={() => toggleTeacher(teacher.id)}>
                          <div className={styles.teacherMeta}>
                            <span
                              className={styles.teacherAvatarLarge}
                              style={{ backgroundColor: teacher.avatarBg, color: teacher.avatarText }}
                            >
                              {teacher.name === "Phạm Thị Lan" ? "PL" : "ĐY"}
                            </span>
                            <div>
                              <strong>{teacher.name}</strong>
                              <small>{teacher.sessions} buổi học đã duyệt</small>
                            </div>
                          </div>
                          <div className={styles.teacherFigures}>
                            <strong>{formatVnd(teacher.total)}</strong>
                            <ChevronDown
                              className={`${styles.chevronIcon} ${isOpen ? styles.chevronOpen : ""}`}
                              size={18}
                            />
                          </div>
                        </div>

                        {isOpen && (
                          <table className={styles.breakdownTable}>
                            <thead>
                              <tr>
                                <th>Ngày dạy</th>
                                <th>Lớp</th>
                                <th>Thời gian</th>
                                <th>Mức áp dụng</th>
                                <th className={styles.numeric}>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacher.lines.map((line, idx) => (
                                <tr key={idx}>
                                  <td>{line.date}</td>
                                  <td>{line.class}</td>
                                  <td style={{ color: "#475569" }}>{line.time}</td>
                                  <td>{line.rateBasis}</td>
                                  <td className={styles.numeric} style={{ fontWeight: 600 }}>
                                    {formatVnd(line.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Finalize Modal */}
      {showFinalizeModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Chốt kỳ lương 01/07 – 31/07/2026</h2>
            <p>Sau khi chốt, tổng số buổi và mức chi lương sẽ được khóa và không thể chỉnh sửa thêm.</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowFinalizeModal(false)}
              >
                Hủy
              </button>
              <button type="button" className={styles.confirmBtn} onClick={confirmFinalize}>
                Chốt kỳ lương
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showPaidModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Đánh dấu đã chi trả</h2>
            <p>Xác nhận đã thanh toán toàn bộ 7.500.000 ₫ cho 2 giáo viên trong kỳ lương này.</p>
            <div className={styles.formGroup}>
              <label htmlFor="paidDate">Ngày chi trả *</label>
              <input
                id="paidDate"
                type="date"
                required
                value={paidInputDate}
                onChange={(e) => setPaidInputDate(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowPaidModal(false)}
              >
                Hủy
              </button>
              <button type="button" className={styles.confirmBtn} onClick={confirmMarkPaid}>
                Xác nhận đã trả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review State Switcher Widget */}
      <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
        <span>REVIEW STATE</span>
        {(["ready", "loading", "empty", "error", "forbidden"] as ReviewState[]).map((state) => (
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
