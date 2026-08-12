# 🎮 EXAM_ENGINE.md — Exam-Taking State Machine

> **Module**: AttemptsModule (NestJS)  
> **Entities**: Attempt, AttemptAnswer (PostgreSQL)

---

## 1. State Machine

```
                    ┌─────────────────────────┐
                    │                         │
  student starts ──►│      IN_PROGRESS        │
                    │                         │
                    │  - Auto-save answers    │
                    │  - Timer running        │
                    │  - Can navigate freely  │
                    └────────────┬────────────┘
                                 │
                    student submit / time expires
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │                         │
                    │       SUBMITTED          │
                    │                         │
                    │  - MCQ: auto-graded ✓   │
                    │  - Writing: pending      │
                    │  - Teacher notified      │
                    └────────────┬────────────┘
                                 │
                    teacher grades all writing
                    (or no writing questions)
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │                         │
                    │        GRADED           │
                    │                         │
                    │  - totalScore set       │
                    │  - Student notified     │
                    │  - Results viewable     │
                    └─────────────────────────┘
```

---

## 2. Auto-Save Strategy

```
Student types answer
       │
       ▼ (debounce 2 seconds)
PUT /attempts/:id/answers/:questionId
       │
       ▼
AttemptAnswer.upsert (create or update)
       │
       ▼
Frontend: "✓ Đã lưu" ("Saved") indicator
```

**Edge cases:**
- Network loss: store answers in localStorage, sync once back online
- Tab closed abruptly: beforeunload event → force save
- Token expires mid-exam: refresh the token automatically and continue

---

## 3. Submit Flow in Detail

```typescript
// attempts.service.ts
async submit(attemptId: string, userId: string): Promise<AttemptResult> {

  // 1. Validate
  const attempt = await this.findAttemptOrThrow(attemptId, userId);
  if (attempt.status !== 'in_progress') {
    throw new BusinessException('ATTEMPT_ALREADY_SUBMITTED', '...', 409);
  }

  // 2. Check time limit
  if (attempt.assignment.timeLimitMinutes) {
    const elapsed = differenceInMinutes(new Date(), attempt.startedAt);
    if (elapsed > attempt.assignment.timeLimitMinutes + 2) { // 2 min grace
      throw new BusinessException('ATTEMPT_TIME_EXCEEDED', '...', 400);
    }
  }

  // 3. Fetch the questions from MongoDB
  const questionIds = attempt.assignment.questionIds;
  const questions = await this.questionModel.find({ _id: { $in: questionIds } });

  // 4. Auto-grade MCQ/Listening/Reading
  const answers = await this.prisma.attemptAnswer.findMany({ where: { attemptId } });
  let autoScore = 0;
  let hasWriting = false;

  for (const question of questions) {
    if (question.skill === 'writing') {
      hasWriting = true;
      continue;
    }
    const answer = answers.find(a => a.questionId === question._id.toString());
    const isCorrect = answer?.answer === question.correctAnswer;
    if (isCorrect) autoScore += question.pointValue ?? 1;

    await this.prisma.attemptAnswer.update({
      where: { attemptId_questionId: { attemptId, questionId: question._id.toString() } },
      data: { isCorrect, autoGraded: true }
    });
  }

  // 5. Update attempt status
  const newStatus = hasWriting ? 'submitted' : 'graded';
  const totalScore = hasWriting ? null : autoScore;

  await this.prisma.attempt.update({
    where: { id: attemptId },
    data: {
      status: newStatus,
      totalScore,
      submittedAt: new Date(),
    }
  });

  // 6. Notify the teacher if the assignment contains writing
  //    (message strings below are Vietnamese UI copy)
  if (hasWriting) {
    await this.notificationsService.create({
      recipientId: attempt.assignment.class.teacherId,
      type: 'grading_required',
      message: `${attempt.user.fullName} đã nộp bài ${attempt.assignment.title}`
    });
  } else {
    // Otherwise notify the student of the result
    await this.notificationsService.create({
      recipientId: userId,
      type: 'graded',
      message: `Bài ${attempt.assignment.title} của bạn đã được chấm xong`
    });
  }

  return { status: newStatus, autoScore, totalScore };
}
```

---

## 4. Timer Implementation

### Backend: Soft enforcement
```typescript
// On submit, check elapsed time (does not forcibly end the session)
// Reason: network latency can delay a submit by a few seconds
const GRACE_PERIOD_MINUTES = 2;
```

### Frontend: Hard enforcement
```typescript
// stores/examStore.ts
interface ExamStore {
  remainingSeconds: number;
  timerInterval: NodeJS.Timeout | null;
  startTimer: (totalMinutes: number) => void;
  onTimeUp: () => void;  // Auto-submit
}

// hooks/useCountdown.ts
export function useCountdown(totalMinutes: number, onTimeUp: () => void) {
  const [remaining, setRemaining] = useState(totalMinutes * 60);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp();  // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return remaining;
}
```

---

## 5. Question Types & Grading Rules

| Question Type | Auto-grade | Manual grade | Point value |
|--------------|------------|--------------|------------|
| MCQ (multiple choice) | ✅ Exact match | ❌ | 1 point(s) |
| True/False | ✅ Exact match | ❌ | 1 point(s) |
| Listening MCQ | ✅ Exact match | ❌ | 1 point(s) |
| Reading Comprehension | ✅ Exact match | ❌ | 1 point(s) |
| Gap Fill (word bank) | ✅ Exact match | ❌ | 1 point(s) |
| Sentence Ordering | ✅ Array comparison | ❌ | 2 point(s) |
| Writing (short) | ❌ | ✅ Teacher | 0–5 point(s) |
| Writing (paragraph) | ❌ | ✅ Teacher | 0–10 point(s) |

---

## 6. Result Calculation

```typescript
// Once the teacher grades the final question:
async checkAndFinalizeGrading(attemptId: string) {
  const answers = await this.prisma.attemptAnswer.findMany({
    where: { attemptId }
  });

  const allGraded = answers.every(a => a.isCorrect !== null || a.score !== null);

  if (allGraded) {
    const totalScore = answers.reduce((sum, a) => {
      return sum + (a.score ?? (a.isCorrect ? 1 : 0));
    }, 0);

    await this.prisma.attempt.update({
      where: { id: attemptId },
      data: { status: 'graded', totalScore, gradedAt: new Date() }
    });

    // Notify student
    await this.notificationsService.create({ ... });
  }
}
```
