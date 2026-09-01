"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Crown,
  LayoutGrid,
  List,
  Lock,
  Play,
  Sparkles,
  Swords,
  Timer,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
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
  type DemoState,
} from "@/components/student/ui";
import {
  buildLevelMap,
  curricula,
  demoPosition,
  type Curriculum,
  type PathNode,
} from "@/lib/student/learning-path-data";
import { useStudentProgress } from "@/lib/student/store";

const hskLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function PageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [demoState, setDemoState] = useState<DemoState>("ready");
  const [view, setView] = useState<"map" | "list">("map");
  const [openNode, setOpenNode] = useState<PathNode | null>(null);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const xp = useStudentProgress((s) => s.xp);
  const spend = useStudentProgress((s) => s.spend);

  const curriculum: Curriculum =
    params.get("curriculum") === "han_yu_jiao_cheng" ? "han_yu_jiao_cheng" : "hsk_standard_course";
  const levelParam = Number(params.get("level"));
  const level = hskLevels.includes(levelParam) ? levelParam : demoPosition.currentLevel;

  const levelMap = useMemo(() => buildLevelMap(curriculum, level), [curriculum, level]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    router.replace(`/student/learning-path?${next.toString()}`, { scroll: false });
  };

  const nodeState = (n: PathNode): PathNode["state"] =>
    unlocked.has(n.id) && n.state === "locked" ? "available" : n.state;

  const forceUnlock = (n: PathNode) => {
    const ok = spend(100, `Đã mở khoá «${n.title}»`);
    if (ok) {
      setUnlocked((prev) => new Set(prev).add(n.id));
      setToast(`Đã mở khoá «${n.title}» — trừ 100 XP`);
      setOpenNode(null);
    } else {
      setToast("Không đủ 100 XP để mở khoá — hãy học thêm bài để kiếm XP!");
    }
    setTimeout(() => setToast(null), 3200);
  };

  const isEmptyCurriculum = levelMap.nodes.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
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
            <h1 className="sp-font-head text-2xl font-black text-sp-ink sm:text-3xl">
              Lộ trình học
            </h1>
            <p className="text-sm text-sp-ink2">
              {curricula.find((c) => c.key === curriculum)?.name}
            </p>
          </div>
        </div>
        <DemoStateSwitcher state={demoState} onChange={setDemoState} />
      </div>

      {/* Controls */}
      <Card className="mb-6 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Curriculum switcher */}
          <div
            className="flex rounded-2xl bg-sp-locked-soft p-1"
            role="tablist"
            aria-label="Chọn giáo trình"
          >
            {curricula.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={curriculum === c.key}
                onClick={() => setParam("curriculum", c.key)}
                className={`sp-font-head rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
                  curriculum === c.key
                    ? "bg-sp-card text-sp-ink shadow-sp-sm"
                    : "text-sp-ink2 hover:text-sp-ink"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Chip tone="xp">
              <Zap size={13} aria-hidden="true" /> {xp.toLocaleString("vi-VN")} XP
            </Chip>
            {/* Map/List toggle */}
            <div
              className="flex rounded-2xl border border-sp-line p-1"
              role="group"
              aria-label="Kiểu hiển thị"
            >
              <button
                type="button"
                onClick={() => setView("map")}
                aria-pressed={view === "map"}
                aria-label="Xem dạng bản đồ"
                className={`flex h-9 w-10 items-center justify-center rounded-xl transition-colors ${
                  view === "map" ? "bg-sp-primary text-white" : "text-sp-ink2 hover:text-sp-primary"
                }`}
              >
                <LayoutGrid size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-pressed={view === "list"}
                aria-label="Xem dạng danh sách"
                className={`flex h-9 w-10 items-center justify-center rounded-xl transition-colors ${
                  view === "list" ? "bg-sp-primary text-white" : "text-sp-ink2 hover:text-sp-primary"
                }`}
              >
                <List size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* HSK level selector */}
        <div className="sp-scroll mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Chọn cấp HSK">
          {hskLevels.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setParam("level", String(l))}
              aria-pressed={level === l}
              className={`sp-font-head sp-press h-10 w-12 shrink-0 rounded-xl text-sm font-black transition-colors ${
                level === l
                  ? "bg-sp-primary text-white shadow-sp-sm"
                  : "border border-sp-line bg-sp-card text-sp-ink2 hover:border-sp-primary-line hover:text-sp-primary"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </Card>

      {/* Level summary */}
      {!isEmptyCurriculum ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="sp-font-head text-lg font-black text-sp-ink">HSK {level}</h2>
              {levelMap.levelState === "completed" ? (
                <Chip tone="ok">Hoàn thành</Chip>
              ) : levelMap.levelState === "current" ? (
                <Chip tone="primary">Đang học</Chip>
              ) : (
                <Chip tone="locked">Chưa mở</Chip>
              )}
            </div>
            <p className="mt-1 text-sm text-sp-ink2">
              {levelMap.lessonsCompleted}/{levelMap.lessonsTotal} bài ·{" "}
              {levelMap.xpInLevel}/{levelMap.xpTotalInLevel} XP của cấp
            </p>
          </div>
          <div className="sm:w-64">
            <ProgressBar
              value={(levelMap.lessonsCompleted / levelMap.lessonsTotal) * 100}
              tone={levelMap.levelState === "completed" ? "ok" : "primary"}
              label={`Tiến độ HSK ${level}`}
            />
          </div>
        </Card>
      ) : null}

      {/* Content */}
      {demoState === "loading" ? (
        <LoadingState rows={6} />
      ) : demoState === "error" ? (
        <ErrorState onRetry={() => setDemoState("ready")} />
      ) : demoState === "empty" || isEmptyCurriculum ? (
        <EmptyState
          icon={Sparkles}
          title={
            isEmptyCurriculum
              ? "Giáo trình Hán ngữ hiện hỗ trợ tới HSK 6"
              : "Chưa có bài học nào cho lựa chọn này"
          }
          desc={
            isEmptyCurriculum
              ? "Lộ trình HSK 7–9 chỉ có trong HSK Standard Course. Chuyển giáo trình để tiếp tục?"
              : "Thử chọn cấp HSK khác hoặc đổi giáo trình."
          }
          action={
            isEmptyCurriculum ? (
              <PrimaryButton onClick={() => setParam("curriculum", "hsk_standard_course")}>
                Chuyển sang HSK Standard Course
              </PrimaryButton>
            ) : (
              <GhostButton onClick={() => setParam("level", String(demoPosition.currentLevel))}>
                Về HSK {demoPosition.currentLevel}
              </GhostButton>
            )
          }
        />
      ) : view === "map" ? (
        <MapView levelMap={levelMap} nodeState={nodeState} onOpen={setOpenNode} />
      ) : (
        <ListView levelMap={levelMap} nodeState={nodeState} onOpen={setOpenNode} />
      )}

      {/* Node drawer */}
      {openNode ? (
        <NodeDrawer
          node={openNode}
          state={nodeState(openNode)}
          xp={xp}
          onClose={() => setOpenNode(null)}
          onForceUnlock={() => forceUnlock(openNode)}
        />
      ) : null}

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          className="sp-font-head fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-sp-ink px-5 py-3 text-sm font-bold text-white shadow-sp lg:bottom-8"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Node visuals ---------- */

const kindIcons: Record<PathNode["kind"], LucideIcon> = {
  lesson: Circle,
  "side-quest": Zap,
  boss: Crown,
};

function NodeMarker({
  node,
  state,
  onOpen,
}: {
  node: PathNode;
  state: PathNode["state"];
  onOpen: () => void;
}) {
  const Icon = kindIcons[node.kind];
  const isBoss = node.kind === "boss";
  const size = isBoss ? "h-16 w-16" : node.kind === "side-quest" ? "h-12 w-12" : "h-14 w-14";

  const styles: Record<PathNode["state"], string> = {
    completed: "bg-sp-ok text-white border-sp-ok",
    current: "bg-sp-primary text-white border-sp-primary",
    available: "bg-sp-card text-sp-primary border-sp-primary",
    locked: "bg-sp-locked-soft text-sp-locked border-sp-line",
  };
  const diamond = node.kind === "side-quest" ? "rotate-45" : "";
  const diamondFix = node.kind === "side-quest" ? "-rotate-45" : "";

  return (
    <span className="relative inline-flex shrink-0">
      {state === "current" ? (
        <span
          className={`sp-ping absolute inset-0 rounded-full bg-sp-primary/40 ${diamond}`}
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${node.title} — ${
          state === "completed"
            ? "đã hoàn thành"
            : state === "current"
              ? "đang học"
              : state === "available"
                ? "sẵn sàng"
                : "chưa mở"
        }`}
        className={`sp-press z-10 flex items-center justify-center rounded-full border-2 shadow-sp-sm ${size} ${styles[state]} ${diamond}`}
      >
        <span className={diamondFix} aria-hidden="true">
          {state === "completed" ? (
            <CheckCircle2 size={isBoss ? 28 : 22} />
          ) : state === "locked" ? (
            <Lock size={node.kind === "side-quest" ? 16 : 20} />
          ) : node.kind === "lesson" && state === "current" ? (
            <Play size={22} />
          ) : (
            <Icon size={isBoss ? 28 : node.kind === "side-quest" ? 16 : 22} />
          )}
        </span>
      </button>
    </span>
  );
}

function nodeTone(state: PathNode["state"]) {
  switch (state) {
    case "completed":
      return { chip: "ok" as const, label: "Hoàn thành" };
    case "current":
      return { chip: "primary" as const, label: "Đang học" };
    case "available":
      return { chip: "accent" as const, label: "Sẵn sàng" };
    default:
      return { chip: "locked" as const, label: "Chưa mở" };
  }
}

function NodeCard({
  node,
  state,
  onOpen,
}: {
  node: PathNode;
  state: PathNode["state"];
  onOpen: () => void;
}) {
  const tone = nodeTone(state);
  const isBoss = node.kind === "boss";
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`sp-press w-full rounded-2xl border p-4 text-left shadow-sp-sm ${
        isBoss
          ? "border-sp-boss/40 bg-gradient-to-br from-sp-boss-soft to-sp-card"
          : "border-sp-line bg-sp-card"
      } ${state === "locked" ? "opacity-70" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <Chip tone={isBoss ? "boss" : tone.chip} size="sm">
          {isBoss ? "Trùm cuối" : node.kind === "side-quest" ? "Nhiệm vụ phụ" : tone.label}
        </Chip>
        <Chip tone="xp" size="sm">
          <Zap size={11} aria-hidden="true" /> {node.xp} XP
        </Chip>
      </div>
      <p
        className={`sp-font-head mt-2 text-sm font-extrabold leading-snug text-sp-ink ${
          state === "locked" ? "text-sp-ink3" : ""
        }`}
      >
        {node.title}
      </p>
      <p className="mt-0.5 text-xs text-sp-ink2">
        {node.titleHanzi} · <Timer size={11} className="inline" aria-hidden="true" />{" "}
        {node.minutes} phút
        {node.vocabCount ? ` · ${node.vocabCount} từ` : ""}
      </p>
    </button>
  );
}

/* ---------- Map view ---------- */

function MapView({
  levelMap,
  nodeState,
  onOpen,
}: {
  levelMap: ReturnType<typeof buildLevelMap>;
  nodeState: (n: PathNode) => PathNode["state"];
  onOpen: (n: PathNode) => void;
}) {
  return (
    <div className="relative">
      {/* Center line (desktop) / left line (mobile) */}
      <div
        aria-hidden="true"
        className="absolute bottom-8 left-[27px] top-8 w-0.5 border-l-2 border-dashed border-sp-primary-line sm:left-1/2 sm:-translate-x-1/2 lg:left-1/2"
      />
      <ol className="space-y-8">
        {levelMap.nodes.map((node) => {
          const state = nodeState(node);
          const idx = node.order;
          return (
            <li
              key={node.id}
              className={`relative flex items-center gap-4 sm:gap-6 ${
                idx % 2 === 0
                  ? "sm:flex-row"
                  : "sm:flex-row-reverse"
              }`}
            >
              <div className="z-10 sm:hidden">
                <NodeMarker node={node} state={state} onOpen={() => onOpen(node)} />
              </div>
              <div className={`hidden flex-1 sm:block ${idx % 2 === 0 ? "text-right" : ""}`}>
                {idx % 2 === 0 ? (
                  <div className="ml-auto max-w-xs">
                    <NodeCard node={node} state={state} onOpen={() => onOpen(node)} />
                  </div>
                ) : null}
              </div>
              <div className="hidden sm:block">
                <NodeMarker node={node} state={state} onOpen={() => onOpen(node)} />
              </div>
              <div className={`min-w-0 flex-1`}>
                <div className="max-w-xs sm:hidden">
                  <NodeCard node={node} state={state} onOpen={() => onOpen(node)} />
                </div>
                {idx % 2 !== 0 ? (
                  <div className="hidden max-w-xs sm:block">
                    <NodeCard node={node} state={state} onOpen={() => onOpen(node)} />
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------- List view ---------- */

function ListView({
  levelMap,
  nodeState,
  onOpen,
}: {
  levelMap: ReturnType<typeof buildLevelMap>;
  nodeState: (n: PathNode) => PathNode["state"];
  onOpen: (n: PathNode) => void;
}) {
  return (
    <Card className="divide-y divide-sp-line overflow-hidden">
      {levelMap.nodes.map((node) => {
        const state = nodeState(node);
        const tone = nodeTone(state);
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onOpen(node)}
            className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-sp-primary-soft/40"
          >
            <NodeMarker node={node} state={state} onOpen={() => onOpen(node)} />
            <span className="min-w-0 flex-1">
              <span className="sp-font-head block truncate text-sm font-extrabold text-sp-ink">
                {node.title}
              </span>
              <span className="mt-0.5 block text-xs text-sp-ink2">
                {node.titleHanzi} · {node.minutes} phút
                {node.vocabCount ? ` · ${node.vocabCount} từ` : ""}
              </span>
            </span>
            <span className="hidden shrink-0 sm:block">
              <Chip tone={node.kind === "boss" ? "boss" : tone.chip} size="sm">
                {node.kind === "boss" ? "Trùm cuối" : tone.label}
              </Chip>
            </span>
            <Chip tone="xp" size="sm">
              <Zap size={11} aria-hidden="true" /> {node.xp}
            </Chip>
          </button>
        );
      })}
    </Card>
  );
}

/* ---------- Node drawer ---------- */

function NodeDrawer({
  node,
  state,
  xp,
  onClose,
  onForceUnlock,
}: {
  node: PathNode;
  state: PathNode["state"];
  xp: number;
  onClose: () => void;
  onForceUnlock: () => void;
}) {
  const kindLabel =
    node.kind === "boss" ? "Trùm cuối cấp" : node.kind === "side-quest" ? "Nhiệm vụ phụ" : "Bài học";
  const isBoss = node.kind === "boss";
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={node.title}>
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-sp-ink/35 backdrop-blur-[2px]"
      />
      <div className="absolute inset-y-0 right-0 flex w-full flex-col bg-sp-card shadow-sp sm:w-[440px]">
        <div
          className={`flex items-center justify-between border-b border-sp-line px-5 py-4 ${
            isBoss ? "bg-sp-boss-soft" : ""
          }`}
        >
          <h2 className="sp-font-head text-base font-extrabold text-sp-ink">{kindLabel}</h2>
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
          <div className="flex items-start gap-3">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isBoss ? "bg-sp-boss text-white" : "bg-sp-primary-soft text-sp-primary"
              }`}
            >
              {isBoss ? (
                <Swords size={22} aria-hidden="true" />
              ) : node.kind === "side-quest" ? (
                <Zap size={20} aria-hidden="true" />
              ) : (
                <Play size={20} aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <h3 className="sp-font-head text-lg font-black leading-tight text-sp-ink">
                {node.title}
              </h3>
              <p className="text-sm text-sp-ink2">{node.titleHanzi}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip tone="xp">
              <Zap size={12} aria-hidden="true" /> Thưởng {node.xp} XP
            </Chip>
            <Chip>
              <Timer size={12} aria-hidden="true" /> {node.minutes} phút
            </Chip>
            <Chip>{nodeTone(state).label}</Chip>
          </div>

          <div className="mt-5 rounded-2xl border border-sp-line bg-sp-bg p-4">
            <p className="sp-font-head text-sm font-extrabold text-sp-ink">Nội dung</p>
            <ul className="mt-2 space-y-1.5 text-sm text-sp-ink2">
              {node.vocabCount ? <li>· {node.vocabCount} từ vựng mới</li> : null}
              {node.grammarCount ? <li>· {node.grammarCount} điểm ngữ pháp</li> : null}
              <li>· {node.exerciseCount} bài luyện tập</li>
              {isBoss ? <li>· Đề tổng hợp toàn cấp — cần ≥ 70% để mở cấp tiếp theo</li> : null}
              {node.bookLabel ? <li>· {node.bookLabel}</li> : null}
            </ul>
          </div>

          <div className="mt-5">
            {state === "locked" ? (
              <div>
                <PrimaryButton icon={Lock} full onClick={onForceUnlock} disabled={xp < 100}>
                  Mở khoá · 100 XP
                </PrimaryButton>
                <p className="mt-2 text-center text-xs text-sp-ink2">
                  {xp >= 100
                    ? "Đây là tính năng demo: mở khoá trước bằng XP (hiện có " +
                      xp.toLocaleString("vi-VN") +
                      " XP)."
                    : `Không đủ XP (hiện có ${xp.toLocaleString("vi-VN")}). Học thêm để kiếm XP!`}
                </p>
              </div>
            ) : state === "current" ? (
              <PrimaryButton icon={Play} full>
                Học tiếp bài này
              </PrimaryButton>
            ) : state === "available" ? (
              <PrimaryButton icon={Play} full>
                Bắt đầu
              </PrimaryButton>
            ) : (
              <GhostButton full>Ôn lại bài này</GhostButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LearningPathPage() {
  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <PageInner />
    </Suspense>
  );
}
