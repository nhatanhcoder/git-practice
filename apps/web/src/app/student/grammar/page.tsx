"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  CircleHelp,
  Combine,
  Eraser,
  Filter,
  Lightbulb,
  MousePointerClick,
  Search,
  Shuffle,
  SquarePen,
  X,
} from "lucide-react";
import { AudioButton } from "@/components/student/audio-button";
import {
  Card,
  Chip,
  DemoStateSwitcher,
  EmptyState,
  ErrorState,
  GhostButton,
  LoadingState,
  PrimaryButton,
  ProgressBar,
  SectionHead,
  type DemoState,
} from "@/components/student/ui";
import {
  grammarCategories,
  grammarExercises,
  grammarPoints,
  masterySummary,
  type GrammarPoint,
} from "@/lib/student/grammar-data";

const hskLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const exerciseTabs = [
  { key: "mcq", label: "Trắc nghiệm", icon: MousePointerClick },
  { key: "fill", label: "Điền chỗ trống", icon: SquarePen },
  { key: "reorder", label: "Sắp xếp", icon: Combine },
  { key: "match", label: "Nối cặp", icon: Shuffle },
  { key: "reflex", label: "Speed Reflex", icon: CircleHelp },
] as const;

type ExerciseKey = (typeof exerciseTabs)[number]["key"];

/* ---------- Exercise mini demos ---------- */

function McqDemo({ exKey }: { exKey: ExerciseKey }) {
  const ex = grammarExercises[exKey];
  const [picked, setPicked] = useState<number | null>(null);

  if (exKey === "reorder") return <ReorderDemo />;
  if (exKey === "match") return <MatchDemo />;

  return (
    <div>
      <p className="sp-font-head text-sm font-extrabold text-sp-ink">{ex.question}</p>
      <div className="mt-3 space-y-2">
        {ex.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = i === ex.answerIndex;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => setPicked(i)}
              aria-pressed={isPicked}
              className={`sp-press w-full rounded-xl border px-4 py-2.5 text-left text-sm font-semibold ${
                picked === null
                  ? "border-sp-line bg-sp-card text-sp-ink hover:border-sp-primary-line"
                  : isCorrect
                    ? "border-sp-ok bg-sp-ok-soft text-sp-ok"
                    : isPicked
                      ? "border-sp-danger bg-sp-danger-soft text-sp-danger"
                      : "border-sp-line bg-sp-card text-sp-ink3"
              }`}
            >
              {opt}
              {picked !== null && isCorrect ? (
                <CheckCircle2 size={16} className="ml-2 inline" aria-hidden="true" />
              ) : null}
            </button>
          );
        })}
      </div>
      {picked !== null ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-sp-primary-soft p-3 text-xs leading-relaxed text-sp-primary-strong">
          <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
          {ex.explain}
        </p>
      ) : null}
    </div>
  );
}

function ReorderDemo() {
  const words = ["我", "把", "作业", "做完了"];
  const [order, setOrder] = useState<number[]>([]);
  const remaining = words.map((_, i) => i).filter((i) => !order.includes(i));

  return (
    <div>
      <p className="sp-font-head text-sm font-extrabold text-sp-ink">
        Sắp xếp thành câu đúng: <span className="text-sp-ink2">(bấm từng từ theo thứ tự)</span>
      </p>
      <div className="mt-3 min-h-[3.25rem] rounded-xl border-2 border-dashed border-sp-primary-line bg-sp-primary-soft/40 p-2">
        {order.length === 0 ? (
          <p className="p-1.5 text-xs text-sp-ink3">Câu của bạn sẽ hiện ở đây…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {order.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setOrder((o) => o.filter((x) => x !== w))}
                aria-label={`Bỏ từ ${words[w]}`}
                className="sp-press sp-font-head rounded-lg bg-sp-primary px-3 py-1.5 text-sm font-bold text-white"
              >
                {words[w]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {remaining.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setOrder((o) => [...o, w])}
            className="sp-press sp-font-head rounded-lg border border-sp-line bg-sp-card px-3 py-1.5 text-sm font-bold text-sp-ink hover:border-sp-primary"
          >
            {words[w]}
          </button>
        ))}
      </div>
      {order.length === words.length ? (
        <p
          className={`mt-3 rounded-xl p-3 text-xs font-bold ${
            order.join("") === "0123"
              ? "bg-sp-ok-soft text-sp-ok"
              : "bg-sp-danger-soft text-sp-danger"
          }`}
        >
          {order.join("") === "0123"
            ? "Chính xác! 我把作业做完了。— S + 把 + O + V + bổ ngữ."
            : "Chưa đúng — bấm vào từ trong câu để bỏ ra và thử lại."}
        </p>
      ) : null}
    </div>
  );
}

function MatchDemo() {
  const pairs = [
    { left: "便宜", right: "rẻ" },
    { left: "打折", right: "giảm giá" },
    { left: "质量", right: "chất lượng" },
    { left: "试", right: "thử" },
  ];
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());

  return (
    <div>
      <p className="sp-font-head text-sm font-extrabold text-sp-ink">
        Nối từ Hán với nghĩa tiếng Việt
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <button
              key={p.left}
              type="button"
              disabled={matched.has(i)}
              onClick={() => setSelected(i)}
              aria-pressed={selected === i}
              className={`sp-press sp-font-head w-full rounded-xl border px-3 py-2 text-sm font-bold ${
                matched.has(i)
                  ? "border-sp-ok bg-sp-ok-soft text-sp-ok"
                  : selected === i
                    ? "border-sp-primary bg-sp-primary-soft text-sp-primary-strong"
                    : "border-sp-line bg-sp-card text-sp-ink"
              }`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <button
              key={p.right}
              type="button"
              disabled={matched.has(i)}
              onClick={() => {
                if (selected === i) {
                  setMatched((m) => new Set(m).add(i));
                }
                setSelected(null);
              }}
              className={`sp-press w-full rounded-xl border px-3 py-2 text-sm font-semibold ${
                matched.has(i)
                  ? "border-sp-ok bg-sp-ok-soft text-sp-ok"
                  : "border-sp-line bg-sp-card text-sp-ink"
              }`}
            >
              {p.right}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-sp-ink2">
        Đã nối {matched.size}/{pairs.length} cặp. Bấm từ Hán rồi bấm nghĩa đúng.
      </p>
    </div>
  );
}

/* ---------- Grammar point drawer ---------- */

function GrammarDrawer({
  point,
  onClose,
}: {
  point: GrammarPoint;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<ExerciseKey>("mcq");
  const masteryLabel =
    point.mastery >= 80 ? "Đã thuộc" : point.mastery > 0 ? "Đang học" : "Chưa bắt đầu";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={point.title}>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 right-0 flex w-full flex-col bg-sp-card shadow-sp sm:w-[480px]">
        <div className="flex items-center justify-between border-b border-sp-line px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="sp-font-head text-base font-extrabold text-sp-ink">{point.title}</h2>
            <Chip tone="primary" size="sm">
              HSK {point.level}
            </Chip>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="sp-press flex h-9 w-9 items-center justify-center rounded-xl text-sp-ink2 hover:bg-sp-locked-soft"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="sp-scroll flex-1 overflow-y-auto px-5 py-5">
          {/* Formula */}
          <div className="rounded-2xl bg-sp-primary p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              Công thức
            </p>
            <p className="sp-font-head mt-1 text-xl font-black">{point.formula}</p>
          </div>

          {/* Head example */}
          <div className="mt-4 rounded-2xl border border-sp-line bg-sp-bg p-4">
            <div className="flex items-start gap-3">
              <AudioButton label={point.hanzi} size="sm" />
              <div>
                <p className="sp-font-head text-lg font-black text-sp-ink">{point.hanzi}</p>
                <p className="text-sm text-sp-primary-strong">{point.pinyin}</p>
                <p className="mt-0.5 text-sm text-sp-ink2">{point.vi}</p>
              </div>
            </div>
          </div>

          {/* More examples */}
          <h3 className="sp-font-head mt-5 text-sm font-extrabold text-sp-ink">Ví dụ thêm</h3>
          <div className="mt-2 space-y-2">
            {point.examples.map((ex) => (
              <div
                key={ex.hanzi}
                className="flex items-start gap-3 rounded-xl border border-sp-line p-3"
              >
                <AudioButton label={ex.hanzi} size="sm" />
                <div>
                  <p className="text-sm font-bold text-sp-ink">{ex.hanzi}</p>
                  <p className="text-xs text-sp-primary-strong">{ex.pinyin}</p>
                  <p className="text-xs text-sp-ink2">{ex.vi}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-sp-warn-soft p-3 text-xs leading-relaxed text-sp-warn">
            <Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Lưu ý:</strong> {point.notes}
            </span>
          </div>

          {/* Mastery */}
          <div className="mt-5">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-semibold text-sp-ink">Mức độ thành thạo</span>
              <span className="text-sp-ink2">
                {masteryLabel} · {point.mastery}%
              </span>
            </div>
            <ProgressBar
              value={point.mastery}
              tone={point.mastery >= 80 ? "ok" : "primary"}
              label={`Mức độ thành thạo ${point.title}`}
            />
          </div>

          {/* Exercise preview */}
          <h3 className="sp-font-head mt-6 text-sm font-extrabold text-sp-ink">
            Luyện tập nhanh
          </h3>
          <div className="sp-scroll mt-2 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Kiểu bài tập">
            {exerciseTabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`sp-font-head flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    tab === t.key
                      ? "bg-sp-primary text-white"
                      : "bg-sp-locked-soft text-sp-ink2 hover:text-sp-primary"
                  }`}
                >
                  <Icon size={13} aria-hidden="true" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <Card className="mt-3 p-4">
            {tab === "reflex" ? (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-sp-accent-strong">
                  <Brain size={14} aria-hidden="true" /> Speed Reflex — trả lời trong 5 giây
                </p>
                <McqDemo exKey="reflex" />
              </div>
            ) : (
              <McqDemo exKey={tab} />
            )}
          </Card>
          <div className="mt-3 flex items-center gap-2 text-xs text-sp-ink2">
            <Eraser size={13} aria-hidden="true" />
            Đây là bản xem trước — bản đầy đủ nằm trong phần Luyện tập của từng bài.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

function PageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [open, setOpen] = useState<GrammarPoint | null>(null);
  const [query, setQuery] = useState("");

  const levelParam = Number(params.get("level"));
  const level = hskLevels.includes(levelParam) ? levelParam : null;
  const category = params.get("category");

  const filtered = useMemo(() => {
    return grammarPoints.filter((p) => {
      if (level !== null && p.level !== level) return false;
      if (category && p.category !== category) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${p.title} ${p.formula} ${p.hanzi} ${p.pinyin} ${p.vi} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [level, category, query]);

  const summary = useMemo(() => masterySummary(grammarPoints), []);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    router.replace(`/student/grammar?${next.toString()}`, { scroll: false });
  };

  const hasFilters = level !== null || !!category || query.trim() !== "";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href="/student"
            className="sp-press flex h-10 w-10 items-center justify-center rounded-xl border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
            aria-label="Quay lại Tổng quan"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <div>
            <h1 className="sp-font-head text-2xl font-black text-sp-ink sm:text-3xl">
              Thư viện ngữ pháp
            </h1>
            <p className="text-sm text-sp-ink2">Tìm kiếm — lọc theo cấp và chủ đề</p>
          </div>
        </div>
        <DemoStateSwitcher state={demoState} onChange={setDemoState} />
      </div>

      {/* Mastery summary */}
      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full"
            role="img"
            aria-label={`Mức thành thạo trung bình ${Math.round(
              (summary.mastered / summary.total) * 100,
            )}%`}
          >
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E4E7F5" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(summary.mastered / summary.total) * 97.4} 97.4`}
              />
            </svg>
            <span className="sp-font-head text-sm font-black text-sp-ink">
              {Math.round((summary.mastered / summary.total) * 100)}%
            </span>
          </div>
          <div>
            <p className="sp-font-head text-base font-black text-sp-ink">Tổng quan của bạn</p>
            <p className="text-sm text-sp-ink2">
              {summary.mastered} đã thuộc · {summary.learning} đang học · {summary.notStarted} chưa
              bắt đầu
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Chip tone="ok">Đã thuộc {summary.mastered}</Chip>
          <Chip tone="primary">Đang học {summary.learning}</Chip>
          <Chip>Chưa bắt đầu {summary.notStarted}</Chip>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-ink3"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm công thức, ví dụ, nghĩa… (vd: 把, so sánh, bǐ)"
              aria-label="Tìm điểm ngữ pháp"
              className="w-full rounded-xl border border-sp-line bg-sp-card py-2.5 pl-10 pr-4 text-sm text-sp-ink placeholder:text-sp-ink3 focus:border-sp-primary focus:outline-none focus:ring-2 focus:ring-sp-primary/20"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-sp-ink2">
            <Filter size={15} aria-hidden="true" />
            <span className="sp-font-head font-bold">Bộ lọc</span>
          </div>
        </div>

        <div className="sp-scroll mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo cấp HSK">
          <button
            type="button"
            onClick={() => setParam("level", null)}
            aria-pressed={level === null}
            className={`sp-font-head sp-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${
              level === null
                ? "bg-sp-primary text-white"
                : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
            }`}
          >
            Tất cả các cấp
          </button>
          {hskLevels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setParam("level", String(l))}
              aria-pressed={level === l}
              className={`sp-font-head sp-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${
                level === l
                  ? "bg-sp-primary text-white"
                  : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
              }`}
            >
              HSK {l}
            </button>
          ))}
        </div>

        <div className="sp-scroll mt-2 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Lọc theo chủ đề">
          <button
            type="button"
            onClick={() => setParam("category", null)}
            aria-pressed={!category}
            className={`sp-font-head sp-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${
              !category
                ? "bg-sp-accent text-white"
                : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-accent-strong"
            }`}
          >
            Mọi chủ đề
          </button>
          {grammarCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setParam("category", c)}
              aria-pressed={category === c}
              className={`sp-font-head sp-press h-9 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${
                category === c
                  ? "bg-sp-accent text-white"
                  : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-accent-strong"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      {/* Results */}
      {demoState === "loading" ? (
        <LoadingState rows={5} />
      ) : demoState === "error" ? (
        <ErrorState onRetry={() => setDemoState("ready")} />
      ) : demoState === "empty" || filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Không tìm thấy điểm ngữ pháp nào"
          desc={
            hasFilters
              ? "Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm."
              : "Thư viện sẽ sớm có thêm các điểm ngữ pháp HSK 6–9."
          }
          action={
            hasFilters ? (
              <GhostButton
                onClick={() => {
                  setQuery("");
                  setParam("level", null);
                  setParam("category", null);
                }}
              >
                Xoá tất cả bộ lọc
              </GhostButton>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpen(p)}
              className="sp-press flex flex-col rounded-3xl border border-sp-line bg-sp-card p-5 text-left shadow-sp"
            >
              <div className="flex items-center gap-2">
                <Chip tone="primary" size="sm">
                  HSK {p.level}
                </Chip>
                <Chip size="sm">{p.category}</Chip>
                {p.mastery >= 80 ? (
                  <CheckCircle2 size={15} className="ml-auto text-sp-ok" aria-hidden="true" />
                ) : null}
              </div>
              <h3 className="sp-font-head mt-3 text-base font-extrabold text-sp-ink">{p.title}</h3>
              <p className="sp-font-head mt-1 rounded-lg bg-sp-primary-soft px-2.5 py-1.5 text-sm font-bold text-sp-primary-strong">
                {p.formula}
              </p>
              <div className="mt-3 flex items-start gap-2.5">
                <AudioButton label={p.hanzi} size="sm" />
                <div className="min-w-0">
                  <p className="sp-font-head text-sm font-bold text-sp-ink">{p.hanzi}</p>
                  <p className="truncate text-xs text-sp-primary-strong">{p.pinyin}</p>
                </div>
              </div>
              <p className="mt-2 flex-1 text-sm text-sp-ink2">{p.vi}</p>
              <div className="mt-4">
                <ProgressBar
                  value={p.mastery}
                  tone={p.mastery >= 80 ? "ok" : "primary"}
                  label={`Thành thạo ${p.title}`}
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Drawer */}
      {open ? <GrammarDrawer point={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense fallback={<LoadingState rows={5} />}>
      <PageInner />
    </Suspense>
  );
}
