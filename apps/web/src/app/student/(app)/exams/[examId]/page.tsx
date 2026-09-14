"use client";

/**
 * /student/exams/[examId] — the exam room door.
 *
 * The old page ran the whole paper here with a client clock and browser scoring —
 * both ADR-005 violations, both gone. The live take screen is
 * `/student/attempts/[attemptId]` (03-attempt-lifecycle): server `startedAt` drives
 * the countdown, autosave writes through, submit grades MCQ server-side. This page
 * now does the one thing a CBT room door should do: show the paper's rules, then
 * start (or re-enter) the official attempt and hand the learner to that screen.
 *
 * Data comes from the student's own assignment list — an id that is not a mock_test
 * of an enrolled class (fixture ids like `e-h1-1` included) renders the not-found
 * branch. Nothing is invented for a paper the learner cannot see.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, FileText, ListChecks, Play } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import { ApiError, apiRequest } from "@/lib/api-client";
import { startAttempt } from "@/lib/student/attempts-service";
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

type Phase = "loading" | "error" | "notfound" | "ready";

function formatDue(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ExamRoomPage() {
  const params = useParams<{ examId: string }>();
  const examId = decodeURIComponent(params?.examId ?? "");
  const router = useRouter();
  const pushToast = useToast();

  const [assignment, setAssignment] = useState<ApiStudentAssignment | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      // The list is the source of truth: it is published-only and
      // active-enrollment-only server-side, so "not in my list" covers fixture ids,
      // foreign assignments and drafts with one honest branch.
      const res = await apiRequest<ApiStudentAssignment[]>("/student/assignments");
      const found = res.data.find((a) => a.id === examId && a.type === "mock_test");
      if (!found) {
        setPhase("notfound");
        return;
      }
      setAssignment(found);
      // INV-ATLP-12: ids only. A resolve failure must not block the door —
      // starting is idempotent-by-existence anyway.
      try {
        const mine = await fetchMyAttempt(examId);
        setAttemptStatus(mine.attemptId ? mine.status ?? null : null);
        setAttemptId(mine.attemptId);
      } catch {
        setAttemptStatus(null);
        setAttemptId(null);
      }
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Route-level guard: a non-uuid can never be a real assignment — skip the fetch.
  const validId = useMemo(
    () => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId),
    [examId],
  );
  useEffect(() => {
    if (!validId && phase === "loading") setPhase("notfound");
  }, [validId, phase]);

  async function begin() {
    if (starting || !assignment) return;
    setStarting(true);
    try {
      const payload = await startAttempt(assignment.id);
      router.push(`/student/attempts/${payload.attempt.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ATTEMPT_ALREADY_SUBMITTED") {
        // The attempt exists and is locked — the result resolver is the way back in.
        pushToast("Bài này đã nộp rồi — mở kết quả.", "warn");
        router.push(`/student/exams/${assignment.id}/result`);
      } else if (err instanceof ApiError && err.code === "ASSIGNMENT_PAST_DUE") {
        pushToast("Đã quá hạn nộp — không mở bài thi được nữa.", "danger");
      } else {
        pushToast("Không mở được phòng thi — thử lại.", "danger");
      }
      setStarting(false);
    }
  }

  return (
    <div className="stack gap-6">
      <Link href="/student/exams" className="backlink">
        <ArrowLeft size={14} /> Phòng thi
      </Link>
      <PageHead
        eyebrow="Phòng thi"
        title={assignment?.title ?? "Đề thi thử"}
        sub={assignment ? `${assignment.className} · chấm và giữ giờ trên server` : undefined}
      />

      {phase === "loading" ? <SkeletonPanel rows={4} /> : null}

      {phase === "error" ? <ErrorState onRetry={() => void load()} /> : null}

      {phase === "notfound" ? (
        <Panel className="panel--pad">
          <EmptyState
            icon={<FileText size={22} />}
            title="Không tìm thấy đề thi"
            text="Đề này không tồn tại hoặc không thuộc lớp bạn đang học. Xem các đề khả dụng ở phòng thi."
          />
          <div className="row" style={{ justifyContent: "center" }}>
            <Link href="/student/exams" className="btn btn--outline btn--sm">
              Về phòng thi
            </Link>
          </div>
        </Panel>
      ) : null}

      {phase === "ready" && assignment ? (
        <Panel className="panel--pad stack gap-5">
          <div className="row gap-2 wrap" style={{ alignItems: "center" }}>
            <Chip tone="info">{assignment.className}</Chip>
            <Chip tone="neutral">
              <ListChecks size={12} /> {assignment.questionCount} câu
            </Chip>
            {assignment.timeLimitMinutes ? (
              <Chip tone="neutral">
                <Clock size={12} /> {assignment.timeLimitMinutes} phút
              </Chip>
            ) : (
              <Chip tone="neutral">Không giới hạn giờ</Chip>
            )}
            <Chip tone="neutral">Hạn {formatDue(assignment.dueDate)}</Chip>
          </div>

          <div className="stack gap-2">
            <p className="section-sub">Luật phòng thi</p>
            <ul className="stack gap-1" style={{ paddingLeft: "1.2em", color: "var(--text-2)" }}>
              <li>• Giờ làm được tính từ lúc bạn vào bài — reload không cộng thêm thời gian.</li>
              <li>• Đáp án tự lưu mỗi 2 giây; mất kết nối không mất bài làm.</li>
              <li>• Hết giờ hệ thống tự nộp bài; trắc nghiệm được chấm ngay trên server.</li>
              <li>• Chỉ một bài làm cho mỗi đề — đã nộp thì không làm lại.</li>
            </ul>
          </div>

          {attemptStatus === "submitted" || attemptStatus === "graded" ? (
            <div className="stack gap-3">
              <p style={{ color: "var(--text-2)" }}>
                Bạn đã nộp bài này rồi — kết quả nằm ở thẻ kết quả.
              </p>
              <div className="row gap-3">
                <Link href={`/student/exams/${assignment.id}/result`} className="btn btn--primary">
                  Xem kết quả
                </Link>
              </div>
            </div>
          ) : attemptStatus === "in_progress" && attemptId ? (
            <div className="stack gap-3">
              <p style={{ color: "var(--text-2)" }}>
                Bạn có bài đang làm dở — đồng hồ vẫn chạy theo giờ đã bắt đầu.
              </p>
              <div className="row gap-3">
                <Link href={`/student/attempts/${attemptId}`} className="btn btn--primary">
                  <Play size={15} /> Tiếp tục bài làm
                </Link>
              </div>
            </div>
          ) : (
            <div className="row gap-3">
              <button
                type="button"
                className="btn btn--primary"
                disabled={starting}
                onClick={() => void begin()}
              >
                <Play size={15} /> {starting ? "Đang mở bài…" : "Vào bài thi"}
              </button>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
