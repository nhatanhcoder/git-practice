"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Lock, Puzzle, RotateCcw, Star, X } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { useToast } from "@/components/student/toast";
import {
  fetchLegoStation,
  fetchLegoStations,
  submitLegoStation,
  type LegoAttemptResult,
  type LegoBlock,
  type LegoStationDetail,
  type LegoStationSummary,
} from "@/lib/student/lego-service";

const ROLE_LABEL: Record<string, string> = {
  S: "Chủ ngữ", T: "Thời gian", P: "Nơi chốn", A: "Trạng ngữ",
  V: "Động từ", O: "Tân ngữ", C: "Bổ ngữ", Q: "Câu hỏi",
};
type LoadState = "loading" | "ready" | "error";

export default function LegoPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [stations, setStations] = useState<LegoStationSummary[]>([]);
  const [playing, setPlaying] = useState<LegoStationDetail | null>(null);
  const [playState, setPlayState] = useState<LoadState>("ready");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [slot, setSlot] = useState<LegoBlock[]>([]);
  const [answers, setAnswers] = useState<Array<{ sentenceId: string; blockIds: string[] }>>([]);
  const [result, setResult] = useState<LegoAttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setState("loading");
    try {
      setStations(await fetchLegoStations());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sentence = playing?.sentences[sentenceIndex] ?? null;
  const bank = useMemo(() => {
    if (!sentence) return [];
    const used = new Set(slot.map((block) => block.id));
    return sentence.blocks.filter((block) => !used.has(block.id));
  }, [sentence, slot]);

  async function startStation(id: string) {
    setPlayState("loading");
    setPlaying(null);
    setResult(null);
    try {
      setPlaying(await fetchLegoStation(id));
      setSentenceIndex(0);
      setSlot([]);
      setAnswers([]);
      setPlayState("ready");
    } catch {
      setPlayState("error");
    }
  }

  async function saveSentence() {
    if (!playing || !sentence || slot.length !== sentence.blocks.length) return;
    const nextAnswers = [
      ...answers.filter((answer) => answer.sentenceId !== sentence.id),
      { sentenceId: sentence.id, blockIds: slot.map((block) => block.id) },
    ];
    if (sentenceIndex + 1 < playing.sentences.length) {
      setAnswers(nextAnswers);
      setSentenceIndex((index) => index + 1);
      setSlot([]);
      return;
    }
    setSubmitting(true);
    try {
      const submitted = await submitLegoStation(playing.id, nextAnswers);
      setResult(submitted);
      setAnswers(nextAnswers);
      setStations(await fetchLegoStations());
      toast(`Máy chủ đã chấm trạm: ${submitted.progress.stars} sao`, "success");
    } catch {
      toast("Không nộp được — thứ tự đã xếp vẫn được giữ", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  function leaveStation() {
    setPlaying(null);
    setResult(null);
    setPlayState("ready");
  }

  if (playState === "loading") return <SkeletonPanel rows={5} height={220} />;
  if (playState === "error") {
    return <Panel className="panel--pad"><ErrorState onRetry={() => { leaveStation(); void load(); }} /></Panel>;
  }

  if (playing && result) {
    return (
      <>
        <button type="button" className="backlink" onClick={leaveStation}><ArrowLeft size={14} /> Các trạm</button>
        <PageHead title={`Kết quả ${playing.title}`} sub={`Máy chủ chấm đúng ${result.progress.correctCount}/${result.progress.total} câu`} />
        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="stars" aria-label={`${result.progress.stars} trên 3 sao`}>
              {[1, 2, 3].map((star) => <Star key={star} size={30} fill={star <= result.progress.stars ? "currentColor" : "none"} />)}
            </span>
            <p style={{ color: "var(--text-2)" }}>1 sao khi nộp đủ · 2 sao từ 50% đúng · 3 sao từ 80% đúng.</p>
          </div>
          <div className="stack gap-4" style={{ marginTop: "var(--sp-5)" }}>
            {result.results.map((item, index) => (
              <div key={item.sentenceId} className={`verdict ${item.correct ? "is-right" : "is-wrong"}`}>
                <p className="verdict__title">{item.correct ? <><Check size={14} /> Câu {index + 1} chính xác</> : <><X size={14} /> Câu {index + 1} chưa đúng</>}</p>
                <p className="han" style={{ fontSize: "var(--step-1)" }}>{item.expectedBlocks.map((block) => block.text).join("")}</p>
                <p className="pinyin">{item.pinyin}</p>
                <p style={{ color: "var(--text-2)" }}>Quy tắc: {item.rule}</p>
              </div>
            ))}
          </div>
          <div className="row gap-3 wrap" style={{ marginTop: "var(--sp-5)", justifyContent: "center" }}>
            <button type="button" className="btn btn--outline" onClick={() => void startStation(playing.id)}><RotateCcw size={16} /> Luyện lại</button>
            <button type="button" className="btn btn--primary" onClick={leaveStation}>Về danh sách trạm</button>
          </div>
        </Panel>
      </>
    );
  }

  if (playing && sentence) {
    return (
      <>
        <button type="button" className="backlink" onClick={leaveStation}><ArrowLeft size={14} /> Các trạm</button>
        <PageHead title={playing.title} sub={`Câu ${sentenceIndex + 1}/${playing.sentences.length} · ${playing.focus}`} />
        <Bar value={(sentenceIndex / playing.sentences.length) * 100} label="Tiến độ trạm" />
        <Panel className="panel--pad">
          <SectionHeader title="Ghép thành câu đúng" sub={`Nghĩa: ${sentence.vi}`} />
          <p style={{ color: "var(--text-3)", marginBottom: "var(--sp-3)" }}>Gợi ý: {sentence.hint}</p>
          <div className="stack gap-4">
            <div className="lego-answer">
              {slot.length === 0 ? <span style={{ color: "var(--text-3)" }}>Bấm các khối bên dưới để xếp câu</span> : slot.map((block, index) => (
                <button key={block.id} type="button" className={`token token--${block.role}`} onClick={() => setSlot((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                  <span className="han">{block.text}</span><small>{block.role}</small>
                </button>
              ))}
            </div>
            <div className="lego-bank">
              {bank.map((block) => (
                <button key={block.id} type="button" className={`token token--${block.role}`} onClick={() => setSlot((current) => [...current, block])}>
                  <span className="han">{block.text}</span><small>{block.role}</small>
                </button>
              ))}
            </div>
            <div className="row gap-3">
              <button type="button" className="btn btn--outline" onClick={() => setSlot([])} disabled={slot.length === 0}><RotateCcw size={16} /> Xếp lại</button>
              <button type="button" className="btn btn--primary grow" onClick={() => void saveSentence()} disabled={slot.length !== sentence.blocks.length || submitting}>
                {submitting ? "Máy chủ đang chấm…" : sentenceIndex + 1 === playing.sentences.length ? "Nộp cả trạm" : "Lưu câu và tiếp tục"}
              </button>
            </div>
          </div>
        </Panel>
        <Panel className="panel--pad">
          <SectionHeader title="Ý nghĩa màu khối" />
          <div className="role-legend">{Object.entries(ROLE_LABEL).map(([key, label]) => <span key={key} className="role-legend__item"><span className={`role-legend__key token--${key}`}>{key}</span>{label}</span>)}</div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHead eyebrow="Luyện tập" title="Ghép câu Lego" sub="Luyện trật tự từ qua bảy trạm. Thứ tự được chấm ở máy chủ; không có XP hoặc đáp án do trình duyệt tự quyết." />
      {state === "loading" ? <SkeletonPanel rows={4} height={180} /> : state === "error" ? (
        <Panel className="panel--pad"><ErrorState onRetry={() => void load()} /></Panel>
      ) : stations.length === 0 ? (
        <Panel className="panel--pad"><EmptyState icon={<Puzzle size={26} />} title="Chưa có trạm Lego" /></Panel>
      ) : (
        <>
          <Panel className="panel--pad"><div className="grid grid--3"><Metric label="Trạm" value={stations.length} /><Metric label="Đã mở" value={stations.filter((station) => station.progress.unlocked).length} /><Metric label="Tổng sao" value={`${stations.reduce((sum, station) => sum + station.progress.stars, 0)}/${stations.length * 3}`} /></div></Panel>
          <section>
            <SectionHeader title="Các trạm" sub="Trạm sau mở khi bạn đã nộp đủ trạm trước" />
            <div className="grid grid--2">
              {stations.map((station) => (
                <button key={station.id} type="button" className="examcard" disabled={!station.progress.unlocked} onClick={() => void startStation(station.id)} style={!station.progress.unlocked ? { opacity: 0.55 } : undefined}>
                  <div className="row gap-3"><span className="rowitem__icon han">{station.progress.unlocked ? station.hanziTitle.slice(0, 1) : <Lock size={16} />}</span><span className="stack gap-1 grow" style={{ textAlign: "left" }}><span className="examcard__title">{station.title}</span><span className="examcard__sub">{station.blurb}</span></span><span className="stars">{[1, 2, 3].map((star) => <Star key={star} size={14} fill={star <= station.progress.stars ? "currentColor" : "none"} />)}</span></div>
                  <div className="row gap-2 wrap"><Chip tone="accent">HSK {station.level}</Chip><Chip>{station.focus}</Chip><Chip tone="info">{station.progress.correctCount}/{station.progress.total} đúng</Chip></div>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
