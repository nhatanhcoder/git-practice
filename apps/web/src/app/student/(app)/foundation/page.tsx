"use client";

/**
 * /student/foundation — the roots: pinyin, tones, the 214 Kangxi radicals,
 * plus listening and speaking practice and the printable PDFs.
 *
 * LIVE (2026-09-16, 02-foundation-grammar.md): catalog and studied-state come
 * from `GET/PUT /student/foundation`. Five tabs share one catalog load; the
 * URL carries `?tab=` so back/forward and deep links restore the tab.
 *
 * Honesty rules enforced here (D3/D4, module §8/§10):
 * - Progress bars and counts render ONLY server-confirmed studied-state.
 *   Unknown progress (failed read) shows "Chưa có số liệu", never zero.
 * - No XP, streak or mastery is awarded or displayed — this slice has none.
 * - Listening audio, speaking recording and PDF files do not exist: their
 *   controls are disabled with a reason, never a fake success toast.
 * - Source fields render verbatim; unverified descriptors (durations, file
 *   sizes) and invented content (sound tips, radical variants) are omitted.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Download, Ear, FileText, Mic, Search } from "lucide-react";
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
import { Pagination, Tabs } from "@/components/student/controls";
import { Drawer } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { ApiError } from "@/lib/api-client";
import {
  fetchFoundationCatalog,
  fetchFoundationProgress,
  parseTonePoints,
  saveFoundationProgress,
  tonePolyline,
  type FoundationCatalog,
  type FoundationKind,
  type RadicalRecord,
} from "@/lib/student/foundation-service";

type TabId = "pinyin" | "tones" | "radicals" | "listening" | "speaking";

const TABS = [
  { id: "pinyin", label: "Pinyin" },
  { id: "tones", label: "Thanh điệu" },
  { id: "radicals", label: "Bộ thủ" },
  { id: "listening", label: "Nghe" },
  { id: "speaking", label: "Nói" },
];

const RADICALS_PER_PAGE = 60;

function isTabId(value: string | null): value is TabId {
  return value !== null && TABS.some((t) => t.id === value);
}

function FoundationInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<TabId>(() => {
    const initial = params?.get("tab");
    return isTabId(initial) ? initial : "pinyin";
  });

  // Back/forward and deep links change the URL without remounting: follow it.
  useEffect(() => {
    const fromUrl = params?.get("tab");
    if (isTabId(fromUrl)) setTab(fromUrl);
  }, [params]);

  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [catalog, setCatalog] = useState<FoundationCatalog | null>(null);
  const [studied, setStudied] = useState<Set<string>>(new Set());
  const [progressKnown, setProgressKnown] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const toast = useToast();

  const [radicalQuery, setRadicalQuery] = useState("");
  const [strokeFilter, setStrokeFilter] = useState<number | "all">("all");
  const [radicalPage, setRadicalPage] = useState(1);
  const [openRadical, setOpenRadical] = useState<RadicalRecord | null>(null);

  const load = useCallback(async () => {
    setPhase("loading");
    setLoadError("");
    try {
      const data = await fetchFoundationCatalog();
      setCatalog(data);
      try {
        const rows = await fetchFoundationProgress();
        // Only server-confirmed `studied: true` counts — an explicitly unmarked
        // row is history, not progress. Never treat it as studied.
        setStudied(
          new Set(
            rows.filter((r) => r.studied && r.kind && r.key).map((r) => `${r.kind}:${r.key}`),
          ),
        );
        setProgressKnown(true);
      } catch {
        // Catalog stays usable when progress is unavailable (module §3:
        // the two reads are separable). Progress renders as unknown, not zero.
        setProgressKnown(false);
      }
      setPhase("ready");
    } catch (err) {
      setLoadError(
        err instanceof ApiError && (err.isUnauthenticated || err.isForbidden)
          ? "Bạn cần đăng nhập tài khoản học viên để xem nội dung nền tảng."
          : "Không tải được nội dung nền tảng. Kiểm tra mạng rồi thử lại.",
      );
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function changeTab(id: string) {
    if (!isTabId(id)) return;
    setTab(id);
    router.replace(`/student/foundation?tab=${id}`, { scroll: false });
  }

  async function toggleStudied(kind: FoundationKind, key: string) {
    const id = `${kind}:${key}`;
    if (pending.has(id)) return;
    const next = !studied.has(id);
    setPending((prev) => new Set(prev).add(id));
    try {
      const saved = await saveFoundationProgress(kind, key, next);
      setStudied((prev) => {
        const copy = new Set(prev);
        if (saved.studied) copy.add(id);
        else copy.delete(id);
        return copy;
      });
      setProgressKnown(true);
    } catch {
      toast("Không lưu được trạng thái học. Giữ nguyên như cũ.", "danger");
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(id);
        return copy;
      });
    }
  }

  const maybeGroups = catalog?.groups;
  const radicals = useMemo(() => maybeGroups?.radicals ?? [], [maybeGroups]);

  const strokeGroups = useMemo(
    () => Array.from(new Set(radicals.map((r) => r.strokes))).sort((a, b) => a - b),
    [radicals],
  );

  const filteredRadicals = useMemo(() => {
    const q = radicalQuery.trim().toLowerCase();
    return radicals.filter((r) => {
      if (strokeFilter !== "all" && r.strokes !== strokeFilter) return false;
      if (!q) return true;
      return (
        r.char.includes(q) ||
        r.pinyin.toLowerCase().includes(q) ||
        r.hanViet.toLowerCase().includes(q) ||
        String(r.no) === q
      );
    });
  }, [radicals, radicalQuery, strokeFilter]);

  const pagedRadicals = filteredRadicals.slice(
    (radicalPage - 1) * RADICALS_PER_PAGE,
    radicalPage * RADICALS_PER_PAGE,
  );

  const counts = useMemo(() => {
    if (!maybeGroups) return null;
    const groups = maybeGroups;
    const has = (kind: FoundationKind, key: string) => studied.has(`${kind}:${key}`);
    const pinyinTotal = groups.initials.length + groups.finals.length;
    const pinyinDone =
      groups.initials.filter((s) => has("pinyin", s.sound)).length +
      groups.finals.filter((s) => has("pinyin", s.sound)).length;
    const tonesDone = groups.tones.filter((t) => has("tones", String(t.id))).length;
    const sandhiDone = groups.sandhi.filter((s) => has("sandhi", s.id)).length;
    const radicalsDone = groups.radicals.filter((r) => has("radicals", String(r.no))).length;
    const listeningDone = groups.listening.filter((c) => has("listening", c.id)).length;
    const speakingDone = groups.speaking.filter((c) => has("speaking", c.id)).length;
    const done = pinyinDone + tonesDone + sandhiDone + radicalsDone + listeningDone + speakingDone;
    const total =
      pinyinTotal +
      groups.tones.length +
      groups.sandhi.length +
      groups.radicals.length +
      groups.listening.length +
      groups.speaking.length;
    return { pinyinDone, pinyinTotal, tonesDone, tonesTotal: groups.tones.length, sandhiDone, radicalsDone, radicalsTotal: groups.radicals.length, listeningDone, listeningTotal: groups.listening.length, speakingDone, speakingTotal: groups.speaking.length, done, total };
  }, [maybeGroups, studied]);

  const finalGroups = useMemo(() => {
    const groups = maybeGroups;
    if (!groups) return [];
    const order: string[] = [];
    for (const f of groups.finals) {
      if (!order.includes(f.group)) order.push(f.group);
    }
    return order.map((g) => ({ group: g, items: groups.finals.filter((f) => f.group === g) }));
  }, [maybeGroups]);

  if (phase === "loading") {
    return (
      <>
        <header className="pagehead">
          <div>
            <p className="eyebrow">Nền tảng</p>
            <h1 className="pagehead__title">Gốc rễ tiếng Trung</h1>
          </div>
        </header>
        <SkeletonPanel rows={6} height={220} />
      </>
    );
  }

  if (phase === "error" || !catalog) {
    return (
      <>
        <header className="pagehead">
          <div>
            <p className="eyebrow">Nền tảng</p>
            <h1 className="pagehead__title">Gốc rễ tiếng Trung</h1>
          </div>
        </header>
        <Panel className="panel--pad">
          <ErrorState text={loadError} onRetry={() => void load()} />
        </Panel>
      </>
    );
  }

  const groups = catalog.groups;
  const isEmpty =
    catalog.revision === null ||
    (groups.initials.length === 0 &&
      groups.finals.length === 0 &&
      groups.tones.length === 0 &&
      groups.radicals.length === 0);

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
      </header>

      {isEmpty ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có nội dung nền tảng"
            text="Máy chủ chưa công bố phiên bản nội dung nào. Vui lòng quay lại sau."
          />
        </Panel>
      ) : (
        <>
          {/* ---------- Study progress (server-confirmed only) ---------- */}
          {progressKnown && counts ? (
            <Panel className="panel--pad" aria-label="Tiến độ nền tảng">
              <div className="row gap-6 wrap">
                <Ring
                  value={counts.total === 0 ? 0 : Math.round((counts.done / counts.total) * 100)}
                  size={104}
                  stroke={10}
                  label="Mục đã đánh dấu đã học"
                >
                  <span className="stack" style={{ gap: 0 }}>
                    <span className="num" style={{ fontFamily: "var(--font-display)", fontSize: "var(--step-2)", fontWeight: 700 }}>
                      {counts.done}/{counts.total}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>đã học</span>
                  </span>
                </Ring>
                <ul className="found-progress grow">
                  {(
                    [
                      ["Pinyin", counts.pinyinDone, counts.pinyinTotal],
                      ["Thanh điệu", counts.tonesDone, counts.tonesTotal],
                      ["Bộ thủ", counts.radicalsDone, counts.radicalsTotal],
                      ["Nghe", counts.listeningDone, counts.listeningTotal],
                      ["Nói", counts.speakingDone, counts.speakingTotal],
                    ] as Array<[string, number, number]>
                  ).map(([label, done, total]) => (
                    <li key={label} className="stack gap-2">
                      <div className="row gap-2">
                        <span className="metric__label">{label}</span>
                        <span className="grow" />
                        <span className="num" style={{ fontSize: "var(--step--1)", fontWeight: 700 }}>
                          {done}/{total}
                        </span>
                      </div>
                      <Bar
                        value={total === 0 ? 0 : Math.round((done / total) * 100)}
                        size="sm"
                        tone={total > 0 && done === total ? "success" : "info"}
                        label={`${label}: ${done} trên ${total} đã học`}
                      />
                    </li>
                  ))}
                </ul>
                <Metric label="Bộ thủ đã học" value={counts.radicalsDone} unit={`/${counts.radicalsTotal}`} />
              </div>
            </Panel>
          ) : (
            <Panel className="panel--pad">
              <EmptyState
                title="Chưa có số liệu học tập"
                text="Không đọc được trạng thái học của bạn nên trang không ước đoán tiến độ. Nội dung bên dưới vẫn đầy đủ."
              />
            </Panel>
          )}

          {/* ---------- Tabs ---------- */}
          <div className="tabs-shell">
            <Tabs tabs={TABS} active={tab} onChange={changeTab} label="Khu vực nền tảng" />
          </div>

          <div>
            {/* ---- Pinyin ---- */}
            {tab === "pinyin" ? (
              <div className="stack gap-6">
                <div className="stack gap-3">
                  <SectionHeader
                    title={`${groups.initials.length} thanh mẫu`}
                    sub="Phụ âm đầu. Bấm ô để đánh dấu đã học — chỉ lưu sau khi máy chủ xác nhận."
                  />
                  <div className="sound-grid">
                    {groups.initials.map((i) => {
                      const id = `pinyin:${i.sound}`;
                      const done = studied.has(id);
                      return (
                        <button
                          key={i.sound}
                          type="button"
                          className={`sound-cell ${done ? "is-mastered" : ""}`}
                          onClick={() => void toggleStudied("pinyin", i.sound)}
                          disabled={pending.has(id)}
                          title={i.group}
                        >
                          <span className="row gap-2">
                            <span className="sound-cell__p grow">{i.sound}</span>
                            {done ? <Check size={14} /> : null}
                          </span>
                          <span className="sound-cell__ipa num">{i.ipa}</span>
                          <span className="han" style={{ fontSize: "var(--step-1)" }}>{i.hanzi}</span>
                          <span className="pinyin" style={{ fontSize: 10, color: "var(--accent)" }}>
                            {i.pinyin} · {i.vi}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {finalGroups.map((section) => (
                  <div key={section.group} className="stack gap-3">
                    <SectionHeader title={section.group} sub={`${section.items.length} vận mẫu.`} />
                    <div className="sound-grid">
                      {section.items.map((f) => {
                        const id = `pinyin:${f.sound}`;
                        const done = studied.has(id);
                        return (
                          <button
                            key={f.sound}
                            type="button"
                            className={`sound-cell ${done ? "is-mastered" : ""}`}
                            onClick={() => void toggleStudied("pinyin", f.sound)}
                            disabled={pending.has(id)}
                            title={f.group}
                          >
                            <span className="row gap-2">
                              <span className="sound-cell__p grow">{f.sound}</span>
                              {done ? <Check size={14} /> : null}
                            </span>
                            <span className="sound-cell__ipa num">{f.ipa}</span>
                            <span className="han" style={{ fontSize: "var(--step-1)" }}>{f.hanzi}</span>
                            <span className="pinyin" style={{ fontSize: 10, color: "var(--accent)" }}>
                              {f.pinyin} · {f.vi}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* ---- Tones ---- */}
            {tab === "tones" ? (
              <div className="stack gap-6">
                <div className="grid grid--4">
                  {groups.tones.map((t) => {
                    const id = `tones:${t.id}`;
                    const done = studied.has(id);
                    const points = parseTonePoints(t.path);
                    return (
                      <div key={t.id} className="tone-card">
                        <div className="row gap-3">
                          <span className="han" style={{ fontSize: 34 }}>{t.mark}</span>
                          <span className="stack gap-1 grow">
                            <span style={{ fontWeight: 650 }}>{t.name}</span>
                            <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>{t.contour}</span>
                          </span>
                        </div>
                        {points ? (
                          <svg viewBox="0 0 48 32" width="100%" height="46" aria-hidden="true">
                            <polyline
                              points={tonePolyline(points)}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                        <p style={{ color: "var(--text-2)", fontSize: "var(--step--2)" }}>{t.pitch}</p>
                        <div className="row gap-2">
                          <span className="han" style={{ fontSize: "var(--step-1)" }}>{t.hanzi}</span>
                          <span className="pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--1)" }}>
                            {t.pinyin}
                          </span>
                          <span className="vi-meaning grow" style={{ color: "var(--text-3)", fontSize: "var(--step--2)", textAlign: "right" }}>
                            {t.vi}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          disabled={pending.has(id)}
                          onClick={() => void toggleStudied("tones", String(t.id))}
                        >
                          {done ? (
                            <>
                              <Check size={14} /> Đã học — bấm để bỏ
                            </>
                          ) : (
                            "Đánh dấu đã học"
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="stack gap-3">
                  <SectionHeader
                    title="Biến điệu (Tone sandhi)"
                    sub="Quy tắc đổi thanh khi các âm tiết đứng cạnh nhau."
                  />
                  <div className="grid grid--2">
                    {groups.sandhi.map((r) => {
                      const id = `sandhi:${r.id}`;
                      const done = studied.has(id);
                      return (
                        <Panel key={r.id} className="panel--tight">
                          <div className="stack gap-2">
                            <Chip tone="accent">{r.title}</Chip>
                            <p style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>{r.rule}</p>
                            {r.hanzi ? (
                              <div className="row gap-2 wrap">
                                <span className="han">{r.hanzi}</span>
                                {r.before ? (
                                  <span className="pinyin num" style={{ color: "var(--accent)", fontSize: "var(--step--2)" }}>
                                    {r.before} → {r.after}
                                  </span>
                                ) : null}
                                {r.vi ? (
                                  <span className="vi-meaning" style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                                    {r.vi}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              disabled={pending.has(id)}
                              onClick={() => void toggleStudied("sandhi", r.id)}
                            >
                              {done ? "Đã học — bấm để bỏ" : "Đánh dấu đã học"}
                            </button>
                          </div>
                        </Panel>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {/* ---- Radicals ---- */}
            {tab === "radicals" ? (
              <div className="stack gap-4">
                <SectionHeader
                  title={`${groups.radicals.length} bộ thủ Khang Hi`}
                  sub="Bấm một bộ để xem chi tiết; đánh dấu chỉ lưu sau khi máy chủ xác nhận."
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
                      <option key={n} value={n}>{n} nét</option>
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
                          className={`radical-cell ${studied.has(`radicals:${r.no}`) ? "is-learned" : ""}`}
                          onClick={() => setOpenRadical(r)}
                        >
                          <span className="radical-cell__no num">{r.no}</span>
                          <span className="radical-cell__char han">{r.char}</span>
                          <span className="radical-cell__name">{r.hanViet}</span>
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
                <SectionHeader
                  title="Luyện nghe"
                  sub="Bài đọc transcript. Audio chưa có nên nút nghe tắt — không phải lỗi của bạn."
                />
                <div className="grid grid--2">
                  {groups.listening.map((c) => {
                    const id = `listening:${c.id}`;
                    const done = studied.has(id);
                    return (
                      <Panel key={c.id} className="panel--tight">
                        <div className="row gap-3">
                          <span className="rowitem__icon"><Ear size={18} /></span>
                          <span className="stack gap-1 grow">
                            <span style={{ fontWeight: 650 }}>{c.title}</span>
                            {c.hanzi ? (
                              <span className="han" style={{ fontSize: "var(--step-1)" }}>{c.hanzi}</span>
                            ) : null}
                            {c.transcript ? (
                              <span style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>{c.transcript}</span>
                            ) : null}
                            {c.vi ? (
                              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>{c.vi}</span>
                            ) : null}
                          </span>
                          {c.level !== undefined ? <Chip tone="accent">HSK {c.level}</Chip> : null}
                        </div>
                        <div className="row gap-3 wrap" style={{ marginTop: "var(--sp-3)" }}>
                          <button type="button" className="btn btn--outline btn--sm" disabled title="Chưa có tệp audio">
                            Nghe (chưa có audio)
                          </button>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            disabled={pending.has(id)}
                            onClick={() => void toggleStudied("listening", c.id)}
                          >
                            {done ? "Đã học — bấm để bỏ" : "Đánh dấu đã học"}
                          </button>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* ---- Speaking ---- */}
            {tab === "speaking" ? (
              <div className="stack gap-4">
                <SectionHeader
                  title="Luyện nói"
                  sub="Câu luyện đọc. Ghi âm và chấm điểm chưa có nên nút ghi âm tắt."
                />
                <div className="grid grid--2">
                  {groups.speaking.map((c) => {
                    const id = `speaking:${c.id}`;
                    const done = studied.has(id);
                    return (
                      <Panel key={c.id} className="panel--tight">
                        <div className="row gap-3">
                          <span className="rowitem__icon"><Mic size={18} /></span>
                          <span className="stack gap-1 grow">
                            {c.title ? (
                              <span style={{ fontWeight: 650 }}>{c.title}</span>
                            ) : null}
                            {c.prompt ? (
                              <span className="han" style={{ fontSize: "var(--step-1)" }}>{c.prompt}</span>
                            ) : null}
                            {c.pinyin ? (
                              <span className="pinyin" style={{ color: "var(--accent)", fontSize: "var(--step--1)" }}>{c.pinyin}</span>
                            ) : null}
                            {c.vi ? (
                              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>{c.vi}</span>
                            ) : null}
                            {c.focus ? (
                              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>Trọng tâm: {c.focus}</span>
                            ) : null}
                          </span>
                          {c.level !== undefined ? <Chip tone="accent">HSK {c.level}</Chip> : null}
                        </div>
                        <div className="row gap-3 wrap" style={{ marginTop: "var(--sp-3)" }}>
                          <button type="button" className="btn btn--outline btn--sm" disabled title="Chưa hỗ trợ ghi âm">
                            <Mic size={14} /> Ghi âm (chưa có)
                          </button>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            disabled={pending.has(id)}
                            onClick={() => void toggleStudied("speaking", c.id)}
                          >
                            {done ? "Đã học — bấm để bỏ" : "Đánh dấu đã học"}
                          </button>
                        </div>
                      </Panel>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* ---------- PDFs ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>Tài liệu tải về</h2>
                <p className="section-sub">Tệp PDF chưa có nên nút tải tắt — danh sách dưới là những tài liệu sẽ có.</p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {groups.pdfs.map((p) => (
                <div key={p.id} className="rowitem">
                  <span className="rowitem__icon"><FileText size={18} /></span>
                  <span className="grow stack gap-1">
                    <span style={{ fontWeight: 600 }}>{p.title}</span>
                    {p.desc ? (
                      <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>{p.desc}</span>
                    ) : null}
                  </span>
                  {p.tag ? <Chip tone="accent">{p.tag}</Chip> : null}
                  <button type="button" className="btn btn--outline btn--sm" disabled title="Chưa có tệp">
                    <Download size={14} /> Chưa có tệp
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
        title={openRadical?.hanViet ?? ""}
        subtitle={openRadical ? `${openRadical.strokes} nét` : ""}
        footer={
          openRadical ? (
            <button
              type="button"
              className="btn btn--primary btn--block"
              disabled={pending.has(`radicals:${openRadical.no}`)}
              onClick={() => {
                const id = `radicals:${openRadical.no}`;
                const next = !studied.has(id);
                const no = openRadical.no;
                setPending((prev) => new Set(prev).add(id));
                void saveFoundationProgress("radicals", String(no), next)
                  .then((saved) => {
                    setStudied((prev) => {
                      const copy = new Set(prev);
                      if (saved.studied) copy.add(id);
                      else copy.delete(id);
                      return copy;
                    });
                    setProgressKnown(true);
                  })
                  .catch(() => toast("Không lưu được trạng thái học. Giữ nguyên như cũ.", "danger"))
                  .finally(() => {
                    setPending((prev) => {
                      const copy = new Set(prev);
                      copy.delete(id);
                      return copy;
                    });
                    setOpenRadical(null);
                  });
              }}
            >
              {studied.has(`radicals:${openRadical.no}`) ? (
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
            <span className="han" style={{ fontSize: 96, lineHeight: 1 }}>{openRadical.char}</span>
            <span className="pinyin radical__pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step-2)" }}>
              {openRadical.pinyin}
            </span>
            <span className="vi-meaning radical__vi" style={{ color: "var(--text-2)" }}>
              {openRadical.meaning}
            </span>
            <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
              Âm Hán-Việt: {openRadical.hanViet} · {openRadical.strokes} nét
            </span>
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
