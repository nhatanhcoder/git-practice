"use client";

/**
 * /student/exams/[examId]/result — the score card route for an exam.
 *
 * There is exactly one result renderer in the product: the attempt result at
 * `/student/attempts/[attemptId]/result` (live, INV-ATLP-07 reveal rules). This page
 * resolves the learner's own attempt for the exam (INV-ATLP-12, ids only) and hands
 * over to it, so the two surfaces can never drift:
 * - no attempt yet → an honest "chưa có bài" card (never a fabricated score);
 * - in_progress → a pointer back into the running attempt;
 * - submitted/graded → redirect to the attempt result.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { fetchMyAttempt } from "@/lib/student/placement-service";

type Phase = "loading" | "error" | "none" | "in_progress" | "redirecting";

export default function ExamResultPage() {
  const params = useParams<{ examId: string }>();
  const examId = decodeURIComponent(params?.examId ?? "");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const mine = await fetchMyAttempt(examId);
      if (!mine.attemptId) {
        setPhase("none");
        return;
      }
      setAttemptId(mine.attemptId);
      if (mine.status === "in_progress") {
        setPhase("in_progress");
        return;
      }
      setPhase("redirecting");
      router.replace(`/student/attempts/${mine.attemptId}/result`);
    } catch {
      setPhase("error");
    }
  }, [examId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="stack gap-6">
      <Link href="/student/exams" className="backlink">
        <ArrowLeft size={14} /> Phòng thi
      </Link>
      <PageHead eyebrow="Phòng thi" title="Kết quả bài thi" />

      {phase === "loading" || phase === "redirecting" ? <SkeletonPanel rows={4} /> : null}

      {phase === "error" ? <ErrorState onRetry={() => void load()} /> : null}

      {phase === "none" ? (
        <Panel className="panel--pad">
          <EmptyState
            icon={<Award size={22} />}
            title="Chưa có bài thi nào cho đề này"
            text="Kết quả xuất hiện sau khi bạn nộp bài. Vào phòng thi để bắt đầu."
          />
          <div className="row gap-3" style={{ justifyContent: "center" }}>
            <Link href={`/student/exams/${examId}`} className="btn btn--primary btn--sm">
              Vào phòng thi
            </Link>
          </div>
        </Panel>
      ) : null}

      {phase === "in_progress" && attemptId ? (
        <Panel className="panel--pad stack gap-3" style={{ textAlign: "center" }}>
          <p style={{ color: "var(--text-2)" }}>
            Bài thi của bạn vẫn đang làm dở — chưa có kết quả để xem. Đồng hồ vẫn đang chạy.
          </p>
          <div className="row gap-3" style={{ justifyContent: "center" }}>
            <Link href={`/student/attempts/${attemptId}`} className="btn btn--primary btn--sm">
              Tiếp tục bài làm
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
