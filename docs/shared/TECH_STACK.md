# 🛠️ TECH_STACK.md — Technology Stack

> **Version**: 2.0 (Updated cho NestJS architecture)  
> **Ngày cập nhật**: 2026-07-09

---

## 1. Overview

| Layer | Technology | Version | Lý do chọn |
|-------|-----------|---------|-----------|
| **Frontend** | Next.js | 14 (App Router) | SSR/RSC, Vercel native, file-based routing |
| **Backend** | NestJS | 10.x | DI container, module system, Swagger auto-gen |
| **Language** | TypeScript | 5.x | Type safety full-stack |
| **DB (Relational)** | PostgreSQL | 16 | ACID, relational data, Supabase free tier |
| **DB (Document)** | MongoDB | 7.x | Flexible schema cho question content |
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

### Quyết định FE:
- **shadcn/ui**: Copy components vào src, không phải npm package → full control
- **React Query**: Caching + background refetch → UX mượt hơn
- **Zustand**: Nhỏ gọn, không cần boilerplate như Redux

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

### Quyết định BE:
- **NestJS over Express**: Module system, DI, decorators → maintainable solo
- **Prisma over TypeORM**: Type inference tốt hơn, migration dễ hơn
- **Gemini over OpenAI**: Free tier 1M tokens/day → phù hợp solo dev $0

---

## 4. Infrastructure — $0/month Stack

| Service | Free Tier | Dùng cho |
|---------|-----------|---------|
| **Vercel** | Unlimited hobby | Next.js FE hosting |
| **Railway** | $5/month credit | NestJS BE hosting |
| **Supabase** | 500MB DB | PostgreSQL |
| **MongoDB Atlas** | 512MB | MongoDB |
| **Cloudinary** | 25GB storage | Audio + Avatar |
| **Gemini API** | 1M tokens/day | AI writing grader |
| **GitHub Actions** | 2000 min/month | CI/CD |
| **Sentry** | 5K errors/month | Error monitoring |

> ⚠️ Railway hiện tính $5/month credit. Nếu cần free hoàn toàn: dùng **Render** (750h/month free)

---

## 5. Development Tools

| Tool | Mục đích |
|------|---------|
| **pnpm** | Package manager (nhanh hơn npm) |
| **Turborepo** | Monorepo build orchestration |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Pre-commit hooks |
| **lint-staged** | Chỉ lint files được staged |
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

Cả FE và BE đều import từ `@hsk/shared-types` → type safety cross-service.

---

## 7. Free Tier Limits & Monitoring

| Service | Limit | Action khi gần limit |
|---------|-------|---------------------|
| Supabase DB | 500MB | Archive old data, paginate aggressively |
| Cloudinary bandwidth | 25GB/month | Lazy-load audio, compress avatars |
| Gemini API | 60 req/min | Queue requests, cache results |
| Railway CPU | Shared | Optimize queries, add caching |
| MongoDB | 512MB | TTL indexes cho old SRS states |

Admin dashboard sẽ hiển thị API quota usage (đã có trong schema).
