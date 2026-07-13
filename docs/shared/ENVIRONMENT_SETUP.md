# ⚙️ ENVIRONMENT_SETUP.md — Hướng dẫn Setup Local

> **Dành cho**: Solo developer  
> **OS**: Windows 11 / macOS / Ubuntu  
> **Thời gian setup**: ~30–45 phút

---

## 1. Prerequisites

| Tool | Version | Cài đặt |
|------|---------|---------|
| Node.js | >= 20.x LTS | https://nodejs.org |
| pnpm | >= 9.x | `npm install -g pnpm` |
| Git | >= 2.40 | https://git-scm.com |
| Docker Desktop | latest | https://docker.com (optional, cho local DB) |
| VS Code | latest | https://code.visualstudio.com |

### VS Code Extensions cần thiết:
```
Prisma.prisma
dbaeumer.vscode-eslint
esbenp.prettier-vscode
bradlc.vscode-tailwindcss
ms-vscode.vscode-typescript-next
```

---

## 2. Clone & Cấu trúc Monorepo

```bash
git clone https://github.com/<your-username>/hsk-platform.git
cd hsk-platform

# Cấu trúc monorepo
hsk-platform/
├── apps/
│   ├── web/          # Next.js 14 Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared-types/ # TypeScript types dùng chung
├── package.json      # Root workspace
└── pnpm-workspace.yaml
```

```bash
# Install tất cả dependencies
pnpm install
```

---

## 3. Biến Môi Trường

### 3.1 Backend (`apps/api/.env`)

```env
# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-different-from-above
JWT_REFRESH_EXPIRES_IN=7d

# PostgreSQL (Supabase)
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# MongoDB Atlas
MONGODB_URI="mongodb+srv://[username]:[password]@cluster0.xxxxx.mongodb.net/hsk-platform?retryWrites=true&w=majority"

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# AI (chọn 1)
OPENAI_API_KEY=sk-...          # OpenAI (có phí)
GEMINI_API_KEY=AIza...         # Google Gemini (free tier)

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

### 3.2 Frontend (`apps/web/.env.local`)

```env
# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# App info
NEXT_PUBLIC_APP_NAME="HSK Learning Platform"
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudinary (public, chỉ cloud name)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

> ⚠️ **KHÔNG commit `.env` hay `.env.local`** — Chỉ commit `.env.example`

---

## 4. Database Setup

### Option A: Supabase + MongoDB Atlas (Recommended — Free Cloud)

#### PostgreSQL via Supabase:
1. Vào https://supabase.com → New Project
2. Lấy connection string từ **Settings > Database > Connection string > URI**
3. Dán vào `DATABASE_URL` trong `.env`

#### MongoDB Atlas:
1. Vào https://cloud.mongodb.com → Create Free Cluster (M0)
2. **Database Access** → Add user
3. **Network Access** → Add `0.0.0.0/0` (dev) hoặc IP Railway (prod)
4. **Connect** → Compass → Lấy connection string
5. Dán vào `MONGODB_URI` trong `.env`

### Option B: Docker Local (Không cần cloud)

```yaml
# docker-compose.yml (ở root)
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: hsk_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  postgres_data:
  mongo_data:
```

```bash
docker-compose up -d

# .env cho Docker local:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hsk_platform"
# MONGODB_URI="mongodb://localhost:27017/hsk-platform"
```

---

## 5. Database Migration & Seed

```bash
# Vào thư mục backend
cd apps/api

# Chạy Prisma migrations
pnpm prisma migrate dev --name init

# Generate Prisma client
pnpm prisma generate

# (Optional) Seed dữ liệu mẫu
pnpm prisma db seed

# Xem DB qua Prisma Studio
pnpm prisma studio
```

---

## 6. Khởi chạy Development

### Option 1: Chạy tất cả từ root (turborepo)
```bash
# Từ root directory
pnpm dev
# → web chạy trên http://localhost:3000
# → api chạy trên http://localhost:3001
```

### Option 2: Chạy riêng từng app
```bash
# Terminal 1 — Backend
cd apps/api
pnpm start:dev

# Terminal 2 — Frontend
cd apps/web
pnpm dev
```

### Kiểm tra:
- Frontend: http://localhost:3000
- Backend Swagger UI: http://localhost:3001/api
- Health check: http://localhost:3001/api/health
- Prisma Studio: http://localhost:5555 (sau khi chạy `pnpm prisma studio`)

---

## 7. Cloudinary Setup (File Upload)

1. Vào https://cloudinary.com → Free account (25GB)
2. Dashboard → Copy **Cloud Name**, **API Key**, **API Secret**
3. Tạo folder `hsk-platform/audio` và `hsk-platform/avatars`
4. Upload preset: Settings > Upload > Add unsigned preset (cho FE direct upload nếu cần)

---

## 8. Google Gemini API Setup (AI Grading — Free)

1. Vào https://makersuite.google.com/app/apikey
2. Create API key → Copy vào `GEMINI_API_KEY`
3. Free tier: 60 requests/minute, 1M tokens/day

---

## 9. Scripts Hữu ích

```bash
# Root level
pnpm dev          # Chạy cả FE + BE
pnpm build        # Build cả 2
pnpm lint         # Lint cả 2
pnpm type-check   # TypeScript check cả 2
pnpm test         # Test cả 2

# Backend only
cd apps/api
pnpm start:dev    # Development với hot reload
pnpm start:debug  # Debug mode
pnpm test         # Jest tests
pnpm test:e2e     # E2E tests

# Frontend only
cd apps/web
pnpm dev          # Development
pnpm build        # Production build
pnpm lint         # ESLint
```

---

## 10. Troubleshooting

### Lỗi: `Cannot connect to database`
```bash
# Kiểm tra connection string
pnpm prisma db pull  # Nếu connect được, sẽ pull schema

# Kiểm tra IP whitelist trên Supabase/Atlas
```

### Lỗi: `Module not found`
```bash
# Xóa node_modules và cài lại
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

### Lỗi: `CORS Error` từ FE sang BE
```bash
# Kiểm tra FRONTEND_URL trong apps/api/.env
# Phải khớp chính xác với URL frontend (http://localhost:3000)
```

### Lỗi: `Prisma Client not generated`
```bash
cd apps/api
pnpm prisma generate
```
