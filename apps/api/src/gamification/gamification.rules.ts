import { createHash } from 'node:crypto';

export type RankedAggregate = {
  studentId: string;
  totalScore: number;
  maxScore: number;
  gradedAttempts: number;
};

export type BadgeAttempt = { gradedAt: Date; totalScore: number; maxScore: number };

export function studentAlias(studentId: string): string {
  const code = createHash('sha256').update(studentId).digest('hex').slice(0, 6).toUpperCase();
  return `Học viên ${code}`;
}

export function rankAggregates(aggregates: RankedAggregate[], callerId: string) {
  const eligible = aggregates
    .filter((row) => row.gradedAttempts >= 3 && row.maxScore > 0)
    .map((row) => ({
      studentId: row.studentId,
      alias: studentAlias(row.studentId),
      score: Math.round((row.totalScore / row.maxScore) * 10_000) / 100,
      gradedAttempts: row.gradedAttempts,
    }))
    .sort((a, b) => b.score - a.score || b.gradedAttempts - a.gradedAttempts || a.alias.localeCompare(b.alias));

  const ranked = eligible.map((row, index) => ({
    rank: index + 1,
    alias: row.alias,
    score: row.score,
    gradedAttempts: row.gradedAttempts,
    isYou: row.studentId === callerId,
  }));
  return {
    rows: ranked.slice(0, 20),
    me: ranked.find((row) => row.isYou) ?? null,
    eligibleCount: ranked.length,
  };
}

export function buildBadges(attempts: BadgeAttempt[]) {
  const ordered = [...attempts].sort((a, b) => a.gradedAt.getTime() - b.gradedAt.getTime());
  const perfect = ordered.find((attempt) => attempt.maxScore > 0 && attempt.totalScore / attempt.maxScore >= 1);
  const milestone = (id: string, title: string, target: number) => ({
    id,
    title,
    description: `Hoàn thành ${target} bài chính thức đã được chấm`,
    target,
    current: ordered.length,
    earned: ordered.length >= target,
    earnedAt: ordered[target - 1]?.gradedAt.toISOString() ?? null,
  });
  const badges = [
    milestone('first-grade', 'Khởi đầu vững vàng', 1),
    milestone('five-grades', 'Nhịp học ổn định', 5),
    milestone('ten-grades', 'Bền bỉ tiến bước', 10),
    {
      id: 'perfect-score',
      title: 'Bài làm hoàn hảo',
      description: 'Đạt 100% ở một bài chính thức đã được chấm',
      target: 1,
      current: perfect ? 1 : 0,
      earned: Boolean(perfect),
      earnedAt: perfect?.gradedAt.toISOString() ?? null,
    },
  ];
  return { badges, earnedCount: badges.filter((badge) => badge.earned).length };
}
