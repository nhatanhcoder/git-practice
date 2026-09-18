"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Eraser, PenTool } from "lucide-react";
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
  fetchWritingChar,
  markWritingPractised,
  type StrokeKind,
  type WritingChar,
} from "@/lib/student/writing-service";

const STROKE_LABEL: Record<StrokeKind, string> = {
  ngang: "Ngang", so: "Sổ", phay: "Phẩy", mac: "Mác",
  cham: "Chấm", moc: "Móc", gap: "Gập", hat: "Hất",
};
const STROKE_GLYPH: Record<StrokeKind, string> = {
  ngang: "一", so: "丨", phay: "丿", mac: "㇏",
  cham: "丶", moc: "亅", gap: "𠃍", hat: "㇀",
};
type LoadState = "loading" | "ready" | "error" | "missing";

export default function WritingDetailPage() {
  const params = useParams<{ charId: string }>();
  const charId = decodeURIComponent(params?.charId ?? "");
  const [state, setState] = useState<LoadState>("loading");
  const [char, setChar] = useState<WritingChar | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [ghost, setGhost] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setState("loading");
    try {
      setChar(await fetchWritingChar(charId));
      setState("ready");
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
      setState(code === "WRITING_CHAR_NOT_FOUND" ? "missing" : "error");
    }
  }, [charId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !char) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(dpr, dpr);
    context.lineWidth = 12;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = getComputedStyle(canvas).getPropertyValue("color") || "#000";
  }, [char]);

  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = position(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    drawing.current = true;
    setHasInk(true);
    setSaved(false);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const point = position(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    setSaved(false);
  }

  async function savePractice() {
    if (!char || !hasInk) return;
    setSaving(true);
    try {
      await markWritingPractised(char.id);
      setSaved(true);
      toast("Đã lưu: bạn đã luyện chữ này", "success");
    } catch {
      toast("Không lưu được tiến độ — nét viết vẫn còn trên bảng", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") return <SkeletonPanel rows={5} height={240} />;
  if (state === "error") return <Panel className="panel--pad"><ErrorState onRetry={() => void load()} /></Panel>;
  if (state === "missing" || !char) {
    return <Panel className="panel--pad"><EmptyState title="Chữ này không có trong bộ" action={<Link href="/student/writing" className="btn btn--primary">Về danh sách chữ</Link>} /></Panel>;
  }

  return (
    <>
      <Link href="/student/writing" className="backlink"><ArrowLeft size={14} /> Luyện viết chữ</Link>
      <PageHead
        title={<span className="char-hero"><span className="han">{char.char}</span><span className="stack gap-1"><span className="pinyin char-hero__pinyin">{char.pinyin}</span><span className="vi-meaning char-hero__vi">{char.vi}</span></span></span>}
        sub={`HSK ${char.level} · ${char.strokeCount} nét · bộ ${char.radical} (${char.radicalName})`}
        action={<AudioButton say={char.char} label={char.char} size={44} />}
      />

      <Panel className="panel--pad">
        <SectionHeader title="Thứ tự nét" sub={char.strokePaths ? "Dữ liệu nét chuẩn có sẵn cho chữ này" : "Dữ liệu đường nét chi tiết chưa có; dùng thứ tự tên nét"} />
        {char.strokePaths ? (
          <div className="row gap-3 wrap" aria-label={`Minh hoạ ${char.strokePaths.length} nét`}>
            {char.strokePaths.map((path, index) => (
              <svg key={index} viewBox="0 0 1024 1024" width="86" height="86" role="img" aria-label={`Nét ${index + 1}`} style={{ color: "var(--accent)", border: "1px solid var(--border)", borderRadius: 12 }}>
                <g transform="scale(1,-1) translate(0,-900)">
                  {char.strokePaths?.slice(0, index + 1).map((stroke, strokeIndex) => <path key={strokeIndex} d={stroke} fill="currentColor" opacity={strokeIndex === index ? 1 : 0.22} />)}
                </g>
              </svg>
            ))}
          </div>
        ) : null}
        <div className="stroke-list" style={{ marginTop: "var(--sp-4)" }}>
          {char.strokes.map((stroke, index) => (
            <span key={`${stroke}-${index}`} className="stroke-chip"><span className="stroke-chip__n num">{index + 1}</span><span className="stroke-chip__glyph han">{STROKE_GLYPH[stroke]}</span>{STROKE_LABEL[stroke]}</span>
          ))}
        </div>
        <p style={{ color: "var(--text-3)", marginTop: "var(--sp-3)" }}>Mẹo nhớ: {char.mnemonic}</p>
      </Panel>

      <Panel className="panel--pad">
        <SectionHeader
          title="Bảng tập viết"
          sub="Tự đối chiếu với chữ mẫu. Hệ thống chỉ lưu đã luyện, không chấm nét viết."
          action={<button type="button" className="btn btn--outline btn--sm" onClick={() => setGhost((value) => !value)}>{ghost ? "Ẩn chữ mờ" : "Hiện chữ mờ"}</button>}
        />
        <div className="stack gap-4" style={{ alignItems: "center" }}>
          <div className="mizi-box">
            <span className="mizi__guide" style={{ left: "50%", top: 0, bottom: 0, width: 1 }} />
            <span className="mizi__guide" style={{ top: "50%", left: 0, right: 0, height: 1 }} />
            {ghost ? <span className="mizi__char han" aria-hidden="true">{char.char}</span> : null}
            <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} aria-label={`Bảng tập viết chữ ${char.char}`} style={{ color: "var(--accent)" }} />
          </div>
          <div className="row gap-3 wrap">
            <button type="button" className="btn btn--outline" onClick={clear} disabled={!hasInk}><Eraser size={16} /> Xoá bảng</button>
            <button type="button" className="btn btn--primary" onClick={() => void savePractice()} disabled={!hasInk || saving}><PenTool size={16} /> {saving ? "Đang lưu…" : "Lưu đã luyện"}</button>
          </div>
          {saved ? <Chip tone="success"><Check size={12} /> Máy chủ đã ghi nhận</Chip> : null}
        </div>
      </Panel>

      <Panel className="panel--pad">
        <SectionHeader title="Từ có chữ này" />
        <div className="stack">
          {char.words.map((word) => <div key={word.word} className="wordrow"><span className="wordrow__hanzi han">{word.word}</span><span className="wordrow__pinyin pinyin">{word.pinyin}</span><span className="wordrow__vi vi-meaning">{word.vi}</span></div>)}
        </div>
      </Panel>
    </>
  );
}
