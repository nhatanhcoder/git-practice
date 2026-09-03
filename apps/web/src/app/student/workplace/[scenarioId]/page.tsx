"use client";

/**
 * /student/workplace/[scenarioId] — the conversation.
 *
 * A briefing screen first (context and vocabulary, so the learner is not
 * ambushed), then the exchange itself: read what the counterpart sent, write a
 * reply, get it scored against the points a real reply has to cover.
 *
 * MOCK(student): `scoreReply` is keyword coverage plus a length check. It is
 * not a judgement of the Chinese — the model answer is shown alongside so the
 * learner compares against something real rather than trusting the number.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ClipboardList, Play, Send, Sparkles } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
} from "@/components/student/primitives";
import { AudioButton } from "@/components/student/controls";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { SCENARIO_KIND_LABEL, scenarios } from "@/lib/student/content";
import { scoreReply } from "@/lib/student/student-rules";

interface Exchange {
  turnId: string;
  reply: string;
  score: number;
  hit: string[];
  missed: string[];
}

export default function ScenarioPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = decodeURIComponent(params?.scenarioId ?? "");
  const scenario = scenarios.find((s) => s.id === scenarioId) ?? null;

  const saveWorkplace = useStudentStore((s) => s.saveWorkplace);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  const [started, setStarted] = useState(false);
  const [turnIdx, setTurnIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const turn = scenario?.turns[turnIdx] ?? null;
  const average = useMemo(
    () =>
      history.length
        ? Math.round(history.reduce((n, h) => n + h.score, 0) / history.length)
        : 0,
    [history],
  );

  if (!scenario) {
    return (
      <>
        <PageHead title="Không tìm thấy tình huống" />
        <Panel className="panel--pad">
          <EmptyState
            title="Kịch bản này không tồn tại"
            action={
              <Link href="/student/workplace" className="btn btn--primary">
                Về danh sách tình huống
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  function insertPhrase(word: string) {
    setDraft((d) => (d ? `${d}${word}` : word));
    textareaRef.current?.focus();
  }

  function send() {
    if (!turn || !draft.trim()) return;
    const result = scoreReply(draft, turn);
    setHistory((h) => [...h, { turnId: turn.id, reply: draft, ...result }]);
    setDraft("");

    if (turnIdx + 1 >= scenario!.turns.length) {
      const scores = [...history.map((h) => h.score), result.score];
      const final = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      saveWorkplace(scenario!.id, final);
      awardXp(final >= 80 ? 120 : 60, 8);
      toast(`Xong kịch bản — ${final} điểm`, final >= 80 ? "success" : "info");
      setDone(true);
      return;
    }
    setTurnIdx((n) => n + 1);
  }

  /* ---------- Briefing ---------- */
  if (!started) {
    return (
      <>
        <Link href="/student/workplace" className="backlink">
          <ArrowLeft size={14} /> Mô phỏng công sở
        </Link>

        <PageHead
          title={scenario.title}
          sub={`${SCENARIO_KIND_LABEL[scenario.kind]} · HSK ${scenario.level} · đối tác: ${scenario.counterpart}`}
        />

        <Panel className="panel--pad">
          <SectionHeader title="Bối cảnh" sub="Đọc trước khi bắt đầu" />
          <p style={{ color: "var(--text-2)" }}>{scenario.context}</p>
        </Panel>

        <Panel className="panel--pad">
          <SectionHeader title="Tiêu chí chấm" sub="Bảng tiêu chí mô phỏng" />
          <div className="stack gap-2">
            {scenario.criteria.map((c) => (
              <div key={c} className="row gap-2">
                <ClipboardList size={16} style={{ color: "var(--accent)" }} />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="panel--pad">
          <SectionHeader title="Chuẩn bị từ vựng" sub="Mở sẵn khi làm bài, bấm để chèn nhanh" />
          <div className="stack">
            {scenario.vocab.map((v) => (
              <div key={v.word} className="wordrow">
                <AudioButton say={v.word} label={v.word} size={32} />
                <span className="grow stack gap-1">
                  <span className="wordrow__hanzi han">{v.word}</span>
                  <span className="wordrow__pinyin pinyin">{v.pinyin}</span>
                </span>
                <span className="wordrow__vi vi-meaning">{v.vi}</span>
              </div>
            ))}
          </div>
        </Panel>

        <button
          type="button"
          className="btn btn--primary btn--lg"
          onClick={() => setStarted(true)}
        >
          <Play size={18} /> Bắt đầu tình huống
        </button>
      </>
    );
  }

  /* ---------- Conversation ---------- */
  return (
    <>
      <Link href="/student/workplace" className="backlink">
        <ArrowLeft size={14} /> Mô phỏng công sở
      </Link>

      <PageHead
        title={scenario.title}
        sub={
          done
            ? `Hoàn thành · điểm trung bình ${average}`
            : `Lượt ${turnIdx + 1}/${scenario.turns.length} · ${scenario.counterpart}`
        }
      />

      <Bar
        value={(history.length / scenario.turns.length) * 100}
        label="Tiến độ tình huống"
      />

      <div className="exam-layout">
        <div className="stack gap-5">
          {/* ---------- Thread ---------- */}
          <Panel className="panel--pad">
            <div className="dialogue">
              {scenario.turns.slice(0, history.length + (done ? 0 : 1)).map((t, i) => {
                const answered = history.find((h) => h.turnId === t.id);
                return (
                  <div key={t.id} className="stack gap-4">
                    <div className="msg">
                      <div className="row gap-2" style={{ marginBottom: 6 }}>
                        <Chip tone="accent">{scenario.counterpart}</Chip>
                        <AudioButton say={t.incoming} label={`lượt ${i + 1}`} size={28} />
                      </div>
                      <p className="msg__hanzi han">{t.incoming}</p>
                      <p className="msg__pinyin pinyin">{t.incomingPinyin}</p>
                      <p className="msg__vi vi-meaning">{t.incomingVi}</p>
                    </div>

                    {answered ? (
                      <>
                        <div className="msg msg--you">
                          <div className="row gap-2" style={{ marginBottom: 6 }}>
                            <Chip tone="info">Bạn</Chip>
                            <Chip tone={answered.score >= 80 ? "success" : "warn"}>
                              <span className="num">{answered.score}</span> điểm
                            </Chip>
                          </div>
                          <p className="msg__hanzi han">{answered.reply}</p>
                        </div>

                        <div className={`verdict ${answered.score >= 80 ? "is-right" : ""}`}>
                          <p className="verdict__title">Chấm mô phỏng</p>
                          <div className="row gap-2 wrap" style={{ marginTop: 6 }}>
                            {answered.hit.map((k) => (
                              <Chip key={k} tone="success" icon={<Check size={12} />}>
                                <span className="han">{k}</span>
                              </Chip>
                            ))}
                            {answered.missed.map((k) => (
                              <Chip key={k} tone="danger">
                                thiếu <span className="han">{k}</span>
                              </Chip>
                            ))}
                          </div>
                          <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)", marginTop: 8 }}>
                            <strong>Mẫu tham khảo:</strong>{" "}
                            <span className="han">{t.model}</span>
                          </p>
                          <p className="vi-meaning" style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                            {t.modelVi}
                          </p>
                          <p style={{ color: "var(--warn)", fontSize: "var(--step--2)", marginTop: 6 }}>
                            Lỗi thường gặp: {t.pitfall}
                          </p>
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* ---------- Composer ---------- */}
          {!done && turn ? (
            <Panel className="panel--pad">
              <SectionHeader title="Việc cần làm" sub={turn.task} />
              <div className="stack gap-3">
                <div className="row gap-2 wrap">
                  {turn.phrases.map((p) => (
                    <button
                      key={p.word}
                      type="button"
                      className="phrase-chip"
                      onClick={() => insertPhrase(p.word)}
                    >
                      <span className="phrase__hanzi han">{p.word}</span>
                      <span className="phrase__pinyin pinyin">{p.pinyin}</span>
                      <span className="phrase__vi vi-meaning">{p.vi}</span>
                    </button>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  className="textarea han"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Soạn câu trả lời bằng tiếng Trung…"
                  aria-label="Câu trả lời của bạn"
                />
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={send}
                  disabled={!draft.trim()}
                >
                  <Send size={16} /> Gửi trả lời
                </button>
              </div>
            </Panel>
          ) : null}

          {done ? (
            <Panel className="panel--pad">
              <div className="stack gap-4" style={{ alignItems: "center", textAlign: "center" }}>
                <span className="hero__mark han" aria-hidden="true">
                  {scenario.hanzi.slice(0, 1)}
                </span>
                <h2 style={{ fontSize: "var(--step-3)" }}>
                  Điểm trung bình <span className="num">{average}</span>
                </h2>
                <Bar value={average} tone={average >= 80 ? "success" : "accent"} label="Điểm tình huống" />
                <p style={{ color: "var(--text-2)" }}>
                  <Sparkles size={14} style={{ display: "inline" }} /> Điểm được tính từ mức phủ
                  từ khoá — hãy so câu của bạn với mẫu tham khảo ở trên.
                </p>
                <Link href="/student/workplace" className="btn btn--primary">
                  Về danh sách tình huống
                </Link>
              </div>
            </Panel>
          ) : null}
        </div>

        {/* ---------- Side rail ---------- */}
        <div className="stack gap-5">
          <Panel className="panel--pad">
            <SectionHeader title="Tiêu chí" sub="Bảng chấm mô phỏng" />
            <div className="stack gap-2">
              {scenario.criteria.map((c) => (
                <div key={c} className="row gap-2" style={{ fontSize: "var(--step--1)" }}>
                  <ClipboardList size={14} style={{ color: "var(--accent)" }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="panel--pad">
            <SectionHeader title="Từ vựng" sub="Bấm để chèn vào ô soạn" />
            <div className="stack gap-2">
              {scenario.vocab.map((v) => (
                <button
                  key={v.word}
                  type="button"
                  className="phrase-chip"
                  onClick={() => insertPhrase(v.word)}
                  disabled={done}
                >
                  <span className="phrase__hanzi han">{v.word}</span>
                  <span className="phrase__pinyin pinyin">{v.pinyin}</span>
                  <span className="phrase__vi vi-meaning">{v.vi}</span>
                </button>
              ))}
            </div>
          </Panel>

          {history.length > 0 ? (
            <Panel className="panel--pad">
              <SectionHeader title="Điểm từng lượt" />
              <div className="stack gap-2">
                {history.map((h, i) => (
                  <Metric key={h.turnId} label={`Lượt ${i + 1}`} value={h.score} />
                ))}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
