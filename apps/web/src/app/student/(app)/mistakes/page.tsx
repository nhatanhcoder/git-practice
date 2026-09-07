"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, CheckCircle2, Layers3, RotateCcw } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { LevelSelector, Tabs } from "@/components/student/controls";
import "@/styles/hanlu/srs.css";
import {
  fetchDueFlashcards,
  fetchFlashcards,
  fetchSrsStats,
  reviewFlashcard,
  type Flashcard,
  type SrsRating,
  type SrsStats,
} from "@/lib/student/flashcards-service";

/**
 * SRS review, in the Hán Lộ visual language.
 *
 * A03 is a presentation change only. Every call into flashcards-service is byte-identical to
 * before — same functions, same arguments, same order — because this screen is the one part of
 * the learner area talking to a real endpoint, and the point of the task was to stop it being
 * the only screen written in the old design.
 *
 * What changed: the old `ui.tsx` primitives are gone, and with them the hardcoded Tailwind
 * light colours the four rating buttons carried (`border-red-200`, `text-amber-700` …). Those
 * were a third palette on top of the two the product already had, and they were unreadable
 * against the dark ground. Ratings now use the semantic Hán Lộ tokens, which follow the
 * light/dark switch like everything else.
 *
 * What did NOT change: SM-2, the four public ratings 0/3/4/5, the browse/due split, the HSK
 * 1–9 range, the payloads, or the schema.
 */

type Mode = "browse" | "due";

/**
 * The four ratings the API accepts. Kept as 0/3/4/5 — the SM-2 values — and NOT collapsed to a
 * three-button Leitner scale like the mock Flashcards screen uses; the backend rejects
 * anything outside this set.
 *
 * `token` names a semantic colour from tokens.css rather than a literal, so a rating reads the
 * same way in light and dark and never introduces a colour the design system does not own.
 */
const RATINGS: Array<{ value: SrsRating; label: string; hint: string; token: string }> = [
  { value: 0, label: "Quên", hint: "Ôn lại ngày mai", token: "var(--danger)" },
  { value: 3, label: "Khó", hint: "Nhớ có cố gắng", token: "var(--warn)" },
  { value: 4, label: "Tốt", hint: "Nhớ chính xác", token: "var(--info)" },
  { value: 5, label: "Dễ", hint: "Nhớ ngay lập tức", token: "var(--success)" },
];

const LEVELS = Array.from({ length: 9 }, (_, index) => ({ id: index + 1 }));

export default function MistakesPage() {
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>("browse");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainError, setMainError] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchSrsStats());
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setMainError(false);
    setActiveIndex(null);
    setRevealed(false);
    try {
      setCards(mode === "due" ? await fetchDueFlashcards() : await fetchFlashcards(level));
    } catch {
      setMainError(true);
    } finally {
      setLoading(false);
    }
  }, [level, mode]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const activeCard = activeIndex === null ? null : (cards[activeIndex] ?? null);

  const statTiles = useMemo(
    () => [
      { label: "Đến hạn", value: stats?.dueToday ?? "—", icon: <RotateCcw size={18} /> },
      { label: "Đã học", value: stats?.totalCards ?? "—", icon: <Layers3 size={18} /> },
      { label: "Ghi nhớ", value: stats ? `${stats.retentionRate}%` : "—", icon: <Brain size={18} /> },
      { label: "Lượt ôn", value: stats?.totalReviews ?? "—", icon: <CheckCircle2 size={18} /> },
    ],
    [stats],
  );

  async function rate(rating: SrsRating) {
    if (!activeCard || submitting) return;
    setSubmitting(true);
    try {
      await reviewFlashcard(activeCard.id, rating);
      await loadStats();
      const next = (activeIndex ?? 0) + 1;
      if (next >= cards.length) {
        setCards([]);
        setActiveIndex(null);
      } else {
        setActiveIndex(next);
      }
      setRevealed(false);
    } catch {
      setMainError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="SM-2 · HSK 1–9"
        title="Ôn tập SRS"
        sub="Ôn đúng lúc theo lịch cá nhân. Kết quả này không phải điểm chính thức của lớp."
        action={
          <Tabs
            label="Chế độ ôn tập"
            active={mode}
            onChange={(id) => setMode(id as Mode)}
            tabs={[
              { id: "browse", label: "Duyệt từ vựng" },
              { id: "due", label: "Thẻ đến hạn" },
            ]}
          />
        }
      />

      {/* Stats failing must not take the card list down with it — they are two independent
          requests, and the list is the part someone came here to use. */}
      {statsError ? (
        <div role="status" className="panel srs-note">
          Không tải được thống kê; danh sách thẻ vẫn có thể sử dụng.
        </div>
      ) : (
        <section className="srs-grid-4" aria-label="Thống kê SRS">
          {statTiles.map((tile) => (
            <Metric key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} />
          ))}
        </section>
      )}

      {mode === "browse" && activeIndex === null ? (
        <LevelSelector levels={LEVELS} value={level} onChange={setLevel} label="Chọn cấp HSK" />
      ) : null}

      {loading ? <SkeletonPanel rows={4} /> : null}

      {!loading && mainError ? (
        <ErrorState
          onRetry={() => {
            void loadCards();
            void loadStats();
          }}
        />
      ) : null}

      {!loading && !mainError && activeCard ? (
        <Panel className="srs-card">
          <p className="srs-card__counter">
            Thẻ {Number(activeIndex) + 1} / {cards.length}
          </p>

          <p lang="zh" className="srs-card__hanzi han">
            {activeCard.hanzi}
          </p>
          <p className="srs-card__pinyin">{activeCard.pinyin}</p>

          {!revealed ? (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setRevealed(true)}>
              <RotateCcw size={16} /> Lật thẻ
            </button>
          ) : (
            <div className="stack gap-5" aria-live="polite">
              <div className="srs-card__back">
                <p className="srs-card__meaning">{activeCard.meaning}</p>
                {/* Example and audio are shown only when the record actually carries them.
                    A plausible-looking sentence invented here would be indistinguishable from
                    real content to the learner. */}
                {activeCard.exampleSentence ? (
                  <p lang="zh" className="srs-card__example han">
                    {activeCard.exampleSentence}
                  </p>
                ) : null}
                {activeCard.exampleMeaning ? (
                  <p className="srs-card__exampleVi">{activeCard.exampleMeaning}</p>
                ) : null}
              </div>

              <div className="srs-ratings" aria-label="Đánh giá mức độ nhớ">
                {RATINGS.map((rating) => (
                  <button
                    key={rating.value}
                    type="button"
                    className="srs-rating"
                    style={{ "--srs-rating": rating.token } as React.CSSProperties}
                    disabled={submitting}
                    onClick={() => void rate(rating.value)}
                  >
                    <strong>{rating.label}</strong>
                    <span>{rating.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      {!loading && !mainError && !activeCard && cards.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title={mode === "due" ? "Không có thẻ đến hạn" : `Chưa có từ vựng HSK ${level}`}
          text={
            mode === "due"
              ? "Bạn đã hoàn thành hàng đợi hiện tại."
              : "Nguồn từ vựng production chưa được nhập; hệ thống không hiển thị dữ liệu giả."
          }
        />
      ) : null}

      {!loading && !mainError && !activeCard && cards.length > 0 ? (
        <section className="srs-grid-3" aria-label="Danh sách từ vựng">
          {cards.map((card, index) => (
            <Panel key={card.id} className="srs-tile">
              <div className="row gap-3">
                <div className="stack gap-1 grow">
                  <p lang="zh" className="srs-tile__hanzi han">
                    {card.hanzi}
                  </p>
                  <p className="srs-tile__pinyin">{card.pinyin}</p>
                </div>
                <span className="pill">HSK {card.hskLevel}</span>
              </div>
              <p className="srs-tile__meaning">{card.meaning}</p>
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => setActiveIndex(index)}
              >
                Ôn thẻ này
              </button>
            </Panel>
          ))}
        </section>
      ) : null}
    </div>
  );
}
