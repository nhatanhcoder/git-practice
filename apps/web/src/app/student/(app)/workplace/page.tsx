"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, Check, Mail, MessageSquare } from "lucide-react";
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
import {
  fetchWorkplaceScenarios,
  type WorkplaceScenarioSummary,
} from "@/lib/student/workplace-service";

type LoadState = "loading" | "ready" | "error";

function kindLabel(kind: string): string {
  return ({
    quotation: "Báo giá",
    reporting: "Báo cáo",
    apology: "Xin lỗi khách hàng",
    interview: "Phỏng vấn",
    scheduling: "Hẹn lịch",
    complaint: "Khiếu nại",
  } as Record<string, string>)[kind] ?? kind;
}

export default function WorkplacePage() {
  const [state, setState] = useState<LoadState>("loading");
  const [scenarios, setScenarios] = useState<WorkplaceScenarioSummary[]>([]);
  const [kind, setKind] = useState("all");

  const load = useCallback(async () => {
    setState("loading");
    try {
      setScenarios(await fetchWorkplaceScenarios());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const kinds = useMemo(() => Array.from(new Set(scenarios.map((item) => item.kind))), [scenarios]);
  const results = useMemo(
    () => scenarios.filter((item) => kind === "all" || item.kind === kind),
    [scenarios, kind],
  );
  const started = scenarios.filter((item) => item.progress.completedTurns > 0).length;
  const completed = scenarios.filter((item) => item.progress.completed).length;

  return (
    <>
      <PageHead
        eyebrow="Luyện tập"
        title="Mô phỏng công sở"
        sub="Sáu tình huống tiếng Trung thương mại. Viết câu trả lời trước, sau đó đối chiếu với mẫu và góp ý đã được biên soạn — không có điểm từ khoá hay AI giả."
      />
      {state === "loading" ? <SkeletonPanel rows={4} height={180} /> : state === "error" ? (
        <Panel className="panel--pad"><ErrorState onRetry={() => void load()} /></Panel>
      ) : (
        <>
          <Panel className="panel--pad">
            <div className="grid grid--3">
              <Metric label="Tình huống" value={scenarios.length} icon={<Briefcase size={14} />} />
              <Metric label="Đã bắt đầu" value={started} />
              <Metric label="Đã hoàn thành" value={completed} icon={<Check size={14} />} />
            </div>
          </Panel>
          <Panel className="panel--pad"><div className="row gap-2 wrap">
            <button type="button" className={`pill ${kind === "all" ? "is-active" : ""}`} onClick={() => setKind("all")}>Tất cả</button>
            {kinds.map((item) => <button key={item} type="button" className={`pill ${kind === item ? "is-active" : ""}`} onClick={() => setKind(item)}>{kindLabel(item)}</button>)}
          </div></Panel>
          <section>
            <SectionHeader title="Tình huống" sub={`${results.length} kịch bản có thể luyện`} />
            {results.length === 0 ? (
              <Panel className="panel--pad"><EmptyState icon={<Briefcase size={26} />} title="Không có kịch bản nào khớp" /></Panel>
            ) : (
              <div className="grid grid--2">
                {results.map((scenario) => (
                  <Link key={scenario.id} href={`/student/workplace/${scenario.id}`} className="examcard">
                    <div className="row gap-3">
                      <span className="rowitem__icon han">{scenario.partnerInitial}</span>
                      <span className="stack gap-1 grow"><span className="examcard__title">{scenario.title}</span><span className="examcard__sub">{scenario.partner} · {scenario.partnerRole}</span></span>
                      {scenario.channel === "email" ? <Mail size={16} /> : <MessageSquare size={16} />}
                    </div>
                    <p className="examcard__sub">{scenario.blurb}</p>
                    <div className="row gap-2 wrap"><Chip tone="accent">HSK {scenario.level}</Chip><Chip>{kindLabel(scenario.kind)}</Chip><Chip tone={scenario.progress.completed ? "success" : "info"}>{scenario.progress.completedTurns}/{scenario.progress.totalTurns} lượt</Chip></div>
                    <Bar value={(scenario.progress.completedTurns / scenario.progress.totalTurns) * 100} size="sm" tone={scenario.progress.completed ? "success" : "accent"} label="Tiến độ tình huống" />
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
