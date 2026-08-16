"use client";

// MOCK(A-DASH-1/2/4): GET /api/v1/admin/dashboard aggregation metrics mock

import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  BookOpen,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Cpu,
  CreditCard,
  Database,
  FileSpreadsheet,
  GraduationCap,
  HardDrive,
  LayoutDashboard,
  Menu,
  Plus,
  Radio,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatVnd } from "../../lib/formatters";
import styles from "./dashboard.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface DashboardEvent {
  id: string;
  icon: typeof CircleDollarSign;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  time: string;
}

const initialEvents: DashboardEvent[] = [
  {
    id: "e1",
    icon: Clock,
    iconBg: "rgba(217,119,6,0.12)",
    iconColor: "#D97706",
    title: "Đỗ Hải Yến đã nộp báo cáo buổi học HSK 3 — Nhóm B",
    subtitle: "Thời lượng: 75 phút • 5/6 học viên có mặt",
    time: "15 phút trước",
  },
  {
    id: "e2",
    icon: CircleDollarSign,
    iconBg: "rgba(22,163,74,0.12)",
    iconColor: "#16A34A",
    title: "Nguyễn Văn A thanh toán học phí hóa đơn INV-2608-001",
    subtitle: "Số tiền: 1.500.000 ₫ qua Chuyển khoản VietQR",
    time: "1 giờ trước",
  },
  {
    id: "e3",
    icon: WalletCards,
    iconBg: "rgba(37,99,235,0.12)",
    iconColor: "#2563EB",
    title: "Đã tạo kỳ lương nháp Tháng 8/2026 (PER-2608)",
    subtitle: "Tổng hợp 18 buổi học đã duyệt • 2 giáo viên",
    time: "2 giờ trước",
  },
  {
    id: "e4",
    icon: GraduationCap,
    iconBg: "rgba(124,58,237,0.12)",
    iconColor: "#7C3AED",
    title: "Cập nhật biểu học phí cấp độ HSK 3",
    subtitle: "Điều chỉnh mức niêm yết: 1.800.000 ₫ / tháng",
    time: "Hôm qua",
  },
  {
    id: "e5",
    icon: Database,
    iconBg: "rgba(15,23,42,0.08)",
    iconColor: "#0F172A",
    title: "Tác vụ bảo trì tự động: Sao lưu PostgreSQL thành công",
    subtitle: "Kích thước sao lưu: 142 MB • Lưu trữ an toàn R2",
    time: "Hôm qua",
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
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
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin">
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
            <strong>Tổng quan hệ thống</strong>
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
          <div className={styles.welcomeRow}>
            <div>
              <p className={styles.eyebrow}>TRUNG TÂM ĐIỀU HÀNH</p>
              <h1>Xin chào, Quản trị viên</h1>
              <p className={styles.subtitle}>
                Hôm nay là Chủ Nhật, 16/08/2026 • Tất cả 4 dịch vụ hạ tầng đang hoạt động ổn định.
              </p>
            </div>
            <div className={styles.quickActions}>
              <Link className={styles.secondaryAction} href="/admin/payroll/sessions">
                <Clock size={15} />
                <span>Duyệt 5 buổi học</span>
              </Link>
              <Link className={styles.primaryAction} href="/admin/invoices/generate">
                <FileSpreadsheet size={15} />
                <span>Xuất hóa đơn tháng 8</span>
              </Link>
            </div>
          </div>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", color: "#991B1B" }}>
              <span>Không tải được dữ liệu tổng quan. Vui lòng kiểm tra kết nối hệ thống.</span>
            </div>
          )}

          {/* Primary KPI Metrics Grid */}
          <section className={styles.kpiGrid} aria-label="Chỉ số hiệu quả">
            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span>Doanh thu tháng (8/2026)</span>
                <CircleDollarSign size={18} color="#16A34A" />
              </div>
              <div className={styles.kpiVal}>{reviewState === "empty" ? "0 ₫" : "106.200.000 ₫"}</div>
              <div className={styles.kpiProgressTrack}>
                <div className={styles.kpiProgressFill} style={{ width: reviewState === "empty" ? "0%" : "88.5%", backgroundColor: "#16A34A" }} />
              </div>
              <span className={styles.kpiFoot}>
                <strong style={{ color: "#16A34A" }}>+12%</strong> so với tháng 7 (Mục tiêu 120M)
              </span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span>Chi phí lương (7/2026)</span>
                <WalletCards size={18} color="#2563EB" />
              </div>
              <div className={styles.kpiVal}>{reviewState === "empty" ? "0 ₫" : "15.300.000 ₫"}</div>
              <div className={styles.kpiProgressTrack}>
                <div className={styles.kpiProgressFill} style={{ width: reviewState === "empty" ? "0%" : "100%", backgroundColor: "#2563EB" }} />
              </div>
              <span className={styles.kpiFoot}>18 buổi học • 2 giáo viên</span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span>Học viên hoạt động</span>
                <Users size={18} color="#7C3AED" />
              </div>
              <div className={styles.kpiVal}>{reviewState === "empty" ? 0 : 59} học viên</div>
              <div className={styles.kpiProgressTrack}>
                <div className={styles.kpiProgressFill} style={{ width: reviewState === "empty" ? "0%" : "74%", backgroundColor: "#7C3AED" }} />
              </div>
              <span className={styles.kpiFoot}>Phân bổ trên 6 cấp độ HSK 1–6</span>
            </article>

            <article className={styles.kpiCard}>
              <div className={styles.kpiTop}>
                <span>Buổi học chờ duyệt</span>
                <Clock size={18} color="#D97706" />
              </div>
              <div className={styles.kpiVal}>{reviewState === "empty" ? 0 : 5} buổi</div>
              <div className={styles.kpiProgressTrack}>
                <div className={styles.kpiProgressFill} style={{ width: reviewState === "empty" ? "0%" : "62%", backgroundColor: "#D97706" }} />
              </div>
              <span className={styles.kpiFoot}>Cần duyệt trước khi chốt kỳ lương</span>
            </article>
          </section>

          {/* Actionable Attention Required Card */}
          <section className={styles.attentionCard} aria-label="Mục cần xử lý ngay">
            <h2 className={styles.attentionTitle}>Mục cần xử lý ngay</h2>
            <div className={styles.attentionList}>
              <div className={styles.attentionItem}>
                <span>5 buổi học giáo viên đã gửi</span>
                <Link href="/admin/payroll/sessions">Duyệt ngay →</Link>
              </div>
              <div className={styles.attentionItem}>
                <span>3 hóa đơn học phí đang quá hạn</span>
                <Link href="/admin/invoices">Xem danh sách →</Link>
              </div>
              <div className={styles.attentionItem}>
                <span>Giám sát hạ tầng & AI API</span>
                <Link href="/admin/monitoring">Kiểm tra →</Link>
              </div>
            </div>
          </section>

          {/* Modules Overview */}
          <h2 className={styles.sectionTitle}>Phân hệ quản trị</h2>
          <section className={styles.modulesGrid} aria-label="Phân hệ chức năng">
            <Link className={styles.moduleCard} href="/admin/invoices">
              <div>
                <div className={styles.moduleIconWrap} style={{ backgroundColor: "rgba(22,163,74,0.12)", color: "#16A34A" }}>
                  <CircleDollarSign size={22} />
                </div>
                <h3>Học phí & Hóa đơn</h3>
                <p>Theo dõi công nợ, phát hành hóa đơn hàng tháng và quản lý đơn giá học phí theo trình độ HSK.</p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>

            <Link className={styles.moduleCard} href="/admin/payroll">
              <div>
                <div className={styles.moduleIconWrap} style={{ backgroundColor: "rgba(37,99,235,0.12)", color: "#2563EB" }}>
                  <WalletCards size={22} />
                </div>
                <h3>Lương & Buổi học</h3>
                <p>Duyệt công thực tế, tính lương linh hoạt theo buổi hoặc theo giờ và cấu hình đơn giá giáo viên.</p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>

            <Link className={styles.moduleCard} href="/admin/users">
              <div>
                <div className={styles.moduleIconWrap} style={{ backgroundColor: "rgba(124,58,237,0.12)", color: "#7C3AED" }}>
                  <Users size={22} />
                </div>
                <h3>Tài khoản & Phân quyền</h3>
                <p>Quản trị người dùng hệ thống gồm Quản trị viên, Giáo viên và Học viên, hỗ trợ đặt lại mật khẩu.</p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>

            <Link className={styles.moduleCard} href="/admin/monitoring">
              <div>
                <div className={styles.moduleIconWrap} style={{ backgroundColor: "rgba(15,23,42,0.08)", color: "#0F172A" }}>
                  <ShieldCheck size={22} />
                </div>
                <h3>Giám sát & Hạ tầng</h3>
                <p>Kiểm tra tình trạng hoạt động của PostgreSQL, Redis, Gemini AI API, bộ nhớ và nhật ký kiểm toán.</p>
              </div>
              <span className={styles.moduleLink}>
                Vào phân hệ <ChevronRight size={14} />
              </span>
            </Link>
          </section>

          {/* Activity Feed */}
          <section className={styles.activityCard} aria-label="Hoạt động gần đây">
            <div className={styles.activityHeader}>
              <h3>Hoạt động gần đây trên hệ thống</h3>
              <button
                style={{ fontSize: "12.5px", color: "#2563EB", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => triggerToast("Đã làm mới dòng sự kiện")}
              >
                Làm mới
              </button>
            </div>
            <table className={styles.activityTable}>
              <tbody>
                {initialEvents.map((evt) => {
                  const IconComp = evt.icon;
                  return (
                    <tr key={evt.id}>
                      <td style={{ width: "44px", paddingRight: "0" }}>
                        <div className={styles.eventIcon} style={{ backgroundColor: evt.iconBg, color: evt.iconColor }}>
                          <IconComp size={16} />
                        </div>
                      </td>
                      <td className={styles.eventText}>
                        <strong>{evt.title}</strong>
                        <small>{evt.subtitle}</small>
                      </td>
                      <td style={{ textAlign: "right", color: "#64748B", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                        {evt.time}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </main>
      </div>

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
