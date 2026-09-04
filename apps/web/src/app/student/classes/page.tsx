"use client";

/**
 * /student/classes — the classes the learner has joined, and the join-by-code dialog.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-classes-list.md
 * Features: S-CLS-1 (join by 8-character code), S-CLS-2 (list).
 *
 * MOCK(S-CLS-1, S-CLS-2): fixtures from `lib/student/lms-data.ts`. `API_STUDENT.md`
 * defines `GET /api/v1/student/classes` and `POST /api/v1/student/classes/join`, but
 * `apps/api` implements neither yet, so joining mutates local state and is lost on
 * reload. This does not satisfy Sprint 2 F2.3.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, GraduationCap, Plus, Ticket, User } from "lucide-react";
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
import { assignmentsForClass, studentClasses, type StudentClass } from "@/lib/student/lms-data";

/** The enrollment code is 8 characters — ENTITY_CLASS, and S-CLS-1. */
const CODE_LENGTH = 8;

function openCount(classId: string): number {
  return assignmentsForClass(classId).filter(
    (a) => a.status === "not_started" || a.status === "in_progress",
  ).length;
}

export default function StudentClassesPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [joined, setJoined] = useState<StudentClass[]>(studentClasses);
  const [joinOpen, setJoinOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const pushToast = useToast();

  const list = demo === "empty" ? [] : joined;
  const totalOpen = useMemo(
    () => list.reduce((sum, c) => sum + openCount(c.id), 0),
    [list],
  );

  function submitJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== CODE_LENGTH) {
      setCodeError(`Mã lớp gồm đúng ${CODE_LENGTH} ký tự.`);
      return;
    }
    const match = studentClasses.find((c) => c.enrollmentCode === trimmed);
    if (!match) {
      // The real branch has no registered error code — DOC-007 lists CLASS_CODE_INVALID
      // among the codes that do not exist. When the API lands, show its envelope
      // `message` here instead of this string.
      setCodeError("Không tìm thấy lớp với mã này.");
      return;
    }
    if (joined.some((c) => c.id === match.id)) {
      setCodeError("Bạn đã ở trong lớp này rồi.");
      return;
    }
    setJoined((prev) => [match, ...prev]);
    setJoinOpen(false);
    setCode("");
    setCodeError(null);
    pushToast(`Đã tham gia ${match.name}`, "success");
  }

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Học cùng giáo viên"
        title="Lớp của tôi"
        sub={
          list.length
            ? `${list.length} lớp đang học · ${totalOpen} bài tập chưa hoàn thành`
            : "Nhập mã lớp giáo viên cung cấp để bắt đầu."
        }
        action={
          <button type="button" className="btn btn--primary" onClick={() => setJoinOpen(true)}>
            <Plus size={16} /> Tham gia lớp
          </button>
        }
      />

      {demo === "loading" ? <SkeletonPanel rows={3} height={104} /> : null}

      {demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState
            title="Không tải được danh sách lớp"
            onRetry={() => setDemo("ready")}
          />
        </Panel>
      ) : null}

      {demo === "empty" || (demo === "ready" && list.length === 0) ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Bạn chưa tham gia lớp nào"
            text="Giáo viên sẽ cho bạn một mã gồm 8 ký tự. Nhập mã đó để vào lớp và thấy bài học, bài tập của lớp."
            action={
              <button type="button" className="btn btn--primary" onClick={() => setJoinOpen(true)}>
                <Ticket size={16} /> Nhập mã lớp
              </button>
            }
          />
        </Panel>
      ) : null}

      {demo === "ready" && list.length > 0 ? (
        <div className="lms-cards">
          {list.map((c) => {
            const open = openCount(c.id);
            return (
              <Link key={c.id} href={`/student/classes/${c.id}`} className="lms-card">
                <div className="row gap-2 wrap">
                  <Chip tone="info">HSK {c.hskLevel}</Chip>
                  {open > 0 ? <Chip tone="warn">{open} bài cần làm</Chip> : null}
                </div>
                <h2 className="lms-card__title">{c.name}</h2>
                <p className="lms-card__meta">
                  <User size={14} aria-hidden="true" /> {c.teacherName}
                </p>
                <p className="lms-card__meta">
                  <CalendarDays size={14} aria-hidden="true" /> {c.schedule}
                </p>
                <p className="lms-card__code">
                  <GraduationCap size={14} aria-hidden="true" /> Mã lớp {c.enrollmentCode}
                </p>
              </Link>
            );
          })}
        </div>
      ) : null}

      <Modal
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          setCodeError(null);
        }}
        title="Tham gia lớp"
      >
        <div className="stack gap-4">
          <label className="stack gap-2">
            <span className="section-sub">Mã lớp ({CODE_LENGTH} ký tự)</span>
            <input
              className="field"
              value={code}
              maxLength={CODE_LENGTH}
              autoFocus
              placeholder="VD: H3TT2645"
              // Uppercased on the way in so the learner cannot fail on case alone.
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setCodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitJoin();
              }}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? "join-code-error" : undefined}
            />
          </label>
          {codeError ? (
            <p id="join-code-error" className="notice" role="alert">
              {codeError}
            </p>
          ) : null}
          <div className="row gap-3 wrap">
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => {
                setJoinOpen(false);
                setCodeError(null);
              }}
            >
              Huỷ
            </button>
            <button
              type="button"
              className="btn btn--primary grow"
              onClick={submitJoin}
              disabled={code.trim().length === 0}
            >
              Tham gia
            </button>
          </div>
        </div>
      </Modal>

      <DemoStateSwitcher value={demo} onChange={setDemo} />
    </div>
  );
}
