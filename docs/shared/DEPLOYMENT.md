# 🚀 DEPLOYMENT.md — Hướng dẫn Deploy Production

> **FE**: Vercel (Next.js)  
> **BE**: Railway (NestJS)  
> **DB**: Supabase + MongoDB Atlas

---

## 1. Tổng quan Deploy Stack

```
GitHub Repository
       │
       ├── Push to main → CI/CD triggers
       │
       ├── apps/web ──────► Vercel (auto-deploy)
       │                    https://hsk-platform.vercel.app
       │
       └── apps/api ──────► Railway (auto-deploy)
                            https://hsk-api.railway.app
```

---

## 2. Vercel — Frontend Deployment

### Setup lần đầu:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy từ apps/web
cd apps/web
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: hsk-platform-web
# - Directory: ./
# - Override settings? No
```

### Environment Variables trên Vercel:

Vào Vercel Dashboard → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL=https://hsk-api.railway.app
NEXT_PUBLIC_APP_NAME=HSK Learning Platform
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

### Production Config (`apps/web/next.config.ts`):

```typescript
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'lh3.googleusercontent.com'],
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }];
  },
};
```

---

## 3. Railway — Backend Deployment

### Setup lần đầu:

1. Vào https://railway.app → New Project → Deploy from GitHub repo
2. Select repo `hsk-platform` → Select branch `main`
3. Root directory: `apps/api`
4. Start command: `npm run start:prod`

### Environment Variables trên Railway:

```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://hsk-platform.vercel.app

DATABASE_URL=postgresql://...supabase.co/postgres
MONGODB_URI=mongodb+srv://...atlas.mongodb.net/hsk-platform

JWT_SECRET=<generate: openssl rand -base64 32>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<generate: openssl rand -base64 32>
JWT_REFRESH_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

GEMINI_API_KEY=...
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### Procfile (`apps/api/Procfile`):

```
web: node dist/main.js
```

### Build Script (`apps/api/package.json`):

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "prisma:deploy": "prisma migrate deploy"
  }
}
```

---

## 4. GitHub Actions — CI/CD

### `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: cd apps/api && pnpm test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          MONGODB_URI: ${{ secrets.TEST_MONGODB_URI }}
          JWT_SECRET: test-secret-key
          JWT_REFRESH_SECRET: test-refresh-secret

  # Vercel và Railway tự deploy khi push to main
```

---

## 5. Database Migration (Production)

```bash
# Chạy migration khi có schema changes
# Railway: Thêm vào build command
prisma migrate deploy

# KHÔNG dùng prisma migrate dev ở production
# migrate dev tạo files, migrate deploy áp dụng files đã có
```

---

## 6. Custom Domain (Optional)

### Vercel:
1. Settings → Domains → Add `hsk-platform.com`
2. Add CNAME record ở DNS provider:
   ```
   CNAME www → cname.vercel-dns.com
   ```

### Railway:
1. Settings → Domains → Add `api.hsk-platform.com`
2. Add CNAME record:
   ```
   CNAME api → [railway-provided-domain].railway.app
   ```

---

## 7. Monitoring (Production)

### Sentry Setup:

```typescript
// apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% performance monitoring
});
```

```typescript
// apps/web/src/app/layout.tsx
// next.config.ts: withSentryConfig wrapper
```

### Health Check Endpoint:

```typescript
// modules/health/health.controller.ts
@Get('health')
@Public()  // No auth required
async health() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
  };
}
```

---

## 8. Rollback Strategy

```bash
# Vercel: Instant rollback qua dashboard
# Project → Deployments → Previous deployment → Promote to Production

# Railway: Redeploy previous commit
# Project → Deployments → Previous → Redeploy
```

---

## 9. Production Checklist

Trước khi go-live:

- [ ] Tất cả env vars đã set trên Vercel và Railway
- [ ] Database migrations đã chạy (`prisma migrate deploy`)
- [ ] MongoDB indexes đã tạo (`db.questions.createIndex(...)`)
- [ ] CORS whitelist chỉ cho phép production domain
- [ ] Rate limiting đang hoạt động
- [ ] Sentry capturing errors
- [ ] Health check endpoint trả 200
- [ ] SSL certificates active (Vercel/Railway tự quản lý)
- [ ] `NODE_ENV=production` đã set
- [ ] Seed admin account đã tạo
