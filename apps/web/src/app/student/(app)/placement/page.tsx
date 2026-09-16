"use client";

/**
 * /student/placement — the level check, live against GET/POST /student/placement
 * (04-placement.md, Task C).
 *
 * Two rules shape this screen:
 * - Nothing is revealed during the quiz. The paper arrives stripped (the take-payload
 *   rule, INV-PLC-04) and the server grades at the end — showing right/wrong per
 *   question would leak the key and let a learner place themselves by trial.
 * - The level is computed and saved server-side (ADR-005, INV-PLC-05/06) into
 *   `User.hskLevelGoal`. The result card renders what the server returned, never a
 *   client-side recount.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Target } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  Ring,
  SkeletonPanel,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import {
  fetchPlacementPaper,
  submitPlacement,
  type PlacementPaper,
  type PlacementResult,
} from "@/lib/student/placement-service";

type Outcome = "loading" | "error" | "empty" | "quiz" | "done";

export default function PlacementPage() {
  const [paper, setPaper] = useState<PlacementPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const pushToast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetchPlacementPaper();
      setPaper(res);
      setIdx(0);
      setPicked({});
      setResult(null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = useMemo(() => paper?.questions ?? [], [paper]);
  const current = questions[idx] ?? null;
  const answeredCount = useMemo(
    () => questions.filter((q) => picked[q.questionId]).length,
    [questions, picked],
  );

  const outcome: Outcome = loading
    ? "loading"
    : loadError
      ? "error"
      : !paper || questions.length === 0
        ? "empty"
        : result
          ? "done"
          : "quiz";

  async function finish() {
    if (submitting || !paper) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const answers = questions.map((q) => ({
        questionId: q.questionId,
        selectedOptions: picked[q.questionId] ? [picked[q.questionId]] : [],
      }));
      const res = await submitPlacement(answers);
      setResult(res);
      pushToast(`Đã lưu trình độ: HSK ${res.level}`, "success");
    } catch {
      setSubmitError(true);
      pushToast("Chấm bài thất bại — thử gửi lại.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- Result ---------- */
  if (outcome === "done" && result) {
    const percent = result.total > 0 && questions.length > 0
      ? Math.round((result.total / questions.length) * 100)
      : 0;
    return (
      <div className="stack gap-6">
        <Link href="/student" className="backlink">
          <ArrowLeft size={14} /> Trang chủ
        </Link>
        <PageHead
          eyebrow="Xếp cấp HSK"
          title="Kết quả xếp cấp"
          sub={`Đúng ${result.total}/${questions.length} câu — chấm và lưu trên server`}
        />

        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <Ring value={percent} size={128} stroke={10} label="Tỉ lệ đúng">
              <div className="stack">
                <span className="num" style={{ fontSize: "var(--step-4)", fontWeight: 700 }}>
                  {result.level}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>HSK đề xuất</span>
              </div>
            </Ring>
            <h2 style={{ fontSize: "var(--step-3)" }}>
              Nên bắt đầu từ <em style={{ color: "var(--accent)" }}>HSK {result.level}</em>
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: "52ch" }}>
              Cấp đề xuất là bậc cao nhất mà mọi bậc từ 1 tới đó đều có ít nhất một câu đúng —
              một câu may mắn ở bậc cao không đẩy bạn vượt cấp. Trình độ này đã được lưu vào hồ
              sơ của bạn.
            </p>

            <div className="grid grid--3" style={{ width: "100%" }}>
              {Object.entries(result.correctByLevel).map(([lv, correct]) => (
                <Metric key={lv} label={`HSK ${lv}`} value={`${correct}`} />
              ))}
            </div>

            <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn--outline" onClick={() => void load()}>
                Làm lại
              </button>
              <Link href="/student/flashcards" className="btn btn--primary">
                <Target size={15} /> Học từ vựng HSK {result.level}
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  /* ---------- Empty / error ---------- */
  if (outcome === "empty") {
    return (
      <div className="stack gap-6">
        <Link href="/student" className="backlink">
          <ArrowLeft size={14} /> Trang chủ
        </Link>
        <PageHead
          eyebrow="Xếp cấp HSK"
          title="Bài xếp cấp"
          sub="Kiểm tra trình độ để hệ thống đề xuất cấp phù hợp"
        />
        <Panel className="panel--pad">
          <EmptyState
            icon={<Target size={22} />}
            title="Chưa có câu hỏi xếp cấp"
            text="Ngân hàng câu hỏi chưa có câu hỏi trắc nghiệm ở bậc 1 — bài xếp cấp cần đề thật nên hệ thống không tự đặt câu hỏi thay."
          />
          {paper?.savedLevel != null ? (
            <p className="section-sub" style={{ textAlign: "center" }}>
              Trình độ đã lưu trước đó: <Chip tone="info">HSK {paper.savedLevel}</Chip>
            </p>
          ) : null}
        </Panel>
      </div>
    );
  }

  if (outcome === "error") {
    return (
      <div className="stack gap-6">
        <Link href="/student" className="backlink">
          <ArrowLeft size={14} /> Trang chủ
        </Link>
        <PageHead eyebrow="Xếp cấp HSK" title="Bài xếp cấp" />
        <ErrorState onRetry={() => void load()} />
      </div>
    );
  }

  if (outcome === "loading") {
    return (
      <div className="stack gap-6">
        <PageHead eyebrow="Xếp cấp HSK" title="Bài xếp cấp" sub="Đang tải đề…" />
        <SkeletonPanel rows={4} />
      </div>
    );
  }

  /* ---------- Quiz — no reveal until the server grades ---------- */
  return (
    <div className="stack gap-6">
      <Link href="/student" className="backlink">
        <ArrowLeft size={14} /> Trang chủ
      </Link>
      <PageHead
        eyebrow="Xếp cấp HSK"
        title="Bài xếp cấp"
        sub={`${answeredCount}/${questions.length} câu · trình độ hiện tại${
          paper?.savedLevel != null ? `: HSK ${paper.savedLevel}` : ": chưa xếp"
        }`}
      />

      <Bar value={questions.length > 0 ? (answeredCount / questions.length) * 100 : 0} />

      {current ? (
        <Panel className="panel--pad stack gap-5">
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <Chip tone="neutral">Câu {idx + 1}/{questions.length}</Chip>
            <Chip tone="info">HSK {current.hskLevel}</Chip>
            <Chip tone="neutral">{current.skill === "listening" ? "Nghe" : "Đọc"}</Chip>
          </div>

          <p style={{ fontSize: "var(--step-2)", fontWeight: 600 }}>
            {current.content?.prompt ?? "(Câu hỏi không có nội dung)"}
          </p>

          {current.content?.audioUrl ? (
            <audio controls preload="none" src={current.content.audioUrl} style={{ width: "100%" }} />
          ) : null}

          {current.content?.passage ? (
            <p style={{ color: "var(--text-2)", whiteSpace: "pre-wrap" }}>{current.content.passage}</p>
          ) : null}

          <div className="stack gap-2" role="radiogroup" aria-label="Chọn đáp án">
            {current.options.map((opt) => {
              const active = picked[current.questionId] === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`btn ${active ? "btn--primary" : "btn--outline"} btn--block`}
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => setPicked((p) => ({ ...p, [current.questionId]: opt.id }))}
                >
                  {active ? <Check size={16} /> : null}
                  {opt.text}
                </button>
              );
            })}
          </div>

          {submitError ? (
            <p style={{ color: "var(--danger)" }}>
              Chưa gửi được bài — đáp án của bạn vẫn còn nguyên, thử lại.
            </p>
          ) : null}

          <div className="row gap-3" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btn btn--outline"
              disabled={idx === 0 || submitting}
              onClick={() => setIdx((n) => Math.max(0, n - 1))}
            >
              Câu trước
            </button>
            {idx + 1 < questions.length ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting}
                onClick={() => setIdx((n) => Math.min(questions.length - 1, n + 1))}
              >
                Câu sau
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting}
                onClick={() => void finish()}
              >
                {submitting ? "Đang chấm…" : `Nộp bài (${answeredCount}/${questions.length})`}
              </button>
            )}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
