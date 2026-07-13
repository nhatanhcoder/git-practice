# 🗃️ DATABASE_SCHEMA.md — Schema Chi tiết

> **PostgreSQL**: Prisma ORM (Supabase)  
> **MongoDB**: Mongoose ODM (Atlas)  
> **Cập nhật**: 2026-07-10

---

## 1. PostgreSQL — Prisma Schema Overview

```
users
  ├── classes (teacherId FK)
  ├── class_enrollments (studentId FK)
  ├── assignments (via class)
  ├── attempts (userId FK)
  ├── refresh_tokens (userId FK)
  ├── teacher_pay_rates (teacherId FK)
  ├── payroll_periods (teacherId FK)
  ├── student_tuition_rates (studentId FK)
  ├── student_invoices (studentId FK)
  └── notifications (recipientId, senderId FK)

classes
  ├── class_enrollments (classId FK)
  ├── assignments (classId FK)
  └── class_sessions (classId FK)

assignments
  └── attempts (assignmentId FK)

attempts
  ├── attempt_answers (attemptId FK)
  └── skill_scores (attemptId FK)

class_sessions
  └── session_attendances (sessionId FK)
```

---

## 2. Bảng Chi tiết — PostgreSQL

### 2.1 users

```prisma
model User {
  id                String      @id @default(cuid())
  email             String      @unique
  passwordHash      String
  fullName          String
  role              UserRole    // admin | teacher | student
  status            UserStatus  // pending | active | suspended
  hskLevel          Int?        // 1-6 (student only)
  avatarUrl         String?
  preferredLanguage String      @default("vi")
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  // Relations
  taughtClasses     Class[]     @relation("TeacherClasses")
  enrollments       ClassEnrollment[]
  attempts          Attempt[]
  refreshTokens     RefreshToken[]
  payRates          TeacherPayRate[]
  payrollPeriods    PayrollPeriod[]
  tuitionRates      StudentTuitionRate[]
  invoices          StudentInvoice[]
  sentNotifications     Notification[] @relation("SentNotifications")
  receivedNotifications Notification[] @relation("ReceivedNotifications")

  @@map("users")
}

enum UserRole   { admin teacher student }
enum UserStatus { pending active suspended }
```

### 2.2 classes

```prisma
model Class {
  id             String      @id @default(cuid())
  name           String
  description    String?
  hskLevel       Int         // 1-6
  enrollmentCode String      @unique  // 8-char uppercase alphanumeric
  status         ClassStatus // active | archived
  teacherId      String
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  teacher        User        @relation("TeacherClasses", fields: [teacherId], references: [id])
  enrollments    ClassEnrollment[]
  assignments    Assignment[]
  sessions       ClassSession[]

  @@map("classes")
}

enum ClassStatus { active archived }
```

### 2.3 class_enrollments

```prisma
model ClassEnrollment {
  id         String           @id @default(cuid())
  classId    String
  studentId  String
  status     EnrollmentStatus // active | dropped
  enrolledAt DateTime         @default(now())
  droppedAt  DateTime?

  class   Class @relation(fields: [classId], references: [id])
  student User  @relation(fields: [studentId], references: [id])

  @@unique([classId, studentId])
  @@map("class_enrollments")
}

enum EnrollmentStatus { active dropped }
```

### 2.4 assignments

```prisma
model Assignment {
  id               String         @id @default(cuid())
  classId          String
  title            String
  description      String?
  skillType        SkillType      // listening | reading | writing | mixed
  type             AssignmentType // homework | mock_test
  timeLimitMinutes Int?           // null = no limit
  questionIds      String[]       // MongoDB ObjectId refs
  dueDate          DateTime?
  status           AssignmentStatus // draft | published | closed
  maxScore         Int            // Tổng điểm tối đa
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  class    Class     @relation(fields: [classId], references: [id])
  attempts Attempt[]

  @@map("assignments")
}

enum SkillType       { listening reading writing mixed }
enum AssignmentType  { homework mock_test }
enum AssignmentStatus { draft published closed }
```

### 2.5 attempts & attempt_answers

```prisma
model Attempt {
  id           String        @id @default(cuid())
  userId       String
  assignmentId String
  status       AttemptStatus // in_progress | submitted | graded
  totalScore   Float?
  startedAt    DateTime      @default(now())
  submittedAt  DateTime?
  gradedAt     DateTime?

  user       User            @relation(fields: [userId], references: [id])
  assignment Assignment      @relation(fields: [assignmentId], references: [id])
  answers    AttemptAnswer[]
  skillScores SkillScore[]

  @@unique([userId, assignmentId])  // 1 attempt per student per assignment
  @@map("attempts")
}

enum AttemptStatus { in_progress submitted graded }

model AttemptAnswer {
  id              String  @id @default(cuid())
  attemptId       String
  questionId      String  // MongoDB ObjectId (string)
  answer          Json?   // Student's answer (string | string[] | object)
  isCorrect       Boolean?
  autoGraded      Boolean @default(false)
  score           Float?  // Manual score (writing)
  teacherFeedback String?
  aiSuggestedScore Float?
  aiFeedback       String?
  aiGradedAt       DateTime?
  gradedAt        DateTime?

  attempt Attempt @relation(fields: [attemptId], references: [id])

  @@unique([attemptId, questionId])
  @@map("attempt_answers")
}
```

### 2.6 skill_scores

```prisma
// Aggregated per attempt, used for heatmap + analytics
model SkillScore {
  id          String    @id @default(cuid())
  userId      String
  attemptId   String
  skill       SkillType // listening | reading | writing
  score       Float     // 0-100 percentage
  weekNumber  Int       // ISO week number
  year        Int
  recordedAt  DateTime  @default(now())

  attempt Attempt @relation(fields: [attemptId], references: [id])

  @@map("skill_scores")
  @@index([userId, skill, year, weekNumber])
}
```

### 2.7 class_sessions & session_attendances

```prisma
model ClassSession {
  id              String        @id @default(cuid())
  classId         String
  lessonTopic     String?
  notes           String?
  sessionDate     DateTime
  startTime       DateTime
  endTime         DateTime
  actualStartTime DateTime?
  actualEndTime   DateTime?
  status          SessionStatus // scheduled | completed_pending | approved | rejected | paid
  rejectionReason String?
  submittedAt     DateTime?
  approvedAt      DateTime?
  createdAt       DateTime      @default(now())

  class       Class               @relation(fields: [classId], references: [id])
  attendances SessionAttendance[]

  @@map("class_sessions")
}

enum SessionStatus {
  scheduled
  completed_pending
  approved
  rejected
  paid
}

model SessionAttendance {
  id               String           @id @default(cuid())
  sessionId        String
  studentId        String
  attendanceStatus AttendanceStatus  // present | absent_excused | absent_unexcused
  notes            String?

  session ClassSession @relation(fields: [sessionId], references: [id])

  @@unique([sessionId, studentId])
  @@map("session_attendances")
}

enum AttendanceStatus { present absent_excused absent_unexcused }
```

### 2.8 payroll entities

```prisma
model TeacherPayRate {
  id            String   @id @default(cuid())
  teacherId     String
  rateType      RateType // per_session | per_hour
  rateAmount    Float    // VND
  effectiveFrom DateTime
  createdAt     DateTime @default(now())

  teacher User @relation(fields: [teacherId], references: [id])

  @@map("teacher_pay_rates")
}

enum RateType { per_session per_hour }

model PayrollPeriod {
  id           String         @id @default(cuid())
  teacherId    String
  periodStart  DateTime
  periodEnd    DateTime
  totalAmount  Float?
  status       PayrollStatus  // draft | finalized | paid
  notes        String?
  finalizedAt  DateTime?
  paidAt       DateTime?
  createdAt    DateTime       @default(now())

  teacher User @relation(fields: [teacherId], references: [id])

  @@map("payroll_periods")
}

enum PayrollStatus { draft finalized paid }
```

### 2.9 invoicing entities

```prisma
model StudentTuitionRate {
  id            String   @id @default(cuid())
  studentId     String
  rateAmount    Float    // VND/month
  effectiveFrom DateTime
  notes         String?
  createdAt     DateTime @default(now())

  student User @relation(fields: [studentId], references: [id])

  @@map("student_tuition_rates")
}

model StudentInvoice {
  id          String        @id @default(cuid())
  studentId   String
  periodStart DateTime
  periodEnd   DateTime
  totalAmount Float
  status      InvoiceStatus // unpaid | partially_paid | paid | void
  issuedAt    DateTime      @default(now())
  dueDate     DateTime?
  notes       String?

  student  User             @relation(fields: [studentId], references: [id])
  payments TuitionPayment[]

  @@map("student_invoices")
}

enum InvoiceStatus { unpaid partially_paid paid void }

model TuitionPayment {
  id                   String   @id @default(cuid())
  invoiceId            String
  amount               Float
  paymentMethod        String   // cash | bank_transfer | momo | zalo_pay
  transactionReference String?
  notes                String?
  paidAt               DateTime @default(now())
  recordedBy           String   // Admin user id

  invoice StudentInvoice @relation(fields: [invoiceId], references: [id])

  @@map("tuition_payments")
}
```

### 2.10 notifications & refresh_tokens

```prisma
model Notification {
  id          String           @id @default(cuid())
  recipientId String
  senderId    String?
  type        NotificationType
  message     String
  data        Json?            // Extra context (assignmentId, etc.)
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  recipient User  @relation("ReceivedNotifications", fields: [recipientId], references: [id])
  sender    User? @relation("SentNotifications", fields: [senderId], references: [id])

  @@map("notifications")
  @@index([recipientId, readAt])
}

enum NotificationType {
  new_assignment
  deadline_reminder
  grading_required
  graded
  weak_student_alert
  account_approved
  account_suspended
  session_approved
  session_rejected
  payroll_finalized
  invoice_created
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])

  @@map("refresh_tokens")
  @@index([userId])
}
```

---

## 3. MongoDB — Mongoose Schemas

### 3.1 Question

```typescript
// database/mongoose/schemas/question.schema.ts
@Schema({ collection: 'questions', timestamps: true })
export class Question {
  @Prop({ required: true, min: 1, max: 6 })
  hskLevel: number;

  @Prop({ required: true, enum: ['listening', 'reading', 'writing'] })
  skill: string;

  @Prop({
    required: true,
    enum: [
      'listen_mcq', 'listen_true_false', 'listen_dialogue_mcq',
      'read_mcq', 'read_true_false', 'read_gap_fill', 'read_sentence_order',
      'write_short', 'write_paragraph'
    ]
  })
  subType: string;

  @Prop({ type: Object, required: true })
  content: {
    instruction?: string;
    passage?: string;        // Reading
    question?: string;
    audioUrl?: string;       // Listening
    audioDuration?: number;  // seconds
    transcript?: string;     // Hidden from student
    prompt?: string;         // Writing
    keywords?: string[];     // Writing hints
    imageUrl?: string;       // Optional
    blanks?: string[];       // Gap fill blank ids
    wordBank?: string[];     // Gap fill word choices
    sentences?: Array<{ id: string; text: string }>;  // Sentence order
  };

  @Prop({ type: Array })
  options: Array<{ key: string; text: string }>;  // MCQ options

  @Prop({ type: Schema.Types.Mixed })
  correctAnswer: string | string[] | Record<string, string> | null;

  @Prop()
  explanation?: string;

  @Prop({ default: 1 })
  pointValue: number;

  @Prop()
  maxScore?: number;       // Writing only (5 or 10)

  @Prop()
  rubric?: string;         // Writing scoring rubric

  @Prop({ required: true })
  createdBy: string;       // PostgreSQL user UUID

  @Prop({ type: [String], default: [] })
  tags: string[];
}

// Indexes
QuestionSchema.index({ hskLevel: 1, skill: 1, subType: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ content: 'text' });  // Full-text search
```

### 3.2 Flashcard

```typescript
@Schema({ collection: 'flashcards', timestamps: true })
export class Flashcard {
  @Prop({ required: true })
  chineseWord: string;       // 汉字

  @Prop({ required: true })
  pinyin: string;            // pīnyīn

  @Prop({ required: true })
  vietnameseMeaning: string;

  @Prop()
  englishMeaning?: string;

  @Prop({ required: true, min: 1, max: 6 })
  hskLevel: number;

  @Prop()
  exampleSentence?: string;  // Chinese example

  @Prop()
  exampleTranslation?: string;

  @Prop()
  audioUrl?: string;         // Cloudinary pronunciation audio

  @Prop({ type: [String], default: [] })
  tags: string[];            // ['noun', 'family', 'hsk1']
}

FlashcardSchema.index({ hskLevel: 1 });
FlashcardSchema.index({ chineseWord: 1 }, { unique: true });
```

### 3.3 UserFlashcardState

```typescript
@Schema({ collection: 'user_flashcard_states', timestamps: true })
export class UserFlashcardState {
  @Prop({ required: true })
  userId: string;              // PostgreSQL user UUID

  @Prop({ type: Types.ObjectId, ref: 'Flashcard', required: true })
  flashcardId: Types.ObjectId;

  @Prop({ default: 0 })
  repetitions: number;         // Consecutive successful reviews

  @Prop({ default: 1 })
  interval: number;            // Days until next review

  @Prop({ default: 2.5 })
  easeFactor: number;          // SM-2 ease factor (min 1.3)

  @Prop({ default: () => new Date() })
  nextReviewDate: Date;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 0 })
  correctReviews: number;      // Reviews with rating >= 3
}

UserFlashcardStateSchema.index({ userId: 1, flashcardId: 1 }, { unique: true });
UserFlashcardStateSchema.index({ userId: 1, nextReviewDate: 1 });  // Review queue
```

---

## 4. Cross-Database Reference Pattern

```
PostgreSQL: Assignment.questionIds = ["6688abc123", "6688abc456"]
                                            │
                                            ▼ (Service layer join)
MongoDB: db.questions.find({ _id: { $in: questionIds } })
```

> ⚠️ **Không có FK giữa 2 DB** — Nếu MongoDB document bị xóa, PostgreSQL vẫn giữ ID orphan.  
> **Giải pháp**: Không hard-delete questions; dùng soft-delete (`isDeleted: true`).

---

## 5. Key Indexes Summary

| Table / Collection | Index | Mục đích |
|---|---|---|
| `users` | `email UNIQUE` | Login lookup |
| `classes` | `enrollmentCode UNIQUE` | Enrollment |
| `class_enrollments` | `(classId, studentId) UNIQUE` | Prevent duplicate enroll |
| `attempts` | `(userId, assignmentId) UNIQUE` | 1 attempt per student |
| `notifications` | `(recipientId, readAt)` | Unread query |
| `skill_scores` | `(userId, skill, year, weekNumber)` | Heatmap query |
| `refresh_tokens` | `tokenHash UNIQUE` | Token lookup |
| `questions` | `(hskLevel, skill, subType)` | Filter query |
| `questions` | `content TEXT` | Full-text search |
| `flashcards` | `chineseWord UNIQUE` | Deduplicate |
| `user_flashcard_states` | `(userId, flashcardId) UNIQUE` | 1 state per user/card |
| `user_flashcard_states` | `(userId, nextReviewDate)` | Review queue |

---

## 6. Migration Strategy

```bash
# Development: Auto-migrate
pnpm prisma migrate dev --name <description>

# Production: Apply existing migrations
pnpm prisma migrate deploy

# MongoDB: No migrations (schema-less)
# Mongoose schemas handle validation at application level
# Add new fields as optional with defaults
```
