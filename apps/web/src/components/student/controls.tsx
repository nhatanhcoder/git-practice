"use client";

/**
 * Student controls — Tabs, Segmented, the HSK 1–9 level selector, the audio
 * button, pagination, and the demo-state switcher.
 *
 * Distilled from the prototype's Controls.tsx. Two things carried over
 * deliberately, because they are the parts most often got wrong:
 *
 *  - roving tabindex + arrow keys on Tabs / Segmented / LevelSelector, so the
 *    group is one tab stop rather than nine;
 *  - the demo switcher is hidden unless the page is opened with `?demo=1`.
 *    That is the fix for WEB-004, which is still open against the Admin
 *    screens: review scaffolding must not ship visible to real users.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Inbox, Lock, LoaderCircle, CircleCheck, TriangleAlert, Volume2 } from "lucide-react";

/* ---------------- Tabs ---------------- */

export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export function Tabs({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  label: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(el) => {
            refs.current[t.id] = el;
          }}
          type="button"
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={t.id === active}
          aria-controls={`panel-${t.id}`}
          tabIndex={t.id === active ? 0 : -1}
          className="tab"
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  if (id !== active) return null;
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className="segmented__btn"
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
            e.preventDefault();
            const i = options.findIndex((x) => x.value === value);
            const n =
              e.key === "ArrowRight"
                ? (i + 1) % options.length
                : (i - 1 + options.length) % options.length;
            onChange(options[n].value);
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- HSK 1–9 level selector ---------------- */

export interface LevelOption {
  id: number;
  locked?: boolean;
  done?: boolean;
}

export function LevelSelector({
  levels,
  value,
  onChange,
  label = "Chọn cấp độ HSK",
}: {
  levels: LevelOption[];
  value: number;
  onChange: (id: number) => void;
  label?: string;
}) {
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});
  // With no selected option (e.g. an "All levels" filter) the group still needs
  // a keyboard entry point, so fall back to the first item.
  const tabbableId = levels.some((l) => l.id === value) ? value : levels[0]?.id;

  function onKeyDown(e: React.KeyboardEvent) {
    const i = levels.findIndex((l) => l.id === value);
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % levels.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + levels.length) % levels.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = levels.length - 1;
    else return;
    e.preventDefault();
    onChange(levels[n].id);
    refs.current[levels[n].id]?.focus();
  }

  return (
    <div className="levels" role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {levels.map((l) => (
        <button
          key={l.id}
          ref={(el) => {
            refs.current[l.id] = el;
          }}
          type="button"
          role="radio"
          aria-checked={l.id === value}
          tabIndex={l.id === tabbableId ? 0 : -1}
          className={`level-btn ${l.id === value ? "is-active" : ""} ${l.locked ? "is-locked" : ""}`}
          onClick={() => onChange(l.id)}
        >
          {l.done ? <span className="level-btn__dot" aria-hidden="true" /> : null}
          {l.locked ? (
            <span
              className="level-btn__dot"
              style={{ background: "var(--text-3)" }}
              aria-hidden="true"
            />
          ) : null}
          <span className="level-btn__n num">{l.id}</span>
          <span className="level-btn__k">HSK</span>
          <span className="sr-only">
            HSK {l.id}
            {l.done ? " — đã hoàn thành" : l.locked ? " — đang khoá" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Demo state switcher ---------------- */

export type DemoState = "ready" | "loading" | "empty" | "error";

const DEMO_OPTIONS: { value: DemoState; label: string; icon: ReactNode }[] = [
  { value: "ready", label: "Ready", icon: <CircleCheck size={13} /> },
  { value: "loading", label: "Loading", icon: <LoaderCircle size={13} /> },
  { value: "empty", label: "Empty", icon: <Inbox size={13} /> },
  { value: "error", label: "Error", icon: <TriangleAlert size={13} /> },
];

const DEMO_KEY = "hanlu-demo";

/**
 * WEB-004 fix: review scaffolding is opt-in, not shipped visible.
 * Open any student page with `?demo=1` to reveal the switcher (`?demo=0` hides
 * it again); the choice is remembered in localStorage.
 *
 * Read after mount, never during render — reading `window.location` while
 * rendering would desynchronise the server and client HTML.
 */
export function useDemoToolsEnabled(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    try {
      const flag = new URLSearchParams(window.location.search).get("demo");
      if (flag !== null) window.localStorage.setItem(DEMO_KEY, flag === "0" ? "0" : "1");
      setOn(window.localStorage.getItem(DEMO_KEY) === "1");
    } catch {
      setOn(false); // private mode / storage blocked — stay hidden
    }
  }, []);

  return on;
}

export function DemoStateSwitcher({
  value,
  onChange,
}: {
  value: DemoState;
  onChange: (v: DemoState) => void;
}) {
  const enabled = useDemoToolsEnabled();
  if (!enabled) return null;
  return (
    <div className="demo-switch">
      <span className="demo-switch__label">Trạng thái demo</span>
      <div className="segmented" role="group" aria-label="Chuyển trạng thái demo của trang">
        {DEMO_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`segmented__btn ${o.value === value ? "is-active" : ""}`}
            aria-pressed={o.value === value}
            onClick={() => onChange(o.value)}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Audio button ---------------- */

const SAY_PREFIXES = [
  "Phát âm thanh: ",
  "Phát âm ví dụ ",
  "Phát âm lượt ",
  "Phát âm ",
  "Phát thanh ",
  "Nghe mẫu ",
  "Phát ",
];

function sayFromLabel(label: string): string {
  for (const p of SAY_PREFIXES) {
    if (label.startsWith(p)) return label.slice(p.length);
  }
  return label;
}

/**
 * MOCK(student): speech comes from the browser's Web Speech API, which depends
 * on whatever Chinese voice the user's machine happens to have. The architecture
 * decision is that real audio lives in object storage — this is the placeholder
 * until that endpoint exists, not the intended source.
 */
export function AudioButton({
  say,
  label,
  size = 34,
  onPlay,
}: {
  say?: string;
  label: string;
  size?: number;
  onPlay?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || text.length === 0) {
      // No speech support: still run the animation so the affordance reads as live.
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPlaying(false), 900);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 0.85;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith("zh"));
    if (voice) utter.voice = voice;
    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    synth.speak(utter);
    // Guard against `onend` never firing — happens when no zh voice is installed
    // and the browser silently drops the utterance.
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPlaying(false), 2500 + text.length * 400);
  }

  return (
    <button
      type="button"
      className={`audio-btn ${playing ? "is-playing" : ""}`}
      style={{ width: size, height: size }}
      aria-label={playing ? `Đang phát: ${label}` : `Phát âm thanh: ${label}`}
      onClick={() => {
        if (playing) {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          setPlaying(false);
          if (timer.current) window.clearTimeout(timer.current);
          return;
        }
        setPlaying(true);
        onPlay?.();
        speak(say ?? sayFromLabel(label));
      }}
    >
      <Volume2 size={Math.round(size * 0.48)} />
    </button>
  );
}

/* ---------------- Locked marker ---------------- */

export function LockedTag({ text = "Đang khoá" }: { text?: string }) {
  return (
    <span className="chip">
      <Lock size={12} />
      {text}
    </span>
  );
}

/* ---------------- Pagination ---------------- */

export function Pagination({
  page,
  totalItems,
  pageSize = 24,
  onPageChange,
  unit = "mục",
  className = "",
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  unit?: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, page * pageSize);

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className={`pagination-wrap ${className}`}>
      <span className="pagination-info">
        Hiển thị{" "}
        <strong className="num">
          {startItem}–{endItem}
        </strong>{" "}
        trong tổng số <strong className="num">{totalItems}</strong> {unit}
      </span>
      <div className="pagination-btns">
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          Trước
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="pagination-dots">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`pagination-btn num ${page === p ? "is-active" : ""}`}
              onClick={() => onPageChange(p)}
              aria-current={page === p ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
