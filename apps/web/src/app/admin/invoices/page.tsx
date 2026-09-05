"use client";

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
import { useEffect, useMemo, useState } from "react";
import {
  fetchInvoices,
  fetchInvoiceSummary,
  InvoiceStatus,
  InvoiceSummary,
  StudentInvoiceItem,
} from "../../../lib/admin-billing-service";
import { avatarToneFor, formatDate, formatVnd, initialsOf } from "../../../lib/formatters";
import { getStatusColor } from "../../../lib/status";
import styles from "./invoices.module.css";
import { SessionChip } from "@/components/auth/session-chip";

type ReviewState = "ready" | "loading" | "empty" | "partial" | "error" | "forbidden";

const statusLabels: Record<InvoiceStatus, string> = {
  unpaid: "Chưa nộp",
  partially_paid: "Còn nợ một phần",
  paid: "Đã nộp",
  void: "Đã hủy",
};

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<StudentInvoiceItem[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [invRes, sumRes] = await Promise.all([
        fetchInvoices({
          status: statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
        }),
        fetchInvoiceSummary(),
      ]);
      setInvoices(invRes.invoices);
      setSummary(sumRes);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải danh sách hóa đơn");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return invoices.filter((item) => {
      const matchName =
        !query ||
        item.studentName.toLowerCase().includes(query) ||
        item.studentEmail.toLowerCase().includes(query);
      return matchName;
    });
  }, [invoices, searchQuery]);

  const showEmpty =
    reviewState === "empty" || (!loading && filteredInvoices.length === 0);

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => {
        router.push("/login");
      }, 1400);
    }
  }

  const paidCount = summary?.countByStatus.paid ?? 0;
  const totalCount = summary?.invoiceCount ?? 0;
  const collectedAmount = Number(summary?.totalPaid ?? 0);
  const outstandingAmount = Number(summary?.totalOutstanding ?? 0);

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
          <Link
            className={`${styles.navItem} ${styles.navActive}`}
            href="/admin/invoices"
          >
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
            <SessionChip
              classNames={{
                button: styles.profileButton,
                avatar: styles.avatar,
                text: styles.profileText,
              }}
            />
          </div>
        </header>

        <main className={styles.content}>
          {/* Title Row */}
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>QUẢN LÝ THU PHÍ</p>
              <h1>Học phí</h1>
              <p className={styles.subtitle}>
                Danh sách và tiến độ thu học phí theo từng kỳ của toàn bộ học sinh.
              </p>
            </div>
            <div className={styles.titleControls}>
              <Link
                className={styles.secondaryButton}
                href="/admin/tuition-rates"
              >
                <span>Mức học phí</span>
              </Link>
              <Link
                className={styles.primaryButton}
                href="/admin/invoices/generate"
              >
                <Plus size={16} />
                <span>Tạo hóa đơn tháng…</span>
              </Link>
            </div>
          </div>

          {/* KPI Row */}
          <section className={styles.kpiRow} aria-label="Chỉ số thu học phí">
            {loading || reviewState === "loading" ? (
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
                    {paidCount}/{totalCount} hóa đơn
                  </span>
                  <div className={styles.meterTrack}>
                    <div
                      className={styles.meterFill}
                      style={{
                        width: `${
                          totalCount > 0
                            ? (paidCount / totalCount) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>TỔNG THU</span>
                  <span className={styles.kpiValue}>
                    {formatVnd(collectedAmount)}
                  </span>
                </div>
                <div className={styles.kpiCard}>
                  <span className={styles.kpiLabel}>CÒN NỢ</span>
                  <span className={styles.kpiValue}>
                    {formatVnd(outstandingAmount)}
                  </span>
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
                placeholder="Tìm học sinh theo tên, email..."
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
            <span className={styles.filterCount}>
              {filteredInvoices.length} hóa đơn
            </span>
          </section>

          {/* Error Banner */}
          {(errorMessage || reviewState === "error") && (
            <div className={styles.errorBanner} role="alert">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertCircle size={18} />
                <span>{errorMessage || "Không tải được danh sách hóa đơn."}</span>
              </div>
              <button onClick={() => loadData()}>Thử lại</button>
            </div>
          )}

          {/* Table Card */}
          <section
            className={styles.tableCard}
            aria-label="Bảng danh sách hóa đơn"
          >
            {loading || reviewState === "loading" ? (
              <div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={styles.skeletonRow} />
                ))}
              </div>
            ) : showEmpty ? (
              <div className={styles.emptyState}>
                <Inbox className={styles.emptyIcon} />
                <h2>Chưa có hóa đơn nào</h2>
                <p>
                  Tạo hóa đơn hàng loạt cho tất cả học sinh đã có mức học phí đang
                  áp dụng.
                </p>
                <Link
                  className={styles.primaryButton}
                  href="/admin/invoices/generate"
                >
                  Tạo hóa đơn hàng loạt
                </Link>
              </div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Học sinh</th>
                        <th>Kỳ thu phí</th>
                        <th className={styles.numeric}>Tổng tiền</th>
                        <th className={styles.numeric}>Đã nộp</th>
                        <th className={styles.numeric}>Còn nợ</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map((inv) => {
                        const tone = avatarToneFor(inv.studentName);
                        const statusTheme = getStatusColor(inv.status);
                        const periodStr = `${formatDate(inv.periodStart)} – ${formatDate(inv.periodEnd)}`;
                        const isOutstanding = Number(inv.outstandingAmount) > 0;
                        return (
                          <tr
                            key={inv.id}
                            onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                            tabIndex={0}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              router.push(`/admin/invoices/${inv.id}`)
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td>
                              <div className={styles.studentCell}>
                                <span
                                  className={styles.studentAvatar}
                                  style={{
                                    backgroundColor: tone.bg,
                                    color: tone.text,
                                  }}
                                >
                                  {initialsOf(inv.studentName)}
                                </span>
                                <div>
                                  <strong>{inv.studentName}</strong>
                                  <small style={{ display: "block", color: "#64748B" }}>
                                    {inv.studentEmail}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>{periodStr}</td>
                            <td className={styles.numeric}>
                              {formatVnd(Number(inv.totalAmount))}
                            </td>
                            <td className={styles.numeric}>
                              {formatVnd(Number(inv.paidAmount))}
                            </td>
                            <td
                              className={`${styles.numeric} ${
                                isOutstanding ? styles.outstanding : ""
                              }`}
                            >
                              {formatVnd(Number(inv.outstandingAmount))}
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
                                {statusLabels[inv.status] || inv.status}
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
                    const tone = avatarToneFor(inv.studentName);
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
                              style={{
                                backgroundColor: tone.bg,
                                color: tone.text,
                              }}
                            >
                              {initialsOf(inv.studentName)}
                            </span>
                            <strong>{inv.studentName}</strong>
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
                        <div className={styles.mobileAmounts}>
                          <div>
                            <small>Tổng thu</small>
                            <strong>{formatVnd(Number(inv.totalAmount))}</strong>
                          </div>
                          <div>
                            <small>Đã thu</small>
                            <strong>{formatVnd(Number(inv.paidAmount))}</strong>
                          </div>
                          <div>
                            <small>Còn nợ</small>
                            <strong
                              style={{
                                color:
                                  Number(inv.outstandingAmount) > 0
                                    ? "#DC2626"
                                    : "#10B981",
                              }}
                            >
                              {formatVnd(Number(inv.outstandingAmount))}
                            </strong>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
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
            [
              "ready",
              "loading",
              "empty",
              "partial",
              "error",
              "forbidden",
            ] as ReviewState[]
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
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
