"use client";

/**
 * /student/assignments — everything the teacher has assigned, across every class.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-assignments-list.md
 * Feature: S-ASGN-1.
 *
 * MOCK(S-ASGN-1): `GET /api/v1/student/assignments` is defined in API_STUDENT.md and
 * implemented nowhere. Starting an attempt navigates to a fixture rather than calling
 * `POST /api/v1/student/assignments/:id/attempts`.
 *
 * Nothing from the self-study library appears here. Only an Assignment produces an
 * official Attempt — the boundary the agreed Student scope draws explicitly.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList, Timer } from "lucide-react";
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
import { assignments, studentClasses, type AssignmentStatus } from "@/lib/student/lms-data";
import { actionForAssignment } from "@/lib/student/lms-rules";

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  not_started: "Chưa làm",
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  graded: "Đã chấm",
};

/** Enum to tone, decided here and only here — the rule WEB-002 exists for. */
const STATUS_TONE: Record<AssignmentStatus, "neutral" | "info" | "warn" | "success"> = {
  not_started: "warn",
  in_progress: "info",
  submitted: "neutral",
  graded: "success",
};

/** Formats at render only; the fixture stores UTC ISO 8601 (WEB-003). */
function formatDue(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AssignmentsPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">("all");

  const filtered = useMemo(
    () =>
      assignments.filter(
        (a) =>
          (classFilter === "all" || a.classId === classFilter) &&
          (statusFilter === "all" || a.status === statusFilter),
      ),
    [classFilter, statusFilter],
  );

  const list = demo === "empty" ? [] : filtered;
  const filtersActive = classFilter !== "all" || statusFilter !== "all";
  const openCount = assignments.filter(
    (a) => a.status === "not_started" || a.status === "in_progress",
  ).length;

  // Production renders the unavailable state, but only AFTER every hook has run —
  // an early return above them would make the component conditionally hooked, which
  // React forbids (A05 fixed this for /mistakes/review; this file follows the same rule).
  if (process.env.NODE_ENV === "production") {
    return (
      <UnavailableState
        title="Bài tập về nhà"
        description="Chức năng bài tập về nhà chưa được kết nối máy chủ dữ liệu trong phiên bản hiện tại (Sprint 4). Vui lòng quay lại sau."
      />
    );
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Bài giáo viên giao"
        title="Bài tập"
        sub={`${openCount} bài chưa hoàn thành · ${assignments.length} bài tất cả`}
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
              {studentClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="stack gap-1 grow">
            <span className="section-sub">Trạng thái</span>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AssignmentStatus | "all")}
            >
              <option value="all">Tất cả trạng thái</option>
              {(Object.keys(STATUS_LABEL) as AssignmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Panel>

      {demo === "loading" ? <SkeletonPanel rows={4} height={76} /> : null}

      {demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được danh sách bài tập" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : null}

      {(demo === "ready" || demo === "empty") && list.length === 0 ? (
        <Panel className="panel--pad">
          {/* Two different empties. "Nothing matches the filter" needs a way out; "you have
              no assignments at all" does not, and a clear-filter button there is a dead end
              that reads as a bug. */}
          {filtersActive && demo !== "empty" ? (
            <EmptyState
              title="Không có bài nào khớp bộ lọc"
              text="Thử bỏ bớt điều kiện lọc để xem toàn bộ bài tập."
              action={
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setClassFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Xoá bộ lọc
                </button>
              }
            />
          ) : (
            <EmptyState
              title="Chưa có bài tập nào"
              text="Khi giáo viên giao bài, nó sẽ xuất hiện ở đây kèm hạn nộp."
              action={
                <Link href="/student/classes" className="btn btn--outline">
                  Xem lớp của tôi
                </Link>
              }
            />
          )}
        </Panel>
      ) : null}

      {demo === "ready" && list.length > 0 ? (
        <div className="stack gap-3">
          {list.map((a) => {
            const action = actionForAssignment(a.status);
            const klass = studentClasses.find((c) => c.id === a.classId);
            return (
              <div key={a.id} className="lms-assignment">
                <span className="lms-assignment__icon" aria-hidden="true">
                  {a.type === "mock_test" ? <Timer size={18} /> : <ClipboardList size={18} />}
                </span>
                <span className="grow">
                  <span className="lms-lesson__title">{a.title}</span>
                  <span className="lms-lesson__summary">
                    {klass ? klass.name : "—"} · {a.questionCount} câu · {a.maxScore} điểm
                    {a.timeLimitMinutes ? ` · ${a.timeLimitMinutes} phút` : ""}
                  </span>
                  <span className="lms-lesson__summary">
                    <CalendarClock size={13} aria-hidden="true" /> Hạn {formatDue(a.dueAt)}
                  </span>
                </span>
                <Chip tone={STATUS_TONE[a.status]}>{STATUS_LABEL[a.status]}</Chip>
                {/* A submitted-but-ungraded row gets no action, deliberately: a result link
                    would promise a score that does not exist yet (S-ASGN-7). */}
                {action === "start" ? (
                  <Link
                    href={`/student/attempts/${a.attemptId ?? "at-h3-02"}`}
                    className="btn btn--sm btn--primary"
                  >
                    Bắt đầu
                  </Link>
                ) : null}
                {action === "resume" && a.attemptId ? (
                  <Link
                    href={`/student/attempts/${a.attemptId}`}
                    className="btn btn--sm btn--primary"
                  >
                    Tiếp tục
                  </Link>
                ) : null}
                {action === "result" && a.attemptId ? (
                  <Link
                    href={`/student/attempts/${a.attemptId}/result`}
                    className="btn btn--sm btn--outline"
                  >
                    Xem kết quả
                  </Link>
                ) : null}
                {action === "none" ? (
                  <span className="lms-assignment__waiting">Chờ chấm</span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <DemoStateSwitcher value={demo} onChange={setDemo} />
    </div>
  );
}
