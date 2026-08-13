# 🛠️ TECH_STACK.md — Technology Stack

> **Version**: 2.0 (updated for the NestJS architecture)  
> **Last updated**: 2026-07-09

---

## 1. Overview

| Layer | Technology | Version | Why chosen |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js | 14 (App Router) | SSR/RSC, Vercel native, file-based routing |
| **Backend** | NestJS | 10.x | DI container, module system, Swagger auto-gen |
| **Language** | TypeScript | 5.x | Type safety full-stack |
| **DB (Relational)** | PostgreSQL | 16 | ACID, relational data, Supabase free tier |
| **DB (Document)** | MongoDB | 7.x | Flexible schema for question content |
| **ORM (SQL)** | Prisma | 5.x | Type-safe queries, auto-migrations |
| **ODM (NoSQL)** | Mongoose | 8.x | Schema validation, middleware |

---

## 2. Frontend Stack

```
Next.js 14 (App Router)
├── UI Components: shadcn/ui + Radix UI
├── Styling: Tailwind CSS 3.x
├── State: Zustand 4.x
├── Data Fetching: @tanstack/react-query 5.x
├── HTTP Client: Axios 1.x
├── Forms: react-hook-form + zod
├── Charts: recharts
├── Icons: lucide-react
└── Fonts: next/font (Inter)
```

### Frontend decisions:
- **shadcn/ui**: components are copied into src rather than installed as an npm package → full control
- **React Query**: caching + background refetch → smoother UX
- **Zustand**: compact, without Redux's boilerplate

---

## 3. Backend Stack

```
NestJS 10.x
├── Auth: @nestjs/jwt + @nestjs/passport + passport-jwt
├── Validation: class-validator + class-transformer
├── Config: @nestjs/config
├── Swagger: @nestjs/swagger
├── Rate Limiting: @nestjs/throttler
├── Security: helmet
├── File Upload: @cloudinary/url-gen + multer
├── Database: prisma + @prisma/client
├── MongoDB: mongoose + @nestjs/mongoose
└── AI: @google/generative-ai (Gemini)
```

### Backend decisions:
- **NestJS over Express**: module system, DI, decorators → maintainable by one person
- **Prisma over TypeORM**: better type inference, easier migrations
- **Gemini over OpenAI**: free tier of 1M tokens/day → fits a $0 solo-dev budget

---

## 4. Infrastructure — $0/month Stack

| Service | Free Tier | Used for |
|---------|-----------|---------|
| **Vercel** | Unlimited hobby | Next.js FE hosting |
| **Railway** | $5/month credit | NestJS BE hosting |
| **Supabase** | 500MB DB | PostgreSQL |
| **MongoDB Atlas** | 512MB | MongoDB |
| **Cloudinary** | 25GB storage | Audio + Avatar |
| **Gemini API** | 1M tokens/day | AI writing grader |
| **GitHub Actions** | 2000 min/month | CI/CD |
| **Sentry** | 5K errors/month | Error monitoring |

> ⚠️ Railway currently gives a $5/month credit. For a fully free option, use **Render** (750h/month free)

---

## 5. Development Tools

| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (faster than npm) |
| **Turborepo** | Monorepo build orchestration |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Pre-commit hooks |
| **lint-staged** | Lint only staged files |
| **Jest** | Unit + Integration testing |
| **Playwright** | E2E testing |
| **Prisma Studio** | DB GUI (dev only) |

---

## 6. Shared Types (packages/shared-types)

```typescript
// packages/shared-types/src/index.ts
export * from './user.types';
export * from './class.types';
export * from './question.types';
export * from './assignment.types';
export * from './attempt.types';
export * from './flashcard.types';
export * from './api-response.types';
```

Both frontend and backend import from `@hsk/shared-types` → cross-service type safety.

---

## 7. Free Tier Limits & Monitoring

| Service | Limit | Action when approaching the limit |
|---------|-------|---------------------|
| Supabase DB | 500MB | Archive old data, paginate aggressively |
| Cloudinary bandwidth | 25GB/month | Lazy-load audio, compress avatars |
| Gemini API | 60 req/min | Queue requests, cache results |
| Railway CPU | Shared | Optimize queries, add caching |
| MongoDB | 512MB | TTL indexes for old SRS states |

The admin dashboard will show API quota usage (already present in the schema).
