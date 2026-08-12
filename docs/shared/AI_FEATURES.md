# 🤖 AI_FEATURES.md — AI-Powered Features

> **AI Provider**: Google Gemini 1.5 Flash (Free tier)  
> **Backup**: OpenAI GPT-4o-mini (if Gemini proves insufficient)

> The Gemini prompt below is written in Vietnamese on purpose — it instructs the
> model to produce feedback in Vietnamese for Vietnamese-speaking students. Do not
> translate it; doing so would change the model's output language.

---

## 1. AI Features Overview

| Feature | AI Role | Sprint |
|---------|---------|--------|
| Writing Grader | Suggests a score + feedback | S4 |
| Weak Student Detection | Pattern analysis | S5 |
| Question Difficulty Estimator | Suggest HSK level | S3 (optional) |
| Study Recommendations | Next content to study | S7 (optional) |

---

## 2. Writing Grader (Core Feature)

### Flow

```
Teacher clicks "AI Suggest" button
          │
          ▼
POST /attempts/:id/answers/:qId/ai-grade
          │
          ▼
GeminiGradingService.gradeWriting()
          │
          ▼
Gemini API → structured JSON response
          │
          ▼
Return: { suggestedScore, feedback, strengths, improvements }
          │
          ▼
Teacher REVIEWS and CONFIRMS (or overrides the score)
          ─── the AI score is NEVER auto-applied ───
```

### NestJS Implementation

```typescript
// modules/grading/gemini-grading.service.ts
@Injectable()
export class GeminiGradingService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor(private readonly config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.get('GEMINI_API_KEY'));
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3,         // Consistent grading
        responseMimeType: 'application/json',
      }
    });
  }

  async gradeWriting(params: GradeWritingParams): Promise<GradingResult> {
    const { question, studentAnswer, hskLevel, maxScore } = params;

    const prompt = this.buildGradingPrompt(question, studentAnswer, hskLevel, maxScore);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      return JSON.parse(response) as GradingResult;
    } catch (error) {
      // Fallback: return null, teacher grades manually
      this.logger.warn('Gemini grading failed, falling back to manual');
      return null;
    }
  }

  private buildGradingPrompt(
    question: string,
    answer: string,
    hskLevel: number,
    maxScore: number
  ): string {
    return `
Bạn là giáo viên tiếng Trung chuyên chấm bài thi HSK cấp ${hskLevel}.

Đề bài: ${question}

Bài làm của học sinh:
${answer}

Hãy chấm bài theo thang điểm 0-${maxScore} với tiêu chí:
- Từ vựng phù hợp cấp độ HSK ${hskLevel} (30%)
- Ngữ pháp chính xác (40%)
- Mạch lạc và logic (30%)

Trả về JSON với format CHÍNH XÁC (không markdown):
{
  "suggestedScore": <số từ 0 đến ${maxScore}>,
  "feedback": "<nhận xét tổng thể bằng tiếng Việt, 2-3 câu>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "improvements": ["<cần cải thiện 1>", "<cần cải thiện 2>"],
  "languageLevel": "<nhận xét về level thực tế của bài viết>"
}
    `.trim();
  }
}
```

### Rate Limiting

```typescript
// To avoid exceeding the Gemini free tier (60 req/min):
// Only call the AI when the teacher clicks the button — never automatically
// Cache the AI result in the DB (in case the teacher clicks again)

interface AttemptAnswer {
  // ... existing fields
  aiSuggestedScore?: number;
  aiFeedback?: string;
  aiGradedAt?: DateTime;
}
```

---

## 3. Weak Student Detection

### Logic

```typescript
// analytics.service.ts
async detectWeakStudents(classId: string): Promise<WeakStudentAlert[]> {
  // Fetch each student's scores from the 5 most recent assignments
  const recentAttempts = await this.prisma.attempt.findMany({
    where: {
      assignment: { classId },
      status: 'graded',
    },
    orderBy: { gradedAt: 'desc' },
    take: 5 * studentCount,  // Rough estimate
    include: { user: true, assignment: true }
  });

  const alerts: WeakStudentAlert[] = [];

  for (const student of students) {
    const studentAttempts = recentAttempts.filter(a => a.userId === student.id);

    // Alert if: average score < 50%, or 3 of the last 5 are below 50%
    const avgScore = average(studentAttempts.map(a =>
      (a.totalScore / a.assignment.maxScore) * 100
    ));

    const failCount = studentAttempts.filter(a =>
      (a.totalScore / a.assignment.maxScore) < 0.5
    ).length;

    if (avgScore < 50 || failCount >= 3) {
      alerts.push({
        student,
        avgScore,
        failCount,
        weakSkills: this.identifyWeakSkills(studentAttempts),
        recommendation: `${student.fullName} cần hỗ trợ thêm về ${weakSkills.join(', ')}`
      });
    }
  }

  return alerts;
}
```

### Frontend Display

```
Teacher Dashboard → Class Overview
│
├── 🟢 Performance Overview
│   ├── Class average: 72%
│   └── Completion rate: 85%
│
└── ⚠️ Students Needing Attention (2)
    ├── Nguyễn Văn A — Avg: 38% — Weak: Listening, Writing
    └── Trần Thị B  — Avg: 45% — Weak: Reading
```

---

## 4. Gemini Free Tier Management

```typescript
// config/gemini.config.ts
export const GeminiConfig = {
  DAILY_LIMIT: 1000,        // Conservative limit (actual: unlimited for Flash)
  PER_MINUTE_LIMIT: 60,
  MAX_TOKENS_PER_REQUEST: 1000,
  CACHE_TTL_HOURS: 24,     // Cache AI responses to avoid duplicate calls
};

// Rate limiter middleware for the AI endpoints
@Injectable()
export class AiRateLimiterGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check today's usage from the DB
    const todayCount = await this.getAiCallCount(today);
    if (todayCount >= GeminiConfig.DAILY_LIMIT) {
      throw new BusinessException('AI_QUOTA_EXCEEDED', 'Đã hết quota AI hôm nay', 429);
    }
    return true;
  }
}
```

---

## 5. UI/UX for AI Grading

> Mockup shows the Vietnamese UI as built.

```
Teacher Grading Panel:
┌──────────────────────────────────────────────────────┐
│ Câu 3: Viết đoạn văn về chủ đề "Gia đình"           │
│                                                       │
│ Bài làm học sinh:                                     │
│ 我的家庭有四个人。爸爸是医生，妈妈是老师...              │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │ 🤖 AI Suggest (Gemini)              [Get AI →]  │  │
│ │                                                  │  │
│ │ Điểm đề xuất: 7/10                              │  │
│ │ Điểm mạnh: Từ vựng phù hợp HSK2, cấu trúc rõ   │  │
│ │ Cần cải thiện: Sai dấu câu, thiếu liên từ        │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ Điểm thực tế (teacher):  [___7___] / 10              │
│ Feedback:                [__________________]         │
│                                                       │
│                    [💾 Lưu điểm]                     │
└──────────────────────────────────────────────────────┘
```

> 📌 **Important**: the AI only suggests. The teacher must enter the final score.
