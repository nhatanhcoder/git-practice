"use client";

/**
 * Toast — one context, one live region, max three at a time.
 *
 * Rendered inside `.student-root` (not portalled to body) so the theme tokens
 * apply. `role="status"` + `aria-live="polite"` means a screen reader announces
 * the XP award without stealing focus from whatever the learner was doing.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Sparkles, CircleCheck, TriangleAlert, Zap } from "lucide-react";

type ToastTone = "info" | "success" | "warn" | "danger";

interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
}

const ToastCtx = createContext<(text: string, tone?: ToastTone) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

const ICONS: Record<ToastTone, ReactNode> = {
  info: <Sparkles size={16} />,
  success: <CircleCheck size={16} />,
  warn: <Zap size={16} />,
  danger: <TriangleAlert size={16} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const push = useCallback((text: string, tone: ToastTone = "info") => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-layer" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <span className="toast__icon">{ICONS[t.tone]}</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
