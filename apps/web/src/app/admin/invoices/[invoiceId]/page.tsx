"use client";

// MOCK(A-INV-3/5): GET /api/v1/admin/invoices/:id and POST payments/void mock
// ASSUMPTION(decision-1): Billing model is per-student monthly flat rate with append-only history

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
import { useState } from "react";
import { avatarToneFor, formatVnd, initialsOf } from "../../../../lib/formatters";
import { getStatusColor } from "../../../../lib/status";
import styles from "./detail.module.css";

type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "void";
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface PaymentItem {
  date: string;
  amount: number;
  method: string;
  ref: string;
}

const statusLabels: Record<InvoiceStatus, string> = {
  unpaid: "Chưa nộp",
  partially_paid: "Còn nợ một phần",
  paid: "Đã nộp",
  void: "Đã hủy",
};

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = (params?.invoiceId as string) || "INV-2608-004";

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Editable local state representing server-synchronized state
  const [invoice, setInvoice] = useState({
    code: invoiceId,
    student: "Trần Bảo Long",
    periodStart: "01/08/2026",
    periodEnd: "31/08/2026",
    total: 2500000,
    paid: 1000000,
    status: "partially_paid" as InvoiceStatus,
  });

  const [payments, setPayments] = useState<PaymentItem[]>([
    { date: "05/08/2026", amount: 1000000, method: "Chuyển khoản", ref: "FT2608051234" },
  ]);

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(1500000);
  const [paymentMethod, setPaymentMethod] = useState("Chuyển khoản");
  const [paymentRef, setPaymentRef] = useState("");

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");

  const outstanding = Math.max(0, invoice.total - invoice.paid);
  const tone = avatarToneFor(invoice.student);
  const statusTheme = getStatusColor(invoice.status);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (paymentAmount <= 0) return;

    const newPaid = invoice.paid + Number(paymentAmount);
    const newStatus: InvoiceStatus = newPaid >= invoice.total ? "paid" : "partially_paid";

    const newPayment: PaymentItem = {
      date: "16/08/2026",
      amount: Number(paymentAmount),
      method: paymentMethod,
      ref: paymentRef.trim() || `FT${Date.now().toString().slice(-8)}`,
    };

    setPayments([newPayment, ...payments]);
    setInvoice((prev) => ({
      ...prev,
      paid: newPaid,
      status: newStatus,
    }));

    setShowPaymentModal(false);
    triggerToast("Đã ghi nhận thanh toán");
  }

  function handleVoidInvoice() {
    if (!voidReason.trim()) return;

    setInvoice((prev) => ({
      ...prev,
      status: "void",
    }));

    setShowVoidModal(false);
    triggerToast("Đã hủy hóa đơn");
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
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={14} />
            <Link href="/admin/invoices">Học phí</Link>
            <ChevronRight size={14} />
            <strong>Chi tiết</strong>
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
          <Link className={styles.backLink} href="/admin/invoices">
            <ChevronLeft size={16} />
            <span>Quay lại danh sách hóa đơn</span>
          </Link>

          {reviewState === "error" ? (
            <div className={styles.notFoundCard}>
              <AlertCircle size={44} color="#DC2626" style={{ margin: "0 auto 16px" }} />
              <h2>Không tìm thấy hóa đơn này.</h2>
              <p>Mã hóa đơn không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
              <Link className={styles.primaryAction} href="/admin/invoices">
                Quay lại danh sách hóa đơn
              </Link>
            </div>
          ) : reviewState === "loading" ? (
            <>
              <div className={styles.skeletonHeader} />
              <div className={styles.skeletonHeader} />
            </>
          ) : (
            <>
              {/* Header Card */}
              <section className={styles.headerCard} aria-label="Thông tin hóa đơn">
                <div className={styles.studentInfo}>
                  <div
                    className={styles.studentAvatarLarge}
                    style={{ backgroundColor: tone.bg, color: tone.text }}
                  >
                    {initialsOf(invoice.student)}
                  </div>
                  <div className={styles.studentTitle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h1>{invoice.student}</h1>
                      <span
                        className={styles.statusPill}
                        style={{ backgroundColor: statusTheme.bg, color: statusTheme.text }}
                      >
                        <i className={styles.statusDot} />
                        {statusLabels[invoice.status]}
                      </span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.codeBadge}>{invoice.code}</span>
                      <span>•</span>
                      <span>Kỳ: {invoice.periodStart} – {invoice.periodEnd}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.figuresStacked}>
                  <div className={styles.figureItem}>
                    <small>Tổng phải nộp</small>
                    <span>{formatVnd(invoice.total)}</span>
                  </div>
                  <div className={styles.figureItem}>
                    <small>Đã nộp</small>
                    <span>{formatVnd(invoice.paid)}</span>
                  </div>
                  <div className={`${styles.figureItem} ${styles.figureHeadline}`}>
                    <small>Còn nợ</small>
                    <span>{formatVnd(outstanding)}</span>
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
                        setPaymentAmount(outstanding);
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
              <section className={styles.historySection} aria-label="Lịch sử thanh toán">
                <div className={styles.sectionHeader}>
                  <h2>Lịch sử thanh toán</h2>
                  <span style={{ fontSize: "13px", color: "#64748B" }}>
                    {reviewState === "empty" ? 0 : payments.length} giao dịch
                  </span>
                </div>

                {reviewState === "empty" || payments.length === 0 ? (
                  <div className={styles.emptyPayments}>
                    <Inbox size={36} style={{ margin: "0 auto 8px", opacity: 0.2 }} />
                    <p>Chưa có thanh toán nào</p>
                  </div>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Ngày</th>
                        <th className={styles.numeric}>Số tiền</th>
                        <th>Phương thức</th>
                        <th>Mã giao dịch</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p, idx) => (
                        <tr key={idx}>
                          <td>{p.date}</td>
                          <td className={styles.numeric} style={{ fontWeight: 600 }}>
                            {formatVnd(p.amount)}
                          </td>
                          <td>{p.method}</td>
                          <td className={styles.monospace}>{p.ref || "—"}</td>
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
      {showPaymentModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Ghi nhận thanh toán</h2>
            <p>Nhập số tiền và phương thức học sinh đã thanh toán cho hóa đơn {invoice.code}.</p>
            <form onSubmit={handleRecordPayment}>
              <div className={styles.formGroup}>
                <label htmlFor="amountInput">Số tiền (VND) *</label>
                <input
                  id="amountInput"
                  type="number"
                  required
                  min={1000}
                  max={outstanding}
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
                  <option value="Chuyển khoản">Chuyển khoản (VietQR / Ngân hàng)</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="MoMo">Ví điện tử (MoMo / ZaloPay)</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="refInput">Mã giao dịch</label>
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
                >
                  Hủy
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Ghi nhận thanh toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 style={{ color: "#DC2626" }}>Hủy hóa đơn</h2>
            <p>Hành động này sẽ hủy hóa đơn {invoice.code} và không thể hoàn tác. Vui lòng nhập lý do.</p>
            <div className={styles.formGroup}>
              <label htmlFor="reasonInput">Lý do hủy *</label>
              <textarea
                id="reasonInput"
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
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={!voidReason.trim()}
                onClick={handleVoidInvoice}
              >
                Hủy hóa đơn
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
