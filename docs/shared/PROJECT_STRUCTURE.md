# 🏗️ Project Structure — HSK Learning Platform

> **Version**: 1.0  
> **Cập nhật**: 2026-06-29  
> **Tech Stack**: Next.js 14 (App Router) + Prisma + Mongoose + TypeScript

---

## Tổng quan kiến trúc

```
┌────────────────────────────────────────────────────────────────┐
│                        Next.js App                             │
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │   App Router  │    │  API Routes  │    │  Server Actions  │ │
│  │  (Frontend)   │───→│  (Backend)   │───→│   (Optional)     │ │
│  │  React + TSX  │    │  /api/v1/*   │    │                  │ │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘ │
│                             │                                  │
│  ┌──────────────────────────┴───────────────────────────────┐ │
│  │                   Service Layer                           │ │
│  │        Business logic, validation, error handling         │ │
│  └──────────┬────────────────────────────┬──────────────────┘ │
│             │                            │                     │
│  ┌──────────▼──────────┐    ┌───────────▼──────────────────┐ │
│  │   Prisma (ORM)      │    │   Mongoose (ODM)             │ │
│  │   PostgreSQL        │    │   MongoDB                    │ │
│  │   Supabase          │    │   Atlas                      │ │
│  └─────────────────────┘    └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Cây thư mục đầy đủ

```
hsk-platform/
│
├── 📄 .env.example                    # Template biến môi trường (COMMIT)
├── 📄 .env.local                      # Biến môi trường thật (KHÔNG COMMIT)
├── 📄 .eslintrc.json                  # ESLint config
├── 📄 .gitignore                      # Git ignore rules
├── 📄 .prettierrc                     # Prettier config
├── 📄 next.config.ts                  # Next.js configuration
├── 📄 package.json                    # Dependencies + scripts
├── 📄 tsconfig.json                   # TypeScript configuration
├── 📄 tailwind.config.ts              # Tailwind CSS configuration
├── 📄 postcss.config.js               # PostCSS (required by Tailwind)
├── 📄 middleware.ts                   # Next.js middleware (auth guard)
├── 📄 README.md                       # Hướng dẫn setup + chạy project
├── 📄 CHANGELOG.md                    # Lịch sử thay đổi
│
├── 📁 docs/                           # Tài liệu project (copy hoặc symlink)
│   ├── features.md
│   ├── DATABASE_SCHEMA.md
│   ├── USECASES.md
│   ├── API_DOCUMENTATION.md
│   ├── TECH_STACK.md
│   ├── CONVENTIONS.md
│   ├── TASK_BOARD.md
│   ├── FILE_INDEX.md
│   └── PROJECT_STRUCTURE.md
│
├── 📁 prisma/                         # ── PostgreSQL (Prisma ORM) ──
│   ├── 📄 schema.prisma              # Schema definition
│   ├── 📁 migrations/                # Auto-generated migration files
│   │   └── 📁 20260629_init/
│   │       └── migration.sql
│   └── 📄 seed.ts                    # Seed data script
│
├── 📁 public/                         # ── Static assets (accessible via URL) ──
│   ├── 📁 images/
│   │   ├── logo.svg
│   │   ├── logo-dark.svg
│   │   └── og-image.png              # Open Graph image for SEO
│   ├── 📁 icons/
│   │   ├── favicon.ico
│   │   └── apple-touch-icon.png
│   └── 📄 robots.txt
│
├── 📁 src/                            # ══════ SOURCE CODE ══════
│   │
│   ├── 📁 app/                        # ── Next.js App Router ──
│   │   │
│   │   ├── 📄 layout.tsx             # Root layout (html, body, providers)
│   │   ├── 📄 page.tsx               # Landing page (/)
│   │   ├── 📄 loading.tsx            # Global loading UI
│   │   ├── 📄 error.tsx              # Global error boundary
│   │   ├── 📄 not-found.tsx          # 404 page
│   │   ├── 📄 globals.css            # Global styles + Tailwind imports
│   │   │
│   │   ├── 📁 (auth)/                # ── Auth pages (no sidebar layout) ──
│   │   │   ├── 📄 layout.tsx         # Auth layout (centered, minimal)
│   │   │   ├── 📁 login/
│   │   │   │   └── 📄 page.tsx       # /login
│   │   │   └── 📁 register/
│   │   │       └── 📄 page.tsx       # /register
│   │   │
│   │   ├── 📁 (dashboard)/           # ── Protected pages (with sidebar) ──
│   │   │   ├── 📄 layout.tsx         # Dashboard layout (sidebar + navbar)
│   │   │   │
│   │   │   ├── 📁 student/           # ── Student pages ──
│   │   │   │   ├── 📄 page.tsx       # /student (dashboard home)
│   │   │   │   ├── 📁 classes/
│   │   │   │   │   ├── 📄 page.tsx   # /student/classes (danh sách lớp)
│   │   │   │   │   └── 📁 [classId]/
│   │   │   │   │       ├── 📄 page.tsx           # /student/classes/:id
│   │   │   │   │       └── 📁 assignments/
│   │   │   │   │           ├── 📄 page.tsx       # Danh sách bài tập
│   │   │   │   │           └── 📁 [assignmentId]/
│   │   │   │   │               ├── 📄 page.tsx   # Chi tiết assignment
│   │   │   │   │               └── 📁 attempt/
│   │   │   │   │                   └── 📄 page.tsx  # Giao diện làm bài
│   │   │   │   ├── 📁 results/
│   │   │   │   │   └── 📁 [attemptId]/
│   │   │   │   │       └── 📄 page.tsx   # Xem kết quả bài đã nộp
│   │   │   │   ├── 📁 flashcards/
│   │   │   │   │   ├── 📄 page.tsx       # /student/flashcards (browse)
│   │   │   │   │   └── 📁 review/
│   │   │   │   │       └── 📄 page.tsx   # /student/flashcards/review (SRS)
│   │   │   │   ├── 📁 progress/
│   │   │   │   │   └── 📄 page.tsx       # Heatmap + biểu đồ tiến bộ
│   │   │   │   └── 📁 profile/
│   │   │   │       └── 📄 page.tsx       # Hồ sơ cá nhân
│   │   │   │
│   │   │   ├── 📁 teacher/           # ── Teacher pages ──
│   │   │   │   ├── 📄 page.tsx       # /teacher (dashboard home)
│   │   │   │   ├── 📁 classes/
│   │   │   │   │   ├── 📄 page.tsx   # /teacher/classes (danh sách lớp)
│   │   │   │   │   ├── 📁 create/
│   │   │   │   │   │   └── 📄 page.tsx   # Form tạo lớp mới
│   │   │   │   │   └── 📁 [classId]/
│   │   │   │   │       ├── 📄 page.tsx   # Chi tiết lớp + dashboard
│   │   │   │   │       ├── 📁 students/
│   │   │   │   │       │   └── 📄 page.tsx   # Danh sách học sinh
│   │   │   │   │       ├── 📁 assignments/
│   │   │   │   │       │   ├── 📄 page.tsx       # Danh sách assignments
│   │   │   │   │       │   ├── 📁 create/
│   │   │   │   │       │   │   └── 📄 page.tsx   # Form tạo assignment
│   │   │   │   │       │   └── 📁 [assignmentId]/
│   │   │   │   │       │       ├── 📄 page.tsx   # Chi tiết + submissions
│   │   │   │   │       │       └── 📁 grade/
│   │   │   │   │       │           └── 📁 [attemptId]/
│   │   │   │   │       │               └── 📄 page.tsx  # Chấm writing
│   │   │   │   │       └── 📁 edit/
│   │   │   │   │           └── 📄 page.tsx   # Chỉnh sửa lớp
│   │   │   │   ├── 📁 questions/
│   │   │   │   │   ├── 📄 page.tsx       # /teacher/questions (ngân hàng)
│   │   │   │   │   ├── 📁 create/
│   │   │   │   │   │   └── 📄 page.tsx   # Form tạo câu hỏi
│   │   │   │   │   └── 📁 [questionId]/
│   │   │   │   │       └── 📁 edit/
│   │   │   │   │           └── 📄 page.tsx   # Chỉnh sửa câu hỏi
│   │   │   │   └── 📁 profile/
│   │   │   │       └── 📄 page.tsx   # Hồ sơ cá nhân
│   │   │   │
│   │   │   └── 📁 admin/             # ── Admin pages ──
│   │   │       ├── 📄 page.tsx       # /admin (dashboard home)
│   │   │       ├── 📁 users/
│   │   │       │   └── 📄 page.tsx   # /admin/users (quản lý users)
│   │   │       ├── 📁 api-quota/
│   │   │       │   └── 📄 page.tsx   # /admin/api-quota (monitoring)
│   │   │       └── 📁 profile/
│   │   │           └── 📄 page.tsx   # Hồ sơ cá nhân
│   │   │
│   │   └── 📁 api/                    # ── API Routes (Backend) ──
│   │       └── 📁 v1/
│   │           │
│   │           ├── 📁 auth/
│   │           │   ├── 📁 register/
│   │           │   │   └── 📄 route.ts    # POST /api/v1/auth/register
│   │           │   ├── 📁 login/
│   │           │   │   └── 📄 route.ts    # POST /api/v1/auth/login
│   │           │   ├── 📁 refresh/
│   │           │   │   └── 📄 route.ts    # POST /api/v1/auth/refresh
│   │           │   └── 📁 logout/
│   │           │       └── 📄 route.ts    # POST /api/v1/auth/logout
│   │           │
│   │           ├── 📁 users/
│   │           │   ├── 📁 me/
│   │           │   │   ├── 📄 route.ts    # GET, PATCH /api/v1/users/me
│   │           │   │   ├── 📁 avatar/
│   │           │   │   │   └── 📄 route.ts    # POST /api/v1/users/me/avatar
│   │           │   │   └── 📁 classes/
│   │           │   │       └── 📄 route.ts    # GET /api/v1/users/me/classes
│   │           │   └── 📄 route.ts        # (reserved for future use)
│   │           │
│   │           ├── 📁 admin/
│   │           │   ├── 📁 users/
│   │           │   │   ├── 📄 route.ts        # GET /api/v1/admin/users
│   │           │   │   └── 📁 [id]/
│   │           │   │       ├── 📁 approve/
│   │           │   │       │   └── 📄 route.ts    # PATCH .../approve
│   │           │   │       └── 📁 suspend/
│   │           │   │           └── 📄 route.ts    # PATCH .../suspend
│   │           │   └── 📁 api-quota/
│   │           │       └── 📄 route.ts    # GET /api/v1/admin/api-quota
│   │           │
│   │           ├── 📁 classes/
│   │           │   ├── 📄 route.ts        # GET, POST /api/v1/classes
│   │           │   ├── 📁 enroll/
│   │           │   │   └── 📄 route.ts    # POST /api/v1/classes/enroll
│   │           │   └── 📁 [classId]/
│   │           │       ├── 📄 route.ts        # GET, PATCH /api/v1/classes/:id
│   │           │       ├── 📁 leave/
│   │           │       │   └── 📄 route.ts    # PATCH .../leave
│   │           │       ├── 📁 students/
│   │           │       │   └── 📄 route.ts    # GET .../students
│   │           │       ├── 📁 assignments/
│   │           │       │   └── 📄 route.ts    # GET .../assignments
│   │           │       ├── 📁 attempts/
│   │           │       │   └── 📄 route.ts    # GET .../attempts
│   │           │       └── 📁 dashboard/
│   │           │           └── 📄 route.ts    # GET .../dashboard
│   │           │
│   │           ├── 📁 questions/
│   │           │   ├── 📄 route.ts            # GET, POST /api/v1/questions
│   │           │   ├── 📁 upload-audio/
│   │           │   │   └── 📄 route.ts        # POST .../upload-audio
│   │           │   └── 📁 [questionId]/
│   │           │       └── 📄 route.ts        # GET, PATCH, DELETE
│   │           │
│   │           ├── 📁 assignments/
│   │           │   ├── 📄 route.ts            # POST /api/v1/assignments
│   │           │   └── 📁 [assignmentId]/
│   │           │       └── 📄 route.ts        # GET, PATCH, DELETE
│   │           │
│   │           ├── 📁 attempts/
│   │           │   ├── 📄 route.ts            # POST /api/v1/attempts
│   │           │   └── 📁 [attemptId]/
│   │           │       ├── 📁 submit/
│   │           │       │   └── 📄 route.ts    # POST .../submit
│   │           │       ├── 📁 results/
│   │           │       │   └── 📄 route.ts    # GET .../results
│   │           │       └── 📁 answers/
│   │           │           └── 📁 [questionId]/
│   │           │               ├── 📄 route.ts    # PUT (auto-save)
│   │           │               └── 📁 grade/
│   │           │                   └── 📄 route.ts    # PATCH (teacher grade)
│   │           │
│   │           ├── 📁 skill-scores/
│   │           │   ├── 📁 heatmap/
│   │           │   │   └── 📄 route.ts    # GET .../heatmap
│   │           │   └── 📁 progress/
│   │           │       └── 📄 route.ts    # GET .../progress
│   │           │
│   │           ├── 📁 flashcards/
│   │           │   ├── 📄 route.ts            # GET /api/v1/flashcards
│   │           │   ├── 📁 review-queue/
│   │           │   │   └── 📄 route.ts        # GET .../review-queue
│   │           │   ├── 📁 stats/
│   │           │   │   └── 📄 route.ts        # GET .../stats
│   │           │   └── 📁 [flashcardId]/
│   │           │       ├── 📄 route.ts            # GET
│   │           │       ├── 📁 add-to-review/
│   │           │       │   └── 📄 route.ts        # POST
│   │           │       └── 📁 review/
│   │           │           └── 📄 route.ts        # POST (SM-2 rating)
│   │           │
│   │           └── 📁 notifications/
│   │               ├── 📄 route.ts            # GET /api/v1/notifications
│   │               ├── 📁 read-all/
│   │               │   └── 📄 route.ts        # PATCH .../read-all
│   │               └── 📁 [id]/
│   │                   └── 📁 read/
│   │                       └── 📄 route.ts    # PATCH .../read
│   │
│   ├── 📁 components/                # ── Shared React Components ──
│   │   │
│   │   ├── 📁 ui/                    # shadcn/ui base components
│   │   │   ├── 📄 button.tsx
│   │   │   ├── 📄 input.tsx
│   │   │   ├── 📄 label.tsx
│   │   │   ├── 📄 card.tsx
│   │   │   ├── 📄 dialog.tsx
│   │   │   ├── 📄 dropdown-menu.tsx
│   │   │   ├── 📄 select.tsx
│   │   │   ├── 📄 table.tsx
│   │   │   ├── 📄 tabs.tsx
│   │   │   ├── 📄 badge.tsx
│   │   │   ├── 📄 avatar.tsx
│   │   │   ├── 📄 toast.tsx
│   │   │   ├── 📄 skeleton.tsx
│   │   │   ├── 📄 pagination.tsx
│   │   │   └── 📄 separator.tsx
│   │   │
│   │   ├── 📁 layout/                # Layout components
│   │   │   ├── 📄 Navbar.tsx          # Top navigation bar
│   │   │   ├── 📄 Sidebar.tsx         # Side menu (role-based)
│   │   │   ├── 📄 Footer.tsx          # Footer
│   │   │   ├── 📄 MobileNav.tsx       # Mobile hamburger menu
│   │   │   └── 📄 UserMenu.tsx        # Avatar dropdown (profile, logout)
│   │   │
│   │   ├── 📁 auth/                   # Auth-related components
│   │   │   ├── 📄 LoginForm.tsx
│   │   │   ├── 📄 RegisterForm.tsx
│   │   │   └── 📄 AuthGuard.tsx       # Route protection wrapper
│   │   │
│   │   ├── 📁 classes/                # Class management components
│   │   │   ├── 📄 ClassCard.tsx       # Card hiển thị thông tin lớp
│   │   │   ├── 📄 ClassList.tsx       # Grid/list các lớp
│   │   │   ├── 📄 CreateClassForm.tsx
│   │   │   ├── 📄 EditClassForm.tsx
│   │   │   ├── 📄 EnrollDialog.tsx    # Dialog nhập enrollment code
│   │   │   └── 📄 StudentTable.tsx    # Bảng danh sách học sinh
│   │   │
│   │   ├── 📁 questions/              # Question bank components
│   │   │   ├── 📄 QuestionCard.tsx
│   │   │   ├── 📄 QuestionList.tsx
│   │   │   ├── 📄 QuestionFilter.tsx  # Sidebar filter
│   │   │   ├── 📄 McqForm.tsx         # Form tạo MCQ
│   │   │   ├── 📄 ListeningForm.tsx   # Form tạo Listening
│   │   │   ├── 📄 ReadingForm.tsx     # Form tạo Reading
│   │   │   ├── 📄 WritingForm.tsx     # Form tạo Writing
│   │   │   ├── 📄 AudioUploader.tsx   # Upload audio component
│   │   │   └── 📄 QuestionPicker.tsx  # Chọn câu hỏi cho assignment
│   │   │
│   │   ├── 📁 assignments/            # Assignment components
│   │   │   ├── 📄 AssignmentCard.tsx
│   │   │   ├── 📄 AssignmentList.tsx
│   │   │   ├── 📄 CreateAssignmentForm.tsx
│   │   │   └── 📄 SubmissionTable.tsx # Bảng bài nộp (teacher view)
│   │   │
│   │   ├── 📁 exam/                   # Exam-taking components
│   │   │   ├── 📄 ExamLayout.tsx      # Layout giao diện làm bài
│   │   │   ├── 📄 McqQuestion.tsx     # Render MCQ (radio buttons)
│   │   │   ├── 📄 ListeningQuestion.tsx   # Audio player + MCQ
│   │   │   ├── 📄 ReadingQuestion.tsx     # Passage + MCQ
│   │   │   ├── 📄 WritingQuestion.tsx     # Textarea
│   │   │   ├── 📄 QuestionNav.tsx     # Navigation sidebar (câu 1, 2, 3...)
│   │   │   ├── 📄 CountdownTimer.tsx  # Timer cho mock test
│   │   │   ├── 📄 AutoSaveIndicator.tsx   # "Đã lưu ✓"
│   │   │   └── 📄 SubmitDialog.tsx    # Confirmation dialog
│   │   │
│   │   ├── 📁 grading/               # Grading components
│   │   │   ├── 📄 GradingPanel.tsx    # Panel chấm writing
│   │   │   ├── 📄 ScoreInput.tsx      # Input score 0-10
│   │   │   └── 📄 FeedbackEditor.tsx  # Rich text feedback
│   │   │
│   │   ├── 📁 results/               # Result display components
│   │   │   ├── 📄 ResultSummary.tsx   # Tổng hợp kết quả
│   │   │   ├── 📄 AnswerReview.tsx    # Xem lại đáp án từng câu
│   │   │   └── 📄 ScoreBadge.tsx      # Badge hiển thị điểm
│   │   │
│   │   ├── 📁 flashcards/            # Flashcard components
│   │   │   ├── 📄 FlashcardGrid.tsx   # Grid thẻ từ vựng
│   │   │   ├── 📄 FlashcardItem.tsx   # Một thẻ (hanzi + pinyin)
│   │   │   ├── 📄 FlashcardFlip.tsx   # Flip animation component
│   │   │   ├── 📄 ReviewCard.tsx      # Card trong phiên ôn tập
│   │   │   ├── 📄 RatingButtons.tsx   # Again/Hard/Good/Easy
│   │   │   ├── 📄 AudioButton.tsx     # Nút phát audio
│   │   │   └── 📄 SrsStats.tsx        # Dashboard SRS stats
│   │   │
│   │   ├── 📁 analytics/             # Analytics & charts
│   │   │   ├── 📄 SkillHeatmap.tsx    # Heatmap skill × week
│   │   │   ├── 📄 ProgressChart.tsx   # Line chart tiến bộ
│   │   │   ├── 📄 ScoreHistogram.tsx  # Phân bố điểm lớp
│   │   │   ├── 📄 CompletionRate.tsx  # Tỷ lệ hoàn thành
│   │   │   ├── 📄 WeakStudentAlert.tsx    # Cảnh báo HS yếu
│   │   │   └── 📄 ApiQuotaChart.tsx   # API usage chart
│   │   │
│   │   ├── 📁 notifications/         # Notification components
│   │   │   ├── 📄 NotificationBell.tsx    # Bell icon + badge count
│   │   │   ├── 📄 NotificationPanel.tsx   # Dropdown panel
│   │   │   └── 📄 NotificationItem.tsx    # Một notification row
│   │   │
│   │   └── 📁 shared/                # Truly shared/generic components
│   │       ├── 📄 DataTable.tsx       # Reusable data table
│   │       ├── 📄 SearchInput.tsx     # Search input with debounce
│   │       ├── 📄 FileUpload.tsx      # Generic file upload
│   │       ├── 📄 EmptyState.tsx      # Empty state illustration
│   │       ├── 📄 LoadingSpinner.tsx  # Loading spinner
│   │       ├── 📄 ConfirmDialog.tsx   # Generic confirmation dialog
│   │       ├── 📄 PageHeader.tsx      # Page title + breadcrumb
│   │       └── 📄 RoleBadge.tsx       # Badge hiển thị role
│   │
│   ├── 📁 lib/                        # ── Shared Utilities & Config ──
│   │   │
│   │   ├── 📄 prisma.ts              # Prisma client singleton
│   │   ├── 📄 mongodb.ts             # MongoDB connection (Mongoose)
│   │   ├── 📄 cloudinary.ts          # Cloudinary config + upload helper
│   │   ├── 📄 auth.ts                # JWT sign/verify, password hash
│   │   ├── 📄 api-response.ts        # apiSuccess(), apiError() helpers
│   │   ├── 📄 errors.ts              # Custom error classes (AppError)
│   │   ├── 📄 constants.ts           # App-wide constants
│   │   ├── 📄 utils.ts               # General utility functions
│   │   ├── 📄 rate-limit.ts          # Rate limiting logic (Upstash)
│   │   │
│   │   └── 📁 validations/           # Zod schemas (shared FE + BE)
│   │       ├── 📄 auth.schema.ts      # Register, login validation
│   │       ├── 📄 user.schema.ts      # Profile update validation
│   │       ├── 📄 class.schema.ts     # Create/edit class validation
│   │       ├── 📄 question.schema.ts  # Question CRUD validation
│   │       ├── 📄 assignment.schema.ts
│   │       ├── 📄 attempt.schema.ts
│   │       ├── 📄 flashcard.schema.ts
│   │       └── 📄 notification.schema.ts
│   │
│   ├── 📁 models/                     # ── Mongoose Models (MongoDB) ──
│   │   ├── 📄 Question.ts            # Question schema + model
│   │   ├── 📄 Flashcard.ts           # Flashcard schema + model
│   │   └── 📄 UserFlashcardState.ts  # SRS state schema + model
│   │
│   ├── 📁 services/                   # ── Business Logic Layer ──
│   │   ├── 📄 auth.service.ts         # Register, login, refresh
│   │   ├── 📄 user.service.ts         # Profile CRUD
│   │   ├── 📄 admin.service.ts        # User management (approve/suspend)
│   │   ├── 📄 class.service.ts        # Class CRUD, enrollment
│   │   ├── 📄 question.service.ts     # Question CRUD, search
│   │   ├── 📄 assignment.service.ts   # Assignment CRUD
│   │   ├── 📄 attempt.service.ts      # Start, save, submit, auto-grade
│   │   ├── 📄 grading.service.ts      # Manual grading (writing)
│   │   ├── 📄 flashcard.service.ts    # Browse, SRS review, SM-2
│   │   ├── 📄 notification.service.ts # Create, list, mark read
│   │   ├── 📄 skill-score.service.ts  # Heatmap, progress, aggregation
│   │   └── 📄 api-quota.service.ts    # Quota tracking
│   │
│   ├── 📁 hooks/                      # ── Custom React Hooks ──
│   │   ├── 📄 useAuth.ts             # Auth state (current user, logout)
│   │   ├── 📄 useClasses.ts          # Fetch classes data
│   │   ├── 📄 useQuestions.ts        # Fetch questions with filters
│   │   ├── 📄 useAssignments.ts      # Fetch assignments
│   │   ├── 📄 useAttempt.ts          # Exam session management
│   │   ├── 📄 useAutoSave.ts         # Auto-save with debounce
│   │   ├── 📄 useCountdown.ts        # Timer countdown logic
│   │   ├── 📄 useFlashcards.ts       # Flashcard browsing + SRS
│   │   ├── 📄 useNotifications.ts    # Notifications + unread count
│   │   └── 📄 useDebounce.ts         # Generic debounce hook
│   │
│   ├── 📁 stores/                     # ── Zustand State Stores ──
│   │   ├── 📄 authStore.ts           # Auth state (user, tokens)
│   │   ├── 📄 examStore.ts           # Exam session state (answers, timer)
│   │   ├── 📄 notificationStore.ts   # Notification count
│   │   └── 📄 uiStore.ts             # UI state (sidebar open, theme)
│   │
│   ├── 📁 types/                      # ── TypeScript Type Definitions ──
│   │   ├── 📄 user.types.ts          # User, UserRole, UserStatus
│   │   ├── 📄 class.types.ts         # Class, Enrollment
│   │   ├── 📄 question.types.ts      # Question, QuestionType, Content
│   │   ├── 📄 assignment.types.ts    # Assignment, AssignmentType
│   │   ├── 📄 attempt.types.ts       # Attempt, AttemptAnswer
│   │   ├── 📄 flashcard.types.ts     # Flashcard, UserFlashcardState
│   │   ├── 📄 notification.types.ts  # Notification, NotificationType
│   │   ├── 📄 analytics.types.ts     # SkillScore, HeatmapData
│   │   └── 📄 api.types.ts           # ApiResponse, ApiError, Pagination
│   │
│   └── 📁 config/                     # ── App Configuration ──
│       ├── 📄 site.ts                # Site metadata (name, description)
│       ├── 📄 navigation.ts          # Sidebar menu items per role
│       └── 📄 srs.ts                 # SM-2 algorithm constants
│
└── 📁 tests/                          # ── Test Files ──
    ├── 📁 unit/                       # Unit tests
    │   ├── 📁 services/
    │   │   ├── 📄 auth.service.test.ts
    │   │   ├── 📄 class.service.test.ts
    │   │   ├── 📄 question.service.test.ts
    │   │   ├── 📄 attempt.service.test.ts
    │   │   └── 📄 flashcard.service.test.ts
    │   └── 📁 lib/
    │       ├── 📄 auth.test.ts        # JWT + bcrypt tests
    │       └── 📄 srs-algorithm.test.ts   # SM-2 tests
    ├── 📁 integration/                # Integration tests
    │   ├── 📄 auth.flow.test.ts       # Register → login → refresh
    │   ├── 📄 class.flow.test.ts      # Create → enroll → leave
    │   ├── 📄 exam.flow.test.ts       # Start → save → submit → grade
    │   └── 📄 srs.flow.test.ts        # Add → review → stats
    └── 📁 e2e/                        # End-to-end tests (Playwright)
        ├── 📄 auth.spec.ts
        ├── 📄 student-flow.spec.ts
        └── 📄 teacher-flow.spec.ts
```

---

## Mapping: File → Task ID

Để dễ tìm task tương ứng trong [TASK_BOARD.md](./TASK_BOARD.md):

### API Routes → Task IDs

| File path | Task ID | Mô tả |
|---|---|---|
| `api/v1/auth/register/route.ts` | S1-01 | Đăng ký |
| `api/v1/auth/login/route.ts` | S1-02 | Đăng nhập |
| `api/v1/auth/refresh/route.ts` | S1-03 | Refresh token |
| `api/v1/auth/logout/route.ts` | S1-04 | Đăng xuất |
| `api/v1/users/me/route.ts` | S1-06, S1-07 | GET + PATCH profile |
| `api/v1/users/me/avatar/route.ts` | S1-08 | Upload avatar |
| `api/v1/users/me/classes/route.ts` | S1-09 | Student's classes |
| `api/v1/admin/users/route.ts` | S1-10 | List users |
| `api/v1/admin/users/[id]/approve/route.ts` | S1-11 | Approve user |
| `api/v1/admin/users/[id]/suspend/route.ts` | S1-12 | Suspend user |
| `api/v1/classes/route.ts` | S1-13, S1-14 | Create + list classes |
| `api/v1/classes/[classId]/route.ts` | S1-15, S1-16 | Get + update class |
| `api/v1/classes/enroll/route.ts` | S1-17 | Enroll |
| `api/v1/classes/[classId]/leave/route.ts` | S1-18 | Leave class |
| `api/v1/classes/[classId]/students/route.ts` | S1-19 | List students |
| `api/v1/questions/route.ts` | S2-01, S2-02 | Create + search |
| `api/v1/questions/[questionId]/route.ts` | S2-03, S2-04, S2-05 | Get + edit + delete |
| `api/v1/questions/upload-audio/route.ts` | S2-06 | Upload audio |
| `api/v1/assignments/route.ts` | S2-08 | Create assignment |
| `api/v1/assignments/[assignmentId]/route.ts` | S2-10, S2-11, S2-12 | Get + edit + delete |
| `api/v1/attempts/route.ts` | S3-01 | Start attempt |
| `api/v1/attempts/[attemptId]/answers/[questionId]/route.ts` | S3-02 | Auto-save |
| `api/v1/attempts/[attemptId]/submit/route.ts` | S3-03 | Submit |
| `api/v1/attempts/[attemptId]/answers/[questionId]/grade/route.ts` | S3-06 | Grade writing |
| `api/v1/attempts/[attemptId]/results/route.ts` | S3-07 | View results |
| `api/v1/skill-scores/heatmap/route.ts` | S4-01 | Heatmap |
| `api/v1/skill-scores/progress/route.ts` | S4-02 | Progress chart |
| `api/v1/flashcards/route.ts` | S5-01 | Browse flashcards |
| `api/v1/flashcards/[flashcardId]/review/route.ts` | S5-05 | SRS review |
| `api/v1/notifications/route.ts` | S4-06 | List notifications |

### Pages → Task IDs

| Page path | Task ID | Mô tả |
|---|---|---|
| `(auth)/login/page.tsx` | S1-22 | Trang đăng nhập |
| `(auth)/register/page.tsx` | S1-21 | Trang đăng ký |
| `(dashboard)/layout.tsx` | S1-23 | Dashboard layout |
| `(dashboard)/student/classes/page.tsx` | S1-31 | Lớp của student |
| `(dashboard)/teacher/classes/page.tsx` | S1-27 | Lớp của teacher |
| `(dashboard)/teacher/questions/page.tsx` | S2-13 | Ngân hàng câu hỏi |
| `(dashboard)/teacher/questions/create/page.tsx` | S2-14 → S2-17 | Tạo câu hỏi |
| `(dashboard)/student/.../attempt/page.tsx` | S3-09 → S3-16 | Giao diện làm bài |
| `(dashboard)/student/flashcards/page.tsx` | S5-08 | Browse flashcards |
| `(dashboard)/student/flashcards/review/page.tsx` | S5-12 | Ôn tập SRS |
| `(dashboard)/admin/users/page.tsx` | S1-26 | Quản lý users |

---

## Số lượng file dự kiến

| Layer | Số file | Ghi chú |
|---|---|---|
| **Pages** (app router) | ~30 | Các trang UI |
| **API Routes** | ~35 | Backend endpoints |
| **Components** | ~55 | React components |
| **Services** | 12 | Business logic |
| **Models** (Mongoose) | 3 | MongoDB schemas |
| **Lib / Utils** | ~15 | Helpers, config |
| **Hooks** | 10 | Custom React hooks |
| **Stores** (Zustand) | 4 | Client state |
| **Types** | 9 | TypeScript definitions |
| **Validations** (Zod) | 8 | Shared schemas |
| **Tests** | ~15 | Unit + integration + e2e |
| **Config files** | ~10 | ESLint, Tailwind, etc |
| **TỔNG** | **~206** | — |

---

*File này mô tả cấu trúc đầy đủ của project. Khi tạo file mới, đặt đúng vị trí theo cấu trúc này.*
