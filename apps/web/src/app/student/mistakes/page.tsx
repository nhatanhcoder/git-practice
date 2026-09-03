"use client";

/**
 * /student/mistakes — the mistake notebook.
 *
 * Every wrong answer anywhere in the app lands here with the question, what was
 * picked, what was right, and why. Five Leitner boxes decide when it comes back.
 *
 * MOCK(student): seeded from `content.mistakeSeed`; the store owns box moves.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { NotebookPen, Play, Search } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, LevelSelector, type DemoState } from "@/components/student/controls";
import { useStudentStore } from "@/lib/student/store";
import { SRS_BOXES, boxInterval } from "@/lib/student/student-rules";
import type { MistakeKind, MistakeStatus } from "@/lib/student/types";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const KIND_LABEL: Record<MistakeKind, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  character: "Chữ Hán",
  listening: "Nghe",
  reading: "Đọc",
};

const STATUS_LABEL: Record<MistakeStatus, string> = {
  due: "Đến hạn",
  scheduled: "Đã lên lịch",
  learned: "Đã thuộc",
};

const STATUS_TONE: Record<MistakeStatus, "danger" | "info" | "success"> = {
  due: "danger",
  scheduled: "info",
  learned: "success",
};

export default function MistakesPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [kind, setKind] = useState<MistakeKind | "all">("all");
  const [status, setStatus] = useState<MistakeStatus | "all">("all");
  const [level, setLevel] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  const mistakes = useStudentStore((s) => s.mistakes);

  const counts = useMemo(() => {
    const byBox = SRS_BOXES.map((b) => ({
      ...b,
      count: mistakes.filter((m) => m.box === b.box).length,
    }));
    return {
      byBox,
      due: mistakes.filter((m) => m.status === "due").length,
      learned: mistakes.filter((m) => m.status === "learned").length,
    };
  }, [mistakes]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mistakes.filter((m) => {
      if (kind !== "all" && m.kind !== kind) return false;
      if (status !== "all" && m.status !== status) return false;
      if (level !== "all" && m.level !== level) return false;
      if (!q) return true;
      return (
        m.prompt.toLowerCase().includes(q) ||
        m.hanzi.includes(q) ||
        m.answer.toLowerCase().includes(q)
      );
    });
  }, [mistakes, kind, status, level, query]);

  return (
    <>
      <PageHead
        title={
          <>
            Sổ tay <em>lỗi sai</em>
          </>
        }
        sub="Ôn đúng chỗ đã sai. Trả lời đúng thì thẻ lên hộp, sai thì về hộp 1."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={5} height={180} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- SRS overview ---------- */}
          <Panel className="panel--pad">
            <SectionHeader
              title="Năm hộp ôn tập"
              sub="Khoảng cách ôn giãn dần — hộp càng cao, càng lâu mới gặp lại."
              action={
                counts.due > 0 ? (
                  <Link href="/student/mistakes/review" className="btn btn--primary">
                    <Play size={16} /> Ôn {counts.due} thẻ đến hạn
                  </Link>
                ) : null
              }
            />
            <div className="srs-boxes">
              {counts.byBox.map((b) => (
                <div key={b.box} className="srs-box">
                  <div className="srs-box__n num">{b.count}</div>
                  <div className="srs-box__label">{b.label}</div>
                  <div className="srs-box__label" style={{ fontSize: 10 }}>
                    {b.interval.replace("Ôn lại sau ", "")}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* ---------- Filters ---------- */}
          <Panel className="panel--pad">
            <div className="stack gap-4">
              <label className="field">
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm trong câu hỏi, chữ Hán hoặc đáp án…"
                  aria-label="Tìm lỗi sai"
                />
              </label>

              <div className="row gap-2 wrap">
                <button
                  type="button"
                  className={`pill ${kind === "all" ? "is-active" : ""}`}
                  aria-pressed={kind === "all"}
                  onClick={() => setKind("all")}
                >
                  Mọi loại
                </button>
                {(Object.keys(KIND_LABEL) as MistakeKind[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`pill ${kind === k ? "is-active" : ""}`}
                    aria-pressed={kind === k}
                    onClick={() => setKind(k)}
                  >
                    {KIND_LABEL[k]}
                  </button>
                ))}
              </div>

              <div className="row gap-2 wrap">
                <button
                  type="button"
                  className={`pill ${status === "all" ? "is-active" : ""}`}
                  aria-pressed={status === "all"}
                  onClick={() => setStatus("all")}
                >
                  Mọi trạng thái
                </button>
                {(Object.keys(STATUS_LABEL) as MistakeStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`pill ${status === s ? "is-active" : ""}`}
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="row gap-3 wrap">
                <button
                  type="button"
                  className={`pill ${level === "all" ? "is-active" : ""}`}
                  aria-pressed={level === "all"}
                  onClick={() => setLevel("all")}
                >
                  Mọi cấp
                </button>
                <LevelSelector
                  levels={LEVELS.map((id) => ({ id }))}
                  value={typeof level === "number" ? level : -1}
                  onChange={setLevel}
                />
              </div>
            </div>
          </Panel>

          {/* ---------- List ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                  Lỗi đã ghi
                </h2>
                <p className="section-sub">
                  <span className="num">{results.length}</span> mục khớp bộ lọc ·{" "}
                  <span className="num">{counts.learned}</span> đã thuộc
                </p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {demo === "empty" || results.length === 0 ? (
                <EmptyState
                  icon={<NotebookPen size={26} />}
                  title="Chưa có lỗi nào ở đây"
                  text="Làm bài ở bất kỳ khu vực nào — câu sai sẽ tự xuất hiện trong sổ tay này."
                  action={
                    <Link href="/student/exams" className="btn btn--outline">
                      Vào phòng thi
                    </Link>
                  }
                />
              ) : (
                results.map((m) => (
                  <article key={m.id} className="mistake">
                    <div className="row gap-2 wrap">
                      <Chip tone="accent">HSK {m.level}</Chip>
                      <Chip>{KIND_LABEL[m.kind]}</Chip>
                      <Chip tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Chip>
                      <div className="grow" />
                      <span className="mistake__meta">
                        Hộp <span className="num">{m.box}</span> · {boxInterval(m.box)}
                      </span>
                    </div>

                    <p className="mistake__prompt">{m.prompt}</p>

                    <div className="mistake-source">
                      <span className="mistake-source__hanzi han">{m.hanzi}</span>
                      <span className="mistake-source__pinyin pinyin">{m.pinyin}</span>
                    </div>

                    <div className="row gap-4 wrap" style={{ fontSize: "var(--step--1)" }}>
                      <span style={{ color: "var(--danger)" }}>
                        Bạn chọn: <strong>{m.chosen}</strong>
                      </span>
                      <span style={{ color: "var(--success)" }}>
                        Đáp án: <strong>{m.answer}</strong>
                      </span>
                    </div>

                    <p className="mistake__meta vi-meaning">{m.tip}</p>
                    <span className="mistake__meta">Nguồn: {m.from}</span>
                  </article>
                ))
              )}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
