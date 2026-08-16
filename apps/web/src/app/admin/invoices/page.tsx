"use client";

// MOCK(A-INV-4): GET /api/v1/admin/invoices and meta.summary mock dataset
// ASSUMPTION(decision-1): Billing model is per-student monthly flat rate with append-only history

import {
  AlertCircle,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { avatarToneFor, formatVnd, initialsOf } from "../../../lib/formatters";
import { getStatusColor } from "../../../lib/status";
import styles from "./invoices.module.css";

type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "void" | "overdue";
type ReviewState = "ready" | "loading" | "empty" | "partial" | "error" | "forbidden";

interface InvoiceItem {
  id: string;
  student: string;
  period: string;
  total: number;
  paid: number;
  status: InvoiceStatus;
}

const mockInvoices: InvoiceItem[] = [
  { id: "INV-2608-001", student: "Nguyễn Minh Anh", period: "01/08 – 31/08/2026", total: 2500000, paid: 2500000, status: "paid" },
  { id: "INV-2608-002", student: "Lê Quang Dũng", period: "01/08 – 31/08/2026", total: 2500000, paid: 2500000, status: "paid" },
  { id: "INV-2608-003", student: "Hoàng Văn Nam", period: "01/08 – 31/08/2026", total: 2500000, paid: 2500000, status: "paid" },
  { id: "INV-2608-004", student: "Vũ Ngọc Bích", period: "01/08 – 31/08/2026", total: 2500000, paid: 2500000, status: "paid" },
  { id: "INV-2608-005", student: "Đặng Thu Trang", period: "01/08 – 31/08/2026", total: 2500000, paid: 2500000, status: "paid" },
  { id: "INV-2608-006", student: "Trần Bảo Long", period: "01/08 – 31/08/2026", total: 2500000, paid: 1000000, status: "partially_paid" },
  { id: "INV-2608-007", student: "Ngô Khánh Vy", period: "01/08 – 31/08/2026", total: 2500000, paid: 0, status: "unpaid" },
  { id: "INV-2608-008", student: "Mai Tuấn Kiệt", period: "01/08 – 31/08/2026", total: 2500000, paid: 0, status: "void" },
];

const mockSummary = {
  paidStudents: 5,
  totalStudents: 8,
  collected: 12500000,
  outstanding: 7500000,
};

const statusLabels: Record<InvoiceStatus, string> = {
  unpaid: "Chưa nộp",
  overdue: "Quá hạn",
  partially_paid: "Còn nợ một phần",
  paid: "Đã nộp",
  void: "Đã hủy",
};

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("08/2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    if (selectedPeriod !== "08/2026") {
      return [];
    }
    const query = searchQuery.trim().toLowerCase();
    return mockInvoices.filter((item) => {
      const matchName = !query || item.student.toLowerCase().includes(query);
      const matchStatus = statusFilter === "all" || item.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [selectedPeriod, searchQuery, statusFilter]);

  const showEmpty = reviewState === "empty" || filteredInvoices.length === 0;

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => {
        router.push("/login");
      }, 1400);
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
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin/invoices">
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
            <span>Quản trị</span>
            <ChevronRight size={14} />
            <strong>Học phí</strong>
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
              <span className={styles.profileText}>
                <strong>Anh Tuấn</strong>
                <small>Quản trị viên</small>
              </span>
              <ChevronDown size={15} color="#475569" />
            </Link>
          </div>
        </header>

        <main className={styles.content}>
          {/* Title Row */}
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>QUẢN LÝ THU PHÍ</p>
              <h1>Học phí</h1>
              <p className={styles.subtitle}>Danh sách và tiến độ thu học phí theo từng kỳ của toàn bộ học sinh.</p>
            </div>
            <div className={styles.titleControls}>
              <select
                className={styles.periodSelect}
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                aria-label="Chọn kỳ thu học phí"
              >
                <option value="08/2026">Tháng 08/2026</option>
                <option value="07/2026">Tháng 07/2026</option>
                <option value="06/2026">Tháng 06/2026</option>
              </select>
              <Link className={styles.primaryButton} href={`/admin/invoices/generate?period=${selectedPeriod}`}>
                <Plus size={16} />
                <span>Tạo hóa đơn tháng…</span>
              </Link>
            </div>
          </div>

          {/* KPI Row */}
          <section className={styles.kpiRow} aria-label="Chỉ số thu học phí">
            {reviewState === "loading" ? (
              <>
                <div className={styles.kpiSkeleton} />
                <div className={styles.kpiSkeleton} />
                <div className={styles.kpiSkeleton} />
              </>
            ) : (
              <>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>ĐÃ THU</span>
                  <span className={styles.kpiValue}>
                    {mockSummary.paidStudents}/{mockSummary.totalStudents} học sinh
                  </span>
                  <div className={styles.meterTrack}>
                    <div
                      className={styles.meterFill}
                      style={{ width: `${(mockSummary.paidStudents / mockSummary.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>TỔNG THU</span>
                  <span className={styles.kpiValue}>{formatVnd(mockSummary.collected)}</span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>CÒN NỢ</span>
                  <span className={styles.kpiValue}>{formatVnd(mockSummary.outstanding)}</span>
                </div>
              </>
            )}
          </section>

          {/* Filter Toolbar */}
          <section className={styles.filterCard} aria-label="Bộ lọc hóa đơn">
            <div className={styles.searchBox}>
              <Search className={styles.searchIcon} size={17} />
              <input
                type="text"
                placeholder="Tìm học sinh"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unpaid">Chưa nộp</option>
              <option value="partially_paid">Còn nợ một phần</option>
              <option value="paid">Đã nộp</option>
              <option value="void">Đã hủy</option>
            </select>
            <span className={styles.filterCount}>{filteredInvoices.length} hóa đơn</span>
          </section>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div className={styles.errorBanner} role="alert">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={18} />
                <span>Không tải được danh sách hóa đơn.</span>
              </div>
              <button onClick={() => setReviewState("ready")}>Thử lại</button>
            </div>
          )}

          {/* Table Card */}
          <section className={styles.tableCard} aria-label="Bảng danh sách hóa đơn">
            {reviewState === "loading" ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonRow} />
                ))}
              </div>
            ) : showEmpty ? (
              <div className={styles.emptyState}>
                <Inbox className={styles.emptyIcon} />
                <h2>Chưa tạo hóa đơn cho kỳ này</h2>
                <p>Tạo hóa đơn hàng loạt cho tất cả học sinh đã có mức học phí đang áp dụng.</p>
                <Link className={styles.primaryButton} href={`/admin/invoices/generate?period=${selectedPeriod}`}>
                  Tạo hóa đơn tháng 8
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Học sinh</th>
                        <th>Kỳ</th>
                        <th className={styles.numeric}>Tổng</th>
                        <th className={styles.numeric}>Đã nộp</th>
                        <th className={styles.numeric}>Còn nợ</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => {
                        const tone = avatarToneFor(inv.student);
                        const outstanding = inv.total - inv.paid;
                        const statusTheme = getStatusColor(inv.status);
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && router.push(`/admin/invoices/${inv.id}`)}
                          >
                            <td>
                              <div className={styles.studentCell}>
                                <span
                                  className={styles.studentAvatar}
                                  style={{ backgroundColor: tone.bg, color: tone.text }}
                                >
                                  {initialsOf(inv.student)}
                                </span>
                                <strong>{inv.student}</strong>
                              </div>
                            </td>
                            <td>{inv.period}</td>
                            <td className={styles.numeric}>{formatVnd(inv.total)}</td>
                            <td className={styles.numeric}>{formatVnd(inv.paid)}</td>
                            <td className={`${styles.numeric} ${outstanding > 0 ? styles.outstanding : ""}`}>
                              {formatVnd(outstanding)}
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
                                {statusLabels[inv.status]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List (<768px) */}
                <div className={styles.mobileList}>
                  {filteredInvoices.map((inv) => {
                    const tone = avatarToneFor(inv.student);
                    const outstanding = inv.total - inv.paid;
                    const statusTheme = getStatusColor(inv.status);
                    return (
                      <article
                        key={inv.id}
                        className={styles.mobileCard}
                        onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                      >
                        <div className={styles.mobileCardHeader}>
                          <div className={styles.studentCell}>
                            <span
                              className={styles.studentAvatar}
                              style={{ backgroundColor: tone.bg, color: tone.text }}
                            >
                              {initialsOf(inv.student)}
                            </span>
                            <strong>{inv.student}</strong>
                          </div>
                          <span
                            className={styles.statusPill}
                            style={{
                              backgroundColor: statusTheme.bg,
                              color: statusTheme.text,
                            }}
                          >
                            <i className={styles.statusDot} />
                            {statusLabels[inv.status]}
                          </span>
                        </div>
                        <dl className={styles.mobileDetails}>
                          <dt>Kỳ:</dt>
                          <dd>{inv.period}</dd>
                          <dt>Tổng:</dt>
                          <dd>{formatVnd(inv.total)}</dd>
                          <dt>Đã nộp:</dt>
                          <dd>{formatVnd(inv.paid)}</dd>
                          <dt>Còn nợ:</dt>
                          <dd className={outstanding > 0 ? styles.outstanding : ""}>{formatVnd(outstanding)}</dd>
                        </dl>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </main>
      </div>

      {/* Review State Switcher Widget */}
      <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
        <span>REVIEW STATE</span>
        {(["ready", "loading", "empty", "partial", "error", "forbidden"] as ReviewState[]).map((state) => (
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
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}
    </div>
  );
}
