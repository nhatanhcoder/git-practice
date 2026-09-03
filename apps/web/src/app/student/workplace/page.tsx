"use client";

/**
 * /student/workplace — business Chinese scenarios.
 *
 * Six multi-turn situations: quote a price, report a slip, apologise to a
 * client, interview, book a meeting, handle a complaint. Each is scored on
 * whether the reply covers the points a real counterpart would expect.
 *
 * MOCK(student): content from `lib/student/content.ts`; scoring is keyword
 * matching, not language assessment — see `scoreReply` in student-rules.js.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Mail, MessageSquare, Target } from "lucide-react";
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
import { useStudentStore } from "@/lib/student/store";
import { SCENARIO_KIND_LABEL, scenarios } from "@/lib/student/content";
import { withScenarioProgress } from "@/lib/student/student-rules";

export default function WorkplacePage() {
  const [demo, setDemo] = useState<DemoState>("ready");
  const [kind, setKind] = useState<string>("all");

  const workplaceProgress = useStudentStore((s) => s.workplaceProgress);
  const list = useMemo(
    () => withScenarioProgress(scenarios, workplaceProgress),
    [workplaceProgress],
  );

  const results = useMemo(
    () => list.filter((s) => kind === "all" || s.kind === kind),
    [list, kind],
  );

  const attempted = list.filter((s) => s.progress.attempts > 0).length;
  const best = list.reduce((n, s) => Math.max(n, s.progress.bestScore), 0);

  return (
    <>
      <PageHead
        title={
          <>
            Mô phỏng <em>công sở</em>
          </>
        }
        sub="Sáu tình huống nhiều lượt: báo giá, họp, thư tín, phỏng vấn, hẹn lịch, khiếu nại."
        action={<DemoStateSwitcher value={demo} onChange={setDemo} />}
      />

      {demo === "loading" ? (
        <SkeletonPanel rows={4} height={180} />
      ) : demo === "error" ? (
        <Panel className="panel--pad">
          <ErrorState onRetry={() => setDemo("ready")} />
        </Panel>
      ) : (
        <>
          <Panel className="panel--pad">
            <div className="grid grid--3">
              <Metric label="Tình huống" value={list.length} icon={<Briefcase size={14} />} />
              <Metric label="Đã thử" value={attempted} />
              <Metric label="Điểm cao nhất" value={best ? `${best}` : "—"} />
            </div>
          </Panel>

          <Panel className="panel--pad">
            <div className="row gap-2 wrap">
              <button
                type="button"
                className={`pill ${kind === "all" ? "is-active" : ""}`}
                aria-pressed={kind === "all"}
                onClick={() => setKind("all")}
              >
                Tất cả
              </button>
              {Object.entries(SCENARIO_KIND_LABEL).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`pill ${kind === key ? "is-active" : ""}`}
                  aria-pressed={kind === key}
                  onClick={() => setKind(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Panel>

          <section>
            <SectionHeader
              title="Tình huống"
              sub={`${results.length} kịch bản có thể bấm thử`}
            />
            {demo === "empty" || results.length === 0 ? (
              <Panel className="panel--pad">
                <EmptyState
                  icon={<Briefcase size={26} />}
                  title="Không có kịch bản nào khớp"
                  text="Bỏ bộ lọc để xem cả sáu tình huống."
                  action={
                    <button type="button" className="btn btn--outline" onClick={() => setKind("all")}>
                      Xoá bộ lọc
                    </button>
                  }
                />
              </Panel>
            ) : (
              <div className="grid grid--2">
                {results.map((s) => (
                  <Link key={s.id} href={`/student/workplace/${s.id}`} className="examcard">
                    <div className="row gap-3">
                      <span className="rowitem__icon han" aria-hidden="true">
                        {s.hanzi.slice(0, 1)}
                      </span>
                      <span className="stack gap-1 grow">
                        <span className="examcard__title">{s.title}</span>
                        <span className="examcard__sub">{s.counterpart}</span>
                      </span>
                      {s.channel === "email" ? <Mail size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <p className="examcard__sub">{s.blurb}</p>
                    <div className="row gap-2 wrap">
                      <Chip tone="accent">HSK {s.level}</Chip>
                      <Chip>{SCENARIO_KIND_LABEL[s.kind]}</Chip>
                      <Chip tone="info">
                        <span className="num">{s.turns.length}</span> lượt
                      </Chip>
                      {s.progress.bestScore > 0 ? (
                        <Chip tone="success">
                          <Target size={12} /> <span className="num">{s.progress.bestScore}</span>
                        </Chip>
                      ) : null}
                    </div>
                    {s.progress.bestScore > 0 ? (
                      <Bar value={s.progress.bestScore} size="sm" tone="success" label="Điểm tốt nhất" />
                    ) : null}
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
