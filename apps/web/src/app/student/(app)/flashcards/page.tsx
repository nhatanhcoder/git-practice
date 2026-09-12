"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, BookmarkPlus, Brain, CheckCircle2, Layers3, RotateCcw } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { LevelSelector, Pagination, Tabs } from "@/components/student/controls";
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
import {
  deleteSavedWord,
  fetchBankReviewCards,
  fetchWordBank,
  saveWord,
  type BankReviewCard,
  type SavedWord,
} from "@/lib/student/word-bank-service";

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

type Mode = "browse" | "due" | "bank";

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
const PAGE_SIZE = 16;

export default function MistakesPage() {
  const [level, setLevel] = useState(1);
  const [mode, setMode] = useState<Mode>("browse");
  const [page, setPage] = useState(1);
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

  // Word bank (S-SRS-6/7, 02-word-bank.md): a bookmark list on the same screen. Banked
  // words are a separate fact from the card list — separate state, separate errors — so a
  // failed bank load never blanks the browse tab and vice versa.
  const [bank, setBank] = useState<SavedWord[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankError, setBankError] = useState(false);
  const [bankTotal, setBankTotal] = useState(0);
  const [savedHanzi, setSavedHanzi] = useState<Set<string>>(new Set());
  const [saveBusy, setSaveBusy] = useState<string | null>(null);

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
    setPage(1);
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

  // The bank loads when the learner opens its tab (and once at mount to know which tiles
  // are already bookmarked). Loading it eagerly alongside the card list would couple the
  // two tabs' error states together.
  const loadBank = useCallback(async () => {
    setBankLoading(true);
    setBankError(false);
    try {
      const res = await fetchWordBank();
      setBank(res.data);
      setBankTotal(res.meta.total);
      setSavedHanzi(new Set(res.data.map((word) => word.hanzi)));
    } catch {
      setBankError(true);
    } finally {
      setBankLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBank();
  }, [loadBank]);

  // The bank must refetch whenever the learner ENTERS the tab: the mount-time fetch
  // cannot know about a save made moments ago, and showing a stale empty list after a
  // save is exactly the "invented data" family this screen refuses elsewhere.
  useEffect(() => {
    if (mode === "bank") void loadBank();
  }, [mode, loadBank]);

  const saveLock = useRef(false);

  async function saveToBank(card: Flashcard) {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaveBusy(card.id);
    try {
      await saveWord({
        hanzi: card.hanzi,
        pinyin: card.pinyin,
        meaning: card.meaning,
        sourceType: "flashcard_browser",
      });
      // Only past this line did the server confirm. The tile turns saved-state from the
      // server's row, never from an optimistic guess.
      setSavedHanzi((prev) => new Set(prev).add(card.hanzi));
    } catch {
      // The word stays unsaved; the button's state does not change. A failed save painted
      // as saved is the WEB-011 defect class in miniature.
    } finally {
      saveLock.current = false;
      setSaveBusy(null);
    }
  }

  async function removeFromBank(word: SavedWord) {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaveBusy(word.id);
    try {
      await deleteSavedWord(word.id);
      setBank((prev) => prev.filter((row) => row.id !== word.id));
      setBankTotal((n) => Math.max(0, n - 1));
      setSavedHanzi((prev) => {
        const next = new Set(prev);
        next.delete(word.hanzi);
        return next;
      });
    } catch {
      // Nothing is removed on failure — the list stays as the server last said it was.
    } finally {
      saveLock.current = false;
      setSaveBusy(null);
    }
  }

  const [bankSession, setBankSession] = useState<BankReviewCard[] | null>(null);
  const [bankSessionIndex, setBankSessionIndex] = useState<number | null>(null);

  async function startBankReview() {
    if (saveLock.current) return;
    saveLock.current = true;
    try {
      const sessionCards = await fetchBankReviewCards();
      setBankSession(sessionCards);
      setBankSessionIndex(sessionCards.length > 0 ? 0 : null);
    } catch {
      setBankSession(null);
    } finally {
      saveLock.current = false;
    }
  }

  const activeCard = activeIndex === null ? null : (cards[activeIndex] ?? null);

  // The bank tab renders its own tree below; the card-list outcome only applies to the
  // two SRS modes, so the "bank" mode is narrowed away here.
  const outcome = resolveListOutcome({
    loading,
    error: mainError,
    cardCount: cards.length,
    reviewedInSession,
    mode: mode === "bank" ? "browse" : mode,
  });

  const statTiles = useMemo(
    () => [
      // formatStat, not `?? 0`: a missing value must read as "—". Showing 0 for "nothing came
      // back" is how a failed stats call turns into a confident wrong number.
      {
        id: "due",
        label: "Đến hạn",
        value: formatStat(stats?.dueToday),
        icon: <RotateCcw size={16} />,
        className: "srs-stat--due",
      },
      {
        id: "learned",
        label: "Đã học",
        value: formatStat(stats?.totalCards),
        icon: <Layers3 size={16} />,
        className: "srs-stat--learned",
      },
      {
        id: "retention",
        label: "Ghi nhớ",
        value: formatStat(stats?.retentionRate, "%"),
        icon: <Brain size={16} />,
        className: "srs-stat--retention",
      },
      {
        id: "reviews",
        label: "Lượt ôn",
        value: formatStat(stats?.totalReviews),
        icon: <CheckCircle2 size={16} />,
        className: "srs-stat--reviews",
      },
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
      />

      {/* Stats failing must not take the card list down with it — they are two independent
          requests, and the list is the part someone came here to use. */}
      {statsError ? (
        <div role="status" className="panel srs-note">
          Không tải được thống kê; danh sách thẻ vẫn có thể sử dụng.
        </div>
      ) : (
        <section className="srs-stat-grid" aria-label="Thống kê SRS">
          {statTiles.map((tile) => (
            <div key={tile.id} className={`srs-stat ${tile.className}`}>
              <div className="srs-stat__top">
                <span className="srs-stat__icon" aria-hidden="true">
                  {tile.icon}
                </span>
                <span className="srs-stat__label">{tile.label}</span>
              </div>
              <span className="srs-stat__value num">{tile.value}</span>
            </div>
          ))}
        </section>
      )}

      <div className="srs-controls">
        <div className="srs-controls__bar">
          <Tabs
            label="Chế độ ôn tập"
            active={mode}
            onChange={(id) => {
              setMode(id as Mode);
              setPage(1);
            }}
            tabs={[
              { id: "browse", label: "Duyệt từ vựng" },
              { id: "due", label: "Thẻ đến hạn" },
              { id: "bank", label: `Kho từ${bankTotal > 0 ? ` (${bankTotal})` : ""}` },
            ]}
          />
        </div>
        {mode === "browse" && activeIndex === null ? (
          <div className="srs-controls__levels">
            <LevelSelector
              levels={LEVELS}
              value={level}
              onChange={(lvl) => {
                setLevel(lvl);
                setPage(1);
              }}
              label="Chọn cấp HSK"
            />
          </div>
        ) : null}
      </div>

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

      {/* The word bank tab (S-SRS-7): list, remove, and start a review session over the
          banked words. Bank state never touches the browse/due tabs above. */}
      {mode === "bank" ? (
        bankLoading ? (
          <SkeletonPanel rows={4} />
        ) : bankError ? (
          <ErrorState onRetry={() => void loadBank()} />
        ) : bankSession && bankSessionIndex !== null ? (
          <BankReviewCardPanel
            cards={bankSession}
            index={bankSessionIndex}
            onFinish={(nextCards) => {
              setBankSession(nextCards);
              setBankSessionIndex(null);
            }}
          />
        ) : bank.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={22} />}
            title="Kho từ còn trống"
            text="Nhấn “Lưu từ” trên bất kỳ thẻ nào trong Duyệt từ vựng để bắt đầu sưu tập từ của riêng bạn."
          />
        ) : (
          <div className="stack gap-4">
            <button type="button" className="btn btn--outline" onClick={() => void startBankReview()}>
              Ôn các từ trong kho
            </button>
            <section className="srs-vocab-grid" aria-label="Kho từ đã lưu">
              {bank.map((word) => (
                <Panel key={word.id} className="srs-tile">
                  <div className="srs-tile__header">
                    <div className="srs-tile__headings">
                      <p lang="zh" className="srs-tile__hanzi han">
                        {word.hanzi}
                      </p>
                      <p className="srs-tile__pinyin pinyin">{word.pinyin}</p>
                    </div>
                  </div>
                  <p className="srs-tile__meaning">{word.meaning}</p>
                  {word.note ? <p className="srs-tile__note">{word.note}</p> : null}
                  <div className="srs-tile__actions srs-tile__actions--row">
                    <button
                      type="button"
                      className="btn btn--outline"
                      disabled={saveBusy === word.id}
                      onClick={() => void removeFromBank(word)}
                    >
                      Bỏ lưu
                    </button>
                  </div>
                </Panel>
              ))}
            </section>
          </div>
        )
      ) : null}

      {/* The browse grid belongs to the two SRS modes only — the bank tab renders its own
          tree above, and stacking both made the bank's click targets unreachable. */}
      {!activeCard && mode !== "bank" && outcome === "has-cards" ? (
        <div className="stack gap-6">
          <section className="srs-vocab-grid" aria-label="Danh sách từ vựng">
            {cards
              .slice(
                (Math.min(Math.max(1, page), Math.max(1, Math.ceil(cards.length / PAGE_SIZE))) - 1) * PAGE_SIZE,
                Math.min(Math.max(1, page), Math.max(1, Math.ceil(cards.length / PAGE_SIZE))) * PAGE_SIZE,
              )
              .map((card) => (
                <Panel key={card.id} className="srs-tile">
                  <div className="srs-tile__header">
                    <div className="srs-tile__headings">
                      <p lang="zh" className="srs-tile__hanzi han">
                        {card.hanzi}
                      </p>
                      <p className="srs-tile__pinyin pinyin">{card.pinyin}</p>
                    </div>
                    <span className="srs-tile__badge">HSK {card.hskLevel}</span>
                  </div>
                  <p className="srs-tile__meaning">{card.meaning}</p>
                  <div className="srs-tile__actions">
                    <div className="srs-tile__actions--row">
                      <button
                        type="button"
                        className="btn btn--outline srs-tile__save"
                        disabled={saveBusy === card.id || savedHanzi.has(card.hanzi)}
                        onClick={() => void saveToBank(card)}
                        title={
                          savedHanzi.has(card.hanzi)
                            ? "Đã có trong kho từ của bạn"
                            : "Lưu vào kho từ cá nhân"
                        }
                      >
                        <BookmarkPlus size={16} />
                        {savedHanzi.has(card.hanzi) ? "Đã lưu" : "Lưu từ"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--block srs-tile__btn"
                      onClick={() => setActiveIndex(cards.findIndex((c) => c.id === card.id))}
                    >
                      Ôn thẻ này
                    </button>
                  </div>
                </Panel>
              ))}
          </section>

          {Math.ceil(cards.length / PAGE_SIZE) > 1 ? (
            <div className="srs-pagination">
              <Pagination
                page={Math.min(Math.max(1, page), Math.max(1, Math.ceil(cards.length / PAGE_SIZE)))}
                totalItems={cards.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                unit="từ"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The bank review session (S-SRS-7): banked words shown one at a time in the same review
 * card as module 01's, and rated through the SAME endpoint — POST /student/flashcards/:id/review.
 * The backend hydrated each banked word into a real catalog card payload (id: the flashcard
 * id) precisely so no separate review path exists here.
 *
 * A banked word with id null has no catalog row (INV-WB-07) — it displays as a plain
 * dictionary tile with no rating buttons, because sending it to the review endpoint would
 * be a guaranteed 404.
 */
function BankReviewCardPanel({
  cards,
  index,
  onFinish,
}: {
  cards: BankReviewCard[];
  index: number;
  onFinish: (remaining: BankReviewCard[]) => void;
}) {
  const [current, setCurrent] = useState(index);
  const [revealed, setRevealed] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [reviewedCount, setReviewedCount] = useState(0);
  const ratingLock = useRef(false);

  const card = cards[current];

  async function rateBanked(rating: SrsRating) {
    if (!card?.id || ratingLock.current) return;
    ratingLock.current = true;
    setRatingBusy(true);
    setRatingError(null);
    try {
      await reviewFlashcard(card.id, rating);
      setReviewedCount((n) => n + 1);
      const next = current + 1;
      if (next >= cards.length) {
        onFinish(cards.slice(0, 0)); // session complete — back to the bank list
      } else {
        setCurrent(next);
        setRevealed(false);
      }
    } catch {
      setRatingError("Chưa lưu được kết quả. Thẻ vẫn giữ nguyên — bạn có thể chấm lại.");
    } finally {
      ratingLock.current = false;
      setRatingBusy(false);
    }
  }

  if (!card) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={22} />}
        title="Hoàn thành phiên ôn kho từ"
        text={`Bạn đã chấm ${reviewedCount} thẻ trong phiên này.`}
      />
    );
  }

  return (
    <Panel className="srs-card">
      <p className="srs-card__counter">
        Từ {current + 1} / {cards.length}
      </p>
      <p lang="zh" className="srs-card__hanzi han">
        {card.hanzi}
      </p>
      <p className="srs-card__pinyin">{card.pinyin}</p>

      {card.id === null ? (
        <p className="srs-note" role="status">
          Từ này chưa có trong danh mục thẻ, nên chưa xếp được lịch SM-2. Bạn vẫn có thể lưu
          lại để tra cứu.
        </p>
      ) : !revealed ? (
        <button type="button" className="btn btn--primary btn--lg" onClick={() => setRevealed(true)}>
          <RotateCcw size={16} /> Lật thẻ
        </button>
      ) : (
        <div className="stack gap-5" aria-live="polite">
          <div className="srs-card__back">
            <p className="srs-card__meaning">{card.meaning}</p>
            {card.exampleSentence ? (
              <p lang="zh" className="srs-card__example han">
                {card.exampleSentence}
              </p>
            ) : null}
            {card.exampleMeaning ? (
              <p className="srs-card__exampleVi">{card.exampleMeaning}</p>
            ) : null}
          </div>
          {ratingError ? (
            <p role="alert" className="srs-reviewError">
              {ratingError}
            </p>
          ) : null}
          <div className="srs-ratings" aria-label="Đánh giá mức độ nhớ">
            {RATINGS.map((rating) => (
              <button
                key={rating.value}
                type="button"
                className="srs-rating"
                style={{ "--srs-rating": rating.token } as React.CSSProperties}
                disabled={ratingBusy}
                onClick={() => void rateBanked(rating.value)}
              >
                <strong>{rating.label}</strong>
                <span>{rating.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
