"use client";

/**
 * /student/classes/[classId]/lessons/[lessonId] — one lesson's material.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-lesson-detail.md
 * Features: S-LESSON-2 (content), S-LESSON-3 (attached assignments).
 *
 * MOCK(S-LESSON-2): the entire screen. `API_STUDENT.md` has **no Lessons section** — not
 * a missing endpoint, a missing section — so neither the content nor the assignment links
 * have a contract to call. `ENTITY_LESSON.md` and `ENTITY_LESSON_ASSIGNMENT.md` are full
 * specs, but an entity spec is not an API. Logged under `## Needs from the other lane`.
 *
 * Both ids are checked together on purpose: a lesson reached through a class it does not
 * belong to is the ownership hole the contract calls out, and `lessonById` enforces it.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, PlayCircle } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import { assignmentById, classById, lessonById } from "@/lib/student/lms-data";
import { actionForAssignment } from "@/lib/student/lms-rules";

const STATUS_LABEL: Record<string, string> = {
  not_started: "Chưa làm",
  in_progress: "Đang làm",
  submitted: "Đã nộp",
  graded: "Đã chấm",
};

export default function LessonDetailPage() {
  const params = useParams<{ classId: string; lessonId: string }>();
  const classId = decodeURIComponent(params?.classId ?? "");
  const lessonId = decodeURIComponent(params?.lessonId ?? "");
  const [demo, setDemo] = useState<DemoState>("ready");

  const klass = useMemo(() => classById(classId), [classId]);
  const lesson = useMemo(() => lessonById(classId, lessonId), [classId, lessonId]);

  if (!klass || !lesson) {
    return (
      <div className="stack gap-6">
        <PageHead
          title="Không tìm thấy bài học"
          sub="Bài học này không thuộc lớp bạn đang mở, hoặc không tồn tại."
        />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được bài học"
            action={
              <Link href="/student/classes" className="btn btn--primary">
                <ArrowLeft size={16} /> Về danh sách lớp
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  const attached = lesson.assignmentIds.map(assignmentById).filter(Boolean);
  const hasBody = Boolean(lesson.content || lesson.videoUrl || lesson.documentName);
  const showEmpty = demo === "empty" || (demo === "ready" && !hasBody && attached.length === 0);

  return (
    <div className="stack gap-6">
      <Link href={`/student/classes/${klass.id}`} className="backlink">
        <ArrowLeft size={15} /> {klass.name}
      </Link>

      <PageHead
        eyebrow={`Bài ${lesson.order}`}
        title={lesson.title}
        sub={lesson.summary}
        action={lesson.titleHanzi ? <span className="lms-hanzi">{lesson.titleHanzi}</span> : null}
      />

      {demo === "loading" ? <SkeletonPanel rows={2} height={140} /> : null}

      {demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được nội dung bài học" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : null}

      {showEmpty ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Bài học chưa có nội dung"
            text="Giáo viên chưa đăng tài liệu hay bài tập cho buổi này."
          />
        </Panel>
      ) : null}

      {demo === "ready" && !showEmpty ? (
        <>
          {lesson.content ? (
            <Panel className="panel--pad">
              <p className="lms-prose">{lesson.content}</p>
            </Panel>
          ) : null}

          {lesson.videoUrl || lesson.documentName ? (
            <Panel className="panel--pad">
              <div className="stack gap-3">
                <h2 className="section-title">Tài liệu buổi học</h2>
                {lesson.videoUrl ? (
                  <div className="lms-attach">
                    <PlayCircle size={18} aria-hidden="true" />
                    <span className="grow">Video bài giảng</span>
                    {/* No player and no real file: this is mock content, and a button that
                        pretends to open something is the CopyChip mistake from WEB-006. */}
                    <Chip>Chưa khả dụng trong bản mockup</Chip>
                  </div>
                ) : null}
                {lesson.documentName ? (
                  <div className="lms-attach">
                    <FileText size={18} aria-hidden="true" />
                    <span className="grow truncate">{lesson.documentName}</span>
                    <Chip icon={<Download size={13} />}>Chưa khả dụng</Chip>
                  </div>
                ) : null}
              </div>
            </Panel>
          ) : null}

          {attached.length ? (
            <Panel className="panel--pad">
              <div className="stack gap-3">
                <h2 className="section-title">Bài tập của buổi này</h2>
                {attached.map((a) => {
                  const action = actionForAssignment(a!.status);
                  return (
                    <div key={a!.id} className="lms-attach">
                      <span className="grow">
                        <span className="lms-lesson__title">{a!.title}</span>
                        <span className="lms-lesson__summary">
                          {a!.type === "mock_test" ? "Bài kiểm tra" : "Bài tập"} ·{" "}
                          {a!.questionCount} câu · {a!.maxScore} điểm
                        </span>
                      </span>
                      <Chip tone={a!.status === "graded" ? "success" : "info"}>
                        {STATUS_LABEL[a!.status]}
                      </Chip>
                      {action === "none" ? null : (
                        <Link href="/student/assignments" className="btn btn--sm btn--outline">
                          Mở
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          ) : null}
        </>
      ) : null}

      <DemoStateSwitcher value={demo} onChange={setDemo} />
    </div>
  );
}
