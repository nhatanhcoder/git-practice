"use client";

// MOCK(A-PAY-1): GET/POST /api/v1/admin/pay-rates endpoints mock
// ASSUMPTION(decision-2): Pay-rate unit basis supports per_session and per_hour (0.5h rounded up)

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
import { avatarToneFor, formatVnd, initialsOf } from "../../../lib/formatters";
import styles from "./rates.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";

interface RateHistoryRecord {
  id: string;
  period: string;
  amount: number;
  unit: "per_session" | "per_hour";
  updatedBy: string;
  reason: string;
}

interface TeacherPayRate {
  id: string;
  name: string;
  email: string;
  unit: "per_session" | "per_hour";
  amount: number;
  isCustom: boolean;
  effectiveFrom: string;
  history: RateHistoryRecord[];
}

const initialDefaultRate = {
  amount: 400000,
  unit: "per_session" as "per_session" | "per_hour",
  effectiveFrom: "01/01/2026",
};

const initialTeacherRates: TeacherPayRate[] = [
  {
    id: "t1",
    name: "Phạm Thị Lan",
    email: "lan.pt@example.com",
    unit: "per_session",
    amount: 450000,
    isCustom: true,
    effectiveFrom: "01/06/2026",
    history: [
      {
        id: "h1",
        period: "01/06/2026 – Hiện tại",
        amount: 450000,
        unit: "per_session",
        updatedBy: "Nguyễn Quản Trị",
        reason: "Tăng mức lương giáo viên thâm niên",
      },
      {
        id: "h2",
        period: "01/01/2026 – 31/05/2026",
        amount: 400000,
        unit: "per_session",
        updatedBy: "Nguyễn Quản Trị",
        reason: "Mức mặc định ban đầu",
      },
    ],
  },
  {
    id: "t2",
    name: "Đỗ Hải Yến",
    email: "yen.dh@example.com",
    unit: "per_session",
    amount: 400000,
    isCustom: false,
    effectiveFrom: "01/01/2026",
    history: [
      {
        id: "h3",
        period: "01/01/2026 – Hiện tại",
        amount: 400000,
        unit: "per_session",
        updatedBy: "Hệ thống",
        reason: "Áp dụng mức mặc định",
      },
    ],
  },
];

export default function AdminPayRatesPage() {
  const router = useRouter();
  const [defaultRate, setDefaultRate] = useState(initialDefaultRate);
  const [teacherRates, setTeacherRates] = useState<TeacherPayRate[]>(initialTeacherRates);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherPayRate | null>(null);
  const [editUnit, setEditUnit] = useState<"per_session" | "per_hour">("per_session");
  const [editAmount, setEditAmount] = useState(400000);
  const [editEffectiveDate, setEditEffectiveDate] = useState("2026-09-01");
  const [editReason, setEditReason] = useState("");

  // History Modal State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTeacher, setHistoryTeacher] = useState<TeacherPayRate | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function openEditModal(teacher: TeacherPayRate | null) {
    setEditingTeacher(teacher);
    if (teacher) {
      setEditUnit(teacher.unit);
      setEditAmount(teacher.amount);
    } else {
      setEditUnit(defaultRate.unit);
      setEditAmount(defaultRate.amount);
    }
    setEditReason("");
    setShowEditModal(true);
  }

  function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    if (!editReason.trim()) return;

    if (editingTeacher) {
      setTeacherRates((prev) =>
        prev.map((t) => {
          if (t.id !== editingTeacher.id) return t;
          const newRecord: RateHistoryRecord = {
            id: `h-${Date.now()}`,
            period: `${editEffectiveDate} – Hiện tại`,
            amount: editAmount,
            unit: editUnit,
            updatedBy: "Nguyễn Quản Trị",
            reason: editReason,
          };
          return {
            ...t,
            amount: editAmount,
            unit: editUnit,
            isCustom: true,
            effectiveFrom: editEffectiveDate,
            history: [newRecord, ...t.history],
          };
        })
      );
      triggerToast(`Đã cập nhật mức lương cho ${editingTeacher.name}`);
    } else {
      setDefaultRate({
        amount: editAmount,
        unit: editUnit,
        effectiveFrom: editEffectiveDate,
      });
      triggerToast("Đã cập nhật mức lương mặc định");
    }
    setShowEditModal(false);
  }

  function openHistory(teacher: TeacherPayRate) {
    setHistoryTeacher(teacher);
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
          <Link className={styles.navItem} href="/admin/invoices">
            <CircleDollarSign size={20} />
            <span>Học phí</span>
          </Link>
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin/payroll">
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
            <Link href="/admin/payroll">Lương</Link>
            <ChevronRight size={14} />
            <strong>Đơn giá dạy</strong>
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
              <p className={styles.eyebrow}>CẤU HÌNH THÙ LAO</p>
              <h1>Đơn giá dạy giáo viên</h1>
              <p className={styles.subtitle}>Thiết lập mức lương mặc định và mức chi trả riêng theo từng giáo viên.</p>
            </div>
            <button className={styles.secondaryBtn} onClick={() => openEditModal(null)}>
              Chỉnh sửa mức mặc định
            </button>
          </div>

          {/* Default Rate Card */}
          <section className={styles.defaultRateCard} aria-label="Mức lương mặc định">
            <div className={styles.defaultInfo}>
              <small>Mức thù lao chuẩn toàn hệ thống</small>
              <h2>
                {formatVnd(defaultRate.amount)} / {defaultRate.unit === "per_session" ? "buổi" : "giờ"}
              </h2>
              <p>
                Áp dụng từ {defaultRate.effectiveFrom} cho toàn bộ giáo viên chưa có thiết lập thù lao riêng.
              </p>
            </div>
            <button className={styles.secondaryBtn} onClick={() => openEditModal(null)}>
              <Pencil size={14} style={{ display: "inline", marginRight: "6px" }} />
              Thay đổi mức chuẩn
            </button>
          </section>

          {/* Error Banner */}
          {reviewState === "error" && (
            <div style={{ backgroundColor: "rgba(220,38,38,0.08)", borderLeft: "3px solid #DC2626", padding: "12px 16px", borderRadius: "6px", marginBottom: "16px", color: "#991B1B" }}>
              <span>Không tải được danh sách đơn giá giáo viên.</span>
            </div>
          )}

          {/* Teachers Rates Table */}
          <section className={styles.tableCard} aria-label="Bảng đơn giá theo giáo viên">
            <div className={styles.cardHeader}>
              <h3>Đơn giá theo từng giáo viên</h3>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Giáo viên</th>
                    <th>Hình thức tính</th>
                    <th className={styles.numeric}>Mức áp dụng</th>
                    <th>Loại mức</th>
                    <th>Ngày hiệu lực</th>
                    <th className={styles.numeric}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherRates.map((t) => {
                    const tone = avatarToneFor(t.name);
                    return (
                      <tr key={t.id}>
                        <td>
                          <div className={styles.teacherCell}>
                            <span
                              className={styles.teacherAvatar}
                              style={{ backgroundColor: tone.bg, color: tone.text }}
                            >
                              {initialsOf(t.name)}
                            </span>
                            <div className={styles.teacherMeta}>
                              <strong>{t.name}</strong>
                              <small>{t.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>{t.unit === "per_session" ? "Theo buổi (90p)" : "Theo giờ"}</td>
                        <td className={styles.numeric} style={{ fontWeight: 600 }}>
                          {formatVnd(t.amount)} / {t.unit === "per_session" ? "buổi" : "giờ"}
                        </td>
                        <td>
                          <span className={t.isCustom ? styles.pillCustom : styles.pillDefault}>
                            {t.isCustom ? "Thiết lập riêng" : "Mặc định"}
                          </span>
                        </td>
                        <td>{t.effectiveFrom}</td>
                        <td className={styles.actionLinks}>
                          <button onClick={() => openHistory(t)}>
                            <History size={14} style={{ display: "inline", marginRight: "4px" }} />
                            Lịch sử
                          </button>
                          <button onClick={() => openEditModal(t)}>
                            <Pencil size={14} style={{ display: "inline", marginRight: "4px" }} />
                            Chỉnh sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Edit Rate Modal */}
      {showEditModal && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>
              {editingTeacher ? `Thiết lập thù lao: ${editingTeacher.name}` : "Cập nhật mức lương chuẩn"}
            </h2>
            <p>
              {editingTeacher
                ? "Mức thù lao riêng sẽ ưu tiên áp dụng cho giáo viên này thay vì mức chuẩn."
                : "Mức lương này sẽ tự động áp dụng cho các giáo viên không có thiết lập riêng."}
            </p>
            <form onSubmit={handleSaveRate}>
              <div className={styles.formGroup}>
                <label htmlFor="unitSelect">Hình thức tính thù lao *</label>
                <select
                  id="unitSelect"
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value as "per_session" | "per_hour")}
                >
                  <option value="per_session">Theo buổi dạy (per_session — mặc định 90 phút)</option>
                  <option value="per_hour">Theo giờ thực dạy (per_hour — làm tròn 0.5h)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="amountInput">Mức thù lao (VNĐ) *</label>
                <input
                  id="amountInput"
                  type="number"
                  step="10000"
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
                  placeholder="Nhập lý do thay đổi mức lương..."
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                />
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
                  Lưu cấu hình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && historyTeacher && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Lịch sử thay đổi thù lao: {historyTeacher.name}</h2>
            <p>Nhật ký append-only ghi nhận các lần điều chỉnh đơn giá dạy.</p>

            <div className={styles.timeline}>
              {historyTeacher.history.map((h) => (
                <div key={h.id} className={styles.timelineItem}>
                  <strong>
                    {formatVnd(h.amount)} / {h.unit === "per_session" ? "buổi" : "giờ"}
                  </strong>
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
