"use client";

/**
 * /student/writing/[charId] — one character: stroke order, a 米字格 pad you can
 * actually write in, and the words it appears in.
 *
 * The pad is a real canvas with pointer events, so it works with a mouse, a
 * finger and a stylus. Scoring is deliberately crude — see `gradeInk`.
 *
 * MOCK(student): the score is a coverage heuristic, not handwriting
 * recognition. It exists so the flow is complete end to end; swap it for the
 * real recogniser when there is one.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Eraser, PenTool, Sparkles } from "lucide-react";
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
import { writingChars } from "@/lib/student/content";
import { WRITING_PASS_SCORE } from "@/lib/student/student-rules";
import type { StrokeKind } from "@/lib/student/types";

const STROKE_LABEL: Record<StrokeKind, string> = {
  ngang: "Ngang",
  so: "Sổ",
  phay: "Phẩy",
  mac: "Mác",
  cham: "Chấm",
  moc: "Móc",
  gap: "Gập",
  hat: "Hất",
};

const STROKE_GLYPH: Record<StrokeKind, string> = {
  ngang: "一",
  so: "丨",
  phay: "丿",
  mac: "㇏",
  cham: "丶",
  moc: "亅",
  gap: "𠃍",
  hat: "㇀",
};

/**
 * MOCK(student): score = how much of the guide square the ink covers, compared
 * against a rough target for the character's stroke count, with a penalty for
 * scribbling far past it. It rewards writing something of the right size in the
 * right place — nothing more. It is NOT handwriting recognition and must not be
 * presented to a learner as a judgement of their handwriting.
 */
function gradeInk(inkPixels: number, totalPixels: number, strokeCount: number): number {
  if (inkPixels === 0) return 0;
  const coverage = inkPixels / totalPixels;
  const target = Math.min(0.34, 0.05 + strokeCount * 0.018);
  const ratio = coverage / target;
  const shaped = ratio <= 1 ? ratio : Math.max(0, 2 - ratio);
  return Math.round(Math.max(0, Math.min(1, shaped)) * 100);
}

export default function WritingDetailPage() {
  const params = useParams<{ charId: string }>();
  const charId = decodeURIComponent(params?.charId ?? "");
  const char = writingChars.find((c) => c.id === charId) ?? null;

  const saveWriting = useStudentStore((s) => s.saveWriting);
  const writingMastery = useStudentStore((s) => s.writingMastery);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [ghost, setGhost] = useState(true);
  const [strokeStep, setStrokeStep] = useState(0);

  const progress = char ? writingMastery[char.id] ?? { practised: 0, bestScore: 0 } : null;

  // Size the backing store to the element so lines are crisp on high-DPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue("color") || "#000";
  }, [charId]);

  const words = useMemo(() => char?.words ?? [], [char]);

  if (!char) {
    return (
      <>
        <PageHead title="Không tìm thấy chữ" />
        <Panel className="panel--pad">
          <EmptyState
            title="Chữ này không có trong bộ"
            text="Quay lại danh sách để chọn chữ khác."
            action={
              <Link href="/student/writing" className="btn btn--primary">
                Về danh sách chữ
              </Link>
            }
          />
        </Panel>
      </>
    );
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setHasInk(true);
    setScore(null);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    drawing.current = false;
    setStrokeStep((n) => Math.min(char!.strokeCount, n + 1));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setScore(null);
    setStrokeStep(0);
  }

  function grade() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let ink = 0;
    // Alpha channel only: any non-transparent pixel is ink.
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) ink++;
    }
    const result = gradeInk(ink, canvas.width * canvas.height, char!.strokeCount);
    setScore(result);
    saveWriting(char!.id, result);
    if (result >= WRITING_PASS_SCORE) {
      awardXp(25, 2);
      toast(`Đạt chuẩn ${result} điểm — +25 XP`, "success");
    } else {
      awardXp(5, 2);
      toast(`Được ${result} điểm — cần ${WRITING_PASS_SCORE} để đạt chuẩn`, "warn");
    }
  }

  return (
    <>
      <Link href="/student/writing" className="backlink">
        <ArrowLeft size={14} /> Luyện viết chữ
      </Link>

      <PageHead
        title={
          <span className="char-hero">
            <span className="han">{char.char}</span>
            <span className="stack gap-1">
              <span
                className="pinyin char-hero__pinyin"
                style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step-2)" }}
              >
                {char.pinyin}
              </span>
              <span
                className="vi-meaning char-hero__vi"
                style={{ color: "var(--text-2)", fontSize: "var(--step-1)" }}
              >
                {char.vi}
              </span>
            </span>
          </span>
        }
        sub={`HSK ${char.level} · ${char.strokeCount} nét · bộ ${char.radical} (${char.radicalName})`}
        action={<AudioButton say={char.char} label={char.char} size={44} />}
      />

      {/* ---------- Stroke order ---------- */}
      <Panel className="panel--pad">
        <SectionHeader
          title="Thứ tự nét"
          sub={`${char.strokeCount} nét · quy tắc trên trước dưới, trái trước phải`}
        />
        <div className="stroke-list">
          {char.strokes.map((s, i) => (
            <span key={i} className={`stroke-chip ${i < strokeStep ? "is-done" : ""}`}>
              <span className="stroke-chip__n num">{i + 1}</span>
              <span className="stroke-chip__glyph han">{STROKE_GLYPH[s]}</span>
              {STROKE_LABEL[s]}
            </span>
          ))}
        </div>
        <p style={{ color: "var(--text-3)", fontSize: "var(--step--2)", marginTop: "var(--sp-3)" }}>
          Mẹo nhớ: {char.mnemonic}
        </p>
      </Panel>

      {/* ---------- Practice pad ---------- */}
      <Panel className="panel--pad">
        <SectionHeader
          title="Bảng tập viết"
          sub="Viết trực tiếp vào ô 米字格 rồi bấm «Chấm thử»"
          action={
            <button
              type="button"
              className={`btn btn--outline btn--sm ${ghost ? "is-active" : ""}`}
              aria-pressed={ghost}
              onClick={() => setGhost((g) => !g)}
            >
              {ghost ? "Ẩn chữ mờ" : "Hiện chữ mờ"}
            </button>
          }
        />

        <div className="stack gap-4" style={{ alignItems: "center" }}>
          <div className="mizi-box">
            {/* 米字格 guides: two mid-lines plus the two diagonals. */}
            <span className="mizi__guide" style={{ left: "50%", top: 0, bottom: 0, width: 1 }} />
            <span className="mizi__guide" style={{ top: "50%", left: 0, right: 0, height: 1 }} />
            <span
              className="mizi__guide"
              style={{ left: 0, top: 0, width: "141.4%", height: 1, transformOrigin: "left top", transform: "rotate(45deg)" }}
            />
            <span
              className="mizi__guide"
              style={{ right: 0, top: 0, width: "141.4%", height: 1, transformOrigin: "right top", transform: "rotate(-45deg)" }}
            />
            {ghost ? (
              <span className="mizi__char han" aria-hidden="true">
                {char.char}
              </span>
            ) : null}
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              aria-label={`Bảng tập viết chữ ${char.char}`}
              style={{ color: "var(--accent)" }}
            />
          </div>

          <div className="row gap-3 wrap" style={{ justifyContent: "center" }}>
            <button type="button" className="btn btn--outline" onClick={clear} disabled={!hasInk}>
              <Eraser size={16} /> Xoá
            </button>
            <button type="button" className="btn btn--primary" onClick={grade} disabled={!hasInk}>
              <PenTool size={16} /> Chấm thử
            </button>
          </div>

          {score !== null ? (
            <div
              className={`verdict ${score >= WRITING_PASS_SCORE ? "is-right" : "is-wrong"}`}
              style={{ width: "100%" }}
            >
              <p className="verdict__title">
                {score >= WRITING_PASS_SCORE ? (
                  <>
                    <Sparkles size={14} style={{ display: "inline" }} /> Đạt chuẩn —{" "}
                    <span className="num">{score}</span> điểm
                  </>
                ) : (
                  <>
                    Được <span className="num">{score}</span> điểm, cần{" "}
                    <span className="num">{WRITING_PASS_SCORE}</span>
                  </>
                )}
              </p>
              <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                <strong>MOCK:</strong> điểm này chỉ đo độ phủ mực so với kích thước chữ, không phải
                nhận dạng chữ viết tay.
              </p>
            </div>
          ) : null}
        </div>
      </Panel>

      {/* ---------- Progress ---------- */}
      <Panel className="panel--pad">
        <SectionHeader title="Tiến độ chữ này" sub="Lưu trong trình duyệt, không mất khi tải lại" />
        <div className="grid grid--3">
          <Metric label="Số lần luyện" value={progress?.practised ?? 0} />
          <Metric label="Điểm tốt nhất" value={progress?.bestScore ?? 0} />
          <Metric
            label="Trạng thái"
            value={
              (progress?.bestScore ?? 0) >= WRITING_PASS_SCORE ? "Đạt chuẩn" : "Chưa đạt"
            }
          />
        </div>
        <Bar
          value={progress?.bestScore ?? 0}
          tone={(progress?.bestScore ?? 0) >= WRITING_PASS_SCORE ? "success" : "accent"}
          label="Điểm tốt nhất"
        />
      </Panel>

      {/* ---------- Words ---------- */}
      <Panel>
        <div className="panel__head">
          <div>
            <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
              Từ ghép thường gặp
            </h2>
            <p className="section-sub">Nghe và nhớ chữ trong ngữ cảnh</p>
          </div>
          <Chip tone="accent">
            bộ <span className="han">{char.radical}</span> · {char.radicalName}
          </Chip>
        </div>
        <div className="panel__body">
          {words.map((w) => (
            <div key={w.word} className="wordrow">
              <AudioButton say={w.word} label={w.word} size={32} />
              <span className="grow stack gap-1">
                <span className="wordrow__hanzi han">{w.word}</span>
                <span className="wordrow__pinyin pinyin">{w.pinyin}</span>
              </span>
              <span className="wordrow__vi vi-meaning">{w.vi}</span>
              <Check size={16} style={{ color: "var(--text-3)" }} aria-hidden="true" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
