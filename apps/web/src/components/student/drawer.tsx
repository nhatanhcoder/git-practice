"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Đóng khung chi tiết"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35 backdrop-blur-[2px]"
      />
      <div
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full flex-col bg-sp-card shadow-sp",
          wide ? "sm:w-[480px]" : "sm:w-[420px]",
        )}
      >
        <div className="flex items-center justify-between border-b border-sp-line px-5 py-4">
          <h2 className="sp-font-head text-base font-extrabold text-sp-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="sp-press flex h-9 w-9 items-center justify-center rounded-xl text-sp-ink2 hover:bg-sp-locked-soft"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sp-scroll flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-sp-line px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
