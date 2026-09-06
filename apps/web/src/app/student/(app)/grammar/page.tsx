"use client";

/**
 * /student/grammar — the grammar library.
 *
 * Browse by level and category, open a point for the full explanation, then
 * drill it in one of five exercise shapes. Mastery is the learner's, so it
 * lives in the store and is joined onto the content here.
 *
 * MOCK(student): content from `lib/student/grammar-data.ts`; no API call.
 */

import { useMemo, useState } from "react";
import { BookOpen, Check, Dumbbell, Filter, Gauge, RotateCcw, Search, Sparkles, X } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  Panel,
  Ring,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  DemoStateSwitcher,
  LevelSelector,
  Tabs,
  type DemoState,
} from "@/components/student/controls";
import { Drawer, Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { grammarCategories, grammarPoints, type GrammarPoint } from "@/lib/student/grammar-data";
import { shuffleBlocks } from "@/lib/student/student-rules";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type ExerciseKind = "mcq" | "blank" | "reorder" | "match" | "reflex";

const EXERCISE_TABS: { id: ExerciseKind; label: string }[] = [
  { id: "mcq", label: "Trắc nghiệm" },
  { id: "blank", label: "Điền chỗ trống" },
  { id: "reorder", label: "Sắp xếp" },
  { id: "match", label: "Nối cặp" },
  { id: "reflex", label: "Phản xạ nhanh" },
];

/** Options for the MCQ / blank / reflex shapes: the right answer plus three others. */
function optionsFor(point: GrammarPoint, all: GrammarPoint[]) {
  const others = all
    .filter((p) => p.id !== point.id && p.level === point.level)
    .slice(0, 3)
    .map((p) => p.hanzi);
  const pool = [point.hanzi, ...others];
  while (pool.length < 4) pool.push(all[pool.length].hanzi);
  return shuffleBlocks(pool, point.id.length * 17 + point.level) as string[];
}

export default function GrammarPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [level, setLevel] = useState<number | "all">("all");
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<GrammarPoint | null>(null);
  const [drillOpen, setDrillOpen] = useState(false);
  const [kind, setKind] = useState<ExerciseKind>("mcq");
  const [picked, setPicked] = useState<string | null>(null);
  const [slot, setSlot] = useState<string[]>([]);

  const mastery = useStudentStore((s) => s.grammarMastery);
  const practiseGrammar = useStudentStore((s) => s.practiseGrammar);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  /** Content mastery is a fixture; the store's value wins once the learner drills. */
  const points = useMemo(
    () =>
      grammarPoints.map((p) => ({
        ...p,
        mastery: mastery[p.id] ? mastery[p.id].level : p.mastery,
      })),
    [mastery],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return points.filter((p) => {
      if (level !== "all" && p.level !== level) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.formula.toLowerCase().includes(q) ||
        p.hanzi.includes(q) ||
        p.pinyin.toLowerCase().includes(q)
      );
    });
  }, [points, level, category, query]);

  const summary = useMemo(() => {
    const mastered = points.filter((p) => p.mastery >= 80).length;
    const learning = points.filter((p) => p.mastery > 0 && p.mastery < 80).length;
    return {
      total: points.length,
      mastered,
      learning,
      notStarted: points.length - mastered - learning,
      pct: Math.round(points.reduce((sum, point) => sum + point.mastery, 0) / points.length),
    };
  }, [points]);

  const drillOptions = open ? optionsFor(open, points) : [];
  const drillTokens = open ? (shuffleBlocks(open.hanzi.replace(/[。？！]/g, "").split(""), 7) as string[]) : [];

  function answerDrill(correct: boolean) {
    if (!open) return;
    practiseGrammar(open.id, correct);
    if (correct) {
      awardXp(20, 1);
      toast("Chính xác — +20 XP", "success");
    } else {
      toast("Chưa đúng, thử lại nhé", "warn");
    }
  }

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="eyebrow">Thư viện</p>
          <h1 className="pagehead__title">Ngữ pháp HSK 1 – 9</h1>
          <p className="pagehead__sub">
            {points.length} điểm ngữ pháp có công thức, ví dụ chữ Hán, phiên âm, dịch nghĩa tiếng Việt và năm dạng bài tập luyện ngay trong thư viện.
          </p>
        </div>
        <DemoStateSwitcher value={demo} onChange={setDemo} />
      </header>

      {demo === "loading" ? (
        <SkeletonPanel rows={5} height={200} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Mastery summary ---------- */}
          <Panel className="panel--pad mastery" aria-label="Tổng quan mức thành thạo">
            <div className="row gap-5">
              <Ring value={summary.pct} size={104} stroke={10} label="Mức thành thạo tổng thể">
                <div className="stack" style={{ gap: 0 }}>
                  <span className="num" style={{ fontSize: "var(--step-2)", fontWeight: 700 }}>
                    {summary.pct}%
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: 10 }}>tổng thể</span>
                </div>
              </Ring>
              <div className="grow stack gap-4">
                <div className="row gap-6 wrap">
                  <Metric label="Thành thạo" value={summary.mastered} icon={<Check size={12} />} color="var(--success)" />
                  <Metric label="Đang học" value={summary.learning} icon={<Gauge size={12} />} color="var(--warn)" />
                  <Metric label="Chưa học" value={summary.notStarted} icon={<Sparkles size={12} />} />
                </div>
                <div className="mastery__levels">
                  {LEVELS.map((itemLevel) => {
                    const levelPoints = points.filter((point) => point.level === itemLevel);
                    const levelPct = levelPoints.length
                      ? Math.round(levelPoints.reduce((sum, point) => sum + point.mastery, 0) / levelPoints.length)
                      : 0;
                    return (
                      <button key={itemLevel} type="button" className="mastery__level" onClick={() => setLevel(itemLevel)} aria-label={`Lọc HSK ${itemLevel} — thành thạo ${levelPct}%`}>
                        <span className="mastery__level-n num">HSK {itemLevel}</span>
                        <Bar value={levelPct} size="sm" tone={levelPct >= 70 ? "success" : levelPct > 0 ? "accent" : "info"} />
                        <span className="mastery__level-p num">{levelPct}%</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Panel>

          {/* ---------- Filters ---------- */}
          <Panel className="panel--pad stack gap-5" aria-label="Bộ lọc ngữ pháp">
              <div className="row gap-4 wrap">
              <label className="field grow" style={{ minWidth: 240, maxWidth: 420 }}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm theo tên, công thức, chữ Hán hoặc pinyin…"
                  aria-label="Tìm điểm ngữ pháp"
                />
                {query ? <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={() => setQuery("")} aria-label="Xoá từ khoá"><X size={14} /></button> : null}
              </label>
              <span className="grow" />
              <Chip icon={<Filter size={12} />}>{results.length} kết quả</Chip>
              {level !== "all" || category !== "all" || query.trim() ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setLevel("all"); setCategory("all"); setQuery(""); }}><RotateCcw size={14} /> Xoá bộ lọc</button>
              ) : null}
              </div>

              <div className="stack gap-2">
                <span className="metric__label">Cấp độ</span>
                <div className="row gap-3 wrap">
                  <button
                    type="button"
                    className={`pill ${level === "all" ? "is-active" : ""}`}
                    aria-pressed={level === "all"}
                    onClick={() => setLevel("all")}
                  >
                    Tất cả
                  </button>
                  <LevelSelector
                    levels={LEVELS.map((id) => ({ id }))}
                    value={typeof level === "number" ? level : -1}
                    onChange={(id) => setLevel(id)}
                  />
                </div>
              </div>

              <div className="stack gap-2">
                <span className="metric__label">Nhóm ngữ pháp</span>
                <div className="row gap-2 wrap">
                  <button
                    type="button"
                    className={`pill ${category === "all" ? "is-active" : ""}`}
                    aria-pressed={category === "all"}
                    onClick={() => setCategory("all")}
                  >
                    Tất cả nhóm
                  </button>
                  {grammarCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`pill ${category === c ? "is-active" : ""}`}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
          </Panel>

          {/* ---------- Results ---------- */}
          <section>
            <SectionHeader
              title="Điểm ngữ pháp"
              sub={`${results.length} kết quả khớp bộ lọc`}
            />
            {demo === "empty" || results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState
                  title="Không có điểm nào khớp"
                  text="Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác."
                  action={
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => {
                        setLevel("all");
                        setCategory("all");
                        setQuery("");
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  }
                />
              </Panel>
            ) : (
              <div className="cards">
                {results.map((p) => (
                  <button key={p.id} type="button" className="gcard" onClick={() => setOpen(p)}>
                    <div className="row gap-2 wrap">
                      <Chip tone="accent">HSK {p.level}</Chip>
                      <Chip>{p.category}</Chip>
                    </div>
                    <span className="gcard__name">{p.title}</span>
                    <span className="gcard__formula">{p.formula}</span>
                    <div className="stack gap-1">
                      <span className="gcard__hanzi han">{p.hanzi}</span>
                      <span className="gcard__pinyin pinyin">{p.pinyin}</span>
                      <span className="gcard__vi vi-meaning">{p.vi}</span>
                    </div>
                    <div className="stack gap-1">
                      <Bar
                        value={p.mastery}
                        tone={p.mastery >= 80 ? "success" : "accent"}
                        size="sm"
                        label={`Thành thạo ${p.mastery}%`}
                      />
                      <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                        Thành thạo <span className="num">{p.mastery}%</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ---------- Detail drawer ---------- */}
      <Drawer
        open={open !== null && !drillOpen}
        onClose={() => setOpen(null)}
        eyebrow={open ? `HSK ${open.level} · ${open.category}` : ""}
        title={open?.title ?? ""}
        subtitle={open?.formula}
        footer={
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => {
              setPicked(null);
              setSlot([]);
              setDrillOpen(true);
            }}
          >
            <Dumbbell size={16} /> Luyện điểm này
          </button>
        }
      >
        {open ? (
          <div className="stack gap-5">
            <div className="stack gap-2">
              <span className="eyebrow">Công thức</span>
              <span className="gcard__formula" style={{ alignSelf: "flex-start" }}>
                {open.formula}
              </span>
            </div>

            <div className="stack gap-2">
              <span className="eyebrow">Giải thích</span>
              <p style={{ color: "var(--text-2)" }}>{open.notes}</p>
            </div>

            <div className="stack gap-3">
              <span className="eyebrow">Ví dụ</span>
              {[{ hanzi: open.hanzi, pinyin: open.pinyin, vi: open.vi }, ...open.examples].map(
                (ex, i) => (
                  <div key={i} className="drawer-hanzi stack gap-1">
                    <span className="han" style={{ fontSize: "var(--step-2)" }}>
                      {ex.hanzi}
                    </span>
                    <span
                      className="pinyin drawer-hanzi__pinyin"
                      style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--1)" }}
                    >
                      {ex.pinyin}
                    </span>
                    <span
                      className="vi-meaning drawer-hanzi__vi"
                      style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}
                    >
                      {ex.vi}
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="stack gap-2">
              <span className="eyebrow">Mức thành thạo</span>
              <Bar value={open.mastery} tone={open.mastery >= 80 ? "success" : "accent"} />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* ---------- Exercise modal ---------- */}
      <Modal
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        title={`Luyện: ${open?.title ?? ""}`}
        subtitle="Năm dạng bài, chọn tab để đổi"
      >
        <div className="stack gap-5">
          <Tabs
            tabs={EXERCISE_TABS}
            active={kind}
            onChange={(id) => {
              setKind(id as ExerciseKind);
              setPicked(null);
              setSlot([]);
            }}
            label="Dạng bài tập"
          />

          {open && (kind === "mcq" || kind === "blank" || kind === "reflex") ? (
            <div className="stack gap-4">
              <p className="ex-prompt">
                {kind === "mcq"
                  ? `Câu nào dùng đúng «${open.formula}»?`
                  : kind === "blank"
                    ? `Điền câu đúng cho: «${open.vi}»`
                    : `Phản xạ nhanh — chọn trong 5 giây: «${open.vi}»`}
              </p>
              <div className="ex-options">
                {drillOptions.map((opt) => {
                  const isRight = opt === open.hanzi;
                  const state =
                    picked === null
                      ? ""
                      : opt === picked
                        ? isRight
                          ? "is-right"
                          : "is-wrong"
                        : isRight
                          ? "is-right"
                          : "";
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`ex-option han ${state}`}
                      disabled={picked !== null}
                      onClick={() => {
                        setPicked(opt);
                        answerDrill(isRight);
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {picked !== null ? (
                <div className={`ex-feedback ${picked === open.hanzi ? "is-right" : "is-wrong"}`}>
                  <p style={{ fontWeight: 700 }}>
                    {picked === open.hanzi ? "Chính xác" : "Chưa đúng"}
                  </p>
                  <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>{open.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {open && kind === "reorder" ? (
            <div className="stack gap-4">
              <p className="ex-prompt">Sắp xếp thành câu đúng: «{open.vi}»</p>
              <div className="ex-slot">
                {slot.length === 0 ? (
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                    Bấm các khối bên dưới để xếp câu
                  </span>
                ) : (
                  slot.map((t, i) => (
                    <button
                      key={`${t}-${i}`}
                      type="button"
                      className="token"
                      onClick={() => setSlot((s) => s.filter((_, idx) => idx !== i))}
                    >
                      {t}
                    </button>
                  ))
                )}
              </div>
              <div className="ex-bank">
                {drillTokens.map((t, i) => (
                  <button
                    key={`${t}-${i}`}
                    type="button"
                    className="token"
                    disabled={slot.filter((x) => x === t).length >= drillTokens.filter((x) => x === t).length}
                    onClick={() => setSlot((s) => [...s, t])}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={slot.length === 0}
                onClick={() => {
                  const target = open.hanzi.replace(/[。？！]/g, "");
                  answerDrill(slot.join("") === target);
                  setPicked(slot.join("") === target ? "ok" : "no");
                }}
              >
                Kiểm tra
              </button>
              {picked ? (
                <div className={`ex-feedback ${picked === "ok" ? "is-right" : "is-wrong"}`}>
                  <p style={{ fontWeight: 700 }}>{picked === "ok" ? "Chính xác" : "Chưa đúng"}</p>
                  <p className="han">{open.hanzi}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {open && kind === "match" ? (
            <MatchExercise points={points} anchor={open} onDone={() => answerDrill(true)} />
          ) : null}
        </div>
      </Modal>
    </>
  );
}

/** Four Chinese cells and four Vietnamese cells; tap one of each to pair them. */
function MatchExercise({
  points,
  anchor,
  onDone,
}: {
  points: GrammarPoint[];
  anchor: GrammarPoint;
  onDone: () => void;
}) {
  const pairs = useMemo(() => {
    const pool = [anchor, ...points.filter((p) => p.id !== anchor.id).slice(0, 3)];
    return pool.map((p) => ({ id: p.id, hanzi: p.hanzi, vi: p.vi }));
  }, [points, anchor]);

  const shuffledVi = useMemo(() => shuffleBlocks(pairs, 23) as typeof pairs, [pairs]);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  function pickVi(id: string) {
    if (!selected) return;
    if (selected === id) {
      const next = [...done, id];
      setDone(next);
      if (next.length === pairs.length) onDone();
    }
    setSelected(null);
  }

  return (
    <div className="stack gap-4">
      <p className="ex-prompt">Nối câu chữ Hán với nghĩa tiếng Việt</p>
      <div className="ex-match">
        <div className="stack gap-2">
          {pairs.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`match-cell han ${selected === p.id ? "is-sel" : ""} ${done.includes(p.id) ? "is-done" : ""}`}
              disabled={done.includes(p.id)}
              onClick={() => setSelected(p.id)}
            >
              {p.hanzi}
            </button>
          ))}
        </div>
        <div className="stack gap-2">
          {shuffledVi.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`match-cell ${done.includes(p.id) ? "is-done" : ""}`}
              disabled={done.includes(p.id)}
              onClick={() => pickVi(p.id)}
            >
              {p.vi}
            </button>
          ))}
        </div>
      </div>
      {done.length === pairs.length ? (
        <div className="ex-feedback is-right">
          <p style={{ fontWeight: 700 }}>
            <Sparkles size={14} style={{ display: "inline" }} /> Nối đúng cả bốn cặp
          </p>
        </div>
      ) : null}
    </div>
  );
}
