"use client";

/**
 * /student/exams — the exam room lobby, live against the student's real assignments.
 *
 * There are no F13 exam papers yet (the content corpus is outside the repo — DOC-011,
 * and `API_STUDENT.md` keeps "platform mock exams" contract-less), so this room is
 * served from what actually exists: `mock_test` assignments published to the learner's
 * enrolled classes (S-ASGN-1), taken through the attempt lifecycle (03-attempt-lifecycle).
 * Nothing is invented: an empty room says so.
 *
 * Per-card attempt status comes from INV-ATLP-12 (`GET /student/assignments/:id/attempt`)
 * — ids only, so the count of calls stays tiny and the card can link continue/result.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, FileText, ListChecks, Play, Target } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { apiRequest } from "@/lib/api-client";
import { fetchMyAttempt } from "@/lib/student/placement-service";

/** One published assignment row from GET /student/assignments (spec S-ASGN-1). */
interface ApiStudentAssignment {
  id: string;
  classId: string;
  className: string;
  title: string;
  type: "homework" | "mock_test";
  status: "draft" | "published";
  dueDate: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

type AttemptLite = { attemptId: string; status: string } | null;

function formatDue(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ExamsPage() {
  const [rows, setRows] = useState<ApiStudentAssignment[]>([]);
  const [attempts, setAttempts] = useState<Record<string, AttemptLite>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      // Server-side published-only / active-enrollment-only (INV-TASG-05, S-ASGN-1);
      // the FE narrows to the mock_test half for this room.
      const res = await apiRequest<ApiStudentAssignment[]>("/student/assignments");
      const mocks = res.data.filter((a) => a.type === "mock_test");
      setRows(mocks);
      // INV-ATLP-12 resolve per card. Ids only; a failure here must not kill the
      // lobby — a card without resolved status just renders without one.
      const resolved: Record<string, AttemptLite> = {};
      await Promise.all(
        mocks.map(async (a) => {
          try {
            const mine = await fetchMyAttempt(a.id);
            resolved[a.id] = mine.attemptId
              ? { attemptId: mine.attemptId, status: mine.status ?? "" }
              : null;
          } catch {
            resolved[a.id] = null;
          }
        }),
      );
      setAttempts(resolved);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withStatus = useMemo(
    () =>
      rows.map((a) => {
        const attempt = attempts[a.id] ?? null;
        const status =
          attempt?.status === "in_progress"
            ? "in_progress"
            : attempt?.status === "submitted" || attempt?.status === "graded"
              ? "done"
              : "not_started";
        return { assignment: a, attempt, status };
      }),
    [rows, attempts],
  );

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Phòng thi"
        title="Đề thi thử"
        sub={`${rows.length} đề từ các lớp đang học · chấm và giữ giờ trên server`}
      />

      <Panel className="panel--pad row gap-3 wrap" style={{ alignItems: "center" }}>
        <Target size={18} />
        <p className="section-sub grow">
          Chưa biết trình độ của mình? Bài xếp cấp nhẹ sẽ đề xuất cấp HSK và lưu vào hồ sơ.
        </p>
        <Link href="/student/placement" className="btn btn--outline btn--sm">
          Làm bài xếp cấp
        </Link>
      </Panel>

      {loading ? <SkeletonPanel rows={4} /> : null}

      {!loading && error ? <ErrorState onRetry={() => void load()} /> : null}

      {!loading && !error && rows.length === 0 ? (
        <Panel className="panel--pad">
          <EmptyState
            icon={<FileText size={22} />}
            title="Chưa có đề thi thử nào"
            text="Đề thi thử xuất hiện khi giáo viên giao một mock_test cho lớp bạn đang học. Bộ đề thi chuẩn F13 chưa được nhập — hệ thống không tự bịa đề."
          />
        </Panel>
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="stack gap-4">
          {withStatus.map(({ assignment: a, attempt, status }) => (
            <Panel key={a.id} className="panel--pad stack gap-3">
              <div className="row gap-2 wrap" style={{ alignItems: "center" }}>
                <Chip tone="info">{a.className}</Chip>
                <Chip tone="neutral">
                  <ListChecks size={12} /> {a.questionCount} câu
                </Chip>
                {a.timeLimitMinutes ? (
                  <Chip tone="neutral">
                    <Clock size={12} /> {a.timeLimitMinutes} phút
                  </Chip>
                ) : null}
                <Chip tone={a.dueDate && new Date(a.dueDate).getTime() < Date.now() ? "warn" : "neutral"}>
                  Hạn {formatDue(a.dueDate)}
                </Chip>
                {status === "done" ? <Chip tone="success">Đã nộp</Chip> : null}
                {status === "in_progress" ? <Chip tone="warn">Đang làm</Chip> : null}
              </div>

              <h3 style={{ fontSize: "var(--step-2)", fontWeight: 700 }}>{a.title}</h3>

              <div className="row gap-3 wrap">
                <Link href={`/student/exams/${a.id}`} className="btn btn--primary btn--sm">
                  <Play size={14} />
                  {status === "in_progress" ? "Vào phòng thi (tiếp tục)" : "Vào phòng thi"}
                </Link>
                {status === "done" && attempt ? (
                  <Link
                    href={`/student/exams/${a.id}/result`}
                    className="btn btn--outline btn--sm"
                  >
                    Xem kết quả
                  </Link>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      ) : null}
    </div>
  );
}
