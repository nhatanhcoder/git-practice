"use client";

/**
 * MOCK(student): everything the learner *does*, kept in one client store and
 * persisted to localStorage. No API call anywhere — mockup mode per
 * docs/prompts/student-product/.
 *
 * `skipHydration: true` is deliberate. zustand's `persist` reads localStorage
 * synchronously at module load, which would make the first client render differ
 * from the server's and trip React's hydration check on every student route.
 * Instead the shell calls `rehydrate()` in an effect after mount, so the first
 * paint always matches the server and the stored values arrive one frame later.
 *
 * When the real API lands this whole module is replaced by the progress
 * endpoints in `docs/api/API_STUDENT.md`; the action names were chosen to line
 * up with them.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  activity as seedActivity,
  mistakeSeed,
  ranks,
  week as seedWeek,
} from "./content";
import {
  FORCE_UNLOCK_COST,
  WRITING_PASS_SCORE,
  advanceBox,
  bumpWeek,
  nextMastery,
  nextStreak,
  rankFromXp,
  todayISO,
} from "./student-rules";
import type { ActivityItem, ExamAttempt, MistakeItem, WeekDay } from "./types";

export interface StudentState {
  /** False until the shell has rehydrated from localStorage. */
  hydrated: boolean;

  theme: "dark" | "light";
  showPinyin: boolean;
  showMeaning: boolean;

  student: {
    id: string;
    name: string;
    initials: string;
    currentLevel: number;
    xp: number;
    streakDays: number;
    bestStreak: number;
    joinedLabel: string;
    lastStudyDate: string | null;
  };

  week: WeekDay[];
  activity: ActivityItem[];
  mistakes: MistakeItem[];
  attempts: ExamAttempt[];
  examStatus: Record<string, string>;
  grammarMastery: Record<string, { level: number; attempts: number }>;
  writingMastery: Record<string, { practised: number; bestScore: number }>;
  legoStars: Record<string, number>;
  workplaceProgress: Record<string, { bestScore: number; attempts: number }>;
  vocabBox: Record<string, number>;
  learnedRadicals: number[];
  masteredSounds: string[];
  earnedBadges: string[];
  unlockedNodes: string[];
  completedLessons: string[];

  /* ---- actions ---- */
  setHydrated: (v: boolean) => void;
  toggleTheme: () => void;
  togglePinyin: () => void;
  toggleMeaning: () => void;
  awardXp: (amount: number, minutes?: number) => void;
  logActivity: (item: Omit<ActivityItem, "id" | "at">) => void;
  setCurrentLevel: (level: number) => void;
  completeLesson: (nodeId: string, xp: number) => void;
  unlockNode: (nodeId: string) => boolean;
  reviewMistake: (id: string, correct: boolean) => void;
  practiseGrammar: (id: string, correct: boolean) => void;
  saveWriting: (id: string, score: number) => void;
  setLegoStars: (stationId: string, stars: number) => void;
  saveWorkplace: (scenarioId: string, score: number) => void;
  rateVocab: (id: string, correct: boolean) => void;
  toggleRadical: (no: number) => void;
  toggleSound: (id: string) => void;
  saveAttempt: (attempt: ExamAttempt) => void;
  resetProgress: () => void;
}

const initialStudent = {
  id: "you",
  name: "Nguyễn Minh Anh",
  initials: "MA",
  currentLevel: 3,
  xp: 5240,
  streakDays: 12,
  bestStreak: 21,
  joinedLabel: "Tham gia tháng 4/2026",
  lastStudyDate: null as string | null,
};

/** Everything a reset returns to. Kept separate so `resetProgress` is one line. */
const seed = () => ({
  student: { ...initialStudent },
  week: seedWeek.map((d) => ({ ...d })),
  activity: seedActivity.map((a) => ({ ...a })),
  mistakes: mistakeSeed.map((m) => ({ ...m })),
  attempts: [] as ExamAttempt[],
  examStatus: {} as Record<string, string>,
  grammarMastery: {} as Record<string, { level: number; attempts: number }>,
  writingMastery: {} as Record<string, { practised: number; bestScore: number }>,
  legoStars: {} as Record<string, number>,
  workplaceProgress: {} as Record<string, { bestScore: number; attempts: number }>,
  vocabBox: {} as Record<string, number>,
  learnedRadicals: [] as number[],
  masteredSounds: [] as string[],
  earnedBadges: [] as string[],
  unlockedNodes: [] as string[],
  completedLessons: [] as string[],
});

let activitySeq = 1000;

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      theme: "dark",
      showPinyin: true,
      showMeaning: true,
      ...seed(),

      setHydrated: (v) => set({ hydrated: v }),

      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      togglePinyin: () => set((s) => ({ showPinyin: !s.showPinyin })),
      toggleMeaning: () => set((s) => ({ showMeaning: !s.showMeaning })),

      awardXp: (amount, minutes = 0) =>
        set((s) => {
          const today = todayISO();
          return {
            student: {
              ...s.student,
              xp: Math.max(0, s.student.xp + amount),
              streakDays: nextStreak(s.student.lastStudyDate, s.student.streakDays, today),
              bestStreak: Math.max(
                s.student.bestStreak,
                nextStreak(s.student.lastStudyDate, s.student.streakDays, today),
              ),
              lastStudyDate: today,
            },
            week: bumpWeek(s.week, { xp: Math.max(0, amount), minutes }) as WeekDay[],
          };
        }),

      logActivity: (item) =>
        set((s) => ({
          activity: [
            { ...item, id: `act-${++activitySeq}`, at: new Date().toISOString() },
            ...s.activity,
          ].slice(0, 12),
        })),

      setCurrentLevel: (level) =>
        set((s) => ({ student: { ...s.student, currentLevel: level } })),

      completeLesson: (nodeId, xp) => {
        const { completedLessons, awardXp, logActivity } = get();
        if (!completedLessons.includes(nodeId)) {
          set({ completedLessons: [...completedLessons, nodeId] });
        }
        awardXp(xp, 10);
        logActivity({ kind: "lesson", text: `Hoàn thành chặng ${nodeId}`, xp });
      },

      /** Spends XP. Returns false (and changes nothing) when the learner cannot afford it. */
      unlockNode: (nodeId) => {
        const s = get();
        if (s.student.xp < FORCE_UNLOCK_COST) return false;
        if (s.unlockedNodes.includes(nodeId)) return true;
        set({
          unlockedNodes: [...s.unlockedNodes, nodeId],
          student: { ...s.student, xp: s.student.xp - FORCE_UNLOCK_COST },
        });
        return true;
      },

      reviewMistake: (id, correct) =>
        set((s) => ({
          mistakes: s.mistakes.map((m) => {
            if (m.id !== id) return m;
            const box = advanceBox(m.box, correct);
            return {
              ...m,
              box,
              status: box >= 5 ? "learned" : box === 1 ? "due" : "scheduled",
              lastSeen: new Date().toISOString(),
            };
          }),
        })),

      practiseGrammar: (id, correct) =>
        set((s) => ({
          grammarMastery: {
            ...s.grammarMastery,
            [id]: nextMastery(s.grammarMastery[id] || { level: 0, attempts: 0 }, correct),
          },
        })),

      saveWriting: (id, score) =>
        set((s) => {
          const prev = s.writingMastery[id] || { practised: 0, bestScore: 0 };
          return {
            writingMastery: {
              ...s.writingMastery,
              [id]: { practised: prev.practised + 1, bestScore: Math.max(prev.bestScore, score) },
            },
          };
        }),

      setLegoStars: (stationId, stars) =>
        set((s) => ({
          legoStars: {
            ...s.legoStars,
            [stationId]: Math.max(s.legoStars[stationId] || 0, stars),
          },
        })),

      saveWorkplace: (scenarioId, score) =>
        set((s) => {
          const prev = s.workplaceProgress[scenarioId] || { bestScore: 0, attempts: 0 };
          return {
            workplaceProgress: {
              ...s.workplaceProgress,
              [scenarioId]: {
                bestScore: Math.max(prev.bestScore, score),
                attempts: prev.attempts + 1,
              },
            },
          };
        }),

      rateVocab: (id, correct) =>
        set((s) => ({
          vocabBox: { ...s.vocabBox, [id]: advanceBox(s.vocabBox[id] || 1, correct) },
        })),

      toggleRadical: (no) =>
        set((s) => ({
          learnedRadicals: s.learnedRadicals.includes(no)
            ? s.learnedRadicals.filter((n) => n !== no)
            : [...s.learnedRadicals, no],
        })),

      toggleSound: (id) =>
        set((s) => ({
          masteredSounds: s.masteredSounds.includes(id)
            ? s.masteredSounds.filter((x) => x !== id)
            : [...s.masteredSounds, id],
        })),

      saveAttempt: (attempt) =>
        set((s) => ({
          attempts: [attempt, ...s.attempts].slice(0, 20),
          examStatus: {
            ...s.examStatus,
            [attempt.examId]: attempt.passed ? "passed" : "available",
          },
        })),

      resetProgress: () => set({ ...seed() }),
    }),
    {
      name: "hanlu-student",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: ({ hydrated, ...rest }) => rest,
    },
  ),
);

/** Profile with the derived rank attached — the shape the UI actually renders. */
export function useStudentProfile() {
  const student = useStudentStore((s) => s.student);
  const { current, next, into, forNext } = rankFromXp(ranks, student.xp);
  return {
    ...student,
    rank: current.name,
    rankHanzi: current.hanzi,
    rankBlurb: current.blurb,
    nextRank: next,
    xpIntoRank: into,
    xpForNextRank: forNext,
  };
}

export { FORCE_UNLOCK_COST, WRITING_PASS_SCORE };
