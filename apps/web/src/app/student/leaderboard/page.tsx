"use client";

/**
 * /student/leaderboard — where you stand.
 *
 * Three periods over one set of rivals; the learner is inserted at their real
 * XP rather than pinned to a flattering position.
 *
 * MOCK(student): the rivals are simulated (`content.rivals`) and their XP comes
 * from a deterministic formula — see `getLeaderboard`. Nobody else is real.
 */

import { useMemo, useState } from "react";
import { Crown, Medal, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  Chip,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, Segmented, type DemoState } from "@/components/student/controls";
import { useStudentProfile } from "@/lib/student/store";
import { rivals } from "@/lib/student/content";
import { getLeaderboard } from "@/lib/student/student-rules";
import type { LeaderScope } from "@/lib/student/types";

const SCOPE_LABEL: Record<LeaderScope, string> = {
  week: "Tuần này",
  month: "Tháng này",
  all: "Mọi thời điểm",
};

export default function LeaderboardPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [scope, setScope] = useState<LeaderScope>("week");
  const profile = useStudentProfile();

  const rows = useMemo(
    () =>
      getLeaderboard(
        rivals,
        {
          id: profile.id,
          name: profile.name,
          initials: profile.initials,
          currentLevel: profile.currentLevel,
          xp: profile.xp,
        },
        scope,
      ),
    [profile, scope],
  );

  const you = rows.find((r) => r.isYou);
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <>
      <PageHead
        title={
          <>
            Bảng <em>xếp hạng</em>
          </>
        }
        sub="So với 20 học viên khác. Thứ hạng tính theo XP tích luỹ trong kỳ."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      <Panel className="panel--pad">
        <div className="row gap-4 wrap">
          <Segmented
            options={(Object.keys(SCOPE_LABEL) as LeaderScope[]).map((k) => ({
              value: k,
              label: SCOPE_LABEL[k],
            }))}
            value={scope}
            onChange={setScope}
            label="Kỳ xếp hạng"
          />
          <div className="grow" />
          {you ? (
            <Chip tone="accent">
              Hạng của bạn: <span className="num">#{you.rank}</span>
            </Chip>
          ) : null}
        </div>
      </Panel>

      {demo === "loading" ? (
        <SkeletonPanel rows={6} height={180} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          {/* ---------- Podium ---------- */}
          <Panel className="panel--pad">
            <SectionHeader title="Bục vinh danh" sub={SCOPE_LABEL[scope]} />
            <div className="podium">
              {[podium[1], podium[0], podium[2]].filter(Boolean).map((r) => (
                <div
                  key={r.id}
                  className={`podium__slot podium__slot--${r.rank}`}
                  style={r.rank === 1 ? { paddingTop: "var(--sp-6)" } : undefined}
                >
                  {r.rank === 1 ? <Crown size={20} style={{ color: "var(--gold-400)" }} /> : null}
                  <span className="avatar avatar--lg han">{r.initials}</span>
                  <span className="podium__rank num">#{r.rank}</span>
                  <span style={{ fontWeight: 650, textAlign: "center" }}>{r.name}</span>
                  <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                    HSK {r.level} · <span className="num">{r.xp.toLocaleString("vi-VN")}</span> XP
                  </span>
                  {r.isYou ? <Chip tone="accent">Bạn</Chip> : null}
                </div>
              ))}
            </div>
          </Panel>

          {/* ---------- Your standing ---------- */}
          {you ? (
            <Panel className="panel--pad">
              <div className="grid grid--4">
                <Metric label="Hạng" value={`#${you.rank}`} icon={<Trophy size={14} />} />
                <Metric label="XP trong kỳ" value={you.xp.toLocaleString("vi-VN")} />
                <Metric
                  label="Thay đổi hạng"
                  value={you.delta > 0 ? `+${you.delta}` : String(you.delta)}
                />
                <Metric label="Tổng người chơi" value={rows.length} />
              </div>
            </Panel>
          ) : null}

          {/* ---------- Full board ---------- */}
          <Panel>
            <div className="panel__head">
              <div>
                <h2 className="section-title" style={{ fontSize: "var(--step-2)" }}>
                  Bảng xếp hạng đầy đủ
                </h2>
                <p className="section-sub">Từ hạng 4 trở xuống</p>
              </div>
            </div>
            <div className="panel__body panel__body--flush">
              {rest.map((r) => (
                <div key={r.id} className={`board-row ${r.isYou ? "is-you" : ""}`}>
                  <span className="board-row__rank num">#{r.rank}</span>
                  <span className="avatar han" aria-hidden="true">
                    {r.initials}
                  </span>
                  <span className="grow stack gap-1">
                    <span style={{ fontWeight: r.isYou ? 700 : 500 }}>
                      {r.name} {r.isYou ? "(bạn)" : ""}
                    </span>
                    <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                      HSK {r.level}
                    </span>
                  </span>
                  <span
                    className="row gap-1"
                    style={{
                      color: r.delta >= 0 ? "var(--success)" : "var(--danger)",
                      fontSize: "var(--step--2)",
                    }}
                  >
                    {r.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span className="num">{Math.abs(r.delta)}</span>
                  </span>
                  <span className="num" style={{ width: 84, textAlign: "right", fontWeight: 650 }}>
                    {r.xp.toLocaleString("vi-VN")}
                  </span>
                </div>
              ))}
            </div>
            <div className="panel__foot">
              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                <Medal size={12} style={{ display: "inline" }} /> MOCK: 20 đối thủ là dữ liệu mô
                phỏng, không phải người dùng thật.
              </span>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
