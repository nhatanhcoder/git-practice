"use client";

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
import { useEffect, useMemo, useState } from "react";
import {
  createPayrollPeriod,
  fetchPayrollPeriods,
  fetchTeacherPayRates,
  PayrollPeriodItem,
  TeacherPayRateRow,
} from "../../../lib/admin-payroll-service";
import { formatDate, formatVnd } from "../../../lib/formatters";
import { getStatusColor } from "../../../lib/status";
import styles from "./payroll.module.css";

type PayrollStatus = "draft" | "finalized" | "paid";
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

const statusLabels: Record<PayrollStatus, string> = {
  draft: "Nháp",
  finalized: "Đã chốt",
  paid: "Đã trả",
};

export default function AdminPayrollPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PayrollPeriodItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherPayRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState("2026");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [startDate, setStartDate] = useState("2026-09-01");
  const [endDate, setEndDate] = useState("2026-09-30");

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [periodsRes, teachersRes] = await Promise.all([
        fetchPayrollPeriods(),
        fetchTeacherPayRates({ activeOnly: true }),
      ]);
      setPeriods(periodsRes.periods);
      setTeachers(teachersRes.rates);
      if (teachersRes.rates.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(teachersRes.rates[0].teacherId);
      }
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải danh sách kỳ lương");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPeriods = useMemo(() => {
    return periods.filter((p) => {
      const pYear = p.periodStart
        ? new Date(p.periodStart).getFullYear().toString()
        : "";
      const matchYear = !selectedYear || pYear === selectedYear;
      const matchStatus =
        selectedStatus === "all" || p.status === selectedStatus;
      return matchYear && matchStatus;
    });
  }, [periods, selectedYear, selectedStatus]);

  async function handleCreatePeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTeacherId) {
      setToastMessage("Vui lòng chọn giáo viên");
      return;
    }
    setCreateSubmitting(true);
    try {
      const newPeriod = await createPayrollPeriod({
        teacherId: selectedTeacherId,
        periodStart: startDate,
        periodEnd: endDate,
      });
      setShowCreateModal(false);
      setToastMessage("Đã tạo kỳ lương nháp");
      setTimeout(() => {
        router.push(`/admin/payroll/${newPeriod.id}`);
      }, 600);
    } catch (err: any) {
      setToastMessage(err?.message || "Không thể tạo kỳ lương");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const isEmpty =
    reviewState === "empty" || (!loading && filteredPeriods.length === 0);

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNav(false)}
            aria-label="Đóng menu"
          >
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
          <Link
            className={`${styles.navItem} ${styles.navActive}`}
            href="/admin/payroll"
          >
            <WalletCards size={20} />
            <span>Lương</span>
          </Link>
          <Link className={styles.navItem} href="/admin/monitoring">
            <ShieldCheck size={20} />
            <span>Giám sát</span>
          </Link>
        </nav>
      </aside>

      {/* Main Container */}
      <div className={styles.mainContainer}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              className={styles.menuToggle}
              onClick={() => setMobileNav(true)}
              aria-label="Mở menu"
            >
              <Menu size={24} />
            </button>
            <div className={styles.breadcrumb}>
              <Link href="/admin">Quản trị</Link>
              <ChevronRight size={14} />
              <span>Kỳ lương</span>
            </div>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={18} />
            </button>
            <div className={styles.userProfile}>
              <div className={styles.avatar}>AD</div>
              <span className={styles.userName}>Admin</span>
              <ChevronDown size={14} />
            </div>
          </div>
        </header>

        {/* Sub-nav tabs for Payroll area */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            padding: "0 32px",
            borderBottom: "1px solid #E2E8F0",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Link
            href="/admin/payroll"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#2563EB",
              borderBottom: "2px solid #2563EB",
              textDecoration: "none",
            }}
          >
            Kỳ lương
          </Link>
          <Link
            href="/admin/pay-rates"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
          >
            Biểu thù lao
          </Link>
          <Link
            href="/admin/payroll/sessions"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
          >
            Duyệt buổi học
          </Link>
        </div>

        {/* Content Body */}
        <main className={styles.content}>
          <div className={styles.pageTitleArea}>
            <div>
              <h1 className={styles.pageTitle}>Kỳ chi trả thù lao</h1>
              <p className={styles.pageSubtitle}>
                Quản lý các đợt quyết toán thù lao giảng dạy cho giáo viên theo
                tháng.
              </p>
            </div>
            <div className={styles.pageActions}>
              <Link
                href="/admin/pay-rates"
                className={styles.secondaryButton}
                style={{ textDecoration: "none" }}
              >
                <BookOpen size={16} />
                <span>Biểu thù lao</span>
              </Link>
              <button
                className={styles.primaryButton}
                onClick={() => setShowCreateModal(true)}
              >
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
            <span className={styles.filterCount}>
              {filteredPeriods.length} kỳ lương
            </span>
          </section>

          {/* Error Banner */}
          {(errorMessage || reviewState === "error") && (
            <div
              style={{
                backgroundColor: "rgba(220,38,38,0.08)",
                borderLeft: "3px solid #DC2626",
                padding: "12px 16px",
                borderRadius: "6px",
                marginBottom: "16px",
                color: "#991B1B",
              }}
            >
              <span>{errorMessage || "Không tải được danh sách kỳ lương."}</span>
            </div>
          )}

          {/* Table Card */}
          <section className={styles.tableCard} aria-label="Danh sách kỳ lương">
            {loading || reviewState === "loading" ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                Đang tải danh sách kỳ lương...
              </div>
            ) : isEmpty ? (
              <div className={styles.emptyState}>
                <Inbox
                  size={48}
                  color="#64748B"
                  style={{ margin: "0 auto 12px", opacity: 0.25 }}
                />
                <h2>Chưa có kỳ lương nào</h2>
                <p>
                  Tạo kỳ lương đầu tiên để bắt đầu tổng hợp công cho giáo viên.
                </p>
                <button
                  className={styles.primaryButton}
                  onClick={() => setShowCreateModal(true)}
                >
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
                      <th className={styles.numeric}>Ngày chi trả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriods.map((p) => {
                      const statusTheme = getStatusColor(p.status);
                      const rangeStr = `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => router.push(`/admin/payroll/${p.id}`)}
                          tabIndex={0}
                          onKeyDown={(e) =>
                            e.key === "Enter" && router.push(`/admin/payroll/${p.id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td className={styles.periodCell}>
                            <strong>{rangeStr}</strong>
                            <small>Mã kỳ: {p.code}</small>
                          </td>
                          <td>
                            <strong>{p.teacherName}</strong>
                          </td>
                          <td className={styles.numeric}>
                            {p.totalSessions ?? 0}
                          </td>
                          <td
                            className={styles.numeric}
                            style={{ fontWeight: 600 }}
                          >
                            {formatVnd(Number(p.totalAmount))}
                          </td>
                          <td>
                            <span
                              className={styles.statusPill}
                              style={{
                                backgroundColor: statusTheme.bg,
                                color: statusTheme.text,
                              }}
                            >
                              <i className={styles.statusDot} />
                              {statusLabels[p.status] || p.status}
                            </span>
                          </td>
                          <td
                            className={styles.numeric}
                            style={{ color: "#64748B" }}
                          >
                            {formatDate(p.paidAt)}
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
            <p>
              Chọn giáo viên và khoảng thời gian để hệ thống tổng hợp toàn bộ buổi
              học đã duyệt.
            </p>
            <form onSubmit={handleCreatePeriod}>
              <div className={styles.formGroup} style={{ marginBottom: "16px" }}>
                <label htmlFor="teacherSelect">Giáo viên *</label>
                <select
                  id="teacherSelect"
                  required
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #CBD5E1",
                    fontSize: "14px",
                  }}
                >
                  {teachers.map((t) => (
                    <option key={t.teacherId} value={t.teacherId}>
                      {t.teacherName} ({t.teacherEmail})
                    </option>
                  ))}
                </select>
              </div>

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

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowCreateModal(false)}
                  disabled={createSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={createSubmitting}
                >
                  {createSubmitting ? "Đang xử lý..." : "Tạo kỳ lương nháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEB-004: design-review scaffolding, dev only. Over live data it lets a
          failed load be repainted as a healthy one. */}
      {process.env.NODE_ENV !== "production" && (
        <aside
          className={styles.stateSwitcher}
          aria-label="Review State Switcher"
        >
          <span>REVIEW STATE</span>
          {(
            ["ready", "loading", "empty", "error", "forbidden"] as ReviewState[]
          ).map((state) => (
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
