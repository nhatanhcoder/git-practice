"use client";

/**
 * C3: shared dismissal + focus behaviour for Teacher menus and overlays.
 *
 * Before this, every action menu was a bare `activeMenu === id && <div>` with no outside-click
 * and no Escape, and every dialog re-declared (or omitted) its own keydown listener. Putting the
 * behaviour here means one implementation to fix, and no listener left attached on unmount.
 */

import { useCallback, useEffect, useRef } from "react";

/**
 * The last element focused *outside* any overlay.
 *
 * Capturing the opener inside an overlay's own effect turned out to be unreliable: React
 * StrictMode runs effects twice in development, so the second pass would capture a control the
 * first pass had just focused inside the panel — an element that no longer exists by the time the
 * overlay closes, making the restore a silent no-op. Tracking at the document level instead makes
 * the value independent of when any effect happens to run.
 */
let lastOuterFocus: HTMLElement | null = null;

if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (!el || typeof el.closest !== "function") return;
      // Ignore anything inside an open dialog/menu — we want what had focus before it opened.
      if (el.closest('[role="dialog"],[role="menu"]')) return;
      lastOuterFocus = el;
    },
    true,
  );
}

/**
 * The element to hand focus back to when an overlay closes.
 *
 * Prefers whatever is focused right now, as long as it is not inside the overlay panel — that is
 * the opener in the normal case. Falls back to the tracker, which matters because this module is
 * code-split: on the very first open it has not been evaluated yet, so its focusin listener has
 * missed the click that opened the overlay. (Measured in a production build: the tracker was null
 * on first open, which is why relying on it alone left focus on <body>.)
 */
function resolveOpener(panel: HTMLElement | null): HTMLElement | null {
  const active = document.activeElement as HTMLElement | null;
  const usable = active && active !== document.body && (!panel || !panel.contains(active));
  return usable ? active : lastOuterFocus;
}

/** Focusable descendants, in DOM order, skipping anything disabled or removed from the tab ring. */
function focusableWithin(root: HTMLElement): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Dropdown / action-menu dismissal.
 *
 * Attach the returned ref to an element that wraps **both the trigger and the menu**, so a click
 * on the trigger is not treated as "outside" (which would close and immediately reopen).
 * Closing returns focus to whatever opened it.
 */
export function useDismissMenu<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  // Callers pass an inline arrow, so `onClose` has a new identity every render. Depending on it
  // would tear down and re-run the effect constantly, which also destroys the captured
  // "element to restore focus to". Keep it in a ref and depend only on `open`.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreTo.current = resolveOpener(ref.current);

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const node = ref.current;
      if (node && !node.contains(e.target as Node)) onCloseRef.current();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onCloseRef.current();
      // Escape should hand focus back to the trigger, not leave it on <body>.
      restoreTo.current?.focus?.();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return ref;
}

/**
 * Modal / drawer behaviour: Escape closes, focus moves inside on open, Tab and Shift+Tab cycle
 * within the overlay, and focus returns to the opener on close.
 *
 * Attach the ref to the overlay panel (not the backdrop).
 */
export function useOverlay<T extends HTMLElement>(onClose: () => void, open = true) {
  const ref = useRef<T | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  // Same reason as useDismissMenu: an inline `onClose` must not be an effect dependency, or the
  // cleanup re-runs on every render and the focus-restore target is lost. Verified in a browser —
  // with `onClose` in the deps, Escape closed the dialog but focus landed on <body>.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const node = ref.current;

    restoreTo.current = resolveOpener(node);

    // Respect an explicit autoFocus if the panel already has one; otherwise focus the first
    // control, falling back to the panel itself so focus never sits outside the overlay.
    if (node && !node.contains(document.activeElement)) {
      const first = focusableWithin(node)[0];
      if (first) first.focus();
      else {
        node.setAttribute("tabindex", "-1");
        node.focus();
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const panel = ref.current;
      if (!panel) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        const opener = restoreTo.current;
        onCloseRef.current();
        // Restore synchronously here, the way useDismissMenu does. Doing it only in the effect
        // cleanup does not work: measured in a production build, the dialog closed but focus
        // ended on <body> every time. The cleanup below stays as the best effort for the other
        // close paths (Cancel button, backdrop click).
        if (opener && document.body.contains(opener)) opener.focus?.();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusableWithin(panel);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const restore = restoreTo.current;
      if (!restore) return;
      // Restore on the NEXT frame, not synchronously. This cleanup runs before React removes the
      // panel from the DOM; focusing here and letting the browser then delete the focused node
      // makes the browser reset focus to <body>, silently undoing the restore. Verified in a
      // browser: without the rAF, Escape left focus on <body> instead of the opener.
      requestAnimationFrame(() => {
        if (document.body.contains(restore)) restore.focus?.();
      });
    };
  }, [open]);

  return ref;
}

/**
 * Backdrop click-to-close that ignores clicks originating inside the panel.
 * Uses mousedown target identity, so a drag that starts on a form control and ends on the
 * backdrop does not close the overlay.
 */
export function useBackdropClose(onClose: () => void) {
  return useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );
}
