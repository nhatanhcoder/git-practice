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
  Clock3,
  Inbox,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { avatarToneFor } from "../../../../lib/formatters";
import { getStatusColor } from "../../../../lib/status";
import { nextStatus } from "../../../../lib/user-status.js";
import { activateUser, approveUser, fetchAdminUserDetail, suspendUser } from "../../../../lib/admin-users-service";
import { ApiError } from "../../../../lib/api-client";
import { SessionChip } from "@/components/auth/session-chip";
import styles from "./detail.module.css";

type UserStatus = "pending" | "active" | "suspended";
type Action = "approve" | "suspend" | "activate";
type ReviewState = "student" | "teacher" | "loading" | "empty" | "partial" | "error" | "forbidden";
type DetailUser = {
  id: string;
  nickname: string;
  email: string;
  role: "student" | "teacher" | "admin";
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  initials: string;
  hskLevelGoal?: number;
  bio?: string;
};

const statusLabels: Record<UserStatus, string> = {
  pending: "Chờ duyệt",
  active: "Đang hoạt động",
  suspended: "Đã khóa",
};
const roleLabels = { student: "Học sinh", teacher: "Giáo viên", admin: "Admin" };
const actionLabels: Record<Action, string> = {
  approve: "Duyệt tài khoản",
  suspend: "Khóa tài khoản",
  activate: "Mở khóa",
};
const actionFor = (status: UserStatus): Action =>
  status === "pending" ? "approve" : status === "active" ? "suspend" : "activate";

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  // Starts empty. It used to seed itself from getUserDetailDataset() / a mock
  // student record, which meant an unreachable API rendered a complete, plausible
  // profile for a user that may not exist. Nothing is shown until the server says
  // who this is.
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [user, setUser] = useState<DetailUser | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modal, setModal] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);

    fetchAdminUserDetail(params.userId)
      .then((detail) => {
        if (!isMounted) return;
        setUser({
          id: detail.id,
          nickname: detail.nickname || detail.email,
          email: detail.email,
          role: detail.role,
          status: detail.status as UserStatus,
          createdAt: detail.createdAt,
          lastLoginAt: detail.lastLoginAt,
          initials: (detail.nickname || detail.email).trim().slice(0, 2).toUpperCase(),
          hskLevelGoal: detail.hskLevelGoal ?? undefined,
          bio: detail.bio ?? undefined,
        });
        setReviewState(detail.role === "teacher" ? "teacher" : "student");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setUser(null);
        if (err instanceof ApiError && err.isForbidden) {
          setReviewState("forbidden");
        } else if (err instanceof ApiError && err.statusCode === 404) {
          setReviewState("empty");
        } else {
          setReviewState("error");
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "Không kết nối được máy chủ. Kiểm tra API có đang chạy không.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.userId]);

  // Dev-only state preview. It no longer swaps in mock users — with the screen on
  // live data, replacing the real profile with a fixture is exactly the confusion
  // this whole change removes. It only paints the state.
  function switchState(state: ReviewState) {
    setReviewState(state);
    if (state === "forbidden") setToast("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
  }

  async function confirm() {
    if (!modal || !user || (modal === "suspend" && !reason.trim())) return;
    if (!nextStatus(user.status, modal)) return;

    try {
      const call = { approve: approveUser, suspend: suspendUser, activate: activateUser }[modal];
      const updated = await call(user.id);
      // The server's status, not a locally computed one.
      setUser((current) => (current ? { ...current, status: updated.status as UserStatus } : current));
      setToast({ approve: "Đã duyệt tài khoản", suspend: "Đã khóa tài khoản", activate: "Đã mở khóa tài khoản" }[modal]);
    } catch (err) {
      setToast(err instanceof ApiError ? `Thất bại: ${err.message}` : "Thất bại: không kết nối được máy chủ");
    }

    setModal(null);
    setReason("");
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <div className={styles.appShell}>
      <AdminSidebar open={mobileNav} close={() => setMobileNav(false)} />
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
      <div className={styles.mainColumn}>
        <AdminHeader openMenu={() => setMobileNav(true)} />
        <main className={`${styles.content} ${styles.detailContent}`}>
          {reviewState === "forbidden" ? (
            <Forbidden />
          ) : reviewState === "error" ? (
            <LoadFailed message={loadError} />
          ) : reviewState === "loading" ? (
            <DetailLoading />
          ) : !user ? (
            <NotFound />
          ) : (
            <>
              <Link className={styles.backLink} href="/admin/users">
                <ChevronLeft size={17} />
                <span>Quay lại danh sách tài khoản</span>
              </Link>
              <section className={styles.profileCard}>
                <div
                  className={styles.detailAvatar}
                  style={{
                    backgroundColor: avatarToneFor(user.nickname).bg,
                    color: avatarToneFor(user.nickname).text,
                  }}
                >
                  {user.initials}
                </div>
                <div className={styles.profileHeading}>
                  <div className={styles.profileNameRow}>
                    <h1>{user.nickname}</h1>
                    <StatusPill status={user.status} />
                  </div>
                  <p>{user.email}</p>
                  <div className={styles.profileMeta}>
                    <span>{roleLabels[user.role]}</span>
                    {user.hskLevelGoal && <span>Mục tiêu HSK {user.hskLevelGoal}</span>}
                    {user.bio && <span>{user.bio}</span>}
                  </div>
                </div>
                <div className={styles.profileActions}>
                  {user.role === "teacher" && (
                    <>
                      <Link className={styles.subActionLink} href="/admin/payroll">
                        <WalletCards size={15} />
                        <span>Kỳ lương</span>
                      </Link>
                      <Link className={styles.subActionLink} href="/admin/payroll/sessions">
                        <Clock3 size={15} />
                        <span>Duyệt buổi học</span>
                      </Link>
                      <Link className={styles.subActionLink} href="/admin/pay-rates">
                        <CircleDollarSign size={15} />
                        <span>Mức lương GV</span>
                      </Link>
                    </>
                  )}
                  {user.role === "student" && (
                    <>
                      <Link className={styles.subActionLink} href="/admin/invoices">
                        <CircleDollarSign size={15} />
                        <span>Hóa đơn học phí</span>
                      </Link>
                      <Link className={styles.subActionLink} href="/admin/tuition-rates">
                        <BookOpen size={15} />
                        <span>Biểu học phí</span>
                      </Link>
                    </>
                  )}
                  <button
                    className={actionFor(user.status) === "suspend" ? styles.detailDangerButton : styles.detailPrimaryButton}
                    onClick={() => {
                      setReason("");
                      setModal(actionFor(user.status));
                    }}
                  >
                    {actionLabels[actionFor(user.status)]}
                  </button>
                </div>
              </section>
              <section className={styles.identityCard}>
                <h2>Thông tin tài khoản</h2>
                <dl>
                  <div>
                    <dt>Ngày đăng ký</dt>
                    <dd>{user.createdAt}</dd>
                  </div>
                  <div>
                    <dt>Đăng nhập gần nhất</dt>
                    <dd>{user.lastLoginAt ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Trạng thái</dt>
                    <dd>
                      <StatusPill status={user.status} />
                    </dd>
                  </div>
                </dl>
              </section>
              {reviewState === "partial" ? <HistorySkeleton /> : <HistoryPanels state={reviewState} />}
              <section className={styles.disabledCard}>
                <div className={styles.disabledIcon}>
                  <Clock3 size={20} />
                </div>
                <div>
                  <h2>Lịch sử đăng nhập</h2>
                  <p>Chưa khả dụng — phụ thuộc Sprint 5</p>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
      {/* WEB-004: design-review scaffolding, dev only. */}
      {process.env.NODE_ENV !== "production" && (
      <div className={`${styles.stateSwitcher} ${styles.detailSwitcher}`}>
          <span>REVIEW STATE</span>
          {(["student", "teacher", "loading", "empty", "partial", "error", "forbidden"] as ReviewState[]).map((state) => (
            <button
              key={state}
              className={reviewState === state ? styles.stateActive : ""}
              onClick={() => switchState(state)}
            >
              {state === "student" ? "ready: student" : state === "teacher" ? "ready: teacher" : state}
            </button>
          ))}
        </div>
      )}
      {toast && (
        <div className={styles.toast}>
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && user && (
        <ActionModal
          user={user}
          action={modal}
          reason={reason}
          setReason={setReason}
          close={() => setModal(null)}
          confirm={confirm}
        />
      )}
    </div>
  );
}

function AdminSidebar({ open, close }: { open: boolean; close: () => void }) {
  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>学</span>
        <span>HSK Platform</span>
        <button className={styles.closeNav} onClick={close} aria-label="Đóng menu">
          <X size={20} />
        </button>
      </div>
      <nav className={styles.nav} aria-label="Điều hướng quản trị">
        <Link className={styles.navItem} href="/admin">
          <LayoutDashboard size={20} />
          <span>Tổng quan</span>
        </Link>
        <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin/users">
          <Users size={20} />
          <span>Tài khoản</span>
        </Link>
        <Link className={styles.navItem} href="/admin/invoices">
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
  );
}

function AdminHeader({ openMenu }: { openMenu: () => void }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        <button className={styles.menuButton} onClick={openMenu} aria-label="Mở menu">
          <Menu size={20} />
        </button>
        <Link href="/admin">Quản trị</Link>
        <ChevronRight size={15} />
        <Link href="/admin/users">Tài khoản</Link>
        <ChevronRight size={15} />
        <strong>Chi tiết</strong>
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
            avatar: styles.headerAvatar,
            text: styles.profileText,
          }}
        />
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: UserStatus }) {
  const theme = getStatusColor(status);
  return (
    <span className={styles.statusPill} style={{ backgroundColor: theme.bg, color: theme.text }}>
      <i />
      {statusLabels[status]}
    </span>
  );
}

function Forbidden() {
  return (
    <div className={styles.notFound}>
      <span><ShieldCheck size={30} /></span>
      <h1>Không có quyền truy cập</h1>
      <p>Tài khoản hiện tại không được phép xem hồ sơ người dùng.</p>
      <Link href="/admin">Quay lại tổng quan</Link>
    </div>
  );
}

function HistoryPanels({ state }: { state: ReviewState }) {
  // ⛔ BLOCKED — API-001. `GET /api/v1/admin/users/:id` returns identity fields
  // only; there is no role-scoped history in the payload (enrollments + attempts
  // for a student, classes + sessions for a teacher). That gap is recorded in
  // ai/PROGRESS.md § Needs from the other lane.
  //
  // This used to render getStudentDataset() / getTeacherDataset() — invented
  // classes, scores and attendance shown as if they were this account's record.
  // An admin deciding whether to suspend someone was reading fiction. Until the
  // endpoint carries the history, the honest answer is that we do not have it.
  const label =
    state === "teacher"
      ? "lớp đang dạy và buổi dạy gần đây"
      : "lớp đã tham gia và bài đã làm";

  return (
    <section className={styles.historyCard}>
      <h2>Lịch sử hoạt động</h2>
      <p className={styles.historyBlocked}>
        Chưa hiển thị được {label}. Endpoint <code>GET /admin/users/:id</code> hiện chỉ
        trả về thông tin định danh, chưa kèm lịch sử theo vai trò (API-001).
      </p>
    </section>
  );
}

function HistoryCard({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <section className={styles.historyCard}>
      <div className={styles.historyTitle}>
        <h2>{title}</h2>
      </div>
      {!rows.length ? (
        <div className={styles.panelEmpty}>
          <Inbox size={27} />
          <p>Chưa có hoạt động nào</p>
        </div>
      ) : (
        <>
          <div className={styles.historyTable}>
            <table>
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, i) => (
                      <td key={i}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.historyCardsMobile}>
            {rows.map((row, index) => (
              <article key={index}>
                {row.map((cell, i) => (
                  <div key={i}>
                    <span>{headers[i]}</span>
                    <strong>{cell}</strong>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function MiniPill({ label, tone }: { label: string; tone: "success" | "warning" }) {
  return <span className={`${styles.miniPill} ${styles[tone]}`}>{label}</span>;
}

function DetailLoading() {
  return (
    <div className={styles.detailLoading}>
      <div className={styles.detailSkeletonBack} />
      <div className={styles.detailSkeletonHeader} />
      <div className={styles.detailSkeletonIdentity} />
      <HistorySkeleton />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className={styles.historyGrid}>
      {[0, 1].map((item) => (
        <div className={styles.historySkeleton} key={item}>
          <span />
          <i />
          <i />
          <i />
        </div>
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <div className={styles.notFound}>
      <span>
        <AlertCircle size={34} />
      </span>
      <h1>Không tìm thấy tài khoản này.</h1>
      <p>Tài khoản có thể đã bị xóa hoặc đường dẫn không chính xác.</p>
      <Link href="/admin/users">
        <ChevronLeft size={17} />
        <span>Quay lại danh sách</span>
      </Link>
    </div>
  );
}

function ActionModal({
  user,
  action,
  reason,
  setReason,
  close,
  confirm,
}: {
  user: DetailUser;
  action: Action;
  reason: string;
  setReason: (value: string) => void;
  close: () => void;
  confirm: () => void;
}) {
  const bodies = {
    approve: `Tài khoản ${user.nickname} sẽ được kích hoạt và có thể đăng nhập ngay.`,
    suspend: `${user.nickname} sẽ không thể đăng nhập cho đến khi được mở khóa.`,
    activate: `Tài khoản ${user.nickname} sẽ có thể đăng nhập và sử dụng hệ thống trở lại.`,
  };
  return (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={close}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalIcon}>
          <UserRound size={22} />
        </div>
        <h2 id="detail-modal-title">{actionLabels[action]}</h2>
        <p>{bodies[action]}</p>
        {action === "suspend" && (
          <label className={styles.reasonField}>
            <span>Lý do khóa</span>
            <textarea
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Nhập lý do khóa tài khoản"
              rows={3}
            />
            <small>Bắt buộc</small>
          </label>
        )}
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={close}>
            Hủy
          </button>
          <button
            className={action === "suspend" ? styles.dangerButton : styles.primaryButton}
            disabled={action === "suspend" && !reason.trim()}
            onClick={confirm}
          >
            {actionLabels[action]}
          </button>
        </div>
      </div>
    </div>
  );
}


/**
 * Shown when the request failed for a reason other than 404.
 *
 * Kept separate from <NotFound /> on purpose: "we could not reach the server" and
 * "this account does not exist" lead an admin to two completely different next
 * actions, and the page used to render the second message for the first problem.
 */
function LoadFailed({ message }: { message: string | null }) {
  return (
    <div className={styles.emptyState} role="alert">
      <AlertCircle size={26} />
      <h2>Không tải được hồ sơ</h2>
      <p>{message ?? "Không kết nối được máy chủ."}</p>
      <Link className={styles.backLink} href="/admin/users">
        <ChevronLeft size={17} />
        <span>Quay lại danh sách tài khoản</span>
      </Link>
    </div>
  );
}
