"use client";

/**
 * /student/learning-path — the HSK map.
 *
 * Two views over one dataset: a zigzag trail (the default, and the reason the
 * screen exists) and a plain list for scanning. A locked node can be forced
 * open for 100 XP, which is where the store's `unlockNode` guard matters — it
 * refuses rather than letting the balance go negative.
 *
 * MOCK(student): content from `lib/student/learning-path-data.ts`; no API call.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Compass, Crown, List, Lock, Map as MapIcon, Play, Star, Swords, Zap } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  DemoStateSwitcher,
  LevelSelector,
  Segmented,
  type DemoState,
} from "@/components/student/controls";
import { Drawer } from "@/components/student/overlay";
import { useToast } from "@/components/student/toast";
import { FORCE_UNLOCK_COST, useStudentProfile, useStudentStore } from "@/lib/student/store";
import {
  buildLevelMap,
  curricula,
  type Curriculum,
  type PathNode,
} from "@/lib/student/learning-path-data";

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const CURRICULUM_HANZI: Record<Curriculum, string> = {
  hsk_standard_course: "标",
  han_yu_jiao_cheng: "汉",
};

export default function LearningPathPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const profile = useStudentProfile();
  const [curriculum, setCurriculum] = useState<Curriculum>("hsk_standard_course");
  const [level, setLevel] = useState(profile.currentLevel);
  const [view, setView] = useState<"map" | "list">("map");
  const [active, setActive] = useState<PathNode | null>(null);

  const unlockedNodes = useStudentStore((s) => s.unlockedNodes);
  const completedLessons = useStudentStore((s) => s.completedLessons);
  const unlockNode = useStudentStore((s) => s.unlockNode);
  const toast = useToast();

  const map = useMemo(() => buildLevelMap(curriculum, level), [curriculum, level]);

  /** Store overrides win over the fixture — a forced unlock or a finished lesson. */
  const nodes = useMemo(
    () =>
      map.nodes.map((n) => {
        if (completedLessons.includes(n.id)) return { ...n, state: "completed" as const };
        if (n.state === "locked" && unlockedNodes.includes(n.id))
          return { ...n, state: "available" as const };
        return n;
      }),
    [map.nodes, unlockedNodes, completedLessons],
  );

  const done = nodes.filter((n) => n.state === "completed").length;
  const pct = nodes.length ? Math.round((done / nodes.length) * 100) : 0;
  const totalXp = nodes.reduce((sum, node) => sum + node.xp, 0);

  function tryUnlock(node: PathNode) {
    const ok = unlockNode(node.id);
    if (ok) {
      toast(`Đã mở khoá «${node.title}» — trừ ${FORCE_UNLOCK_COST} XP`, "success");
      setActive({ ...node, state: "available" });
    } else {
      toast(`Cần ${FORCE_UNLOCK_COST} XP để mở khoá, bạn chưa đủ`, "danger");
    }
  }

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="eyebrow">Lộ trình học</p>
          <h1 className="pagehead__title">Bản đồ HSK {level}</h1>
          <p className="pagehead__sub">
            Mỗi chương là một chặng đường: bài học nối tiếp nhau, xen kẽ nhiệm vụ phụ, khép lại bằng một Ải Trùm. Hoàn thành ải để mở chặng kế tiếp.
          </p>
        </div>
        <DemoStateSwitcher value={demo} onChange={setDemo} />
      </header>

      {/* ---------- Toolbar ---------- */}
      <Panel className="panel--pad stack gap-5" aria-label="Bộ lọc lộ trình">
          <div className="path-tools">
            <div className="stack gap-2 grow">
            <span className="metric__label">Giáo trình</span>
            <div className="curriculum">
              {curricula.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`curriculum__btn ${curriculum === c.key ? "is-active" : ""}`}
                  aria-pressed={curriculum === c.key}
                  onClick={() => setCurriculum(c.key)}
                >
                  <span className="curriculum__hanzi han" aria-hidden="true">
                    {CURRICULUM_HANZI[c.key]}
                  </span>
                  <span className="stack gap-1 grow" style={{ textAlign: "left", minWidth: 0 }}>
                    <span className="curriculum__name">{c.name}</span>
                    <span className="curriculum__pub truncate">{c.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

            <div className="stack gap-2">
              <span className="metric__label">Hiển thị</span>
              <Segmented
                options={[
                  { value: "map", label: "Bản đồ", icon: <MapIcon size={14} /> },
                  { value: "list", label: "Danh sách", icon: <List size={14} /> },
                ]}
                value={view}
                onChange={setView}
                label="Kiểu hiển thị lộ trình"
              />
            </div>
          </div>

          <div className="stack gap-2">
            <span className="metric__label">Cấp độ HSK</span>
            <LevelSelector
              levels={LEVELS.map((id) => ({
                id,
                done: id < profile.currentLevel,
                locked: id > profile.currentLevel,
              }))}
              value={level}
              onChange={setLevel}
            />
          </div>

          <div className="divider" />

          <div className="row gap-6 wrap">
            <Metric label="Tiến độ chặng" value={`${done}/${nodes.length}`} icon={<Compass size={12} />} />
            <Metric label="XP khả dụng" value={profile.xp.toLocaleString("vi-VN")} color="var(--gold-400)" icon={<Zap size={12} />} />
            <Metric label="XP toàn chặng" value={totalXp.toLocaleString("vi-VN")} />
            <div className="grow stack gap-2" style={{ minWidth: 220 }}>
              <div className="row gap-2">
                <span className="metric__label">{curricula.find((item) => item.key === curriculum)?.name}</span>
                <span className="grow" />
                <span className="num" style={{ fontWeight: 700 }}>{pct}%</span>
              </div>
              <Bar value={pct} tone={pct === 100 ? "success" : "accent"} label={`Tiến độ HSK ${level}`} />
            </div>
          </div>
      </Panel>

      {demo === "loading" ? (
        <SkeletonPanel rows={6} height={240} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không tải được bản đồ lộ trình" onRetry={() => setDemo("ready")} />
        </Panel>
      ) : demo === "empty" || nodes.length === 0 ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Giáo trình này chưa có chặng cho cấp độ đã chọn"
            text="Giáo trình Hán ngữ chỉ có nội dung tới HSK 6. Chọn HSK Standard Course để xem 7–9."
            action={
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setCurriculum("hsk_standard_course")}
              >
                Chuyển sang HSK Standard Course
              </button>
            }
          />
        </Panel>
      ) : view === "map" ? (
        <section aria-labelledby="map-title" className="stack gap-4">
          <SectionHeader
            id="map-title"
            title={`Nhập môn · ${nodes.length} chặng`}
            sub="Chạm vào một node để xem mục tiêu, phần thưởng và hành động."
            action={
              <div className="row gap-2 wrap map-legend" aria-hidden="true">
                <span className="legend"><i className="legend__dot legend__dot--done" />Hoàn thành</span>
                <span className="legend"><i className="legend__dot legend__dot--current" />Đang học</span>
                <span className="legend"><i className="legend__dot legend__dot--open" />Có thể học</span>
                <span className="legend"><i className="legend__dot legend__dot--locked" />Khoá</span>
              </div>
            }
          />
          <div className="trail">
            {nodes.map((n, i) =>
              n.kind === "boss" ? (
                <div key={n.id} className="stack gap-3">
                  <div className="trail__banner">
                    <span className="trail__banner-text">Ải trùm</span>
                  </div>
                  <button
                    type="button"
                    className={`boss ${n.state === "locked" ? "boss--locked" : ""} ${
                      n.state === "completed" ? "boss--completed" : ""
                    }`}
                    onClick={() => setActive(n)}
                  >
                    <span className="boss__glyph han" aria-hidden="true">
                      {n.titleHanzi.slice(0, 1)}
                    </span>
                    <span className="stack gap-1 grow" style={{ textAlign: "left" }}>
                      <span style={{ fontWeight: 700 }}>{n.title}</span>
                      <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                        {n.minutes} phút · <span className="num">{n.xp}</span> XP
                      </span>
                    </span>
                    {n.state === "locked" ? <Lock size={18} /> : <Crown size={18} />}
                  </button>
                </div>
              ) : (
                <div key={n.id} className={`trail__row ${i % 2 === 1 ? "is-right" : ""}`}>
                  <button
                    type="button"
                    className={`node node--${n.state} ${n.kind === "side-quest" ? "node--side" : ""}`}
                    onClick={() => setActive(n)}
                  >
                    <span className="node__medal han" aria-hidden="true">
                      {n.state === "completed" ? (
                        <Check size={20} />
                      ) : n.state === "locked" ? (
                        <Lock size={16} />
                      ) : (
                        n.titleHanzi.slice(0, 1)
                      )}
                    </span>
                    <span className="stack gap-1 grow" style={{ textAlign: "left" }}>
                      <span className="node__title truncate">{n.title}</span>
                      <span className="node__meta">
                        {n.minutes} phút · <span className="num">{n.xp}</span> XP
                        {n.kind === "side-quest" ? " · nhiệm vụ phụ" : ""}
                      </span>
                    </span>
                  </button>
                </div>
              ),
            )}
          </div>
        </section>
      ) : (
        <Panel>
          <div className="panel__head">
            <div>
              <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                Danh sách chặng
              </h2>
              <p className="section-sub">Cùng dữ liệu với bản đồ, trình bày để quét nhanh.</p>
            </div>
          </div>
          <div className="panel__body panel__body--flush">
            {nodes.map((n) => (
              <button key={n.id} type="button" className="rowitem" onClick={() => setActive(n)}>
                <span className="rowitem__icon han" aria-hidden="true">
                  {n.state === "completed" ? (
                    <Check size={16} />
                  ) : n.state === "locked" ? (
                    <Lock size={14} />
                  ) : n.kind === "boss" ? (
                    <Swords size={16} />
                  ) : (
                    n.titleHanzi.slice(0, 1)
                  )}
                </span>
                <span className="grow stack gap-1">
                  <span style={{ fontWeight: 600 }} className="truncate">
                    {n.title}
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                    {n.minutes} phút · <span className="num">{n.xp}</span> XP
                  </span>
                </span>
                {n.state === "current" ? <Chip tone="accent">Đang học</Chip> : null}
                {n.state === "completed" ? <Chip tone="success">Xong</Chip> : null}
                {n.state === "locked" ? <Chip>Khoá</Chip> : null}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* ---------- Node drawer ---------- */}
      <Drawer
        open={active !== null}
        onClose={() => setActive(null)}
        eyebrow={
          active
            ? active.kind === "boss"
              ? "Ải trùm"
              : active.kind === "side-quest"
                ? "Nhiệm vụ phụ"
                : `Bài ${active.lessonNo ?? ""}`
            : ""
        }
        title={active?.title ?? ""}
        subtitle={active ? `${active.minutes} phút · ${active.xp} XP` : ""}
        footer={
          active ? (
            active.state === "locked" ? (
              <button
                type="button"
                className="btn btn--outline btn--block"
                onClick={() => tryUnlock(active)}
              >
                <Lock size={16} /> Mở khoá bằng {FORCE_UNLOCK_COST} XP
              </button>
            ) : (
              <Link
                href={`/student/learning-path/${active.id}`}
                className="btn btn--primary btn--block"
              >
                <Play size={16} />
                {active.state === "completed" ? "Học lại" : "Bắt đầu"}
              </Link>
            )
          ) : null
        }
      >
        {active ? (
          <div className="stack gap-5">
            <div className="row gap-3">
              <span className="node__medal han" aria-hidden="true">
                {active.titleHanzi.slice(0, 1)}
              </span>
              <div className="stack gap-1 grow">
                <span className="han" style={{ fontSize: "var(--step-2)" }}>
                  {active.titleHanzi}
                </span>
                <span style={{ color: "var(--text-3)", fontSize: "var(--step--1)" }}>
                  {active.bookLabel ?? `HSK ${level}`}
                </span>
              </div>
            </div>

            <div className="grid grid--3">
              <Metric label="Từ vựng" value={active.vocabCount ?? "—"} />
              <Metric label="Ngữ pháp" value={active.grammarCount ?? "—"} />
              <Metric label="Bài tập" value={active.exerciseCount ?? "—"} />
            </div>

            {active.state === "locked" ? (
              <div className="notice">
                <Lock size={16} />
                <span>
                  Chặng này còn khoá. Hoàn thành chặng trước, hoặc mở khoá ngay bằng{" "}
                  <strong className="num">{FORCE_UNLOCK_COST}</strong> XP (bạn đang có{" "}
                  <strong className="num">{profile.xp.toLocaleString("vi-VN")}</strong>).
                </span>
              </div>
            ) : null}

            {active.state === "completed" ? (
              <div className="row gap-2">
                <Chip tone="success" icon={<Check size={12} />}>
                  Đã hoàn thành
                </Chip>
                <span className="stars" aria-label="3 trên 3 sao">
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                </span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
