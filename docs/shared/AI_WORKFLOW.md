# 🤖 AI_WORKFLOW.md — Làm việc với AI Assistant (Solo Dev Guide)

> **Mục tiêu**: Tối đa hóa năng suất với AI — từ thiết kế đến code đến test  
> **AI Tools**: Claude / Gemini / Cursor IDE / GitHub Copilot

---

## 1. Nguyên tắc Sử dụng AI hiệu quả

### DO ✅
- Cung cấp **context đầy đủ** (schema, interface, business rule)
- Yêu cầu AI giải thích **tại sao** chứ không chỉ code
- **Review code AI** trước khi commit — AI có thể sai
- Dùng AI để **brainstorm** trước khi code
- Yêu cầu AI tạo **test cases** cùng lúc với code

### DON'T ❌
- Không dùng AI cho **security-critical logic** mà không review kỹ (JWT, bcrypt)
- Không paste **API keys / secrets** vào AI chat
- Không tin 100% — AI có thể hallucinate dependencies không tồn tại
- Không dùng AI để generate migration files — tự viết để kiểm soát

---

## 2. Prompt Templates theo Sprint

### Sprint 0 — Setup & Boilerplate

```
[CONTEXT]
Dự án: HSK Learning Platform
Tech: NestJS + Prisma + Mongoose + TypeScript
Pattern: Repository pattern, DTO validation

[REQUEST]
Tạo NestJS module hoàn chỉnh cho entity [ClassSession] bao gồm:
- Module, Controller, Service
- DTO (CreateClassSessionDto, UpdateClassSessionDto) với class-validator
- Prisma service injection
- CRUD endpoints: POST, GET/:id, PATCH/:id
- Swagger decorators (@ApiTags, @ApiOperation, @ApiResponse)

Schema Prisma của ClassSession:
[paste schema]
```

---

```
[REQUEST]
Tạo Prisma seed script (TypeScript) cho database hsk_platform với:
- 1 admin user
- 2 teacher users
- 5 student users (status: active)
- 2 classes (HSK 1 và HSK 2)
- Enroll 3 students vào mỗi lớp

Dùng Prisma Client, bcrypt cho passwords, faker cho data giả
```

---

### Sprint 1 — Authentication

```
[CONTEXT]
NestJS Auth setup:
- @nestjs/jwt, @nestjs/passport, passport-jwt
- Refresh token pattern: httpOnly cookie
- Roles: admin, teacher, student

[REQUEST]
Implement JWT Refresh Token rotation trong NestJS:
1. RefreshToken entity trong Prisma (id, userId, tokenHash, expiresAt, revokedAt)
2. AuthService.refreshToken(token) method:
   - Verify refresh token
   - Check not revoked in DB
   - Generate new access token
   - Rotate refresh token (revoke old, create new)
3. RefreshJwtStrategy (passport-jwt, cookie extractor)
4. POST /auth/refresh endpoint

Dùng pattern này: [paste AUTH_FLOW.md section]
```

---

### Sprint 2 — Classes

```
[CONTEXT]
ClassesService cần:
- Teacher tạo lớp, tự động gen enrollment code (8 chars unique)
- Student join bằng code
- Check enrollment code unique trong DB

[REQUEST]
Implement generateEnrollmentCode() trong ClassesService:
- 8 ký tự: uppercase + numbers (A-Z, 0-9)
- Kiểm tra unique trong DB (retry nếu trùng, tối đa 5 lần)
- Dùng crypto.randomBytes (không dùng Math.random)
- Viết unit test với Jest (mock PrismaService)
```

---

### Sprint 3 — Question Bank

```
[CONTEXT]
MongoDB Question schema (Mongoose):
[paste schema từ DATABASE_SCHEMA.md]

[REQUEST]
Implement QuestionsService.search() cho full-text + filter:
- Filter: hskLevel (1-6), skill (listening/reading/writing), subType
- Full-text search trên content.text (MongoDB text index)
- Pagination: page, limit, total
- Sort: createdAt DESC
- Viết aggregation pipeline thay vì .find() để tối ưu
```

---

### Sprint 4 — Exam Engine

```
[CONTEXT]
State machine làm bài:
- in_progress → submitted (khi student nộp)
- submitted → graded (khi tất cả câu được chấm)
- MCQ: auto-grade khi submit
- Writing: cần teacher chấm thủ công

[REQUEST]
Implement AttemptsService.submit(attemptId, userId):
1. Validate attempt thuộc về userId và status === 'in_progress'
2. Tính điểm MCQ/Listening/Reading: so sánh answer với correctAnswer trong MongoDB
3. Nếu không có writing questions: set status = 'graded', tính totalScore
4. Nếu có writing: set status = 'submitted', totalScore = null (chờ teacher)
5. Tạo Notification cho teacher: "Học sinh X đã nộp bài Y"
6. Transaction Prisma để update Attempt + tạo Notification atomically

Prisma schemas liên quan:
[paste Attempt, AttemptAnswer schemas]
```

---

```
[CONTEXT]
AI Writing Grader feature
Model: Gemini 1.5 Flash (free tier)
HSK Writing task types: sentence composition, paragraph writing

[REQUEST]
Implement GeminiGradingService.gradeWriting():
Input:
- question: string (đề bài writing)
- studentAnswer: string (bài viết của student)
- hskLevel: number (1-6)
- maxScore: number (10)

Output:
- suggestedScore: number
- feedback: string (tiếng Việt)
- strengths: string[]
- improvements: string[]

Prompt engineering:
- Vai trò: Giáo viên tiếng Trung chấm bài HSK [level]
- Tiêu chí: từ vựng, ngữ pháp, mạch lạc
- Format output: JSON strict
- Temperature: 0.3 (consistent grading)
```

---

### Sprint 5 — SRS (Spaced Repetition)

```
[CONTEXT]
SM-2 Algorithm:
- easeFactor (EF): default 2.5, min 1.3
- repetitions: số lần đã ôn thành công liên tiếp
- interval: ngày đến lần review tiếp theo

Rating: 0-5 (Again=0, Hard=2, Good=3, Easy=5)

[REQUEST]
Implement SM2Algorithm.calculate(rating, repetitions, interval, easeFactor):
- quality < 3: reset repetitions=0, interval=1
- quality >= 3:
  - repetitions=1: interval=1
  - repetitions=2: interval=6
  - repetitions>2: interval = round(interval * easeFactor)
- EF = EF + (0.1 - (5-quality) * (0.08 + (5-quality) * 0.02))
- EF = max(1.3, EF)

Return: { newInterval, newEaseFactor, newRepetitions, nextReviewDate }

Viết unit tests cho tất cả rating values (0-5) và edge cases.
```

---

### Sprint 6 — Payroll

```
[CONTEXT]
Payroll calculation:
- Teacher pay rate: per_session hoặc per_hour
- Approved sessions trong kỳ lương
- Tính tổng tiền

[REQUEST]
Implement PayrollService.calculatePeriodAmount(teacherId, periodStart, periodEnd):
1. Lấy TeacherPayRate hiệu lực trong period (effectiveFrom <= periodEnd)
2. Lấy tất cả ClassSessions của teacher trong period với status='approved'
3. Tính tiền theo rateType:
   - per_session: count * rateAmount
   - per_hour: (totalMinutes / 60) * rateAmount (round lên 0.5h)
4. Return: { sessions, totalMinutes, totalAmount, breakdown: [...] }

Prisma schemas: [paste TeacherPayRate, ClassSession, PayrollPeriod]
```

---

### Sprint 7 — Testing

```
[CONTEXT]
ClassesService method:
[paste code của method cần test]

[REQUEST]
Viết Jest unit tests đầy đủ cho ClassesService.enroll():
- Happy path: student enroll thành công
- Error: enrollment code không tồn tại → 404
- Error: class đã archived → 400
- Error: student đã enrolled → 409
- Mock PrismaService với jest.mock()
- Mock đầy đủ return values của findUnique, create
- Test coverage mục tiêu: 100% branches
```

---

## 3. AI-Assisted Code Review Checklist

Sau khi nhận code từ AI, kiểm tra:

```
□ TypeScript types đầy đủ, không có 'any'?
□ Error handling: try/catch hoặc NestJS exception filters?
□ DTO validation: @IsString(), @IsEmail(), etc.?
□ Guards: @UseGuards(JwtAuthGuard, RolesGuard) đúng chỗ?
□ Swagger decorators: @ApiTags(), @ApiOperation()?
□ Prisma queries: select chỉ fields cần thiết?
□ Không lộ sensitive data (password hash) trong response?
□ Logic edge cases được xử lý?
□ Unit tests được include?
```

---

## 4. Workflow Hàng ngày với AI

```
Morning:
1. Review task cho ngày hôm nay từ TASK_BOARD.md
2. Brief AI: "Hôm nay tôi cần implement [feature], context: [paste relevant docs]"

During Development:
3. Brainstorm với AI trước khi code: "Cách tốt nhất để implement X?"
4. Generate boilerplate: "Tạo module NestJS cho Y"
5. Debug: "Lỗi này nghĩa là gì: [paste error]"
6. Review: "Review code này, tìm bugs và security issues"

End of Day:
7. Document: "Viết JSDoc cho functions này"
8. Test: "Tạo test cases cho edge cases của function này"
```

---

## 5. Gemini AI Grading — Production Prompts

### Prompt template chấm writing:

```
Bạn là giáo viên tiếng Trung chuyên chấm bài thi HSK {level}.

Đề bài: {question}

Bài làm của học sinh:
{studentAnswer}

Hãy chấm bài theo thang điểm 0-{maxScore} với tiêu chí:
- Từ vựng phù hợp cấp độ HSK {level} (30%)
- Ngữ pháp chính xác (40%)  
- Mạch lạc và logic (30%)

Trả về JSON với format CHÍNH XÁC sau (không thêm markdown):
{
  "suggestedScore": <số từ 0 đến {maxScore}>,
  "feedback": "<nhận xét tổng thể bằng tiếng Việt, 2-3 câu>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "improvements": ["<cần cải thiện 1>", "<cần cải thiện 2>"]
}
```

> 📌 Teacher vẫn phải **review và confirm** điểm AI suggest — không auto-apply

---

## 6. AI không nên dùng cho:

| Tác vụ | Lý do |
|--------|-------|
| Database migration files | Cần kiểm soát chính xác schema thay đổi |
| JWT secret generation | Dùng `openssl rand -base64 32` |
| Sensitive business rules (tuition, payroll formula) | Cần xác nhận với stakeholder |
| Deploy scripts | Quá nhiều environment-specific |
| Git history / merge conflicts | Context bị mất |
