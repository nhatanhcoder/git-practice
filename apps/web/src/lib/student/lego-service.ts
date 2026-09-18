import { apiRequest } from "../api-client";

export interface LegoProgress {
  attempted: boolean;
  correctCount: number;
  total: number;
  stars: number;
  unlocked: boolean;
}

export interface LegoStationSummary {
  id: string;
  level: number;
  title: string;
  hanziTitle: string;
  focus: string;
  blurb: string;
  progress: LegoProgress;
}

export interface LegoBlock {
  id: string;
  text: string;
  role: string;
}

export interface LegoSentence {
  id: string;
  level: number;
  vi: string;
  hint: string;
  blocks: LegoBlock[];
}

export interface LegoStationDetail {
  id: string;
  level: number;
  title: string;
  hanziTitle: string;
  focus: string;
  blurb: string;
  sentences: LegoSentence[];
}

export interface LegoAttemptResult {
  stationId: string;
  results: Array<{
    sentenceId: string;
    correct: boolean;
    expectedBlocks: LegoBlock[];
    pinyin: string;
    rule: string;
  }>;
  progress: LegoProgress;
}

export async function fetchLegoStations(): Promise<LegoStationSummary[]> {
  return (await apiRequest<{ stations: LegoStationSummary[] }>("/student/lego")).data.stations;
}

export async function fetchLegoStation(id: string): Promise<LegoStationDetail> {
  return (
    await apiRequest<LegoStationDetail>(
      `/student/lego/stations/${encodeURIComponent(id)}`,
    )
  ).data;
}

export async function submitLegoStation(
  id: string,
  answers: Array<{ sentenceId: string; blockIds: string[] }>,
): Promise<LegoAttemptResult> {
  return (
    await apiRequest<LegoAttemptResult>(
      `/student/lego/stations/${encodeURIComponent(id)}/attempt`,
      { method: "POST", body: JSON.stringify({ answers }) },
    )
  ).data;
}

