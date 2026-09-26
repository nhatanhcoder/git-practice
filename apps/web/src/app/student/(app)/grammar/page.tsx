"use client";

/**
 * /student/grammar — the grammar library, live (02-foundation-grammar.md §2).
 *
 * Catalog + filters run server-side (GET /student/grammar); the learner's own
 * study/practice state is a separate read (GET /student/grammar/progress) so a
 * progress failure never hides readable content — Partial banner, catalog stays
 * usable (contract state Partial).
 *
 * Honesty rules (module invariants 6/8, ADR-005, D3/D4):
 * - "Đã học" is a self-reported flag the SERVER confirms before the UI changes.
 * - No mastery percentage, no XP, no streak — unknown progress renders "—".
 * - Practice is the reviewed reorder exercise only; grading is server-side and
 *   each submit carries a client-minted submissionId so a lost-response retry
 *   never double-counts (a 409 names the conflict instead of failing silently).
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Dumbbell, RotateCcw, Search, X } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { LevelSelector, Pagination } from "@/components/student/controls";
import { Drawer, Modal } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { ApiError } from "@/lib/api-client";
import {
  fetchGrammarDetail,
  fetchGrammarList,
  fetchGrammarPractice,
  fetchGrammarProgress,
  setGrammarStudied,
  submitGrammarPractice,
  type GrammarCatalogItem,
  type GrammarPracticeStat,
  type GrammarStudiedRow,
} from "@/lib/student/grammar-service";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PAGE_SIZE = 20;

type LoadState = "loading" | "ready" | "error";

function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function GrammarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<GrammarCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [studied, setStudied] = useState<Map<string, GrammarStudiedRow>>(new Map());
  const [practiceStats, setPracticeStats] = useState<Map<string, GrammarPracticeStat>>(new Map());
  const [progressKnown, setProgressKnown] = useState(false);

  const [level, setLevel] = useState<number | "all">(() => {
    const raw = params?.get("hskLevel");
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 9 ? n : "all";
  });
  const [category, setCategory] = useState<string>(() => params?.get("category") ?? "all");
  const [query, setQuery] = useState<string>(() => params?.get("search") ?? "");
  const [assigned, setAssigned] = useState<boolean>(
    () => params?.get("assignedOnly") === "true",
  );
  const [page, setPage] = useState(1);

  const [openId, setOpenId] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<GrammarCatalogItem | null>(null);
  const [openState, setOpenState] = useState<LoadState>("loading");
  const [studiedBusy, setStudiedBusy] = useState(false);
  const [drillOpen, setDrillOpen] = useState(false);
  const [drill, setDrill] = useState<LoadState>("loading");
  const [tokens, setTokens] = useState<string[]>([]);
  const [slot, setSlot] = useState<string[]>([]);
  const [result, setResult] = useState<{ correct: boolean; expected: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>("");

  const toast = useToast();
  // A stale response must never repaint a newer filter (module invariant 10).
  const requestSeq = useRef(0);
  const detailRequestSeq = useRef(0);

  const syncUrl = useCallback(
    (next: { level: number | "all"; category: string; search: string; assigned: boolean }) => {
      const qs = new URLSearchParams();
      if (next.level !== "all") qs.set("hskLevel", String(next.level));
      if (next.category !== "all") qs.set("category", next.category);
      if (next.search.trim() !== "") qs.set("search", next.search.trim());
      if (next.assigned) qs.set("assignedOnly", "true");
      const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
      router.replace(`/student/grammar${suffix}`, { scroll: false });
    },
    [router],
  );

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    setState("loading");
    try {
      const res = await fetchGrammarList({
        hskLevel: level === "all" ? undefined : level,
        category: category === "all" ? undefined : category,
        search: query.trim() || undefined,
        assignedOnly: assigned || undefined,
        page,
        limit: PAGE_SIZE,
      });
      if (seq !== requestSeq.current) return;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setState("ready");
    } catch (err) {
      if (seq !== requestSeq.current) return;
      if (err instanceof ApiError && (err.isUnauthenticated || err.isForbidden)) {
        router.replace(`/login?next=${encodeURIComponent("/student/grammar")}`);
        return;
      }
      setState("error");
    }
  }, [level, category, query, page, assigned, router]);

  const loadProgress = useCallback(async () => {
    try {
      const res = await fetchGrammarProgress();
      // Only server-confirmed studied:true counts — unmarked rows are history.
      setStudied(
        new Map(
          res.studied.filter((r) => r.studied).map((r) => [r.grammarId, r]),
        ),
      );
      setPracticeStats(new Map(res.practice.map((s) => [s.grammarId, s])));
      setProgressKnown(true);
    } catch {
      setProgressKnown(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  // Deep links restore filters; filter changes rewrite the URL.
  useEffect(() => {
    const rawLevel = params?.get("hskLevel");
    const n = rawLevel === null || rawLevel === undefined ? NaN : Number(rawLevel);
    if (Number.isInteger(n) && n >= 1 && n <= 9 && n !== level) setLevel(n);
    const rawCat = params?.get("category") ?? "all";
    if (rawCat !== category) setCategory(rawCat);
    const rawSearch = params?.get("search") ?? "";
    if (rawSearch !== query) setQuery(rawSearch);
    const rawAssigned = params?.get("assignedOnly") === "true";
    if (rawAssigned !== assigned) setAssigned(rawAssigned);
    const rawPoint = params?.get("point");
    if (rawPoint && rawPoint !== openId) void openDetail(rawPoint);
    if (!rawPoint && openId !== null && !drillOpen) {
      detailRequestSeq.current += 1;
      setOpenId(null);
      setOpenItem(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function changeFilters(next: { level: number | "all"; category: string; search: string; assigned?: boolean }) {
    const nextAssigned = next.assigned ?? assigned;
    setLevel(next.level);
    setCategory(next.category);
    setQuery(next.search);
    setAssigned(nextAssigned);
    setPage(1);
    syncUrl({ level: next.level, category: next.category, search: next.search, assigned: nextAssigned });
  }

  function resetFilters() {
    changeFilters({ level: "all", category: "all", search: "", assigned: false });
  }

  // Categories come from the loaded catalog page — plus the active selection
  // when a filter narrows the list past it (so the active pill never vanishes).
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const it of items) seen.add(it.category);
    if (category !== "all") seen.add(category);
    return Array.from(seen).sort((a, b) => a.localeCompare(b, "vi"));
  }, [items, category]);

  async function openDetail(id: string) {
    const seq = ++detailRequestSeq.current;
    setOpenId(id);
    setOpenItem(null);
    setOpenState("loading");
    try {
      const item = await fetchGrammarDetail(id);
      if (seq !== detailRequestSeq.current) return;
      setOpenItem(item);
      setOpenState("ready");
    } catch {
      if (seq !== detailRequestSeq.current) return;
      setOpenState("error");
    }
  }

  function syncPoint(point: string | null) {
    const qs = new URLSearchParams();
    if (level !== "all") qs.set("hskLevel", String(level));
    if (category !== "all") qs.set("category", category);
    if (query.trim() !== "") qs.set("search", query.trim());
    if (assigned) qs.set("assignedOnly", "true");
    if (point) qs.set("point", point);
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    const href = `/student/grammar${suffix}`;
    if (point) {
      router.push(href, { scroll: false });
    } else {
      router.replace(href, { scroll: false });
    }
  }

  function closeDetail() {
    detailRequestSeq.current += 1;
    syncPoint(null);
    setOpenId(null);
    setOpenItem(null);
  }

  async function toggleStudied(id: string, next: boolean) {
    setStudiedBusy(true);
    try {
      const saved = await setGrammarStudied(id, next);
      setStudied((prev) => {
        const copy = new Map(prev);
        if (saved.studied) {
          copy.set(id, {
            grammarId: id,
            studied: true,
            updatedAt: saved.updatedAt,
          });
        } else {
          copy.delete(id);
        }
        return copy;
      });
      setProgressKnown(true);
      toast(next ? "Đã đánh dấu đã học" : "Đã bỏ đánh dấu", "success");
    } catch {
      toast("Không lưu được — thử lại", "danger");
    } finally {
      setStudiedBusy(false);
    }
  }

  async function openDrill(item: GrammarCatalogItem) {
    setDrillOpen(true);
    setDrill("loading");
    setSlot([]);
    setResult(null);
    setSubmissionId(newSubmissionId());
    try {
      const practice = await fetchGrammarPractice(item.id);
      setTokens(practice.tokens);
      setDrill("ready");
    } catch {
      setDrill("error");
    }
  }

  async function submitDrill(item: GrammarCatalogItem) {
    setSubmitting(true);
    try {
      const { result: res } = await submitGrammarPractice(item.id, slot, submissionId);
      setResult({ correct: res.correct, expected: res.expected });
      // Counts come back server-derived with every submit — adopt them.
      setPracticeStats((prev) => {
        const copy = new Map(prev);
        copy.set(item.id, {
          grammarId: item.id,
          attempts: res.attemptCount,
          correct: res.correctCount,
        });
        return copy;
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "GRAMMAR_PRACTICE_CONFLICT") {
        toast("Lượt nộp này đã dùng cho câu khác — hãy luyện lại lượt mới", "danger");
        setDrillOpen(false);
      } else {
        // Failed submit keeps the answer on screen — no success repaint.
        toast("Không nộp được — câu trả lời vẫn còn, thử lại", "danger");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filtersActive = level !== "all" || category !== "all" || query.trim() !== "" || assigned;

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="eyebrow">Thư viện</p>
          <h1 className="pagehead__title">Ngữ pháp HSK 1 – 9</h1>
          <p className="pagehead__sub">
            {state === "ready"
              ? `${total} điểm ngữ pháp — công thức, ví dụ chữ Hán, phiên âm, dịch nghĩa và bài luyện xếp từ.`
              : "Đang tải thư viện…"}
          </p>
        </div>
      </header>

      {state === "loading" ? (
        <SkeletonPanel rows={5} height={220} />
      ) : state === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => void load()} />
        </Panel>
      ) : (
        <>
          {/* ---------- Study summary — confirmed counts only, no mastery % ---------- */}
          <Panel className="panel--pad" aria-label="Tổng quan học tập">
            <div className="row gap-6 wrap">
              <div className="stack gap-1">
                <span className="metric__label">Đã đánh dấu đã học</span>
                <span className="num" style={{ fontSize: "var(--step-3)", fontWeight: 700 }}>
                  {progressKnown ? studied.size : "—"}
                </span>
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                  trên {total} điểm ngữ pháp
                </span>
              </div>
              {!progressKnown ? (
                <div className="grow stack gap-2">
                  <Chip tone="warn">Không tải được tiến độ của bạn — thư viện vẫn xem được</Chip>
                </div>
              ) : null}
              <p className="grow" style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                “Đã học” là tự đánh dấu của bạn — không phải kết quả kiểm tra. Bài luyện do máy chủ chấm.
              </p>
            </div>
          </Panel>

          {/* ---------- Filters ---------- */}
          <Panel className="panel--pad stack gap-5" aria-label="Bộ lọc ngữ pháp">
            <div className="row gap-4 wrap">
              <label className="field grow" style={{ minWidth: 240, maxWidth: 420 }}>
                <Search size={16} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    const next = e.target.value;
                    setQuery(next);
                    setPage(1);
                    syncUrl({ level, category, search: next, assigned });
                  }}
                  placeholder="Tìm theo tên, công thức, chữ Hán hoặc pinyin…"
                  aria-label="Tìm điểm ngữ pháp"
                />
                {query ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon btn--sm"
                    onClick={() => changeFilters({ level, category, search: "" })}
                    aria-label="Xoá từ khoá"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </label>
              <span className="grow" />
              <Chip>{total} kết quả</Chip>
              {filtersActive ? (
                <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
                  <RotateCcw size={14} /> Xoá bộ lọc
                </button>
              ) : null}
            </div>

            <div className="stack gap-2">
              <span className="metric__label">Cấp độ</span>
              <div className="row gap-3 wrap">
                <button
                  type="button"
                  className={`pill ${level === "all" ? "is-active" : ""}`}
                  aria-pressed={level === "all"}
                  onClick={() => changeFilters({ level: "all", category, search: query })}
                >
                  Tất cả
                </button>
                <LevelSelector
                  levels={LEVELS.map((id) => ({ id }))}
                  value={typeof level === "number" ? level : -1}
                  onChange={(id) => changeFilters({ level: id, category, search: query })}
                />
              </div>
            </div>

            <div className="stack gap-2">
              <span className="metric__label">Nhóm ngữ pháp</span>
              <div className="row gap-2 wrap">
                <button
                  type="button"
                  className={`pill ${category === "all" ? "is-active" : ""}`}
                  aria-pressed={category === "all"}
                  onClick={() => changeFilters({ level, category: "all", search: query })}
                >
                  Tất cả nhóm
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pill ${category === c ? "is-active" : ""}`}
                    aria-pressed={category === c}
                    onClick={() => changeFilters({ level, category: c, search: query })}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="stack gap-2">
              <span className="metric__label">Nguồn</span>
              <div className="row gap-2 wrap">
                <button
                  type="button"
                  className={`pill ${!assigned ? "is-active" : ""}`}
                  aria-pressed={!assigned}
                  onClick={() => changeFilters({ level, category, search: query, assigned: false })}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`pill ${assigned ? "is-active" : ""}`}
                  aria-pressed={assigned}
                  onClick={() => changeFilters({ level, category, search: query, assigned: true })}
                >
                  Giáo viên giao
                </button>
              </div>
            </div>
          </Panel>

          {/* ---------- Results ---------- */}
          <section>
            <SectionHeader title="Điểm ngữ pháp" sub={`${total} kết quả · trang ${page}/${Math.max(totalPages, 1)}`} />
            {items.length === 0 ? (
              <Panel className="panel--pad">
                {assigned ? (
                  <EmptyState
                    title="Chưa có điểm ngữ pháp được giao"
                    text="Giáo viên của các lớp bạn đang học chưa gắn điểm ngữ pháp nào."
                    action={
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => changeFilters({ level, category, search: query, assigned: false })}
                      >
                        Xem tất cả điểm ngữ pháp
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    title="Không có điểm nào khớp"
                    text="Thử bỏ bớt bộ lọc hoặc tìm bằng từ khoá khác."
                    action={
                      <button type="button" className="btn btn--outline" onClick={resetFilters}>
                        Xoá bộ lọc
                      </button>
                    }
                  />
                )}
              </Panel>
            ) : (
              <>
                <div className="cards">
                  {items.map((p) => {
                    const isStudied = studied.has(p.id);
                    const stats = practiceStats.get(p.id);
                    return (
                      <button key={p.id} type="button" className="gcard" onClick={() => syncPoint(p.id)}>
                        <div className="row gap-2 wrap">
                          <Chip tone="accent">HSK {p.level}</Chip>
                          <Chip>{p.category}</Chip>
                          {isStudied ? (
                            <Chip tone="success">
                              <Check size={12} /> Đã học
                            </Chip>
                          ) : null}
                        </div>
                        <span className="gcard__name">{p.name}</span>
                        <span className="gcard__formula">{p.formula}</span>
                        <div className="stack gap-1">
                          <span className="gcard__hanzi han">{p.hanzi}</span>
                          <span className="gcard__pinyin pinyin">{p.pinyin}</span>
                          <span className="gcard__vi vi-meaning">{p.vi}</span>
                        </div>
                        {stats && stats.attempts > 0 ? (
                          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                            Đã luyện {stats.attempts} lần · đúng {stats.correct}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>Chưa luyện</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <Pagination
                  page={page}
                  totalItems={total}
                  pageSize={PAGE_SIZE}
                  onPageChange={(next) => {
                    setPage(next);
                    syncUrl({ level, category, search: query, assigned });
                  }}
                  unit="điểm ngữ pháp"
                />
              </>
            )}
          </section>
        </>
      )}

      {/* ---------- Detail drawer (server-fetched, not the card copy) ---------- */}
      <Drawer
        open={openId !== null && !drillOpen}
        onClose={closeDetail}
        eyebrow={openItem ? `HSK ${openItem.level} · ${openItem.category}` : ""}
        title={openItem?.name ?? ""}
        subtitle={openItem?.formula}
        footer={
          openItem ? (
            <div className="stack gap-2">
              <button type="button" className="btn btn--primary btn--block" onClick={() => void openDrill(openItem)}>
                <Dumbbell size={16} /> Luyện xếp từ
              </button>
              <button
                type="button"
                className={`btn btn--block ${studied.has(openItem.id) ? "btn--outline" : "btn--ghost"}`}
                disabled={studiedBusy}
                onClick={() => void toggleStudied(openItem.id, !studied.has(openItem.id))}
              >
                <BookOpen size={16} />
                {studied.has(openItem.id) ? "Bỏ đánh dấu đã học" : "Đánh dấu đã học"}
              </button>
            </div>
          ) : null
        }
      >
        {openState === "loading" ? (
          <SkeletonPanel rows={3} height={120} />
        ) : openState === "error" || !openItem ? (
          <ErrorState onRetry={() => openId && void openDetail(openId)} />
        ) : (
          <div className="stack gap-5">
            <div className="stack gap-2">
              <span className="eyebrow">Công thức</span>
              <span className="gcard__formula" style={{ alignSelf: "flex-start" }}>{openItem.formula}</span>
            </div>
            <div className="stack gap-2">
              <span className="eyebrow">Giải thích</span>
              <p style={{ color: "var(--text-2)" }}>{openItem.note}</p>
            </div>
            <div className="stack gap-3">
              <span className="eyebrow">Ví dụ</span>
              <div className="drawer-hanzi stack gap-1">
                <span className="han" style={{ fontSize: "var(--step-2)" }}>{openItem.hanzi}</span>
                <span className="pinyin drawer-hanzi__pinyin" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "var(--step--1)" }}>
                  {openItem.pinyin}
                </span>
                <span className="vi-meaning drawer-hanzi__vi" style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                  {openItem.vi}
                </span>
              </div>
            </div>
            {(() => {
              const stats = practiceStats.get(openItem.id);
              return stats && stats.attempts > 0 ? (
                <div className="stack gap-2">
                  <span className="eyebrow">Luyện tập</span>
                  <span style={{ color: "var(--text-2)", fontSize: "var(--step--1)" }}>
                    Đã luyện {stats.attempts} lần · đúng {stats.correct} lần (máy chủ chấm)
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        )}
      </Drawer>

      {/* ---------- Reorder practice modal ---------- */}
      <Modal
        open={drillOpen}
        onClose={() => setDrillOpen(false)}
        title={`Luyện: ${openItem?.name ?? ""}`}
        subtitle="Xếp các khối chữ thành câu đúng"
      >
        {drill === "loading" ? (
          <SkeletonPanel rows={3} height={120} />
        ) : drill === "error" ? (
          <ErrorState onRetry={() => openItem && void openDrill(openItem)} />
        ) : openItem ? (
          <div className="stack gap-4">
            <p className="ex-prompt">Sắp xếp thành câu đúng: «{openItem.vi}»</p>
            <div className="ex-slot" aria-label="Câu của bạn">
              {slot.length === 0 ? (
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>Bấm các khối bên dưới để xếp câu</span>
              ) : (
                slot.map((t, i) => (
                  <button
                    key={`${t}-${i}`}
                    type="button"
                    className="token"
                    disabled={result !== null}
                    onClick={() => setSlot((s) => s.filter((_, idx) => idx !== i))}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>
            <div className="ex-bank">
              {tokens.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  type="button"
                  className="token"
                  disabled={
                    result !== null ||
                    slot.filter((x) => x === t).length >= tokens.filter((x) => x === t).length
                  }
                  onClick={() => setSlot((s) => [...s, t])}
                >
                  {t}
                </button>
              ))}
            </div>
            {result === null ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={slot.length === 0 || submitting}
                onClick={() => openItem && void submitDrill(openItem)}
              >
                {submitting ? "Đang nộp…" : "Kiểm tra"}
              </button>
            ) : (
              <div className={`ex-feedback ${result.correct ? "is-right" : "is-wrong"}`}>
                <p style={{ fontWeight: 700 }}>{result.correct ? "Chính xác" : "Chưa đúng"}</p>
                <p className="han">{result.expected.join("")}</p>
                <div className="row gap-2 wrap" style={{ marginTop: 8 }}>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => openItem && void openDrill(openItem)}>
                    Luyện lại
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setDrillOpen(false);
                      closeDetail();
                    }}
                  >
                    Xong
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default function GrammarPage() {
  return (
    <Suspense fallback={<SkeletonPanel rows={5} height={200} />}>
      <GrammarInner />
    </Suspense>
  );
}
