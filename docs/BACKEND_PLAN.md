# Backend Plan — HSK Learning Platform

> **Đối tượng đọc:** người chưa biết gì về project này.
> Đọc hết file này là đủ để hiểu bối cảnh và bắt đầu. Không cần đọc trước tài liệu nào khác.
>
> Trạng thái: **kế hoạch, chưa code**. Bản này đã qua 2 vòng phản biện.
> Ngày: 2026-08-19 (review lần 3) · Repo: `D:\PersonalProject\Real`

---

## PHẦN I — BỐI CẢNH

### 1. Sản phẩm là gì

Nền tảng web dạy tiếng Trung theo chuẩn **HSK** (kỳ thi năng lực tiếng Trung). Một trung tâm
nhỏ dùng để quản lý lớp học, giao bài, chấm bài, và **tính tiền**: học phí của học sinh và
lương của giáo viên.

Ba vai trò:

| Vai | Làm gì |
|---|---|
| **Admin** | Duyệt tài khoản, đặt mức học phí, phát hoá đơn, duyệt buổi dạy, chốt bảng lương |
| **Teacher** | Quản lý lớp, ra đề, chấm bài, khai báo buổi dạy |
| **Student** | Vào lớp, làm bài, ôn từ vựng bằng flashcard |

Đặc điểm quan trọng nhất về mặt kỹ thuật: **đây là hệ thống có tiền**. Hoá đơn, thanh toán,
bảng lương. Sai số tiền không tự lộ ra như lỗi giao diện — nó nằm im cho tới lúc đối soát.
Mọi quyết định trong kế hoạch này đều xoay quanh điều đó.

### 2. Công nghệ

```
Frontend   Next.js 14 (App Router) · TypeScript · Tailwind · Zustand · React Query · Axios
Backend    NestJS (monolith, 5 lớp: Controller → Guard → Service → Repository → DB)
DB chính   PostgreSQL (Supabase) qua Prisma
DB phụ     MongoDB Atlas qua Mongoose — dữ liệu schema linh hoạt (câu hỏi, flashcard, SRS)
Auth       JWT access 15 phút (trong memory) + refresh 7 ngày (httpOnly cookie)
AI         Gemini — gợi ý điểm cho bài Writing
Lưu trữ    Supabase Storage (audio, avatar) · Cloudflare R2 (video)
Thanh toán VietQR + đối soát thủ công bởi Admin
Monorepo   pnpm workspace + Turborepo
```

**Lưu ý:** MongoDB nằm trong kiến trúc tổng thể nhưng **không dùng ở giai đoạn này** — xem §9.

### 3. Hiện trạng — cái gì đã có, cái gì chưa

**Đã có:**

- **Tài liệu ~14.000 dòng.** Đây là tài sản chính của project. Bao gồm entity spec cho 19
  bảng Postgres + 5 collection Mongo, RBAC matrix, API convention, 8 ADR, và page contract
  + design spec cho toàn bộ 13 màn Admin.
- **Frontend Admin: 13 màn đã code**, chạy được, nhưng **toàn bộ dùng dữ liệu giả**.
  Hiện có **17 marker `MOCK()`** trong `apps/web/src`.
- Design system: token khoá ở một file, có cơ chế version (`design_baseline`).

**Chưa có:**

- **`apps/api` chưa tồn tại.** Không có một dòng backend nào.
- `packages/` rỗng — chưa có shared types giữa FE và BE.
- Frontend Teacher và Student: chưa map, chưa code.

Nói ngắn: **frontend Admin là một bản mô phỏng hoàn chỉnh chưa có ruột.** Việc của backend
là thay ruột vào.

### 4. Bản đồ tài liệu

Đọc theo nhu cầu, không đọc hết:

| Cần gì | Đọc |
|---|---|
| Điểm vào cho AI agent | `AGENTS.md` và `CLAUDE.md` (nội dung giống nhau) |
| Tóm tắt project 1 trang | `ai/context/project-brain.md` |
| Quy tắc bắt buộc khi code | `ai/rules/working-rules.md` |
| Tên field thật của từng bảng | `docs/entities/postgres/`, `docs/entities/mongodb/` |
| Ai được gọi endpoint nào | `docs/shared/RBAC_MATRIX.md` |
| Hình dạng response, mã lỗi | `docs/api/API_CONVENTIONS.md`, `docs/api/API_ERROR_CODES.md` |
| Quyết định kiến trúc đã chốt | `docs/shared/decisions/` (ADR 001–008) |
| Bug và nợ kỹ thuật đã biết | `ai/known-issues/KNOWN_ISSUES.md` |
| Tiến độ, ai đang làm gì | `ai/PROGRESS.md` |
| Contract từng màn FE | `docs/front-end-design-docs/pages/` |

**Bỏ qua `archive/`** — tài liệu cũ, không phản ánh cấu trúc hiện tại.

**Quy tắc ưu tiên khi tài liệu mâu thuẫn nhau:**

```
entity spec  >  feature doc  >  mọi thứ khác
```

Đã có tiền lệ: `FEATURES_ADMIN` nói cần thêm field `last_login_at`, nhưng `ENTITY_USER.md`
đã có `lastLoginAt` từ trước. Luôn tin entity spec.

---

## PHẦN II — KẾ HOẠCH

### 5. Nguyên tắc nền

**5.1 Contract-first.** Định nghĩa hợp đồng request/response **trước**, rồi hai bên mới code
song song. Tích hợp về sau là một lần chạy `tsc`, không phải một buổi debug.

**5.2 Tài liệu là cơ chế điều phối.** Project này cho phép nhiều AI agent làm cùng lúc, và
**không phân chia thư mục cố định cho ai**. Thứ duy nhất chống va chạm là tài liệu thiết kế.
Nên tiêu chuẩn ở đây cao hơn bình thường: một Module Spec phải đủ chi tiết để **hai người
đọc cùng một file và code ra cùng một thứ** — không chỉ "đọc là hiểu".

**5.3 Nhiều lớp kiểm tra, không lớp nào tự đủ.**

```
1  Người/agent triển khai   chạy test, tự kiểm
2  Người/agent khác         review theo checklist đối kháng
3  CI                       build · migration trên DB dùng một lần · invariant test
4  Con người                duyệt quy tắc nghiệp vụ, schema change, vài case mẫu
```

Ranh giới: **con người trả lời "quy tắc này có đúng với sản phẩm không"**; review kỹ thuật
trả lời **"code có làm đúng quy tắc không"**. Tự tính tay một hoá đơn không phát hiện được
race condition, rounding hay rollback — nên không thay được CI.

**5.4 Test theo rủi ro, không theo hạn ngạch.**

| Mức | Phạm vi | Yêu cầu |
|---|---|---|
| **Bắt buộc** | auth · RBAC/ownership · tiền · transaction · concurrency | service test cho từng invariant + integration cho từng nhánh 403/409 |
| **Bắt buộc** | filter có liên quan ownership/data scope | đây là **lộ dữ liệu**, không phải CRUD |
| **Bắt buộc** | pagination của API tài chính / reporting | test boundary (trang cuối, tổng cộng) |
| **Optional** | CRUD đơn giản, pagination thường | 1 happy path/module |
| **Bỏ** | E2E toàn luồng, coverage % | tới khi có người dùng thật |

Cơ chế: **không có coverage gate**, nhưng **có invariant gate**. Module Spec liệt kê
invariant → mỗi invariant phải chỉ ra được ít nhất một test. Đếm invariant, không đếm phần
trăm. Transaction và concurrency **phải test trên database thật**, không mock service.

> ⚠️ `docs/testing/TEST_STRATEGY.md` hiện quy định ~100 unit + ~30 integration + coverage
> 70%. Kế hoạch này **thay** chính sách đó, và việc thay phải đi qua **ADR-009** — không
> được coi tài liệu cũ tự mất hiệu lực.

**5.5 Chỉ số tích hợp (telemetry, không phải luật).** Duy trì `docs/api/MOCK_INVENTORY.md`:
mỗi mock có ID, màn nào, thiếu endpoint gì, ai phụ trách, cái gì sẽ giải quyết nó. Chỉ đánh
`resolved` khi có tích hợp thật hoặc integration test. Số mock tăng thì phải giải thích,
không cấm — một màn mới hợp lệ có thể làm nó tăng.

### 6. Chặn cứng — 6 quyết định chưa chốt

> **Lưu ý khi đối chiếu tài liệu khác:** `pages/_INDEX.md` và các ghi chú cũ nói **5**
> quyết định. Bản này tách "mô hình lương" và "ranh giới kỳ lương" thành hai dòng vì chúng
> ảnh hưởng hai thứ khác nhau (schema vs logic tính kỳ) — nội dung không đổi, chỉ tách ra.
> Khi viết ADR thì gộp lại thành **ADR-012** cũng được.

Không code được phần liên quan cho tới khi có câu trả lời. Đây **không** phải chi tiết hiển
thị — chúng quyết định **cột trong bảng**.

| # | Quyết định | Chặn cái gì | Ghi chú |
|---|---|---|---|
| 1 | Biểu diễn tiền | toàn bộ billing + payroll | Entity đang `Decimal(12,2)`/`(10,2)`. VND không có đơn vị phụ nên `,2` vốn đã lạ. Phải chốt rounding, arithmetic, JSON serialization. **Prisma `Decimal` không được lọt thẳng ra API** |
| 2 | Mô hình học phí | tuition rates, invoices | per-student / per-class / per-package. Entity nghiêng monthly per-student nhưng chưa thống nhất |
| 3 | Mô hình lương | pay rates, payroll | Entity **đã có** `rateType` enum `per_session` / `per_hour`. Câu hỏi thật: *có thêm `fixed_monthly` không* — đó là schema khác |
| 4 | Ranh giới kỳ lương | payroll | Có phải tháng dương lịch? Timezone nào? Biên đóng hay mở? Quy tắc chống chồng lấn? |
| 5 | Vòng đời tài khoản | users | `pending / active / rejected / suspended`. **Không hard delete** — xoá là mất audit trail của chính hành động từ chối |
| 6 | Sở hữu Gemini key | monitoring | Key của nền tảng hay mỗi giáo viên một key (BYOK). Nếu BYOK: kéo theo encryption, rotation, secret custody |

Mỗi quyết định phải thành một **ADR** (`docs/shared/decisions/`) trước khi contract bị ảnh
hưởng được chuyển sang trạng thái `accepted`.

**Đã chốt rồi, đừng quyết lại:** `ADR-008 Rates are append-only` (Accepted, 2026-08-13).
Đổi mức giá = **tạo bản ghi mới** với `effectiveFrom` mới; không sửa, không xoá bản ghi cũ.
Đọc mức đang áp dụng bằng
`WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1`.
Lý do: hoá đơn tháng 3 phải luôn giải thích được bằng mức giá của tháng 3.

### 7. Lỗ hổng phạm vi cần quyết trước

**Classes/Enrollment chưa thuộc về ai.**

Entity có đủ (`ENTITY_CLASS.md`, `ENTITY_CLASS_ENROLLMENT.md`), nhưng API của chúng chỉ xuất
hiện trong `API_TEACHER.md` và `API_STUDENT.md` — **`API_ADMIN.md` không có dòng nào**.

Vấn đề: Sessions/Attendance (buổi dạy, điểm danh) **phụ thuộc** Classes/Enrollment. Mà
Classes/Enrollment thuộc scope Teacher, chưa thiết kế, chưa nằm trong kế hoạch nào.

Hai lựa chọn, phải quyết trước Phase 3:

- Làm Classes/Enrollment thành module BE đầy đủ — kéo scope Teacher vào sớm hơn dự kiến
- Làm phần tối thiểu đủ cho Sessions (class tồn tại + đọc được enrollment), phần còn lại
  đánh dấu `deferred`

Không quyết thì Phase 3 dừng ngay ở bước đầu tiên.

### 8. Chia module — theo domain, không theo bảng

Ranh giới module đi theo **transaction boundary**, không theo bảng. Invoice + payment + rate
phải nằm chung một transaction; session + attendance chung một state machine.

```
1  Auth
2  Users / Admin Users
3  Classes + Enrollment        ← xem §7
4  Sessions + Attendance
5  Payroll + Teacher Pay Rates
6  Billing: Tuition Rates + Invoices + Payments
7  Notifications
8  Dashboard / Reporting        ← chỉ là projection từ các module trên
```

**Mỗi Module Spec bắt buộc có 16 mục:**

```
endpoints · RBAC · DTO request/response · rule nghiệp vụ · ownership check
error → mã lỗi · bảng chạm tới · transaction boundary · idempotency + concurrency
state machine · audit/event · side effect + notification · index/query requirement
migration + seed impact · security + rate limit · observability · test matrix
```

Tài liệu rõ **không chỉ là DTO rõ** — nó phải chỉ ra chỗ nào cần transaction và invariant
nào không được phá vỡ.

### 9. Cắt phạm vi

Cả sản phẩm có 19 bảng Postgres. Frontend Admin hiện tại chỉ chạm **8 bảng**:

```
User · StudentTuitionRate · StudentInvoice · TuitionPayment
TeacherPayRate · PayrollPeriod · ClassSession · SessionAttendance
```

**Hoãn hoàn toàn ở giai đoạn này:**

- **MongoDB** — không màn Admin nào cần. Đừng cài Mongoose vội. Thêm một database vào ngày
  đầu là thêm một thứ để hỏng mà chưa dùng tới.
- Question / Assignment / Attempt / Flashcard / SRS — thuộc Teacher và Student
- Notification — frontend đang polling 60 giây, chấp nhận được
- Gemini AI — chỉ cần khi làm chấm Writing
- Màn `/admin/monitoring` — cần AI usage log có dữ liệu thật, tức phải sau khi Teacher
  grading chạy

### 10. Lộ trình

```
Phase 0A   ADR 009–014 + 6 quyết định nghiệp vụ (§6)
Phase 0B   transport convention (OpenAPI hoặc Zod) + dependency map
           + quyết scope Classes/Enrollment (§7)
Phase 0C   Module Spec mẫu: auth + billing
Phase 0D   review template rồi mới nhân sang 6 module còn lại
Phase 1    hạ tầng (§11)
Phase 2    auth / users
Phase 3    classes+enrollment → sessions+attendance → payroll → billing → dashboard
```

**Vì sao làm mẫu `auth` + `billing`, không phải module dễ:** billing là module khó nhất —
transaction boundary, concurrency, tiền. Template chịu được nó thì chịu được phần còn lại.
Bài học đã rút ra từ frontend: sai template lúc có 2 file thì sửa 2; để tới 8 file mới phát
hiện thì sửa 8.

**Cảnh báo — billing bị chặn bởi:** quyết định 1 (tiền), quyết định 2 (mô hình học phí), và
state machine của invoice/payment (thanh toán vượt, void). Riêng **rate effective-date thì
không còn là gate** — ADR-008 đã chốt. Đó là lý do nó không nằm trong bảng §6.

**Không được né blocker bằng cách đổi thứ tự.** Đây là lỗi đã mắc một lần trong bản kế hoạch
trước: đề xuất làm Sessions trước Users để "né quyết định chưa chốt" — trong khi Session cần
User, Teacher, Class, Enrollment tồn tại trước. Thứ tự đi theo dependency, không đi theo mức
độ thuận tiện.

### 11. Phase 1 — hạ tầng

Không có logic nghiệp vụ nào. Chỉ dựng nền.

```
apps/api NestJS + ValidationPipe global
envelope interceptor + exception filter (theo API_CONVENTIONS.md — flat: code/message/
  details ở top level, KHÔNG có cờ success, KHÔNG lồng object error)
mã lỗi từ API_ERROR_CODES.md thành enum TypeScript — không rải string
Prisma + migration đầu tiên (chỉ bảng User)
Swagger ở /api
GET /health và GET /ready — tách riêng
turbo.json                    ← xem cảnh báo dưới
```

**Vận hành — làm ngay, không hoãn:**

```
startup config validation      port / CORS / cookie policy / security headers
API version + global prefix    request ID + structured logging
graceful shutdown              Prisma lifecycle (connect/disconnect đúng)
test database config           seed script
chính sách UTC/timezone        CI: build + test
migration rehearsal trên database dùng một lần
```

Deploy production có thể để muộn. **CI và migration rehearsal thì không** — phải có trước
khi có bản ghi payroll/invoice thật đầu tiên. Đây là hai việc khác nhau, đừng gộp.

Ba thứ làm sẵn để lúc deploy không phải sửa lại: `.env.example` cập nhật cùng lúc mỗi khi
thêm biến; config đọc từ env, **không hardcode** connection string hay secret; port, CORS
origin, cookie domain đều từ env.

### 12. Hợp đồng FE ↔ BE

**Không sinh shared types trực tiếp từ NestJS DTO.** Nest DTO chứa decorator và validation
runtime; frontend chỉ cần transport contract. Làm ẩu là vô tình export `passwordHash`,
metadata refresh token, hoặc Prisma type ra ngoài.

Cách đúng:

```
1  transport contract viết riêng — OpenAPI, JSON Schema, hoặc Zod
2  Nest DTO implement contract đó
3  frontend sinh client/type từ OpenAPI đã commit
4  tách 4 loại model: request · response · domain · persistence
5  không bao giờ export Prisma model thẳng sang frontend
```

### 13. Trạng thái tài liệu

Bỏ tiêu chí "không còn chữ proposed" — nó ép người ta **xoá chữ** thay vì **chốt việc**.

```
accepted   contract thuộc phase đang làm — bắt buộc đạt
proposed   chưa tới phase, hoặc còn phụ thuộc quyết định
deferred   cố ý hoãn
```

Mỗi mục chưa chốt phải ghi **owner + quyết định cần + ngày review**. Quyết định đụng schema
phải có ADR trước khi contract chuyển `accepted`.

Mục tiêu: **không có mơ hồ nào không được quản lý** — không phải "không còn chữ proposed".

### 14. Định nghĩa "xong" cho một module backend

Độc lập với frontend. Xoá được một `MOCK()` ở FE **không** phải tiêu chí ở đây.

```
[ ] migration đã apply
[ ] contract ở trạng thái accepted
[ ] authorization được enforce ở service layer, không chỉ role guard
[ ] test pass — mọi invariant trong Module Spec đều có test tương ứng
[ ] Swagger/OpenAPI cập nhật
[ ] persistence integration được chứng minh (không phải chỉ mock repository)
[ ] env và observability cập nhật
```

Việc xoá `MOCK()` ở frontend là checklist tích hợp riêng, theo dõi qua `MOCK_INVENTORY.md`.

---

## PHẦN III — CẠM BẪY

### 15. Rủi ro, xếp theo mức độ đau

| # | Rủi ro | Vì sao đau | Chặn bằng |
|---|---|---|---|
| 1 | Migrate bảng tiền khi quyết định chưa chốt | Sửa migration đã chạy trên dữ liệu thật, không phải sửa file | Vạch chặn §6 |
| 2 | `schema.prisma` chứa model chưa migrate | **`schema.prisma` là file thực thi, không phải bản vẽ.** Client sinh type cho bảng không tồn tại → drift ngay ngày đầu | Schema luôn khớp migration đã apply. Thiết kế toàn cảnh để ở ERD/`DATABASE_SCHEMA.md`. Muốn giữ draft Prisma thì để ngoài đường chạy, ghi rõ `NON-RUNTIME DRAFT` |
| 3 | Envelope/mã lỗi lệch giữa các controller | FE phải xử lý hai kiểu response | Một interceptor + một enum, dựng ở Phase 1 |
| 4 | Refresh rotation làm ẩu | Lỗ hổng im lặng — không triệu chứng cho tới khi bị khai thác | Test bắt buộc: dùng lại token cũ phải bị từ chối, kiểm cả trường hợp nhiều session |
| 5 | Tiền dùng float, hoặc Decimal lọt ra API | Sai số cộng dồn; hoá đơn lệch | ADR-010 trước khi code |
| 6 | Race tạo trùng invoice/payroll | Hai request đồng thời tạo hai bản ghi cho cùng một kỳ | Idempotency key + unique constraint. Test trên DB thật |
| 7 | Thanh toán vượt số dư | `amount` phải ≤ `totalAmount - paidAmount`. Đã ghi trong entity spec | Kiểm ở service **và** ràng buộc DB |
| 8 | Payroll đã finalized vẫn sửa được | Cổng một chiều bị thủng | State machine trong Module Spec + test transition |
| 9 | Làm dashboard sớm | Phải viết lại khi bảng nguồn đổi | Để cuối cùng |

### 16. Bẫy môi trường — đã có người vấp

```
OneDrive tự xoá thư mục vừa tạo         → repo phải nằm ngoài OneDrive
git worktree đặt BÊN TRONG repo         → 88 file .md bị nhân đôi, bản sao còn cũ
pnpm-workspace.yaml phải tồn tại TRƯỚC  khi chạy `pnpm add -Dw`
pnpm init sinh "^11.21.0" cho packageManager → corepack lỗi, phải bỏ dấu ^
create-next-app báo "path is not writable" khi thư mục cha chưa tồn tại
next/font/google fetch lúc BUILD        → cần mạng; không có thì dùng @import trong CSS
subsets thiếu 'vietnamese'              → mất dấu toàn bộ giao diện
```

Môi trường đang dùng: pnpm 11.21.0 · Node 24 · npm 11.

### 17. Nợ kỹ thuật đã biết

Đọc `ai/known-issues/KNOWN_ISSUES.md` để có đủ. Những cái ảnh hưởng tới backend:

| ID | Vấn đề |
|---|---|
| **BUILD-001** | **`turbo.json` không tồn tại**, dù root `package.json` gọi `turbo run` và `turbo` có trong devDependencies → `pnpm build` ở root **fail**. Dùng `pnpm --filter web build`. **Sửa ở Phase 1** — có 2 app rồi thì không hoãn được nữa |
| **API-001** | 6 endpoint được FE contract tham chiếu nhưng **chưa được định nghĩa**; nhiều mã lỗi `INVOICE_*` `RATE_*` `SESSION_*` `AI_*` đang là *proposed, not agreed* — chưa dùng được cho tới khi có người duyệt |
| **DEBT-001** | **Không có transaction xuyên hai database.** Postgres và Mongo không chung transaction. Thiết kế luồng phải chịu được lỗi một nửa |
| **WEB-003** | Hai màn `/admin/users` đang bất đồng về định dạng ngày → màn detail sẽ vỡ khi gặp API thật |
| **DOC-004** | HSK là 1–6 hay 1–9 vẫn mâu thuẫn giữa các file. Entity spec + GLOSSARY nói **1–6** |

**Quy tắc dữ liệu áp cho toàn bộ backend:**

- Ngày giờ: **UTC ISO 8601 trên đường truyền**. Format chỉ ở tầng hiển thị. Không bao giờ
  lưu chuỗi đã format (`"09/08/2026"`) vào data module
- Endpoint xuất hiện trong FE contract nhưng không có trong `docs/api/**` **không phải giấy
  phép để tự bịa ra**. Ghi vào mục cần bổ sung, mock lại, đánh dấu `MOCK()`
- PostgreSQL dùng Prisma, không viết SQL thô trừ khi profiling chứng minh cần

---

## PHẦN IV — BẮT ĐẦU

### 18. Ba việc đầu tiên

1. **Đọc 4 file** — theo thứ tự: `ai/context/project-brain.md` → `ai/PROGRESS.md` →
   `ai/rules/working-rules.md` → `ai/known-issues/KNOWN_ISSUES.md`
2. **Xin 6 câu trả lời ở §6** từ chủ project, gộp một lần. Không hỏi rải rác từng câu
3. **Viết ADR 009–014** rồi mới sang Phase 0B

### 19. Chạy repo lần đầu

```bash
# Yêu cầu: Node 24, pnpm 11, Python 3 (cho skill ui-ux-pro-max)
pnpm install

# Frontend — CHỈ lệnh này chạy được
pnpm --filter web dev          # http://localhost:3000
pnpm --filter web build

# KHÔNG dùng `pnpm dev` / `pnpm build` ở root — thiếu turbo.json, sẽ fail (BUILD-001)

pnpm check:docs                # 7 check cơ học trên docs, <1 giây, CI chạy đúng cái này
```

Skill AI dùng trong repo nằm ở `.agents/skills/`. `ui-ux-pro-max` **bị gitignore** — mỗi
clone hoặc worktree phải cài lại một lần:

```bash
npx ui-ux-pro-max-cli init --ai universal
```

Thiếu nó thì agent phải **dừng và báo**, không tự cài, không chạy tiếp im lặng.

Backend chưa tồn tại nên chưa có lệnh nào để chạy.

### 20. Quy trình làm việc bắt buộc

Áp cho mọi task không phải sửa một dòng:

```
Analyze  →  Plan  →  DỪNG chờ duyệt  →  Code  →  Ghi lại
```

Đụng **DB schema, auth, RBAC, hoặc thanh toán** thì **luôn** phải chờ duyệt rõ ràng, không
ngoại lệ.

Nhiều người/agent làm song song:

- **Claim trước khi code** — sửa dòng tương ứng trong `ai/PROGRESS.md` thành
  `🔶 (tên · ngày)` và commit riêng dòng đó
- **Worktree riêng cho mỗi người** — chung một thư mục làm việc là đè lên file chưa commit
  của nhau
- **Migration merge một mình, trước mọi code phụ thuộc nó**
- **Khoá độc quyền** cho: `prisma/**`, `packages/types/**`, error-code registry, API
  contract, root config. Đây là xung đột **file**, tài liệu rõ đến mấy cũng không cứu
- Agent có thể chuẩn bị PR; **quyền merge theo quy trình duyệt của repo**

**Quy ước nhánh và commit:**

```
feat/s<sprint>-<lane>-<slice>     feat/s1-api-auth · feat/s2-api-billing
docs/<chủ-đề>                     docs/backend-plan
chore/<việc>                      chore/fast-verify-rule

commit: <type>(<scope>): <mô tả>  feat(api): add POST /auth/login
```

Không commit thẳng vào `main`. Mọi thứ vào `main` đều qua PR. Rebase lên `main` ít nhất một
lần mỗi phiên làm việc, và luôn rebase trước khi mở PR.

### 21. Trạng thái bản kế hoạch này

Đã qua 2 vòng phản biện. Các điểm sau đã được xác minh trực tiếp trên repo, không phải suy
đoán: `apps/api` chưa tồn tại · `packages/` rỗng · 13 màn admin đã có `page.tsx` · 17 marker
`MOCK()` · `turbo.json` thiếu · 8 ADR (001–008) · ADR-008 đã Accepted · 4 field tiền đang là
`Decimal` · `rateType` đã là enum `per_session`/`per_hour` · Classes/Enrollment không có
trong `API_ADMIN.md`.

Chưa có dòng code nào được viết theo kế hoạch này.
