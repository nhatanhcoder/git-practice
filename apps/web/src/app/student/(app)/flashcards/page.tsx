"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  canSubmitRating,
  formatStat,
  isStaleResponse,
  resolveListOutcome,
} from "@/lib/student/srs-session";
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
 * /student/flashcards — vocabulary SRS, the one learner screen backed by a real endpoint.
 *
 * A05 moved this file here from `/student/mistakes`. Until then the API-backed screen sat at the
 * mistake-notebook route while `/student/flashcards` served a local Leitner mock, so the sidebar
 * item named "Flashcard" opened the fake one. The mistake notebook is a separate Sprint 4
 * feature and keeps its own route — see `lib/student/srs-routes.ts`.
 *
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
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewedInSession, setReviewedInSession] = useState(0);

  // A04: two guards the component owns, because React state cannot provide either.
  //
  // `requestSeq` numbers every list request so a slow response for a level the person has
  // already navigated away from is dropped instead of overwriting the newer one.
  //
  // `submitLock` is a ref, not the `submitting` state, because state updates are asynchronous:
  // two clicks in the same tick both read submitting === false and both fire a POST.
  const requestSeq = useRef(0);
  const submitLock = useRef(false);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchSrsStats());
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }, []);

  const loadCards = useCallback(async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setMainError(false);
    setActiveIndex(null);
    setRevealed(false);
    setReviewError(null);
    setReviewedInSession(0);
    try {
      const next = mode === "due" ? await fetchDueFlashcards() : await fetchFlashcards(level);
      // Dropped rather than applied: this response is for a level or mode the person has
      // already moved on from.
      if (isStaleResponse(seq, requestSeq.current)) return;
      setCards(next);
    } catch {
      if (isStaleResponse(seq, requestSeq.current)) return;
      setMainError(true);
    } finally {
      if (!isStaleResponse(seq, requestSeq.current)) setLoading(false);
    }
  }, [level, mode]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  const activeCard = activeIndex === null ? null : (cards[activeIndex] ?? null);

  const outcome = resolveListOutcome({
    loading,
    error: mainError,
    cardCount: cards.length,
    reviewedInSession,
    mode,
  });

  const statTiles = useMemo(
    () => [
      // formatStat, not `?? 0`: a missing value must read as "—". Showing 0 for "nothing came
      // back" is how a failed stats call turns into a confident wrong number.
      { label: "Đến hạn", value: formatStat(stats?.dueToday), icon: <RotateCcw size={18} /> },
      { label: "Đã học", value: formatStat(stats?.totalCards), icon: <Layers3 size={18} /> },
      { label: "Ghi nhớ", value: formatStat(stats?.retentionRate, "%"), icon: <Brain size={18} /> },
      { label: "Lượt ôn", value: formatStat(stats?.totalReviews), icon: <CheckCircle2 size={18} /> },
    ],
    [stats],
  );

  async function rate(rating: SrsRating) {
    if (!canSubmitRating({ hasCard: !!activeCard, revealed, submitting })) return;
    // The ref closes the window `submitting` cannot: a second click in the same tick still
    // sees the old state, but never the old ref.
    if (submitLock.current) return;
    submitLock.current = true;

    setSubmitting(true);
    setReviewError(null);
    try {
      await reviewFlashcard(activeCard!.id, rating);

      // Only past this line has the server accepted the answer. Everything below is the
      // consequence of a confirmed write, never an optimistic guess.
      setReviewedInSession((n) => n + 1);

      // Stats are refreshed after the fact and are allowed to fail on their own: a failed
      // GET here must NOT re-send the POST to "fix" the number, which would advance SM-2
      // twice for one answer.
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
      // The card stays on screen, still flipped, with the ratings live. The old code set the
      // page-level error, which replaced the card with a full-page error state and lost the
      // answer the person had just given.
      //
      // No automatic replay: POST /student/flashcards/:id/review carries no idempotency key in
      // the approved contract, so a retry after an ambiguous failure could count one answer
      // twice. Retrying is the person's decision, taken with the card in front of them.
      setReviewError("Chưa lưu được kết quả. Thẻ vẫn giữ nguyên — bạn có thể chấm lại.");
    } finally {
      submitLock.current = false;
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

      {outcome === "loading" ? <SkeletonPanel rows={4} /> : null}

      {outcome === "error" ? (
        <ErrorState
          onRetry={() => {
            void loadCards();
            void loadStats();
          }}
        />
      ) : null}

      {activeCard ? (
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

              {reviewError ? (
                <p role="alert" className="srs-reviewError">
                  {reviewError}
                </p>
              ) : null}

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

      {/* Finishing a session and an unimported catalog are different facts. Before A04 both
          rendered "nguồn từ vựng production chưa được nhập", so completing every card told the
          learner the catalog was missing. */}
      {!activeCard && outcome === "session-complete" ? (
        <EmptyState
          icon={<CheckCircle2 size={22} />}
          title="Hoàn thành phiên ôn"
          text={`Bạn đã chấm ${reviewedInSession} thẻ trong phiên này. Thẻ tiếp theo sẽ đến hạn theo lịch SM-2.`}
        />
      ) : null}

      {!activeCard && outcome === "due-empty" ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="Không có thẻ đến hạn"
          text="Bạn đã hoàn thành hàng đợi hiện tại."
        />
      ) : null}

      {!activeCard && outcome === "catalog-empty" ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title={`Chưa có từ vựng HSK ${level}`}
          text="Nguồn từ vựng production chưa được nhập; hệ thống không hiển thị dữ liệu giả."
        />
      ) : null}

      {!activeCard && outcome === "has-cards" ? (
        <section className="srs-grid-3" aria-label="Danh sách từ vựng">
          {cards.map((card, index) => (
            <div key={card.id} className="srs-tile">
              <p lang="zh" className="srs-tile__hanzi han">
                {card.hanzi}
              </p>
              <p className="srs-tile__pinyin">{card.pinyin}</p>
              <p className="srs-tile__meaning">{card.meaning}</p>
              <button
                type="button"
                className="btn btn--sm btn--block"
                onClick={() => setActiveIndex(index)}
              >
                Ôn thẻ này
              </button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
