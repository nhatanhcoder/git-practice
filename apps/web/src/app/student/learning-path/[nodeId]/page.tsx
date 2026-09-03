"use client";

/**
 * /student/learning-path/[nodeId] — one lesson, in three steps.
 *
 * Học → Luyện → Hoàn thành. A boss node has to clear a threshold to count;
 * an ordinary lesson only has to be finished. That distinction is the whole
 * point of the boss nodes, so it is enforced here rather than implied.
 *
 * MOCK(student): nothing is submitted anywhere; completion writes to the store.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, Crown, Sparkles, Target } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  PageHead,
  Panel,
  SectionHeader,
} from "@/components/student/primitives";
import { AudioButton } from "@/components/student/controls";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { buildLevelMap, type Curriculum } from "@/lib/student/learning-path-data";
import { grammarPoints } from "@/lib/student/grammar-data";
import { vocabCards } from "@/lib/student/content";
import { shuffleBlocks } from "@/lib/student/student-rules";

/** Boss nodes need this share of the practice questions right to count as cleared. */
const BOSS_PASS_RATE = 0.8;

/**
 * `std-3-l2` → HSK Standard Course, level 3; `hy-1-boss` → Hán Ngữ Giáo Trình,
 * level 1. The ids are built in `learning-path-data.ts` as
 * `std-<level>-l<n>` / `-sq<n>` / `-boss` and `hy-<level>-…`.
 *
 * This used to look for `-L<n>-` and for a `han_yu` prefix, neither of which any
 * generated id has ever contained. Every node above HSK 1, and every Hán Ngữ node,
 * fell back to level 1 of the Standard Course and rendered "Không tìm thấy chặng".
 * Caught by the 375px screen check, which only passed because its fixture happened
 * to be a level-1 Standard Course node.
 */
function levelFromNodeId(nodeId: string): { curriculum: Curriculum; level: number } {
  const match = nodeId.match(/^(std|hy)-(\d+)-/);
  const curriculum: Curriculum =
    match?.[1] === "hy" ? "han_yu_jiao_cheng" : "hsk_standard_course";
  const level = Number(match?.[2] ?? 1);
  return { curriculum, level };
}

export default function LessonPage() {
  const params = useParams<{ nodeId: string }>();
  const nodeId = decodeURIComponent(params?.nodeId ?? "");
  const router = useRouter();
  const toast = useToast();

  const completeLesson = useStudentStore((s) => s.completeLesson);
  const completedLessons = useStudentStore((s) => s.completedLessons);

  const { curriculum, level } = levelFromNodeId(nodeId);
  const node = useMemo(
    () => buildLevelMap(curriculum, level).nodes.find((n) => n.id === nodeId) ?? null,
    [curriculum, level, nodeId],
  );

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);

  const lessonVocab = useMemo(
    () => vocabCards.filter((v) => v.level === Math.min(level, 4)).slice(0, 6),
    [level],
  );
  const lessonGrammar = useMemo(
    () => grammarPoints.filter((g) => g.level === level).slice(0, 2),
    [level],
  );

  /** Four options per question: the right gloss plus three from the same set. */
  const questions = useMemo(
    () =>
      lessonVocab.slice(0, 4).map((v, i) => {
        const distractors = lessonVocab
          .filter((x) => x.id !== v.id)
          .slice(0, 3)
          .map((x) => x.vi);
        const options = shuffleBlocks([v.vi, ...distractors], i + 3) as string[];
        return { id: v.id, hanzi: v.hanzi, pinyin: v.pinyin, options, answer: options.indexOf(v.vi) };
      }),
    [lessonVocab],
  );

  if (!node) {
    return (
      <>
        <PageHead title="Không tìm thấy chặng" />
        <Panel className="panel--pad">
          <EmptyState
            title="Chặng này không tồn tại"
            text="Đường dẫn có thể đã cũ. Quay lại bản đồ để chọn chặng khác."
            action={
              <Link href="/student/learning-path" className="btn btn--primary">
                Về bản đồ lộ trình
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  const isBoss = node.kind === "boss";
  const total = questions.length;
  const passed = total > 0 ? right / total >= BOSS_PASS_RATE : false;
  const alreadyDone = completedLessons.includes(node.id);

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    if (i === questions[qIdx].answer) setRight((n) => n + 1);
  }

  function nextQuestion() {
    if (qIdx + 1 >= total) {
      setStep(3);
      return;
    }
    setQIdx((n) => n + 1);
    setPicked(null);
  }

  // `node` is non-null past the guard above, but a hoisted function declaration
  // does not see that narrowing — bind it to a const the closure can rely on.
  const lesson = node;

  function finish() {
    if (isBoss && !passed) {
      toast(`Ải trùm cần đúng từ ${Math.round(BOSS_PASS_RATE * 100)}% — thử lại nhé`, "warn");
      return;
    }
    completeLesson(lesson.id, lesson.xp);
    toast(`Hoàn thành «${lesson.title}» — +${lesson.xp} XP`, "success");
    router.push("/student/learning-path");
  }

  return (
    <>
      <Link href="/student/learning-path" className="backlink">
        <ArrowLeft size={14} /> Bản đồ HSK {level}
      </Link>

      <PageHead
        title={node.title}
        sub={`${node.minutes} phút · ${node.xp} XP${alreadyDone ? " · đã hoàn thành trước đó" : ""}`}
        action={
          isBoss ? (
            <Chip tone="epic" icon={<Crown size={12} />}>
              Ải trùm — cần đúng ≥ {Math.round(BOSS_PASS_RATE * 100)}%
            </Chip>
          ) : null
        }
      />

      {/* ---------- Stepper ---------- */}
      <Panel className="panel--pad">
        <div className="row gap-3 wrap">
          {[
            { n: 1, label: "Học" },
            { n: 2, label: "Luyện" },
            { n: 3, label: "Hoàn thành" },
          ].map((s) => (
            <button
              key={s.n}
              type="button"
              className={`pill ${step === s.n ? "is-active" : ""}`}
              aria-pressed={step === s.n}
              onClick={() => setStep(s.n as 1 | 2 | 3)}
            >
              <span className="num">{s.n}</span> {s.label}
            </button>
          ))}
          <div className="grow" />
          <Bar
            value={step === 1 ? 20 : step === 2 ? 20 + (qIdx / Math.max(total, 1)) * 60 : 100}
            label="Tiến độ bài học"
          />
        </div>
      </Panel>

      {/* ---------- Step 1: study ---------- */}
      {step === 1 ? (
        <>
          <Panel className="panel--pad">
            <SectionHeader
              title="Từ vựng của bài"
              sub={`${lessonVocab.length} từ · bấm loa để nghe phát âm`}
            />
            <div className="stack">
              {lessonVocab.map((v) => (
                <div key={v.id} className="wordrow">
                  <AudioButton say={v.hanzi} label={v.hanzi} />
                  <span className="grow stack gap-1">
                    <span className="wordrow__hanzi han">{v.hanzi}</span>
                    <span className="wordrow__pinyin pinyin">{v.pinyin}</span>
                  </span>
                  <span className="wordrow__vi vi-meaning">{v.vi}</span>
                </div>
              ))}
            </div>
          </Panel>

          {lessonGrammar.length > 0 ? (
            <Panel className="panel--pad">
              <SectionHeader title="Ngữ pháp của bài" sub="Mở thư viện để xem đầy đủ ví dụ" />
              <div className="stack gap-4">
                {lessonGrammar.map((g) => (
                  <div key={g.id} className="stack gap-2">
                    <div className="row gap-2 wrap">
                      <Chip tone="accent">{g.category}</Chip>
                      <span style={{ fontWeight: 650 }}>{g.title}</span>
                    </div>
                    <span className="gcard__formula" style={{ alignSelf: "flex-start" }}>
                      {g.formula}
                    </span>
                    <span className="han" style={{ fontSize: "var(--step-1)" }}>
                      {g.hanzi}
                    </span>
                    <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--1)" }}>
                      {g.pinyin}
                    </span>
                    <span className="vi-meaning" style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                      {g.vi}
                    </span>
                  </div>
                ))}
              </div>
              {/* `wrap`: at 375px the two labels do not fit on one line — without it the
                  primary button overflows the panel and drags the document to 388px wide. */}
              <div className="row gap-3 wrap" style={{ marginTop: "var(--sp-5)" }}>
                <Link href="/student/grammar" className="btn btn--outline">
                  <BookOpen size={16} /> Mở thư viện ngữ pháp
                </Link>
                <button type="button" className="btn btn--primary grow" onClick={() => setStep(2)}>
                  <Target size={16} /> Sang phần luyện tập
                </button>
              </div>
            </Panel>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setStep(2)}>
              <Target size={18} /> Sang phần luyện tập
            </button>
          )}
        </>
      ) : null}

      {/* ---------- Step 2: practise ---------- */}
      {step === 2 && questions.length > 0 ? (
        <Panel className="panel--pad">
          <SectionHeader
            title={`Câu ${qIdx + 1}/${total}`}
            sub={`Đúng ${right}/${qIdx + (picked === null ? 0 : 1)}`}
          />
          <div className="stack gap-5">
            <div className="stack gap-2" style={{ textAlign: "center" }}>
              <span className="han" style={{ fontSize: 56, lineHeight: 1.1 }}>
                {questions[qIdx].hanzi}
              </span>
              <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                {questions[qIdx].pinyin}
              </span>
              <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                Từ này nghĩa là gì?
              </span>
            </div>

            <div className="opt-list">
              {questions[qIdx].options.map((opt, i) => {
                const state =
                  picked === null
                    ? ""
                    : i === questions[qIdx].answer
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
                    {picked !== null && i === questions[qIdx].answer ? <Check size={16} /> : null}
                  </button>
                );
              })}
            </div>

            {picked !== null ? (
              <button type="button" className="btn btn--primary btn--block" onClick={nextQuestion}>
                {qIdx + 1 >= total ? "Xem kết quả" : "Câu tiếp theo"}
              </button>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {/* ---------- Step 3: finish ---------- */}
      {step === 3 ? (
        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span
              className="hero__mark han"
              style={{ background: passed || !isBoss ? "var(--success)" : "var(--surface-3)" }}
              aria-hidden="true"
            >
              {passed || !isBoss ? "成" : "再"}
            </span>
            <h2 style={{ fontSize: "var(--step-3)" }}>
              {isBoss && !passed ? "Chưa qua ải" : "Hoàn thành bài học"}
            </h2>
            <p style={{ color: "var(--text-2)" }}>
              Đúng <span className="num">{right}</span>/<span className="num">{total}</span> câu
              {isBoss
                ? ` · ải trùm cần ≥ ${Math.round(BOSS_PASS_RATE * 100)}%`
                : ` · thưởng ${node.xp} XP`}
            </p>
            <Bar
              value={total ? (right / total) * 100 : 0}
              tone={passed || !isBoss ? "success" : "accent"}
              label="Tỉ lệ đúng"
            />
            <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => {
                  setStep(2);
                  setQIdx(0);
                  setPicked(null);
                  setRight(0);
                }}
              >
                Làm lại phần luyện
              </button>
              <button type="button" className="btn btn--primary" onClick={finish}>
                <Sparkles size={16} /> Hoàn thành chặng
              </button>
            </div>
          </div>
        </Panel>
      ) : null}
    </>
  );
}
