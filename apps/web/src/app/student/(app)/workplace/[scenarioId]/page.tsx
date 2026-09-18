"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ClipboardList, Play, Send } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { AudioButton } from "@/components/student/controls";
import { useToast } from "@/components/student/toast";
import {
  fetchWorkplaceScenario,
  revealWorkplaceTurn,
  type WorkplaceReveal,
  type WorkplaceScenarioDetail,
} from "@/lib/student/workplace-service";

interface Exchange {
  reply: string;
  reveal: WorkplaceReveal;
}
type LoadState = "loading" | "ready" | "error" | "missing";

export default function WorkplaceScenarioPage() {
  const params = useParams<{ scenarioId: string }>();
  const scenarioId = decodeURIComponent(params?.scenarioId ?? "");
  const [state, setState] = useState<LoadState>("loading");
  const [scenario, setScenario] = useState<WorkplaceScenarioDetail | null>(null);
  const [started, setStarted] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [history, setHistory] = useState<Exchange[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    setState("loading");
    try {
      setScenario(await fetchWorkplaceScenario(scenarioId));
      setState("ready");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      setState(code === "WORKPLACE_SCENARIO_NOT_FOUND" ? "missing" : "error");
    }
  }, [scenarioId]);

  useEffect(() => {
    void load();
  }, [load]);

  function insertPhrase(value: string) {
    setDraft((current) => current ? `${current}${value}` : value);
    textareaRef.current?.focus();
  }

  async function send() {
    const turn = scenario?.turns[turnIndex];
    const reply = draft.trim();
    if (!scenario || !turn || !reply) return;
    setSubmitting(true);
    try {
      const reveal = await revealWorkplaceTurn(scenario.id, turn.id, reply);
      setHistory((current) => [...current, { reply, reveal }]);
      setDraft("");
      if (reveal.completed || turnIndex + 1 >= scenario.turns.length) {
        setDone(true);
        toast("Đã hoàn thành tình huống", "success");
      } else {
        setTurnIndex((index) => index + 1);
      }
    } catch {
      toast("Không gửi được — câu trả lời vẫn còn để bạn thử lại", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") return <SkeletonPanel rows={5} height={240} />;
  if (state === "error") return <Panel className="panel--pad"><ErrorState onRetry={() => void load()} /></Panel>;
  if (state === "missing" || !scenario) {
    return <Panel className="panel--pad"><EmptyState title="Kịch bản này không tồn tại" action={<Link href="/student/workplace" className="btn btn--primary">Về danh sách tình huống</Link>} /></Panel>;
  }

  if (!started) {
    return (
      <>
        <Link href="/student/workplace" className="backlink"><ArrowLeft size={14} /> Mô phỏng công sở</Link>
        <PageHead title={scenario.title} sub={`HSK ${scenario.level} · ${scenario.partner} · ${scenario.partnerRole}`} />
        <Panel className="panel--pad"><SectionHeader title="Bối cảnh" sub={scenario.goal} /><p style={{ color: "var(--text-2)" }}>{scenario.brief}</p></Panel>
        <Panel className="panel--pad"><SectionHeader title="Tiêu chí tự đối chiếu" sub="Không phải bảng chấm điểm" /><div className="stack gap-3">{scenario.rubric.map((item) => <div key={item.label} className="row gap-3"><ClipboardList size={16} style={{ color: "var(--accent)" }} /><span><strong>{item.label}:</strong> {item.hint}</span></div>)}</div></Panel>
        <Panel className="panel--pad"><SectionHeader title="Chuẩn bị từ vựng" /><div className="stack">{scenario.vocabulary.map((word) => <div key={word.hanzi} className="wordrow"><AudioButton say={word.hanzi} label={word.hanzi} size={32} /><span className="wordrow__hanzi han">{word.hanzi}</span><span className="wordrow__pinyin pinyin">{word.pinyin}</span><span className="wordrow__vi vi-meaning">{word.vi}</span></div>)}</div></Panel>
        <button type="button" className="btn btn--primary btn--lg" onClick={() => setStarted(true)}><Play size={18} /> Bắt đầu tình huống</button>
      </>
    );
  }

  const currentTurn = scenario.turns[turnIndex];
  return (
    <>
      <Link href="/student/workplace" className="backlink"><ArrowLeft size={14} /> Mô phỏng công sở</Link>
      <PageHead title={scenario.title} sub={done ? "Đã hoàn thành · tự đối chiếu với các mẫu bên dưới" : `Lượt ${turnIndex + 1}/${scenario.turns.length} · ${scenario.partner}`} />
      <div className="exam-layout">
        <div className="stack gap-5">
          <Panel className="panel--pad">
            <div className="dialogue stack gap-5">
              {scenario.turns.slice(0, history.length + (done ? 0 : 1)).map((turn, index) => {
                const exchange = history[index];
                return (
                  <div key={turn.id} className="stack gap-4">
                    <div className="msg">
                      <div className="row gap-2"><Chip tone="accent">{scenario.partner}</Chip><AudioButton say={turn.fromHanzi} label={`lượt ${index + 1}`} size={28} /></div>
                      <p className="msg__hanzi han">{turn.fromHanzi}</p><p className="msg__pinyin pinyin">{turn.fromPinyin}</p><p className="msg__vi vi-meaning">{turn.fromVi}</p>
                    </div>
                    {exchange ? (
                      <>
                        <div className="msg msg--you"><Chip tone="info">Bạn</Chip><p className="msg__hanzi han">{exchange.reply}</p></div>
                        <div className="verdict is-right">
                          <p className="verdict__title"><Check size={14} /> Mẫu để tự đối chiếu</p>
                          <p className="han" style={{ marginTop: 8 }}>{exchange.reveal.model}</p>
                          <p className="vi-meaning" style={{ color: "var(--text-3)" }}>{exchange.reveal.modelVi}</p>
                          {exchange.reveal.corrections.map((correction) => <div key={correction.wrong} style={{ marginTop: 10 }}><p><strong>Nên tránh:</strong> <span className="han">{correction.wrong}</span></p><p><strong>Nên dùng:</strong> <span className="han">{correction.better}</span></p><p style={{ color: "var(--text-3)" }}>{correction.why}</p></div>)}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          {!done && currentTurn ? (
            <Panel className="panel--pad">
              <SectionHeader title="Việc cần làm" sub={currentTurn.task} />
              <div className="row gap-2 wrap" style={{ marginBottom: "var(--sp-3)" }}>{currentTurn.suggestions.map((suggestion) => <button key={suggestion} type="button" className="phrase-chip" onClick={() => insertPhrase(suggestion)}><span className="han">{suggestion}</span></button>)}</div>
              <textarea ref={textareaRef} className="textarea han" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Soạn câu trả lời bằng tiếng Trung…" aria-label="Câu trả lời của bạn" />
              <button type="button" className="btn btn--primary" onClick={() => void send()} disabled={!draft.trim() || submitting}><Send size={16} /> {submitting ? "Đang gửi…" : "Gửi và xem mẫu"}</button>
            </Panel>
          ) : null}

          {done ? (
            <Panel className="panel--pad"><div className="stack gap-4" style={{ alignItems: "center", textAlign: "center" }}><span className="hero__mark han">完</span><h2>Đã hoàn thành tình huống</h2><p style={{ color: "var(--text-2)" }}>Hệ thống ghi nhận bạn đã luyện đủ {scenario.turns.length} lượt. Không có điểm số hoặc đánh giá AI.</p><Link href="/student/workplace" className="btn btn--primary">Về danh sách tình huống</Link></div></Panel>
          ) : null}
        </div>

        <div className="stack gap-5">
          <Panel className="panel--pad"><SectionHeader title="Tiêu chí tự đối chiếu" />{scenario.rubric.map((item) => <div key={item.label} className="row gap-2" style={{ marginBottom: 8 }}><ClipboardList size={14} style={{ color: "var(--accent)" }} /><span><strong>{item.label}</strong> · {item.hint}</span></div>)}</Panel>
          <Panel className="panel--pad"><SectionHeader title="Cụm từ gợi ý" />{scenario.phrases.map((phrase) => <button key={phrase.hanzi} type="button" className="phrase-chip" onClick={() => insertPhrase(phrase.hanzi)} disabled={done}><span className="phrase__hanzi han">{phrase.hanzi}</span><span className="phrase__pinyin pinyin">{phrase.pinyin}</span><span className="phrase__vi vi-meaning">{phrase.vi}</span></button>)}</Panel>
        </div>
      </div>
    </>
  );
}
