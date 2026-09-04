"use client";

// Live data. F1.3 approve / suspend / activate go to the real API and the row is
// replaced with what the server returned. No offline fallback: see admin-users-service.

import {
  AlertCircle, Bell, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsUpDown, CircleDollarSign, Inbox, LayoutDashboard, Menu,
  MoreHorizontal, RotateCcw, Search, ShieldCheck, Users, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { avatarToneFor, formatDate, formatDateTime, initialsOf } from "../../../lib/formatters";
import { getStatusColor } from "../../../lib/status";
import { nextStatus } from "../../../lib/user-status.js";
import {
  activateUser, approveUser, fetchAdminUsers, suspendUser,
} from "../../../lib/admin-users-service";
import { ApiError } from "../../../lib/api-client";
import styles from "./users.module.css";

type UserStatus = "pending" | "active" | "suspended";
type UserRole = "admin" | "teacher" | "student";
type Action = "approve" | "suspend" | "activate";
type ReviewState = "ready" | "loading" | "empty" | "partial" | "error" | "forbidden";
type User = { id: string; nickname: string; email: string; role: UserRole; status: UserStatus; createdAt: string; lastLoginAt: string | null };


const roleLabels: Record<UserRole, string> = { admin: "Admin", teacher: "Giáo viên", student: "Học sinh" };
const statusLabels: Record<UserStatus, string> = { pending: "Chờ duyệt", active: "Đang hoạt động", suspended: "Đã khóa" };
const actionLabels: Record<Action, string> = { approve: "Duyệt tài khoản", suspend: "Khóa tài khoản", activate: "Mở khóa" };
const actionFor = (status: UserStatus): Action => status === "pending" ? "approve" : status === "active" ? "suspend" : "activate";

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");
  const [status, setStatus] = useState<UserStatus | "all">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [modal, setModal] = useState<{ user: User; action: Action } | null>(null);
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const [sort, setSort] = useState<"createdAt" | "lastLoginAt">("createdAt");

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);

    fetchAdminUsers({ q: query, role, status, sortBy: sort })
      .then((res) => {
        if (!isMounted) return;
        setUsers(res.users as User[]);
        setReviewState(res.users.length === 0 ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        // The previous version swallowed this entirely (`.catch(() => {})`), so a
        // 401 left the hardcoded mock array on screen and the page looked healthy
        // while being disconnected. Every failure now reaches the user.
        setUsers([]);
        if (err instanceof ApiError && err.isForbidden) {
          setReviewState("forbidden");
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
  }, [query, role, status, sort, reloadKey]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return users
      .filter((user) => role === "all" || user.role === role)
      .filter((user) => status === "all" || user.status === status)
      .filter((user) => !normalized || (user.nickname + " " + user.email).toLocaleLowerCase("vi").includes(normalized))
      .sort((a, b) => (b[sort] ?? "").localeCompare(a[sort] ?? ""));
  }, [query, role, sort, status, users]);

  const hasFilters = Boolean(query || role !== "all" || status !== "all");
  const displayUsers = reviewState === "empty" ? [] : filteredUsers;

  function clearFilters() {
    setQuery(""); setRole("all"); setStatus("all"); setReloadKey((k) => k + 1);
  }

  function openAction(user: User) {
    setActiveMenu(null); setReason(""); setModal({ user, action: actionFor(user.status) });
  }

  async function confirmAction() {
    if (!modal || (modal.action === "suspend" && !reason.trim())) return;

    // nextStatus() still runs, but only as a client-side guard against offering an
    // impossible transition. The status actually rendered comes from the server's
    // response — assuming the transition succeeded is how a rejected change still
    // shows as done.
    if (!nextStatus(modal.user.status, modal.action)) return;

    const targetId = modal.user.id;
    setBusyId(targetId);
    try {
      const call = { approve: approveUser, suspend: suspendUser, activate: activateUser }[modal.action];
      const updated = await call(targetId);
      setUsers((current) =>
        current.map((user) =>
          user.id === targetId ? { ...user, status: updated.status as UserStatus } : user,
        ),
      );
      setToast({ approve: "Đã duyệt tài khoản", suspend: "Đã khóa tài khoản", activate: "Đã mở khóa tài khoản" }[modal.action]);
    } catch (err) {
      setToast(err instanceof ApiError ? `Thất bại: ${err.message}` : "Thất bại: không kết nối được máy chủ");
      setBusyId(null);
      return;
    }
    setBusyId(null);
    setModal(null);
    window.setTimeout(() => setToast(""), 2600);
  }

  function changeReviewState(state: ReviewState) {
    setReviewState(state);
    if (state === "forbidden") setToast("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
  }

  return (
    <div className={styles.appShell}>
      <AdminSidebar open={mobileNav} close={() => setMobileNav(false)} />
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}
      <div className={styles.mainColumn}>
        <AdminHeader openMenu={() => setMobileNav(true)} />
        <main className={styles.content}>
          <header className={styles.titleRow}>
            <div><p className={styles.eyebrow}>QUẢN TRỊ NGƯỜI DÙNG</p><h1>Tài khoản</h1><p className={styles.subtitle}>Quản lý quyền truy cập và trạng thái tài khoản trên hệ thống.</p></div>
            <div className={styles.titleActions}>
              <Link className={styles.secondaryButton} href="/admin/invoices"><CircleDollarSign size={16} /><span>Học phí</span></Link>
              <Link className={styles.secondaryButton} href="/admin/payroll"><WalletCards size={16} /><span>Lương GV</span></Link>
            </div>
          </header>

          <section className={styles.filterCard} aria-label="Bộ lọc tài khoản">
            <label className={styles.searchBox}><span className={styles.fieldLabel}>Tìm kiếm</span><span className={styles.inputControl}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên hoặc email" /></span></label>
            <label className={styles.selectField}><span className={styles.fieldLabel}>Vai trò</span><select value={role} onChange={(event) => setRole(event.target.value as UserRole | "all")}><option value="all">Tất cả</option><option value="admin">Admin</option><option value="teacher">Giáo viên</option><option value="student">Học sinh</option></select></label>
            <label className={styles.selectField}><span className={styles.fieldLabel}>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value as UserStatus | "all")}><option value="all">Tất cả</option><option value="pending">Chờ duyệt</option><option value="active">Đang hoạt động</option><option value="suspended">Đã khóa</option></select></label>
            <div className={styles.filterMeta}>{hasFilters && <button className={styles.clearButton} onClick={clearFilters}><RotateCcw size={15} />Xóa lọc</button>}<span>{displayUsers.length} tài khoản</span></div>
          </section>

          {reviewState === "error" && <div className={styles.errorBanner} role="alert"><AlertCircle size={19} /><div><strong>Không tải được danh sách tài khoản.</strong><span>{loadError}</span></div><button onClick={() => setReloadKey((k) => k + 1)}>Thử lại</button></div>}
          {reviewState === "forbidden" && <div className={styles.errorBanner} role="alert"><AlertCircle size={19} /><div><strong>Không đủ quyền xem danh sách tài khoản.</strong><span>Tài khoản đang đăng nhập không phải quản trị viên.</span></div></div>}

          <section className={styles.tableCard} aria-label="Danh sách tài khoản">
            {reviewState === "loading" ? <LoadingRows /> : displayUsers.length === 0 ? <EmptyState filtered={hasFilters} onClear={clearFilters} /> : <>
              <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Người dùng</th><th>Vai trò</th><th>Trạng thái</th><th><button onClick={() => setSort("createdAt")}>Ngày đăng ký <ChevronsUpDown size={14} /></button></th><th><button onClick={() => setSort("lastLoginAt")}>Đăng nhập gần nhất <ChevronsUpDown size={14} /></button></th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{displayUsers.map((user) => <UserRow key={user.id} user={user} active={activeMenu === user.id} onToggle={() => setActiveMenu(activeMenu === user.id ? null : user.id)} onAction={() => openAction(user)} onOpen={() => router.push("/admin/users/" + user.id)} onNavigate={(path) => router.push(path)} />)}</tbody></table></div>
              <div className={styles.mobileList}>{displayUsers.map((user) => <UserCard key={user.id} user={user} onAction={() => openAction(user)} onOpen={() => router.push("/admin/users/" + user.id)} />)}</div>
              {reviewState === "partial" && <div className={styles.partialNotice}>Một số hồ sơ chưa tải đủ dữ liệu đăng nhập gần nhất.</div>}
              <footer className={styles.pagination}><span>Hiển thị 1–{displayUsers.length} trong {displayUsers.length}</span><div><button disabled aria-label="Trang trước"><ChevronLeft size={17} /></button><button className={styles.currentPage}>1</button><button disabled aria-label="Trang sau"><ChevronRight size={17} /></button></div></footer>
            </>}
          </section>
        </main>
      </div>
      {process.env.NODE_ENV !== "production" && <ReviewSwitcher value={reviewState} onChange={changeReviewState} />}
      {toast && <div className={styles.toast}><Check size={18} /><span>{toast}</span></div>}
      {modal && <ActionModal modal={modal} reason={reason} setReason={setReason} onClose={() => setModal(null)} onConfirm={confirmAction} />}
    </div>
  );
}

function AdminSidebar({ open, close }: { open: boolean; close: () => void }) {
  return <aside className={styles.sidebar + (open ? " " + styles.sidebarOpen : "")}><div className={styles.brand}><span className={styles.brandMark}>学</span><span>HSK Platform</span><button className={styles.closeNav} onClick={close} aria-label="Đóng menu"><X size={20} /></button></div><nav className={styles.nav} aria-label="Điều hướng quản trị"><Link className={styles.navItem} href="/admin"><LayoutDashboard size={20} /><span>Tổng quan</span></Link><Link className={styles.navItem + " " + styles.navActive} href="/admin/users"><Users size={20} /><span>Tài khoản</span></Link><Link className={styles.navItem} href="/admin/invoices"><CircleDollarSign size={20} /><span>Học phí</span></Link><Link className={styles.navItem} href="/admin/payroll"><WalletCards size={20} /><span>Lương</span></Link><Link className={styles.navItem} href="/admin/monitoring"><ShieldCheck size={20} /><span>Giám sát</span></Link></nav><div className={styles.sidebarFooter}><BookOpen size={18} /><div><strong>HSK 1–9</strong><span>Nền tảng học tập</span></div></div></aside>;
}

function AdminHeader({ openMenu }: { openMenu: () => void }) {
  return <header className={styles.topbar}><div className={styles.breadcrumb}><button className={styles.menuButton} onClick={openMenu} aria-label="Mở menu"><Menu size={20} /></button><Link href="/admin">Quản trị</Link><ChevronRight size={14} /><strong>Tài khoản</strong></div><div className={styles.headerActions}><button className={styles.iconButton} aria-label="Thông báo"><Bell size={19} /><span className={styles.notificationDot} /></button><div className={styles.headerDivider} /><Link className={styles.profileButton} href="/admin/profile"><span className={styles.headerAvatar}>AT</span><span className={styles.profileText}><strong>Anh Tuấn</strong><small>Quản trị viên</small></span><ChevronDown size={15} /></Link></div></header>;
}

function StatusPill({ status }: { status: UserStatus }) {
  const theme = getStatusColor(status);
  return <span className={styles.statusPill} style={{ backgroundColor: theme.bg, color: theme.text }}><i />{statusLabels[status]}</span>;
}

function UserIdentity({ user }: { user: User }) {
  const tone = avatarToneFor(user.nickname);
  return <div className={styles.userCell}><span className={styles.userAvatar} style={{ backgroundColor: tone.bg, color: tone.text }}>{initialsOf(user.nickname)}</span><span><strong>{user.nickname}</strong><small>{user.email}</small></span></div>;
}

function UserRow({ user, active, onToggle, onAction, onOpen, onNavigate }: { user: User; active: boolean; onToggle: () => void; onAction: () => void; onOpen: () => void; onNavigate: (path: string) => void }) {
  return <tr tabIndex={0} onClick={onOpen} onKeyDown={(event) => event.key === "Enter" && onOpen()}><td><UserIdentity user={user} /></td><td>{roleLabels[user.role]}</td><td><StatusPill status={user.status} /></td><td className={styles.numeric}>{formatDate(user.createdAt)}</td><td className={styles.numeric}>{formatDateTime(user.lastLoginAt)}</td><td className={styles.actionCell}><button className={styles.moreButton} onClick={(event) => { event.stopPropagation(); onToggle(); }} aria-label={"Thao tác cho " + user.nickname}><MoreHorizontal size={19} /></button>{active && <div className={styles.actionMenu} onClick={(event) => event.stopPropagation()}><button onClick={onOpen}>Xem chi tiết</button>{user.role === "student" && <><button onClick={() => onNavigate("/admin/invoices")}>Hóa đơn học phí</button><button onClick={() => onNavigate("/admin/tuition-rates")}>Mức học phí</button></>}{user.role === "teacher" && <><button onClick={() => onNavigate("/admin/payroll")}>Kỳ lương</button><button onClick={() => onNavigate("/admin/payroll/sessions")}>Duyệt buổi học</button><button onClick={() => onNavigate("/admin/pay-rates")}>Mức lương GV</button></>}<button className={user.status === "active" ? styles.dangerAction : ""} onClick={onAction}>{actionLabels[actionFor(user.status)]}</button></div>}</td></tr>;
}

function UserCard({ user, onAction, onOpen }: { user: User; onAction: () => void; onOpen: () => void }) {
  return <article className={styles.userCard}><div className={styles.cardHeader}><UserIdentity user={user} /><StatusPill status={user.status} /></div><dl><div><dt>Vai trò</dt><dd>{roleLabels[user.role]}</dd></div><div><dt>Ngày đăng ký</dt><dd>{formatDate(user.createdAt)}</dd></div><div><dt>Đăng nhập gần nhất</dt><dd>{formatDateTime(user.lastLoginAt)}</dd></div></dl><div className={styles.cardActions}><button className={styles.cardActionButton} onClick={onOpen}>Xem chi tiết</button><button className={user.status === "active" ? styles.cardDangerButton : styles.cardActionButton} onClick={onAction}>{actionLabels[actionFor(user.status)]}</button></div></article>;
}

function LoadingRows() {
  return <div className={styles.loading} aria-label="Đang tải">{[1, 2, 3, 4, 5].map((row) => <div className={styles.skeletonRow} key={row}><span /><span /><span /><span /></div>)}</div>;
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return <div className={styles.emptyState}><Inbox size={38} /><h2>{filtered ? "Không tìm thấy tài khoản phù hợp" : "Chưa có tài khoản nào"}</h2><p>{filtered ? "Thử thay đổi từ khóa hoặc bộ lọc hiện tại." : "Tài khoản mới sẽ xuất hiện tại đây sau khi đăng ký."}</p>{filtered && <button onClick={onClear}>Xóa bộ lọc</button>}</div>;
}

function ReviewSwitcher({ value, onChange }: { value: ReviewState; onChange: (state: ReviewState) => void }) {
  const states: ReviewState[] = ["ready", "loading", "empty", "partial", "error", "forbidden"];
  return <aside className={styles.stateSwitcher} aria-label="Review State Switcher"><span>REVIEW STATE</span>{states.map((state) => <button key={state} className={value === state ? styles.stateActive : ""} onClick={() => onChange(state)}>{state}</button>)}</aside>;
}

function ActionModal({ modal, reason, setReason, onClose, onConfirm }: { modal: { user: User; action: Action }; reason: string; setReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const destructive = modal.action === "suspend";
  return <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="user-action-title"><div className={styles.modal}><div className={destructive ? styles.modalIconDanger : styles.modalIcon}><ShieldCheck size={21} /></div><h2 id="user-action-title">{actionLabels[modal.action]}</h2><p>{destructive ? "Tài khoản " + modal.user.nickname + " sẽ không thể đăng nhập cho đến khi được mở khóa." : "Xác nhận thay đổi trạng thái tài khoản của " + modal.user.nickname + "."}</p>{destructive && <label className={styles.reasonField}><span>Lý do khóa *</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} /><small>{reason.length}/200</small></label>}<div className={styles.modalActions}><button className={styles.cancelButton} onClick={onClose}>Hủy</button><button className={destructive ? styles.dangerButton : styles.primaryButton} onClick={onConfirm} disabled={destructive && !reason.trim()}>{actionLabels[modal.action]}</button></div></div></div>;
}
