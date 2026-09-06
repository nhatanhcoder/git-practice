"use client";

/**
 * /student/exams/[examId]/result — the score card.
 *
 * Total, then per skill against the 60% line, then every question with what was
 * picked and why the right answer is right. The per-question review is the part
 * that turns a score into something learnable.
 *
 * MOCK(student): reads the most recent attempt for this exam from the store.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Award, Check, RotateCcw, X } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  Metric,
  PageHead,
  Panel,
  Ring,
  SectionHeader,
} from "@/components/student/primitives";
import { Segmented } from "@/components/student/controls";
import { Modal } from "@/components/student/overlay";
import { useStudentProfile, useStudentStore } from "@/lib/student/store";
import { SECTION_LABEL, exams, getPaper } from "@/lib/student/content";

/** The per-section line the score card compares against. */
const SECTION_PASS_RATE = 0.6;

export default function ExamResultPage() {
  const params = useParams<{ examId: string }>();
  const examId = decodeURIComponent(params?.examId ?? "");
  const attempts = useStudentStore((s) => s.attempts);
  const profile = useStudentProfile();

  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const [certOpen, setCertOpen] = useState(false);

  const attempt = attempts.find((a) => a.examId === examId) ?? null;
  const exam = exams.find((e) => e.id === examId) ?? null;
  const paper = useMemo(() => getPaper(examId), [examId]);
  const flat = useMemo(() => paper.flatMap((s) => s.questions), [paper]);

  if (!attempt || !exam) {
    return (
      <>
        <PageHead title="Không tìm thấy phiếu điểm" />
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có lần thi nào cho đề này"
            text="Làm đề trước, phiếu điểm sẽ xuất hiện ở đây."
            action={
              <Link href="/student/exams" className="btn btn--primary">
                Về phòng thi
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  const pct = Math.round((attempt.score / Math.max(attempt.maxScore, 1)) * 100);
  const review = flat.filter((q) => (filter === "wrong" ? attempt.answers[q.id] !== q.answer : true));

  return (
    <>
      <Link href="/student/exams" className="backlink">
        <ArrowLeft size={14} /> Phòng thi HSK
      </Link>

      <PageHead
        title={`Phiếu điểm · ${attempt.title}`}
        sub={new Date(attempt.at).toLocaleString("vi-VN")}
      />

      {/* ---------- Total ---------- */}
      <section className={`result-hero ${attempt.passed ? "" : "is-fail"}`}>
        <Ring
          value={pct}
          size={120}
          stroke={10}
          color={attempt.passed ? "var(--success)" : "var(--danger)"}
          label="Tỉ lệ đúng"
        >
          <div className="stack">
            <span className="num" style={{ fontSize: "var(--step-3)", fontWeight: 700 }}>
              {pct}%
            </span>
            <span style={{ fontSize: 10, color: "var(--text-3)" }}>
              {attempt.score}/{attempt.maxScore}
            </span>
          </div>
        </Ring>
        <div className="grow stack gap-2">
          <h2 style={{ fontSize: "var(--step-3)" }}>
            {attempt.passed ? "Đạt" : "Chưa đạt"}
          </h2>
          <p style={{ color: "var(--text-2)" }}>
            Mốc qua của đề này là <strong className="num">{exam.passScore}</strong>/
            <strong className="num">{attempt.maxScore}</strong> câu.
          </p>
          <div className="row gap-3 wrap">
            <Chip tone="accent">HSK {attempt.level}</Chip>
            <Chip tone={attempt.passed ? "success" : "danger"}>
              {attempt.passed ? "Qua" : "Chưa qua"}
            </Chip>
            {attempt.passed ? (
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => setCertOpen(true)}
              >
                <Award size={14} /> Xem chứng chỉ mô phỏng
              </button>
            ) : null}
          </div>
        </div>
        <Link href={`/student/exams/${exam.id}`} className="btn btn--primary">
          <RotateCcw size={16} /> Thi lại
        </Link>
      </section>

      {/* ---------- Per section ---------- */}
      <Panel className="panel--pad">
        <SectionHeader title="Điểm theo kỹ năng" sub="So với mốc 60% của từng phần" />
        <div className="stack gap-4">
          {attempt.sections.map((s) => {
            const rate = s.max ? s.score / s.max : 0;
            return (
              <div key={s.section} className="stack gap-2">
                <div className="row gap-3">
                  <span style={{ fontWeight: 650, width: 96 }}>{SECTION_LABEL[s.section]}</span>
                  <Bar
                    value={rate * 100}
                    tone={rate >= SECTION_PASS_RATE ? "success" : "accent"}
                    label={`${SECTION_LABEL[s.section]} ${Math.round(rate * 100)}%`}
                  />
                  <span className="num" style={{ width: 56, textAlign: "right" }}>
                    {s.score}/{s.max}
                  </span>
                </div>
                {rate < SECTION_PASS_RATE ? (
                  <span style={{ color: "var(--warn)", fontSize: "var(--step--2)" }}>
                    Dưới mốc 60% — nên luyện riêng phần này.
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ---------- Per question ---------- */}
      <Panel>
        <div className="panel__head">
          <div>
            <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
              Xem lại bài làm
            </h2>
            <p className="section-sub">Câu sai kèm giải thích ngắn</p>
          </div>
          <Segmented
            options={[
              { value: "all", label: "Tất cả" },
              { value: "wrong", label: "Chỉ câu sai" },
            ]}
            value={filter}
            onChange={setFilter}
            label="Lọc câu xem lại"
          />
        </div>
        <div className="panel__body panel__body--flush">
          {review.length === 0 ? (
            <EmptyState
              title="Không có câu nào sai"
              text="Bài này bạn làm đúng toàn bộ."
            />
          ) : (
            review.map((q, i) => {
              const picked = attempt.answers[q.id];
              const correct = picked === q.answer;
              return (
                <article key={q.id} className={`resultq ${correct ? "is-right" : "is-wrong"}`}>
                  <div className="row gap-2 wrap">
                    <Chip tone={correct ? "success" : "danger"} icon={correct ? <Check size={12} /> : <X size={12} />}>
                      Câu {i + 1}
                    </Chip>
                    <Chip>{SECTION_LABEL[q.section]}</Chip>
                  </div>
                  <p className="resultq__prompt">{q.prompt}</p>
                  {q.passage ? (
                    <p className="han" style={{ color: "var(--text-2)", marginTop: 4 }}>
                      {q.passage}
                    </p>
                  ) : null}
                  <div
                    className="row gap-4 wrap"
                    style={{ fontSize: "var(--step--1)", marginTop: "var(--sp-2)" }}
                  >
                    <span style={{ color: correct ? "var(--success)" : "var(--danger)" }}>
                      Bạn chọn:{" "}
                      <strong className="han">
                        {picked === undefined ? "(bỏ trống)" : q.options[picked]}
                      </strong>
                    </span>
                    {!correct ? (
                      <span style={{ color: "var(--success)" }}>
                        Đáp án: <strong className="han">{q.options[q.answer]}</strong>
                      </span>
                    ) : null}
                  </div>
                  <p
                    className="vi-meaning"
                    style={{ color: "var(--text-3)", fontSize: "var(--step--2)", marginTop: 4 }}
                  >
                    {q.explain}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </Panel>

      {/* ---------- Simulated certificate ---------- */}
      <Modal
        open={certOpen}
        onClose={() => setCertOpen(false)}
        title="Chứng chỉ mô phỏng"
        subtitle="Chỉ là bản xem trước trong mockup — không có giá trị pháp lý"
      >
        <div
          className="stack gap-4"
          style={{
            alignItems: "center",
            textAlign: "center",
            padding: "var(--sp-7)",
            border: "1px solid var(--accent-line)",
            borderRadius: "var(--r-md)",
            background: "var(--accent-soft)",
          }}
        >
          <span className="han" style={{ fontSize: 48 }}>
            汉语水平考试
          </span>
          <Metric label="Học viên" value={profile.name} />
          <Metric label="Cấp độ" value={`HSK ${attempt.level}`} />
          <Metric label="Kết quả" value={`${attempt.score}/${attempt.maxScore} (${pct}%)`} />
          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
            {new Date(attempt.at).toLocaleDateString("vi-VN")}
          </span>
        </div>
      </Modal>
    </>
  );
}
