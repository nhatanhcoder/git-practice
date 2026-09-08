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
 *
 * Task A07:
 * - Join modal wired to POST /student/classes/join. Client-side shape check mirrors
 *   JoinClassDto (trim + uppercase + 8 chars A-Z0-9); everything else is the server's
 *   registry code, never a guessed HTTP status.
 * - Success only after the server confirms: toast, close, refetch. Failure keeps the
 *   input and shows the mapped message inline. Rejoin is a server concern — success
 *   is success, whether it was a first join or a reactivation.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Plus,
  Ticket,
  TriangleAlert,
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
  describeJoinFailure,
  fetchMyEnrolledClasses,
  joinClassByCode,
  JOIN_CODE_MESSAGES,
  resolveTeacherName,
  validateJoinCode,
  type EnrolledClass,
} from "@/lib/student/classes-service";

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);

  // A07 join-form state. `joinLock` is a ref for the same reason A04's submit lock is:
  // React state updates asynchronously, so two clicks (or Enter + click) in one tick
  // both read joinSubmitting === false and both fire a POST.
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const joinLock = useRef(false);
  const toast = useToast();

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

  function closeJoin() {
    setJoinOpen(false);
    // The typed code stays for a reopen-and-retry; only the stale error clears.
    setJoinError(null);
  }

  async function submitJoin(event: React.FormEvent) {
    event.preventDefault();
    if (joinLock.current) return;

    // Wrong shape is answered locally with the DTO's own messages — it never
    // becomes a POST. CLASS_ENROLL_CODE_INVALID ("this code names no class")
    // is a different, server-only fact and must not be faked here.
    const issue = validateJoinCode(joinCode);
    if (issue) {
      setJoinError(JOIN_CODE_MESSAGES[issue]);
      return;
    }

    joinLock.current = true;
    setJoinSubmitting(true);
    setJoinError(null);
    try {
      // Only past this line has the server accepted the enrollment. Nothing
      // below is an optimistic guess.
      const result = await joinClassByCode(joinCode);
      toast(`Đã tham gia lớp ${result.name}.`, "success");
      setJoinOpen(false);
      setJoinCode("");
      await loadClasses();
    } catch (err) {
      // The input is kept exactly as typed; the message comes from the
      // registry code (or the network). No fake class is prepended locally.
      setJoinError(describeJoinFailure(err));
    } finally {
      joinLock.current = false;
      setJoinSubmitting(false);
    }
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Học cùng giáo viên"
        title="Lớp của tôi"
        sub={
          loading
            ? "Đang tải danh sách lớp học..."
            : error
              ? "Không tải được danh sách lớp."
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
        onClose={closeJoin}
        title="Tham gia lớp học"
        subtitle="Nhập mã gồm 8 ký tự (chữ in hoa và chữ số) do giáo viên cung cấp."
      >
        <form className="stack gap-4" onSubmit={submitJoin} noValidate>
          <label className="field">
            <span className="sr-only">Mã lớp</span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="VD: H3TT2645"
              maxLength={12}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              disabled={joinSubmitting}
              aria-label="Mã lớp (8 ký tự)"
              aria-invalid={joinError ? true : undefined}
              style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
            />
          </label>

          {joinError ? (
            <div
              className="notice"
              role="alert"
              style={{ background: "var(--danger-soft)", color: "var(--text-1)" }}
            >
              <TriangleAlert size={16} style={{ color: "var(--danger)", flex: "none" }} />
              <span>{joinError}</span>
            </div>
          ) : null}

          <div className="row gap-3 wrap">
            <button
              type="button"
              className="btn btn--outline"
              onClick={closeJoin}
              disabled={joinSubmitting}
            >
              Đóng
            </button>
            <button
              type="submit"
              className="btn btn--primary grow"
              disabled={joinSubmitting}
            >
              {joinSubmitting ? "Đang tham gia..." : "Tham gia"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}