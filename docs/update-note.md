# Kế Hoạch Đánh Giá & Cải Tiến Codebase: Kiến Trúc & Chất Lượng Code

Tài liệu này ghi lại kết quả rà soát các luồng chính và những phần source quan trọng của dự án (Backend NestJS + Frontend Next.js), chỉ ra các điểm nghẽn về mặt kiến trúc, bảo mật và chất lượng code (code smells/anti-patterns) cùng giải pháp nâng cấp đề xuất. Đây là backlog kỹ thuật cần xác minh thêm bằng benchmark/test trước khi triển khai, không phải tuyên bố đã audit từng file.

---

## Bảng Tổng Hợp Các Điểm Cần Cải Tiến

| # | Hạng mục | Vị trí | Mức độ ưu tiên | Vấn đề hiện tại | Giải pháp đề xuất |
|---|---|---|:---:|---|---|
| **1** | **Rate Limiting Toàn Diện** | `apps/api/src/auth/auth.service.ts` | **Cao** | Dùng `Map` in-memory thủ công trong service, chỉ bảo vệ được `login()`. Bỏ trống `register`, `change-password`, `payroll`. | Thay bằng `@nestjs/throttler` (`ThrottlerModule`) với Tiered Limiting và Custom Tracker. |
| **2** | **Bảo Mật HTTP Headers** | `apps/api/src/main.ts` | **Cao** | Thiếu `helmet()`, API dễ bị tấn công Clickjacking, MIME sniffing, XSS headers. | Bổ sung `helmet()` trong `main.ts`. |
| **3** | **Lỗi Logic trong Exception Filter** | `apps/api/src/common/filters/global-exception.filter.ts` | **Cao** | Bất kỳ lỗi HTTP 404 nào (sai URL, endpoint không tồn tại) đều bị gán cứng mã lỗi `USER_NOT_FOUND`. | Sửa thành `RESOURCE_NOT_FOUND` hoặc `ROUTE_NOT_FOUND` cho generic 404. Bổ sung bắt lỗi Prisma (`P2025`, `P2003`) và Mongoose (`CastError`). |
| **4** | **N+1 Database Query (Tuần tự)** | `apps/api/src/sessions/sessions.service.ts` | **Trung bình** | Hàm `teacherMarkAttendance()` dùng vòng lặp `for...await` gọi từng lệnh `upsert` xuống DB (30 học sinh = 30 round-trips). | Đổi sang `prisma.$transaction(records.map(...))` để chạy batch nguyên tử trong 1 round-trip. |
| **5** | **Lặp Lại UUID Regex Thay Vì Pipe** | `classes`, `lessons`, `sessions`, `payroll`, `billing` services | **Trung bình** | Tự viết Regex `UUID_REGEX` và `if (!UUID_REGEX.test(id))` lặp lại ở nhiều Service methods. `users.service.ts` không phải nơi chính của pattern này. | Đưa validation lên Controller dùng NestJS `new ParseUUIDPipe()` để fail-fast ở tầng Pipe. |
| **6** | **Trang Chủ Frontend Hardcode Redirect** | `apps/web/src/app/page.tsx` | **Trung bình** | Root route `/` redirect cứng về `/admin/users`; teacher/student đăng nhập sẽ đi vào khu vực admin và gặp trạng thái không đủ quyền. Route dashboard Student thật là `/student`, không phải `/student/dashboard`. | Điều hướng theo vai trò (Admin → `/admin`, Teacher → `/teacher/sessions`, Student → `/student`) hoặc hiển thị landing page public. |
| **7** | **Lặp Lại Bản Đồ Mã Lỗi ở Frontend** | `apps/web/src/app/login/page.tsx`, `register/page.tsx` | **Thấp** | Biến `MESSAGE_FOR_CODE` bị copy-paste thủ công giữa nhiều trang. | Gom tập trung về `apps/web/src/lib/error-messages.ts`. |
| **8** | **Thiếu Schema Validation Cho `.env`** | `apps/api/src/app.module.ts` | **Trung bình** | `ConfigModule.forRoot` không có schema validation. Biến thiếu chỉ bị phát hiện lúc runtime. | Dùng `joi` hoặc `zod` validate toàn bộ biến môi trường ngay khi khởi động (`fail-fast`). |
| **9** | **Thiếu Request Correlation ID (Tracing)** | `apps/api/src/main.ts` / cross-cutting middleware | **Thấp** | Khó trace ngược lỗi 500 giữa log Frontend và log Backend khi chạy production. Đây không phải trách nhiệm riêng của `EnvelopeInterceptor`. | Thêm middleware hoặc interceptor riêng sinh `x-request-id`, đưa id vào response header và log context. |
| **10** | **Race Condition Thanh Toán (Lost Update)** | `apps/api/src/billing/billing.service.ts` | **Khẩn cấp** | Đọc `invoice.paidAmount` ở ngoài rồi update trong transaction; 2 thanh toán đồng thời sẽ ghi đè làm mất tiền. | Dùng atomic increment `paidAmount: { increment }` hoặc khóa dòng `SELECT ... FOR UPDATE`. |
| **11** | **Nghẽn RAM/OOM ở Dashboard** | `apps/api/src/dashboard/dashboard.service.ts` | **Cao** | Kéo toàn bộ hóa đơn chưa trả về RAM Node.js để chạy vòng lặp `for` tính tổng nợ thay vì dùng SQL SUM. | Đổi sang câu lệnh SQL Aggregation `SELECT SUM(total_amount - paid_amount)`. |
| **12** | **Full Collection Scan (COLLSCAN) MongoDB** | `apps/api/src/questions/questions.service.ts` | **Trung bình** | Tìm kiếm câu hỏi bằng Regex không neo đầu trên 4 trường không có Text Index. | Bổ sung MongoDB `$text` index (Full-text search) cho câu hỏi. |
| **13** | **Hardcoded Cookie Path Lệch API Prefix** | `apps/api/src/auth/auth.controller.ts` | **Trung bình** | `COOKIE_PATH = '/api/v1/auth'` bị fix cứng trong khi `API_PREFIX` ở `main.ts` là động qua biến môi trường. | Rút đường dẫn cookie path động theo cấu hình `API_PREFIX`. |
| **14** | **Access Token Sống 15m Sau Đổi Mật Khẩu** | `apps/api/src/common/guards/jwt-auth.guard.ts` | **Trung bình** | Đổi mật khẩu chỉ hủy Refresh Token; Access Token cũ vẫn dùng được đủ 15 phút. | Thêm `passwordChangedAt` hoặc `tokenVersion` trên User để Guard chặn tức thì. |
| **15** | **Monitoring Trả Về Số Liệu Hardcode** | `apps/api/src/dashboard/monitoring.service.ts` | **Cao** | Trạng thái Redis, Cloudflare R2, latency, quota Gemini và một số metric đang là hằng số demo; endpoint có thể báo `healthy` dù service thật chưa được kiểm tra. | Tách probe adapter cho từng dependency, gọi health API thật, trả `unknown/degraded` khi chưa cấu hình và không hiển thị metric giả như số liệu production. |


---

## Chi Tiết Các Hạng Mục Cải Tiến

### 1. Nâng cấp Rate Limiting sang `ThrottlerModule`
- **Hiện trạng:** `AuthService.login()` quản lý 2 `Map`: `loginAttempts` và `rotationCache`. Các endpoint khác như đăng ký (`POST /auth/register`), đổi mật khẩu (`POST /auth/change-password`), tính lương (`POST /payroll/periods`) hoàn toàn không có rate limit.
- **Giải pháp:**
  - Cài đặt `@nestjs/throttler`.
  - Khai báo 2 mức giới hạn trong `AppModule`: Short burst (10 req/s) và Medium (100 req/phút).
  - Viết `CustomThrottlerGuard` để track theo cặp `(IP, Email)` cho route login và `(User ID)` cho authenticated routes.
  - Sử dụng `@Throttle({ default: { limit: 5, ttl: 900000 } })` trên các route nhạy cảm.

### 2. Thêm Helmet bảo vệ HTTP Headers
- **Hiện trạng:** Trong `apps/api/src/main.ts`, ứng dụng chỉ cấu hình `CORS`, `cookieParser`, `GlobalPipes`, `GlobalInterceptors`, `GlobalFilters`. Hoàn toàn thiếu lớp bảo vệ HTTP headers.
- **Giải pháp:**
  ```bash
  pnpm --filter api add helmet @types/helmet
  ```
  ```typescript
  // apps/api/src/main.ts
  import helmet from 'helmet';
  // ...
  app.use(helmet());
  ```

### 3. Sửa lỗi logic trong `GlobalExceptionFilter`
- **Hiện trạng:**
  ```typescript
  // apps/api/src/common/filters/global-exception.filter.ts dòng 54
  else if (status === 404) code = ErrorCode.USER_NOT_FOUND;
  ```
  Khi người dùng gọi sai một URL bất kỳ (ví dụ: `GET /api/v1/unknown-endpoint`), server trả về lỗi 404 với mã `"code": "USER_NOT_FOUND"`. Điều này gây hiểu lầm nghiêm trọng cho client.
- **Hiện trạng xử lý DB:** Chỉ bắt `PrismaClientKnownRequestError` mã `P2002`. Nếu lệnh `update` không tìm thấy bản ghi (mã `P2025`), lỗi sẽ bị văng thành HTTP 500 `INTERNAL_SERVER_ERROR`. Ngoài ra lỗi Mongoose (`CastError`) khi truyền sai ObjectId cũng bị biến thành 500.
- **Giải pháp:**
  - Đổi generic 404 thành `ErrorCode.RESOURCE_NOT_FOUND` hoặc `ROUTE_NOT_FOUND`.
  - Bổ sung xử lý `P2025` -> HTTP 404.
  - Bổ sung xử lý Mongoose `CastError` -> HTTP 400 `VALIDATION_ERROR`.

### 4. Tối ưu N+1 Query trong `teacherMarkAttendance`
- **Hiện trạng:**
  ```typescript
  // apps/api/src/sessions/sessions.service.ts dòng 444
  for (const rec of dto.records) {
    await this.prisma.sessionAttendance.upsert({ ... });
  }
  ```
  Với lớp học 30–50 học sinh, hàm này gửi 30–50 truy vấn độc lập tuần tự qua mạng xuống PostgreSQL.
- **Giải pháp:**
  ```typescript
  await this.prisma.$transaction(
    dto.records.map((rec) =>
      this.prisma.sessionAttendance.upsert({
        where: {
          sessionId_studentId: { sessionId, studentId: rec.studentId },
        },
        update: { status: rec.status },
        create: { sessionId, studentId: rec.studentId, status: rec.status },
      }),
    ),
  );
  ```
  Gộp thành 1 transaction duy nhất, giảm độ trễ từ ~500ms xuống còn ~30ms.

### 5. Chuẩn hóa UUID Validation bằng `ParseUUIDPipe`
- **Hiện trạng:** Các file `classes.service.ts`, `lessons.service.ts`, `sessions.service.ts`, `payroll.service.ts`, `billing.service.ts` đều khai báo biến regex:
  ```typescript
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  ```
  Và lặp lại kiểm tra thủ công:
  ```typescript
  if (!UUID_REGEX.test(id)) throw new AppException(ErrorCode.VALIDATION_ERROR, '...');
  ```
- **Giải pháp:**
  Chuyển việc kiểm tra lên Controller bằng NestJS Pipe có sẵn:
  ```typescript
  @Get(':id')
  findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.service.findById(id);
  }
  ```
  Giúp Service hoàn toàn sạch bóng các lệnh regex lặp đi lặp lại.

### 6. Sửa Trang Chủ Frontend (`apps/web/src/app/page.tsx`)
- **Hiện trạng:**
  ```tsx
  import { redirect } from "next/navigation";
  export default function Home() {
    redirect("/admin/users");
  }
  ```
  Mọi user vào trang chủ đều bị ép sang trang quản trị `/admin/users`. Học sinh hoặc giáo viên vào trang chủ sẽ gặp màn hình "Không đủ quyền".
- **Giải pháp:**
  Đọc thông tin phiên từ `useAuthStore` (hoặc kiểm tra role sau khi mount):
  - Chưa đăng nhập -> Chuyển về `/login` (hoặc hiển thị Landing Page).
  - Role `admin` -> Chuyển về `/admin/users`.
  - Role `teacher` -> Chuyển về `/teacher/sessions`.
  - Role `student` -> Chuyển về `/student`.

### 7. Tập trung hóa Bản Đồ Lỗi Frontend (`MESSAGE_FOR_CODE`)
- **Hiện trạng:** `apps/web/src/app/login/page.tsx` và `apps/web/src/app/register/page.tsx` đều tự định nghĩa:
  ```typescript
  const MESSAGE_FOR_CODE: Record<string, string> = { ... };
  ```
- **Giải pháp:** Tạo file `apps/web/src/lib/error-messages.ts` quản lý tập trung tất cả các mã lỗi từ [`docs/api/API_ERROR_CODES.md`](api/API_ERROR_CODES.md) dịch sang tiếng Việt thân thiện với người dùng.

### 8. Thêm Schema Validation cho Biến Môi Trường (Environment Validation)
- **Hiện trạng:** `ConfigModule` chỉ đọc `.env` mà không validate. Nếu dev mới clone dự án quên cấu hình `JWT_ACCESS_SECRET` hoặc sai định dạng `DATABASE_URL`, server vẫn khởi động và chỉ crash khi có request gọi tới.
- **Giải pháp:** Dùng `joi` trong `ConfigModule.forRoot({ validationSchema: Joi.object({ ... }) })` để ép buộc server phải kiểm tra đủ các biến cần thiết trước khi khởi động.

### 9. Quy Ước Styling Hybrid (Tailwind + CSS Modules)
- **Định hướng thống nhất:**
  - **Dùng Tailwind CSS (Cơ bản / Tiện ích / Nhanh):**
    - Layout: `flex`, `grid`, `items-center`, `justify-between`.
    - Spacing & Sizing: `gap-4`, `p-4`, `mt-2`, `w-full`, `max-w-xl`.
    - Responsive: `hidden md:block`, `flex-col sm:flex-row`.
    - Typography cơ bản: `text-sm`, `font-medium`, `truncate`.
  - **Dùng CSS Modules + Hanlu Tokens (Phức tạp / Độc bản / Đặc thù HSK):**
    - Hiệu ứng lật thẻ Flashcard 3D (`perspective`, `transform-style: preserve-3d`).
    - Bảng tính lương, bảng điểm danh phức tạp (sticky multi-columns, custom scrollbars).
    - Bộ nhận diện thương hiệu Hanlu (bảng màu HSL cổ điển, typography Hán ngữ).
    - Canvas luyện viết chữ Hán và hoạt ảnh thứ tự nét viết (Stroke Order).

### 10. Lỗ Hổng Race Condition Trong Thanh Toán (`BillingService.recordPayment`)
- **Vị trí:** [`apps/api/src/billing/billing.service.ts` dòng 527–578](../apps/api/src/billing/billing.service.ts#L527-L578)
- **Vấn đề:** 
  Hàm đọc `invoice = findUnique(...)` bên ngoài transaction, sau đó tính toán trong bộ nhớ JS:
  ```typescript
  const newPaidAmount = invoice.paidAmount.plus(paymentAmount);
```

  rồi mới update xuống DB. Nếu có 2 thanh toán gửi đến đồng thời (ví dụ webhook ngân hàng retry song song hoặc 2 admin ghi nhận cùng lúc):
  - Request 1 đọc nợ: 0đ, cộng 500k -> ghi 500k.
  - Request 2 đọc nợ: 0đ, cộng 500k -> ghi 500k.
  - **Hậu quả:** 2 giao dịch thanh toán được lưu vào bảng `TuitionPayment` (tổng 1 triệu), nhưng trường `paidAmount` trên hóa đơn chỉ tăng 500k (Mất cập nhật / Lost Update).
- **Giải pháp:** Sử dụng Atomic Increment của Prisma kết hợp điều kiện bảo vệ:
  ```typescript
  await tx.studentInvoice.update({
    where: { id: invoiceId, status: { not: InvoiceStatus.paid } },
    data: { paidAmount: { increment: paymentAmount } },
  });
  ```
  hoặc khóa dòng bằng Raw SQL `SELECT ... FOR UPDATE` trong transaction.

### 11. Nguy Cơ Nghẽn RAM / OOM Trong Dashboard (`DashboardService.getStats`)
- **Vị trí:** [`apps/api/src/dashboard/dashboard.service.ts` dòng 33–57](../apps/api/src/dashboard/dashboard.service.ts#L33-L57)
- **Vấn đề:** Để tính tổng số tiền học phí còn nợ (`outstandingAmount`), hàm chạy:
  ```typescript
  const invoicesForOutstanding = await this.prisma.studentInvoice.findMany({
    where: { status: { in: [InvoiceStatus.unpaid, InvoiceStatus.partially_paid] } },
    select: { totalAmount: true, paidAmount: true },
  });
  for (const inv of invoicesForOutstanding) {
    outstandingAmount = outstandingAmount.plus(inv.totalAmount.minus(inv.paidAmount));
  }
  ```
  Khi hệ thống hoạt động lâu dài có 20.000–50.000 hóa đơn chưa trả, câu lệnh này kéo hàng chục ngàn dòng dữ liệu về RAM của Node.js rồi lặp bằng JS. Điều này gây tốn bộ nhớ nghiêm trọng và có thể làm crash server (Out Of Memory).
- **Giải pháp:** Để PostgreSQL tính toán tổng số tiền trực tiếp:
  ```typescript
  const [{ sum }] = await this.prisma.$queryRaw<[{ sum: Prisma.Decimal | null }]>`
    SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS sum
    FROM student_invoices
    WHERE status IN ('unpaid', 'partially_paid')
  `;
  ```

### 12. Full Collection Scan (COLLSCAN) Trong Tìm Kiếm Câu Hỏi MongoDB
- **Vị trí:** [`apps/api/src/questions/questions.service.ts` dòng 48–55](../apps/api/src/questions/questions.service.ts#L48-L55)
- **Vấn đề:** Khi tìm kiếm từ khóa câu hỏi (`query.q`), hệ thống dùng biểu thức chính quy Regex không neo đầu:
  ```typescript
  const needle = new RegExp(escapeRegExp(query.q.trim()), 'i');
  filter.$or = [
    { 'content.prompt': needle },
    { 'content.passage': needle },
    { 'content.transcript': needle },
    { 'options.text': needle },
  ];
  ```
  MongoDB không thể sử dụng B-Tree Index thông thường cho regex dạng `.*text.*`. Câu truy vấn này bắt buộc MongoDB phải quét toàn bộ từng document trong collection (COLLSCAN).
- **Giải pháp:** Tạo Text Index trên MongoDB schema:
  ```typescript
  QuestionSchema.index({ 'content.prompt': 'text', 'content.passage': 'text', 'options.text': 'text' });
  ```
  và truy vấn bằng toán tử `$text: { $search: query.q }`.

### 13. Rủi Ro Lệch Đường Dẫn Cookie (`COOKIE_PATH`)
- **Vị trí:** [`apps/api/src/auth/auth.controller.ts` dòng 26](../apps/api/src/auth/auth.controller.ts#L26)
- **Vấn đề:** `COOKIE_PATH = '/api/v1/auth'` bị gán cứng trong file Controller, trong khi `main.ts` lại cho phép tùy biến prefix qua biến môi trường: `process.env.API_PREFIX ?? 'api/v1'`. Nếu deploy thay đổi prefix (ví dụ sang `/api`), cookie `refresh_token` sẽ không bao giờ được gửi kèm lên server, làm sập toàn bộ tính năng silent refresh.
- **Giải pháp:** Đưa `COOKIE_PATH` thành hàm động dựa trên cấu hình `API_PREFIX` chung của ứng dụng.

### 14. Khoảng Trống Vô Hiệu Hóa Access Token Khi Đổi Mật Khẩu
- **Vị trí:** [`apps/api/src/common/guards/jwt-auth.guard.ts`](../apps/api/src/common/guards/jwt-auth.guard.ts)
- **Vấn đề:** Khi người dùng bị lộ mật khẩu và thực hiện đổi mật khẩu (`changePassword`), hệ thống thu hồi toàn bộ `RefreshToken` trong DB. Tuy nhiên, Access Token hiện tại (thời hạn 15 phút) vẫn hoàn toàn hợp lệ do `JwtAuthGuard` chỉ kiểm tra chữ ký và trường `status: active` trong DB. Kẻ tấn công nếu đang giữ Access Token vẫn có thể tiếp tục thao tác dữ liệu thêm tối đa 15 phút.
- **Giải pháp:** Thêm trường `passwordChangedAt: DateTime` trên bảng `users`. Trong `JwtAuthGuard`, so sánh:
  ```typescript
  if (claims.iat * 1000 < user.passwordChangedAt.getTime()) {
    throw new AppException(ErrorCode.AUTH_TOKEN_INVALID, 'Phiên đăng nhập đã hết hạn do đổi mật khẩu');
  }
  ```

### 15. Monitoring không phản ánh hạ tầng thật

- **Hiện trạng:** `MonitoringService.getHealthProbes()` chỉ query PostgreSQL thật. Redis và Cloudflare R2 được gán sẵn `healthy`; Gemini trả quota, latency và model cố định ngoài việc kiểm tra có key hay không.
- **Rủi ro:** Admin có thể hiểu nhầm dashboard là health check production trong khi các dependency chưa hề được ping. Số liệu quota/latency hardcode cũng làm mất giá trị cảnh báo.
- **Giải pháp:** Mỗi dependency có probe riêng với timeout; probe phải trả `healthy`, `degraded` hoặc `down` theo kết quả thật. Khi integration chưa tồn tại, trả `unknown` và ghi rõ “not configured”, không dùng số liệu giả.
