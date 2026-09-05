"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookMarked,
  Download,
  Ear,
  FileText,
  Headphones,
  Mic,
  Play,
  Search,
  Sparkles,
  Speech,
  Volume2,
  X,
} from "lucide-react";
import { AudioButton } from "@/components/student/audio-button";
import {
  Card,
  Chip,
  DemoStateSwitcher,
  EmptyState,
  ErrorState,
  GhostButton,
  LoadingState,
  PrimaryButton,
  ProgressBar,
  SectionHead,
  type DemoState,
} from "@/components/student/ui";
import {
  finals,
  foundationMastery,
  initials,
  listeningCards,
  pdfCards,
  sandhiRules,
  speakingCards,
  tones,
  type PracticeCard,
} from "@/lib/student/foundation-data";
import { radicals, type Radical } from "@/lib/student/radicals-data";

const tabs = [
  { key: "pinyin", label: "Pinyin & Phiên âm", icon: Speech },
  { key: "tones", label: "Thanh điệu", icon: Volume2 },
  { key: "radicals", label: "Bộ thủ", icon: BookMarked },
  { key: "listening", label: "Luyện nghe", icon: Headphones },
  { key: "speaking", label: "Luyện nói", icon: Mic },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const strokeFilters = [
  { label: "Tất cả", value: null },
  { label: "1–2 nét", value: "1-2" },
  { label: "3–4 nét", value: "3-4" },
  { label: "5–6 nét", value: "5-6" },
  { label: "7+ nét", value: "7+" },
] as const;

/* Curated example words for popular radicals — prototype subset. */
const radicalExamples: Record<string, string[]> = {
  人: ["你", "他", "们", "做"],
  口: ["吃", "喝", "叫", "听"],
  水: ["江", "河", "海", "洗"],
  心: ["情", "快", "慢", "怕"],
  手: ["打", "找", "把", "推"],
  木: ["树", "林", "桥", "校"],
  艸: ["花", "草", "茶", "菜"],
  女: ["她", "妈", "姐", "好"],
  言: ["说", "话", "语", "读"],
  金: ["钱", "银", "铁", "钟"],
  食: ["饭", "饱", "饿", "馆"],
  糸: ["红", "绿", "给", "结"],
  土: ["地", "场", "城", "坐"],
  日: ["时", "明", "晚", "昨"],
  月: ["朋", "期", "明", "服"],
  火: ["热", "照", "点", "黑"],
  宀: ["家", "学", "安", "字"],
  辵: ["这", "边", "还", "过"],
  刀: ["别", "到", "划", "剑"],
  山: ["出", "岁", "岸", "峰"],
  虫: ["蚂", "蚁", "蛇", "蜜"],
  足: ["跑", "跳", "路", "踢"],
  目: ["看", "眼", "睡", "见"],
  車: ["辆", "转", "轻", "较"],
  門: ["问", "间", "闷", "闹"],
  雨: ["雪", "零", "雾", "需"],
  貝: ["贵", "费", "买", "卖"],
  广: ["店", "座", "应", "度"],
  尸: ["屋", "层", "居", "展"],
};

function RadicalDrawer({ radical, onClose }: { radical: Radical; onClose: () => void }) {
  const examples = radicalExamples[radical.char];
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Bộ ${radical.hanviet}`}>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 right-0 flex w-full flex-col bg-sp-card shadow-sp sm:w-[420px]">
        <div className="flex items-center justify-between border-b border-sp-line px-5 py-4">
          <h2 className="sp-font-head text-base font-extrabold text-sp-ink">
            Bộ {radical.hanviet}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="sp-press flex h-9 w-9 items-center justify-center rounded-xl text-sp-ink2 hover:bg-sp-locked-soft"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sp-scroll flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center gap-4">
            <span className="sp-font-head flex h-20 w-20 items-center justify-center rounded-3xl bg-sp-primary-soft text-4xl font-black text-sp-primary-strong">
              {radical.char}
            </span>
            <div>
              <p className="sp-font-head text-lg font-black text-sp-ink">
                Bộ {radical.hanviet} · #{radical.no}
              </p>
              <p className="text-sm text-sp-ink2">
                {radical.pinyin} · {radical.strokes} nét
              </p>
              {radical.variants.length > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-sm text-sp-ink2">
                  Biến thể:
                  {radical.variants.map((v) => (
                    <span key={v} className="sp-font-head text-base font-bold text-sp-ink">
                      {v}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>

          <h3 className="sp-font-head mt-6 text-sm font-extrabold text-sp-ink">
            Từ chứa bộ này (HSK 1–3)
          </h3>
          {examples ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {examples.map((w) => (
                <div
                  key={w}
                  className="flex items-center gap-3 rounded-xl border border-sp-line p-3"
                >
                  <AudioButton label={w} size="sm" />
                  <span className="sp-font-head text-xl font-black text-sp-ink">{w}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-sp-line bg-sp-bg p-5 text-center">
              <Sparkles size={20} className="mx-auto text-sp-ink3" aria-hidden="true" />
              <p className="mt-2 text-sm text-sp-ink2">
                Danh sách từ cho bộ này đang được bổ sung — bản đầy đủ sẽ có trong bản chính thức.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Pinyin tab ---------- */

function PinyinTab() {
  const groups = useMemo(() => {
    const g = new Map<string, typeof finals>();
    for (const f of finals) {
      if (!g.has(f.group)) g.set(f.group, []);
      g.get(f.group)!.push(f);
    }
    return Array.from(g.entries());
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <SectionHead
          icon={Speech}
          title="21 thanh mẫu"
          desc="Phụ âm đầu — bấm loa để nghe (placeholder)"
          action={<Chip tone="primary">Thành thạo {foundationMastery.pinyin}%</Chip>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {initials.map((it) => (
            <Card key={it.pinyin} className="sp-press p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="sp-font-head text-2xl font-black text-sp-ink">{it.pinyin}</p>
                  <p className="text-xs text-sp-ink3">{it.ipa}</p>
                </div>
                <AudioButton label={it.pinyin} size="sm" />
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-sp-line pt-3">
                <span className="sp-font-head text-lg font-black text-sp-primary-strong">
                  {it.exampleHanzi}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs text-sp-primary-strong">
                    {it.examplePinyin}
                  </span>
                  <span className="block truncate text-xs text-sp-ink2">{it.exampleVi}</span>
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-snug text-sp-ink3">{it.tip}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          icon={Volume2}
          title="36 vân mẫu"
          desc="Vần — nhóm theo đơn vân, phức vân và mũi vân"
        />
        {groups.map(([group, items]) => (
          <div key={group} className="mb-5">
            <h3 className="sp-font-head mb-2 text-sm font-extrabold text-sp-ink2">{group}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {items.map((f) => (
                <Card key={f.pinyin} className="sp-press flex items-center justify-between p-3.5">
                  <div className="min-w-0">
                    <p className="sp-font-head text-lg font-black text-sp-ink">{f.pinyin}</p>
                    <p className="truncate text-[11px] text-sp-ink3">{f.ipa}</p>
                    <p className="sp-font-head mt-1 text-sm font-bold text-sp-primary-strong">
                      {f.exampleHanzi}{" "}
                      <span className="text-[11px] font-normal text-sp-ink3">
                        {f.examplePinyin}
                      </span>
                    </p>
                  </div>
                  <AudioButton label={f.pinyin} size="sm" />
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---------- Tones tab ---------- */

function TonesTab() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHead
          icon={Volume2}
          title="4 thanh điệu cơ bản"
          desc="Đường nét bên phải mô tả cao độ của mỗi thanh"
          action={<Chip tone="primary">Thành thạo {foundationMastery.tones}%</Chip>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tones.map((t) => (
            <Card key={t.no} className="sp-press p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="sp-font-head text-4xl font-black text-sp-primary">{t.mark}</p>
                  <p className="sp-font-head mt-2 text-sm font-extrabold text-sp-ink">{t.name}</p>
                </div>
                <AudioButton label={t.examplePinyin} />
              </div>
              <svg viewBox="0 0 48 32" className="mt-3 h-10 w-full" aria-hidden="true">
                <path
                  d={t.path}
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              <p className="mt-2 text-xs text-sp-ink2">{t.contour}</p>
              <div className="mt-3 flex items-center gap-2 border-t border-sp-line pt-3">
                <span className="sp-font-head text-lg font-black text-sp-ink">
                  {t.exampleHanzi}
                </span>
                <span className="text-xs text-sp-ink2">
                  {t.examplePinyin} · {t.exampleVi}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionHead
          icon={Sparkles}
          title="Biến điệu (Thanh sandhi)"
          desc="Những quy tắc biến thanh bạn sẽ gặp hàng ngày"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {sandhiRules.map((r) => (
            <Card key={r.title} className="p-5">
              <div className="flex items-center justify-between">
                <p className="sp-font-head text-base font-black text-sp-ink">{r.title}</p>
                <Chip tone="warn" size="sm">
                  Quy tắc
                </Chip>
              </div>
              <p className="mt-2 text-sm text-sp-ink2">{r.rule}</p>
              <div className="mt-3 space-y-2">
                {r.examples.map((e) => (
                  <div
                    key={e.hanzi}
                    className="flex items-center gap-3 rounded-xl border border-sp-line p-2.5"
                  >
                    <AudioButton label={e.hanzi} size="sm" />
                    <div>
                      <p className="sp-font-head text-sm font-bold text-sp-ink">{e.hanzi}</p>
                      <p className="text-xs text-sp-primary-strong">{e.pinyin}</p>
                    </div>
                    <span className="ml-auto text-xs text-sp-ink2">{e.vi}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------- Radicals tab ---------- */

function RadicalsTab() {
  const [query, setQuery] = useState("");
  const [strokeFilter, setStrokeFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<Radical | null>(null);

  const filtered = useMemo(() => {
    return radicals.filter((r) => {
      if (strokeFilter === "1-2" && !(r.strokes >= 1 && r.strokes <= 2)) return false;
      if (strokeFilter === "3-4" && !(r.strokes >= 3 && r.strokes <= 4)) return false;
      if (strokeFilter === "5-6" && !(r.strokes >= 5 && r.strokes <= 6)) return false;
      if (strokeFilter === "7+" && r.strokes < 7) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const hay = `${r.no} ${r.char} ${r.pinyin} ${r.hanviet} ${r.variants.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [query, strokeFilter]);

  return (
    <div>
      <SectionHead
        icon={BookMarked}
        title="214 Bộ thủ Khang Hi"
        desc="Nền tảng của chữ Hán — tìm kiếm theo chữ, pinyin hoặc số nét"
        action={<Chip tone="primary">Đã thuộc {foundationMastery.radicals}%</Chip>}
      />

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sp-ink3"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm bộ thủ… (vd: thủy, 口, nhơn, 85)"
              aria-label="Tìm bộ thủ"
              className="w-full rounded-xl border border-sp-line bg-sp-card py-2.5 pl-10 pr-4 text-sm text-sp-ink placeholder:text-sp-ink3 focus:border-sp-primary focus:outline-none focus:ring-2 focus:ring-sp-primary/20"
            />
          </div>
          <div className="sp-scroll flex gap-2 overflow-x-auto" role="group" aria-label="Lọc theo số nét">
            {strokeFilters.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setStrokeFilter(f.value)}
                aria-pressed={strokeFilter === f.value}
                className={`sp-font-head sp-press h-10 shrink-0 rounded-xl px-4 text-xs font-bold transition-colors ${
                  strokeFilter === f.value
                    ? "bg-sp-primary text-white"
                    : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-sp-ink2">
          Hiển thị {filtered.length}/{radicals.length} bộ thủ
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Không tìm thấy bộ thủ nào"
          desc="Thử từ khoá khác — tìm bằng số thứ tự (85), chữ Hán (口), pinyin (shuǐ) hoặc tên Hán Việt (Thủy)."
          action={
            <GhostButton
              onClick={() => {
                setQuery("");
                setStrokeFilter(null);
              }}
            >
              Xoá bộ lọc
            </GhostButton>
          }
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map((r) => (
            <button
              key={r.no}
              type="button"
              onClick={() => setOpen(r)}
              className="sp-press rounded-2xl border border-sp-line bg-sp-card p-3 text-center shadow-sp-sm"
            >
              <span className="sp-font-head block text-2xl font-black text-sp-ink">{r.char}</span>
              <span className="sp-font-head mt-1 block text-xs font-bold text-sp-primary-strong">
                {r.hanviet}
              </span>
              <span className="mt-0.5 block text-[11px] text-sp-ink3">
                #{r.no} · {r.strokes} nét
              </span>
            </button>
          ))}
        </div>
      )}

      {open ? <RadicalDrawer radical={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

/* ---------- Listening & Speaking tabs ---------- */

function PlayDemoButton({ label }: { label: string }) {
  const [state, setState] = useState<"idle" | "playing">("idle");
  return (
    <button
      type="button"
      onClick={() => {
        if (state === "playing") return;
        setState("playing");
        setTimeout(() => setState("idle"), 1600);
      }}
      aria-label={`Phóng bài nghe: ${label}`}
      className={`sp-press flex h-10 w-10 items-center justify-center rounded-full border ${
        state === "playing"
          ? "border-sp-accent bg-sp-accent text-white"
          : "border-sp-line bg-sp-card text-sp-primary hover:bg-sp-primary-soft"
      }`}
    >
      {state === "playing" ? (
        <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="sp-audio-bar block w-[3px] rounded-full bg-white" style={{ height: "100%" }} />
          ))}
        </span>
      ) : (
        <Play size={16} aria-hidden="true" />
      )}
    </button>
  );
}

function RecordDemoButton({ label }: { label: string }) {
  const [state, setState] = useState<"idle" | "recording" | "done">("idle");
  return (
    <div className="flex items-center gap-2">
      {state === "recording" ? (
        <span className="sp-font-head rounded-full bg-sp-danger-soft px-3 py-1 text-xs font-extrabold text-sp-danger">
          Đang ghi…
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (state === "recording") return;
          if (state === "done") {
            setState("idle");
            return;
          }
          setState("recording");
          setTimeout(() => setState("done"), 1800);
        }}
        aria-label={
          state === "idle"
            ? `Bắt đầu ghi âm: ${label}`
            : state === "recording"
              ? "Đang ghi âm"
              : "Ghi lại lần nữa"
        }
        className={`sp-press flex h-10 w-10 items-center justify-center rounded-full border ${
          state === "recording"
            ? "sp-mic-live border-sp-danger bg-sp-danger text-white"
            : state === "done"
              ? "border-sp-ok bg-sp-ok text-white"
              : "border-sp-line bg-sp-card text-sp-accent-strong hover:bg-sp-accent-soft"
        }`}
      >
        <Mic size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function PracticeTab({
  cards,
  mode,
}: {
  cards: PracticeCard[];
  mode: "listening" | "speaking";
}) {
  return (
    <div>
      <SectionHead
        icon={mode === "listening" ? Headphones : Mic}
        title={mode === "listening" ? "Bài luyện nghe" : "Bài luyện nói"}
        desc={
          mode === "listening"
            ? "Nghe và chọn — ghi âm là placeholder trong bản demo"
            : "Ghi âm giọng của bạn và so sánh với bản gốc"
        }
        action={
          <Chip tone="primary">
            Thành thạo {mode === "listening" ? foundationMastery.listening : foundationMastery.speaking}%
          </Chip>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sp-primary-soft text-sp-primary">
                <Ear size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="sp-font-head text-base font-extrabold text-sp-ink">{c.title}</h3>
                  <Chip size="sm">HSK {c.level}</Chip>
                </div>
                <p className="mt-1 text-sm text-sp-ink2">{c.desc}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-sp-line pt-4">
              <div className="text-xs text-sp-ink2">
                <p>
                  <span className="sp-font-head font-bold text-sp-ink">{c.minutes} phút</span> · đã
                  làm {c.attempts} lần
                </p>
                <p className="mt-0.5">
                  {c.bestScore !== null ? `Điểm cao nhất: ${c.bestScore}%` : "Chưa có điểm"}
                </p>
              </div>
              {mode === "listening" ? (
                <PlayDemoButton label={c.title} />
              ) : (
                <RecordDemoButton label={c.title} />
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ---------- PDF downloads ---------- */

function PdfSection() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const download = (id: string) => {
    if (downloading) return;
    setDownloading(id);
    setTimeout(() => {
      setDownloading(null);
      setDone((prev) => new Set(prev).add(id));
    }, 1400);
  };

  return (
    <section className="mt-10">
      <SectionHead
        icon={FileText}
        title="Tài liệu tải về"
        desc="In ra hoặc lưu offline — nhấn để tải (demo)"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pdfCards.map((p) => (
          <Card key={p.id} className="sp-press flex flex-col p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sp-accent-soft text-sp-accent-strong">
              <FileText size={19} aria-hidden="true" />
            </span>
            <h3 className="sp-font-head mt-3 text-sm font-extrabold text-sp-ink">{p.title}</h3>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-sp-ink2">{p.desc}</p>
            <p className="mt-2 text-[11px] text-sp-ink3">
              {p.pages} trang · {p.size}
            </p>
            <button
              type="button"
              onClick={() => download(p.id)}
              disabled={downloading === p.id}
              className={`sp-press sp-font-head mt-3 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold ${
                done.has(p.id)
                  ? "bg-sp-ok-soft text-sp-ok"
                  : "bg-sp-accent text-white hover:bg-sp-accent-strong"
              }`}
            >
              <Download size={14} aria-hidden="true" />
              {downloading === p.id
                ? "Đang chuẩn bị…"
                : done.has(p.id)
                  ? "Đã tải (demo)"
                  : "Tải PDF"}
            </button>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

function PageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [demoState, setDemoState] = useState<DemoState>("ready");

  const tabParam = params.get("tab");
  const tab: TabKey = tabs.some((t) => t.key === tabParam) ? (tabParam as TabKey) : "pinyin";

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params.toString());
    next.set("tab", key);
    router.replace(`/student/foundation?${next.toString()}`, { scroll: false });
  };

  const moduleForTab: Record<TabKey, { label: string; value: number }> = {
    pinyin: { label: "Pinyin", value: foundationMastery.pinyin },
    tones: { label: "Thanh điệu", value: foundationMastery.tones },
    radicals: { label: "Bộ thủ", value: foundationMastery.radicals },
    listening: { label: "Nghe", value: foundationMastery.listening },
    speaking: { label: "Nói", value: foundationMastery.speaking },
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <a
            href="/student"
            className="sp-press flex h-10 w-10 items-center justify-center rounded-xl border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
            aria-label="Quay lại Tổng quan"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
          <div>
            <h1 className="sp-font-head text-2xl font-black text-sp-ink sm:text-3xl">Nền tảng</h1>
            <p className="text-sm text-sp-ink2">
              Pinyin · Thanh điệu · Bộ thủ · Nghe · Nói — nền tảng cho người mới bắt đầu
            </p>
          </div>
        </div>
        <DemoStateSwitcher state={demoState} onChange={setDemoState} />
      </div>

      {/* Mastery strip */}
      <Card className="mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-5">
          {(["pinyin", "tones", "radicals", "listening", "speaking"] as TabKey[]).map((k) => {
            const m = moduleForTab[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className="text-left"
              >
                <div className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="sp-font-head font-bold text-sp-ink">{m.label}</span>
                  <span className="text-sp-ink2">{m.value}%</span>
                </div>
                <ProgressBar
                  value={m.value}
                  tone={m.value >= 80 ? "ok" : "primary"}
                  label={`Tiến độ ${m.label}`}
                />
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tabs */}
      <div className="sp-scroll mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Chọn phân mục nền tảng">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`sp-font-head sp-press flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
                active
                  ? "bg-sp-primary text-white shadow-sp-sm"
                  : "border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {demoState === "loading" ? (
        <LoadingState rows={6} />
      ) : demoState === "error" ? (
        <ErrorState onRetry={() => setDemoState("ready")} />
      ) : demoState === "empty" ? (
        <EmptyState
          icon={Sparkles}
          title="Nội dung phân mục này đang được cập nhật"
          desc="Thử chuyển sang phân mục khác — Pinyin và Thanh điệu đã sẵn sàng."
          action={<PrimaryButton onClick={() => setTab("pinyin")}>Về Pinyin</PrimaryButton>}
        />
      ) : tab === "pinyin" ? (
        <PinyinTab />
      ) : tab === "tones" ? (
        <TonesTab />
      ) : tab === "radicals" ? (
        <RadicalsTab />
      ) : tab === "listening" ? (
        <PracticeTab cards={listeningCards} mode="listening" />
      ) : (
        <PracticeTab cards={speakingCards} mode="speaking" />
      )}

      <PdfSection />
    </div>
  );
}

export default function FoundationPage() {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <PageInner />
    </Suspense>
  );
}
