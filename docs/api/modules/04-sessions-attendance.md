# SPEC 04 — Sessions & Attendance (Admin)

---
module: sessions-attendance
status: proposed
blocked_by: SCOPE-01 (Class + ClassEnrollment không có endpoint nào trong docs/api/) · SCOPE-02 (transition scheduled→in_progress→completed_pending không có endpoint teacher-side) · nhóm mã lỗi SESSION_* *proposed, not agreed* · C1 (nickname vs fullName)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module chịu trách nhiệm phần Admin của vòng đời `ClassSession`: liệt kê session teacher đã nộp chờ duyệt, approve hoặc reject kèm lý do, và phát Notification tương ứng. Ranh giới dừng ở chỗ `ClassSession.status = approved`; việc gom session vào kỳ lương và tính tiền thuộc spec 05 (Payroll). Module này ĐỌC `SessionAttendance` để trả số liệu điểm danh tóm tắt, KHÔNG ghi bảng này (ghi là quyền của teacher, RBAC_MATRIX: `SessionAttendance mark = 🔒 Teacher`). Module này KHÔNG BAO GIỜ ghi `payrollPeriodId`.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `ClassSession` | Đọc + Ghi | Ghi đúng 3 field: `status`, `rejectionReason`, `updatedAt`. Không ghi `actualStart`/`actualEnd`/`topic`/`notes`/`payrollPeriodId` |
| `SessionAttendance` | Đọc | Gom nhóm theo `status` để dựng `attendanceSummary`. Không ghi |
| `Class` | Đọc | Lấy `name`, `hskLevel` để hiển thị. ⚠ Không có endpoint nào tạo/đọc bảng này — SCOPE-01 |
| `ClassEnrollment` | Đọc | Mẫu số đối chiếu điểm danh (`status = active`). ⚠ SCOPE-01 |
| `User` | Đọc | Tên hiển thị teacher. ⚠ C1: `nickname` hay `fullName` |
| `Notification` | Ghi | INSERT `session_approved` / `session_rejected` |
| `PayrollPeriod` | Đọc | Chỉ để kiểm `ClassSession.payrollPeriodId IS NOT NULL` → khoá cứng |

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/admin/sessions/pending` | admin | List session `status = completed_pending`, phân trang + lọc | defined (API_ADMIN.md) |
| PATCH | `/api/v1/admin/sessions/:id/approve` | admin | Duyệt session — cổng một chiều | defined (API_ADMIN.md) |
| PATCH | `/api/v1/admin/sessions/:id/reject` | admin | Từ chối session kèm `rejectionReason` | defined (API_ADMIN.md) |

Không có endpoint nào khác trong phạm vi module này. Đặc biệt KHÔNG có: `GET /admin/sessions/:id`, `GET /admin/sessions` (toàn bộ), bulk approve. Chưa được duyệt → không được tự thêm.

## 3. DTO

### 3.1 `GET /admin/sessions/pending`

**Request (query string)**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `page` | int | không | `>= 1`, default `1` |
| `limit` | int | không | `1..100`, default `20` |
| `teacherId` | uuid | không | Phải tồn tại User `role = teacher` |
| `classId` | uuid | không | uuid v4 |
| `dateFrom` | Date `YYYY-MM-DD` | không | Lọc theo `scheduledDate >= dateFrom` |
| `dateTo` | Date `YYYY-MM-DD` | không | `>= dateFrom`; lọc `scheduledDate <= dateTo` |
| `sort` | enum | không | `scheduledDate_asc` \| `scheduledDate_desc`, default `scheduledDate_asc` (cũ nhất trước — session chờ lâu nhất phải nổi lên) |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "classId": "uuid",
      "className": "string",
      "hskLevel": 3,
      "teacherId": "uuid",
      "teacherName": "string",
      "scheduledDate": "2026-07-13",
      "scheduledStart": "18:00",
      "scheduledEnd": "20:00",
      "actualStart": "2026-07-13T11:05:00Z",
      "actualEnd": "2026-07-13T13:02:00Z",
      "topic": "string",
      "notes": "string|null",
      "status": "completed_pending",
      "attendanceSummary": {
        "present": 8,
        "absentExcused": 1,
        "absentUnexcused": 2,
        "marked": 11,
        "enrolledActive": 12
      },
      "updatedAt": "2026-07-13T13:03:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Ghi chú field dẫn xuất (KHÔNG có cột trong DB, tính lúc đọc):
- `className`, `hskLevel` ← `Class.name`, `Class.hskLevel` (⚠ C4: 1–9 hay 1–6 chưa chốt).
- `teacherName` ← `User.nickname` (⚠ C1: API_AUTH dùng `fullName`; chốt C1 trước khi khoá contract).
- `attendanceSummary.present|absentExcused|absentUnexcused` ← COUNT theo `SessionAttendance.status`; `marked` = tổng ba số; `enrolledActive` = COUNT `ClassEnrollment WHERE classId AND status = 'active'`.
- KHÔNG có field `submittedAt` — `ClassSession` không lưu thời điểm nộp. Dùng `updatedAt` làm xấp xỉ (Q-SES-7).

### 3.2 `PATCH /admin/sessions/:id/approve`

**Request** — body rỗng (`{}`). Không nhận field nào. Mọi field client gửi lên đều bị bỏ qua (`whitelist: true, forbidNonWhitelisted: true`). Đặc biệt không nhận `actualStart`, `actualEnd`, `payrollPeriodId`, `amount`.

**Response 200**

```json
{ "data": { "id": "uuid", "status": "approved", "rejectionReason": null, "updatedAt": "2026-08-19T09:00:00Z" } }
```

### 3.3 `PATCH /admin/sessions/:id/reject`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `rejectionReason` | string | **có** | Trim; `minLength 10`, `maxLength 2000`; không được chỉ khoảng trắng |

**Response 200**

```json
{ "data": { "id": "uuid", "status": "rejected", "rejectionReason": "string", "updatedAt": "2026-08-19T09:00:00Z" } }
```

## 4. Rule nghiệp vụ (invariant)

| ID | Phát biểu |
|---|---|
| **INV-SESSION-01** | Chỉ session có `status = 'completed_pending'` mới approve hoặc reject được. Mọi status khác (`scheduled`, `in_progress`, `approved`, `rejected`) đều bị từ chối, không có ngoại lệ. |
| **INV-SESSION-02** | `approved` là cổng một chiều: một session đã ở `approved` không bao giờ chuyển sang bất kỳ status nào khác qua API. Không tồn tại đường un-approve. |
| **INV-SESSION-03** | Session có `status = 'approved'` **và** `payrollPeriodId IS NOT NULL` là bất biến toàn phần: không field nào của nó được ghi bởi bất kỳ module nào (kể cả `topic`, `notes`, `actualStart`, `actualEnd`). Kiểm ở service layer + `WHERE payrollPeriodId IS NULL` trên mọi câu UPDATE. |
| **INV-SESSION-04** | Reject bắt buộc kèm `rejectionReason` không rỗng sau trim. Không tồn tại session `status = 'rejected'` mà `rejectionReason IS NULL`. |
| **INV-SESSION-05** | Approve luôn set `rejectionReason = NULL`. `rejectionReason` chỉ mang giá trị khi `status = 'rejected'`. |
| **INV-SESSION-06** | Endpoint approve/reject KHÔNG BAO GIỜ ghi `payrollPeriodId`. Field này chỉ do spec 05 ghi. |
| **INV-SESSION-07** | Một session chỉ được review đúng một lần. Hai request approve (hoặc approve + reject) đồng thời trên cùng `id` → đúng một request có `affectedRows = 1` và thành công; request còn lại `affectedRows = 0` và nhận 409. |
| **INV-SESSION-08** | Approve thành công sinh đúng **1** `Notification` `type = 'session_approved'`, `userId = ClassSession.teacherId`, `referenceId = session.id`, `referenceType = 'session'`, **trong cùng transaction** với việc đổi status. Rollback → không có notification mồ côi và status không đổi. |
| **INV-SESSION-09** | Reject thành công sinh đúng **1** `Notification` `type = 'session_rejected'`, `userId = teacherId`, `payload` chứa `rejectionReason`, cùng transaction. |
| **INV-SESSION-10** | `GET /admin/sessions/pending` chỉ trả session `status = 'completed_pending'`. Không rò rỉ session ở status khác dù client truyền query gì. |
| **INV-SESSION-11** | Với mọi session: số bản ghi `SessionAttendance` là duy nhất theo student — `UNIQUE(sessionId, studentId)`. `attendanceSummary.marked` không bao giờ vượt `enrolledActive` khi dữ liệu nhất quán. |
| **INV-SESSION-12** | `attendanceSummary` là dẫn xuất, không lưu cột. Không có đường ghi đè nó qua API. |
| **INV-SESSION-13** | Nếu `actualStart` và `actualEnd` cùng khác NULL thì `actualEnd > actualStart`. Đây là tiền đề để spec 05 tính `per_hour`. |
| **INV-SESSION-14** | Chỉ actor `role = 'admin'` **và** `status = 'active'` gọi được cả 3 endpoint. Kiểm ở service layer, không chỉ dựa `@Roles()` guard. |
| **INV-SESSION-15** | Mọi approve/reject thành công ghi một dòng audit bất biến: `actorId`, `sessionId`, `from`, `to`, `rejectionReason`, `at`. Ghi trong cùng transaction. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` trên cả 3 route. Guard là điều kiện cần, không đủ.

Kiểm bổ sung ở **service layer** (câu điều kiện chính xác):

- `actor.role === 'admin' && actor.status === 'active'` — sai → `AUTH_INSUFFICIENT_ROLE` 403. Lý do kiểm lại: token có thể còn hiệu lực sau khi tài khoản bị suspend.
- **Không có điều kiện ownership.** RBAC_MATRIX ghi `ClassSession approve/reject = ✅` cho Admin (full access, own + others) → admin duyệt session của mọi teacher, không lọc theo `teacherId`.
- Teacher **không** gọi được 3 endpoint này, kể cả session của chính mình (`❌` trong ma trận).
- Student: `❌`.
- Chống tự duyệt: hệ thống hiện là một-role-một-user (`User.role` là enum đơn), nên không tồn tại user vừa admin vừa `session.teacherId`. Nếu sau này cho multi-role thì phải thêm điều kiện `session.teacherId !== actor.id` → Q-SES-5.

## 6. State machine

```
   [ngoài phạm vi module này — SCOPE-02: không có endpoint nào]
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
scheduled ──────────► in_progress ──────────► completed_pending
          teacher bắt đầu         teacher kết thúc + nộp
          (set actualStart)       (set actualEnd)
                                  → Notification session_submitted_for_review → Admin
                                                       │
                        ┌──────────────────────────────┴──────────────────────────────┐
                        │ PATCH /admin/sessions/:id/approve                            │ PATCH .../reject
                        ▼                                                              ▼
                  ╔═══════════╗                                                   ┌──────────┐
                  ║ approved  ║  ◄── CỔNG MỘT CHIỀU                               │ rejected │
                  ╚═══════════╝                                                   └──────────┘
                        │                                                              │
                        │ spec 05: POST /admin/payroll gắn payrollPeriodId              │
                        ▼                                                              ▼
        ╔══════════════════════════════════════╗                          ??? re-submit ???
        ║ approved + payrollPeriodId NOT NULL  ║                          CHƯA CHỐT — Q-SES-2
        ║        BẤT BIẾN TOÀN PHẦN            ║
        ╚══════════════════════════════════════╝
```

**Bảng chuyển đổi hợp lệ**

| Từ | Sang | Ai | Cơ chế | Trong spec này? |
|---|---|---|---|---|
| `scheduled` | `in_progress` | teacher | — | KHÔNG (SCOPE-02) |
| `in_progress` | `completed_pending` | teacher | — | KHÔNG (SCOPE-02) |
| `completed_pending` | `approved` | admin | `PATCH /:id/approve` | **CÓ** |
| `completed_pending` | `rejected` | admin | `PATCH /:id/reject` | **CÓ** |
| `rejected` | `completed_pending` | teacher? | — | CHƯA CHỐT (Q-SES-2) |
| `approved` | bất kỳ | — | **KHÔNG TỒN TẠI** | — |

**Cổng một chiều — phát biểu chính xác**

1. Vào `approved` là bất khả hồi ở tầng status: không endpoint, không cờ admin, không "undo". Sửa sai duy nhất = quy trình ngoài hệ thống + migration có kiểm soát.
2. Khi spec 05 gắn `payrollPeriodId`, session bị khoá cứng lần hai: `approved + payrollPeriodId IS NOT NULL` → mọi UPDATE bị chặn (INV-SESSION-03). Hai lớp khoá độc lập, không lớp nào thay thế lớp kia.
3. `rejected` là trạng thái nghỉ (không phải cổng một chiều theo thiết kế) nhưng hiện **cũng không có đường ra** vì chưa có endpoint re-submit → thực tế đang là ngõ cụt. Đây là lỗ hổng, không phải quyết định.

## 7. Transaction boundary

**TX-SES-A — approve** (isolation `READ COMMITTED`, đủ; xem §8 giải thích vì sao không cần `SERIALIZABLE`)

```
BEGIN
 1. UPDATE ClassSession
       SET status='approved', rejectionReason=NULL, updatedAt=now()
     WHERE id = :id AND status='completed_pending'
    -- affectedRows = 0  → THROW (rollback), phân loại lỗi ở §8
 2. INSERT Notification (userId=<teacherId của session>, type='session_approved',
                         referenceId=:id, referenceType='session', isRead=false)
 3. INSERT audit (actorId, sessionId, from='completed_pending', to='approved', at=now())
COMMIT
```

**TX-SES-B — reject**: giống TX-SES-A, thay `status='rejected'`, `rejectionReason=:reason`, notification `type='session_rejected'` với `payload = { "rejectionReason": "..." }`.

**Bắt buộc — cùng transaction**: đổi status + INSERT Notification + INSERT audit là một khối nguyên tử. Lý do: `session_approved` là bằng chứng teacher được thông báo lương sẽ tính; nếu status commit mà notification fail thì teacher không biết session đã duyệt và không có cách nào phát hiện thiếu. Ngược lại notification commit mà status rollback thì teacher nhận thông báo sai. **Không** được đẩy notification ra ngoài transaction (queue/afterCommit hook) ở phiên bản này.

**Không được nằm trong transaction**: gọi HTTP ngoài, gửi email/push, ghi log ứng dụng. Nếu sau này thêm push realtime thì tách outbox pattern (INSERT vào bảng outbox trong TX, worker đọc ngoài TX) — chưa nằm trong phạm vi, Q-SES-6.

**`teacherId` lấy ở đâu**: dùng `UPDATE ... RETURNING "teacherId"` (Prisma: `$queryRaw` hoặc đọc lại trong cùng TX sau khi update). Không đọc `teacherId` từ request — client không được quyết định người nhận notification.

## 8. Idempotency & concurrency

**Cơ chế chốt: conditional update (optimistic lock lấy `status` làm cột version).**

```sql
UPDATE "ClassSession"
   SET status = 'approved', "rejectionReason" = NULL, "updatedAt" = now()
 WHERE id = $1 AND status = 'completed_pending'
```

Prisma: `updateMany({ where: { id, status: 'completed_pending' }, data: {...} })` rồi kiểm `result.count === 1`.

**Cấm dùng** `update({ where: { id } })` sau một `findUnique` kiểm status: đó là read-then-write không nguyên tử, hai admin cùng đọc `completed_pending` rồi cùng ghi → cả hai cùng "thắng", sinh 2 Notification, phá INV-SESSION-07.

**Vì sao không cần cột `version` riêng**: mỗi transition hợp lệ đều đổi `status`, nên `status` đã là version tự nhiên và WHERE lọc theo nó là đủ. Thêm cột `version` sẽ là migration thừa.

**Vì sao không cần `SELECT ... FOR UPDATE`**: PostgreSQL ở `READ COMMITTED` khi gặp hàng đang bị transaction khác khoá sẽ chờ, rồi **tái đánh giá lại mệnh đề WHERE** trên phiên bản hàng mới nhất sau khi transaction kia commit. Request thua thấy `status = 'approved'` → không khớp WHERE → `affectedRows = 0`. `FOR UPDATE` chỉ cần khi phải ĐỌC dữ liệu để tính toán trước khi ghi (đó là trường hợp của spec 05, không phải ở đây).

**Xử lý request thua** — `affectedRows = 0` có hai nguyên nhân, phải phân biệt bằng đúng một `SELECT id, status FROM "ClassSession" WHERE id = $1` sau khi rollback:

| Kết quả SELECT | HTTP | code |
|---|---|---|
| 0 dòng | 404 | `SESSION_NOT_FOUND` |
| status ∈ {`approved`, `rejected`} | 409 | `SESSION_ALREADY_REVIEWED` |
| status ∈ {`scheduled`, `in_progress`} | 400 | `PAYROLL_SESSION_NOT_COMPLETED` |

**Request lặp (cùng một admin bấm hai lần / client retry)**: lần hai nhận **409 `SESSION_ALREADY_REVIEWED`**, KHÔNG trả 200 giả-idempotent. Lý do: approve là hành động tài chính; nuốt lặng lần bấm thứ hai che mất tình huống hai admin tranh chấp. Nếu FE muốn 200 cho retry mạng thì phải chốt riêng (Q-SES-4) — hiện giữ 409.

**Không dùng Idempotency-Key ở module này**: khoá tự nhiên đã là `(sessionId, status hiện tại)`, thêm bảng idempotency là thừa. (Payroll thì cần — xem spec 05 §8.)

**Concurrency với module Payroll**: spec 05 khoá session bằng `SELECT ... FOR UPDATE` khi gom. Nếu approve và gom-payroll chạy đồng thời trên cùng session, hai transaction cùng chạm một hàng → tuần tự hoá tự động ở tầng row lock. Không có kịch bản session vừa được approve vừa bị gom vào period với status cũ.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không có token / token hỏng | 401 | `AUTH_TOKEN_INVALID` | có trong API_ERROR_CODES.md |
| Token hết hạn | 401 | `AUTH_TOKEN_EXPIRED` | có trong API_ERROR_CODES.md |
| Không phải admin, hoặc admin bị suspend | 403 | `AUTH_INSUFFICIENT_ROLE` | có trong API_ERROR_CODES.md |
| Query/body sai định dạng; `rejectionReason` rỗng hoặc < 10 ký tự | 400 | `VALIDATION_ERROR` + `details` | có trong API_ERROR_CODES.md |
| `:id` không tồn tại | 404 | `SESSION_NOT_FOUND` | **proposed, not agreed** (nhóm SESSION_*) |
| Session đã `approved` hoặc `rejected` | 409 | `SESSION_ALREADY_REVIEWED` | **proposed, not agreed** |
| Reject không kèm lý do (nếu bắt ở tầng nghiệp vụ thay vì DTO) | 400 | `SESSION_REJECT_REASON_REQUIRED` | **proposed, not agreed** |
| Session ở `scheduled` / `in_progress` | 400 | `PAYROLL_SESSION_NOT_COMPLETED` | ⚠ tranh chấp — có trong bảng registry API_ERROR_CODES.md §3 nhưng KHÔNG có trong danh sách "Mã lỗi đã có" của `_FACTS.md` (xem Q-SES-1) |
| `teacherId` trong query không tồn tại | 404 | `USER_NOT_FOUND` | có trong API_ERROR_CODES.md |

Không đặt mã mới. Ba mã `SESSION_*` phía trên lấy nguyên văn từ API_ERROR_CODES.md §3 — **không được coi là đã chốt** cho tới khi có BE owner ký (Q-SES-1). Nếu tới lúc code vẫn chưa chốt: dùng tạm `VALIDATION_ERROR`/HTTP status đúng và ghi TODO, tuyệt đối không tự chế mã.

Envelope lỗi theo API_CONVENTIONS.md (flat): `{ statusCode, error, message, code, details?, timestamp, path }`. `details` chỉ xuất hiện ở `VALIDATION_ERROR`.

## 10. Side effect & notification

| Hành động | Notification `type` | `userId` (người nhận) | `referenceId` / `referenceType` | `payload` |
|---|---|---|---|---|
| Admin approve session | `session_approved` | `ClassSession.teacherId` | `session.id` / `"session"` | `null` (hoặc `{}`) |
| Admin reject session | `session_rejected` | `ClassSession.teacherId` | `session.id` / `"session"` | `{ "rejectionReason": "<nguyên văn>" }` |

- Teacher nộp session (`→ completed_pending`) sinh `session_submitted_for_review` gửi **Admin** — nằm ở lane teacher, KHÔNG do module này ghi. Hiện không có endpoint nào sinh nó (SCOPE-02).
- `Notification` là append-only, không xoá, chỉ đánh dấu `isRead` (ENTITY_NOTIFICATION business rules).
- Gửi cho **bao nhiêu admin**: khi reject/approve không phát cho admin khác. Nếu sau này cần fan-out cho tất cả admin thì phải chốt (không nằm trong ENTITY_NOTIFICATION hiện tại).
- Side effect khác: **không**. Không gửi email, không webhook, không đụng `PayrollPeriod`.

## 11. Index & query

Index cần cho `GET /admin/sessions/pending`:

```
ClassSession: INDEX (status, "scheduledDate")                 -- lọc chính + sort
ClassSession: INDEX ("teacherId", status, "scheduledDate")    -- khi lọc theo teacherId
ClassSession: INDEX ("classId", status)                       -- khi lọc theo classId
SessionAttendance: INDEX ("sessionId")                        -- gom attendanceSummary
ClassEnrollment: INDEX ("classId", status)                    -- đếm enrolledActive
```

Cân nhắc partial index nếu bảng lớn: `CREATE INDEX ... ON "ClassSession"("scheduledDate") WHERE status = 'completed_pending';` — tập pending luôn nhỏ so với tổng session.

**Nguy cơ N+1** (phải chặn ngay từ đầu):
1. Lấy 20 session rồi vòng lặp query `SessionAttendance` từng session → 21 query. Sửa: một câu `GROUP BY "sessionId", status WHERE "sessionId" IN (...)`, khớp trong bộ nhớ.
2. Vòng lặp query `Class` và `User` từng session. Sửa: Prisma `include: { class: true, teacher: { select: { id: true, nickname: true } } }` — một query có JOIN.
3. Đếm `ClassEnrollment` từng class → một câu `GROUP BY "classId" WHERE "classId" IN (...) AND status='active'`.

`meta.total`: `COUNT(*)` riêng với cùng mệnh đề WHERE. Không dùng `findMany` rồi `.length`.

## 12. Migration & seed

**Migration**
- Không thêm bảng, không thêm cột. Toàn bộ field đã có trong `ClassSession` / `SessionAttendance`.
- Thêm CHECK: `CHECK ("actualEnd" IS NULL OR "actualStart" IS NULL OR "actualEnd" > "actualStart")` (INV-SESSION-13).
- Thêm CHECK: `CHECK (status <> 'rejected' OR "rejectionReason" IS NOT NULL)` (INV-SESSION-04) — hàng rào cuối ở DB, không thay cho validate ở service.
- Xác nhận đã có `UNIQUE("sessionId","studentId")` trên `SessionAttendance` (ENTITY doc có ghi; kiểm schema thật trước khi bỏ qua).
- Thêm các index ở §11.
- Bảng audit: nếu chưa tồn tại thì cần một migration riêng — **hiện không có ENTITY doc nào cho audit log** (Q-SES-8).

**Seed để test được module này** (vì SCOPE-01 chặn đường tạo qua API, seed phải INSERT thẳng DB):
1. 1 admin `role=admin, status=active`; 1 admin thứ hai để test tranh chấp.
2. 2 teacher `role=teacher, status=active`.
3. 2 Class (`status=active`) thuộc 2 teacher khác nhau.
4. ≥ 5 ClassEnrollment `status=active` mỗi class + 1 enrollment `status=dropped` (kiểm `enrolledActive` không đếm dropped).
5. ClassSession phủ cả 5 status: ≥ 3 `completed_pending`, 1 `scheduled`, 1 `in_progress`, 1 `approved` (chưa có `payrollPeriodId`), 1 `approved` + `payrollPeriodId` NOT NULL, 1 `rejected` có `rejectionReason`.
6. SessionAttendance đủ 3 loại status cho các session `completed_pending`; cố ý để một session thiếu điểm danh vài student (`marked < enrolledActive`).
7. 1 session `completed_pending` có `actualStart`/`actualEnd` NULL (để test Q-SES-3).

## 13. Security & rate limit

- **Không trả ra**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`, `User.hskLevelGoal`. Response chỉ chứa `teacherId` + tên hiển thị. Dùng Prisma `select` tường minh, không `include: { teacher: true }` trần.
- **Không trả** `payrollPeriodId` trong list pending: session pending luôn NULL, để lộ chỉ tạo nhiễu contract.
- `rejectionReason` là văn bản admin tự nhập, hiển thị lại cho teacher → escape phía FE; BE chặn độ dài (2000) và strip control character.
- **Rate limit đề xuất** (chưa có mục nào trong API_CONVENTIONS.md nói về rate limit → Q-SES-9): `GET pending` 60 req/phút/admin; `PATCH approve|reject` 30 req/phút/admin. Vượt → 429 `TOO_MANY_REQUESTS` — ⚠ mã này chưa có trong registry, phải chốt trước khi bật.
- **Audit bắt buộc**: mọi approve/reject ghi `actorId`, `sessionId`, `from`, `to`, `rejectionReason`, `at`, `ip`. Bất biến, không xoá.
- IDOR: không có nguy cơ theo tenant vì admin toàn quyền; nhưng `:id` phải validate uuid trước khi query để tránh lỗi Prisma lộ chi tiết.

## 14. Observability

**Log** (structured, không log PII ngoài id):
- `session.review.attempt` — `{ actorId, sessionId, action: approve|reject }`
- `session.review.success` — `{ actorId, sessionId, from, to, durationMs }`
- `session.review.conflict` — `{ actorId, sessionId, observedStatus }` ← **level WARN**, đây là tín hiệu hai admin tranh chấp
- `session.review.notfound` — `{ actorId, sessionId }`

**Metric**:
- `sessions_pending_gauge` — số session `completed_pending` hiện tại, gắn `teacherId`. Tăng đều = admin không duyệt kịp, chặn payroll.
- `session_pending_age_seconds` — histogram tuổi session chờ (now − `updatedAt`). p95 là chỉ số sức khoẻ vận hành.
- `session_review_conflict_total` — counter. Khác 0 nghĩa là cần cân nhắc khoá UI/phân công duyệt.
- `session_review_latency_ms` — histogram theo endpoint.
- `session_notification_write_total` — phải bằng `session_review_success_total`. Lệch = có notification mồ côi → INV-SESSION-08 vỡ.

**Cảnh báo**: `session_pending_age_seconds` p95 > 72h; `session_review_conflict_total` tăng > 5/giờ.

## 15. Test matrix

Quy ước cột "Loại": `svc` = unit service (mock repo) · `int` = integration qua HTTP + **DB thật** · `db` = kiểm trực tiếp trên **DB thật** (constraint / concurrency). Mọi test có chữ "DB thật" **cấm mock Prisma** — tranh chấp và constraint không tái hiện được trên mock.

| INV | Loại | Mô tả test |
|---|---|---|
| INV-SESSION-01 | int (DB thật) | Gọi approve trên session ở từng status `scheduled`/`in_progress`/`approved`/`rejected` → lần lượt 400/400/409/409; DB không đổi. Lặp cho reject. |
| INV-SESSION-02 | int (DB thật) | Approve thành công → gọi lại approve, gọi reject → cả hai 409; `status` vẫn `approved`, `updatedAt` không đổi. |
| INV-SESSION-03 | db + int | Session `approved` + `payrollPeriodId` NOT NULL: mọi UPDATE qua service bị chặn; câu `UPDATE ... WHERE payrollPeriodId IS NULL` cho `affectedRows = 0`. |
| INV-SESSION-04 | int + db | Reject với `rejectionReason` = `""`, `"   "`, 9 ký tự → 400 `VALIDATION_ERROR`, `details.rejectionReason` có nội dung. DB: INSERT tay `status='rejected', rejectionReason=NULL` → CHECK constraint chặn. |
| INV-SESSION-05 | int (DB thật) | Session từng bị reject (có `rejectionReason`), teacher nộp lại (set tay về `completed_pending`), admin approve → `rejectionReason` trong DB = NULL. |
| INV-SESSION-06 | int (DB thật) | Approve session có `payrollPeriodId` NULL → sau commit `payrollPeriodId` vẫn NULL. Gửi `payrollPeriodId` trong body approve → bị strip, không ghi. |
| INV-SESSION-07 | **db — concurrency thật** | Hai connection song song cùng `BEGIN` + conditional UPDATE trên một `id`, cùng commit. Khẳng định: tổng `affectedRows` = 1; `COUNT(Notification WHERE referenceId=sessionId)` = 1; số dòng audit = 1. Chạy lặp ≥ 50 vòng để bắt race hiếm. |
| INV-SESSION-08 | int (DB thật) | Approve OK → đúng 1 Notification `session_approved`, `userId = teacherId`, `referenceType='session'`. **Test rollback**: bơm lỗi ở bước INSERT Notification → sau rollback `status` vẫn `completed_pending` **và** không có Notification nào. |
| INV-SESSION-09 | int (DB thật) | Reject OK → 1 Notification `session_rejected`, `payload.rejectionReason` khớp nguyên văn. Bơm lỗi tại INSERT → status không đổi. |
| INV-SESSION-10 | int (DB thật) | Seed đủ 5 status → list pending chỉ trả `completed_pending`; `meta.total` khớp `COUNT` trên DB. Thử inject `?status=approved` → bị bỏ qua, không đổi kết quả. |
| INV-SESSION-11 | db | INSERT 2 `SessionAttendance` cùng `(sessionId, studentId)` → vi phạm UNIQUE. Kiểm `attendanceSummary.marked ≤ enrolledActive` trên seed. |
| INV-SESSION-12 | int | Gửi `attendanceSummary` trong body approve/reject → bị strip; số liệu trả về vẫn tính từ `SessionAttendance`. Sửa 1 dòng attendance trong DB → lần đọc sau đổi theo. |
| INV-SESSION-13 | db | INSERT session `actualEnd < actualStart` và `actualEnd = actualStart` → CHECK chặn. `actualEnd`/`actualStart` NULL → cho phép. |
| INV-SESSION-14 | int | Gọi 3 endpoint với token teacher, token student, token admin `status='suspended'`, không token → lần lượt 403/403/403/401. |
| INV-SESSION-15 | int (DB thật) | Sau mỗi approve/reject thành công có đúng 1 dòng audit đủ trường; sau mỗi lần thất bại (409/404) có 0 dòng audit. |

**Test bổ sung không gắn INV** (vẫn bắt buộc):
- Phân trang: `page`/`limit` biên (0, 1, 101, âm, chữ) → 400; `totalPages = ceil(total/limit)`.
- N+1: bật query log, list 20 session → tổng số query ≤ 5. Ngưỡng này là gate CI.
- Envelope: so khớp response thành công với `{ data, meta }` và lỗi với envelope flat 7 field của API_CONVENTIONS.md.

## 16. Chưa chốt

| # | Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|---|
| **SCOPE-01** | **`Class` và `ClassEnrollment` không có bất kỳ endpoint nào.** Cả hai có ENTITY doc đầy đủ (`ENTITY_CLASS.md`, `ENTITY_CLASS_ENROLLMENT.md`) và có dòng trong RBAC_MATRIX (`Class create = ✅ Teacher`, `ClassEnrollment enroll = ✅ Student`), nhưng `docs/api/` chỉ có `API_ADMIN.md`, `API_AUTH.md`, `API_CONVENTIONS.md`, `API_ERROR_CODES.md` — **không có `API_TEACHER.md`, không có `API_STUDENT.md`**, và `API_ADMIN.md` không có mục Class. Không có đường tạo Class ⇒ không có đường tạo ClassSession ⇒ `GET /admin/sessions/pending` vĩnh viễn rỗng trên môi trường thật. `className`, `hskLevel`, `enrolledActive` trong DTO §3.1 đều đọc từ hai bảng không ai sở hữu. | **CHẶN CẢ MODULE** — có thể code và test bằng seed DB, nhưng không thể chạy end-to-end, không thể demo, không thể lên staging | BE lead + PO | trước Sprint 3 |
| **SCOPE-02** | Ba transition `scheduled → in_progress → completed_pending` không có endpoint nào ở bất kỳ file API nào. Notification `session_submitted_for_review` không có nơi phát sinh. | Không có nguồn dữ liệu đầu vào cho module này; toàn bộ lane teacher của payroll trống | BE lead | trước Sprint 3 |
| Q-SES-1 | Trạng thái nhóm `SESSION_*`: `_FACTS.md` xếp `SESSION_*` vào nhóm *proposed, not agreed*; nhưng trong `API_ERROR_CODES.md` mục "Session Review Errors" **không có** banner ⚠ proposed (chỉ `INVOICE_*`, `RATE_*`, `AI_*` có). Thêm nữa nhóm `PAYROLL_*` (`PAYROLL_SESSION_NOT_COMPLETED`, `PAYROLL_SESSION_NOT_FOUND`, `PAYROLL_PERIOD_*`) có trong registry nhưng **không có** trong danh sách "Mã lỗi đã có" của `_FACTS.md`. Hai nguồn lệch nhau → đây là **mâu thuẫn thứ 5**, chưa được ghi trong `_FACTS.md`. | §9 toàn bộ; FE không map được error | BE owner API_ERROR_CODES | trước khi code §9 |
| Q-SES-2 | Session `rejected` có được nộp lại không? Nếu có: transition `rejected → completed_pending` do ai gọi, endpoint nào, có giới hạn số lần không? Nếu không: teacher mất công cả buổi dạy, không có đường khiếu nại. Hiện `rejected` là **ngõ cụt**. | State machine §6 chưa đóng; teacher-side flow | PO | trước Sprint 3 |
| Q-SES-3 | Có cho approve session mà `actualStart` hoặc `actualEnd` NULL không? Session `per_hour` thiếu hai field này thì spec 05 **không tính được tiền** (INV-PAYROLL-03). Hai lựa chọn: (a) chặn ở approve — an toàn, đẩy lỗi lên sớm; (b) cho approve, chặn ở payroll — lỗi lộ ra muộn, giữa lúc chốt lương. | Ranh giới spec 04 ↔ 05; INV-SESSION-13 mới chỉ ràng buộc khi cả hai không NULL | BE lead | trước Sprint 3 |
| Q-SES-4 | Approve lần hai trả 409 hay 200 idempotent? Spec chốt tạm 409 (§8). FE cần xác nhận có xử lý được 409 sau retry mạng không. | §8, contract FE | FE + BE | trước khi khoá contract |
| Q-SES-5 | Có bao giờ một user vừa là admin vừa là teacher của session không? Nếu hệ thống chuyển sang multi-role thì phải chặn tự duyệt. | §5 | PO | không gấp |
| Q-SES-6 | Notification có cần realtime (WS/push) không? Nếu có thì phải tách outbox và §7 đổi. | §7, §10 | BE lead | Sprint 4 |
| Q-SES-7 | `ClassSession` không lưu thời điểm nộp (`submittedAt`). Dùng `updatedAt` làm xấp xỉ sẽ sai ngay khi có bất kỳ UPDATE nào khác. Có thêm cột không? | DTO §3.1, metric `session_pending_age_seconds` | BE lead | trước Sprint 3 |
| Q-SES-8 | Không có ENTITY doc nào cho bảng audit, nhưng INV-SESSION-15 và §13 đều yêu cầu. Bảng tên gì, schema ra sao, ai sở hữu? | INV-SESSION-15, migration §12 | BE lead | trước Sprint 3 |
| Q-SES-9 | `API_CONVENTIONS.md` không có mục rate limit và registry không có mã 429 (`TOO_MANY_REQUESTS`). §13 đang đề xuất. | §13 | BE lead | Sprint 4 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH register/PATCH). `teacherName` trong DTO §3.1 đọc field nào? | Contract FE của list pending | BE lead | trước khi khoá contract |
| **C4** | `Class.hskLevel` ghi 1–9 ở ENTITY, 1–6 ở GLOSSARY/DATABASE_SCHEMA (tracked: DOC-004). | Validate + hiển thị `hskLevel` §3.1 | PO | không chặn code |

> Ghi chú phạm vi: file `docs/front-end-design-docs/pages/_INDEX.md` trỏ tới `admin-pages/admin-session-review.md` với ghi chú "attendance summary in payload", **nhưng file đó không tồn tại** trong bộ tài liệu (thư mục `pages/admin-pages/` chỉ có `admin-tuition-rates.md`). Hình dạng `attendanceSummary` ở §3.1 vì thế là **đề xuất của spec này**, chưa đối chiếu được với thiết kế FE.
