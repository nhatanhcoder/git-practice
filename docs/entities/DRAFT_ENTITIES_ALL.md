# File: _INDEX.md

# 🗃️ Entities Index

> Bảng tra cứu nhanh: entity → DB → file spec → actor liên quan → flow liên quan

---

## 🐘 PostgreSQL Entities

| Entity | File | Status | Actors | Flows liên quan |
|--------|------|--------|--------|----------------|
| **User** | [ENTITY_USER.md](postgres/ENTITY_USER.md) | ✅ | Admin, Teacher, Student | FLOW_AUTH |
| **Class** | [ENTITY_CLASS.md](postgres/ENTITY_CLASS.md) | ✅ | Teacher, Student | FLOW_ENROLLMENT |
| **ClassEnrollment** | [ENTITY_CLASS_ENROLLMENT.md](postgres/ENTITY_CLASS_ENROLLMENT.md) | ✅ | Teacher, Student | FLOW_ENROLLMENT |
| **Lesson** | [ENTITY_LESSON.md](postgres/ENTITY_LESSON.md) | ✅ | Teacher, Student | LESSON_FLOW |
| **LessonAssignment** | [ENTITY_LESSON_ASSIGNMENT.md](postgres/ENTITY_LESSON_ASSIGNMENT.md) | ✅ | Teacher, Student | LESSON_FLOW |
| **Assignment** | [ENTITY_ASSIGNMENT.md](postgres/ENTITY_ASSIGNMENT.md) | ✅ | Teacher, Student | FLOW_ASSIGNMENT_LIFECYCLE |
| **Attempt** | [ENTITY_ATTEMPT.md](postgres/ENTITY_ATTEMPT.md) | ✅ | Student, Teacher | FLOW_ASSIGNMENT_LIFECYCLE, FLOW_GRADING |
| **AttemptAnswer** | [ENTITY_ATTEMPT_ANSWER.md](postgres/ENTITY_ATTEMPT_ANSWER.md) | ✅ | Student, Teacher | FLOW_GRADING |
| **ClassSession** | [ENTITY_CLASS_SESSION.md](postgres/ENTITY_CLASS_SESSION.md) | ✅ | Teacher, Admin | FLOW_SESSION_ATTENDANCE, FLOW_PAYROLL_CYCLE |
| **SessionAttendance** | [ENTITY_SESSION_ATTENDANCE.md](postgres/ENTITY_SESSION_ATTENDANCE.md) | ✅ | Teacher, Student | FLOW_SESSION_ATTENDANCE |
| **TeacherPayRate** | [ENTITY_TEACHER_PAY_RATE.md](postgres/ENTITY_TEACHER_PAY_RATE.md) | ✅ | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **PayrollPeriod** | [ENTITY_PAYROLL_PERIOD.md](postgres/ENTITY_PAYROLL_PERIOD.md) | ✅ | Admin, Teacher | FLOW_PAYROLL_CYCLE |
| **StudentTuitionRate** | [ENTITY_STUDENT_TUITION_RATE.md](postgres/ENTITY_STUDENT_TUITION_RATE.md) | ✅ | Admin, Student | FLOW_TUITION |
| **StudentInvoice** | [ENTITY_STUDENT_INVOICE.md](postgres/ENTITY_STUDENT_INVOICE.md) | ✅ | Admin, Student | FLOW_TUITION |
| **TuitionPayment** | [ENTITY_TUITION_PAYMENT.md](postgres/ENTITY_TUITION_PAYMENT.md) | ✅ | Admin, Student | FLOW_TUITION |
| **Notification** | [ENTITY_NOTIFICATION.md](postgres/ENTITY_NOTIFICATION.md) | ✅ | All | FLOW_NOTIFICATION |
| **QuizRoom** | [ENTITY_QUIZ_ROOM.md](postgres/ENTITY_QUIZ_ROOM.md) | ✅ | Teacher (host), Student | FLOW_QUIZ_ROOM |
| **QuizParticipant** | [ENTITY_QUIZ_PARTICIPANT.md](postgres/ENTITY_QUIZ_PARTICIPANT.md) | ✅ | Student | FLOW_QUIZ_ROOM |

---

## 🍃 MongoDB Entities

| Entity | File | Status | Actors | Flows liên quan |
|--------|------|--------|--------|----------------|
| **Question** | [ENTITY_QUESTION.md](mongodb/ENTITY_QUESTION.md) | ✅ | Teacher | FLOW_ASSIGNMENT_LIFECYCLE |
| **Flashcard** | [ENTITY_FLASHCARD.md](mongodb/ENTITY_FLASHCARD.md) | ✅ | Student | FLOW_SRS_REVIEW |
| **UserFlashcardState** | [ENTITY_USER_FLASHCARD_STATE.md](mongodb/ENTITY_USER_FLASHCARD_STATE.md) | ✅ | Student | FLOW_SRS_REVIEW |
| **UserSavedWord** | [ENTITY_USER_SAVED_WORD.md](mongodb/ENTITY_USER_SAVED_WORD.md) | ✅ | Student | FLOW_WORD_BANK |
| ~~Lesson~~ | [ENTITY_LESSON.md](mongodb/ENTITY_LESSON.md) | ⚠️ Moved to PG | — | — |

---

## Sprint → Entities Introduced

| Sprint | New Entities |
|--------|-------------|
| S0 | *(schema scaffold only)* |
| S1 | `User`, `Notification` |
| S2 | `Class`, `ClassEnrollment`, `Lesson`, `LessonAssignment` |
| S3 | `Question`, `Assignment` |
| S4 | `Attempt`, `AttemptAnswer` |
| S5 | `Flashcard`, `UserFlashcardState`, `UserSavedWord` |
| S6 | `ClassSession`, `SessionAttendance`, `TeacherPayRate`, `PayrollPeriod` |
| S7 | `StudentTuitionRate`, `StudentInvoice`, `TuitionPayment` |
| S8 | `QuizRoom`, `QuizParticipant` |

---

## Status Key

| Symbol | Nghĩa |
|--------|-------|
| ✅ | Spec đầy đủ |
| 🚧 | Stub, cần bổ sung |
| ⚠️ | Gap hoặc đã di chuyển |


---


# File: mongodb\ENTITY_FLASHCARD.md

# ENTITY_FLASHCARD

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  hanzi: string,           // Chinese character(s), e.g. "学习"
  pinyin: string,          // Romanization, e.g. "xuéxí"
  meaning: string,         // Vietnamese translation, e.g. "học tập"
  exampleSentence?: string,   // Example in Chinese
  examplePinyin?: string,     // Pinyin for example sentence
  exampleMeaning?: string,    // Vietnamese translation of example
  audioUrl?: string,       // Pronunciation audio (Supabase Storage)
  tags?: string[],         // Optional: ['verb', 'hsk2-core', ...]
  createdAt: Date,
  updatedAt: Date
}
```

## Business Rules

- Seeded by Admin / system — students do not create flashcards directly
- `hskLevel` used to filter decks (S-SRS-1)
- Students can click any `hanzi` in lesson/passage to save it as `UserSavedWord` (S-SRS-6)
- `UserFlashcardState` tracks per-user SRS progress for each flashcard
- `audioUrl` optional — system still functional without audio


---


# File: mongodb\ENTITY_LESSON.md

# ENTITY_LESSON (MongoDB — DEPRECATED)

> **Status**: ⚠️ Moved to PostgreSQL  
> **Reason**: Lesson requires JOIN with Class and Assignment for ordering and analytics.  
> **New location**: [postgres/ENTITY_LESSON.md](../postgres/ENTITY_LESSON.md)

---

This MongoDB stub has been superseded. Please refer to the PostgreSQL spec above for the full field definition, relationships, and business rules.


---


# File: mongodb\ENTITY_QUESTION.md

# ENTITY_QUESTION

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  skill: 'listening' | 'reading' | 'writing',
  subType: 
    // Listening
    | 'multiple_choice_single' | 'true_false_not_given' | 'short_answer'
    // Reading
    | 'multiple_choice_multi' | 'fill_in_blank' | 'sentence_ordering' | 'matching'
    // Writing
    | 'sentence_construction' | 'essay',
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  difficulty: 'easy' | 'medium' | 'hard',
  content: {
    audioUrl?: string,         // Listening: Supabase Storage URL
    transcript?: string,       // Listening: optional text transcript
    passage?: string,          // Reading: text passage
    prompt?: string,           // Writing: question prompt
    rubric?: string,           // Writing: grading rubric for teacher/AI
  },
  options?: Array<{            // MCQ types only
    id: string,                // e.g. 'A', 'B', 'C', 'D'
    text: string
  }>,
  correctAnswer: string | string[] | null,
  // string for single MCQ; string[] for multi/ordering/matching; null for Writing
  explanation: string | null,  // Shown to student after grading
  createdBy: string,           // PG User uuid (teacher)
  createdAt: Date,
  updatedAt: Date
}
```

## Business Rules

- Questions stored in MongoDB for flexible schema (different structures per subType)
- `_id` (as string) referenced in `Assignment.questionIds[]` and `AttemptAnswer.questionId`
- Teacher can edit/delete own questions unless used in a published Assignment
- `difficulty` field used by Skill Drill (S-DRILL-1) to filter questions
- Audio files stored in Supabase Storage; `content.audioUrl` is the signed URL
- `correctAnswer = null` for writing types — graded manually + AI suggestion


---


# File: mongodb\ENTITY_USER_FLASHCARD_STATE.md

# ENTITY_USER_FLASHCARD_STATE

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  userId: string,          // PG User uuid
  flashcardId: ObjectId,   // → Flashcard._id
  
  // SM-2 Algorithm fields
  easeFactor: number,      // Default 2.5; range [1.3, ∞)
  repetitionsCount: number, // Successful reviews in a row; default 0
  intervalDays: number,    // Days until next review; default 1
  nextReviewDate: Date,    // Scheduled next review date
  lastReviewedAt?: Date,   // Last time student reviewed this card
  
  // Personal save flag
  isSavedByUser: boolean,  // true if student manually added to personal list (S-SRS-7)
  
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

- `{ userId: 1, flashcardId: 1 }` — unique compound index
- `{ userId: 1, nextReviewDate: 1 }` — for fetching due cards efficiently

## Business Rules

- Created on first interaction (review or manual save)
- SM-2 update on each rating:
  - **Again**: `repetitionsCount = 0`, `intervalDays = 1`, `easeFactor -= 0.2`
  - **Hard**: `intervalDays × 1.2`, `easeFactor -= 0.15`
  - **Good**: `intervalDays × easeFactor`, `easeFactor` unchanged
  - **Easy**: `intervalDays × easeFactor × 1.3`, `easeFactor += 0.15`
- `easeFactor` clamped to minimum 1.3
- Due cards = `nextReviewDate <= now` for the user
- `isSavedByUser = true` marks cards added via S-SRS-7 (personal study list)

> 📄 Full SM-2 formula: docs/architecture/SRS_ALGORITHM.md


---


# File: mongodb\ENTITY_USER_SAVED_WORD.md

# ENTITY_USER_SAVED_WORD

> **Status**: ✅ Full spec  
> **DB**: MongoDB  
> **New entity** — supports S-SRS-6 (click-to-save word)  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Schema

```typescript
{
  _id: ObjectId,
  userId: string,          // PG User uuid
  hanzi: string,           // The saved Chinese word/character
  pinyin: string,          // Romanization
  meaning: string,         // Vietnamese meaning (looked up at save time)
  sourceType: 'lesson' | 'passage' | 'flashcard_browser' | 'other',
  sourceId?: string,       // ID of the source (lessonId / assignmentId)
  note?: string,           // Optional personal note by student
  savedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

- `{ userId: 1 }` — for fetching user's word bank
- `{ userId: 1, hanzi: 1 }` — unique compound (prevent duplicate saves)

## Business Rules

- Created when student clicks on a word anywhere in the app (S-SRS-6):
  - Lesson content
  - Reading passage in Assignment
  - Flashcard browser
- `hanzi` + `pinyin` + `meaning` copied at save time (not dynamically fetched)
- Duplicate `(userId, hanzi)` → upsert (update savedAt, note)
- Student can delete from kho từ (S-SRS-7)
- Words in kho từ can be started as a custom SRS review session (S-SRS-7)
- Does **not** create a `UserFlashcardState` automatically — only when student explicitly starts review from kho từ


---


# File: postgres\ENTITY_ASSIGNMENT.md

# ENTITY_ASSIGNMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| title | varchar(300) | no | Display name |
| type | enum | no | `homework` / `mock_test` |
| dueDate | DateTime | yes | Deadline; null = no deadline |
| timeLimitMinutes | int | yes | Only for `mock_test`; null = no limit |
| status | enum | no | `draft` / `published` |
| questionIds | text[] | no | Ordered array of MongoDB Question `_id` strings |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| Attempt[] | one-to-many | Student attempts on this assignment |
| LessonAssignment[] | one-to-many | Lessons this assignment is linked to |

## Business Rules

- Only `published` assignments are visible to students
- `timeLimitMinutes` required when `type = mock_test`
- Cannot delete/edit assignment that has at least 1 `Attempt`
- `questionIds` references MongoDB `Question._id` — ordering matters (determines question display order)
- When published → triggers `new_assignment` Notification for all active enrolled students
- Submission count & pending grading count computed from `Attempt` records


---


# File: postgres\ENTITY_ATTEMPT.md

# ENTITY_ATTEMPT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| assignmentId | uuid | no | FK → Assignment |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `in_progress` / `submitted` / `graded` |
| startedAt | DateTime | no | When student clicked "Bắt đầu" |
| submittedAt | DateTime | yes | When submitted (manual or auto) |
| gradedAt | DateTime | yes | When teacher finishes grading |
| totalScore | float | yes | Null until graded; sum of all AttemptAnswer scores |
| maxScore | float | yes | Maximum possible score for this assignment |
| isOfficialGrade | bool | no | `true` for teacher-assigned; `false` for Skill Drill |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(assignmentId, studentId)` where `isOfficialGrade = true` — one official attempt per assignment

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| assignment | many-to-one | → Assignment |
| student | many-to-one | → User |
| AttemptAnswer[] | one-to-many | Per-question answers |

## Business Rules

- Created when student clicks "Bắt đầu" — status = `in_progress`
- Auto-save via `AttemptAnswer` upserts every 2s (no Attempt update needed)
- `submitted` → locked, no further edits to AttemptAnswer
- MCQ answers: `autoScore` calculated on submit; `totalScore` updated immediately for MCQ-only assignments
- Writing answers: `totalScore` null until teacher completes grading (`graded`)
- Mock test: if `timeLimitMinutes` elapsed → system auto-submits (scheduler or client-side trigger)
- On `graded` → triggers `graded` Notification to student
- Skill Drill attempts use `isOfficialGrade = false`, no unique constraint → multiple attempts allowed


---


# File: postgres\ENTITY_ATTEMPT_ANSWER.md

# ENTITY_ATTEMPT_ANSWER

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| attemptId | uuid | no | FK → Attempt |
| questionId | varchar | no | MongoDB Question `_id` (string reference) |
| selectedOptions | text[] | yes | For MCQ types — array of selected option IDs |
| writtenAnswer | text | yes | For Writing types — student's text |
| autoScore | float | yes | Auto-calculated on submit (MCQ); null for Writing |
| teacherScore | float | yes | Manually entered by teacher |
| aiSuggestedScore | float | yes | Gemini-suggested score for Writing (T-GRADE-3) |
| aiFeedback | text | yes | Gemini reasoning / feedback |
| teacherFeedback | text | yes | Teacher's written comment |
| isCorrect | bool | yes | Null for Writing; true/false for MCQ |
| savedAt | DateTime | yes | Last auto-save timestamp |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(attemptId, questionId)` — one answer record per question per attempt

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| attempt | many-to-one | → Attempt |

## Business Rules

- Created/upserted via auto-save every 2s while `Attempt.status = in_progress`
- `autoScore` computed on `Attempt` submit for MCQ; Writing leaves it null
- `aiSuggestedScore` filled when teacher clicks "AI Suggest" (calls Gemini API)
- `teacherScore` is the final authoritative score; AI score is suggestion only
- When teacher saves all answers → `Attempt.status = graded`, `Attempt.totalScore` = sum of final scores
- `isCorrect` used for MCQ analytics (score charts, weak student detection)


---


# File: postgres\ENTITY_CLASS.md

# ENTITY_CLASS

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| name | varchar(200) | no | Display name of the class |
| hskLevel | int | no | 1–9 |
| enrollmentCode | char(8) | no | Unique, auto-generated, used by students to join |
| status | enum | no | `active` / `archived` |
| description | text | yes | Optional class description |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User (teacherId) |
| ClassEnrollment[] | one-to-many | Students in this class |
| Assignment[] | one-to-many | Assignments assigned to this class |
| Lesson[] | one-to-many | Lessons in this class (ordered by orderIndex) |
| ClassSession[] | one-to-many | Logged teaching sessions |
| QuizRoom[] | one-to-many | Quiz rooms created for this class |

## Business Rules

- `enrollmentCode` must be 8 chars, alphanumeric, unique globally
- Students can only join `active` classes
- Archiving a class does not delete existing enrollments or assignments
- Only the owning teacher can modify the class (`teacherId === req.user.id`)
- `hskLevel` drives which flashcard sets are relevant for students


---


# File: postgres\ENTITY_CLASS_ENROLLMENT.md

# ENTITY_CLASS_ENROLLMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `active` / `dropped` |
| joinedAt | DateTime | no | Timestamp when student joined |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(classId, studentId)` — a student can only enroll once per class

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| student | many-to-one | → User (role=student) |

## Business Rules

- Created when student submits a valid `enrollmentCode`
- `status = active` on creation
- `status = dropped` when student leaves (soft delete — keep history)
- Student can only view class content when `status = active`
- Teacher sees all students with `status = active` in their class list
- `attendanceRate` is computed from SessionAttendance records (available after Sprint 6)


---


# File: postgres\ENTITY_CLASS_SESSION.md

# ENTITY_CLASS_SESSION

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| scheduledDate | Date | no | Planned date of the session |
| scheduledStart | Time | no | Planned start time |
| scheduledEnd | Time | no | Planned end time |
| actualStart | DateTime | yes | Recorded when teacher begins session |
| actualEnd | DateTime | yes | Recorded when teacher ends session |
| topic | varchar(300) | no | Session topic / lesson summary |
| notes | text | yes | Teacher's additional notes |
| status | enum | no | `scheduled` / `in_progress` / `completed_pending` / `approved` / `rejected` |
| rejectionReason | text | yes | Filled by Admin on reject |
| payrollPeriodId | uuid | yes | FK → PayrollPeriod — set when included in a payroll period |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| SessionAttendance[] | one-to-many | Per-student attendance for this session |
| PayrollPeriod | many-to-one | → PayrollPeriod (nullable until included in payroll) |

## Business Rules

- Status lifecycle: `scheduled → in_progress → completed_pending → approved / rejected`
- Only `approved` sessions are eligible for payroll calculation
- `actualStart` vs `scheduledStart` diff → detect late/early starts
- On `completed_pending` → triggers `session_submitted_for_review` Notification to Admin
- On `approved` → triggers `session_approved` Notification to Teacher
- On `rejected` + `rejectionReason` → triggers `session_rejected` Notification to Teacher
- Only teacher who owns the session can log/submit it


---


# File: postgres\ENTITY_LESSON.md

# ENTITY_LESSON

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL *(moved from MongoDB — needs JOIN with Class/Assignment)*  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| classId | uuid | no | FK → Class |
| teacherId | uuid | no | FK → User (role=teacher) |
| title | varchar(300) | no | Lesson title |
| description | text | yes | Rich text / markdown description |
| contentType | enum | no | `text` / `video` / `document` / `mixed` |
| contentUrl | varchar | yes | Video URL or document URL (Supabase Storage) |
| orderIndex | int | no | Display order within the class (1-based, unique per class) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(classId, orderIndex)` — no two lessons in same class with same order

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| class | many-to-one | → Class |
| teacher | many-to-one | → User |
| LessonAssignment[] | one-to-many | Assignments linked to this lesson (join table) |

## Business Rules

- Created/managed exclusively by the teacher who owns the class (T-LESSON-1)
- `orderIndex` determines sequence shown to students (T-LESSON-2)
- To reorder: update `orderIndex` values (transactional swap)
- Assignments linked via `LessonAssignment` join table (M:N) — one assignment can appear in multiple lessons
- Student sees the lesson content + linked assignments (S-LESSON-1, S-LESSON-3)
- Cannot delete lesson if linked assignments have active Attempts

> Note: Originally planned as MongoDB entity. Moved to PostgreSQL to support JOIN queries with Class/Assignment needed for analytics and ordering.


---


# File: postgres\ENTITY_LESSON_ASSIGNMENT.md

# ENTITY_LESSON_ASSIGNMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> **Type**: Join table (Lesson ↔ Assignment, M:N)  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| lessonId | uuid | no | FK → Lesson |
| assignmentId | uuid | no | FK → Assignment |
| createdAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(lessonId, assignmentId)`

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| lesson | many-to-one | → Lesson |
| assignment | many-to-one | → Assignment |

## Business Rules

- Created by teacher when linking an assignment to a lesson (T-LESSON-3)
- One assignment can be linked to multiple lessons (across the same class)
- Student navigating a lesson sees all linked assignments (S-LESSON-3)
- Deleting the link does not delete the assignment


---


# File: postgres\ENTITY_NOTIFICATION.md

# ENTITY_NOTIFICATION

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| userId | uuid | no | FK → User (recipient) |
| type | enum | no | See Notification Types below |
| referenceId | varchar | yes | ID of the referenced entity (e.g. assignmentId, sessionId) |
| referenceType | varchar | yes | Type of the reference (`assignment`/`attempt`/`invoice`/`session`) |
| isRead | bool | no | Default false |
| readAt | DateTime | yes | Null until user reads |
| payload | jsonb | yes | Extra data (e.g. `{ rejectionReason: "..." }`) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Notification Types (enum)

| Type | Recipient | Trigger |
|------|-----------|---------|
| `account_approved` | Teacher / Student | Admin approves pending account |
| `account_suspended` | Teacher / Student | Admin suspends account |
| `new_assignment` | Student | Teacher publishes assignment |
| `deadline_reminder` | Student | Scheduler: dueDate - 24h |
| `graded` | Student | Teacher completes grading |
| `new_invoice` | Student | Admin creates StudentInvoice |
| `session_submitted_for_review` | Admin | Teacher submits ClassSession |
| `session_approved` | Teacher | Admin approves session |
| `session_rejected` | Teacher | Admin rejects session (payload has reason) |
| `new_teacher_registration` | Admin | Teacher registers (status=pending) |
| `new_student_registration` | Admin | Student registers (status=pending) |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| user | many-to-one | → User (recipient) |

## Business Rules

- `referenceId` + `referenceType` allow frontend deep-linking (click → navigate to correct page)
- `payload` stores extra data that doesn't fit in referenceId (e.g. rejection reason text)
- Unread count computed from `isRead = false` for the current user
- Notifications are append-only — never deleted, only marked read


---


# File: postgres\ENTITY_PAYROLL_PERIOD.md

# ENTITY_PAYROLL_PERIOD

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| periodStart | Date | no | Start of the pay period (e.g. 2026-07-01) |
| periodEnd | Date | no | End of the pay period (e.g. 2026-07-31) |
| status | enum | no | `draft` / `finalized` / `paid` |
| totalSessions | int | no | Count of approved ClassSessions in this period |
| totalAmount | Decimal(12,2) | no | Computed from sessions × applicable rate |
| paidAt | DateTime | yes | Timestamp when Admin marks as paid |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User |
| ClassSession[] | one-to-many | Sessions included in this period (`payrollPeriodId` set on session) |

## Business Rules

- Created by Admin (A-PAY-4) in `draft` status
- System aggregates all `approved` ClassSessions for the teacher in `periodStart..periodEnd`
- `totalAmount` = sum of (session duration or count) × active `TeacherPayRate`
- `draft → finalized`: Admin reviews and confirms amount (A-PAY-5)
- `finalized → paid`: Admin marks after actual bank transfer (A-PAY-6)
- Once `finalized`, sessions linked to this period cannot be modified
- Teacher can view own PayrollPeriods (read-only)
- Fills "monthly payroll" slot in Admin Dashboard after Sprint 7


---


# File: postgres\ENTITY_QUIZ_PARTICIPANT.md

# ENTITY_QUIZ_PARTICIPANT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| roomId | uuid | no | FK → QuizRoom |
| userId | uuid | no | FK → User (role=student) |
| totalScore | int | no | Cumulative score across all questions (default 0) |
| rank | int | yes | Final rank (null until room finishes) |
| joinedAt | DateTime | no | When student entered the waiting room |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(roomId, userId)` — one slot per student per room

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| room | many-to-one | → QuizRoom |
| user | many-to-one | → User |

## Business Rules

- Created when student joins the room with a valid `code` and `room.status = waiting`
- `totalScore` updated via WebSocket after each question resolves
- Score formula: `basePoints × speedMultiplier` (faster = higher multiplier, TBD)
- Live leaderboard = `SELECT * FROM quiz_participants WHERE roomId = X ORDER BY totalScore DESC`
- `rank` computed and stored when room transitions to `finished`
- Quiz scores are **not** recorded in Attempt / official grade records


---


# File: postgres\ENTITY_QUIZ_ROOM.md

# ENTITY_QUIZ_ROOM

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| code | char(6) | no | Unique join code shown to students |
| hostId | uuid | no | FK → User (role=teacher, who created the room) |
| classId | uuid | yes | FK → Class (nullable — open rooms allowed) |
| status | enum | no | `waiting` / `active` / `finished` |
| questionIds | text[] | no | Ordered array of MongoDB Question `_id` strings |
| timeLimitPerQuestion | int | no | Seconds per question (countdown) |
| startedAt | DateTime | yes | When host clicks "Start" |
| finishedAt | DateTime | yes | When last question completes |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| host | many-to-one | → User (teacher) |
| class | many-to-one | → Class (optional) |
| QuizParticipant[] | one-to-many | Students in this room |

## Business Rules

- Created by teacher (host) — generates unique 6-char `code`
- Students join by entering `code` while `status = waiting`
- Host starts room → `status = active`, questions pushed via WebSocket to all participants
- Questions shown simultaneously to all participants; server-side timer per question
- Speed bonus: faster correct answers = higher points (formula TBD)
- `status = finished` after last question — leaderboard finalized
- Room expires / cleans up after 24h if never started
- **Requires WebSocket infrastructure** (Sprint 8)


---


# File: postgres\ENTITY_SESSION_ATTENDANCE.md

# ENTITY_SESSION_ATTENDANCE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| sessionId | uuid | no | FK → ClassSession |
| studentId | uuid | no | FK → User (role=student) |
| status | enum | no | `present` / `absent_excused` / `absent_unexcused` |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Constraints

- **Unique**: `(sessionId, studentId)` — one record per student per session

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| session | many-to-one | → ClassSession |
| student | many-to-one | → User |

## Business Rules

- Created by teacher during or after the session (T-SES-3)
- Teacher marks all students from ClassEnrollment of the class
- `attendanceRate` for a student = `present` count / total sessions in class (computed, not stored)
- Used to fill `attendanceRate` column in T-CLASS-4 after Sprint 6
- Only sessions with `status = approved` are counted for attendance rate calculation


---


# File: postgres\ENTITY_STUDENT_INVOICE.md

# ENTITY_STUDENT_INVOICE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| studentId | uuid | no | FK → User (role=student) |
| periodStart | Date | no | Start of billing period |
| periodEnd | Date | no | End of billing period |
| totalAmount | Decimal(12,2) | no | Total due for the period |
| paidAmount | Decimal(12,2) | no | Accumulated from TuitionPayment records (default 0) |
| status | enum | no | `unpaid` / `partially_paid` / `paid` / `void` |
| dueDate | Date | no | Payment deadline |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| student | many-to-one | → User |
| TuitionPayment[] | one-to-many | Payments recorded against this invoice |

## Business Rules

- Created by Admin (A-INV-2); `status = unpaid` on creation
- On creation → triggers `new_invoice` Notification to student
- `paidAmount` auto-updated as TuitionPayment records are created
- `status` computed/updated: `paidAmount = 0` → `unpaid`; `0 < paidAmount < totalAmount` → `partially_paid`; `paidAmount >= totalAmount` → `paid`
- `void`: Admin manually cancels; no further payments accepted
- Admin sees all invoices; Student sees only own invoices (S-BILL-1)
- Same table / backend, different query scope per role


---


# File: postgres\ENTITY_STUDENT_TUITION_RATE.md

# ENTITY_STUDENT_TUITION_RATE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| studentId | uuid | no | FK → User (role=student) |
| rateAmount | Decimal(10,2) | no | Monthly tuition amount in VND |
| billingCycle | enum | no | `monthly` (expandable later) |
| effectiveFrom | Date | no | Rate valid from this date |
| effectiveTo | Date | yes | Null = currently active rate |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| student | many-to-one | → User |
| StudentInvoice[] | one-to-many | Invoices generated using this rate |

## Business Rules

- Set exclusively by Admin (A-INV-1)
- To update rate: set `effectiveTo` on current, create new with new `effectiveFrom`
- Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`
- System uses active rate as default `totalAmount` when Admin creates a StudentInvoice
- Tuition model (per-class / monthly flat / package) must be agreed before Sprint 7


---


# File: postgres\ENTITY_TEACHER_PAY_RATE.md

# ENTITY_TEACHER_PAY_RATE

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| teacherId | uuid | no | FK → User (role=teacher) |
| rateType | enum | no | `per_session` / `per_hour` |
| rateAmount | Decimal(10,2) | no | Amount in VND |
| effectiveFrom | Date | no | Rate valid from this date |
| effectiveTo | Date | yes | Null = currently active rate |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| teacher | many-to-one | → User |

## Business Rules

- Set exclusively by Admin (A-PAY-1)
- To update rate: set `effectiveTo` on current, create new record with new `effectiveFrom`
- Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`
- Used when calculating PayrollPeriod totals: sum of (approved sessions × applicable rate)
- `rateType = per_session`: one rate amount per approved session
- `rateType = per_hour`: rate × actual hours (`actualEnd - actualStart`)


---


# File: postgres\ENTITY_TUITION_PAYMENT.md

# ENTITY_TUITION_PAYMENT

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| invoiceId | uuid | no | FK → StudentInvoice |
| amount | Decimal(10,2) | no | Amount paid in this transaction |
| paidAt | DateTime | no | Actual payment timestamp |
| paymentMethod | varchar(50) | no | e.g. `bank_transfer`, `cash`, `vietqr` |
| transactionReference | varchar(200) | yes | Bank ref / VietQR transaction ID |
| recordedBy | uuid | no | FK → User (Admin who recorded this payment) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| invoice | many-to-one | → StudentInvoice |
| recordedBy | many-to-one | → User (admin) |

## Business Rules

- Created by Admin (A-INV-3) when payment is received
- After creation: `StudentInvoice.paidAmount += amount`; `status` recomputed
- `amount` must be > 0 and ≤ (`invoice.totalAmount - invoice.paidAmount`)
- `transactionReference` used to match against VietQR bank statements
- Immutable once created — no edit/delete; Admin must void the invoice if correction needed


---


# File: postgres\ENTITY_USER.md

# ENTITY_USER

> **Status**: ✅ Full spec  
> **DB**: PostgreSQL  
> See [entities/_INDEX.md](../_INDEX.md) for cross-references

## Fields

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| id | uuid | no | Primary key |
| email | varchar(255) | no | Unique, used for login |
| passwordHash | varchar | no | bcrypt hash |
| role | enum | no | `admin` / `teacher` / `student` |
| status | enum | no | `pending` / `active` / `suspended` |
| nickname | varchar(100) | yes | Display name (student); full name (teacher/admin) |
| avatarUrl | varchar | yes | Supabase Storage URL |
| hskLevelGoal | int | yes | Student only (1–9) |
| bio | text | yes | Teacher only |
| lastLoginAt | DateTime | yes | Updated on every successful login (F1.2) |
| createdAt | DateTime | no | Auto |
| updatedAt | DateTime | no | Auto |

## Relationships

| Relation | Type | Notes |
|----------|------|-------|
| Class[] | one-to-many | Teacher has many classes (`teacherId`) |
| ClassEnrollment[] | one-to-many | Student enrolled in classes |
| Attempt[] | one-to-many | Student's exam attempts |
| ClassSession[] | one-to-many | Teacher's logged sessions |
| TeacherPayRate[] | one-to-many | Admin sets rates for teacher |
| PayrollPeriod[] | one-to-many | Teacher's payroll periods |
| StudentTuitionRate[] | one-to-many | Admin sets rates for student |
| StudentInvoice[] | one-to-many | Student's invoices |
| Notification[] | one-to-many | All roles receive notifications |
| QuizRoom[] | one-to-many | Teacher hosts quiz rooms |
| QuizParticipant[] | one-to-many | Student joins quiz rooms |

## Business Rules

- `email` must be unique across all roles
- `status = pending` on register; Admin must set `active` before user can login
- `status = suspended` → all JWT tokens rejected (401)
- Only `admin` role can have no class enrollment or session
- `hskLevelGoal` only meaningful for `student` role
- `lastLoginAt` must be updated in AuthService after successful token issuance


---

