"use client";

// MOCK(A-INV-2): POST /api/v1/admin/invoices/batch and preview endpoint mock
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
  Inbox,
  LayoutDashboard,
  Loader2,
  Menu,
  RotateCcw,
  ShieldCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { avatarToneFor, formatVnd, initialsOf } from "../../../../lib/formatters";
import styles from "./generate.module.css";

type StepNumber = 1 | 2 | 3 | 4; // 4 is Result panel
type ReviewState = "ready" | "step1" | "step2" | "step3" | "running" | "partial" | "empty" | "error" | "forbidden";

interface StudentPreview {
  id: string;
  student: string;
  rate: number;
  effectiveFrom: string;
  existing: boolean;
}

const mockPreviewList: StudentPreview[] = [
  { id: "1", student: "Nguyễn Minh Anh", rate: 2500000, effectiveFrom: "01/03/2026", existing: false },
  { id: "2", student: "Lê Quang Dũng", rate: 2500000, effectiveFrom: "01/03/2026", existing: false },
  { id: "3", student: "Hoàng Văn Nam", rate: 2500000, effectiveFrom: "01/06/2026", existing: false },
  { id: "4", student: "Vũ Ngọc Bích", rate: 2500000, effectiveFrom: "01/03/2026", existing: false },
  { id: "5", student: "Đặng Thu Trang", rate: 2500000, effectiveFrom: "01/03/2026", existing: false },
  { id: "6", student: "Trần Bảo Long", rate: 2500000, effectiveFrom: "01/07/2026", existing: false },
  { id: "7", student: "Ngô Khánh Vy", rate: 2500000, effectiveFrom: "01/03/2026", existing: true },
];

export default function AdminInvoiceGeneratePage() {
  const router = useRouter();
  const [step, setStep] = useState<StepNumber>(1);
  const [selectedPeriod, setSelectedPeriod] = useState("08/2026");
  const [selectedIds, setSelectedIds] = useState<string[]>(["1", "2", "3", "4", "5", "6"]);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [isRunning, setIsRunning] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Result dataset (partial success state)
  const [resultData, setResultData] = useState<{
    created: string[];
    skipped: { student: string; reason: string }[];
    failed: { student: string; reason: string }[];
  }>({
    created: ["Nguyễn Minh Anh", "Lê Quang Dũng", "Hoàng Văn Nam", "Vũ Ngọc Bích", "Đặng Thu Trang", "Trần Bảo Long"],
    skipped: [{ student: "Ngô Khánh Vy", reason: "Đã có hóa đơn kỳ này" }],
    failed: [{ student: "Mai Tuấn Kiệt", reason: "Không tìm thấy mức học phí đang áp dụng" }],
  });

  const selectedStudents = useMemo(() => {
    return mockPreviewList.filter((s) => selectedIds.includes(s.id));
  }, [selectedIds]);

  const totalAmount = useMemo(() => {
    return selectedStudents.reduce((sum, s) => sum + s.rate, 0);
  }, [selectedStudents]);

  function toggleAll(checked: boolean) {
    if (checked) {
      // check all non-existing by default
      const eligible = mockPreviewList.filter((s) => !s.existing).map((s) => s.id);
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

  function handleRunBatch() {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setStep(4);
    }, 1200);
  }

  function handleRetryRow(failedStudent: string) {
    setResultData((prev) => ({
      ...prev,
      created: [...prev.created, failedStudent],
      failed: prev.failed.filter((f) => f.student !== failedStudent),
    }));
    setToastMessage(`Đã tạo hóa đơn cho ${failedStudent}`);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "step1") setStep(1);
    if (newState === "step2") setStep(2);
    if (newState === "step3") setStep(3);
    if (newState === "partial") setStep(4);
    if (newState === "running") {
      setStep(3);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const allEligibleSelected =
    mockPreviewList.filter((s) => !s.existing).length > 0 &&
    mockPreviewList.filter((s) => !s.existing).every((s) => selectedIds.includes(s.id));

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
            <strong>Tạo hàng loạt</strong>
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

          <div className={styles.titleArea}>
            <p className={styles.eyebrow}>QUY TRÌNH PHÁT HÀNH</p>
            <h1>Tạo hóa đơn hàng loạt</h1>
            <p className={styles.subtitle}>Phát hành hóa đơn học phí một tháng cho toàn bộ học sinh đủ điều kiện.</p>
          </div>

          {/* Stepper Header */}
          {step < 4 && (
            <div className={styles.stepper} aria-label="Tiến trình tạo hóa đơn">
              <div className={`${styles.stepItem} ${step === 1 ? styles.stepCurrent : step > 1 ? styles.stepCompleted : ""}`}>
                <div className={styles.stepCircle}>{step > 1 ? <Check size={14} /> : "1"}</div>
                <span className={styles.stepLabel}>Chọn kỳ</span>
              </div>
              <div className={`${styles.stepLine} ${step > 1 ? styles.stepLineActive : ""}`} />
              <div className={`${styles.stepItem} ${step === 2 ? styles.stepCurrent : step > 2 ? styles.stepCompleted : ""}`}>
                <div className={styles.stepCircle}>{step > 2 ? <Check size={14} /> : "2"}</div>
                <span className={styles.stepLabel}>Xem trước</span>
              </div>
              <div className={`${styles.stepLine} ${step > 2 ? styles.stepLineActive : ""}`} />
              <div className={`${styles.stepItem} ${step === 3 ? styles.stepCurrent : ""}`}>
                <div className={styles.stepCircle}>3</div>
                <span className={styles.stepLabel}>Xác nhận</span>
              </div>
            </div>
          )}

          {/* Error State Banner */}
          {reviewState === "error" && (
            <div className={styles.errorBanner} role="alert">
              <strong>Không thể phát hành hóa đơn.</strong>
              <span> Vui lòng kiểm tra lại danh sách hoặc thử lại sau.</span>
            </div>
          )}

          {/* Empty State: No tuition rates configured */}
          {reviewState === "empty" ? (
            <div className={styles.emptyCard}>
              <Inbox size={44} color="#64748B" style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <h2>Chưa thiết lập học phí</h2>
              <p>Cần có mức học phí đang áp dụng trước khi tạo hóa đơn hàng loạt.</p>
              <Link className={styles.primaryBtn} href="/admin/tuition-rates">
                Thiết lập học phí
              </Link>
            </div>
          ) : (
            <div className={styles.wizardCard}>
              {/* Step 1: Chọn kỳ */}
              {step === 1 && (
                <>
                  <div className={styles.cardBody}>
                    <div className={styles.step1Group}>
                      <div>
                        <label className={styles.formLabel} htmlFor="periodPick">
                          Kỳ phát hành hóa đơn
                        </label>
                        <select
                          id="periodPick"
                          className={styles.selectInput}
                          value={selectedPeriod}
                          onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                          <option value="08/2026">Tháng 08/2026 (01/08 – 31/08/2026)</option>
                          <option value="09/2026">Tháng 09/2026 (01/09 – 30/09/2026)</option>
                        </select>
                      </div>

                      <div className={styles.eligibilityNote}>
                        <strong>8 học sinh có mức học phí đang áp dụng · 1 học sinh chưa thiết lập</strong>
                        <p style={{ marginTop: "4px" }}>
                          Học sinh chưa có mức học phí sẽ không được tạo hóa đơn.{" "}
                          <Link href="/admin/tuition-rates">Thiết lập học phí tại đây</Link>.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    <Link className={styles.ghostBtn} href="/admin/invoices">
                      Hủy
                    </Link>
                    <button className={styles.primaryBtn} onClick={() => setStep(2)}>
                      <span>Tiếp tục</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </>
              )}

              {/* Step 2: Xem trước */}
              {step === 2 && (
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
                            <th>Hiệu lực từ</th>
                            <th className={styles.numeric}>Thành tiền</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockPreviewList.map((item) => {
                            const isChecked = selectedIds.includes(item.id);
                            const tone = avatarToneFor(item.student);
                            return (
                              <tr key={item.id} className={item.existing ? styles.rowDimmed : ""}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleOne(item.id)}
                                    aria-label={`Chọn ${item.student}`}
                                  />
                                </td>
                                <td>
                                  <div className={styles.studentCell}>
                                    <span
                                      className={styles.studentAvatar}
                                      style={{ backgroundColor: tone.bg, color: tone.text }}
                                    >
                                      {initialsOf(item.student)}
                                    </span>
                                    <strong>{item.student}</strong>
                                  </div>
                                </td>
                                <td className={styles.numeric}>{formatVnd(item.rate)}</td>
                                <td>{item.effectiveFrom}</td>
                                <td className={styles.numeric} style={{ fontWeight: 600 }}>
                                  {formatVnd(item.rate)}
                                </td>
                                <td>
                                  {item.existing ? (
                                    <span className={styles.pillWarning}>Đã có hóa đơn kỳ này</span>
                                  ) : (
                                    "—"
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
                    <button className={styles.ghostBtn} onClick={() => setStep(1)}>
                      <ChevronLeft size={16} />
                      <span>Quay lại</span>
                    </button>
                    <button
                      className={styles.primaryBtn}
                      disabled={selectedIds.length === 0}
                      onClick={() => setStep(3)}
                    >
                      <span>Tiếp tục ({selectedIds.length})</span>
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
                        <strong>{selectedStudents.length} học sinh</strong>
                      </div>
                      <div className={styles.summaryItem}>
                        <small>Tổng tiền</small>
                        <strong>{formatVnd(totalAmount)}</strong>
                      </div>
                      <div className={styles.summaryItem}>
                        <small>Kỳ phát hành</small>
                        <strong>01/08 – 31/08/2026</strong>
                      </div>
                    </div>
                    <p style={{ fontSize: "13.5px", color: "#475569" }}>
                      Hệ thống sẽ tạo {selectedStudents.length} hóa đơn ở trạng thái <strong>Chưa nộp</strong> và
                      thông báo đến các học sinh liên quan.
                    </p>
                  </div>
                  <div className={styles.cardFooter}>
                    <button className={styles.ghostBtn} disabled={isRunning} onClick={() => setStep(2)}>
                      <ChevronLeft size={16} />
                      <span>Quay lại</span>
                    </button>
                    <button className={styles.primaryBtn} disabled={isRunning} onClick={handleRunBatch}>
                      {isRunning ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Đang tạo…</span>
                        </>
                      ) : (
                        <span>Chạy tạo hóa đơn</span>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Step 4: Result Panel (Partial State First-Class) */}
              {step === 4 && (
                <>
                  <div className={styles.cardBody}>
                    <div className={styles.resultHeader}>
                      <span className={`${styles.resultBadge} ${styles.badgeCreated}`}>
                        Đã tạo {resultData.created.length}
                      </span>
                      <span className={`${styles.resultBadge} ${styles.badgeSkipped}`}>
                        Bỏ qua {resultData.skipped.length}
                      </span>
                      {resultData.failed.length > 0 && (
                        <span className={`${styles.resultBadge} ${styles.badgeFailed}`}>
                          Lỗi {resultData.failed.length}
                        </span>
                      )}
                    </div>

                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Học sinh</th>
                            <th>Kết quả</th>
                            <th>Chi tiết</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultData.created.map((name) => (
                            <tr key={name}>
                              <td>
                                <strong>{name}</strong>
                              </td>
                              <td>
                                <span className={`${styles.resultBadge} ${styles.badgeCreated}`}>Đã tạo</span>
                              </td>
                              <td style={{ color: "#64748B" }}>Hóa đơn phát hành thành công</td>
                              <td>—</td>
                            </tr>
                          ))}
                          {resultData.skipped.map((item) => (
                            <tr key={item.student}>
                              <td>
                                <strong>{item.student}</strong>
                              </td>
                              <td>
                                <span className={`${styles.resultBadge} ${styles.badgeSkipped}`}>Bỏ qua</span>
                              </td>
                              <td style={{ color: "#64748B" }}>{item.reason}</td>
                              <td>—</td>
                            </tr>
                          ))}
                          {resultData.failed.map((item) => (
                            <tr key={item.student}>
                              <td>
                                <strong>{item.student}</strong>
                              </td>
                              <td>
                                <span className={`${styles.resultBadge} ${styles.badgeFailed}`}>Lỗi</span>
                              </td>
                              <td style={{ color: "#DC2626" }}>{item.reason}</td>
                              <td>
                                <button
                                  className={styles.retryBtn}
                                  onClick={() => handleRetryRow(item.student)}
                                >
                                  <RotateCcw size={12} style={{ display: "inline", marginRight: "4px" }} />
                                  Thử lại
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className={styles.cardFooter} style={{ justifyContent: "flex-end" }}>
                    <button className={styles.primaryBtn} onClick={() => router.push("/admin/invoices")}>
                      Xong
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Review State Switcher Widget */}
      <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
        <span>REVIEW STATE</span>
        {(["ready", "step1", "step2", "step3", "running", "partial", "empty", "error", "forbidden"] as ReviewState[]).map(
          (state) => (
            <button
              key={state}
              className={reviewState === state ? styles.stateActive : ""}
              onClick={() => handleStateChange(state)}
            >
              {state}
            </button>
          ),
        )}
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
