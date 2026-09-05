"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleDollarSign,
  History,
  LayoutDashboard,
  Menu,
  Pencil,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  createTuitionRate,
  fetchStudentTuitionRateHistory,
  fetchStudentTuitionRates,
  StudentTuitionRateRow,
  TuitionRateHistoryItem,
} from "../../../lib/admin-billing-service";
import { formatDate, formatVnd, initialsOf } from "../../../lib/formatters";
import styles from "./rates.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

export default function AdminTuitionRatesPage() {
  const router = useRouter();
  const [rates, setRates] = useState<StudentTuitionRateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentTuitionRateRow | null>(null);
  const [editAmount, setEditAmount] = useState(1500000);
  const [editEffectiveDate, setEditEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [editSubmitting, setEditSubmitting] = useState(false);

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<StudentTuitionRateRow | null>(null);
  const [historyRecords, setHistoryRecords] = useState<TuitionRateHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function loadRates() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchStudentTuitionRates();
      setRates(res.rates);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải bảng học phí học viên");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRates();
  }, []);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function openEdit(student: StudentTuitionRateRow) {
    setEditingStudent(student);
    const curr = student.current ? Number(student.current.rateAmount) : 1500000;
    setEditAmount(curr);
    setEditEffectiveDate(new Date().toISOString().split("T")[0]);
    setShowEditModal(true);
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;

    setEditSubmitting(true);
    try {
      await createTuitionRate({
        studentId: editingStudent.studentId,
        rateAmount: String(editAmount),
        billingCycle: "monthly",
        effectiveFrom: editEffectiveDate,
      });
      setShowEditModal(false);
      triggerToast(`Đã thiết lập mức học phí cho ${editingStudent.studentName}`);
      await loadRates();
    } catch (err: any) {
      triggerToast(err?.message || "Thiết lập học phí thất bại");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function openHistory(student: StudentTuitionRateRow) {
    setHistoryStudent(student);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const items = await fetchStudentTuitionRateHistory(student.studentId);
      setHistoryRecords(items);
    } catch (err: any) {
      triggerToast(err?.message || "Không thể tải lịch sử học phí");
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const isEmpty = reviewState === "empty" || (!loading && rates.length === 0);

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
            <strong>Đơn giá học phí</strong>
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

        {/* Sub-nav tabs for Billing area */}
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
            href="/admin/invoices"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
          >
            Hóa đơn
          </Link>
          <Link
            href="/admin/tuition-rates"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 600,
              color: "#2563EB",
              borderBottom: "2px solid #2563EB",
              textDecoration: "none",
            }}
          >
            Đơn giá học phí
          </Link>
          <Link
            href="/admin/invoices/generate"
            style={{
              padding: "14px 0",
              fontSize: "14px",
              fontWeight: 500,
              color: "#64748B",
              textDecoration: "none",
            }}
          >
            Tạo hàng loạt
          </Link>
        </div>

        <main className={styles.content}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>BIỂU HỌC PHÍ HỌC VIÊN</p>
              <h1>Đơn giá học phí theo học viên</h1>
              <p className={styles.subtitle}>
                Thiết lập mức học phí trọn gói hàng tháng theo mô hình append-only.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Link className={styles.secondaryBtn} href="/admin/invoices">
                <span>Danh sách hóa đơn</span>
              </Link>
              <span className={styles.totalStudentsBadge}>
                {rates.length} học viên
              </span>
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
                marginBottom: "16px",
                color: "#991B1B",
              }}
            >
              <span>{errorMessage || "Không tải được bảng đơn giá học phí."}</span>
            </div>
          )}

          {/* Rates Table */}
          <section
            className={styles.tableCard}
            aria-label="Bảng đơn giá học phí"
          >
            {loading || reviewState === "loading" ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                Đang tải bảng đơn giá học phí...
              </div>
            ) : isEmpty ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
                Chưa có học viên nào trong hệ thống.
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th className={styles.numeric}>Mức học phí / tháng</th>
                      <th>Chu kỳ</th>
                      <th>Ngày áp dụng</th>
                      <th className={styles.numeric}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((r) => (
                      <tr key={r.studentId}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                backgroundColor: "#DBEAFE",
                                color: "#1E40AF",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {initialsOf(r.studentName)}
                            </span>
                            <div>
                              <strong>{r.studentName}</strong>
                              <small style={{ display: "block", color: "#64748B" }}>
                                {r.studentEmail}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td
                          className={styles.numeric}
                          style={{ fontWeight: 600, fontSize: "14px" }}
                        >
                          {r.current
                            ? formatVnd(Number(r.current.rateAmount))
                            : "Chưa cấu hình"}
                        </td>
                        <td>Hàng tháng</td>
                        <td>{r.current ? formatDate(r.current.effectiveFrom) : "—"}</td>
                        <td className={styles.actionLinks}>
                          <button
                            onClick={() => openHistory(r)}
                            type="button"
                          >
                            <History
                              size={14}
                              style={{ display: "inline", marginRight: "4px" }}
                            />
                            Lịch sử ({r.changesCount})
                          </button>
                          <button
                            onClick={() => openEdit(r)}
                            type="button"
                          >
                            <Pencil
                              size={14}
                              style={{ display: "inline", marginRight: "4px" }}
                            />
                            {r.current ? "Điều chỉnh" : "Thiết lập"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Edit Rate Modal */}
      {showEditModal && editingStudent && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Điều chỉnh học phí: {editingStudent.studentName}</h2>
            <p>
              Mức học phí mới sẽ áp dụng từ chu kỳ xuất hóa đơn tiếp theo theo mô
              hình append-only.
            </p>
            <form onSubmit={handleSaveRate}>
              <div className={styles.formGroup}>
                <label htmlFor="amountInput">Mức học phí tháng (VNĐ) *</label>
                <input
                  id="amountInput"
                  type="number"
                  step="50000"
                  min="0"
                  required
                  value={editAmount}
                  onChange={(e) => setEditAmount(Number(e.target.value))}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="effectiveInput">Ngày bắt đầu hiệu lực *</label>
                <input
                  id="effectiveInput"
                  type="date"
                  required
                  value={editEffectiveDate}
                  onChange={(e) => setEditEffectiveDate(e.target.value)}
                />
              </div>

              <div className={styles.modalNotice}>
                Lưu ý: Ngày hiệu lực phải lớn hơn ngày hiệu lực của mức học phí
                hiện tại.
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowEditModal(false)}
                  disabled={editSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={styles.confirmBtn}
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyStudent && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Lịch sử điều chỉnh học phí: {historyStudent.studentName}</h2>
            <p>
              Nhật ký append-only ghi nhận các lần điều chỉnh mức học phí của học
              viên.
            </p>

            <div className={styles.timeline}>
              {historyLoading ? (
                <p>Đang tải lịch sử...</p>
              ) : historyRecords.length === 0 ? (
                <p>Chưa có lịch sử thay đổi.</p>
              ) : (
                historyRecords.map((h) => (
                  <div key={h.id} className={styles.timelineItem}>
                    <strong>
                      {formatVnd(Number(h.rateAmount))} / tháng
                    </strong>
                    <small>
                      Hiệu lực từ: {formatDate(h.effectiveFrom)}{" "}
                      {h.isCurrent ? "(Hiện tại)" : ""}
                    </small>
                  </div>
                ))
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowHistoryModal(false)}
              >
                Đóng
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
