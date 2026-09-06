"use client";

/**
 * /student/writing — the character list.
 *
 * Filter by level, radical or stroke count, then open one to practise it.
 * Practice progress is the learner's, so it is joined from the store.
 *
 * MOCK(student): content from `lib/student/content.ts`; no API call.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { PenTool, Search } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, LevelSelector, type DemoState } from "@/components/student/controls";
import { useStudentStore } from "@/lib/student/store";
import { writingChars } from "@/lib/student/content";
import { WRITING_PASS_SCORE, withWritingProgress, writingRadicals } from "@/lib/student/student-rules";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function WritingPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [level, setLevel] = useState<number | "all">("all");
  const [radical, setRadical] = useState<string>("all");
  const [query, setQuery] = useState("");

  const writingMastery = useStudentStore((s) => s.writingMastery);

  const chars = useMemo(
    () => withWritingProgress(writingChars, writingMastery),
    [writingMastery],
  );

  const radicalOptions = useMemo(() => writingRadicals(writingChars), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chars.filter((c) => {
      if (level !== "all" && c.level !== level) return false;
      if (radical !== "all" && c.radical !== radical) return false;
      if (!q) return true;
      return c.char.includes(q) || c.pinyin.toLowerCase().includes(q) || c.vi.toLowerCase().includes(q);
    });
  }, [chars, level, radical, query]);

  const summary = useMemo(() => {
    const practised = chars.filter((c) => c.progress.practised > 0).length;
    const passed = chars.filter((c) => c.progress.bestScore >= WRITING_PASS_SCORE).length;
    const strokes = chars.reduce((sum, c) => sum + c.strokeCount * c.progress.practised, 0);
    return { practised, passed, strokes, total: chars.length };
  }, [chars]);

  return (
    <>
      <PageHead
        eyebrow="Luyện tập"
        title="Luyện viết chữ Hán"
        sub="Chữ mẫu từ HSK 1 đến HSK 9, kèm thứ tự nét, bảng viết mô phỏng và tiến độ luyện tập cục bộ. Bản prototype không chấm chữ viết tay thật."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={5} height={200} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Summary ---------- */}
          <Panel className="panel--pad">
            <div className="grid grid--4">
              <Metric label="Chữ trong bộ" value={summary.total} />
              <Metric label="Đã luyện" value={summary.practised} />
              <Metric label="Đạt chuẩn" value={summary.passed} icon={<PenTool size={14} />} />
              <Metric label="Nét đã viết" value={summary.strokes} />
            </div>
            <Bar
              value={(summary.passed / summary.total) * 100}
              tone="success"
              label="Tỉ lệ chữ đạt chuẩn"
            />
            <p style={{ color: "var(--text-3)", fontSize: "var(--step--2)", marginTop: "var(--sp-2)" }}>
              Một chữ tính là đạt khi bảng tập viết chấm từ{" "}
              <span className="num">{WRITING_PASS_SCORE}</span> điểm trở lên.
            </p>
          </Panel>

          {/* ---------- Filters ---------- */}
          <Panel className="panel--pad">
            <div className="stack gap-4">
              <label className="field">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm chữ, pinyin hoặc nghĩa…"
                  aria-label="Tìm chữ Hán"
                />
              </label>

              <div className="row gap-3 wrap">
                <button
                  type="button"
                  className={`pill ${level === "all" ? "is-active" : ""}`}
                  aria-pressed={level === "all"}
                  onClick={() => setLevel("all")}
                >
                  Mọi cấp
                </button>
                <LevelSelector
                  levels={LEVELS.map((id) => ({ id }))}
                  value={typeof level === "number" ? level : -1}
                  onChange={setLevel}
                />
              </div>

              <div className="stack gap-2">
                <span className="eyebrow">Bộ thủ</span>
                <div className="row gap-2 wrap">
                  <button
                    type="button"
                    className={`pill ${radical === "all" ? "is-active" : ""}`}
                    aria-pressed={radical === "all"}
                    onClick={() => setRadical("all")}
                  >
                    Tất cả
                  </button>
                  {radicalOptions.map((r) => (
                    <button
                      key={r.char}
                      type="button"
                      className={`pill ${radical === r.char ? "is-active" : ""}`}
                      aria-pressed={radical === r.char}
                      onClick={() => setRadical(r.char)}
                    >
                      <span className="han">{r.char}</span> {r.name}{" "}
                      <span className="num">({r.count})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* ---------- Results ---------- */}
          <section>
            <SectionHeader title="Bộ chữ" sub={`${results.length} chữ khớp bộ lọc`} />
            {demo === "empty" || results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState
                  title="Không có chữ nào khớp"
                  text="Thử bỏ bớt bộ lọc hoặc tìm bằng pinyin."
                  action={
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => {
                        setLevel("all");
                        setRadical("all");
                        setQuery("");
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  }
                />
              </Panel>
            ) : (
              <div className="char-grid">
                {results.map((c) => (
                  <Link key={c.id} href={`/student/writing/${c.id}`} className="charcard">
                    <span className="charcard__glyph han">{c.char}</span>
                    <span className="charcard__pinyin pinyin">{c.pinyin}</span>
                    <span className="charcard__vi vi-meaning">{c.vi}</span>
                    <span className="charcard__meta">
                      HSK {c.level} · <span className="num">{c.strokeCount}</span> nét · bộ{" "}
                      <span className="han">{c.radical}</span>
                    </span>
                    <Bar
                      value={c.progress.bestScore}
                      size="sm"
                      tone={c.progress.bestScore >= WRITING_PASS_SCORE ? "success" : "accent"}
                      label={`Điểm tốt nhất ${c.progress.bestScore}`}
                    />
                    {c.progress.bestScore >= WRITING_PASS_SCORE ? (
                      <Chip tone="success">Đạt chuẩn</Chip>
                    ) : c.progress.practised > 0 ? (
                      <Chip tone="info">
                        Đã luyện <span className="num">{c.progress.practised}</span> lần
                      </Chip>
                    ) : (
                      <Chip>Chưa luyện</Chip>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
