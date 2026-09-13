"use client";

/**
 * /student/attempts/[attemptId]/result — the official score and the teacher's feedback.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-attempt-result.md
 * Features: S-ASGN-7 (result), S-ASGN-8 (review) — live against
 * GET /api/v1/student/attempts/:id/result (03-attempt-lifecycle.md).
 *
 * The state that matters here is Partial. MCQ grades itself while Writing waits for the
 * teacher, so a real attempt is routinely half-marked — presenting half a paper's
 * points as a final score is the failure this screen avoids: a missing total reads
 * "—" with a provisional note, never 0, via `formatStat` (same rule as srs-session).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { formatStat } from "@/lib/student/srs-session";
import {
  fetchAttemptResult,
  isValidUuid,
  type TakePayload,
  type TakeQuestion,
} from "@/lib/student/attempts-service";

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function correctness(q: TakeQuestion): "graded" | "right" | "wrong" | "pending" {
  // A teacher score settles the question whatever the auto mark said — writing
  // has no binary correctness, so without this branch a scored essay would read
  // "Chờ chấm" next to its own points.
  if (q.answer?.teacherScore !== null && q.answer?.teacherScore !== undefined) return "graded";
  const finalScore = q.answer?.autoScore ?? null;
  if (finalScore === null) return "pending";
  if (q.answer?.isCorrect !== null && q.answer?.isCorrect !== undefined) {
    return q.answer.isCorrect ? "right" : "wrong";
  }
  return "pending";
}

export default function AttemptResultPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = decodeURIComponent(params?.attemptId ?? "");
  const validId = isValidUuid(attemptId);

  const [payload, setPayload] = useState<TakePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const loadResult = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPayload(await fetchAttemptResult(attemptId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [attemptId, validId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  if (loading) {
    return (
      <div className="stack gap-6">
        <PageHead title="Đang tải kết quả..." sub="Vui lòng chờ giây lát" />
        <SkeletonPanel rows={3} height={72} />
      </div>
    );
  }

  if (!validId || (!payload && !error)) {
    return (
      <div className="stack gap-6">
        <PageHead title="Không tìm thấy kết quả" sub="Đường dẫn không đúng định dạng." />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được kết quả"
            action={
              <Link href="/student/assignments" className="btn btn--primary">
                <ArrowLeft size={16} /> Về danh sách bài tập
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  if (error || !payload) {
    const apiErr = error as { statusCode?: number } | null;
    const forbidden = apiErr?.statusCode === 403 || apiErr?.statusCode === 404;
    return (
      <div className="stack gap-6">
        <PageHead
          title={forbidden ? "Không có quyền xem" : "Lỗi kết nối"}
          sub={forbidden ? "Đây không phải bài làm của bạn." : "Không thể tải kết quả."}
        />
        <Panel className="panel--pad">
          {forbidden ? (
            <EmptyState
              title="Không mở được kết quả"
              action={
                <Link href="/student/assignments" className="btn btn--primary">
                  <ArrowLeft size={16} /> Về danh sách bài tập
                </Link>
              }
            />
          ) : (
            <ErrorState
              title="Không tải được kết quả"
              text="Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại."
              onRetry={loadResult}
            />
          )}
        </Panel>
      </div>
    );
  }

  const { attempt, assignment, questions } = payload;
  const graded = attempt.status === "graded";
  const provisional = !graded;

  return (
    <div className="stack gap-6">
      <Link href="/student/assignments" className="backlink">
        <ArrowLeft size={15} /> Bài tập
      </Link>

      <PageHead
        eyebrow={graded ? "Đã chấm xong" : "Đã nộp — chờ chấm"}
        title={assignment.title}
        sub={`Nộp lúc ${attempt.submittedAt ? formatMoment(attempt.submittedAt) : "—"}`}
      />

      <Panel className="panel--pad">
        <div className="stack gap-2">
          <h2 className="section-title">Tổng điểm</h2>
          <p style={{ fontSize: "var(--step-3)", fontWeight: 700, margin: 0 }}>
            {formatStat(attempt.totalScore)} / {formatStat(attempt.maxScore)}
          </p>
          {provisional ? (
            <p className="section-sub" style={{ color: "var(--text-2)" }}>
              <Clock size={14} aria-hidden="true" /> Điểm trắc nghiệm đã có; phần tự luận
              đang chờ giáo viên chấm — đây chưa phải điểm cuối cùng.
            </p>
          ) : null}
        </div>
      </Panel>

      <div className="stack gap-3">
        {questions.map((q, i) => {
          const mark = correctness(q);
          const finalScore = q.answer?.teacherScore ?? q.answer?.autoScore ?? null;
          return (
            <Panel key={q.questionId} className="panel--pad">
              <div className="stack gap-2">
                <div className="row gap-2 wrap">
                  <strong className="grow">
                    Câu {i + 1}: {q.content?.prompt ?? "Câu hỏi"}
                  </strong>
                  {mark === "graded" ? (
                    <Chip tone="success">
                      <Check size={13} /> Đã chấm
                    </Chip>
                  ) : mark === "right" ? (
                    <Chip tone="success">
                      <Check size={13} /> Đúng
                    </Chip>
                  ) : mark === "wrong" ? (
                    <Chip tone="danger">
                      <X size={13} /> Sai
                    </Chip>
                  ) : (
                    <Chip tone="neutral">
                      <Clock size={13} /> Chờ chấm
                    </Chip>
                  )}
                  <Chip tone="neutral">{formatStat(finalScore)} / 1</Chip>
                </div>

                {q.answer?.selectedOptions && q.answer.selectedOptions.length > 0 ? (
                  <p className="section-sub" style={{ margin: 0 }}>
                    Bạn chọn: {q.answer.selectedOptions.join(", ")}
                  </p>
                ) : null}
                {q.answer?.writtenAnswer ? (
                  <p className="lms-prose" style={{ margin: 0 }}>
                    {q.answer.writtenAnswer}
                  </p>
                ) : null}
                {q.answer?.teacherFeedback ? (
                  <p className="section-sub" style={{ margin: 0 }}>
                    Nhận xét của giáo viên: {q.answer.teacherFeedback}
                  </p>
                ) : null}
                {graded && q.correctAnswer !== undefined && q.correctAnswer !== null ? (
                  <p className="section-sub" style={{ margin: 0 }}>
                    Đáp án đúng: {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}
                  </p>
                ) : null}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
