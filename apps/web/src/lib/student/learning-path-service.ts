import { apiRequest } from "../api-client";
export const LEARNING_CURRICULA = [
  { id: "hanlo_vocabulary", label: "Từ vựng Hán Lộ" },
  { id: "hsk_standard_course", label: "HSK Standard Course" },
  { id: "han_yu_jiao_cheng", label: "Giáo trình Hán ngữ" },
] as const;
export type LearningState =
  "locked" | "available" | "in_progress" | "completed";
export interface LearningCatalog {
  curriculum: string;
  level: number;
  page: number;
  totalPages: number;
  total: number;
  completed: number;
  units: {
    slug: string;
    title: string;
    level: number;
    order: number;
    wordCount: number;
    state: LearningState;
  }[];
}
export interface LearningDetail {
  unit: {
    slug: string;
    title: string;
    level: number;
    order: number;
    words: { hanzi: string; pinyin: string; meaning: string }[];
  };
  progress: null | {
    status: "in_progress" | "completed";
    studyIndex: number;
    answers: string[];
    revision: number;
    bestScore: number;
    lastScore: number | null;
    completedAt: string | null;
  };
  quiz: { prompt: string; options: { id: string; text: string }[] }[];
  nextSlug: string | null;
  result: null | {
    score: number;
    total: number;
    passed: boolean;
    feedback: { hanzi: string; meaning: string; correct: boolean }[];
  };
}
export async function fetchLearningPath(
  curriculum: string,
  level: number,
  page: number,
) {
  return (
    await apiRequest<LearningCatalog>(
      `/student/learning-path?curriculum=${encodeURIComponent(curriculum)}&level=${level}&page=${page}`,
    )
  ).data;
}
export async function fetchLearningUnit(slug: string) {
  return (
    await apiRequest<LearningDetail>(
      `/student/learning-path/${encodeURIComponent(slug)}`,
    )
  ).data;
}
export async function updateLearningUnit(
  slug: string,
  action: "start" | "study" | "answers" | "complete",
  body?: { revision: number; index?: number; choiceId?: string },
) {
  return (
    await apiRequest<LearningDetail>(
      `/student/learning-path/${encodeURIComponent(slug)}/${action}`,
      { method: "POST", ...(body ? { body: JSON.stringify(body) } : {}) },
    )
  ).data;
}
