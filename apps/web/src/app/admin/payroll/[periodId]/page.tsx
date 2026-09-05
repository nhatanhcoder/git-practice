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
  Lock,
  Menu,
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
  deletePayrollPeriod,
  fetchPayrollPeriodDetail,
  finalizePayrollPeriod,
  payPayrollPeriod,
  PayrollPeriodDetail,
} from "../../../../lib/admin-payroll-service";
import { formatDate, formatVnd, initialsOf } from "../../../../lib/formatters";
import { getStatusColor } from "../../../../lib/status";
import styles from "./detail.module.css";

type PayrollStatus = "draft" | "finalized" | "paid";
type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

const statusLabels: Record<PayrollStatus, string> = {
  draft: "Nháp",
  finalized: "Đã chốt",
  paid: "Đã trả",
};

interface TeacherGroup {
  id: string;
  name: string;
  sessionCount: number;
  totalAmount: number;
  sessions: {
    id: string;
    date: string;
    className: string;
    time: string;
    rateBasis: string;
    amount: number;
  }[];
}

export default function AdminPayrollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = (params?.periodId as string) || "";

  const [period, setPeriod] = useState<PayrollPeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [expandedTeachers, setExpandedTeachers] = useState<string[]>([]);

  // Modals
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPaidModal, setShowPaidModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadDetail() {
    if (!periodId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPayrollPeriodDetail(periodId);
      setPeriod(data);
      if (data.teacherId) {
        setExpandedTeachers([data.teacherId]);
      }
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else if (err?.statusCode === 404) {
        setReviewState("error");
      } else {
        setErrorMessage(err?.message || "Không thể tải chi tiết kỳ lương");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetail();
  }, [periodId]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function toggleTeacher(id: string) {
    if (expandedTeachers.includes(id)) {
      setExpandedTeachers(expandedTeachers.filter((item) => item !== id));
    } else {
      setExpandedTeachers([...expandedTeachers, id]);
    }
  }

  async function confirmFinalize() {
    setActionLoading(true);
    try {
      await finalizePayrollPeriod(periodId);
      setShowFinalizeModal(false);
      triggerToast("Đã chốt kỳ lương");
      await loadDetail();
    } catch (err: any) {
      triggerToast(err?.message || "Không thể chốt kỳ lương");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmMarkPaid() {
    setActionLoading(true);
    try {
      await payPayrollPeriod(periodId);
      setShowPaidModal(false);
      triggerToast("Đã ghi nhận chi trả kỳ lương");
      await loadDetail();
    } catch (err: any) {
      triggerToast(err?.message || "Không thể ghi nhận chi trả");
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete() {
    setActionLoading(true);
    try {
      await deletePayrollPeriod(periodId);
      setShowDeleteModal(false);
      triggerToast("Đã xóa kỳ lương và hoàn trả trạng thái buổi học");
      setTimeout(() => {
        router.push("/admin/payroll");
      }, 700);
    } catch (err: any) {
      triggerToast(err?.message || "Không thể xóa kỳ lương");
      setActionLoading(false);
    }
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  // Aggregate sessions for the teacher
  const teacherGroups: TeacherGroup[] = [];
  if (period) {
    const sessionsList = (period.sessions || []).map((s) => {
      const timeStr =
        s.actualStart && s.actualEnd
          ? `${formatDate(s.actualStart)} ${s.actualStart.slice(11, 16)}–${s.actualEnd.slice(11, 16)}`
          : formatDate(s.scheduledDate);
      return {
        id: s.sessionId,
        date: formatDate(s.scheduledDate),
        className: s.className || "Lớp học",
        time: timeStr,
        rateBasis: s.appliedRateAmount
          ? `${formatVnd(Number(s.appliedRateAmount))} / ${
              s.appliedRateType === "per_session" ? "buổi" : "giờ"
            }`
          : "—",
        amount: Number(s.amount),
      };
    });

    teacherGroups.push({
      id: period.teacherId,
      name: period.teacherName || "Giáo viên",
      sessionCount: period.totalSessions ?? sessionsList.length,
      totalAmount: Number(period.totalAmount),
      sessions: sessionsList,
    });
  }

  const periodStatus: PayrollStatus = period?.status || "draft";
  const statusTheme = getStatusColor(periodStatus);
  const totalSessionsCount = period?.totalSessions ?? 0;
  const totalAmountNum = Number(period?.totalAmount || 0);

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
            <Link href="/admin/payroll">Lương</Link>
            <ChevronRight size={14} />
            <strong>Chi tiết kỳ lương</strong>
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
          <Link className={styles.backLink} href="/admin/payroll">
            <ChevronLeft size={16} />
            <span>Quay lại danh sách kỳ lương</span>
          </Link>

          {loading || reviewState === "loading" ? (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748B" }}>
              Đang tải chi tiết kỳ lương...
            </div>
          ) : reviewState === "error" || !period ? (
            <div className={styles.emptyCard}>
              <AlertCircle
                size={44}
                color="#DC2626"
                style={{ margin: "0 auto 12px" }}
              />
              <h2>Không tìm thấy kỳ lương này</h2>
              <p>Mã kỳ lương không tồn tại trong hệ thống.</p>
            </div>
          ) : (
            <>
              {/* Header Card */}
              <section
                className={styles.headerCard}
                aria-label="Thông tin kỳ lương"
              >
                <div>
                  <div className={styles.periodTitle}>
                    <h1>
                      {formatDate(period.periodStart)} –{" "}
                      {formatDate(period.periodEnd)}
                    </h1>
                    <span
                      className={styles.statusPill}
                      style={{
                        backgroundColor: statusTheme.bg,
                        color: statusTheme.text,
                      }}
                    >
                      <i className={styles.statusDot} />
                      {statusLabels[periodStatus] || periodStatus}
                    </span>
                  </div>
                  <span className={styles.periodSubtitle}>
                    Mã kỳ: {period.code} • Giáo viên: {period.teacherName}
                  </span>
                </div>

                <div className={styles.headerMetrics}>
                  <div className={styles.metricItem}>
                    <small>Số buổi học</small>
                    <strong>{totalSessionsCount} buổi</strong>
                  </div>
                  <div className={styles.metricItem}>
                    <small>Giáo viên</small>
                    <strong>{period.teacherName}</strong>
                  </div>
                  <div
                    className={`${styles.metricItem} ${styles.metricHeadline}`}
                  >
                    <small>Tổng chi lương</small>
                    <strong>{formatVnd(totalAmountNum)}</strong>
                  </div>
                </div>

                <div className={styles.headerActionsGroup}>
                  {periodStatus === "draft" && (
                    <>
                      <button
                        className={styles.primaryAction}
                        onClick={() => setShowFinalizeModal(true)}
                        disabled={totalSessionsCount === 0}
                      >
                        <Lock size={15} />
                        <span>Chốt kỳ lương</span>
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        style={{
                          backgroundColor: "#FEE2E2",
                          color: "#DC2626",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontWeight: 500,
                        }}
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <Trash2 size={15} />
                        <span>Hủy kỳ lương nháp</span>
                      </button>
                      {totalSessionsCount === 0 && (
                        <span className={styles.actionHelp}>
                          Kỳ lương chưa có buổi học nào.
                        </span>
                      )}
                    </>
                  )}

                  {periodStatus === "finalized" && (
                    <button
                      className={styles.primaryAction}
                      onClick={() => setShowPaidModal(true)}
                    >
                      <Check size={16} />
                      <span>Đánh dấu đã trả</span>
                    </button>
                  )}

                  {periodStatus === "paid" && (
                    <div className={styles.paidBadge}>
                      <Check size={15} />
                      <span>
                        Đã chi trả ngày {formatDate(period.paidAt)}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Teacher Breakdown Accordions */}
              {totalSessionsCount === 0 ? (
                <div className={styles.emptyCard}>
                  <Inbox
                    size={44}
                    color="#64748B"
                    style={{ margin: "0 auto 12px", opacity: 0.25 }}
                  />
                  <h2>Kỳ lương chưa có dữ liệu</h2>
                  <p>
                    Chưa có buổi học nào được duyệt trong khoảng thời gian này.
                  </p>
                </div>
              ) : (
                <section
                  className={styles.teachersContainer}
                  aria-label="Bảng chi tiết theo giáo viên"
                >
                  {teacherGroups.map((teacher) => {
                    const isOpen = expandedTeachers.includes(teacher.id);
                    return (
                      <article key={teacher.id} className={styles.teacherCard}>
                        <div
                          className={styles.teacherHeader}
                          onClick={() => toggleTeacher(teacher.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className={styles.teacherMeta}>
                            <span
                              className={styles.teacherAvatarLarge}
                              style={{
                                backgroundColor: "#EDE9FE",
                                color: "#5B21B6",
                              }}
                            >
                              {initialsOf(teacher.name)}
                            </span>
                            <div>
                              <strong>{teacher.name}</strong>
                              <small>
                                {teacher.sessionCount} buổi học đã duyệt
                              </small>
                            </div>
                          </div>
                          <div className={styles.teacherFigures}>
                            <ChevronDown
                              className={`${styles.chevronIcon} ${
                                isOpen ? styles.chevronOpen : ""
                              }`}
                              size={18}
                            />
                          </div>
                        </div>

                        {isOpen && (
                          <table className={styles.breakdownTable}>
                            <thead>
                              <tr>
                                <th>Ngày dạy</th>
                                <th>Lớp</th>
                                <th>Thời gian</th>
                                <th>Mức áp dụng</th>
                                <th className={styles.numeric}>Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {teacher.sessions.map((line) => (
                                <tr key={line.id}>
                                  <td>{line.date}</td>
                                  <td>{line.className}</td>
                                  <td style={{ color: "#475569" }}>
                                    {line.time}
                                  </td>
                                  <td>{line.rateBasis}</td>
                                  <td
                                    className={styles.numeric}
                                    style={{ fontWeight: 600 }}
                                  >
                                    {formatVnd(line.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </article>
                    );
                  })}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Finalize Modal */}
      {showFinalizeModal && period && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>
              Chốt kỳ lương {formatDate(period.periodStart)} –{" "}
              {formatDate(period.periodEnd)}
            </h2>
            <p>
              Sau khi chốt, tổng số buổi và mức chi lương sẽ được khóa và không thể
              chỉnh sửa thêm.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowFinalizeModal(false)}
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={confirmFinalize}
                disabled={actionLoading}
              >
                {actionLoading ? "Đang chốt..." : "Chốt kỳ lương"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {showPaidModal && period && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Đánh dấu đã chi trả</h2>
            <p>
              Xác nhận đã thanh toán toàn bộ {formatVnd(totalAmountNum)} cho giáo
              viên {period.teacherName} trong kỳ lương này.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowPaidModal(false)}
                disabled={actionLoading}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={confirmMarkPaid}
                disabled={actionLoading}
              >
                {actionLoading ? "Đang xử lý..." : "Xác nhận đã trả"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Modal (API-003) */}
      {showDeleteModal && period && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Hủy kỳ lương nháp</h2>
            <p>
              Hành động này sẽ giải phóng tất cả các buổi học trong kỳ lương trở
              lại trạng thái đã duyệt chưa gán kỳ lương.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Quay lại
              </button>
              <button
                type="button"
                style={{
                  backgroundColor: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onClick={confirmDelete}
                disabled={actionLoading}
              >
                {actionLoading ? "Đang hủy..." : "Xác nhận hủy"}
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
