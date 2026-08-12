# 📊 ANALYTICS_FLOW.md — Analytics & Progress Reporting

> **Sprint**: S5 — SRS Flashcards + Analytics  
> **Module**: AnalyticsModule (NestJS)  
> **Entity**: SkillScore (PostgreSQL)

---

## 1. Analytics Features Overview

| Feature | Actor | Description |
|---------|-------|-------|
| Skill Heatmap | Student | Performance by skill × week |
| Progress Chart | Student | Average score over time |
| Class Statistics | Teacher | Class score overview, completion rate |
| Weak Student Alert | Teacher | Students who need support |
| Score Distribution | Teacher | Score distribution chart |
| API Quota Chart | Admin | Gemini API usage tracking |

---

## 2. SkillScore — Data Collection

Every time an attempt becomes **GRADED**, the system creates SkillScore records:

```typescript
// attempts.service.ts — after grading completes
async recordSkillScores(attemptId: string): Promise<void> {
  const attempt = await this.prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      assignment: true,
      answers: true
    }
  });

  // Fetch the questions from MongoDB to get the skill breakdown
  const questions = await this.questionModel.find({
    _id: { $in: attempt.assignment.questionIds }
  });

  // Group answers by skill
  const skillData: Record<string, { score: number; maxScore: number }> = {};

  for (const question of questions) {
    const answer = attempt.answers.find(a => a.questionId === question._id.toString());
    const skill = question.skill as string;

    if (!skillData[skill]) skillData[skill] = { score: 0, maxScore: 0 };

    skillData[skill].maxScore += question.pointValue ?? 1;
    skillData[skill].score += answer?.isCorrect
      ? (question.pointValue ?? 1)
      : (answer?.score ?? 0);
  }

  // Create SkillScore records
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = getYear(now);

  await this.prisma.skillScore.createMany({
    data: Object.entries(skillData).map(([skill, { score, maxScore }]) => ({
      userId: attempt.userId,
      attemptId,
      skill: skill as SkillType,
      score: maxScore > 0 ? (score / maxScore) * 100 : 0,
      weekNumber,
      year,
    }))
  });
}
```

---

## 3. Skill Heatmap (Student)

### Query Logic

```typescript
// GET /api/v1/skill-scores/heatmap?weeks=12
async getSkillHeatmap(userId: string, weeksBack = 12) {
  const startDate = subWeeks(new Date(), weeksBack);
  const startWeek = getISOWeek(startDate);
  const startYear = getYear(startDate);

  // Fetch every skill score in the window
  const scores = await this.prisma.skillScore.findMany({
    where: {
      userId,
      OR: [
        { year: { gt: startYear } },
        { year: startYear, weekNumber: { gte: startWeek } }
      ]
    },
    orderBy: [{ year: 'asc' }, { weekNumber: 'asc' }]
  });

  // Aggregate: average per skill × week
  const heatmapData: HeatmapCell[] = [];

  // Group by (year, weekNumber, skill)
  const grouped = groupBy(scores, s => `${s.year}-${s.weekNumber}-${s.skill}`);

  for (const [key, groupScores] of Object.entries(grouped)) {
    const [year, weekNumber, skill] = key.split('-');
    const avgScore = average(groupScores.map(s => s.score));

    heatmapData.push({
      year: Number(year),
      weekNumber: Number(weekNumber),
      skill,
      avgScore: Math.round(avgScore),
      attemptCount: groupScores.length,
      // Color intensity: 0-49 red, 50-69 yellow, 70-89 green, 90+ dark green
      intensity: getHeatmapIntensity(avgScore)
    });
  }

  return heatmapData;
}
```

### Frontend Heatmap Display

> Mockup reflects the Vietnamese UI as built (Nghe = Listening, Đọc = Reading, Viết = Writing).

```
Student Dashboard → Progress → Skill Heatmap
┌──────────────────────────────────────────────────────┐
│ 📊 Hiệu suất theo kỹ năng (12 tuần gần nhất)        │
│                                                       │
│           W1  W2  W3  W4  W5  W6  W7  W8  W9  W10   │
│ Nghe    [🔴][🟡][🟡][🟢][🟢][🟢][🟢][🟢][🟢][🟢]  │
│ Đọc     [🟡][🟡][🟡][🟡][🟢][🟢][🟢][🟢][🟢][🟢]  │
│ Viết    [🔴][🔴][🟡][🟡][🟡][🟡][🟢][🟢][🟢][🟢]  │
│                                                       │
│ Chú thích: 🔴 <50%  🟡 50-70%  🟢 70-90%  ⬛ >90%  │
└──────────────────────────────────────────────────────┘
```

---

## 4. Progress Chart (Student)

```typescript
// GET /api/v1/skill-scores/progress?skill=all&months=6
async getProgressChart(userId: string, skill?: string, monthsBack = 6) {
  const startDate = subMonths(new Date(), monthsBack);

  const where: Prisma.SkillScoreWhereInput = {
    userId,
    recordedAt: { gte: startDate },
    ...(skill && skill !== 'all' ? { skill: skill as SkillType } : {})
  };

  const scores = await this.prisma.skillScore.findMany({
    where,
    orderBy: { recordedAt: 'asc' }
  });

  // Group by month
  const byMonth = groupBy(scores, s => format(s.recordedAt, 'yyyy-MM'));

  return Object.entries(byMonth).map(([month, monthScores]) => ({
    month,
    avgScore: Math.round(average(monthScores.map(s => s.score))),
    bySkill: {
      listening: Math.round(average(
        monthScores.filter(s => s.skill === 'listening').map(s => s.score)
      )),
      reading: Math.round(average(
        monthScores.filter(s => s.skill === 'reading').map(s => s.score)
      )),
      writing: Math.round(average(
        monthScores.filter(s => s.skill === 'writing').map(s => s.score)
      )),
    }
  }));
}
```

### Frontend Chart

```
Student Dashboard → Progress → Progress over time
┌──────────────────────────────────────────────────────┐
│ 📈 Điểm trung bình (6 tháng qua) — "Average score"   │
│                                                       │
│ 100 ──────────────────────────────────────────       │
│  80 ────────────────────────────── 🟢 Đọc ────       │
│  60 ──────── 🔵 Nghe ────────────────────────       │
│  40 ── 🔴 Viết ───────────────────────────────       │
│  20 ──────────────────────────────────────────       │
│       Jan  Feb  Mar  Apr  May  Jun  Jul              │
└──────────────────────────────────────────────────────┘
```

---

## 5. Class Statistics (Teacher)

### Class Overview

```typescript
// GET /api/v1/classes/:classId/analytics
async getClassAnalytics(classId: string, teacherId: string) {
  const cls = await this.classesService.findByIdOrThrow(classId, teacherId);

  const [
    studentCount,
    assignments,
    allAttempts
  ] = await Promise.all([
    this.prisma.classEnrollment.count({ where: { classId, status: 'active' } }),
    this.prisma.assignment.findMany({
      where: { classId, status: 'published' }
    }),
    this.prisma.attempt.findMany({
      where: { assignment: { classId }, status: 'graded' },
      include: { assignment: true, user: true }
    })
  ]);

  // Completion rate per assignment
  const assignmentStats = await Promise.all(
    assignments.map(async (assignment) => {
      const submitted = await this.prisma.attempt.count({
        where: { assignmentId: assignment.id, status: { not: 'in_progress' } }
      });
      const avgScore = allAttempts
        .filter(a => a.assignmentId === assignment.id)
        .reduce((acc, a, _, arr) => acc + a.totalScore / a.assignment.maxScore / arr.length, 0) * 100;

      return {
        assignment,
        submittedCount: submitted,
        completionRate: Math.round((submitted / studentCount) * 100),
        avgScore: Math.round(avgScore)
      };
    })
  );

  return {
    class: cls,
    overview: {
      studentCount,
      assignmentCount: assignments.length,
      avgClassScore: Math.round(
        allAttempts.reduce((s, a) => s + (a.totalScore / a.assignment.maxScore * 100), 0)
        / (allAttempts.length || 1)
      ),
    },
    assignmentStats,
    weakStudents: await this.detectWeakStudents(classId)
  };
}
```

### Score Distribution (Histogram)

```typescript
// Score distribution for a single assignment
async getScoreDistribution(assignmentId: string) {
  const attempts = await this.prisma.attempt.findMany({
    where: { assignmentId, status: 'graded' },
    include: { assignment: true }
  });

  // Buckets: 0-10, 10-20, ..., 90-100
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${(i + 1) * 10}`,
    count: 0
  }));

  for (const attempt of attempts) {
    const pct = (attempt.totalScore / attempt.assignment.maxScore) * 100;
    const bucketIdx = Math.min(Math.floor(pct / 10), 9);
    buckets[bucketIdx].count++;
  }

  return buckets;
}
```

---

## 6. Weak Student Detection (Teacher)

```typescript
// GET /api/v1/classes/:classId/weak-students
async detectWeakStudents(classId: string): Promise<WeakStudentAlert[]> {
  const recentAttempts = await this.prisma.attempt.findMany({
    where: { assignment: { classId }, status: 'graded' },
    include: { user: true, assignment: true },
    orderBy: { gradedAt: 'desc' },
    take: 100  // Last 100 graded attempts for the class
  });

  // Group by student
  const byStudent = groupBy(recentAttempts, a => a.userId);
  const alerts: WeakStudentAlert[] = [];

  for (const [studentId, attempts] of Object.entries(byStudent)) {
    const last5 = attempts.slice(0, 5);
    if (last5.length < 2) continue;  // Need at least 2 data points

    const scores = last5.map(a => (a.totalScore / a.assignment.maxScore) * 100);
    const avgScore = average(scores);
    const failCount = scores.filter(s => s < 50).length;

    if (avgScore < 50 || failCount >= 3) {
      // Identify weak skills
      const skillScores = await this.prisma.skillScore.findMany({
        where: { userId: studentId, attemptId: { in: last5.map(a => a.id) } }
      });

      const skillAvg: Record<string, number> = {};
      for (const ss of skillScores) {
        if (!skillAvg[ss.skill]) skillAvg[ss.skill] = [];
        (skillAvg[ss.skill] as any[]).push(ss.score);
      }
      const weakSkills = Object.entries(skillAvg)
        .map(([skill, scores]) => ({ skill, avg: average(scores as number[]) }))
        .filter(s => s.avg < 60)
        .map(s => s.skill);

      alerts.push({
        student: last5[0].user,
        avgScore: Math.round(avgScore),
        failCount,
        weakSkills,
        recommendation: `${last5[0].user.fullName} cần hỗ trợ thêm về: ${weakSkills.join(', ')}`
      });
    }
  }

  return alerts;
}
```

---

## 7. API Reference

| Method | Endpoint | Role | Description |
|--------|----------|------|-------|
| `GET` | `/skill-scores/heatmap` | Student | Skill heatmap data |
| `GET` | `/skill-scores/progress` | Student | Progress chart data |
| `GET` | `/classes/:id/analytics` | Teacher | Class overview + stats |
| `GET` | `/classes/:id/weak-students` | Teacher | Weak student alerts |
| `GET` | `/assignments/:id/score-distribution` | Teacher | Score histogram |
| `GET` | `/admin/api-quota` | Admin | Gemini API usage |

---

## 8. API Quota Tracking (Admin)

```typescript
// Every Gemini API call is logged to the DB
// admin.service.ts
async getApiQuotaStats(days = 30) {
  const startDate = subDays(new Date(), days);

  const usageByDay = await this.prisma.apiQuotaLog.groupBy({
    by: ['date'],
    where: { date: { gte: startDate } },
    _count: { id: true },
    _sum: { tokensUsed: true }
  });

  return {
    totalCalls: usageByDay.reduce((s, d) => s + d._count.id, 0),
    totalTokens: usageByDay.reduce((s, d) => s + (d._sum.tokensUsed ?? 0), 0),
    dailyLimit: 1000,
    byDay: usageByDay
  };
}
```
