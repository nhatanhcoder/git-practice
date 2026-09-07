"use client";

/**
 * /student/classes/[classId] — one class: who teaches it, when it meets, its lessons.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-class-detail.md
 * Features: S-CLS-3 (class info), S-CLS-4 (leave), S-LESSON-1 (ordered lesson list).
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  LogOut,
  PlayCircle,
  BookOpen,
  User,
  Users,
} from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import {
  fetchEnrolledClassDetail,
  formatClassJoinedDate,
  isValidUuid,
  resolveClassDetailOutcome,
  resolveTeacherName,
  type EnrolledClassDetail,
} from "@/lib/student/classes-service";

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = decodeURIComponent(params?.classId ?? "");
  const pushToast = useToast();

  const validId = isValidUuid(classId);
  const [detail, setDetail] = useState<EnrolledClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEnrolledClassDetail(classId);
      setDetail(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [classId, validId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const outcome = resolveClassDetailOutcome(loading, error, detail, validId);

  if (outcome === "loading") {
    return (
      <div className="stack gap-6">
        <Link href="/student/classes" className="backlink">
          <ArrowLeft size={15} /> Lớp của tôi
        </Link>
        <PageHead title="Đang tải lớp học..." sub="Vui lòng chờ giây lát" />
        <Panel className="panel--pad">
          <div className="row gap-4 wrap">
            <span className="lms-fact">Đang tải thông tin...</span>
          </div>
        </Panel>
        <SkeletonPanel rows={3} height={72} />
      </div>
    );
  }

  if (outcome === "invalid_id") {
    return (
      <div className="stack gap-6">
        <Link href="/student/classes" className="backlink">
          <ArrowLeft size={15} /> Lớp của tôi
        </Link>
        <PageHead title="Mã lớp không hợp lệ" sub="Định dạng mã lớp không đúng chuẩn." />
        <Panel className="panel--pad">
          <EmptyState
            title="Không mở được lớp"
            text="Mã lớp học trên đường dẫn không hợp lệ. Vui lòng kiểm tra lại hoặc quay về danh sách lớp."
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
        <Link href="/student/classes" className="backlink">
          <ArrowLeft size={15} /> Lớp của tôi
        </Link>
        <PageHead title="Không tìm thấy lớp" sub="Lớp này không tồn tại hoặc đã bị gỡ." />
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

  if (outcome === "forbidden") {
    return (
      <div className="stack gap-6">
        <Link href="/student/classes" className="backlink">
          <ArrowLeft size={15} /> Lớp của tôi
        </Link>
        <PageHead title="Không có quyền truy cập" sub="Bạn chưa tham gia lớp học này hoặc đã rời lớp." />
        <Panel className="panel--pad">
          <EmptyState
            title="Quyền truy cập bị từ chối"
            text="Chỉ học viên đang ghi danh chính thức mới có thể xem nội dung và bài học của lớp này."
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

  if (outcome === "error" || !detail) {
    return (
      <div className="stack gap-6">
        <Link href="/student/classes" className="backlink">
          <ArrowLeft size={15} /> Lớp của tôi
        </Link>
        <PageHead title="Lỗi kết nối" sub="Không thể tải dữ liệu lớp học." />
        <Panel className="panel--pad">
          <ErrorState
            title="Không tải được thông tin lớp học"
            text="Đã xảy ra lỗi khi kết nối tới máy chủ. Vui lòng kiểm tra lại đường truyền."
            onRetry={loadDetail}
          />
        </Panel>
      </div>
    );
  }

  const teacherName = resolveTeacherName(detail.teacher);
  const hasLessons = detail.lessons && detail.lessons.length > 0;

  return (
    <div className="stack gap-6">
      <Link href="/student/classes" className="backlink">
        <ArrowLeft size={15} /> Lớp của tôi
      </Link>

      <PageHead
        eyebrow={`HSK ${detail.hskLevel}`}
        title={detail.name}
        sub={`${teacherName} · ${detail.studentCount} học viên`}
        action={
          <button type="button" className="btn btn--outline" onClick={() => setLeaveOpen(true)}>
            <LogOut size={16} /> Rời lớp
          </button>
        }
      />

      <Panel className="panel--pad">
        <div className="row gap-4 wrap">
          <span className="lms-fact">
            <User size={15} aria-hidden="true" /> {teacherName}
          </span>
          <span className="lms-fact">
            <CalendarDays size={15} aria-hidden="true" /> Tham gia ngày {formatClassJoinedDate(detail.joinedAt)}
          </span>
          <span className="lms-fact">
            <Users size={15} aria-hidden="true" /> {detail.studentCount} học viên
          </span>
        </div>
      </Panel>

      {detail.description ? (
        <Panel className="panel--pad">
          <p className="lms-prose">{detail.description}</p>
        </Panel>
      ) : null}

      {outcome === "empty" ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có bài học nào"
            text="Giáo viên chưa đăng bài học cho lớp này. Khi có bài mới, bài học sẽ xuất hiện ở đây."
          />
        </Panel>
      ) : (
        <div className="stack gap-3">
          {detail.lessons.map((l) => (
            <Link
              key={l.id}
              href={`/student/classes/${detail.id}/lessons/${l.id}`}
              className="lms-lesson"
            >
              <span className="lms-lesson__order">{l.orderIndex + 1}</span>
              <span className="grow">
                <span className="lms-lesson__title">{l.title}</span>
                {l.description ? (
                  <span className="lms-lesson__summary">{l.description}</span>
                ) : null}
                <span className="row gap-2 wrap">
                  {l.contentType === "video" ? (
                    <Chip icon={<PlayCircle size={13} />}>Video</Chip>
                  ) : null}
                  {l.contentType === "document" ? (
                    <Chip icon={<FileText size={13} />}>Tài liệu</Chip>
                  ) : null}
                  {l.contentType === "text" ? (
                    <Chip icon={<BookOpen size={13} />}>Văn bản</Chip>
                  ) : null}
                  {l.contentType === "mixed" ? (
                    <Chip>Hỗn hợp</Chip>
                  ) : null}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Rời khỏi lớp?">
        <div className="stack gap-4">
          <p className="section-sub">
            Bạn sẽ không còn thấy bài học của <strong>{detail.name}</strong>. Điểm các bài đã nộp vẫn được lưu giữ.
          </p>
          <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)", margin: 0 }}>
            Lưu ý: Tính năng rời lớp đang được kết nối với hệ thống máy chủ ở nhiệm vụ tiếp theo (A09).
          </p>
          <div className="row gap-3 wrap">
            <button
              type="button"
              className="btn btn--outline grow"
              onClick={() => setLeaveOpen(false)}
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

