"use client";

/**
 * /student/attempts/[attemptId]/result — the official score and the teacher's feedback.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-attempt-result.md
 * Features: S-ASGN-7 (result), S-ASGN-8 (review).
 *
 * MOCK(S-ASGN-7): `GET /api/v1/student/attempts/:id/result` is defined and unimplemented.
 *
 * The state that matters here is Partial. MCQ grades itself while Writing waits for the
 * teacher, so a real attempt is routinely half-marked — and presenting half a paper's
 * points as a final score is the failure this screen has to avoid.
 */

import { useMemo, useState } from "react";
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
import { UnavailableState } from "@/components/student/unavailable-state";
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import {
  assignmentById,
  attemptById,
  resultByAttemptId,
} from "@/lib/student/lms-data";
import { gradedMaxScore, gradedScore, isProvisional } from "@/lib/student/lms-rules";

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttemptResultPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <UnavailableState
        title="Kết quả bài tập"
        description="Kết quả bài tập chưa được kết nối máy chủ dữ liệu trong phiên bản hiện tại (Sprint 4). Vui lòng quay lại sau."
      />
    );
  }
  const params = useParams<{ attemptId: string }>();
  const attemptId = decodeURIComponent(params?.attemptId ?? "");
  const [demo, setDemo] = useState<DemoState>("ready");

  const result = useMemo(() => resultByAttemptId(attemptId), [attemptId]);
  const attempt = useMemo(() => attemptById(attemptId), [attemptId]);
  const assignment = useMemo(
    () => (result ? assignmentById(result.assignmentId) : null),
    [result],
  );

  if (!result || !assignment) {
    return (
      <div className="stack gap-6">
        <PageHead title="Không tìm thấy kết quả" sub="Bài làm này chưa có kết quả, hoặc không phải của bạn." />
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

  const provisional = isProvisional(result);
  const earned = gradedScore(result);
  const outOf = provisional
    ? gradedMaxScore(result, attempt?.questions ?? [])
    : result.maxScore;
  const pending = result.questions.filter((q) => q.score === null).length;

  return (
    <div className="stack gap-6">
      <Link href="/student/assignments" className="backlink">
        <ArrowLeft size={15} /> Bài tập
      </Link>

      <PageHead
        eyebrow={provisional ? "Kết quả tạm thời" : "Kết quả chính thức"}
        title={assignment.title}
        sub={`Nộp lúc ${formatMoment(result.submittedAt)}${
          result.gradedAt ? ` · chấm xong ${formatMoment(result.gradedAt)}` : ""
        }`}
      />

      {demo === "loading" ? <SkeletonPanel rows={3} height={96} /> : null}

      {demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được kết quả" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : null}

      {demo === "ready" || demo === "empty" ? (
        <>
          <Panel className="panel--pad">
            <div className="row gap-4 wrap">
              <div className="stack gap-1 grow">
                <span className="eyebrow">Điểm</span>
                <span className="result-score">
                  {earned}
                  <span className="result-score__max">/{outOf}</span>
                </span>
                {/* The denominator scales to what has been marked. Showing 10/20 while half
                    the paper is unmarked reads as ten wrong answers, which is not what
                    happened. */}
                {provisional ? (
                  <span className="section-sub">
                    Tính trên phần đã chấm. Bài đầy đủ {result.maxScore} điểm.
                  </span>
                ) : null}
              </div>
              {provisional ? (
                <Chip tone="warn" icon={<Clock size={13} />}>
                  Còn {pending} câu chờ giáo viên chấm
                </Chip>
              ) : (
                <Chip tone="success" icon={<Check size={13} />}>
                  Đã chấm xong
                </Chip>
              )}
            </div>
          </Panel>

          {result.teacherFeedback ? (
            <Panel className="panel--pad">
              <div className="stack gap-2">
                <h2 className="section-title">Nhận xét của giáo viên</h2>
                <p className="lms-prose">{result.teacherFeedback}</p>
              </div>
            </Panel>
          ) : null}

          <Panel className="panel--pad">
            <div className="stack gap-3">
              <h2 className="section-title">Chi tiết từng câu</h2>
              {result.questions.map((q, i) => {
                const ungraded = q.score === null;
                const correct = !ungraded && q.correctAnswer !== null && q.answer === q.correctAnswer;
                return (
                  <div key={q.questionId} className="result-row">
                    <span className="result-row__index">{i + 1}</span>
                    <span className="grow stack gap-1">
                      <span className="lms-lesson__summary">Bạn trả lời: {q.answer}</span>
                      {!ungraded && q.correctAnswer !== null && !correct ? (
                        <span className="lms-lesson__summary">Đáp án đúng: {q.correctAnswer}</span>
                      ) : null}
                      {q.feedback ? <span className="result-row__note">{q.feedback}</span> : null}
                    </span>
                    {ungraded ? (
                      <Chip tone="warn" icon={<Clock size={13} />}>
                        Chờ giáo viên chấm
                      </Chip>
                    ) : (
                      <Chip
                        tone={correct ? "success" : "danger"}
                        icon={correct ? <Check size={13} /> : <X size={13} />}
                      >
                        {q.score} điểm
                      </Chip>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      ) : null}

      <DemoStateSwitcher value={demo} onChange={setDemo} />
    </div>
  );
}
