import type { QuestionSkill } from '../mongodb/schemas/question.schema';

export const PROGRESS_SKILLS = ['listening', 'reading', 'writing'] as const;
export type ProgressSkill = (typeof PROGRESS_SKILLS)[number];

export type ProgressAttempt = {
  submittedAt: Date | null;
  gradedAt: Date | null;
  totalScore: number | null;
  answers: Array<{ questionId: string; isCorrect: boolean | null }>;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function utcMonday(date: Date): Date {
  const value = new Date(date);
  const day = value.getUTCDay();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - (day === 0 ? 6 : day - 1));
  return value;
}

export function completedWeekStarts(now: Date, count: number): Date[] {
  const currentMonday = utcMonday(now).getTime();
  return Array.from({ length: count }, (_, index) =>
    new Date(currentMonday - (count - index) * WEEK_MS),
  );
}

function attemptDate(attempt: ProgressAttempt): Date | null {
  return attempt.submittedAt ?? attempt.gradedAt;
}

function inWeek(date: Date | null, start: Date): boolean {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time < start.getTime() + WEEK_MS;
}

export function buildProgress(
  attempts: ProgressAttempt[],
  skillsByQuestionId: ReadonlyMap<string, QuestionSkill>,
  now: Date,
) {
  if (attempts.length === 0) {
    return {
      heatmap: [],
      skillBreakdown: { listening: null, reading: null, writing: null },
      totals: { gradedAttempts: 0, avgScore: null },
    };
  }
  const weekStarts = completedWeekStarts(now, 8);
  const heatmap = weekStarts.map((weekStart) => {
    const counts = new Map<ProgressSkill, { correct: number; total: number }>(
      PROGRESS_SKILLS.map((skill) => [skill, { correct: 0, total: 0 }]),
    );
    for (const attempt of attempts) {
      if (!inWeek(attemptDate(attempt), weekStart)) continue;
      for (const answer of attempt.answers) {
        if (answer.isCorrect === null) continue;
        const skill = skillsByQuestionId.get(answer.questionId);
        if (!skill) continue;
        const count = counts.get(skill)!;
        count.total += 1;
        if (answer.isCorrect) count.correct += 1;
      }
    }
    return {
      weekStart: weekStart.toISOString(),
      ...Object.fromEntries(
        PROGRESS_SKILLS.map((skill) => {
          const count = counts.get(skill)!;
          return [skill, count.total ? count.correct / count.total : null];
        }),
      ),
    } as { weekStart: string } & Record<ProgressSkill, number | null>;
  });

  const windowStart = weekStarts[0];
  const windowEnd = utcMonday(now);
  const skillBreakdown = Object.fromEntries(PROGRESS_SKILLS.map((skill) => {
    const answers = attempts
      .filter((attempt) => {
        const date = attemptDate(attempt);
        return date && date >= windowStart && date < windowEnd;
      })
      .flatMap((attempt) => attempt.answers)
      .filter((answer) => answer.isCorrect !== null && skillsByQuestionId.get(answer.questionId) === skill);
    return [skill, answers.length ? answers.filter((answer) => answer.isCorrect).length / answers.length : null];
  })) as Record<ProgressSkill, number | null>;

  const scores = attempts.map((attempt) => attempt.totalScore).filter((score): score is number => score !== null);
  return {
    heatmap,
    skillBreakdown,
    totals: {
      gradedAttempts: attempts.length,
      avgScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    },
  };
}

export function buildChart(attempts: ProgressAttempt[], now: Date) {
  if (attempts.length === 0) return { points: [] };
  return {
    points: completedWeekStarts(now, 12).map((weekStart) => {
      const scores = attempts
        .filter((attempt) => inWeek(attemptDate(attempt), weekStart))
        .map((attempt) => attempt.totalScore)
        .filter((score): score is number => score !== null);
      return {
        weekStart: weekStart.toISOString(),
        avgScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
        count: scores.length,
      };
    }),
  };
}
