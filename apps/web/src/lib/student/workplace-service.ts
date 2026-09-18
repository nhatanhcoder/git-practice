import { apiRequest } from "../api-client";

export interface WorkplaceProgress {
  completedTurns: number;
  totalTurns: number;
  completed: boolean;
}

export interface WorkplaceScenarioSummary {
  id: string;
  kind: string;
  channel: string;
  title: string;
  hanziTitle: string;
  partner: string;
  partnerRole: string;
  partnerInitial: string;
  level: number;
  durationMin: number;
  difficulty: string;
  blurb: string;
  progress: WorkplaceProgress;
}

export interface WorkplaceCorrection {
  wrong: string;
  better: string;
  why: string;
}

export interface WorkplaceScenarioDetail extends Omit<WorkplaceScenarioSummary, "progress"> {
  goal: string;
  brief: string;
  vocabulary: Array<{ hanzi: string; pinyin: string; vi: string }>;
  phrases: Array<{ hanzi: string; pinyin: string; vi: string }>;
  rubric: Array<{ label: string; hint: string }>;
  turns: Array<{
    id: string;
    fromHanzi: string;
    fromPinyin: string;
    fromVi: string;
    task: string;
    suggestions: string[];
  }>;
}

export interface WorkplaceReveal {
  scenarioId: string;
  turnId: string;
  model: string;
  modelVi: string;
  corrections: WorkplaceCorrection[];
  completed: boolean;
}

export async function fetchWorkplaceScenarios(): Promise<WorkplaceScenarioSummary[]> {
  return (
    await apiRequest<{ scenarios: WorkplaceScenarioSummary[] }>("/student/workplace")
  ).data.scenarios;
}

export async function fetchWorkplaceScenario(id: string): Promise<WorkplaceScenarioDetail> {
  return (
    await apiRequest<WorkplaceScenarioDetail>(
      `/student/workplace/${encodeURIComponent(id)}`,
    )
  ).data;
}

export async function revealWorkplaceTurn(
  scenarioId: string,
  turnId: string,
  reply: string,
): Promise<WorkplaceReveal> {
  return (
    await apiRequest<WorkplaceReveal>(
      `/student/workplace/${encodeURIComponent(scenarioId)}/turns/${encodeURIComponent(turnId)}/reveal`,
      { method: "POST", body: JSON.stringify({ reply }) },
    )
  ).data;
}
