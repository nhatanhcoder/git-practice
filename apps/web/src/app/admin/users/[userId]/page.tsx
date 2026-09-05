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
import { getStudentDataset, getTeacherDataset, getUserDetailDataset } from "../../../../lib/user-detail-data.js";
import { nextStatus } from "../../../../lib/user-status.js";
import { fetchAdminUserDetail } from "../../../../lib/admin-users-service";
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
  const routeData = getUserDetailDataset(params.userId);
  const initialState: ReviewState = routeData?.user.role === "teacher" ? "teacher" : routeData ? "student" : "error";
  const [reviewState, setReviewState] = useState<ReviewState>(initialState);
  const [user, setUser] = useState<DetailUser>((routeData?.user ?? getStudentDataset().user) as DetailUser);
  const [modal, setModal] = useState<Action | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchAdminUserDetail(params.userId)
      .then((res) => {
        if (!isMounted || !res.user) return;
        setUser((curr) => ({
          ...curr,
          id: res.user!.id,
          nickname: res.user!.nickname || curr.nickname,
          email: res.user!.email || curr.email,
          role: res.user!.role || curr.role,
          status: res.user!.status || curr.status,
          createdAt: res.user!.createdAt || curr.createdAt,
          lastLoginAt: res.user!.lastLoginAt,
          hskLevelGoal: res.user!.hskLevelGoal ?? curr.hskLevelGoal,
          bio: res.user!.bio ?? curr.bio,
        }));
        if (res.user.role === "teacher") {
          setReviewState("teacher");
        } else if (res.user.role === "student" || res.user.role === "admin") {
          setReviewState("student");
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [params.userId]);

  function switchState(state: ReviewState) {
    setReviewState(state);
    if (state === "teacher") setUser(getTeacherDataset().user as DetailUser);
    if (["student", "empty", "partial"].includes(state)) setUser(getStudentDataset().user as DetailUser);
    if (state === "forbidden") setToast("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
  }

  function confirm() {
    if (!modal || (modal === "suspend" && !reason.trim())) return;
    setUser((current) => ({ ...current, status: nextStatus(current.status, modal) as UserStatus }));
    setToast({ approve: "Đã duyệt tài khoản", suspend: "Đã khóa tài khoản", activate: "Đã mở khóa tài khoản" }[modal]);
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
            <NotFound />
          ) : reviewState === "loading" ? (
            <DetailLoading />
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
      {toast && (
        <div className={styles.toast}>
          <Check size={18} />
          {toast}
        </div>
      )}
      {modal && (
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
        <Link className={styles.profileButton} href="/admin/profile">
          <span className={styles.headerAvatar}>AT</span>
          <span className={styles.profileText}>
            <strong>Anh Tuấn</strong>
            <small>Quản trị viên</small>
          </span>
          <ChevronDown size={16} />
        </Link>
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
  if (state === "teacher") {
    const data = getTeacherDataset();
    return (
      <div className={styles.historyGrid}>
        <HistoryCard
          title="Lớp đang dạy"
          headers={["Lớp", "Học sinh", "Trạng thái"]}
          rows={data.classes.map((item: { name: string; students: number }) => [
            item.name,
            `${item.students} học sinh`,
            <MiniPill key={item.name} label="Đang hoạt động" tone="success" />,
          ])}
        />
        <HistoryCard
          title="Buổi học đã gửi"
          headers={["Ngày dạy", "Lớp", "Thời lượng", "Trạng thái", "Thao tác"]}
          rows={data.sessions.map((item: { date: string; className: string; duration: string; status: string }) => [
            item.date,
            item.className,
            item.duration,
            <MiniPill
              key={item.date}
              label={item.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
              tone={item.status === "approved" ? "success" : "warning"}
            />,
            <Link key={item.date} className={styles.tableActionLink} href="/admin/payroll/sessions">
              Duyệt buổi học →
            </Link>,
          ])}
        />
      </div>
    );
  }

  const studentData = getStudentDataset();
  const invoices = (studentData as { invoices?: Array<{ code: string; period: string; amount: string; status: string; invoiceId: string }> }).invoices ?? [];
  const enrollments = (studentData as { enrollments?: Array<{ level: string; status: string; rate: string }> }).enrollments ?? [];

  return (
    <div className={styles.historyGrid}>
      <HistoryCard
        title="Lịch sử hóa đơn học phí"
        headers={["Mã hóa đơn", "Kỳ thu", "Số tiền", "Trạng thái", "Thao tác"]}
        rows={invoices.map((inv) => [
          inv.code,
          inv.period,
          inv.amount,
          <MiniPill key={inv.code} label={inv.status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"} tone="success" />,
          <Link key={inv.code} className={styles.tableActionLink} href={`/admin/invoices/${inv.invoiceId}`}>
            Xem hóa đơn →
          </Link>,
        ])}
      />
      <HistoryCard
        title="Lớp học & Cấp độ niêm yết"
        headers={["Cấp độ", "Trạng thái", "Mức học phí", "Thao tác"]}
        rows={enrollments.map((enr) => [
          enr.level,
          <MiniPill key={enr.level} label="Đang học" tone="success" />,
          enr.rate,
          <Link key={enr.level} className={styles.tableActionLink} href="/admin/tuition-rates">
            Biểu phí HSK →
          </Link>,
        ])}
      />
    </div>
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
