"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, PenTool, Search } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { LevelSelector } from "@/components/student/controls";
import {
  fetchWritingChars,
  fetchWritingProgress,
  type WritingCharSummary,
} from "@/lib/student/writing-service";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
type LoadState = "loading" | "ready" | "error";

export default function WritingPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [chars, setChars] = useState<WritingCharSummary[]>([]);
  const [practised, setPractised] = useState<Set<string>>(new Set());
  const [progressKnown, setProgressKnown] = useState(false);
  const [level, setLevel] = useState<number | "all">("all");
  const [radical, setRadical] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    try {
      const catalog = await fetchWritingChars();
      setChars(catalog);
      setState("ready");
      try {
        const rows = await fetchWritingProgress();
        setPractised(new Set(rows.map((row) => row.characterId)));
        setProgressKnown(true);
      } catch {
        setProgressKnown(false);
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const radicals = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const char of chars) {
      const current = counts.get(char.radical);
      counts.set(char.radical, {
        name: char.radicalName,
        count: (current?.count ?? 0) + 1,
      });
    }
    return Array.from(counts, ([char, value]) => ({ char, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 18);
  }, [chars]);

  const results = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("vi");
    return chars.filter((char) => {
      if (level !== "all" && char.level !== level) return false;
      if (radical !== "all" && char.radical !== radical) return false;
      return !needle
        || char.char.includes(needle)
        || char.pinyin.toLocaleLowerCase("vi").includes(needle)
        || char.vi.toLocaleLowerCase("vi").includes(needle);
    });
  }, [chars, level, radical, query]);

  return (
    <>
      <PageHead
        eyebrow="Luyện tập"
        title="Luyện viết chữ Hán"
        sub="Bộ 587 chữ HSK 1–9 với thứ tự nét, bộ thủ, từ ví dụ và bảng viết. Tiến độ chỉ ghi nhận bạn đã luyện — không chấm chữ viết tay giả."
      />

      {state === "loading" ? (
        <SkeletonPanel rows={5} height={220} />
      ) : state === "error" ? (
        <Panel className="panel--pad"><ErrorState onRetry={() => void load()} /></Panel>
      ) : (
        <>
          <Panel className="panel--pad">
            <div className="grid grid--3">
              <Metric label="Chữ trong bộ" value={chars.length} />
              <Metric label="Đã luyện" value={progressKnown ? practised.size : "—"} icon={<PenTool size={14} />} />
              <Metric label="Cấp HSK" value="1–9" />
            </div>
            {!progressKnown ? <Chip tone="warn">Không tải được tiến độ — bộ chữ vẫn dùng được</Chip> : null}
          </Panel>

          <Panel className="panel--pad stack gap-4">
            <label className="field">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm chữ, pinyin hoặc nghĩa…"
                aria-label="Tìm chữ Hán"
              />
            </label>
            <div className="row gap-3 wrap">
              <button type="button" className={`pill ${level === "all" ? "is-active" : ""}`} onClick={() => setLevel("all")}>Mọi cấp</button>
              <LevelSelector levels={LEVELS.map((id) => ({ id }))} value={typeof level === "number" ? level : -1} onChange={setLevel} />
            </div>
            <div className="row gap-2 wrap">
              <button type="button" className={`pill ${radical === "all" ? "is-active" : ""}`} onClick={() => setRadical("all")}>Tất cả bộ thủ</button>
              {radicals.map((item) => (
                <button key={item.char} type="button" className={`pill ${radical === item.char ? "is-active" : ""}`} onClick={() => setRadical(item.char)}>
                  <span className="han">{item.char}</span> {item.name} <span className="num">({item.count})</span>
                </button>
              ))}
            </div>
          </Panel>

          <section>
            <SectionHeader title="Bộ chữ" sub={`${results.length} chữ khớp bộ lọc`} />
            {results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState title="Không có chữ nào khớp" text="Thử bỏ bớt bộ lọc hoặc tìm bằng pinyin." />
              </Panel>
            ) : (
              <div className="char-grid">
                {results.map((char) => (
                  <Link key={char.id} href={`/student/writing/${char.id}`} className="charcard">
                    <span className="charcard__glyph han">{char.char}</span>
                    <span className="charcard__pinyin pinyin">{char.pinyin}</span>
                    <span className="charcard__vi vi-meaning">{char.vi}</span>
                    <span className="charcard__meta">HSK {char.level} · {char.strokeCount} nét · bộ <span className="han">{char.radical}</span></span>
                    {practised.has(char.id) ? <Chip tone="success"><Check size={12} /> Đã luyện</Chip> : <Chip>Chưa luyện</Chip>}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
