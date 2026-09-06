"use client";

/**
 * /student/mistakes/review — one pass over everything due.
 *
 * The queue is frozen when the session starts. Recomputing it from the store on
 * every answer would drop each card the moment it was answered right, so the
 * counter would jump around and the last card would never render.
 *
 * MOCK(student): box moves go to the store; nothing is submitted.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  PageHead,
  Panel,
  SectionHeader,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { boxInterval } from "@/lib/student/student-rules";

/** XP for each card answered right. */
const XP_PER_CORRECT = 15;

export default function MistakeReviewPage() {
  const mistakes = useStudentStore((s) => s.mistakes);
  const reviewMistake = useStudentStore((s) => s.reviewMistake);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  // Frozen on first render — see the note at the top of the file.
  const [queue] = useState(() => mistakes.filter((m) => m.status === "due"));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const item = queue[idx];
  const options = useMemo(
    () => (item ? [...item.options].sort((a, b) => a.localeCompare(b, "vi")) : []),
    [item],
  );

  function answer(choice: string) {
    if (!item || picked !== null) return;
    const correct = choice === item.answer;
    setPicked(choice);
    reviewMistake(item.id, correct);
    if (correct) {
      setRight((n) => n + 1);
      awardXp(XP_PER_CORRECT, 1);
    }
  }

  function next() {
    if (idx + 1 >= queue.length) {
      setDone(true);
      toast(`Xong phiên — đúng ${right}/${queue.length}`, "success");
      return;
    }
    setIdx((n) => n + 1);
    setPicked(null);
  }

  if (queue.length === 0) {
    return (
      <>
        <Link href="/student/mistakes" className="backlink">
          <ArrowLeft size={14} /> Sổ tay lỗi sai
        </Link>
        <PageHead title="Phiên ôn tập" />
        <Panel className="panel--pad">
          <EmptyState
            title="Không có thẻ nào đến hạn"
            text="Cả sổ tay đang trong lịch chờ. Quay lại khi có thẻ tới hạn, hoặc học thêm chặng mới."
            action={
              <Link href="/student/learning-path" className="btn btn--primary">
                Về lộ trình học
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  if (done) {
    const pct = Math.round((right / queue.length) * 100);
    return (
      <>
        <Link href="/student/mistakes" className="backlink">
          <ArrowLeft size={14} /> Sổ tay lỗi sai
        </Link>
        <PageHead title="Xong phiên ôn" sub={`Đúng ${right}/${queue.length} · +${right * XP_PER_CORRECT} XP`} />
        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="hero__mark han" aria-hidden="true">
              复
            </span>
            <h2 style={{ fontSize: "var(--step-3)" }}>
              Đúng <span className="num">{pct}%</span>
            </h2>
            <Bar value={pct} tone={pct >= 80 ? "success" : "accent"} label="Tỉ lệ đúng phiên này" />
            <p style={{ color: "var(--text-2)" }}>
              Thẻ trả lời đúng đã lên hộp kế tiếp; thẻ sai quay về hộp 1 và sẽ gặp lại sớm.
            </p>
            <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
              <Link href="/student/mistakes" className="btn btn--outline">
                Xem sổ tay
              </Link>
              <Link href="/student" className="btn btn--primary">
                Về trang chủ
              </Link>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <Link href="/student/mistakes" className="backlink">
        <ArrowLeft size={14} /> Sổ tay lỗi sai
      </Link>

      <PageHead
        title={`Ôn lỗi sai · câu ${idx + 1}/${queue.length}`}
        sub={`Đúng ${right} · hộp hiện tại ${item.box} (${boxInterval(item.box)})`}
      />

      <Bar value={((idx + (picked ? 1 : 0)) / queue.length) * 100} label="Tiến độ phiên ôn" />

      <Panel className="panel--pad">
        <SectionHeader title={item.prompt} sub={`Nguồn: ${item.from}`} />

        <div className="stack gap-5">
          <div className="stack gap-2" style={{ textAlign: "center" }}>
            <span className="han" style={{ fontSize: 64, lineHeight: 1.1 }}>
              {item.hanzi}
            </span>
            <span
              className="pinyin"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step-1)" }}
            >
              {item.pinyin}
            </span>
          </div>

          <div className="opt-list">
            {options.map((opt, i) => {
              const state =
                picked === null
                  ? ""
                  : opt === item.answer
                    ? "is-right"
                    : opt === picked
                      ? "is-wrong"
                      : "";
              return (
                <button
                  key={opt}
                  type="button"
                  className={`opt ${state}`}
                  disabled={picked !== null}
                  onClick={() => answer(opt)}
                >
                  <span className="opt__key">{String.fromCharCode(65 + i)}</span>
                  <span className="grow">{opt}</span>
                  {picked !== null && opt === item.answer ? <Check size={16} /> : null}
                  {picked === opt && opt !== item.answer ? <X size={16} /> : null}
                </button>
              );
            })}
          </div>

          {picked !== null ? (
            <>
              <div className={`verdict ${picked === item.answer ? "is-right" : "is-wrong"}`}>
                <p className="verdict__title">
                  {picked === item.answer ? (
                    <>
                      <Sparkles size={14} style={{ display: "inline" }} /> Chính xác — +
                      {XP_PER_CORRECT} XP
                    </>
                  ) : (
                    <>Chưa đúng — đáp án là «{item.answer}»</>
                  )}
                </p>
                <p className="vi-meaning" style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                  {item.tip}
                </p>
              </div>
              <button type="button" className="btn btn--primary btn--block" onClick={next}>
                {idx + 1 >= queue.length ? "Kết thúc phiên" : "Câu tiếp theo"}
              </button>
            </>
          ) : (
            <Chip>Chọn một đáp án để tiếp tục</Chip>
          )}
        </div>
      </Panel>
    </>
  );
}
