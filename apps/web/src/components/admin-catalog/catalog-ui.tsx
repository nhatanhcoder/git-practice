"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, CircleDollarSign, LayoutDashboard, Menu, ShieldCheck, Users, WalletCards, X } from "lucide-react";
import { SessionChip } from "@/components/auth/session-chip";
import { useOverlay } from "@/hooks/use-overlay";
import { getStatusColor } from "@/lib/status";
import { catalogLabels, catalogError, type CatalogStatus } from "@/lib/admin-learning-catalog-service";
import shell from "@/app/admin/users/users.module.css";
import styles from "./catalog.module.css";

const navigation = [
  ["/admin", "Tổng quan", LayoutDashboard], ["/admin/users", "Tài khoản", Users],
  ["/admin/learning-paths", "Lộ trình học", BookOpen], ["/admin/invoices", "Học phí", CircleDollarSign],
  ["/admin/payroll", "Lương", WalletCards], ["/admin/monitoring", "Giám sát", ShieldCheck],
] as const;

export function CatalogShell({ children, detail = false }: { children: ReactNode; detail?: boolean }) {
  const [open, setOpen] = useState(false);
  const drawer = useOverlay<HTMLElement>(() => setOpen(false), open);
  return <div className={shell.appShell}>
    {open && <button className={shell.navBackdrop} onClick={() => setOpen(false)} aria-label="Đóng menu" />}
    <aside ref={drawer} className={`${shell.sidebar} ${open ? shell.sidebarOpen : ""}`} role={open ? "dialog" : undefined} aria-modal={open || undefined} aria-label="Điều hướng quản trị">
      <div className={shell.brand}><span className={shell.brandMark}>学</span>HSK Platform<button className={shell.closeNav} onClick={() => setOpen(false)} aria-label="Đóng menu"><X size={20} /></button></div>
      <nav className={shell.nav}>{navigation.map(([href, label, Icon]) => <Link key={href} href={href} className={`${shell.navItem} ${href === "/admin/learning-paths" ? shell.navActive : ""}`} aria-current={href === "/admin/learning-paths" ? "page" : undefined}><Icon size={20} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
      <div className={shell.sidebarFooter}><BookOpen size={18} aria-hidden="true" /><div><strong>HSK 1–9</strong><span>Nền tảng học tập</span></div></div>
    </aside>
    <div className={shell.mainColumn}>
      <header className={shell.topbar}><div className={shell.breadcrumb}><button className={shell.menuButton} onClick={() => setOpen(true)} aria-label="Mở menu"><Menu size={20} /></button><Link href="/admin">Quản trị</Link><ChevronRight size={14} aria-hidden="true" />{detail ? <Link href="/admin/learning-paths">Lộ trình học</Link> : <strong>Lộ trình học</strong>}</div><SessionChip classNames={{ button: shell.profileButton, avatar: shell.headerAvatar, text: shell.profileText }} /></header>
      <main className={styles.content}>{children}</main>
    </div>
  </div>;
}

export function CatalogBadge({ status }: { status: CatalogStatus }) {
  const theme = getStatusColor(status === "pending_review" ? "pending" : status);
  return <span className={styles.badge} style={{ backgroundColor: theme.bg, color: theme.text }}>{catalogLabels[status]}</span>;
}

export function CatalogSkeleton() {
  return <div className={styles.skeleton} role="status" aria-label="Đang tải nội dung">{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>;
}

export function CatalogDialog({ title, description, label, reject = false, onClose, onConfirm }: {
  title: string; description: string; label: string; reject?: boolean;
  onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const close = () => { if (!inFlight.current) onClose(); };
  const panel = useOverlay<HTMLDivElement>(close);
  const valid = !reject || (reason.trim().length >= 10 && reason.trim().length <= 2000);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (inFlight.current || !valid) return;
    inFlight.current = true;
    setBusy(true); setError("");
    try { await onConfirm(reason.trim()); }
    catch (err) { setError(catalogError(err)); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className={styles.dialog} ref={panel}>
      <h2>{title}</h2><p>{description}</p>
      <form onSubmit={(event) => void submit(event)}>
        {reject && <label className={styles.field}><span id="reject-label">Lý do từ chối</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={5} required disabled={busy} aria-labelledby="reject-label" aria-describedby="reject-help" /><small id="reject-help">Giáo viên sẽ thấy lý do này và có thể sửa rồi gửi lại. Cần 10–2000 ký tự ({reason.trim().length}/2000).</small></label>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.actions}><button type="button" onClick={close} disabled={busy}>Hủy</button><button className={styles.primary} type="submit" disabled={!valid || busy}>{busy ? "Đang xử lý…" : label}</button></div>
      </form>
    </div>
  </div>;
}
