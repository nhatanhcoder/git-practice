"use client";

/**
 * /student/classes — the classes the learner has joined.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-classes-list.md
 * Features: S-CLS-2 (list), S-CLS-1 (join by code in A07).
 *
 * Task A06:
 * - Real API integration via `GET /api/v1/student/classes` (fetchMyEnrolledClasses).
 * - Removed mock fixtures and demo state controls.
 * - 7 states: loading (SkeletonPanel), ready (real cards), empty (no classes),
 *   error (ErrorState with retry).
 * - Renders only real server fields: name, hskLevel, teacher nickname/email,
 *   studentCount, lessonCount, joinedAt. No invented assignment counts or attendance.
 * - Link uses real class ID.
 * - Join/leave not yet connected -> unavailable notice (A07), no fake local success.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Plus, Ticket, User, Users } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { Modal } from "@/components/student/overlay";
import {
  fetchMyEnrolledClasses,
  resolveTeacherName,
  type EnrolledClass,
} from "@/lib/student/classes-service";

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyEnrolledClasses();
      setClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách lớp");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Học cùng giáo viên"
        title="Lớp của tôi"
        sub={
          loading
            ? "Đang tải danh sách lớp học..."
            : classes.length > 0
              ? `${classes.length} lớp đang học`
              : "Nhập mã lớp giáo viên cung cấp để bắt đầu."
        }
        action={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setJoinOpen(true)}
          >
            <Plus size={16} /> Tham gia lớp
          </button>
        }
      />

      {loading ? <SkeletonPanel rows={3} height={104} /> : null}

      {!loading && error ? (
        <Panel className="panel--pad">
          <ErrorState
            title="Không thể tải danh sách lớp"
            onRetry={loadClasses}
          />
        </Panel>
      ) : null}

      {!loading && !error && classes.length === 0 ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Bạn chưa tham gia lớp nào"
            text="Giáo viên sẽ cho bạn một mã gồm 8 ký tự. Nhập mã đó để vào lớp và thấy bài học của lớp."
            action={
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setJoinOpen(true)}
              >
                <Ticket size={16} /> Nhập mã lớp
              </button>
            }
          />
        </Panel>
      ) : null}

      {!loading && !error && classes.length > 0 ? (
        <div className="lms-cards">
          {classes.map((c) => (
            <Link key={c.id} href={`/student/classes/${c.id}`} className="lms-card">
              <div className="row gap-2 wrap">
                <Chip tone="info">HSK {c.hskLevel}</Chip>
                <Chip tone={c.status === "active" ? "success" : "neutral"}>
                  {c.status === "active" ? "Đang học" : c.status}
                </Chip>
              </div>
              <h2 className="lms-card__title">{c.name}</h2>
              <p className="lms-card__meta">
                <User size={14} aria-hidden="true" /> {resolveTeacherName(c.teacher)}
              </p>
              <div className="row gap-3 wrap lms-card__meta">
                <span className="row gap-1 items-center">
                  <BookOpen size={14} aria-hidden="true" /> {c.lessonCount} bài học
                </span>
                <span className="row gap-1 items-center">
                  <Users size={14} aria-hidden="true" /> {c.studentCount} học viên
                </span>
              </div>
              <p className="lms-card__code">
                <CalendarDays size={14} aria-hidden="true" /> Tham gia{" "}
                {new Date(c.joinedAt).toLocaleDateString("vi-VN")}
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      <Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        title="Tham gia lớp học"
      >
        <div className="stack gap-4">
          <div
            className="notice"
            style={{
              background: "var(--surface-muted, #f1f5f9)",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: "var(--r-md, 8px)",
              padding: "var(--sp-3, 12px)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: "var(--step-0)" }}>
              Tính năng tham gia lớp đang được kết nối (TASK A07)
            </p>
            <p
              style={{
                margin: "var(--sp-1) 0 0",
                fontSize: "var(--step--1)",
                color: "var(--fg-muted, #64748b)",
              }}
            >
              Hệ thống sẽ kết nối với API <code>POST /student/classes/join</code> trong nhiệm vụ kế tiếp (A07) để xác thực mã lớp 8 ký tự trên máy chủ thật. Màn hình này không tạo dữ liệu giả lập.
            </p>
          </div>

          <label className="stack gap-2">
            <span className="section-sub">Mã lớp (8 ký tự)</span>
            <input
              className="field"
              disabled
              placeholder="VD: H3TT2645"
              style={{ opacity: 0.7, cursor: "not-allowed" }}
            />
          </label>

          <div className="row gap-3 wrap">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => setJoinOpen(false)}
            >
              Đóng
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              disabled
              title="Đang chờ kết nối API ở TASK A07"
            >
              Tham gia (Đang kết nối A07)
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}