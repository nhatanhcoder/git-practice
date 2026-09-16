import { apiRequest } from '../api-client';

export type ProgressSkill = 'listening' | 'reading' | 'writing';
export interface ProgressOverview {
  heatmap: Array<{ weekStart: string } & Record<ProgressSkill, number | null>>;
  skillBreakdown: Record<ProgressSkill, number | null>;
  totals: { gradedAttempts: number; avgScore: number | null };
}
export interface ProgressChart {
  points: Array<{ weekStart: string; avgScore: number | null; count: number }>;
}

export async function fetchStudentProgress(): Promise<ProgressOverview> {
  return (await apiRequest<ProgressOverview>('/student/progress')).data;
}
export async function fetchStudentProgressChart(): Promise<ProgressChart> {
  return (await apiRequest<ProgressChart>('/student/progress/chart')).data;
}
