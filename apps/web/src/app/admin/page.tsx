"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Database,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  DashboardStats,
  fetchDashboardStats,
} from "../../lib/admin-dashboard-service";
import { formatVnd } from "../../lib/formatters";
import styles from "./dashboard.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadStats() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải số liệu tổng quan");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const revenueNum = Number(stats?.revenueThisMonth || 0);
  const payrollNum = Number(stats?.payrollThisMonth || 0);
  const activeStudentsCount = stats?.activeStudents ?? 0;
  const sessionsPendingCount = stats?.sessionsPendingReview ?? 0;
  const unpaidInvoicesCount = stats?.unpaidInvoices ?? 0;

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
          <Link
            className={`${styles.navItem} ${styles.navActive}`}
            href="/admin"
          >
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
          <Link className={styles.navItem} href="/admin/payroll">
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
      {mobileNav && (
        <button
          className={styles.navBackdrop}
          onClick={() => setMobileNav(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* Main Column */}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.menuButton}
              onClick={() => setMobileNav(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={14} />
            <strong>Tổng quan hệ thống</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            <div className={styles.profileButton}>
              <span
                className={styles.avatar}
                style={{ backgroundColor: "#E0E7FF", color: "#3730A3" }}
              >
                AD
              </span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.welcomeRow}>
            <div>
              <p className={styles.eyebrow}>TRUNG TÂM ĐIỀU HÀNH</p>
              <h1>Xin chào, Quản trị viên</h1>
              <p className={styles.subtitle}>
                Hệ thống học tập trực tuyến HSK • Giám sát doanh thu, công nợ và
                hoạt động giảng dạy.
              </p>
            </div>
            <div className={styles.quickActions}>
              <Link
                className={styles.secondaryAction}
                href="/admin/payroll/sessions"
              >
                <Clock size={15} />
                <span>Duyệt {sessionsPendingCount} buổi học</span>
              </Link>
              <Link
                className={styles.primaryAction}
                href="/admin/invoices/generate"
              >
                <FileSpreadsheet size={15} />
                <span>Tạo hóa đơn tháng</span>
              </Link>
            </div>
          </div>

          {/* Error Banner */}
          {(errorMessage || reviewState === "error") && (
            <div
              style={{
                backgroundColor: "rgba(220,38,38,0.08)",
                borderLeft: "3px solid #DC2626",
                padding: "12px 16px",
                borderRadius: "6px",
                marginBottom: "20px",
                color: "#991B1B",
              }}
            >
              <span>
                {errorMessage ||
                  "Không tải được dữ liệu tổng quan. Vui lòng kiểm tra kết nối hệ thống."}
              </span>
            </div>
          )}

          {/* Primary KPI Metrics Grid */}
          <section className={styles.kpiGrid} aria-label="Chỉ số hiệu quả">
            <Link className={styles.kpiCard} href="/admin/invoices">
              <div className={styles.kpiTop}>
                <span>Doanh thu tháng này</span>
                <CircleDollarSign size={18} color="#16A34A" />
              </div>
              <div className={styles.kpiVal}>
                {loading || reviewState === "loading"
                  ? "—"
                  : formatVnd(revenueNum)}
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressFill}
                  style={{ width: revenueNum > 0 ? "85%" : "0%", backgroundColor: "#16A34A" }}
                />
              </div>
              <span className={styles.kpiFoot}>
                Chưa thanh toán: {unpaidInvoicesCount} hóa đơn
              </span>
            </Link>

            <Link className={styles.kpiCard} href="/admin/payroll">
              <div className={styles.kpiTop}>
                <span>Chi phí lương tháng</span>
                <WalletCards size={18} color="#2563EB" />
              </div>
              <div className={styles.kpiVal}>
                {loading || reviewState === "loading"
                  ? "—"
                  : formatVnd(payrollNum)}
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressFill}
                  style={{ width: payrollNum > 0 ? "100%" : "0%", backgroundColor: "#2563EB" }}
                />
              </div>
              <span className={styles.kpiFoot}>
                Giáo viên đang hoạt động: {stats?.activeTeachers ?? 0}
              </span>
            </Link>

            <Link className={styles.kpiCard} href="/admin/users">
              <div className={styles.kpiTop}>
                <span>Học viên hoạt động</span>
                <Users size={18} color="#7C3AED" />
              </div>
              <div className={styles.kpiVal}>
                {loading || reviewState === "loading"
                  ? "—"
                  : `${activeStudentsCount} học viên`}
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressFill}
                  style={{
                    width: activeStudentsCount > 0 ? "75%" : "0%",
                    backgroundColor: "#7C3AED",
                  }}
                />
              </div>
              <span className={styles.kpiFoot}>
                Chờ duyệt tài khoản: {stats?.pendingUsers ?? 0}
              </span>
            </Link>

            <Link className={styles.kpiCard} href="/admin/payroll/sessions">
              <div className={styles.kpiTop}>
                <span>Buổi học chờ duyệt</span>
                <Clock size={18} color="#D97706" />
              </div>
              <div className={styles.kpiVal}>
                {loading || reviewState === "loading"
                  ? "—"
                  : `${sessionsPendingCount} buổi`}
              </div>
              <div className={styles.kpiProgressTrack}>
                <div
                  className={styles.kpiProgressFill}
                  style={{
                    width: sessionsPendingCount > 0 ? "60%" : "0%",
                    backgroundColor: "#D97706",
                  }}
                />
              </div>
              <span className={styles.kpiFoot}>
                Cần duyệt trước khi chốt kỳ lương
              </span>
            </Link>
          </section>

          {/* Actionable Attention Required Card */}
          <section
            className={styles.attentionCard}
            aria-label="Mục cần xử lý ngay"
          >
            <h2 className={styles.attentionTitle}>Mục cần xử lý ngay</h2>
            <div className={styles.attentionList}>
              <div className={styles.attentionItem}>
                <span>
                  {sessionsPendingCount} buổi học giáo viên đã gửi chờ duyệt
                </span>
                <Link href="/admin/payroll/sessions">Duyệt ngay →</Link>
              </div>
              <div className={styles.attentionItem}>
                <span>
                  {unpaidInvoicesCount} hóa đơn học phí đang chờ thanh toán
                </span>
                <Link href="/admin/invoices">Xem danh sách →</Link>
              </div>
              <div className={styles.attentionItem}>
                <span>Giám sát hạ tầng, cơ sở dữ liệu & Gemini AI</span>
                <Link href="/admin/monitoring">Kiểm tra →</Link>
              </div>
            </div>
          </section>

          {/* Modules Overview */}
          <h2 className={styles.sectionTitle}>Phân hệ quản trị</h2>
          <section
            className={styles.modulesGrid}
            aria-label="Phân hệ chức năng"
          >
            <Link className={styles.moduleCard} href="/admin/invoices">
              <div>
                <div
                  className={styles.moduleIconWrap}
                  style={{
                    backgroundColor: "rgba(22,163,74,0.12)",
                    color: "#16A34A",
                  }}
                >
                  <CircleDollarSign size={22} />
                </div>
                <h3>Học phí & Hóa đơn</h3>
                <p>
                  Theo dõi công nợ, phát hành hóa đơn hàng tháng và quản lý đơn
                  giá học phí theo từng học sinh.
                </p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>

            <Link className={styles.moduleCard} href="/admin/payroll">
              <div>
                <div
                  className={styles.moduleIconWrap}
                  style={{
                    backgroundColor: "rgba(37,99,235,0.12)",
                    color: "#2563EB",
                  }}
                >
                  <WalletCards size={22} />
                </div>
                <h3>Lương & Buổi học</h3>
                <p>
                  Duyệt công thực tế, tính lương linh hoạt theo buổi hoặc theo
                  giờ và cấu hình đơn giá giáo viên.
                </p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>

            <Link className={styles.moduleCard} href="/admin/monitoring">
              <div>
                <div
                  className={styles.moduleIconWrap}
                  style={{
                    backgroundColor: "rgba(15,23,42,0.08)",
                    color: "#0F172A",
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <h3>Giám sát hệ thống</h3>
                <p>
                  Theo dõi tình trạng API Gemini, hạn ngạch dùng chung, trạng thái
                  kết nối Postgres và MongoDB.
                </p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>
          </section>
        </main>
      </div>

      {/* WEB-004: design-review scaffolding, dev only */}
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
