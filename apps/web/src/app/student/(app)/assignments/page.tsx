"use client";

/**
 * /student/assignments — everything the teacher has assigned, across every class.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-assignments-list.md
 * Feature: S-ASGN-1 — live against GET /api/v1/student/assignments (S3 backend).
 *
 * Attempt status is deliberately not invented: without the Sprint 4 attempts
 * endpoints every row renders without a status badge, and the note below says
 * why — rather than faking "Chưa làm / Đang làm" states locally.
 *
 * Nothing from the self-study library appears here. Only an Assignment produces an
 * official Attempt — the boundary the agreed Student scope draws explicitly.
 */

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Timer } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { fetchMyEnrolledClasses } from "@/lib/student/classes-service";
import { apiRequest } from "@/lib/api-client";

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
  const [rows, setRows] = useState<ApiStudentAssignment[]>([]);
  const [classes, setClasses] = useState<EnrolledClassLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState<string>("all");

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
            </Panel>
          ))}
        </div>
      )}

      <Panel className="panel--pad">
        <p style={{ color: "var(--text-2)", margin: 0, maxWidth: "68ch" }}>
          Làm bài và nộp bài cần máy chấm phía máy chủ (Attempts — Sprint 4) và sẽ khả dụng
          khi endpoint đó ra mắt. Danh sách trên là các bài tập đã được giáo viên phát hành
          thật sự cho lớp của bạn.
        </p>
      </Panel>
    </div>
  );
}
