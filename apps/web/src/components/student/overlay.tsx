"use client";

/**
 * Student overlays — Drawer, Modal, Sheet.
 *
 * Focus behaviour comes from the **existing shared hook**, `@/hooks/use-overlay`,
 * not from a second copy ported out of the prototype. That hook was written for
 * WEB-006/WEB-007 and already carries two fixes the prototype's version does not:
 * an inline `onClose` kept in a ref (so the effect does not tear down every
 * render and lose the focus-restore target) and a restore on the next frame
 * (a synchronous restore in cleanup lands focus on <body>, measured in a
 * production build). Reusing it means one implementation to fix.
 *
 * What is added here on top: body scroll lock while an overlay is open.
 *
 * These render inside `.student-root` rather than portalling to document.body,
 * so the theme tokens reach them. `position: fixed` still escapes the layout —
 * no ancestor in the shell creates a containing block.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import { useBackdropClose, useOverlay } from "@/hooks/use-overlay";

/** Freeze background scrolling for as long as any overlay is mounted. */
function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}

/* ---------------- Drawer ---------------- */

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  eyebrow,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useOverlay<HTMLDivElement>(onClose, open);
  const onBackdrop = useBackdropClose(onClose);
  const titleId = useId();
  useScrollLock(open);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onBackdrop} aria-hidden="true" />
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
      >
        <div className="grabber" aria-hidden="true" />
        <header className="drawer__head">
          <div className="grow stack gap-1">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h2 id={titleId} style={{ fontSize: "var(--step-2)" }}>
              {title}
            </h2>
            {subtitle ? (
              <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Đóng bảng chi tiết"
          >
            <X size={18} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
        {footer ? <div className="drawer__foot">{footer}</div> : null}
      </div>
    </>
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useOverlay<HTMLDivElement>(onClose, open);
  const onBackdrop = useBackdropClose(onClose);
  const titleId = useId();
  useScrollLock(open);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onBackdrop} aria-hidden="true" />
      <div className="modal-wrap">
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={ref}
          tabIndex={-1}
        >
          <div className="grabber" aria-hidden="true" />
          <header className="panel__head">
            <div className="grow stack gap-1">
              <h2 id={titleId} style={{ fontSize: "var(--step-2)" }}>
                {title}
              </h2>
              {subtitle ? (
                <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>{subtitle}</p>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </header>
          <div className="modal__body">{children}</div>
          {footer ? <div className="panel__foot row gap-3">{footer}</div> : null}
        </div>
      </div>
    </>
  );
}

/* ---------------- Bottom sheet ---------------- */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useOverlay<HTMLDivElement>(onClose, open);
  const onBackdrop = useBackdropClose(onClose);
  const titleId = useId();
  useScrollLock(open);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={onBackdrop} aria-hidden="true" />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
      >
        <div className="grabber" aria-hidden="true" />
        <div className="row gap-3" style={{ padding: "var(--sp-4) 0 0" }}>
          <h2 id={titleId} className="grow" style={{ fontSize: "var(--step-1)" }}>
            {title}
          </h2>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            onClick={onClose}
            aria-label="Đóng menu"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
