"use client";

// MOCK(A-INV-1): GET/POST /api/v1/admin/tuition-rates endpoints mock
// ASSUMPTION(decision-1): Billing model is flat monthly tuition per student with append-only rate history

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
import { useState } from "react";
import { formatVnd } from "../../../lib/formatters";
import styles from "./rates.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface RateHistoryRecord {
  id: string;
  period: string;
  amount: number;
  updatedBy: string;
  reason: string;
}

interface TuitionRateLevel {
  id: string;
  level: string;
  badgeBg: string;
  badgeColor: string;
  amount: number;
  activeStudents: number;
  effectiveFrom: string;
  history: RateHistoryRecord[];
}

const initialRates: TuitionRateLevel[] = [
  {
    id: "hsk-1",
    level: "HSK 1",
    badgeBg: "#ECFDF5",
    badgeColor: "#059669",
    amount: 1200000,
    activeStudents: 12,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h1-1",
        period: "01/01/2026 – Hiện tại",
        amount: 1200000,
        updatedBy: "Hệ thống",
        reason: "Mức học phí niêm yết chuẩn",
      },
    ],
  },
  {
    id: "hsk-2",
    level: "HSK 2",
    badgeBg: "#F0F9FF",
    badgeColor: "#0284C7",
    amount: 1500000,
    activeStudents: 18,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h2-1",
        period: "01/01/2026 – Hiện tại",
        amount: 1500000,
        updatedBy: "Hệ thống",
        reason: "Mức học phí niêm yết chuẩn",
      },
    ],
  },
  {
    id: "hsk-3",
    level: "HSK 3",
    badgeBg: "#EFF6FF",
    badgeColor: "#2563EB",
    amount: 1800000,
    activeStudents: 15,
    effectiveFrom: "01/06/2026",
    history: [
      {
        id: "h3-1",
        period: "01/06/2026 – Hiện tại",
        amount: 1800000,
        updatedBy: "Nguyễn Quản Trị",
        reason: "Điều chỉnh theo lộ trình nâng cấp giáo trình mới",
      },
      {
        id: "h3-2",
        period: "01/01/2026 – 31/05/2026",
        amount: 1600000,
        updatedBy: "Nguyễn Quản Trị",
        reason: "Mức học phí niêm yết ban đầu",
      },
    ],
  },
  {
    id: "hsk-4",
    level: "HSK 4",
    badgeBg: "#F5F3FF",
    badgeColor: "#7C3AED",
    amount: 2200000,
    activeStudents: 8,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h4-1",
        period: "01/01/2026 – Hiện tại",
        amount: 2200000,
        updatedBy: "Hệ thống",
        reason: "Mức học phí niêm yết chuẩn",
      },
    ],
  },
  {
    id: "hsk-5",
    level: "HSK 5",
    badgeBg: "#FFFBEB",
    badgeColor: "#D97706",
    amount: 2800000,
    activeStudents: 4,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h5-1",
        period: "01/01/2026 – Hiện tại",
        amount: 2800000,
        updatedBy: "Hệ thống",
        reason: "Mức học phí niêm yết chuẩn",
      },
    ],
  },
  {
    id: "hsk-6",
    level: "HSK 6",
    badgeBg: "#FEF2F2",
    badgeColor: "#DC2626",
    amount: 3500000,
    activeStudents: 2,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h6-1",
        period: "01/01/2026 – Hiện tại",
        amount: 3500000,
        updatedBy: "Hệ thống",
        reason: "Mức học phí niêm yết chuẩn",
      },
    ],
  },
];

export default function AdminTuitionRatesPage() {
  const router = useRouter();
  const [rates, setRates] = useState<TuitionRateLevel[]>(initialRates);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<TuitionRateLevel | null>(null);
  const [editAmount, setEditAmount] = useState(1800000);
  const [editEffectiveDate, setEditEffectiveDate] = useState("2026-09-01");
  const [editReason, setEditReason] = useState("");

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLevel, setHistoryLevel] = useState<TuitionRateLevel | null>(null);

  const totalStudents = rates.reduce((acc, curr) => acc + curr.activeStudents, 0);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function openEdit(level: TuitionRateLevel) {
    setEditingLevel(level);
    setEditAmount(level.amount);
    setEditReason("");
    setShowEditModal(true);
  }

  function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLevel || !editReason.trim()) return;

    setRates((prev) =>
      prev.map((r) => {
        if (r.id !== editingLevel.id) return r;
        const newRecord: RateHistoryRecord = {
          id: `h-${Date.now()}`,
          period: `${editEffectiveDate} – Hiện tại`,
          amount: editAmount,
          updatedBy: "Nguyễn Quản Trị",
          reason: editReason,
        };
        return {
          ...r,
          amount: editAmount,
          effectiveFrom: editEffectiveDate,
          history: [newRecord, ...r.history],
        };
      })
    );

    setShowEditModal(false);
    triggerToast(`Đã điều chỉnh học phí cấp độ ${editingLevel.level}`);
  }

  function openHistory(level: TuitionRateLevel) {
    setHistoryLevel(level);
    setShowHistoryModal(true);
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
            <strong>Đơn giá học phí</strong>
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
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>BIỂU HỌC PHÍ NIÊM YẾT</p>
              <h1>Đơn giá học phí theo trình độ</h1>
              <p className={styles.subtitle}>Thiết lập mức học phí trọn gói hàng tháng theo từng cấp độ HSK 1 – HSK 6.</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <Link className={styles.secondaryBtn} href="/admin/invoices">
                <span>Danh sách hóa đơn</span>
              </Link>
              <span className={styles.totalStudentsBadge}>{totalStudents} học viên đang theo học</span>
            </div>
          </div>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", color: "#991B1B" }}>
              <span>Không tải được bảng đơn giá học phí.</span>
            </div>
          )}

          {/* Rates Table */}
          <section className={styles.tableCard} aria-label="Bảng đơn giá học phí">
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Trình độ HSK</th>
                    <th className={styles.numeric}>Mức học phí / tháng</th>
                    <th>Học viên đang học</th>
                    <th>Ngày áp dụng</th>
                    <th className={styles.numeric}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span
                          className={styles.levelBadge}
                          style={{ backgroundColor: r.badgeBg, color: r.badgeColor }}
                        >
                          {r.level}
                        </span>
                      </td>
                      <td className={styles.numeric} style={{ fontWeight: 600, fontSize: "14px" }}>
                        {formatVnd(r.amount)}
                      </td>
                      <td>{r.activeStudents} học viên</td>
                      <td>{r.effectiveFrom}</td>
                      <td className={styles.actionLinks}>
                        <button onClick={() => openHistory(r)}>
                          <History size={14} style={{ display: "inline", marginRight: "4px" }} />
                          Lịch sử
                        </button>
                        <button onClick={() => openEdit(r)}>
                          <Pencil size={14} style={{ display: "inline", marginRight: "4px" }} />
                          Điều chỉnh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Edit Rate Modal */}
      {showEditModal && editingLevel && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Điều chỉnh học phí: {editingLevel.level}</h2>
            <p>Mức học phí mới sẽ áp dụng từ chu kỳ xuất hóa đơn tiếp theo.</p>
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

              <div className={styles.formGroup}>
                <label htmlFor="reasonInput">Lý do điều chỉnh (ghi vào nhật ký audit) *</label>
                <textarea
                  id="reasonInput"
                  rows={2}
                  required
                  placeholder="Nhập lý do điều chỉnh học phí..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
              </div>

              <div className={styles.modalNotice}>
                Lưu ý: Các hóa đơn đã tạo trước ngày hiệu lực sẽ không bị thay đổi số tiền.
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowEditModal(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={!editReason.trim()}>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyLevel && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Lịch sử điều chỉnh học phí: {historyLevel.level}</h2>
            <p>Nhật ký append-only ghi nhận các lần điều chỉnh mức học phí.</p>

            <div className={styles.timeline}>
              {historyLevel.history.map((h) => (
                <div key={h.id} className={styles.timelineItem}>
                  <strong>{formatVnd(h.amount)} / tháng</strong>
                  <small>
                    {h.period} • Người cập nhật: {h.updatedBy}
                  </small>
                  <div className={styles.timelineReason}>{h.reason}</div>
                </div>
              ))}
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
