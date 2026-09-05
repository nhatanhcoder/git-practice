"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Inbox,
  LayoutDashboard,
  Menu,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  fetchInvoiceDetail,
  InvoiceStatus,
  recordTuitionPayment,
  StudentInvoiceDetail,
  voidInvoice,
} from "../../../../lib/admin-billing-service";
import {
  avatarToneFor,
  formatDate,
  formatDateTime,
  formatVnd,
  initialsOf,
} from "../../../../lib/formatters";
import { getStatusColor } from "../../../../lib/status";
import styles from "./detail.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

const statusLabels: Record<InvoiceStatus, string> = {
  unpaid: "Chưa nộp",
  partially_paid: "Còn nợ một phần",
  paid: "Đã nộp",
  void: "Đã hủy",
};

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = (params?.invoiceId as string) || "";

  const [invoice, setInvoice] = useState<StudentInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  async function loadDetail() {
    if (!invoiceId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchInvoiceDetail(invoiceId);
      setInvoice(data);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else if (err?.statusCode === 404) {
        setReviewState("error");
      } else {
        setErrorMessage(err?.message || "Không thể tải chi tiết hóa đơn");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [invoiceId]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    setPaymentSubmitting(true);
    try {
      await recordTuitionPayment(invoiceId, {
        amount: String(paymentAmount),
        paymentMethod,
        transactionReference: paymentRef.trim() || undefined,
      });
      setShowPaymentModal(false);
      triggerToast("Đã ghi nhận thanh toán thành công");
      await loadDetail();
    } catch (err: any) {
      triggerToast(err?.message || "Ghi nhận thanh toán thất bại");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleVoidInvoice() {
    if (!voidReason.trim()) return;

    setVoidSubmitting(true);
    try {
      await voidInvoice(invoiceId, voidReason);
      setShowVoidModal(false);
      triggerToast("Đã hủy hóa đơn thành công");
      await loadDetail();
    } catch (err: any) {
      triggerToast(err?.message || "Hủy hóa đơn thất bại");
    } finally {
      setVoidSubmitting(false);
    }
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const statusTheme = invoice ? getStatusColor(invoice.status) : { bg: "#F1F5F9", text: "#475569" };
  const tone = invoice ? avatarToneFor(invoice.studentName) : { bg: "#DBEAFE", text: "#1E40AF" };
  const outstandingNum = invoice ? Number(invoice.outstandingAmount) : 0;

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
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={14} />
            <Link href="/admin/invoices">Học phí</Link>
            <ChevronRight size={14} />
            <strong>Chi tiết hóa đơn</strong>
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
          <Link className={styles.backLink} href="/admin/invoices">
            <ChevronLeft size={16} />
            <span>Quay lại danh sách hóa đơn</span>
          </Link>

          {loading || reviewState === "loading" ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              Đang tải chi tiết hóa đơn...
            </div>
          ) : reviewState === "error" || !invoice ? (
            <div className={styles.emptyCard}>
              <AlertCircle
                size={44}
                color="#DC2626"
                style={{ margin: "0 auto 12px" }}
              />
              <h2>Không tìm thấy hóa đơn này</h2>
              <p>Mã hóa đơn không tồn tại trong hệ thống.</p>
            </div>
          ) : (
            <>
              {/* Header Hero Card */}
              <section
                className={styles.heroCard}
                aria-label="Thông tin tổng quan hóa đơn"
              >
                <div className={styles.studentMeta}>
                  <div
                    className={styles.avatarLarge}
                    style={{ backgroundColor: tone.bg, color: tone.text }}
                  >
                    {initialsOf(invoice.studentName)}
                  </div>
                  <div>
                    <div className={styles.nameRow}>
                      <h1>{invoice.studentName}</h1>
                      <span
                        className={styles.statusPill}
                        style={{
                          backgroundColor: statusTheme.bg,
                          color: statusTheme.text,
                        }}
                      >
                        <i className={styles.statusDot} />
                        {statusLabels[invoice.status]}
                      </span>
                    </div>
                    <div className={styles.invoiceMetaRow}>
                      <span className={styles.codeBadge}>{invoice.code}</span>
                      <span>•</span>
                      <span>
                        Kỳ: {formatDate(invoice.periodStart)} –{" "}
                        {formatDate(invoice.periodEnd)}
                      </span>
                      <span>•</span>
                      <span>Hạn nộp: {formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.figuresStacked}>
                  <div className={styles.figureItem}>
                    <small>Tổng phải nộp</small>
                    <span>{formatVnd(Number(invoice.totalAmount))}</span>
                  </div>
                  <div className={styles.figureItem}>
                    <small>Đã nộp</small>
                    <span>{formatVnd(Number(invoice.paidAmount))}</span>
                  </div>
                  <div
                    className={`${styles.figureItem} ${styles.figureHeadline}`}
                  >
                    <small>Còn nợ</small>
                    <span>{formatVnd(outstandingNum)}</span>
                  </div>
                </div>
              </section>

              {/* Action Bar */}
              <section className={styles.actionBar}>
                {invoice.status !== "paid" && invoice.status !== "void" && (
                  <>
                    <button
                      className={styles.dangerGhostAction}
                      onClick={() => setShowVoidModal(true)}
                    >
                      <Trash2 size={16} />
                      <span>Hủy hóa đơn</span>
                    </button>
                    <button
                      className={styles.primaryAction}
                      onClick={() => {
                        setPaymentAmount(outstandingNum);
                        setShowPaymentModal(true);
                      }}
                    >
                      <CreditCard size={16} />
                      <span>Ghi nhận thanh toán</span>
                    </button>
                  </>
                )}
              </section>

              {/* Payment History Section */}
              <section
                className={styles.historySection}
                aria-label="Lịch sử thanh toán"
              >
                <div className={styles.sectionHeader}>
                  <h2>Lịch sử thanh toán</h2>
                  <span style={{ fontSize: "13px", color: "#64748B" }}>
                    {invoice.payments?.length ?? 0} giao dịch
                  </span>
                </div>

                {!invoice.payments || invoice.payments.length === 0 ? (
                  <div className={styles.emptyPayments}>
                    <Inbox
                      size={36}
                      style={{ margin: "0 auto 8px", opacity: 0.2 }}
                    />
                    <p>Chưa có giao dịch thanh toán nào</p>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Ngày thanh toán</th>
                        <th className={styles.numeric}>Số tiền</th>
                        <th>Phương thức</th>
                        <th>Mã giao dịch / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDateTime(p.paidAt)}</td>
                          <td
                            className={styles.numeric}
                            style={{ fontWeight: 600 }}
                          >
                            {formatVnd(Number(p.amount))}
                          </td>
                          <td>
                            {p.paymentMethod === "bank_transfer"
                              ? "Chuyển khoản"
                              : p.paymentMethod === "cash"
                              ? "Tiền mặt"
                              : p.paymentMethod}
                          </td>
                          <td className={styles.monospace}>
                            {p.transactionReference || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && invoice && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Ghi nhận thanh toán</h2>
            <p>
              Nhập số tiền và phương thức học sinh đã thanh toán cho hóa đơn{" "}
              {invoice.code}.
            </p>
            <form onSubmit={handleRecordPayment}>
              <div className={styles.formGroup}>
                <label htmlFor="amountInput">Số tiền (VND) *</label>
                <input
                  id="amountInput"
                  type="number"
                  required
                  min={1000}
                  max={outstandingNum}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="methodSelect">Phương thức *</label>
                <select
                  id="methodSelect"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="e_wallet">Ví điện tử (MoMo / ZaloPay)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="refInput">Mã giao dịch / Ghi chú</label>
                <input
                  id="refInput"
                  type="text"
                  placeholder="VD: FT2608051234 (tùy chọn)"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={paymentSubmitting}
                >
                  {paymentSubmitting
                    ? "Đang ghi nhận..."
                    : "Ghi nhận thanh toán"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && invoice && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 style={{ color: "#DC2626" }}>Hủy hóa đơn</h2>
            <p>
              Hành động này sẽ hủy hóa đơn {invoice.code} và không thể hoàn tác.
              Vui lòng nhập lý do.
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="reasonInput">Lý do hủy *</label>
              <textarea
                id="reasonInput"
                required
                placeholder="Nhập lý do hủy hóa đơn..."
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowVoidModal(false)}
                disabled={voidSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={!voidReason.trim() || voidSubmitting}
                onClick={handleVoidInvoice}
              >
                {voidSubmitting ? "Đang hủy..." : "Hủy hóa đơn"}
              </button>
            </div>
          </div>
        </div>
      )}

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
