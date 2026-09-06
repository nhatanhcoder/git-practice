"use client";

/**
 * /student/badges — the badge cabinet.
 *
 * A locked badge shows how close it is rather than just being greyed out; the
 * distance is the motivating part, and hiding it makes the whole screen inert.
 *
 * MOCK(student): definitions from `content.badgeDefs`, unlock state computed by
 * `evaluateBadges` against the store.
 */

import { useMemo, useState } from "react";
import { Lock, Medal } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  Metric,
  PageHead,
  Panel,
  SectionHeader,
  SkeletonPanel,
} from "@/components/student/primitives";
import { DemoStateSwitcher, type DemoState } from "@/components/student/controls";
import { Drawer } from "@/components/student/overlay";
import { useStudentStore } from "@/lib/student/store";
import { badgeDefs } from "@/lib/student/content";
import { evaluateBadges } from "@/lib/student/student-rules";
import type { Badge, BadgeCategory, BadgeRarity } from "@/lib/student/types";

const CATEGORIES: BadgeCategory[] = [
  "Chuỗi ngày",
  "Từ vựng",
  "Chữ Hán",
  "Thi cử",
  "Ngữ pháp",
  "Cộng đồng",
];

const RARITY_TONE: Record<BadgeRarity, "neutral" | "info" | "epic" | "warn"> = {
  Thường: "neutral",
  Hiếm: "info",
  "Sử thi": "epic",
  "Huyền thoại": "warn",
};

export default function BadgesPage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [category, setCategory] = useState<BadgeCategory | "all">("all");
  const [onlyLocked, setOnlyLocked] = useState(false);
  const [open, setOpen] = useState<Badge | null>(null);

  const student = useStudentStore((s) => s.student);
  const completedLessons = useStudentStore((s) => s.completedLessons);
  const earnedBadges = useStudentStore((s) => s.earnedBadges);
  const attempts = useStudentStore((s) => s.attempts);
  const grammarMastery = useStudentStore((s) => s.grammarMastery);
  const writingMastery = useStudentStore((s) => s.writingMastery);
  const mistakes = useStudentStore((s) => s.mistakes);

  const badges = useMemo(
    () =>
      evaluateBadges(badgeDefs, {
        student,
        completedLessons,
        earnedBadges,
        attempts,
        grammarMastery,
        writingMastery,
        mistakes,
      }),
    [student, completedLessons, earnedBadges, attempts, grammarMastery, writingMastery, mistakes],
  );

  const results = useMemo(
    () =>
      badges.filter((b) => {
        if (category !== "all" && b.category !== category) return false;
        if (onlyLocked && b.unlocked) return false;
        return true;
      }),
    [badges, category, onlyLocked],
  );

  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <>
      <PageHead
        eyebrow="Cộng đồng"
        title="Kho huy hiệu"
        sub="Huy hiệu được chia theo các nhóm thành tựu. Tiến độ và điều kiện mở suy ra từ tiến độ học tập; huy hiệu còn khoá vẫn hiện cần làm gì tiếp theo."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={4} height={200} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          <Panel className="panel--pad">
            <div className="grid grid--3">
              <Metric label="Đã mở" value={`${unlocked}/${badges.length}`} icon={<Medal size={14} />} />
              <Metric
                label="Sắp mở"
                value={badges.filter((b) => !b.unlocked && b.progress >= 50).length}
              />
              <Metric
                label="Hiếm trở lên"
                value={badges.filter((b) => b.unlocked && b.rarity !== "Thường").length}
              />
            </div>
            <Bar value={(unlocked / badges.length) * 100} tone="gold" label="Tỉ lệ mở khoá" />
          </Panel>

          <Panel className="panel--pad">
            <div className="row gap-2 wrap">
              <button
                type="button"
                className={`pill ${category === "all" ? "is-active" : ""}`}
                aria-pressed={category === "all"}
                onClick={() => setCategory("all")}
              >
                Tất cả
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pill ${category === c ? "is-active" : ""}`}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
              <span className="dot" aria-hidden="true" />
              <button
                type="button"
                className={`pill ${onlyLocked ? "is-active" : ""}`}
                aria-pressed={onlyLocked}
                onClick={() => setOnlyLocked((v) => !v)}
              >
                <Lock size={12} /> Chỉ huy hiệu còn khoá
              </button>
            </div>
          </Panel>

          <section>
            <SectionHeader title="Huy hiệu" sub={`${results.length} huy hiệu khớp bộ lọc`} />
            {demo === "empty" || results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState
                  icon={<Medal size={26} />}
                  title="Không có huy hiệu nào khớp"
                  text="Bỏ bộ lọc để xem cả bộ sưu tập."
                  action={
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => {
                        setCategory("all");
                        setOnlyLocked(false);
                      }}
                    >
                      Xoá bộ lọc
                    </button>
                  }
                />
              </Panel>
            ) : (
              <div className="badge-grid">
                {results.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`badge-card ${b.unlocked ? "is-unlocked" : "is-locked"}`}
                    onClick={() => setOpen(b)}
                  >
                    <span className="badge-card__glyph han" aria-hidden="true">
                      {b.unlocked ? b.hanzi : <Lock size={20} />}
                    </span>
                    <span style={{ fontWeight: 650 }}>{b.name}</span>
                    <Chip tone={RARITY_TONE[b.rarity]}>{b.rarity}</Chip>
                    {!b.unlocked ? (
                      <Bar value={b.progress} size="sm" label={`Tiến độ ${b.progress}%`} />
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        eyebrow={open ? `${open.category} · ${open.rarity}` : ""}
        title={open?.name ?? ""}
        subtitle={open?.blurb}
      >
        {open ? (
          <div className="stack gap-5" style={{ alignItems: "center", textAlign: "center" }}>
            <span
              className="badge-card__glyph han"
              style={{
                width: 96,
                height: 96,
                fontSize: 44,
                background: open.unlocked ? "var(--accent-soft)" : "var(--surface-3)",
                borderColor: open.unlocked ? "var(--accent)" : "var(--line)",
                color: open.unlocked ? "var(--accent)" : "var(--text-3)",
              }}
              aria-hidden="true"
            >
              {open.unlocked ? open.hanzi : <Lock size={30} />}
            </span>
            <Chip tone={open.unlocked ? "success" : "neutral"}>
              {open.unlocked ? "Đã mở khoá" : "Còn khoá"}
            </Chip>
            <p style={{ color: "var(--text-2)" }}>{open.blurb}</p>
            <div className="stack gap-2" style={{ width: "100%" }}>
              <span className="eyebrow">Điều kiện</span>
              <p style={{ color: "var(--text-2)" }}>{open.requirement}</p>
              <Bar
                value={open.progress}
                tone={open.unlocked ? "success" : "gold"}
                label={`Tiến độ ${open.progress}%`}
              />
              <span style={{ color: "var(--text-3)", fontSize: "var(--step--2)" }}>
                <span className="num">{open.progress}%</span> tới điều kiện mở khoá
              </span>
            </div>
          </div>
        ) : null}
      </Drawer>
    </>
  );
}
