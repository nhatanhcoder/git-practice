"use client";

/**
 * /student/classes/[classId]/lessons/[lessonId] — one lesson's material.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-lesson-detail.md
 * Features: S-LESSON-2 (content), S-LESSON-3 (attached assignments).
 *
 * Data: GET /student/classes/:classId/lessons/:lessonId via
 * fetchEnrolledLessonDetail — the server verifies active enrollment and that
 * the lesson belongs to the class. The class name for the header comes from
 * GET /student/classes/:id; its failure is non-fatal (header falls back).
 * Per A08 requirement 5, interactive content and assignment CTAs without
 * approved/implemented student endpoints render clear unavailable notices
 * rather than fabricated mock state.
 */

import { useCallback, useEffect, useState } from "react";
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
import {
  fetchEnrolledClassDetail,
  fetchEnrolledLessonDetail,
  isValidUuid,
  resolveSingleLessonOutcome,
  type EnrolledLesson,
} from "@/lib/student/classes-service";

export default function LessonDetailPage() {
  const params = useParams<{ classId: string; lessonId: string }>();
  const classId = decodeURIComponent(params?.classId ?? "");
  const lessonId = decodeURIComponent(params?.lessonId ?? "");

  const validIds = isValidUuid(classId) && isValidUuid(lessonId);
  const [lesson, setLesson] = useState<EnrolledLesson | null>(null);
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);

  const loadDetail = useCallback(async () => {
    if (!validIds) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [lessonRes, classRes] = await Promise.allSettled([
      fetchEnrolledLessonDetail(classId, lessonId),
      fetchEnrolledClassDetail(classId),
    ]);
    if (lessonRes.status === "rejected") {
      setError(lessonRes.reason);
      setLesson(null);
    } else {
      setLesson(lessonRes.value);
    }
    // Header context only: a failed class read must not hide a loaded lesson.
    setClassName(classRes.status === "fulfilled" ? classRes.value.name : null);
    setLoading(false);
  }, [classId, lessonId, validIds]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const outcome = resolveSingleLessonOutcome(loading, error, lesson, validIds);

  if (outcome === "loading") {
    return (
      <div className="stack gap-6">
        <PageHead title="Đang tải bài học..." sub="Vui lòng chờ giây lát" />
        <SkeletonPanel rows={2} height={140} />
      </div>
    );
  }

  if (outcome === "invalid_id") {
    return (
      <div className="stack gap-6">
        <PageHead
          title="Đường dẫn không hợp lệ"
          sub="Mã lớp hoặc mã bài học không đúng định dạng."
        />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được bài học"
            text="Vui lòng kiểm tra lại đường dẫn hoặc quay về danh sách lớp."
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

  if (outcome === "forbidden") {
    return (
      <div className="stack gap-6">
        <PageHead
          title="Không có quyền truy cập"
          sub="Bạn chưa tham gia lớp học này hoặc không có quyền xem bài học."
        />
        <Panel className="panel--pad">
          <EmptyState
            title="Quyền truy cập bị từ chối"
            text="Chỉ học viên đang tham gia lớp mới có thể xem nội dung bài học."
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

  if (outcome === "not_found") {
    return (
      <div className="stack gap-6">
        <PageHead
          title="Không tìm thấy bài học"
          sub="Bài học này không thuộc lớp bạn đang mở, hoặc không tồn tại."
        />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được bài học"
            text="Kiểm tra lại đường dẫn, hoặc quay lại chi tiết lớp học."
            action={
              <Link href={`/student/classes/${classId}`} className="btn btn--primary">
                <ArrowLeft size={16} /> Về lớp học
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  if (outcome === "error" || !lesson) {
    return (
      <div className="stack gap-6">
        <PageHead title="Lỗi kết nối" sub="Không thể tải dữ liệu bài học." />
        <Panel className="panel--pad">
          <ErrorState
            title="Không tải được nội dung bài học"
            text="Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng thử lại."
            onRetry={loadDetail}
          />
        </Panel>
      </div>
    );
  }

  return (
    <div className="stack gap-6">
      <Link href={`/student/classes/${classId}`} className="backlink">
        <ArrowLeft size={15} /> {className ?? "Về lớp học"}
      </Link>

      <PageHead
        eyebrow={`Bài ${lesson.orderIndex + 1}`}
        title={lesson.title}
        sub={className ?? "Bài học"}
      />

      {lesson.description ? (
        <Panel className="panel--pad">
          <p className="lms-prose">{lesson.description}</p>
        </Panel>
      ) : null}

      <Panel className="panel--pad">
        <div className="stack gap-3">
          <h2 className="section-title">Tài liệu buổi học</h2>
          {lesson.contentType === "video" ? (
            <div className="lms-attach">
              <PlayCircle size={18} aria-hidden="true" />
              <span className="grow">Video bài giảng</span>
              <Chip>Chưa khả dụng trong phiên bản hiện tại</Chip>
            </div>
          ) : null}
          {lesson.contentType === "document" ? (
            <div className="lms-attach">
              <FileText size={18} aria-hidden="true" />
              <span className="grow">Tài liệu đính kèm</span>
              <Chip icon={<Download size={13} />}>Chưa khả dụng</Chip>
            </div>
          ) : null}
          {lesson.contentType === "text" || lesson.contentType === "mixed" ? (
            <div className="lms-attach">
              <FileText size={18} aria-hidden="true" />
              <span className="grow">Nội dung bài học</span>
              <Chip>Đang cập nhật</Chip>
            </div>
          ) : null}
          <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)", margin: 0 }}>
            Giao diện bài học chi tiết cho học viên sẽ khả dụng khi API nội dung bài học hoàn tất (S-LESSON-2).
          </p>
        </div>
      </Panel>

      <Panel className="panel--pad">
        <div className="stack gap-2">
          <h2 className="section-title">Bài tập của buổi này</h2>
          <p className="section-sub" style={{ color: "var(--text-2)" }}>
            Bài tập gắn với bài học sẽ khả dụng khi API bài tập (S-LESSON-3) hoàn tất.
          </p>
        </div>
      </Panel>
    </div>
  );
}
