# 🎮 EXAM_ENGINE.md — State Machine Làm Bài

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
AttemptAnswer.upsert (create hoặc update)
       │
       ▼
Frontend: "✓ Đã lưu" indicator
```

**Edge cases:**
- Mất mạng: Store answers trong localStorage, sync khi có mạng
- Tab đóng đột ngột: beforeunload event → force save
- Token expired trong khi làm: Refresh token tự động, tiếp tục

---

## 3. Submit Flow Chi tiết

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

  // 3. Fetch questions từ MongoDB
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

  // 6. Notify teacher nếu có writing
  if (hasWriting) {
    await this.notificationsService.create({
      recipientId: attempt.assignment.class.teacherId,
      type: 'grading_required',
      message: `${attempt.user.fullName} đã nộp bài ${attempt.assignment.title}`
    });
  } else {
    // Notify student kết quả
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
// Khi submit, check elapsed time (không forcibly end session)
// Lý do: Network latency có thể gây submit trễ vài giây
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
          onTimeUp();  // Auto-submit khi hết giờ
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
| MCQ (multiple choice) | ✅ Exact match | ❌ | 1 điểm |
| True/False | ✅ Exact match | ❌ | 1 điểm |
| Listening MCQ | ✅ Exact match | ❌ | 1 điểm |
| Reading Comprehension | ✅ Exact match | ❌ | 1 điểm |
| Gap Fill (word bank) | ✅ Exact match | ❌ | 1 điểm |
| Sentence Ordering | ✅ Array comparison | ❌ | 2 điểm |
| Writing (short) | ❌ | ✅ Teacher | 0–5 điểm |
| Writing (paragraph) | ❌ | ✅ Teacher | 0–10 điểm |

---

## 6. Result Calculation

```typescript
// Khi teacher chấm xong câu cuối cùng:
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
