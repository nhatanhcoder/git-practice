# 🏗️ ARCHITECTURE.md — HSK Learning Platform

> **Version**: 1.0  
> **Created**: 2026-07-09  
> **Tech Stack**: Next.js 14 (FE) · NestJS (BE) · PostgreSQL · MongoDB

---

## 1. Architecture Overview

The project uses a **separated frontend / backend** architecture (not a monolith):

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            INTERNET                                       │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
┌─────────────────────────┐          ┌──────────────────────────┐
│   Vercel (Frontend)      │          │   Railway/Render (Backend) │
│                          │          │                            │
│  Next.js 14 App Router   │◄────────►│   NestJS REST API          │
│  ├── React Server Comp.  │  HTTP    │   ├── AuthModule           │
│  ├── Client Components   │  REST    │   ├── UsersModule          │
│  ├── Zustand (state)     │  Axios   │   ├── ClassesModule        │
│  └── React Query (cache) │          │   ├── QuestionsModule      │
│                          │          │   ├── AssignmentsModule    │
│  Port: 3000 (dev)        │          │   ├── AttemptsModule       │
│  URL: hsk-app.vercel.app │          │   ├── FlashcardsModule     │
└─────────────────────────┘          │   ├── AnalyticsModule      │
                                     │   ├── PayrollModule        │
                                     │   ├── InvoicingModule      │
                                     │   └── NotificationsModule  │
                                     │                            │
                                     │  Port: 3001 (dev)          │
                                     │  URL: hsk-api.railway.app  │
                                     └──────────┬─────────────────┘
                                                │
                        ┌───────────────────────┴────────────────────┐
                        │                                            │
                        ▼                                            ▼
          ┌─────────────────────────┐              ┌──────────────────────────┐
          │  Supabase (PostgreSQL)   │              │  MongoDB Atlas           │
          │                          │              │                          │
          │  Structured Data:         │              │  Document Data:           │
          │  ├── users               │              │  ├── questions           │
          │  ├── classes             │              │  ├── flashcards          │
          │  ├── enrollments         │              │  └── user_flashcard_state│
          │  ├── assignments         │              │                          │
          │  ├── attempts            │              │  Free tier: 512MB        │
          │  ├── sessions            │              └──────────────────────────┘
          │  ├── payroll_periods     │
          │  └── invoices            │
          │                          │
          │  Free tier: 500MB        │
          └─────────────────────────┘
```

---

## 2. Detailed Data Flow

### 2.1 Request Lifecycle

```
Browser
  │
  │ 1. User action (click, submit form)
  ▼
Next.js Client Component
  │
  │ 2. React Query / Axios call
  │    Headers: Authorization: Bearer <JWT>
  ▼
NestJS Controller
  │
  │ 3. JwtAuthGuard.canActivate()
  │    → Verify JWT signature
  │    → Attach user to request
  │
  │ 4. RolesGuard.canActivate()
  │    → Check user.role === required role
  │
  │ 5. ValidationPipe
  │    → class-validator decorators on DTO
  │    → Throw 400 if invalid
  ▼
NestJS Service
  │
  │ 6. Business logic
  │    → Prisma query (PostgreSQL)
  │    → Mongoose query (MongoDB)
  │    → External service calls
  ▼
Database(s)
  │
  │ 7. Data returned
  ▼
NestJS Service → Controller
  │
  │ 8. Transform & return
  │    → ApiResponseDto wrapper
  │    → { success, data, meta }
  ▼
Browser (React Query updates cache)
```

### 2.2 Authentication Flow

```
Client                NestJS BE               Database
  │                       │                       │
  │── POST /auth/login ──►│                       │
  │   { email, password } │                       │
  │                       │── Find user ─────────►│
  │                       │◄─ User record ─────── │
  │                       │                       │
  │                       │ Verify bcrypt hash    │
  │                       │                       │
  │                       │ Sign JWT (15min)       │
  │                       │ Sign Refresh (7d)      │
  │                       │                       │
  │◄─ { accessToken,  ───│                       │
  │     refreshToken }    │── Save refresh token ►│
  │                       │   in DB               │
  │                       │                       │
  │ (Store in memory +    │                       │
  │  httpOnly cookie)     │                       │
  │                       │                       │
  │ ... 14 minutes later  │                       │
  │                       │                       │
  │── POST /auth/refresh ►│                       │
  │   Cookie: refreshToken│                       │
  │                       │── Verify refresh ────►│
  │                       │◄─ Valid? ─────────── │
  │                       │                       │
  │◄─ { accessToken } ───│── Update refresh token►│
  │                       │   (rotate)            │
```

---

## 3. Module Architecture (NestJS)

```
src/
├── app.module.ts                   # Root module
│
├── common/                         # Cross-cutting concerns
│   ├── decorators/
│   │   ├── roles.decorator.ts      # @Roles('admin', 'teacher')
│   │   └── current-user.decorator.ts  # @CurrentUser()
│   ├── guards/
│   │   ├── jwt-auth.guard.ts       # Verify JWT
│   │   └── roles.guard.ts          # Check role
│   ├── filters/
│   │   └── http-exception.filter.ts    # Global error handler
│   ├── interceptors/
│   │   └── transform.interceptor.ts    # Wrap response in ApiResponse
│   ├── pipes/
│   │   └── validation.pipe.ts      # Global DTO validation
│   └── dto/
│       └── api-response.dto.ts     # { success, data, meta, error }
│
├── config/
│   ├── app.config.ts               # JWT secret, port, etc.
│   ├── database.config.ts          # Prisma + Mongoose config
│   └── cloudinary.config.ts        # File upload config
│
├── database/
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts       # PrismaClient singleton
│   │   └── schema.prisma
│   └── mongoose/
│       ├── mongoose.module.ts
│       └── schemas/
│           ├── question.schema.ts
│           ├── flashcard.schema.ts
│           └── user-flashcard-state.schema.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts      # /auth/*
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── refresh-jwt.strategy.ts
│   │   └── dto/
│   │       ├── register.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── users/
│   ├── admin/
│   ├── classes/
│   ├── questions/
│   ├── assignments/
│   ├── attempts/
│   ├── flashcards/
│   ├── analytics/
│   ├── payroll/
│   ├── invoicing/
│   └── notifications/
```

---

## 4. Frontend Architecture (Next.js)

```
app/
├── layout.tsx                      # Root: Providers (QueryClient, Theme)
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
│
└── (dashboard)/
    ├── layout.tsx                  # Sidebar + Navbar
    ├── student/
    ├── teacher/
    └── admin/

components/
├── ui/                             # shadcn/ui base components
├── layout/                         # Navbar, Sidebar, Footer
├── [feature]/                      # Feature-specific components
└── shared/                         # Generic reusable components

lib/
├── api/
│   ├── axios.ts                    # Axios instance + interceptors
│   └── endpoints/
│       ├── auth.api.ts             # API call functions
│       ├── classes.api.ts
│       └── ...
├── utils.ts
└── constants.ts

stores/                             # Zustand stores
hooks/                              # Custom React hooks (data fetching via React Query)
types/                              # TypeScript interfaces
```

### 4.1 Data Fetching Strategy

| Kind | Tool | When |
|------|---------|---------|
| Server-side initial data | React Query + SSR prefetch | Dashboard pages |
| Client-side mutations | React Query `useMutation` | Forms, actions |
| Global UI state | Zustand | Theme, sidebar, auth |
| Exam real-time state | Zustand `examStore` | Taking an exam |

---

## 5. Database Strategy

### 5.1 When to use PostgreSQL vs MongoDB?

| PostgreSQL (Prisma) | MongoDB (Mongoose) |
|--------------------|--------------------|
| Clear relationships (FKs) | Complex nested data |
| ACID transactions required | Schema changes frequently |
| Financial data (payroll, invoice) | Question content (many sub-types) |
| User, Class, Assignment, Attempt | Flashcard + SRS state |
| Attendance, Session | Audio/media metadata |

### 5.2 Cross-DB Reference Strategy

```
PostgreSQL: assignments.questionIds = ["mongo_id_1", "mongo_id_2"]
                                           │
                                           ▼ (NestJS service join)
MongoDB: db.questions.findMany({ _id: { $in: questionIds } })
```

> ⚠️ **No FKs between the two databases** — the NestJS service layer is responsible for joining

---

## 6. External Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| **Cloudinary** | Upload audio, images | 25GB storage, 25GB bandwidth |
| **OpenAI / Gemini** | AI grading for writing | Rate limited; uses Gemini Flash (free) |
| **Supabase** | Managed PostgreSQL | 500MB DB, 5GB storage |
| **MongoDB Atlas** | Managed MongoDB | 512MB cluster |
| **Vercel** | FE hosting | Unlimited hobby |
| **Railway** | BE hosting | $5 credit/month free |
| **Sentry** | Error monitoring | 5K errors/month |

---

## 7. Security Architecture

```
Request → Rate Limiter (ThrottlerModule)
        → CORS Check (origins whitelist)
        → JwtAuthGuard (verify signature + expiry)
        → RolesGuard (role-based access)
        → ValidationPipe (DTO sanitization)
        → Service Layer
        → Response (Helmet headers)
```

- **Passwords**: bcrypt (salt rounds: 12)
- **JWT**: RS256 or HS256, access token 15min, refresh 7 days
- **Refresh token**: Stored in DB, rotated on each use
- **SQL Injection**: Prisma parameterized queries (automatic)
- **NoSQL Injection**: Mongoose sanitization
- **XSS**: React escapes by default, Content-Security-Policy header

---

## 8. Architecture Decisions (ADR)

### ADR-001: Why separate FE/BE instead of a Next.js monolith?
- **Reason**: NestJS provides a DI container and module system → easier to maintain as the codebase grows
- **Trade-off**: Added network complexity, CORS needs configuring
- **Outcome**: Accepted, in exchange for a more scalable codebase

### ADR-002: Why two databases?
- **Reason**: PostgreSQL suits relational data, MongoDB suits flexible question content
- **Trade-off**: Joins must happen in the application layer; no cross-DB transactions
- **Outcome**: Accepted; question content rarely needs to be atomic with user data

### ADR-003: Why React Query instead of SWR?
- **Reason**: React Query has `useMutation`, optimistic updates, and better devtools
- **Trade-off**: Slightly larger bundle size than SWR
- **Outcome**: Accepted, for the richer feature set

---

*Update this when a new architecture decision is made. Every ADR must state its context, the decision, and the trade-off.*
