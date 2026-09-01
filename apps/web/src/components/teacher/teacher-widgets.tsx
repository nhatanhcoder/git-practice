"use client";

// Shared Teacher widgets — mock-backed, per the Teacher Page Contracts (2026-09-01).

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      className={styles.copyChip + (copied ? " " + styles.copyChipDone : "")}
      onClick={() => setCopied(true)}
      title={copied ? "Đã sao chép" : "Sao chép mã"}
      aria-label={copied ? "Đã sao chép mã " + value : "Sao chép mã " + value}
    >
      <code>{value}</code>
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modal + (wide ? " " + styles.modalWide : "")}>
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
