"use client";

// MOCK(student): shared mock learner profile for the prototype.
export interface MockLearner {
  nickname: string;
  currentLevel: number; // HSK level 1–9
  xp: number;
  rank: string;
  streakDays: number;
  bestStreak: number;
  dailyGoalXp: number;
  todayXp: number;
}

export const mockLearner: MockLearner = {
  nickname: "Mai Anh",
  currentLevel: 3,
  xp: 2450,
  rank: "Hạng Bạc II",
  streakDays: 12,
  bestStreak: 21,
  dailyGoalXp: 60,
  todayXp: 35,
};

export const hskLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export interface LevelProgress {
  level: number;
  label: string;
  lessonsDone: number;
  lessonsTotal: number;
  vocabMastered: number;
  vocabTotal: number;
  grammarMastered: number;
  grammarTotal: number;
  bestExamScore: number | null; // percent
  state: "completed" | "current" | "locked";
}

// MOCK(student): HSK 1–9 level progress — no hardcoded 1–6.
export const levelProgress: LevelProgress[] = [
  { level: 1, label: "HSK 1", lessonsDone: 15, lessonsTotal: 15, vocabMastered: 500, vocabTotal: 500, grammarMastered: 15, grammarTotal: 15, bestExamScore: 96, state: "completed" },
  { level: 2, label: "HSK 2", lessonsDone: 15, lessonsTotal: 15, vocabMastered: 772, vocabTotal: 772, grammarMastered: 21, grammarTotal: 21, bestExamScore: 91, state: "completed" },
  { level: 3, label: "HSK 3", lessonsDone: 8, lessonsTotal: 15, vocabMastered: 412, vocabTotal: 974, grammarMastered: 18, grammarTotal: 36, bestExamScore: 72, state: "current" },
  { level: 4, label: "HSK 4", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 1300, grammarMastered: 0, grammarTotal: 48, bestExamScore: null, state: "locked" },
  { level: 5, label: "HSK 5", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 1710, grammarMastered: 0, grammarTotal: 57, bestExamScore: null, state: "locked" },
  { level: 6, label: "HSK 6", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 2247, grammarMastered: 0, grammarTotal: 67, bestExamScore: null, state: "locked" },
  { level: 7, label: "HSK 7", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 2800, grammarMastered: 0, grammarTotal: 76, bestExamScore: null, state: "locked" },
  { level: 8, label: "HSK 8", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 3300, grammarMastered: 0, grammarTotal: 85, bestExamScore: null, state: "locked" },
  { level: 9, label: "HSK 9", lessonsDone: 0, lessonsTotal: 15, vocabMastered: 0, vocabTotal: 3800, grammarMastered: 0, grammarTotal: 94, bestExamScore: null, state: "locked" },
];
