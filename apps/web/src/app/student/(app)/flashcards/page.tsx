"use client";

/**
 * /student/flashcards — vocabulary review.
 *
 * One card at a time, flipped by click or space, rated with 1 / 2 / 3. The
 * rating moves the card through the Leitner boxes in the store, which is the
 * same mechanism the mistake notebook uses — one scheduler, not two.
 *
 * MOCK(student): content from `lib/student/content.ts`; no API call.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Layers, RotateCcw, Search, Sparkles } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  AudioButton,
  DemoStateSwitcher,
  LevelSelector,
  Pagination,
  type DemoState,
} from "@/components/student/controls";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { vocabCards, vocabTopics } from "@/lib/student/content";
import { boxInterval } from "@/lib/student/student-rules";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PER_PAGE = 12;

type Filter = "all" | "new" | "learning" | "mastered";

export default function FlashcardsPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [level, setLevel] = useState<number | "all">(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [topic, setTopic] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [page, setPage] = useState(1);
  const [session, setSession] = useState({ again: 0, good: 0, mastered: 0, xp: 0 });

  const vocabBox = useStudentStore((s) => s.vocabBox);
  const rateVocab = useStudentStore((s) => s.rateVocab);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vocabCards.filter((c) => {
      const box = vocabBox[c.id] ?? 0;
      if (level !== "all" && c.level !== level) return false;
      if (topic !== "all" && c.topic !== topic) return false;
      if (filter === "new" && box !== 0) return false;
      if (filter === "learning" && (box === 0 || box >= 5)) return false;
      if (filter === "mastered" && box < 5) return false;
      if (!q) return true;
      return (
        c.hanzi.includes(q) || c.pinyin.toLowerCase().includes(q) || c.vi.toLowerCase().includes(q)
      );
    });
  }, [level, topic, filter, query, vocabBox]);

  const current = cards[idx % Math.max(cards.length, 1)];

  const stats = useMemo(() => {
    const boxes = vocabCards.map((c) => vocabBox[c.id] ?? 0);
    return {
      total: vocabCards.length,
      newCards: boxes.filter((b) => b === 0).length,
      learning: boxes.filter((b) => b > 0 && b < 5).length,
      mastered: boxes.filter((b) => b >= 5).length,
    };
  }, [vocabBox]);

  const rate = useCallback(
    (kind: "again" | "good" | "mastered") => {
      if (!current) return;
      const xp = kind === "again" ? 0 : kind === "good" ? 10 : 15;
      rateVocab(current.id, kind !== "again");
      if (kind === "mastered") rateVocab(current.id, true);
      if (xp > 0) awardXp(xp, 1);
      setSession((s) => ({ ...s, [kind]: s[kind] + 1, xp: s.xp + xp }));
      setFlipped(false);
      setIdx((i) => i + 1);
    },
    [current, rateVocab, awardXp],
  );

  // Keyboard shortcuts: space flips, 1/2/3 rate. Ignored while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) return;
      if (e.key === "1") rate("again");
      else if (e.key === "2") rate("good");
      else if (e.key === "3") rate("mastered");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, rate]);

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="eyebrow">Luyện tập</p>
          <h1 className="pagehead__title">Flashcard từ vựng HSK</h1>
          <p className="pagehead__sub">
            Luyện phản xạ và ghi nhớ từ vựng qua thẻ lật 3D theo phương pháp Spaced Repetition (SRS).
          </p>
        </div>
        <DemoStateSwitcher value={demo} onChange={setDemo} />
      </header>

      {demo === "loading" ? (
        <SkeletonPanel rows={4} height={260} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Overview ---------- */}
          <Panel className="panel--pad stack gap-5" aria-label="Chọn cấp độ HSK">
            <div className="stack gap-2">
              <span className="metric__label">Cấp độ HSK</span>
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
                  onChange={(id) => {
                    setLevel(id);
                    setIdx(0);
                    setPage(1);
                  }}
                />
              </div>
            </div>
            <div className="divider" />
            <div className="row gap-6 wrap">
              <Metric label="Tổng từ vựng" value={stats.total} icon={<Layers size={14} />} />
              <Metric label="Thành thạo" value={stats.mastered} color="var(--success)" />
              <Metric label="Đang luyện" value={stats.learning} color="var(--warn)" />
              <Metric label="Chưa học" value={stats.newCards} color="var(--text-3)" />
              <div className="grow stack gap-1" style={{ minWidth: 200, justifyContent: "center" }}>
                <span className="metric__label">{level === "all" ? "Toàn bộ HSK" : `HSK ${level}`}</span>
                <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                  Học theo nhịp nhớ của bạn; thẻ cần ôn sẽ quay lại sớm hơn.
                </p>
              </div>
            </div>
          </Panel>

          {/* ---------- Filters ---------- */}
          <section className="stack gap-4" aria-labelledby="flashcard-deck-title">
            <SectionHeader
              id="flashcard-deck-title"
              title={level === "all" ? "Bộ thẻ toàn cấp" : `Bộ thẻ HSK ${level}`}
              sub="Bấm vào thẻ hoặc dùng phím Space để lật xem nghĩa và Pinyin. Dùng phím 1, 2, 3 để tự đánh giá."
              action={<Chip tone="accent">{cards.length > 0 ? `${(idx % cards.length) + 1} / ${cards.length} thẻ` : "0 thẻ"}</Chip>}
            />
            <div className="stack gap-4">
              <label className="field">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setIdx(0);
                    setPage(1);
                  }}
                  placeholder="Tìm chữ Hán, pinyin hoặc nghĩa…"
                  aria-label="Tìm từ vựng"
                />
              </label>

              <div className="row gap-2 wrap">
                {(
                  [
                    ["all", "Tất cả"],
                    ["new", "Chưa học"],
                    ["learning", "Đang học"],
                    ["mastered", "Đã thuộc"],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`pill ${filter === key ? "is-active" : ""}`}
                    aria-pressed={filter === key}
                    onClick={() => {
                      setFilter(key);
                      setIdx(0);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <span className="dot" aria-hidden="true" />
                <button
                  type="button"
                  className={`pill ${topic === "all" ? "is-active" : ""}`}
                  aria-pressed={topic === "all"}
                  onClick={() => setTopic("all")}
                >
                  Mọi chủ đề
                </button>
                {vocabTopics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`pill ${topic === t ? "is-active" : ""}`}
                    aria-pressed={topic === t}
                    onClick={() => {
                      setTopic(t);
                      setIdx(0);
                      setPage(1);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ---------- The card ---------- */}
          {demo === "empty" || cards.length === 0 || !current ? (
            <Panel className="panel--pad">
              <EmptyState
                title="Không có thẻ nào khớp bộ lọc"
                text="Bỏ bớt bộ lọc, hoặc chọn «Tất cả» để ôn lại toàn bộ."
                action={
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      setFilter("all");
                      setLevel("all");
                      setTopic("all");
                      setQuery("");
                    }}
                  >
                    Xoá bộ lọc
                  </button>
                }
              />
            </Panel>
          ) : (
            <Panel className="panel--pad">
              <SectionHeader
                title={`Thẻ ${(idx % cards.length) + 1}/${cards.length}`}
                sub={`Hộp ${vocabBox[current.id] ?? 0} · ${boxInterval(vocabBox[current.id] ?? 1)}`}
                action={
                  <div className="row gap-2">
                    <Chip tone="accent">HSK {current.level}</Chip>
                    <Chip>{current.topic}</Chip>
                  </div>
                }
              />

              <div className="stack gap-5">
                <div className="flashcard-container">
                  <button
                    type="button"
                    className={`flashcard-card ${flipped ? "is-flipped" : ""}`}
                    onClick={() => setFlipped((f) => !f)}
                    aria-label={flipped ? "Lật về mặt trước" : "Lật xem đáp án"}
                    style={{ width: "100%", height: "100%" }}
                  >
                    <span className="flashcard-face">
                      <span className="flashcard__glyph han">{current.hanzi}</span>
                      <span className="flashcard__hint">Bấm hoặc nhấn phím cách để lật</span>
                    </span>
                    <span className="flashcard-face flashcard-face--back">
                      <span className="flashcard__pinyin pinyin">{current.pinyin}</span>
                      <span className="flashcard__vi vi-meaning">{current.vi}</span>
                      {current.examples[0] ? (
                        <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                          <span className="han">{current.examples[0].word}</span> ·{" "}
                          {current.examples[0].vi}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </div>

                <div className="row gap-3" style={{ justifyContent: "center" }}>
                  <AudioButton say={current.hanzi} label={current.hanzi} size={40} />
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setFlipped((f) => !f)}
                  >
                    <RotateCcw size={14} /> Lật thẻ
                  </button>
                </div>

                {flipped ? (
                  <div className="flashcard-ans-grid">
                    <button
                      type="button"
                      className="flashcard-ans-btn flashcard-ans-btn--again"
                      onClick={() => rate("again")}
                    >
                      Chưa nhớ
                      <span className="key-hint">phím 1</span>
                    </button>
                    <button
                      type="button"
                      className="flashcard-ans-btn flashcard-ans-btn--good"
                      onClick={() => rate("good")}
                    >
                      Nhớ (+10 XP)
                      <span className="key-hint">phím 2</span>
                    </button>
                    <button
                      type="button"
                      className="flashcard-ans-btn flashcard-ans-btn--master"
                      onClick={() => rate("mastered")}
                    >
                      Quá dễ (+15 XP)
                      <span className="key-hint">phím 3</span>
                    </button>
                  </div>
                ) : (
                  <p style={{ textAlign: "center", color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                    Lật thẻ để chấm mức nhớ.
                  </p>
                )}

                {session.again + session.good + session.mastered > 0 ? (
                  <div className="row gap-4 wrap" style={{ justifyContent: "center" }}>
                    <Chip tone="danger">Chưa nhớ {session.again}</Chip>
                    <Chip tone="info">Nhớ {session.good}</Chip>
                    <Chip tone="success">Quá dễ {session.mastered}</Chip>
                    <Chip tone="warn">
                      <Sparkles size={12} /> +{session.xp} XP
                    </Chip>
                  </div>
                ) : null}
              </div>
            </Panel>
          )}

          {/* ---------- Full list ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                  Danh sách từ
                </h2>
                <p className="section-sub">
                  <span className="num">{cards.length}</span> từ khớp bộ lọc
                </p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {cards.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((c) => {
                const box = vocabBox[c.id] ?? 0;
                return (
                  <div key={c.id} className="rowitem">
                    <AudioButton say={c.hanzi} label={c.hanzi} size={32} />
                    <span className="grow stack gap-1">
                      <span className="han" style={{ fontSize: "var(--step-1)" }}>
                        {c.hanzi}
                      </span>
                      <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--2)" }}>
                        {c.pinyin}
                      </span>
                    </span>
                    <span className="vi-meaning" style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                      {c.vi}
                    </span>
                    {box >= 5 ? (
                      <Chip tone="success" icon={<Check size={12} />}>
                        Thuộc
                      </Chip>
                    ) : box > 0 ? (
                      <Chip tone="info">Hộp {box}</Chip>
                    ) : (
                      <Chip>Mới</Chip>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="panel__foot">
              <Pagination
                page={page}
                totalItems={cards.length}
                pageSize={PER_PAGE}
                onPageChange={setPage}
                unit="từ"
              />
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
