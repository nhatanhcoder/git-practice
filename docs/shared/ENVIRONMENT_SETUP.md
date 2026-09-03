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

# Supabase Storage (dùng chung Supabase project với DATABASE_URL)
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# Cloudflare R2 (video)
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET=...

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



> ⚠️ **KHÔNG commit `.env` hay `.env.local`** — Chỉ commit `.env.example`

---

## 4. Database Setup

> Viết lại 2026-09-03 sau khi dựng lại từ đầu trên máy sạch. Bản cũ in ra một
> `docker-compose.yml` **không tồn tại trong repo** (service `postgres`, database
> `hsk_platform`, kèm một service `mongo`). Đừng copy compose từ tài liệu — file
> thật ở root là nguồn duy nhất, và nó chỉ có PostgreSQL.

### 4.1 PostgreSQL — Docker, dùng `docker-compose.yml` có sẵn ở root

Không cần viết compose file. Nó đã ở trong repo: service tên **`db`**, container
`hsk-postgres`, image `postgres:16-alpine`, user `hsk`, database **`hsk_dev`**, cổng host
lấy từ `${POSTGRES_PORT:-5432}`, kèm healthcheck và `--locale=C.UTF-8` (locale cố định để
hai máy không cho ra thứ tự `ORDER BY` khác nhau trên tiếng Trung).

```powershell
Copy-Item .env.example .env     # bash: cp .env.example .env
docker compose up -d
```

`docker compose`, không phải `docker-compose` — bản v1 có dấu gạch nối đã ngừng hỗ trợ.

**Nếu cổng 5432 đã bị chiếm** (Postgres cài native trên Windows rất hay gặp), đặt
`POSTGRES_PORT=5433` trong `.env` và sửa cổng trong `DATABASE_URL` cho khớp — Compose không
tự viết lại URL hộ bạn.

### 4.2 MongoDB — Atlas

`docker-compose.yml` **cố ý không có** service Mongo. Tạo cluster M0 miễn phí tại
https://cloud.mongodb.com, thêm database user, mở Network Access, rồi lấy connection string
ở **Connect > Drivers > Node.js**.

Hai cái bẫy, cả hai đều tạo ra lỗi trông giống "sai mật khẩu":

- **Phải chèn tên database vào URI**, ngay trước dấu `?`: `.../hsk_dev?retryWrites=true...`.
  Thiếu nó thì driver vẫn kết nối thành công nhưng vào database `test`, và mọi collection
  app ghi ra sẽ nằm sai chỗ.
- Mật khẩu chứa `@ : / ? # [ ]` **phải percent-encode**, nếu không URI parser cắt ngang.
  Dễ nhất là đặt mật khẩu không có mấy ký tự đó.

Muốn làm offline thì trỏ `MONGODB_URI` vào một `mongod` local (`mongodb://localhost:27017/hsk_dev`);
không có gì trong code phụ thuộc riêng vào Atlas.

### 4.3 Supabase thay cho Docker (tuỳ chọn)

Dùng được, nhưng migrate chạy thẳng lên cloud nên sai thì tốn công hơn. Lấy connection
string ở **Settings > Database**, đặt vào `DATABASE_URL` và `DIRECT_URL`. Migration cần
`CREATE EXTENSION citext` — Supabase có sẵn extension này.

---

## 5. Migration, Seed và kiểm tra

Chạy **từ root**, không phải `cd apps/api`. Mọi script `db:*` đều tự nạp `.env` ở root qua
`dotenv -e ../../.env`, nên đừng gọi thẳng `prisma` — nó sẽ không thấy biến môi trường.

```bash
pnpm --filter api db:deploy     # áp migration đã có (dùng cho máy mới)
pnpm --filter api db:seed       # 8 tài khoản test
pnpm --filter api db:check      # kiểm tra CẢ HAI database
```

| Script | Làm gì | Khi nào dùng |
|---|---|---|
| `db:deploy` | `prisma migrate deploy` — áp migration có sẵn, không hỏi gì | máy mới, CI |
| `db:migrate` | `prisma migrate dev` — **tương tác**, tạo migration mới khi schema đổi | khi bạn sửa `schema.prisma` |
| `db:seed` | 8 user, mật khẩu `Password123!` | sau khi migrate |
| `db:check` | connect thử Postgres + Mongo, in nguyên nhân nếu hỏng | **chạy đầu tiên mỗi khi có gì lạ** |
| `db:studio` | Prisma Studio ở http://localhost:5555 | xem dữ liệu |
| `db:reset` | drop → migrate → seed | làm lại từ đầu |

`db:check` đáng chạy trước khi đổ lỗi cho app. Nó phân biệt "container chưa chạy", "sai
credential", "database không tồn tại", "schema chưa áp", và với Atlas là "IP chưa có trong
Network Access" — năm lỗi mà driver in ra gần như giống hệt nhau.

Kết quả đúng trông như thế này:

```
OK    PostgreSQL  PostgreSQL 16.15 on x86_64-pc-linux-musl — users table has 8 row(s)
OK    MongoDB     Atlas 8.0.30 — database "hsk_dev"
```

### Schema hiện tại chỉ có bảng `users` — đó là cố ý

`prisma/schema.prisma` không phải làm dở. `RefreshToken` bị `docs/api/modules/01-auth.md` §12
chặn ("no coding before the table is locked"); classes/enrollment chặn bởi `SCOPE-01`;
payroll/billing chặn bởi `API-002` và câu hỏi money representation mà ADR-010 chưa từng
được hỏi. `docs/shared/DATABASE_SCHEMA.md` có đủ model nhưng đề ngày 2026-07-10 và mâu thuẫn
với spec đã accepted ở ba điểm, nên **không** được dùng làm nguồn. Lý do đầy đủ nằm ở đầu
`prisma/schema.prisma` và trong `apps/api/README.md`.

### Tài khoản seed

Tất cả dùng mật khẩu `Password123!`.

| Email | Role | Status |
|---|---|---|
| `admin@hsk.local` | admin | active |
| `admin2@hsk.local` | admin | active |
| `teacher@hsk.local` | teacher | active |
| `teacher.pending@hsk.local` | teacher | pending |
| `student@hsk.local` | student | active |
| `student.suspended@hsk.local` | student | suspended |
| `never.logged.in@hsk.local` | student | active |
| `MiXeD.CaSe@HSK.Local` | student | active |

Mỗi tài khoản tồn tại để test một nhánh cụ thể — lý do từng cái ghi trong `apps/api/README.md`.

---

## 6. Khởi chạy Development

### Option 1: Chạy tất cả từ root (turborepo)
```bash
pnpm dev
# → web: http://localhost:3000
# → api: http://localhost:3001
```

### Option 2: Chạy riêng từng app
```bash
pnpm --filter api dev     # NestJS, watch mode
pnpm --filter web dev     # Next.js
```

Tên script là **`dev`**, không phải `start:dev` — `apps/api/package.json` chỉ có
`dev` / `build` / `start` / `type-check` và nhóm `db:*`.

### Kiểm tra:
- Frontend: http://localhost:3000
- Health check: http://localhost:3001/api/health — trả `{"status":"ok","databases":{...}}`
- Prisma Studio: `pnpm --filter api db:studio` → http://localhost:5555

**Chưa có Swagger.** `main.ts` không gọi `SwaggerModule`; `http://localhost:3001/api` sẽ ra
404 chứ không phải trang docs. Nó nằm trong Phase 1 infra ở `ai/PROGRESS.md`, chưa làm.

**Nếu cổng 3001 báo `EADDRINUSE`**: có tiến trình khác đang giữ. Tìm chủ sở hữu bằng
`Get-NetTCPConnection -LocalPort 3001 -State Listen` (PowerShell) rồi tắt, hoặc chạy tạm với
cổng khác: `API_PORT=3002 pnpm --filter api dev`.

---
## 7. Supabase Storage Setup (Audio, Avatar)

1. Supabase Dashboard → Storage → tạo 2 bucket: `audio`, `avatars`
2. Set bucket policy: `avatars` public read, `audio` public read (hoặc signed URL nếu cần riêng tư)
3. Copy `SUPABASE_SERVICE_ROLE_KEY` từ Settings > API vào `.env`

## 7b. Cloudflare R2 Setup (Video)

1. Cloudflare Dashboard → R2 → tạo bucket
2. Tạo API token (Object Read & Write) → copy Access Key ID + Secret
3. Copy vào `CLOUDFLARE_R2_*` trong `.env`

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

---

## Windows — bẫy đã gặp thật (2026-08-13)

### Repo KHÔNG được nằm trong OneDrive

Triệu chứng gặp phải khi để repo ở `C:\Users\<user>\OneDrive\Máy tính\Real`:

- `create-next-app` báo **"The application path is not writable"** dù `mkdir` và ghi file
  bình thường — Node `fs.access(W_OK)` đọc nhầm cờ ReadOnly mà OneDrive gắn lên thư mục
- Thư mục vừa tạo (`apps/`, `web/`) **biến mất** ngay sau đó
- pnpm dùng symlink nặng; OneDrive không hiểu symlink → `node_modules` hỏng khi sync
- Đường dẫn `Máy tính` có ký tự non-ASCII, một số tool Node trên Windows xử lý không ổn

**Cách làm đúng**: để repo ở ổ khác, ví dụ `D:\PersonalProject\Real`.

### pnpm

- Node 24 + npm 11 + pnpm 11.21.0
- `corepack enable pnpm` cần quyền Admin nếu Node cài ở ổ khác (`D:\Application\nodejs`).
  Không enable được vẫn chạy được — shim tự tải pnpm lần đầu
- Tắt prompt tải: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`
- **`pnpm-workspace.yaml` phải tồn tại TRƯỚC** khi chạy `pnpm add -Dw`, nếu không:
  `--workspace-root may only be used inside a workspace`
- `pnpm init` (v11) sinh `devEngines.packageManager.version: "^11.21.0"` — dấu `^` làm corepack
  báo `Invalid package manager specification`. Bỏ dấu `^` hoặc xoá cả block
- `create-next-app` cần thư mục **cha** tồn tại sẵn: `mkdir apps` trước khi tạo `apps/web`

### Thứ tự setup đã kiểm chứng

```powershell
mkdir apps -Force
# tạo pnpm-workspace.yaml + .npmrc + package.json (private: true)
pnpm add -Dw turbo prettier
pnpm create next-app@14.2.20 apps/web --ts --tailwind --app --src-dir --import-alias "@/*" --no-eslint
cd apps\web ; pnpm add lucide-react clsx zustand axios @tanstack/react-query ; cd ..\..
pnpm install
```

### Font tiếng Việt

- `next/font/google` fetch lúc **build**, cần mạng. Máy không có mạng ra ngoài thì dùng
  `@import` trong `globals.css`
- **Bắt buộc `subsets: ['latin', 'vietnamese']`** — thiếu `vietnamese` là mất dấu toàn bộ UI
