"use client";

/**
 * /student/classes/[classId] — one class: who teaches it, when it meets, its lessons.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-class-detail.md
 * Features: S-CLS-3 (class info), S-CLS-4 (leave), S-LESSON-1 (ordered lesson list).
 *
 * MOCK(S-CLS-3, S-LESSON-1): `GET /api/v1/student/classes/:id` exists in API_STUDENT.md
 * but is not implemented. The lesson list has **no endpoint at all** — API_STUDENT.md has
 * no Lessons section, the Student-side twin of API-007. Leaving a class mutates local
 * state only.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, FileText, LogOut, PlayCircle, User } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import { Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import {
  assignmentById,
  classById,
  lessonsForClass,
} from "@/lib/student/lms-data";

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = decodeURIComponent(params?.classId ?? "");
  const router = useRouter();
  const pushToast = useToast();

  const [demo, setDemo] = useState<DemoState>("ready");
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [left, setLeft] = useState(false);

  const klass = useMemo(() => classById(classId), [classId]);
  const lessons = useMemo(() => lessonsForClass(classId), [classId]);

  if (!klass) {
    return (
      <div className="stack gap-6">
        <PageHead title="Không tìm thấy lớp" sub="Lớp này không tồn tại hoặc bạn chưa tham gia." />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được lớp"
            text="Kiểm tra lại đường dẫn, hoặc quay lại danh sách lớp của bạn."
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

  const visibleLessons = demo === "empty" ? [] : lessons;

  return (
    <div className="stack gap-6">
      <Link href="/student/classes" className="backlink">
        <ArrowLeft size={15} /> Lớp của tôi
      </Link>

      <PageHead
        eyebrow={`HSK ${klass.hskLevel}`}
        title={klass.name}
        sub={`${klass.teacherName} · ${klass.schedule}`}
        action={
          <button type="button" className="btn btn--outline" onClick={() => setLeaveOpen(true)}>
            <LogOut size={16} /> Rời lớp
          </button>
        }
      />

      <Panel className="panel--pad">
        <div className="row gap-4 wrap">
          <span className="lms-fact">
            <User size={15} aria-hidden="true" /> {klass.teacherName}
          </span>
          <span className="lms-fact">
            <CalendarDays size={15} aria-hidden="true" /> {klass.schedule}
          </span>
          <span className="lms-fact">Mã lớp {klass.enrollmentCode}</span>
        </div>
      </Panel>

      {/* Partial is genuine here — the class facts and the lesson list are separate
          reads — but the shared DemoState switcher has only four values, so it cannot be
          demonstrated. In the real fetch the header renders while this skeleton shows. */}
      {demo === "loading" ? <SkeletonPanel rows={3} height={72} /> : null}

      {demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được danh sách bài học" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : null}

      {(demo === "ready" || demo === "empty") && visibleLessons.length === 0 ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có bài học nào"
            text="Giáo viên chưa đăng bài học cho lớp này. Khi có bài mới, nó sẽ xuất hiện ở đây."
          />
        </Panel>
      ) : null}

      {demo === "ready" && visibleLessons.length > 0 ? (
        <div className="stack gap-3">
          {visibleLessons.map((l) => {
            const attached = l.assignmentIds.map(assignmentById).filter(Boolean);
            return (
              <Link
                key={l.id}
                href={`/student/classes/${klass.id}/lessons/${l.id}`}
                className="lms-lesson"
              >
                <span className="lms-lesson__order">{l.order}</span>
                <span className="grow">
                  <span className="lms-lesson__title">
                    {l.title}
                    {l.titleHanzi ? <em className="lms-lesson__hanzi">{l.titleHanzi}</em> : null}
                  </span>
                  <span className="lms-lesson__summary">{l.summary}</span>
                  <span className="row gap-2 wrap">
                    {l.videoUrl ? (
                      <Chip icon={<PlayCircle size={13} />}>Video</Chip>
                    ) : null}
                    {l.documentName ? (
                      <Chip icon={<FileText size={13} />}>Tài liệu</Chip>
                    ) : null}
                    {attached.length ? (
                      <Chip tone="info">{attached.length} bài tập</Chip>
                    ) : null}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Rời khỏi lớp?">
        <div className="stack gap-4">
          <p className="section-sub">
            Bạn sẽ không còn thấy bài học và bài tập của <strong>{klass.name}</strong>. Điểm các
            bài đã nộp vẫn được giữ. Muốn quay lại, bạn cần mã lớp.
          </p>
          <div className="row gap-3 wrap">
            <button type="button" className="btn btn--outline" onClick={() => setLeaveOpen(false)}>
              Ở lại lớp
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={() => {
                setLeft(true);
                setLeaveOpen(false);
                pushToast(`Đã rời ${klass.name}`, "warn");
                router.push("/student/classes");
              }}
            >
              Rời lớp
            </button>
          </div>
        </div>
      </Modal>

      {left ? <span className="sr-only">Đã rời lớp</span> : null}

      <DemoStateSwitcher value={demo} onChange={setDemo} />
    </div>
  );
}
