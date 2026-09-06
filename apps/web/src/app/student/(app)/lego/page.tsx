"use client";

/**
 * /student/lego — sentence building by word order.
 *
 * Blocks are colour-coded by grammatical role (S/T/P/A/V/O/C/Q), which is the
 * whole teaching point: Chinese puts time and place *before* the verb, unlike
 * Vietnamese, and seeing the roles line up makes that visible rather than told.
 *
 * MOCK(student): content from `lib/student/content.ts`; stars go to the store.
 */

import { useMemo, useState } from "react";
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
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import { ROLE_LABEL, legoStations } from "@/lib/student/content";
import { legoStarsFor, shuffleBlocks, withLegoProgress } from "@/lib/student/student-rules";
import type { LegoBlock, LegoStation } from "@/lib/student/types";

export default function LegoPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [playing, setPlaying] = useState<LegoStation | null>(null);
  const [sIdx, setSIdx] = useState(0);
  const [slot, setSlot] = useState<LegoBlock[]>([]);
  const [checked, setChecked] = useState<null | boolean>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);

  const legoStars = useStudentStore((s) => s.legoStars);
  const setLegoStars = useStudentStore((s) => s.setLegoStars);
  const awardXp = useStudentStore((s) => s.awardXp);
  const logActivity = useStudentStore((s) => s.logActivity);
  const toast = useToast();

  const stations = useMemo(() => withLegoProgress(legoStations, legoStars), [legoStars]);

  const sentence = playing?.sentences[sIdx] ?? null;
  const bank = useMemo(() => {
    if (!sentence) return [];
    const used = new Set(slot.map((b) => b.id));
    return (shuffleBlocks(sentence.blocks, sIdx + 11) as LegoBlock[]).filter(
      (b) => !used.has(b.id),
    );
  }, [sentence, slot, sIdx]);

  function startStation(st: LegoStation) {
    setPlaying(st);
    setSIdx(0);
    setSlot([]);
    setChecked(null);
    setRight(0);
    setFinished(false);
  }

  function check() {
    if (!sentence) return;
    const ok = slot.map((b) => b.id).join("|") === sentence.order.join("|");
    setChecked(ok);
    if (ok) {
      setRight((n) => n + 1);
      awardXp(20, 1);
    }
  }

  function next() {
    if (!playing) return;
    if (sIdx + 1 >= playing.sentences.length) {
      const stars = legoStarsFor(right, playing.sentences.length);
      setLegoStars(playing.id, stars);
      logActivity({
        kind: "grammar",
        text: `Hoàn thành ${playing.name} — ${stars} sao`,
        xp: 20 * right,
      });
      toast(`Xong trạm — ${stars} sao`, "success");
      setFinished(true);
      return;
    }
    setSIdx((n) => n + 1);
    setSlot([]);
    setChecked(null);
  }

  /* ---------- Playing a station ---------- */
  if (playing && !finished && sentence) {
    return (
      <>
        <button type="button" className="backlink" onClick={() => setPlaying(null)}>
          <ArrowLeft size={14} /> Các trạm
        </button>

        <PageHead
          title={playing.name}
          sub={`Câu ${sIdx + 1}/${playing.sentences.length} · đúng ${right} · quy tắc ${sentence.rule}`}
        />

        <Bar value={(sIdx / playing.sentences.length) * 100} label="Tiến độ trạm" />

        <Panel className="panel--pad">
          <SectionHeader title="Ghép thành câu đúng" sub={`Nghĩa: ${sentence.vi}`} />

          <div className="stack gap-4">
            <div
              className={`lego-answer ${checked === true ? "is-right" : checked === false ? "is-wrong" : ""}`}
            >
              {slot.length === 0 ? (
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                  Bấm các khối bên dưới để xếp câu
                </span>
              ) : (
                slot.map((b, i) => (
                  <button
                    key={`${b.id}-${i}`}
                    type="button"
                    className={`token token--${b.role}`}
                    disabled={checked !== null}
                    onClick={() => setSlot((s) => s.filter((_, idx) => idx !== i))}
                  >
                    <span className="han">{b.text}</span>
                    <small className="pinyin">{b.pinyin}</small>
                  </button>
                ))
              )}
            </div>

            <div className="lego-bank">
              {bank.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`token token--${b.role}`}
                  disabled={checked !== null}
                  onClick={() => setSlot((s) => [...s, b])}
                >
                  <span className="han">{b.text}</span>
                  <small className="pinyin">{b.pinyin}</small>
                </button>
              ))}
              {bank.length === 0 ? (
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                  Đã dùng hết khối
                </span>
              ) : null}
            </div>

            {checked === null ? (
              <div className="row gap-3">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setSlot([])}
                  disabled={slot.length === 0}
                >
                  <RotateCcw size={16} /> Xếp lại
                </button>
                <button
                  type="button"
                  className="btn btn--primary grow"
                  onClick={check}
                  disabled={slot.length !== sentence.blocks.length}
                >
                  Kiểm tra
                </button>
              </div>
            ) : (
              <>
                <div className={`verdict ${checked ? "is-right" : "is-wrong"}`}>
                  <p className="verdict__title">
                    {checked ? (
                      <>
                        <Check size={14} style={{ display: "inline" }} /> Chính xác — +20 XP
                      </>
                    ) : (
                      <>
                        <X size={14} style={{ display: "inline" }} /> Chưa đúng
                      </>
                    )}
                  </p>
                  <p className="han" style={{ fontSize: "var(--step-1)" }}>
                    {sentence.order
                      .map((id) => sentence.blocks.find((b) => b.id === id)?.text ?? "")
                      .join("")}
                  </p>
                  <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                    Quy tắc: {sentence.rule}
                  </p>
                </div>
                <button type="button" className="btn btn--primary btn--block" onClick={next}>
                  {sIdx + 1 >= playing.sentences.length ? "Kết thúc trạm" : "Câu tiếp theo"}
                </button>
              </>
            )}
          </div>
        </Panel>

        <Panel className="panel--pad">
          <SectionHeader title="Ý nghĩa màu khối" sub="Mỗi màu là một thành phần câu" />
          <div className="role-legend">
            {Object.entries(ROLE_LABEL).map(([key, label]) => (
              <span key={key} className="role-legend__item">
                <span className={`role-legend__key token--${key}`} style={{ borderWidth: 2 }}>
                  {key}
                </span>
                {label}
              </span>
            ))}
          </div>
        </Panel>
      </>
    );
  }

  /* ---------- Station finished ---------- */
  if (playing && finished) {
    const stars = legoStarsFor(right, playing.sentences.length);
    return (
      <>
        <button type="button" className="backlink" onClick={() => setPlaying(null)}>
          <ArrowLeft size={14} /> Các trạm
        </button>
        <PageHead title={`Xong ${playing.name}`} sub={`Đúng ${right}/${playing.sentences.length}`} />
        <Panel className="panel--pad">
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="hero__mark han" aria-hidden="true">
              {playing.hanzi.slice(0, 1)}
            </span>
            <span className="stars" aria-label={`${stars} trên 3 sao`}>
              {[1, 2, 3].map((n) => (
                <Star key={n} size={26} fill={n <= stars ? "currentColor" : "none"} />
              ))}
            </span>
            <p style={{ color: "var(--text-2)" }}>
              Xong ván là 1 sao, đúng ≥ 50% được 2 sao, đúng ≥ 80% được 3 sao.
            </p>
            <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => startStation(playing)}
              >
                <RotateCcw size={16} /> Chơi lại
              </button>
              <button type="button" className="btn btn--primary" onClick={() => setPlaying(null)}>
                Về danh sách trạm
              </button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  /* ---------- Station list ---------- */
  return (
    <>
      <PageHead
        eyebrow="Luyện tập"
        title="Ghép câu Lego"
        sub="Luyện trật tự từ tiếng Trung qua các trạm tăng dần độ khó. Khối được tô màu theo vai trò ngữ pháp để bạn nhìn thấy cấu trúc câu."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={4} height={180} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : demo === "empty" ? (
        <Panel className="panel--pad">
          <EmptyState
            icon={<Puzzle size={26} />}
            title="Chưa mở trạm nào"
            text="Hoàn thành chặng đầu tiên trong lộ trình để mở trạm Lego."
          />
        </Panel>
      ) : (
        <>
          <Panel className="panel--pad">
            <div className="grid grid--3">
              <Metric label="Trạm" value={stations.length} />
              <Metric
                label="Đã mở"
                value={stations.filter((s) => !s.locked).length}
              />
              <Metric
                label="Tổng sao"
                value={`${stations.reduce((n, s) => n + s.stars, 0)}/${stations.length * 3}`}
              />
            </div>
          </Panel>

          <section>
            <SectionHeader title="Các trạm" sub="Mỗi trạm gồm ba câu theo một quy tắc" />
            <div className="grid grid--2">
              {stations.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  className="examcard"
                  disabled={st.locked}
                  onClick={() => startStation(st)}
                  style={st.locked ? { opacity: 0.55 } : undefined}
                >
                  <div className="row gap-3">
                    <span className="rowitem__icon han" aria-hidden="true">
                      {st.locked ? <Lock size={16} /> : st.hanzi.slice(0, 1)}
                    </span>
                    <span className="stack gap-1 grow" style={{ textAlign: "left" }}>
                      <span className="examcard__title">{st.name}</span>
                      <span className="examcard__sub">{st.blurb}</span>
                    </span>
                    <span className="stars" aria-label={`${st.stars} trên 3 sao`}>
                      {[1, 2, 3].map((n) => (
                        <Star key={n} size={14} fill={n <= st.stars ? "currentColor" : "none"} />
                      ))}
                    </span>
                  </div>
                  <div className="row gap-2 wrap">
                    <Chip tone="accent">HSK {st.level}</Chip>
                    <Chip>{st.rule}</Chip>
                    <Chip tone="info">{st.sentences.length} câu</Chip>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <Panel className="panel--pad">
            <SectionHeader title="Ý nghĩa màu khối" sub="Mỗi màu là một thành phần câu" />
            <div className="role-legend">
              {Object.entries(ROLE_LABEL).map(([key, label]) => (
                <span key={key} className="role-legend__item">
                  <span className={`role-legend__key token--${key}`} style={{ borderWidth: 2 }}>
                    {key}
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
