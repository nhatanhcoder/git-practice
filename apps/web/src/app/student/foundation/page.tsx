"use client";

/**
 * /student/foundation — the roots: pinyin, tones, the 214 Kangxi radicals,
 * plus listening and speaking practice and the printable PDFs.
 *
 * Five tabs rather than five routes: a learner drilling initials wants to flip
 * to tones without losing their place, and the URL carries `?tab=` so a link
 * into one section still works.
 *
 * MOCK(student): content from `lib/student/foundation-data.ts` and
 * `radicals-data.ts` (the radical list is real Kangxi data, kept from the
 * earlier build rather than re-invented).
 */

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Download, Ear, FileText, Mic, Search, Sparkles } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  Panel,
  Ring,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  AudioButton,
  DemoStateSwitcher,
  Pagination,
  Tabs,
  type DemoState,
} from "@/components/student/controls";
import { Drawer } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { useStudentStore } from "@/lib/student/store";
import {
  finals,
  foundationMastery,
  initials,
  listeningCards,
  pdfCards,
  sandhiRules,
  speakingCards,
  tones,
} from "@/lib/student/foundation-data";
import { radicals, type Radical } from "@/lib/student/radicals-data";

type TabId = "pinyin" | "tones" | "radicals" | "listening" | "speaking";

const TABS = [
  { id: "pinyin", label: "Pinyin" },
  { id: "tones", label: "Thanh điệu" },
  { id: "radicals", label: "Bộ thủ" },
  { id: "listening", label: "Nghe" },
  { id: "speaking", label: "Nói" },
];

const RADICALS_PER_PAGE = 60;

function FoundationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const paramTab = params?.get("tab") as TabId | null;
  const [tab, setTab] = useState<TabId>(
    paramTab && TABS.some((t) => t.id === paramTab) ? paramTab : "pinyin",
  );
  const [demo, setDemo] = useState<DemoState>("ready");

  const masteredSounds = useStudentStore((s) => s.masteredSounds);
  const learnedRadicals = useStudentStore((s) => s.learnedRadicals);
  const toggleSound = useStudentStore((s) => s.toggleSound);
  const toggleRadical = useStudentStore((s) => s.toggleRadical);
  const awardXp = useStudentStore((s) => s.awardXp);
  const toast = useToast();

  const [radicalQuery, setRadicalQuery] = useState("");
  const [strokeFilter, setStrokeFilter] = useState<number | "all">("all");
  const [radicalPage, setRadicalPage] = useState(1);
  const [openRadical, setOpenRadical] = useState<Radical | null>(null);

  function changeTab(id: string) {
    setTab(id as TabId);
    router.replace(`/student/foundation?tab=${id}`, { scroll: false });
  }

  const soundPct = Math.round(
    (masteredSounds.length / (initials.length + finals.length)) * 100,
  );
  const radicalPct = Math.round((learnedRadicals.length / radicals.length) * 100);

  const strokeGroups = useMemo(
    () => Array.from(new Set(radicals.map((r) => r.strokes))).sort((a, b) => a - b),
    [],
  );

  const filteredRadicals = useMemo(() => {
    const q = radicalQuery.trim().toLowerCase();
    return radicals.filter((r) => {
      if (strokeFilter !== "all" && r.strokes !== strokeFilter) return false;
      if (!q) return true;
      return (
        r.char.includes(q) ||
        r.pinyin.toLowerCase().includes(q) ||
        r.hanviet.toLowerCase().includes(q) ||
        String(r.no) === q
      );
    });
  }, [radicalQuery, strokeFilter]);

  const pagedRadicals = filteredRadicals.slice(
    (radicalPage - 1) * RADICALS_PER_PAGE,
    radicalPage * RADICALS_PER_PAGE,
  );
  const foundationProgress = [
    { id: "pinyin", label: "Pinyin", value: soundPct },
    { id: "tones", label: "Thanh điệu", value: foundationMastery.tones },
    { id: "radicals", label: "Bộ thủ", value: radicalPct },
    { id: "listening", label: "Nghe", value: foundationMastery.listening },
    { id: "speaking", label: "Nói", value: foundationMastery.speaking },
  ];
  const overall = Math.round(
    foundationProgress.reduce((sum, item) => sum + item.value, 0) / foundationProgress.length,
  );

  function markSound(id: string) {
    const wasMastered = masteredSounds.includes(id);
    toggleSound(id);
    if (!wasMastered) {
      awardXp(5, 1);
      toast(`Đánh dấu đã thuộc «${id}» — +5 XP`, "success");
    }
  }

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="eyebrow">Nền tảng</p>
          <h1 className="pagehead__title">Gốc rễ tiếng Trung</h1>
          <p className="pagehead__sub">
            Phát âm chuẩn, thanh điệu vững, bộ thủ thuộc lòng — ba nền móng quyết định tốc độ tiến bộ ở mọi cấp HSK.
          </p>
        </div>
        <DemoStateSwitcher value={demo} onChange={setDemo} />
      </header>

      {demo === "loading" ? (
        <SkeletonPanel rows={6} height={220} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Mastery overview ---------- */}
          <Panel className="panel--pad" aria-label="Tiến độ nền tảng">
            <div className="row gap-6 wrap">
              <Ring value={overall} size={104} stroke={10} label="Mức thành thạo nền tảng">
                <span className="stack" style={{ gap: 0 }}>
                  <span className="num" style={{ fontFamily: "var(--font-display)", fontSize: "var(--step-2)", fontWeight: 700 }}>{overall}%</span>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>nền tảng</span>
                </span>
              </Ring>
              <ul className="found-progress grow">
                {foundationProgress.map((item) => (
                  <li key={item.id} className="stack gap-2">
                    <div className="row gap-2">
                      <span className="metric__label">{item.label}</span>
                      <span className="grow" />
                      <span className="num" style={{ fontSize: "var(--step--1)", fontWeight: 700 }}>{item.value}%</span>
                    </div>
                    <Bar value={item.value} size="sm" tone={item.value >= 70 ? "success" : item.value >= 45 ? "accent" : "info"} label={`Thành thạo ${item.label}`} />
                  </li>
                ))}
              </ul>
              <Metric label="Bộ thủ đã thuộc" value={learnedRadicals.length} unit="/214" />
            </div>
          </Panel>

          {/* ---------- Tabs ---------- */}
          <div className="tabs-shell">
            <Tabs
              tabs={TABS}
              active={tab}
              onChange={changeTab}
              label="Khu vực nền tảng"
            />
          </div>

            <div>
              {/* ---- Pinyin ---- */}
              {tab === "pinyin" ? (
                <div className="stack gap-6">
                  <div className="stack gap-3">
                    <SectionHeader
                      title="21 thanh mẫu"
                      sub="Phụ âm đầu. Bấm ô để đánh dấu đã thuộc, bấm loa để nghe."
                    />
                    <div className="sound-grid">
                      {initials.map((i) => (
                        <button
                          key={i.pinyin}
                          type="button"
                          className={`sound-cell ${masteredSounds.includes(i.pinyin) ? "is-mastered" : ""}`}
                          onClick={() => markSound(i.pinyin)}
                          title={i.tip}
                        >
                          <span className="row gap-2">
                            <span className="sound-cell__p grow">{i.pinyin}</span>
                            {masteredSounds.includes(i.pinyin) ? <Check size={14} /> : null}
                          </span>
                          <span className="sound-cell__ipa num">{i.ipa}</span>
                          <span className="han" style={{ fontSize: "var(--step-1)" }}>
                            {i.exampleHanzi}
                          </span>
                          <span className="pinyin" style={{ fontSize: 10, color: "var(--accent)" }}>
                            {i.examplePinyin}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="stack gap-3">
                    <SectionHeader title="36 vận mẫu" sub="Phần vần, nhóm theo loại." />
                    <div className="sound-grid">
                      {finals.map((f) => (
                        <button
                          key={f.pinyin}
                          type="button"
                          className={`sound-cell ${masteredSounds.includes(f.pinyin) ? "is-mastered" : ""}`}
                          onClick={() => markSound(f.pinyin)}
                          title={f.group}
                        >
                          <span className="row gap-2">
                            <span className="sound-cell__p grow">{f.pinyin}</span>
                            {masteredSounds.includes(f.pinyin) ? <Check size={14} /> : null}
                          </span>
                          <span className="sound-cell__ipa num">{f.ipa}</span>
                          <span className="han" style={{ fontSize: "var(--step-1)" }}>
                            {f.exampleHanzi}
                          </span>
                          <span className="pinyin" style={{ fontSize: 10, color: "var(--accent)" }}>
                            {f.examplePinyin}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ---- Tones ---- */}
              {tab === "tones" ? (
                <div className="stack gap-6">
                  <div className="grid grid--4">
                    {tones.map((t) => (
                      <div key={t.no} className="tone-card">
                        <div className="row gap-3">
                          <span className="han" style={{ fontSize: 34 }}>
                            {t.mark}
                          </span>
                          <span className="stack gap-1 grow">
                            <span style={{ fontWeight: 650 }}>{t.name}</span>
                            <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                              {t.contour}
                            </span>
                          </span>
                          <AudioButton say={t.exampleHanzi} label={t.examplePinyin} />
                        </div>
                        <svg viewBox="0 0 48 32" width="100%" height="46" aria-hidden="true">
                          <path
                            d={t.path}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="row gap-2">
                          <span className="han" style={{ fontSize: "var(--step-1)" }}>
                            {t.exampleHanzi}
                          </span>
                          <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--1)" }}>
                            {t.examplePinyin}
                          </span>
                          <span className="vi-meaning grow" style={{ color: "var(--text-3)", fontSize: "var(--step--2)", textAlign: "right" }}>
                            {t.exampleVi}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="stack gap-3">
                    <SectionHeader
                      title="Biến điệu (Tone sandhi)"
                      sub="Quy tắc đổi thanh khi các âm tiết đứng cạnh nhau."
                    />
                    <div className="grid grid--2">
                      {sandhiRules.map((r) => (
                        <Panel key={r.title} className="panel--tight">
                          <div className="stack gap-2">
                            <Chip tone="accent">{r.title}</Chip>
                            <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                              {r.rule}
                            </p>
                            {r.examples.map((ex) => (
                              <div key={ex.hanzi} className="row gap-2 wrap">
                                <span className="han">{ex.hanzi}</span>
                                <span className="pinyin num" style={{ color: "var(--accent)", fontSize: "var(--step--2)" }}>
                                  {ex.pinyin}
                                </span>
                                <span className="vi-meaning" style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                                  {ex.vi}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Panel>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ---- Radicals ---- */}
              {tab === "radicals" ? (
                <div className="stack gap-4">
                  <SectionHeader
                    title="214 bộ thủ Khang Hi"
                    sub="Bấm một bộ để xem biến thể và ví dụ; bấm dấu tích để đánh dấu đã học."
                  />
                  <div className="row gap-3 wrap">
                    <label className="field grow" style={{ maxWidth: 320 }}>
                      <Search size={16} aria-hidden="true" />
                      <input
                        type="search"
                        value={radicalQuery}
                        onChange={(e) => {
                          setRadicalQuery(e.target.value);
                          setRadicalPage(1);
                        }}
                        placeholder="Tìm bộ thủ, pinyin, âm Hán-Việt hoặc số…"
                        aria-label="Tìm bộ thủ"
                      />
                    </label>
                    <select
                      className="select"
                      value={String(strokeFilter)}
                      onChange={(e) => {
                        setStrokeFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                        setRadicalPage(1);
                      }}
                      aria-label="Lọc theo số nét"
                    >
                      <option value="all">Tất cả số nét</option>
                      {strokeGroups.map((n) => (
                        <option key={n} value={n}>
                          {n} nét
                        </option>
                      ))}
                    </select>
                  </div>

                  {filteredRadicals.length === 0 ? (
                    <EmptyState
                      title="Không có bộ thủ nào khớp"
                      text="Thử tìm bằng ký tự, pinyin hoặc số thứ tự."
                    />
                  ) : (
                    <>
                      <div className="radical-grid">
                        {pagedRadicals.map((r) => (
                          <button
                            key={r.no}
                            type="button"
                            className={`radical-cell ${learnedRadicals.includes(r.no) ? "is-learned" : ""}`}
                            onClick={() => setOpenRadical(r)}
                          >
                            <span className="radical-cell__no num">{r.no}</span>
                            <span className="radical-cell__char han">{r.char}</span>
                            <span className="radical-cell__name">{r.hanviet}</span>
                          </button>
                        ))}
                      </div>
                      <Pagination
                        page={radicalPage}
                        totalItems={filteredRadicals.length}
                        pageSize={RADICALS_PER_PAGE}
                        onPageChange={setRadicalPage}
                        unit="bộ thủ"
                      />
                    </>
                  )}
                </div>
              ) : null}

              {/* ---- Listening ---- */}
              {tab === "listening" ? (
                <div className="stack gap-4">
                  <SectionHeader title="Luyện nghe" sub="Bài tập ngắn, chấm điểm mô phỏng." />
                  <div className="grid grid--2">
                    {listeningCards.map((c) => (
                      <Panel key={c.id} className="panel--tight">
                        <div className="row gap-3">
                          <span className="rowitem__icon">
                            <Ear size={18} />
                          </span>
                          <span className="stack gap-1 grow">
                            <span style={{ fontWeight: 650 }}>{c.title}</span>
                            <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                              {c.desc}
                            </span>
                          </span>
                          <Chip tone="accent">HSK {c.level}</Chip>
                        </div>
                        <div className="row gap-3" style={{ marginTop: "var(--sp-3)" }}>
                          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                            {c.minutes} phút ·{" "}
                            {c.bestScore === null ? "chưa làm" : `tốt nhất ${c.bestScore}%`}
                          </span>
                          <div className="grow" />
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => toast("Bài nghe chưa có trong bản mockup", "info")}
                          >
                            Bắt đầu
                          </button>
                        </div>
                        {c.bestScore !== null ? (
                          <Bar value={c.bestScore} size="sm" label="Điểm tốt nhất" />
                        ) : null}
                      </Panel>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* ---- Speaking ---- */}
              {tab === "speaking" ? (
                <div className="stack gap-4">
                  <SectionHeader
                    title="Luyện nói"
                    sub="Ghi âm và chấm điểm là phần chưa có trong bản mockup."
                  />
                  <div className="grid grid--2">
                    {speakingCards.map((c) => (
                      <Panel key={c.id} className="panel--tight">
                        <div className="row gap-3">
                          <span className="rowitem__icon">
                            <Mic size={18} />
                          </span>
                          <span className="stack gap-1 grow">
                            <span style={{ fontWeight: 650 }}>{c.title}</span>
                            <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                              {c.desc}
                            </span>
                          </span>
                          <Chip tone="accent">HSK {c.level}</Chip>
                        </div>
                        <div className="row gap-3" style={{ marginTop: "var(--sp-3)" }}>
                          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                            {c.minutes} phút ·{" "}
                            {c.bestScore === null ? "chưa làm" : `tốt nhất ${c.bestScore}%`}
                          </span>
                          <div className="grow" />
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => toast("Ghi âm chưa có trong bản mockup", "info")}
                          >
                            <Mic size={14} /> Ghi âm
                          </button>
                        </div>
                      </Panel>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

          {/* ---------- PDFs ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                  Tài liệu tải về
                </h2>
                <p className="section-sub">Bốn tệp PDF in được để luyện offline.</p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {pdfCards.map((p) => (
                <div key={p.id} className="rowitem">
                  <span className="rowitem__icon">
                    <FileText size={18} />
                  </span>
                  <span className="grow stack gap-1">
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                      {p.desc} · <span className="num">{p.pages}</span> trang · {p.size}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => toast("MOCK: chưa có tệp thật trong bản mockup", "info")}
                  >
                    <Download size={14} /> Tải
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ---------- Radical drawer ---------- */}
      <Drawer
        open={openRadical !== null}
        onClose={() => setOpenRadical(null)}
        eyebrow={openRadical ? `Bộ thủ số ${openRadical.no}` : ""}
        title={openRadical?.hanviet ?? ""}
        subtitle={openRadical ? `${openRadical.strokes} nét` : ""}
        footer={
          openRadical ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={() => {
                const was = learnedRadicals.includes(openRadical.no);
                toggleRadical(openRadical.no);
                if (!was) {
                  awardXp(5, 1);
                  toast(`Đã học bộ ${openRadical.char} — +5 XP`, "success");
                }
                setOpenRadical(null);
              }}
            >
              {learnedRadicals.includes(openRadical.no) ? (
                "Bỏ đánh dấu đã học"
              ) : (
                <>
                  <Check size={16} /> Đánh dấu đã học
                </>
              )}
            </button>
          ) : null
        }
      >
        {openRadical ? (
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span className="han" style={{ fontSize: 96, lineHeight: 1 }}>
              {openRadical.char}
            </span>
            <span
              className="pinyin radical__pinyin"
              style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step-2)" }}
            >
              {openRadical.pinyin}
            </span>
            <span className="vi-meaning radical__vi" style={{ color: "var(--text-2)" }}>
              Âm Hán-Việt: {openRadical.hanviet}
            </span>
            {openRadical.variants.length > 0 ? (
              <div className="stack gap-2" style={{ width: "100%" }}>
                <span className="eyebrow">Biến thể</span>
                <div className="row gap-2 wrap" style={{ justifyContent: "center" }}>
                  {openRadical.variants.map((v) => (
                    <span key={v} className="chip han" style={{ fontSize: "var(--step-1)" }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <Chip icon={<Sparkles size={12} />}>Không có biến thể</Chip>
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

export default function FoundationPage() {
  return (
    <Suspense fallback={<SkeletonPanel rows={5} height={200} />}>
      <FoundationInner />
    </Suspense>
  );
}
