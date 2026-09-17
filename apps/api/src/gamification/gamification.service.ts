import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildBadges, rankAggregates } from './gamification.rules';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async leaderboard(callerId: string) {
    const rows = await this.prisma.attempt.groupBy({
      by: ['studentId'],
      where: {
        status: 'graded',
        isOfficialGrade: true,
        gradedAt: { not: null },
        totalScore: { not: null },
        maxScore: { gt: 0 },
      },
      _count: { _all: true },
      _sum: { totalScore: true, maxScore: true },
    });
    return rankAggregates(rows.map((row) => ({
      studentId: row.studentId,
      totalScore: row._sum.totalScore ?? 0,
      maxScore: row._sum.maxScore ?? 0,
      gradedAttempts: row._count._all,
    })), callerId);
  }

  async badges(studentId: string) {
    const attempts = await this.prisma.attempt.findMany({
      where: {
        studentId,
        status: 'graded',
        isOfficialGrade: true,
        gradedAt: { not: null },
        totalScore: { not: null },
        maxScore: { gt: 0 },
      },
      select: { gradedAt: true, totalScore: true, maxScore: true },
      orderBy: { gradedAt: 'asc' },
    });
    return buildBadges(attempts.map((attempt) => ({
      gradedAt: attempt.gradedAt!,
      totalScore: attempt.totalScore!,
      maxScore: attempt.maxScore!,
    })));
  }
}
