"use client";

// MOCK(A-PAY-4/7): GET /api/v1/admin/payroll and POST create-period mock
// ASSUMPTION(decision-3): Payroll period boundary defaults to calendar month with custom date-range support

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatVnd } from "../../../lib/formatters";
import { getStatusColor } from "../../../lib/status";
import styles from "./payroll.module.css";

type PayrollStatus = "draft" | "finalized" | "paid";
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface PayrollPeriodItem {
  id: string;
  code: string;
  range: string;
  monthSubtitle: string;
  primaryTeacher: string;
  otherTeacherCount: number;
  sessions: number;
  totalAmount: number;
  status: PayrollStatus;
  paidAt: string | null;
}

const mockPeriods: PayrollPeriodItem[] = [
  {
    id: "1",
    code: "PER-2607",
    range: "01/07 – 31/07/2026",
    monthSubtitle: "Tháng 7 · 2026",
    primaryTeacher: "Phạm Thị Lan",
    otherTeacherCount: 1,
    sessions: 18,
    totalAmount: 7500000,
    status: "draft",
    paidAt: null,
  },
  {
    id: "2",
    code: "PER-2606",
    range: "01/06 – 30/06/2026",
    monthSubtitle: "Tháng 6 · 2026",
    primaryTeacher: "Phạm Thị Lan",
    otherTeacherCount: 1,
    sessions: 19,
    totalAmount: 7800000,
    status: "finalized",
    paidAt: null,
  },
  {
    id: "3",
    code: "PER-2605",
    range: "01/05 – 31/05/2026",
    monthSubtitle: "Tháng 5 · 2026",
    primaryTeacher: "Phạm Thị Lan",
    otherTeacherCount: 1,
    sessions: 16,
    totalAmount: 6600000,
    status: "paid",
    paidAt: "03/06/2026",
  },
  {
    id: "4",
    code: "PER-2604",
    range: "01/04 – 30/04/2026",
    monthSubtitle: "Tháng 4 · 2026",
    primaryTeacher: "Phạm Thị Lan",
    otherTeacherCount: 1,
    sessions: 15,
    totalAmount: 6300000,
    status: "paid",
    paidAt: "02/05/2026",
  },
];

const statusLabels: Record<PayrollStatus, string> = {
  draft: "Nháp",
  finalized: "Đã chốt",
  paid: "Đã trả",
};

export default function AdminPayrollPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>(mockPeriods);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedTeacher, setSelectedTeacher] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-31");

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const matchTeacher = selectedTeacher === "all" || p.primaryTeacher === selectedTeacher;
      const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
      return matchTeacher && matchStatus;
    });
  }, [periods, selectedTeacher, selectedStatus]);

  function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    const newPeriod: PayrollPeriodItem = {
      id: "5",
      code: "PER-2608",
      range: "01/08 – 31/08/2026",
      monthSubtitle: "Tháng 8 · 2026",
      primaryTeacher: "Phạm Thị Lan",
      otherTeacherCount: 1,
      sessions: 18,
      totalAmount: 7500000,
      status: "draft",
      paidAt: null,
    };
    setPeriods([newPeriod, ...periods]);
    setShowCreateModal(false);
    setToastMessage("Đã tạo kỳ lương nháp");
    setTimeout(() => {
      router.push(`/admin/payroll/${newPeriod.id}`);
    }, 800);
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const isEmpty = reviewState === "empty" || filteredPeriods.length === 0;

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
            <strong>Kỳ lương</strong>
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
              <p className={styles.eyebrow}>QUẢN LÝ KỲ LƯƠNG</p>
              <h1>Kỳ lương</h1>
              <p className={styles.subtitle}>Tổng hợp các kỳ thanh toán và trạng thái chi trả cho giáo viên.</p>
            </div>
            <div className={styles.titleControls}>
              <select
                className={styles.teacherSelect}
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                aria-label="Lọc theo giáo viên"
              >
                <option value="all">Tất cả giáo viên</option>
                <option value="Phạm Thị Lan">Phạm Thị Lan</option>
                <option value="Đỗ Hải Yến">Đỗ Hải Yến</option>
              </select>
              <Link className={styles.secondaryButton} href="/admin/payroll/sessions">
                <span>Duyệt buổi học</span>
              </Link>
              <Link className={styles.secondaryButton} href="/admin/pay-rates">
                <span>Mức lương GV</span>
              </Link>
              <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
                <Plus size={16} />
                <span>Tạo kỳ lương</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <section className={styles.filterCard} aria-label="Bộ lọc kỳ lương">
            <div className={styles.filterGroup}>
              <label htmlFor="yearSelect">Năm:</label>
              <select
                id="yearSelect"
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="statusSelect">Trạng thái:</label>
              <select
                id="statusSelect"
                className={styles.filterSelect}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="finalized">Đã chốt</option>
                <option value="paid">Đã trả</option>
              </select>
            </div>
            <span className={styles.filterCount}>{filteredPeriods.length} kỳ lương</span>
          </section>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", color: "#991B1B" }}>
              <span>Không tải được danh sách kỳ lương.</span>
            </div>
          )}

          {/* Table Card */}
          <section className={styles.tableCard} aria-label="Danh sách kỳ lương">
            {isEmpty ? (
              <div className={styles.emptyState}>
                <Inbox size={48} color="#64748B" style={{ margin: "0 auto 12px", opacity: 0.25 }} />
                <h2>Chưa có kỳ lương nào</h2>
                <p>Tạo kỳ lương đầu tiên để bắt đầu tổng hợp công cho giáo viên.</p>
                <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
                  Tạo kỳ lương
                </button>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Kỳ lương</th>
                      <th>Giáo viên</th>
                      <th className={styles.numeric}>Số buổi</th>
                      <th className={styles.numeric}>Tổng chi</th>
                      <th>Trạng thái</th>
                      <th className={styles.numeric}>Ngày trả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriods.map((p) => {
                      const statusTheme = getStatusColor(p.status);
                      return (
                        <tr
                          key={p.id}
                          onClick={() => router.push(`/admin/payroll/${p.id}`)}
                          tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && router.push(`/admin/payroll/${p.id}`)}
                        >
                          <td className={styles.periodCell}>
                            <strong>{p.range}</strong>
                            <small>{p.monthSubtitle}</small>
                          </td>
                          <td>
                            <div className={styles.teacherCell}>
                              <span
                                className={styles.teacherAvatar}
                                style={{ backgroundColor: "#F3E8FF", color: "#7E22CE" }}
                              >
                                PL
                              </span>
                              <span>
                                <strong>{p.primaryTeacher}</strong>
                                <small style={{ display: "block", color: "#64748B", fontSize: "12px" }}>
                                  + {p.otherTeacherCount} giáo viên khác
                                </small>
                              </span>
                            </div>
                          </td>
                          <td className={styles.numeric}>{p.sessions}</td>
                          <td className={styles.numeric} style={{ fontWeight: 600 }}>
                            {formatVnd(p.totalAmount)}
                          </td>
                          <td>
                            <span
                              className={styles.statusPill}
                              style={{ backgroundColor: statusTheme.bg, color: statusTheme.text }}
                            >
                              <i className={styles.statusDot} />
                              {statusLabels[p.status]}
                            </span>
                          </td>
                          <td className={styles.numeric} style={{ color: "#64748B" }}>
                            {p.paidAt || "—"}
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

      {/* Create Period Modal */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Tạo kỳ lương</h2>
            <p>Chọn khoảng thời gian để hệ thống tổng hợp toàn bộ buổi học đã duyệt.</p>
            <form onSubmit={handleCreatePeriod}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="startDate">Ngày bắt đầu *</label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="endDate">Ngày kết thúc *</label>
                  <input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.previewBox}>
                <strong>Xem trước: 18 buổi học đã duyệt · 2 giáo viên</strong>
              </div>

              <div className={styles.pendingWarning}>
                <span>Còn 5 buổi chưa duyệt trong khoảng thời gian này. </span>
                <Link href="/admin/payroll/sessions">Duyệt ngay</Link>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Tạo kỳ lương nháp
                </button>
              </div>
            </form>
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
