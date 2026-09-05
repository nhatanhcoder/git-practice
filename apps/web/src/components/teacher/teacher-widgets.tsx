"use client";

// Shared Teacher widgets — mock-backed, per the Teacher Page Contracts (2026-09-01).

import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Check, Copy, X } from "lucide-react";
import { useBackdropClose, useOverlay } from "@/hooks/use-overlay";
import { getStatusColor } from "@/lib/status";
import styles from "./teacher-widgets.module.css";

export type ReviewState = "ready" | "loading" | "empty" | "partial" | "error" | "forbidden";

export function ReviewSwitcher({
  value,
  onChange,
}: {
  value: ReviewState;
  onChange: (state: ReviewState) => void;
}) {
  // WEB-004: design-review scaffolding. It must never reach a real user — over
  // live data it lets a failed load be repainted as a healthy one.
  if (process.env.NODE_ENV === "production") return null;
  const states: ReviewState[] = ["ready", "loading", "empty", "partial", "error", "forbidden"];
  return (
    <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
      <span>REVIEW STATE</span>
      {states.map((state) => (
        <button key={state} className={value === state ? styles.stateActive : ""} onClick={() => onChange(state)}>
          {state}
        </button>
      ))}
    </aside>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const theme = getStatusColor(status);
  return (
    <span className={styles.statusPill} style={{ backgroundColor: theme.bg, color: theme.text }}>
      <i />
      {label}
    </span>
  );
}

export function CopyChip({ value }: { value: string }) {
  // C2: this used to just setCopied(true) — it reported success without ever touching the
  // clipboard, so a blocked or unavailable Clipboard API still showed "Đã sao chép".
  const [state, setState] = useState<"idle" | "copying" | "done" | "error">("idle");

  useEffect(() => {
    if (state !== "done" && state !== "error") return;
    const t = setTimeout(() => setState("idle"), state === "done" ? 1600 : 3200);
    return () => clearTimeout(t);
  }, [state]);

  async function handleCopy() {
    if (state === "copying") return; // ignore repeat clicks mid-write
    setState("copying");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      // No fake fallback: if the write did not happen, do not claim it did.
      setState("error");
    }
  }

  const done = state === "done";
  const failed = state === "error";
  const label = done
    ? "Đã sao chép mã " + value
    : failed
      ? "Không sao chép được mã " + value + ". Hãy chọn và sao chép thủ công."
      : "Sao chép mã " + value;

  return (
    <>
      <button
        type="button"
        className={styles.copyChip + (done ? " " + styles.copyChipDone : "") + (failed ? " " + styles.copyChipError : "")}
        onClick={handleCopy}
        disabled={state === "copying"}
        title={done ? "Đã sao chép" : failed ? "Không sao chép được" : "Sao chép mã"}
        aria-label={label}
      >
        <code>{value}</code>
        {done ? <Check size={14} /> : failed ? <AlertCircle size={14} /> : <Copy size={14} />}
      </button>
      {/* Announced to screen readers on both outcomes. */}
      <span role="status" aria-live="polite" className={styles.srOnly}>
        {done ? "Đã sao chép mã " + value : failed ? "Không sao chép được mã. Hãy sao chép thủ công." : ""}
      </span>
    </>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div className={styles.toast} role="status">
      <Check size={18} />
      <span>{message}</span>
    </div>
  );
}

/**
 * C3: shared wrapper for page-local modals and drawers.
 *
 * Every Teacher page had its own hand-rolled `<div className={backdrop} role="dialog">` with no
 * Escape, no focus trap and no focus restore. This keeps the page's own CSS classes — it is not
 * a redesign — while routing the behaviour through one implementation.
 *
 * `panelClassName` is the page's existing panel class; `children` is the panel's contents.
 */
export function Overlay({
  label,
  onClose,
  backdropClassName,
  panelClassName,
  closeOnBackdrop = true,
  children,
}: {
  label: string;
  onClose: () => void;
  backdropClassName: string;
  panelClassName: string;
  closeOnBackdrop?: boolean;
  children: ReactNode;
}) {
  const panelRef = useOverlay<HTMLDivElement>(onClose);
  const onBackdrop = useBackdropClose(onClose);
  return (
    <div
      className={backdropClassName}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={closeOnBackdrop ? onBackdrop : undefined}
    >
      <div ref={panelRef} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}

function ModalFrame({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  // C3: Escape + focus trap + focus restore now come from the shared hook, replacing the
  // Escape-only listener this component used to declare inline.
  const panelRef = useOverlay<HTMLDivElement>(onClose);
  const onBackdrop = useBackdropClose(onClose);
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={title} onMouseDown={onBackdrop}>
      <div ref={panelRef} className={styles.modal + (wide ? " " + styles.modalWide : "")}>
        <div className={styles.modalHead}>
          <h2>{title}</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CreateClassModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string, hskLevel: number, description: string) => void;
}) {
  const [name, setName] = useState("");
  const [hskLevel, setHskLevel] = useState(1);
  const [description, setDescription] = useState("");
  const valid = name.trim().length >= 3;
  return (
    <ModalFrame title="Tạo lớp mới" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onCreate(name.trim(), hskLevel, description.trim());
        }}
      >
        <label className={styles.field}>
          <span>Tên lớp *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Sơ cấp A — Thứ 3/5/7"
            autoFocus
            required
            minLength={3}
          />
        </label>
        <label className={styles.field}>
          <span>Cấp HSK *</span>
          <select value={hskLevel} onChange={(e) => setHskLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>
                HSK {l}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Mô tả</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Lịch học, mục tiêu lớp…"
          />
        </label>
        <p className={styles.hint}>Mã ghi danh 8 ký tự sẽ được tạo tự động sau khi lưu.</p>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={styles.primaryButton} disabled={!valid}>
            Tạo lớp
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function EditClassModal({
  initialName,
  initialLevel,
  initialDescription,
  onClose,
  onSave,
}: {
  initialName: string;
  initialLevel: number;
  initialDescription: string;
  onClose: () => void;
  onSave: (name: string, hskLevel: number, description: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [hskLevel, setHskLevel] = useState(initialLevel);
  const [description, setDescription] = useState(initialDescription);
  const valid = name.trim().length >= 3;
  return (
    <ModalFrame title="Sửa thông tin lớp" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave(name.trim(), hskLevel, description.trim());
        }}
      >
        <label className={styles.field}>
          <span>Tên lớp *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required minLength={3} />
        </label>
        <label className={styles.field}>
          <span>Cấp HSK *</span>
          <select value={hskLevel} onChange={(e) => setHskLevel(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>
                HSK {l}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Mô tả</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </label>
        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={styles.primaryButton} disabled={!valid}>
            Lưu thay đổi
          </button>
        </div>
      </form>
    </ModalFrame>
  );
}

export function ConfirmModal({
  title,
  description,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  return (
    <ModalFrame title={title} onClose={onClose}>
      <p className={styles.confirmText}>{description}</p>
      {children}
      <div className={styles.modalActions}>
        <button type="button" className={styles.cancelButton} onClick={onClose}>
          Hủy
        </button>
        <button type="button" className={danger ? styles.dangerButton : styles.primaryButton} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </ModalFrame>
  );
}
