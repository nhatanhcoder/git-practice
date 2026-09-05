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
  Inbox,
  LayoutDashboard,
  Loader2,
  Menu,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BatchPreviewResult,
  BatchPreviewRow,
  executeBatchInvoices,
  previewBatchInvoices,
} from "../../../../lib/admin-billing-service";
import { avatarToneFor, formatDate, formatVnd, initialsOf } from "../../../../lib/formatters";
import styles from "./generate.module.css";

type StepNumber = 1 | 2 | 3 | 4;
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

export default function AdminInvoiceGeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<StepNumber>(1);
  const [periodStart, setPeriodStart] = useState("2026-09-01");
  const [periodEnd, setPeriodEnd] = useState("2026-09-30");
  const [dueDate, setDueDate] = useState("2026-09-10");

  const [previewData, setPreviewData] = useState<BatchPreviewResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [executeLoading, setExecuteLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Result dataset
  const [resultData, setResultData] = useState<{
    createdCount: number;
    invoices: { id: string; studentName: string; totalAmount: string }[];
    skipped: { studentId: string; reason: string }[];
  } | null>(null);

  async function handleLoadPreview() {
    setPreviewLoading(true);
    setErrorMessage(null);
    try {
      const res = await previewBatchInvoices({
        periodStart,
        periodEnd,
        dueDate,
      });
      setPreviewData(res);
      // Auto-select all 'ok' outcome rows
      const eligible = res.rows
        .filter((r) => r.outcome === "ok")
        .map((r) => r.studentId);
      setSelectedIds(eligible);
      setStep(2);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải dữ liệu xem trước");
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  function toggleAll(checked: boolean) {
    if (!previewData) return;
    if (checked) {
      const eligible = previewData.rows
        .filter((r) => r.outcome === "ok")
        .map((r) => r.studentId);
      setSelectedIds(eligible);
    } else {
      setSelectedIds([]);
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  async function handleRunBatch() {
    if (!previewData) return;
    setExecuteLoading(true);
    setErrorMessage(null);
    try {
      const res = await executeBatchInvoices({
        periodStart,
        periodEnd,
        dueDate,
        previewHash: previewData.previewHash,
        studentIds: selectedIds,
      });
      setResultData({
        createdCount: res.generatedCount,
        invoices: (res.invoices || []).map((inv: any) => ({
          id: inv.id,
          studentName: inv.studentName || inv.student?.nickname || "Học sinh",
          totalAmount: inv.totalAmount ? String(inv.totalAmount) : "0",
        })),
        skipped: [],
      });
      setStep(4);
    } catch (err: any) {
      setErrorMessage(err?.message || "Không thể thực thi tạo hóa đơn hàng loạt");
    } finally {
      setExecuteLoading(false);
    }
  }

  const selectedRows = previewData
    ? previewData.rows.filter((r) => selectedIds.includes(r.studentId))
    : [];

  const totalSelectedAmount = selectedRows.reduce((sum, r) => {
    return sum + (r.totalAmount ? Number(r.totalAmount) : 0);
  }, 0);

  const allEligibleSelected =
    previewData !== null &&
    previewData.rows.filter((r) => r.outcome === "ok").length > 0 &&
    previewData.rows
      .filter((r) => r.outcome === "ok")
      .every((r) => selectedIds.includes(r.studentId));

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
            <strong>Tạo hàng loạt</strong>
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

          <div className={styles.titleArea}>
            <p className={styles.eyebrow}>QUY TRÌNH PHÁT HÀNH</p>
            <h1>Tạo hóa đơn hàng loạt</h1>
            <p className={styles.subtitle}>
              Phát hành hóa đơn học phí theo tháng cho toàn bộ học sinh đủ điều
              kiện.
            </p>
          </div>

          {/* Stepper Header */}
          {step < 4 && (
            <div className={styles.stepper} aria-label="Tiến trình tạo hóa đơn">
              <div
                className={`${styles.stepItem} ${
                  step === 1
                    ? styles.stepCurrent
                    : step > 1
                    ? styles.stepCompleted
                    : ""
                }`}
              >
                <div className={styles.stepCircle}>
                  {step > 1 ? <Check size={14} /> : "1"}
                </div>
                <span className={styles.stepLabel}>Chọn kỳ</span>
              </div>
              <div
                className={`${styles.stepLine} ${
                  step > 1 ? styles.stepLineActive : ""
                }`}
              />
              <div
                className={`${styles.stepItem} ${
                  step === 2
                    ? styles.stepCurrent
                    : step > 2
                    ? styles.stepCompleted
                    : ""
                }`}
              >
                <div className={styles.stepCircle}>
                  {step > 2 ? <Check size={14} /> : "2"}
                </div>
                <span className={styles.stepLabel}>Xem trước</span>
              </div>
              <div
                className={`${styles.stepLine} ${
                  step > 2 ? styles.stepLineActive : ""
                }`}
              />
              <div
                className={`${styles.stepItem} ${
                  step === 3 ? styles.stepCurrent : ""
                }`}
              >
                <div className={styles.stepCircle}>3</div>
                <span className={styles.stepLabel}>Xác nhận</span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <strong>Có lỗi xảy ra:</strong>
              <span> {errorMessage}</span>
            </div>
          )}

          <div className={styles.wizardCard}>
            {/* Step 1: Chọn kỳ */}
            {step === 1 && (
              <>
                <div className={styles.cardBody}>
                  <div className={styles.step1Group}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <label
                          className={styles.formLabel}
                          htmlFor="periodStart"
                        >
                          Ngày bắt đầu kỳ *
                        </label>
                        <input
                          id="periodStart"
                          type="date"
                          className={styles.selectInput}
                          value={periodStart}
                          onChange={(e) => setPeriodStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={styles.formLabel} htmlFor="periodEnd">
                          Ngày kết thúc kỳ *
                        </label>
                        <input
                          id="periodEnd"
                          type="date"
                          className={styles.selectInput}
                          value={periodEnd}
                          onChange={(e) => setPeriodEnd(e.target.value)}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "16px" }}>
                      <label className={styles.formLabel} htmlFor="dueDate">
                        Hạn thanh toán *
                      </label>
                      <input
                        id="dueDate"
                        type="date"
                        className={styles.selectInput}
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>

                    <div className={styles.eligibilityNote}>
                      <strong>Lưu ý về quy trình phát hành:</strong>
                      <p style={{ marginTop: "4px" }}>
                        Hệ thống sẽ kiểm tra mức học phí đang áp dụng tại ngày
                        bắt đầu kỳ. Học sinh chưa có biểu học phí hoặc đã có hóa
                        đơn trong kỳ sẽ được phân loại rõ ràng trong bước Xem
                        trước.
                      </p>
                    </div>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Link className={styles.ghostBtn} href="/admin/invoices">
                    Hủy
                  </Link>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleLoadPreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang tải xem trước...</span>
                      </>
                    ) : (
                      <>
                        <span>Tiếp tục</span>
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Xem trước */}
            {step === 2 && previewData && (
              <>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={allEligibleSelected}
                              onChange={(e) => toggleAll(e.target.checked)}
                              aria-label="Chọn tất cả học sinh"
                            />
                          </th>
                          <th>Học sinh</th>
                          <th className={styles.numeric}>Mức áp dụng</th>
                          <th className={styles.numeric}>Thành tiền</th>
                          <th>Trạng thái xem trước</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.rows.map((item) => {
                          const isEligible = item.outcome === "ok";
                          const isChecked = selectedIds.includes(item.studentId);
                          const tone = avatarToneFor(item.studentName);
                          return (
                            <tr
                              key={item.studentId}
                              className={!isEligible ? styles.rowDimmed : ""}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  disabled={!isEligible}
                                  checked={isChecked}
                                  onChange={() => toggleOne(item.studentId)}
                                  aria-label={`Chọn ${item.studentName}`}
                                />
                              </td>
                              <td>
                                <div className={styles.studentCell}>
                                  <span
                                    className={styles.studentAvatar}
                                    style={{
                                      backgroundColor: tone.bg,
                                      color: tone.text,
                                    }}
                                  >
                                    {initialsOf(item.studentName)}
                                  </span>
                                  <strong>{item.studentName}</strong>
                                </div>
                              </td>
                              <td className={styles.numeric}>
                                {item.rateAmount
                                  ? formatVnd(Number(item.rateAmount))
                                  : "—"}
                              </td>
                              <td
                                className={styles.numeric}
                                style={{ fontWeight: 600 }}
                              >
                                {item.totalAmount
                                  ? formatVnd(Number(item.totalAmount))
                                  : "—"}
                              </td>
                              <td>
                                {item.outcome === "ok" ? (
                                  <span
                                    style={{
                                      color: "#059669",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Hợp lệ
                                  </span>
                                ) : item.outcome === "duplicate" ? (
                                  <span className={styles.pillWarning}>
                                    Đã có hóa đơn kỳ này
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      color: "#DC2626",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Chưa có biểu học phí
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <button
                    className={styles.ghostBtn}
                    onClick={() => setStep(1)}
                  >
                    <ChevronLeft size={16} />
                    <span>Quay lại</span>
                  </button>
                  <button
                    className={styles.primaryBtn}
                    disabled={selectedIds.length === 0}
                    onClick={() => setStep(3)}
                  >
                    <span>Tiếp tục ({selectedIds.length} học sinh)</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Xác nhận */}
            {step === 3 && (
              <>
                <div className={styles.cardBody}>
                  <div className={styles.confirmSummary}>
                    <div className={styles.summaryItem}>
                      <small>Số học sinh</small>
                      <strong>{selectedIds.length} học sinh</strong>
                    </div>
                    <div className={styles.summaryItem}>
                      <small>Tổng tiền dự kiến</small>
                      <strong>{formatVnd(totalSelectedAmount)}</strong>
                    </div>
                    <div className={styles.summaryItem}>
                      <small>Kỳ phát hành</small>
                      <strong>
                        {formatDate(periodStart)} – {formatDate(periodEnd)}
                      </strong>
                    </div>
                  </div>
                  <p style={{ fontSize: "13.5px", color: "#475569" }}>
                    Hệ thống sẽ tạo {selectedIds.length} hóa đơn ở trạng thái{" "}
                    <strong>Chưa nộp</strong> và gán hạn thanh toán vào ngày{" "}
                    {formatDate(dueDate)}.
                  </p>
                </div>
                <div className={styles.cardFooter}>
                  <button
                    className={styles.ghostBtn}
                    disabled={executeLoading}
                    onClick={() => setStep(2)}
                  >
                    <ChevronLeft size={16} />
                    <span>Quay lại</span>
                  </button>
                  <button
                    className={styles.primaryBtn}
                    disabled={executeLoading || selectedIds.length === 0}
                    onClick={handleRunBatch}
                  >
                    {executeLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang tạo hóa đơn...</span>
                      </>
                    ) : (
                      <span>Xác nhận phát hành hóa đơn</span>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* Step 4: Result Panel */}
            {step === 4 && resultData && (
              <>
                <div className={styles.cardBody}>
                  <div className={styles.resultHeader}>
                    <span
                      className={`${styles.resultBadge} ${styles.badgeCreated}`}
                    >
                      Đã tạo thành công {resultData.createdCount} hóa đơn
                    </span>
                    {resultData.skipped.length > 0 && (
                      <span
                        className={`${styles.resultBadge} ${styles.badgeSkipped}`}
                      >
                        Bỏ qua {resultData.skipped.length} học sinh
                      </span>
                    )}
                  </div>

                  <div className={styles.tableWrap} style={{ marginTop: "16px" }}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Học sinh</th>
                          <th className={styles.numeric}>Số tiền</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultData.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <strong>{inv.studentName}</strong>
                            </td>
                            <td
                              className={styles.numeric}
                              style={{ fontWeight: 600 }}
                            >
                              {formatVnd(Number(inv.totalAmount))}
                            </td>
                            <td>
                              <span
                                style={{
                                  color: "#059669",
                                  fontWeight: 500,
                                }}
                              >
                                Đã tạo
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Link className={styles.primaryBtn} href="/admin/invoices">
                    <span>Xem danh sách hóa đơn</span>
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* WEB-004: design-review scaffolding, dev only */}
      {process.env.NODE_ENV !== "production" && (
        <aside
          className={styles.stateSwitcher}
          aria-label="Review State Switcher"
        >
          <span>REVIEW STATE</span>
          {(["ready", "loading", "empty", "error", "forbidden"] as ReviewState[]).map(
            (state) => (
              <button
                key={state}
                className={reviewState === state ? styles.stateActive : ""}
                onClick={() => setReviewState(state)}
              >
                {state}
              </button>
            )
          )}
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
