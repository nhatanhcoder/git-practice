"use client";

/**
 * /student/placement — the level check.
 *
 * Twelve questions across HSK 1–6 bands. The suggested level is the highest
 * band such that every band below it also has at least one right answer, so one
 * lucky guess at HSK 6 cannot skip a learner past HSK 2.
 *
 * ⚠️ `placementLevel` defaults to a cap of **9**, not 6. The prototype this was
 * distilled from capped at 6 — the stale HSK 1–6 range `DOC-004` exists to stamp
 * out. The question bank here only reaches HSK 6, which is a content gap, not a
 * range decision.
 *
 * MOCK(student): questions from `content.placementQuestions`.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Target, X } from "lucide-react";
import {
  Bar,
  Chip,
  Metric,
  PageHead,
  Panel,
  Ring,
  SectionHeader,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { placementQuestions } from "@/lib/student/content";
import { placementLevel } from "@/lib/student/student-rules";

export default function PlacementPage() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState(false);

  const setCurrentLevel = useStudentStore((s) => s.setCurrentLevel);
  const toast = useToast();

  const q = placementQuestions[idx];
  const correctByLevel = useMemo(() => {
    const acc: Record<number, number> = {};
    for (const item of placementQuestions) {
      if (answers[item.id]) acc[item.level] = (acc[item.level] ?? 0) + 1;
    }
    return acc;
  }, [answers]);

  const recommended = placementLevel(correctByLevel);
  const rightCount = Object.values(answers).filter(Boolean).length;

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((a) => ({ ...a, [q.id]: i === q.answer }));
  }

  function next() {
    if (idx + 1 >= placementQuestions.length) {
      setDone(true);
      return;
    }
    setIdx((n) => n + 1);
    setPicked(null);
  }

  /* ---------- Result ---------- */
  if (done) {
    return (
      <>
        <Link href="/student" className="backlink">
          <ArrowLeft size={14} /> Trang chủ
        </Link>
        <PageHead
          title="Kết quả xếp cấp"
          sub={`Đúng ${rightCount}/${placementQuestions.length} câu`}
        />

        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <Ring
              value={(rightCount / placementQuestions.length) * 100}
              size={128}
              stroke={10}
              label="Tỉ lệ đúng"
            >
              <div className="stack">
                <span className="num" style={{ fontSize: "var(--step-4)", fontWeight: 700 }}>
                  {recommended}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>HSK đề xuất</span>
              </div>
            </Ring>
            <h2 style={{ fontSize: "var(--step-3)" }}>
              Nên bắt đầu từ <em style={{ color: "var(--accent)" }}>HSK {recommended}</em>
            </h2>
            <p style={{ color: "var(--text-2)", maxWidth: "52ch" }}>
              Cấp đề xuất là bậc cao nhất mà mọi bậc từ 1 tới đó đều có ít nhất một câu đúng — một
              câu may mắn ở bậc cao không đẩy bạn vượt cấp.
            </p>

            <div className="grid grid--3" style={{ width: "100%" }}>
              {[1, 2, 3, 4, 5, 6].map((lv) => (
                <Metric
                  key={lv}
                  label={`HSK ${lv}`}
                  value={`${correctByLevel[lv] ?? 0}/${placementQuestions.filter((p) => p.level === lv).length}`}
                />
              ))}
            </div>

            <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  setIdx(0);
                  setPicked(null);
                  setAnswers({});
                  setDone(false);
                }}
              >
                Làm lại
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setCurrentLevel(recommended);
                  toast(`Đã đặt cấp hiện tại thành HSK ${recommended}`, "success");
                }}
              >
                <Target size={16} /> Đặt HSK {recommended} làm cấp hiện tại
              </button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  /* ---------- Question ---------- */
  return (
    <>
      <Link href="/student" className="backlink">
        <ArrowLeft size={14} /> Trang chủ
      </Link>

      <PageHead
        title="Bài kiểm tra xếp cấp"
        sub="Mười hai câu, tăng dần độ khó. Không tính điểm — chỉ để gợi ý chỗ bắt đầu."
        action={<Chip tone="accent">HSK {q.level}</Chip>}
      />

      <Bar value={(idx / placementQuestions.length) * 100} label="Tiến độ bài xếp cấp" />

      <Panel className="panel--pad">
        <SectionHeader
          title={`Câu ${idx + 1}/${placementQuestions.length}`}
          sub={`Bậc HSK ${q.level}`}
        />
        <div className="stack gap-5">
          <p className="ex-prompt">{q.prompt}</p>

          <div className="opt-list">
            {q.options.map((opt, i) => {
              const state =
                picked === null
                  ? ""
                  : i === q.answer
                    ? "is-right"
                    : i === picked
                      ? "is-wrong"
                      : "";
              return (
                <button
                  key={opt}
                  type="button"
                  className={`opt ${state}`}
                  disabled={picked !== null}
                  onClick={() => answer(i)}
                >
                  <span className="opt__key">{String.fromCharCode(65 + i)}</span>
                  <span className="grow">{opt}</span>
                  {picked !== null && i === q.answer ? <Check size={16} /> : null}
                  {picked === i && i !== q.answer ? <X size={16} /> : null}
                </button>
              );
            })}
          </div>

          {picked !== null ? (
            <button type="button" className="btn btn--primary btn--block" onClick={next}>
              {idx + 1 >= placementQuestions.length ? "Xem kết quả" : "Câu tiếp theo"}
            </button>
          ) : null}
        </div>
      </Panel>
    </>
  );
}
