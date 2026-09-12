"use client";

/**
 * /student/assignments — everything the teacher has assigned, across every class.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-assignments-list.md
 * Feature: S-ASGN-1 — live against GET /api/v1/student/assignments (S3 backend).
 * Starting/resuming (S-ASGN-2) posts to the attempt endpoints (Sprint 4) and lands
 * on the take screen; a 409 means one official attempt already exists and is
 * submitted — the list carries no per-row attempt status yet, so it says so
 * instead of guessing which (follow-up: list DTO gains myAttempt status).
 *
 * Nothing from the self-study library appears here. Only an Assignment produces an
 * official Attempt — the boundary the agreed Student scope draws explicitly.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, PenLine } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import { fetchMyEnrolledClasses } from "@/lib/student/classes-service";
import { ApiError, apiRequest } from "@/lib/api-client";
import { startAttempt } from "@/lib/student/attempts-service";

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

type EnrolledClassLite = { id: string; name: string };

function formatDue(iso: string | null): string {
  if (!iso) return "Không hạn";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function dueTone(iso: string | null): "warn" | "neutral" {
  if (!iso) return "neutral";
  return new Date(iso).getTime() < Date.now() ? "warn" : "neutral";
}

export default function AssignmentsPage() {
  const router = useRouter();
  const pushToast = useToast();
  const [rows, setRows] = useState<ApiStudentAssignment[]>([]);
  const [classes, setClasses] = useState<EnrolledClassLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Both endpoints are published-only / active-enrollment-only server-side
        // (INV-TASG-05, S-ASGN-1) — the FE never widens either filter.
        const [assignmentRes, classRes] = await Promise.all([
          apiRequest<ApiStudentAssignment[]>("/student/assignments"),
          fetchMyEnrolledClasses(),
        ]);
        if (cancelled) return;
        setRows(assignmentRes.data);
        setClasses(classRes.map((c) => ({ id: c.id, name: c.name })));
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Không tải được danh sách bài tập. Kiểm tra kết nối rồi thử lại.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => rows.filter((a) => classFilter === "all" || a.classId === classFilter),
    [rows, classFilter],
  );

  const overdue = rows.filter(
    (a) => a.dueDate && new Date(a.dueDate).getTime() < Date.now(),
  ).length;

  // S-ASGN-2: start creates the official attempt, resume re-enters it — the
  // endpoint answers both with the take route's id. A 409 means the one
  // attempt already exists and is submitted; without a per-row attempt status
  // the list cannot link its result, so it says so honestly.
  async function beginAssignment(assignmentId: string) {
    if (startingId) return;
    setStartingId(assignmentId);
    try {
      const payload = await startAttempt(assignmentId);
      router.push(`/student/attempts/${payload.attempt.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ATTEMPT_ALREADY_SUBMITTED") {
        pushToast("Bài này đã được nộp — xem kết quả ở màn làm bài.", "warn");
      } else {
        pushToast("Không mở được bài làm — thử lại.", "danger");
      }
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Bài giáo viên giao"
        title="Bài tập"
        sub={`${rows.length} bài đã phát hành${overdue > 0 ? ` · ${overdue} đã quá hạn` : ""}`}
      />

      <Panel className="panel--pad">
        <div className="row gap-3 wrap">
          <label className="stack gap-1 grow">
            <span className="section-sub">Lớp</span>
            <select
              className="select"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">Tất cả lớp</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {loading ? (
        <SkeletonPanel rows={4} height={64} />
      ) : error ? (
        <Panel className="panel--pad">
          <ErrorState
            title="Không tải được bài tập"
            text={error}
            onRetry={() => window.location.reload()}
          />
        </Panel>
      ) : filtered.length === 0 ? (
        <Panel className="panel--pad">
          <EmptyState
            icon={<ClipboardList size={22} />}
            title={rows.length === 0 ? "Chưa có bài tập nào" : "Không có bài tập cho lớp này"}
            text={
              rows.length === 0
                ? "Giáo viên chưa phát hành bài tập nào cho các lớp bạn đang theo học. Bài tập chỉ xuất hiện sau khi giáo viên phát hành."
                : "Lớp này chưa có bài tập nào được phát hành."
            }
          />
        </Panel>
      ) : (
        <div className="stack gap-3">
          {filtered.map((a) => (
            <Panel key={a.id} className="panel--pad row gap-4 wrap">
              <span className="grow stack gap-1">
                <strong>{a.title}</strong>
                <span className="row gap-2 wrap">
                  <Chip tone="neutral">{a.className}</Chip>
                  <Chip tone={a.type === "mock_test" ? "info" : "neutral"}>
                    {a.type === "mock_test" ? "Đề thi thử" : "Bài tập"}
                  </Chip>
                </span>
              </span>
              <span className="stack gap-1" style={{ minWidth: 130 }}>
                <Chip tone={dueTone(a.dueDate)}>Hạn {formatDue(a.dueDate)}</Chip>
                {a.timeLimitMinutes ? <Chip tone="info">{a.timeLimitMinutes} phút</Chip> : null}
                <Chip tone="neutral">{a.questionCount} câu hỏi</Chip>
              </span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={startingId !== null}
                onClick={() => void beginAssignment(a.id)}
              >
                <PenLine size={15} /> {startingId === a.id ? "Đang mở…" : "Làm bài"}
              </button>
            </Panel>
          ))}
        </div>
      )}

      <Panel className="panel--pad">
        <p style={{ color: "var(--text-2)", margin: 0, maxWidth: "68ch" }}>
          Nhấn “Làm bài” để bắt đầu hoặc tiếp tục — bài nộp sẽ khoá lại, trắc nghiệm
          được chấm ngay, tự luận chờ giáo viên chấm rồi mới có điểm cuối cùng.
        </p>
      </Panel>
    </div>
  );
}
