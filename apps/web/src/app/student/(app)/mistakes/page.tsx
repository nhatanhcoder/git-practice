"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Brain, CheckCircle2, Layers3, RotateCcw } from "lucide-react";
import { Card, EmptyState, ErrorState, GhostButton, LoadingState, PrimaryButton } from "@/components/student/ui";
import {
  fetchDueFlashcards,
  fetchFlashcards,
  fetchSrsStats,
  reviewFlashcard,
  type Flashcard,
  type SrsRating,
  type SrsStats,
} from "@/lib/student/flashcards-service";

type Mode = "browse" | "due";

const RATINGS: Array<{ value: SrsRating; label: string; hint: string; tone: string }> = [
  { value: 0, label: "Quên", hint: "Ôn lại ngày mai", tone: "border-red-200 text-red-700 hover:bg-red-50" },
  { value: 3, label: "Khó", hint: "Nhớ có cố gắng", tone: "border-amber-200 text-amber-700 hover:bg-amber-50" },
  { value: 4, label: "Tốt", hint: "Nhớ chính xác", tone: "border-blue-200 text-blue-700 hover:bg-blue-50" },
  { value: 5, label: "Dễ", hint: "Nhớ ngay lập tức", tone: "border-green-200 text-green-700 hover:bg-green-50" },
];

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

  const activeCard = activeIndex === null ? null : cards[activeIndex] ?? null;
  const statTiles = useMemo(
    () => [
      { label: "Đến hạn", value: stats?.dueToday ?? "—", icon: RotateCcw },
      { label: "Đã học", value: stats?.totalCards ?? "—", icon: Layers3 },
      { label: "Ghi nhớ", value: stats ? `${stats.retentionRate}%` : "—", icon: Brain },
      { label: "Lượt ôn", value: stats?.totalReviews ?? "—", icon: CheckCircle2 },
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
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-sp-primary">SM-2 · HSK 1–9</p>
          <h1 className="sp-font-head mt-1 text-3xl font-black text-sp-ink">Ôn tập SRS</h1>
          <p className="mt-2 max-w-2xl text-sm text-sp-ink2">Ôn đúng lúc theo lịch cá nhân. Kết quả này không phải điểm chính thức của lớp.</p>
        </div>
        <div className="flex gap-2" role="tablist" aria-label="Chế độ ôn tập">
          <GhostButton active={mode === "browse"} onClick={() => setMode("browse")}>Duyệt từ vựng</GhostButton>
          <GhostButton active={mode === "due"} onClick={() => setMode("due")}>Thẻ đến hạn</GhostButton>
        </div>
      </header>

      {statsError ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Không tải được thống kê; danh sách thẻ vẫn có thể sử dụng.</div>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Thống kê SRS">
          {statTiles.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between text-sp-ink2"><span className="text-xs font-bold uppercase tracking-wide">{label}</span><Icon size={20} aria-hidden="true" /></div>
              <strong className="sp-font-head mt-2 block text-3xl font-black text-sp-ink">{value}</strong>
            </Card>
          ))}
        </section>
      )}

      {mode === "browse" && activeIndex === null ? (
        <div className="flex flex-wrap gap-2" aria-label="Chọn cấp HSK">
          {Array.from({ length: 9 }, (_, index) => index + 1).map((item) => (
            <GhostButton key={item} active={level === item} onClick={() => setLevel(item)}>HSK {item}</GhostButton>
          ))}
        </div>
      ) : null}

      {loading ? <LoadingState rows={4} /> : null}
      {!loading && mainError ? <ErrorState onRetry={() => { void loadCards(); void loadStats(); }} /> : null}

      {!loading && !mainError && activeCard ? (
        <Card className="mx-auto max-w-2xl p-6 text-center sm:p-10">
          <p className="text-sm font-bold text-sp-ink3">Thẻ {Number(activeIndex) + 1} / {cards.length}</p>
          <p lang="zh" className="sp-font-head mt-6 text-5xl font-black text-sp-ink">{activeCard.hanzi}</p>
          <p className="mt-3 text-xl font-bold text-sp-primary">{activeCard.pinyin}</p>
          {!revealed ? (
            <PrimaryButton className="mt-8" icon={RotateCcw} onClick={() => setRevealed(true)}>Lật thẻ</PrimaryButton>
          ) : (
            <div className="mt-8 space-y-6" aria-live="polite">
              <div className="rounded-2xl bg-sp-primary-soft p-5">
                <p className="text-xl font-bold text-sp-ink">{activeCard.meaning}</p>
                {activeCard.exampleSentence ? <p lang="zh" className="mt-3 text-lg text-sp-ink">{activeCard.exampleSentence}</p> : null}
                {activeCard.exampleMeaning ? <p className="mt-1 text-sm text-sp-ink2">{activeCard.exampleMeaning}</p> : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-4" aria-label="Đánh giá mức độ nhớ">
                {RATINGS.map((rating) => (
                  <button key={rating.value} type="button" disabled={submitting} onClick={() => void rate(rating.value)} className={`rounded-xl border bg-white px-3 py-3 text-sm font-extrabold transition-colors disabled:opacity-50 ${rating.tone}`}>
                    {rating.label}<span className="mt-1 block text-[11px] font-medium opacity-80">{rating.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : null}

      {!loading && !mainError && !activeCard && cards.length === 0 ? (
        <EmptyState icon={BookOpen} title={mode === "due" ? "Không có thẻ đến hạn" : `Chưa có từ vựng HSK ${level}`} desc={mode === "due" ? "Bạn đã hoàn thành hàng đợi hiện tại." : "Nguồn từ vựng production chưa được nhập; hệ thống không hiển thị dữ liệu giả."} />
      ) : null}

      {!loading && !mainError && !activeCard && cards.length > 0 ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Danh sách từ vựng">
          {cards.map((card, index) => (
            <Card key={card.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3"><div><p lang="zh" className="sp-font-head text-2xl font-black text-sp-ink">{card.hanzi}</p><p className="mt-1 font-bold text-sp-primary">{card.pinyin}</p></div><span className="rounded-full bg-sp-primary-soft px-2.5 py-1 text-xs font-bold text-sp-primary">HSK {card.hskLevel}</span></div>
              <p className="mt-3 line-clamp-2 text-sm text-sp-ink2">{card.meaning}</p>
              <PrimaryButton className="mt-5" full onClick={() => setActiveIndex(index)}>Ôn thẻ này</PrimaryButton>
            </Card>
          ))}
        </section>
      ) : null}
    </div>
  );
}
