"use client";

import {
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nextStatus } from "../../../lib/user-status.js";
import styles from "./users.module.css";

type UserStatus = "pending" | "active" | "suspended";
type UserRole = "admin" | "teacher" | "student";
type Action = "approve" | "suspend" | "activate";
type ReviewState = "ready" | "loading" | "empty" | "error";

type User = {
  id: string;
  nickname: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  initials: string;
  avatarTone: string;
};

const initialUsers: User[] = [
  { id: "1", nickname: "Nguyễn Minh Anh", email: "minhanh@example.com", role: "student", status: "pending", createdAt: "2026-08-09", lastLoginAt: null, initials: "MA", avatarTone: "blue" },
  { id: "2", nickname: "Trần Thu Hà", email: "thuha.teacher@example.com", role: "teacher", status: "pending", createdAt: "2026-08-08", lastLoginAt: null, initials: "TH", avatarTone: "violet" },
  { id: "3", nickname: "Lê Quang Dũng", email: "quangdung@example.com", role: "student", status: "active", createdAt: "2026-05-21", lastLoginAt: "2026-08-11 09:14", initials: "QD", avatarTone: "emerald" },
  { id: "4", nickname: "Phạm Thị Lan", email: "lan.pham@example.com", role: "teacher", status: "active", createdAt: "2026-03-02", lastLoginAt: "2026-08-11 07:42", initials: "PL", avatarTone: "amber" },
  { id: "5", nickname: "Hoàng Văn Nam", email: "namhoang@example.com", role: "student", status: "active", createdAt: "2026-06-14", lastLoginAt: "2026-08-10 20:05", initials: "HN", avatarTone: "cyan" },
  { id: "6", nickname: "Vũ Ngọc Bích", email: "bichvu@example.com", role: "student", status: "suspended", createdAt: "2026-04-30", lastLoginAt: "2026-07-28 15:33", initials: "VB", avatarTone: "rose" },
  { id: "7", nickname: "Đỗ Hải Yến", email: "haiyen.teacher@example.com", role: "teacher", status: "active", createdAt: "2026-01-19", lastLoginAt: "2026-08-11 08:58", initials: "HY", avatarTone: "indigo" },
  { id: "8", nickname: "Bùi Anh Tuấn", email: "tuanbui@example.com", role: "admin", status: "active", createdAt: "2025-11-05", lastLoginAt: "2026-08-11 09:31", initials: "AT", avatarTone: "slate" },
];

const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };
const statusLabels: Record<UserStatus, string> = { pending: "Chờ duyệt", active: "Đang hoạt động", suspended: "Đã khóa" };
const actionLabels: Record<Action, string> = { approve: "Duyệt tài khoản", suspend: "Khóa tài khoản", activate: "Mở khóa" };

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  const [date, time] = value.split(" ");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}${withTime && time ? ` ${time}` : ""}`;
}

function actionFor(status: UserStatus): Action {
  return status === "pending" ? "approve" : status === "active" ? "suspend" : "activate";
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<{ user: User; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sort, setSort] = useState<"createdAt" | "lastLoginAt">("createdAt");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return users
      .filter((user) => role === "all" || user.role === role)
      .filter((user) => status === "all" || user.status === status)
      .filter((user) => !normalized || `${user.nickname} ${user.email}`.toLocaleLowerCase("vi").includes(normalized))
      .sort((a, b) => (b[sort] ?? "").localeCompare(a[sort] ?? ""));
  }, [query, role, sort, status, users]);

  const hasFilters = Boolean(query || role !== "all" || status !== "all");
  const displayUsers = reviewState === "empty" ? [] : filtered;

  function clearFilters() {
    setQuery("");
    setRole("all");
    setStatus("all");
    setReviewState("ready");
  }

  function openAction(user: User) {
    setActiveMenu(null);
    setReason("");
    setModal({ user, action: actionFor(user.status) });
  }

  function confirmAction() {
    if (!modal || (modal.action === "suspend" && !reason.trim())) return;
    const updatedStatus = nextStatus(modal.user.status, modal.action) as UserStatus;
    setUsers((current) => current.map((user) => user.id === modal.user.id ? { ...user, status: updatedStatus } : user));
    const messages: Record<Action, string> = { approve: "Đã duyệt tài khoản", suspend: "Đã khóa tài khoản", activate: "Đã mở khóa tài khoản" };
    setToast(messages[modal.action]);
    setModal(null);
    window.setTimeout(() => setToast(""), 2600);
  }

  return (
    <div className={styles.appShell}>
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}><span className={styles.brandMark}>学</span><span>HSK Platform</span><button className={styles.closeNav} onClick={() => setMobileNav(false)} aria-label="Đóng menu"><X size={20} /></button></div>
        <nav className={styles.nav} aria-label="Điều hướng quản trị">
          <a href="#"><LayoutDashboard size={20} />Tổng quan</a>
          <a className={styles.navActive} href="/admin/users"><Users size={20} />Tài khoản</a>
          <a href="#"><CircleDollarSign size={20} />Học phí</a>
          <a href="#"><WalletCards size={20} />Lương</a>
          <a href="#"><ShieldCheck size={20} />Giám sát</a>
        </nav>
        <div className={styles.sidebarFooter}><BookOpen size={18} /><div><strong>HSK 1–9</strong><span>Nền tảng học tập</span></div></div>
      </aside>
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Mở menu"><Menu size={20} /></button><span>Quản trị</span><ChevronRight size={15} /><strong>Tài khoản</strong></div>
          <div className={styles.headerActions}><button className={styles.iconButton} aria-label="Thông báo"><Bell size={19} /><span className={styles.notificationDot} /></button><div className={styles.headerDivider} /><button className={styles.profileButton}><span className={`${styles.avatar} ${styles.slate}`}>AT</span><span><strong>Anh Tuấn</strong><small>Quản trị viên</small></span><ChevronDown size={16} /></button></div>
        </header>

        <main className={styles.content}>
          <div className={styles.titleRow}><div><p className={styles.eyebrow}>QUẢN TRỊ NGƯỜI DÙNG</p><h1>Tài khoản</h1><p className={styles.subtitle}>Quản lý quyền truy cập và trạng thái tài khoản trên hệ thống.</p></div><span className={styles.resultCount}>{displayUsers.length} tài khoản</span></div>

          <section className={styles.filterCard} aria-label="Bộ lọc tài khoản">
            <label className={styles.searchField}><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc email" /></label>
            <label className={styles.selectField}><span>Vai trò</span><select value={role} onChange={(event) => setRole(event.target.value as UserRole | "all")}><option value="all">Tất cả</option><option value="admin">Admin</option><option value="teacher">Giáo viên</option><option value="student">Học sinh</option></select></label>
            <label className={styles.selectField}><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as UserStatus | "all")}><option value="all">Tất cả</option><option value="pending">Chờ duyệt</option><option value="active">Đang hoạt động</option><option value="suspended">Đã khóa</option></select></label>
            {hasFilters && <button className={styles.clearButton} onClick={clearFilters}><RotateCcw size={16} />Xóa bộ lọc</button>}
          </section>

          {reviewState === "error" && <div className={styles.errorBanner}><AlertCircle size={20} /><div><strong>Không tải được danh sách tài khoản.</strong><span>Vui lòng kiểm tra kết nối và thử lại.</span></div><button onClick={() => setReviewState("ready")}>Thử lại</button></div>}

          <section className={styles.tableCard}>
            {reviewState === "loading" ? <LoadingRows /> : displayUsers.length === 0 ? <EmptyState filtered={hasFilters} onClear={clearFilters} /> : <>
              <div className={styles.tableWrap}><table><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th><button onClick={() => setSort("createdAt")}>Ngày đăng ký <ChevronsUpDown size={14} /></button></th><th><button onClick={() => setSort("lastLoginAt")}>Đăng nhập gần nhất <ChevronsUpDown size={14} /></button></th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{displayUsers.map((user) => <UserRow key={user.id} user={user} active={activeMenu === user.id} onToggle={() => setActiveMenu(activeMenu === user.id ? null : user.id)} onAction={() => openAction(user)} onOpen={() => router.push(`/admin/users/${user.id}`)} />)}</tbody></table></div>
              <div className={styles.mobileList}>{displayUsers.map((user) => <UserCard key={user.id} user={user} onAction={() => openAction(user)} />)}</div>
              <div className={styles.pagination}><span>Hiển thị 1–{displayUsers.length} trong {displayUsers.length}</span><div><button disabled aria-label="Trang trước"><ChevronLeft size={17} /></button><button className={styles.currentPage}>1</button><button disabled aria-label="Trang sau"><ChevronRight size={17} /></button></div></div>
            </>}
          </section>
        </main>
      </div>

      <div className={styles.stateSwitcher}><span>REVIEW STATE</span>{(["ready", "loading", "empty", "error"] as ReviewState[]).map((state) => <button key={state} className={reviewState === state ? styles.stateActive : ""} onClick={() => setReviewState(state)}>{state}</button>)}</div>
      {toast && <div className={styles.toast}><Check size={18} />{toast}</div>}
      {modal && <ActionModal modal={modal} reason={reason} setReason={setReason} onClose={() => setModal(null)} onConfirm={confirmAction} />}
    </div>
  );
}

function UserRow({ user, active, onToggle, onAction, onOpen }: { user: User; active: boolean; onToggle: () => void; onAction: () => void; onOpen: () => void }) {
  return <tr tabIndex={0} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}><td><div className={styles.userCell}><span className={`${styles.avatar} ${styles[user.avatarTone]}`}>{user.initials}</span><span><strong>{user.nickname}</strong><small>{user.email}</small></span></div></td><td>{roleLabels[user.role]}</td><td><StatusPill status={user.status} /></td><td className={styles.numeric}>{formatDate(user.createdAt)}</td><td className={styles.numeric}>{formatDate(user.lastLoginAt, true)}</td><td className={styles.actionCell}><button className={styles.moreButton} onClick={(event) => { event.stopPropagation(); onToggle(); }} aria-label={`Thao tác cho ${user.nickname}`}><MoreHorizontal size={19} /></button>{active && <div className={styles.actionMenu} onClick={(event) => event.stopPropagation()}><button className={user.status === "active" ? styles.dangerAction : ""} onClick={onAction}>{actionLabels[actionFor(user.status)]}</button><button onClick={onOpen}>Xem chi tiết</button></div>}</td></tr>;
}

function UserCard({ user, onAction }: { user: User; onAction: () => void }) {
  return <article className={styles.userCard}><div className={styles.cardHeader}><div className={styles.userCell}><span className={`${styles.avatar} ${styles[user.avatarTone]}`}>{user.initials}</span><span><strong>{user.nickname}</strong><small>{user.email}</small></span></div><StatusPill status={user.status} /></div><dl><div><dt>Vai trò</dt><dd>{roleLabels[user.role]}</dd></div><div><dt>Ngày đăng ký</dt><dd>{formatDate(user.createdAt)}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>{formatDate(user.lastLoginAt, true)}</dd></div></dl><button className={user.status === "active" ? styles.cardDangerButton : styles.cardActionButton} onClick={onAction}>{actionLabels[actionFor(user.status)]}</button></article>;
}

function StatusPill({ status }: { status: UserStatus }) { return <span className={`${styles.statusPill} ${styles[status]}`}><i />{statusLabels[status]}</span>; }

function LoadingRows() { return <div className={styles.loading}><div className={styles.skeletonHeader} />{Array.from({ length: 8 }).map((_, index) => <div className={styles.skeletonRow} key={index}><span /><span /><span /><span /></div>)}</div>; }

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) { return <div className={styles.emptyState}><span className={styles.emptyIcon}><Inbox size={34} /></span><h2>Không có tài khoản nào khớp</h2><p>Thử bỏ bớt bộ lọc để xem thêm kết quả.</p>{filtered && <button onClick={onClear}>Xóa bộ lọc</button>}</div>; }

function ActionModal({ modal, reason, setReason, onClose, onConfirm }: { modal: { user: User; action: Action }; reason: string; setReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const bodies: Record<Action, string> = { approve: `Tài khoản ${modal.user.nickname} sẽ được kích hoạt và có thể đăng nhập ngay.`, suspend: `${modal.user.nickname} sẽ không thể đăng nhập cho đến khi được mở khóa.`, activate: `Tài khoản ${modal.user.nickname} sẽ có thể đăng nhập và sử dụng hệ thống trở lại.` };
  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={onClose}><div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.stopPropagation()}><div className={styles.modalIcon}><UserRound size={22} /></div><h2 id="modal-title">{actionLabels[modal.action]}</h2><p>{bodies[modal.action]}</p>{modal.action === "suspend" && <label className={styles.reasonField}><span>Lý do khóa</span><textarea autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do khóa tài khoản" rows={3} /><small>Bắt buộc</small></label>}<div className={styles.modalActions}><button className={styles.cancelButton} onClick={onClose}>Hủy</button><button className={modal.action === "suspend" ? styles.dangerButton : styles.primaryButton} disabled={modal.action === "suspend" && !reason.trim()} onClick={onConfirm}>{actionLabels[modal.action]}</button></div></div></div>;
}
