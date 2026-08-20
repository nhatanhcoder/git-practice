---
module: Users / Admin Users
status: proposed
blocked_by: C1 (nickname vs fullName) · C3 (thiếu state `rejected` → cần ADR vòng đời tài khoản + migration)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module quản lý tài khoản từ phía Admin: liệt kê / xem chi tiết user và điều khiển vòng đời `User.status` qua 3 hành động approve · suspend · activate. Ranh giới: module này **chỉ đọc** profile của user khác và **chỉ ghi đúng một field** là `status` (+ `updatedAt`); mọi thao tác self-service (đổi tên, avatar, mật khẩu) thuộc module Auth (`PATCH /auth/me`, `POST /auth/change-password`), không thuộc đây. Module không tạo user — đăng ký là self-serve; không xoá user — không có endpoint DELETE.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `User` | Đọc + Ghi | Ghi **duy nhất** `status`, `updatedAt`. Đọc: `id, email, role, status, nickname, avatarUrl, hskLevelGoal, bio, lastLoginAt, createdAt, updatedAt`. **Không bao giờ select `passwordHash`** |
| `Notification` | Ghi (INSERT) | `account_approved`, `account_suspended`. Append-only, không update/delete |
| `Class` | Đọc (chặn) | Panel "Lớp đang dạy" ở trang chi tiết teacher — shape chưa chốt, xem §16 |
| `ClassEnrollment` | Đọc (chặn) | Panel "Lớp đã tham gia" ở trang chi tiết student — chưa chốt |
| `ClassSession` | Đọc (chặn) | Panel "Buổi học" ở trang chi tiết teacher — chưa chốt |

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/admin/users` | admin | Danh sách user, filter `role` + `status` + tìm kiếm, có phân trang | defined (API_ADMIN.md) |
| GET | `/api/v1/admin/users/:id` | admin | Chi tiết một user | defined (path) / **proposed (shape response)** — phần history nhúng chưa được định nghĩa ở API_ADMIN.md |
| PATCH | `/api/v1/admin/users/:id/approve` | admin | Duyệt tài khoản đang `pending` → `active` | defined |
| PATCH | `/api/v1/admin/users/:id/suspend` | admin | Khoá tài khoản đang `active` → `suspended` | defined (path) / **proposed (request body)** — FE bắt buộc nhập "Lý do khóa", API_ADMIN.md không định nghĩa body |
| PATCH | `/api/v1/admin/users/:id/activate` | admin | Mở khoá tài khoản đang `suspended` → `active` | defined |

Không có `POST /admin/users`, `PATCH /admin/users/:id` (sửa profile), `DELETE /admin/users/:id`. Ba route PATCH ở trên là **toàn bộ** khả năng ghi của Admin lên tài khoản người khác.

## 3. DTO

### Request

**GET /admin/users** — query params:

| Field | Kiểu | Bắt buộc | Ràng buộc validate |
|---|---|---|---|
| `role` | enum string | không | ∈ `admin` \| `teacher` \| `student`. Giá trị khác → `VALIDATION_ERROR`. Không gửi = không lọc theo role |
| `status` | enum string | không | ∈ `pending` \| `active` \| `suspended`. Giá trị khác → `VALIDATION_ERROR`. Không gửi = không lọc theo status |
| `q` | string | không | trim, độ dài 1–100 sau trim; chuỗi rỗng sau trim ⇒ coi như không gửi. Khớp substring **case-insensitive** trên `nickname` HOẶC `email`. ⚠️ Tên param chưa chốt: FE contract dùng `q`, API_ADMIN.md mô tả là "search" — xem §16 |
| `page` | int | không | ≥ 1, mặc định `1` |
| `limit` | int | không | ≥ 1, mặc định `20`, trần `100` (**proposed** — API_CONVENTIONS.md không quy định trần) |
| `sortBy` | enum string | không | **proposed** — ∈ `createdAt` \| `lastLoginAt`, mặc định `createdAt`. FE chỉ cho sort 2 cột này |
| `order` | enum string | không | **proposed** — ∈ `asc` \| `desc`, mặc định `desc` |

**GET /admin/users/:id** · **PATCH .../approve** · **PATCH .../activate** — path param `id` (uuid, `VALIDATION_ERROR` nếu sai định dạng). Không có body.

**PATCH /admin/users/:id/suspend** — path param `id` (uuid). Body: **chưa chốt**. FE spec bắt buộc textarea "Lý do khóa" (submit bị disable khi rỗng) nhưng: (a) API_ADMIN.md không định nghĩa body, (b) `User` không có field nào để lưu lý do. Không tự đặt tên field ở đây — xem §16.

### Response

**GET /admin/users** → `200`

```
{
  "data": [ AdminUserListItem, ... ],
  "meta": { "total": 150, "page": 1, "limit": 20, "totalPages": 8 }
}
```

`AdminUserListItem`:

| Field | Kiểu | Nullable | Ghi chú |
|---|---|---|---|
| `id` | uuid | no | |
| `email` | string | no | |
| `role` | `admin`\|`teacher`\|`student` | no | |
| `status` | `pending`\|`active`\|`suspended` | no | |
| `nickname` | string | yes | ⚠️ C1 — xem §16 |
| `avatarUrl` | string | yes | |
| `createdAt` | DateTime UTC ISO 8601 | no | |
| `lastLoginAt` | DateTime UTC ISO 8601 | yes | `null` khi chưa từng đăng nhập |

**GET /admin/users/:id** → `200` — `{ "data": AdminUserDetail }`. `AdminUserDetail` = `AdminUserListItem` + `hskLevelGoal` (int, nullable, chỉ có nghĩa với `student`) + `bio` (text, nullable, chỉ có nghĩa với `teacher`) + `updatedAt`.
⚠️ Phần history theo role (`enrollments[]`/`attempts[]` cho student, `classes[]`/`sessions[]` cho teacher) mà FE yêu cầu **không có trong spec API** → không định nghĩa ở đây, đang chặn (§16).

**PATCH .../approve|suspend|activate** → `200` — `{ "data": AdminUserDetail }`.
⚠️ FE contract ghi envelope là `data.user` (bọc thêm một lớp). API_CONVENTIONS.md ghi `{ "data": {...} }`. Spec này theo API_CONVENTIONS.md (nguồn chuẩn) và ghi lệch vào §16.

`passwordHash` **không xuất hiện** trong bất kỳ DTO response nào ở trên.

## 4. Rule nghiệp vụ (invariant)

| ID | Phát biểu |
|---|---|
| **INV-USERS-01** | Mọi endpoint của module chỉ thực thi khi actor có `role = admin` **và** `status = active`; mọi actor khác bị từ chối trước khi truy vấn dữ liệu user. |
| **INV-USERS-02** | Không response nào, không log nào, không `details` lỗi nào của module chứa `passwordHash`. |
| **INV-USERS-03** | `data[]` của `GET /admin/users` chỉ chứa user thoả **đồng thời tất cả** filter đang bật (`role` AND `status` AND `q`); không bản ghi nào ngoài tập filter lọt vào kết quả. |
| **INV-USERS-04** | Giá trị `role`/`status` ngoài enum làm request thất bại với `VALIDATION_ERROR`; hệ thống **không** âm thầm bỏ qua filter sai và trả về tập rộng hơn. |
| **INV-USERS-05** | `q` khớp substring không phân biệt hoa/thường trên `nickname` **hoặc** `email`; `q` không gửi hoặc rỗng sau trim ⇒ không lọc theo từ khoá. |
| **INV-USERS-06** | `meta.total` = số bản ghi thoả filter **trước** phân trang; `meta.totalPages = ceil(total / limit)`; `data.length ≤ limit`. |
| **INV-USERS-07** | Thứ tự sắp xếp là toàn phần và ổn định (luôn có tie-breaker `id`), nên duyệt hết các trang cho ra mỗi bản ghi đúng một lần — không trùng, không sót. |
| **INV-USERS-08** | `approve` chỉ thành công khi `status` hiện tại là `pending`; khi thành công `status` kết quả luôn là `active`. |
| **INV-USERS-09** | `suspend` chỉ thành công khi `status` hiện tại là `active`; khi thành công `status` kết quả luôn là `suspended`. |
| **INV-USERS-10** | `activate` chỉ thành công khi `status` hiện tại là `suspended`; khi thành công `status` kết quả luôn là `active`. |
| **INV-USERS-11** | Không tồn tại đường đi nào đưa `status` trở lại `pending` sau khi đã rời `pending` — `pending` là cổng một chiều. |
| **INV-USERS-12** | `User.status` luôn thuộc `{pending, active, suspended}`; không có giá trị thứ tư nào được ghi xuống DB qua module này. |
| **INV-USERS-13** | Mỗi lần chuyển trạng thái thành công sinh **đúng một** `Notification` cho **đúng user bị tác động**: `approve` → `account_approved`, `suspend` → `account_suspended`. `activate` không sinh Notification (không có type tương ứng). |
| **INV-USERS-14** | Việc đổi `status` và việc INSERT `Notification` nằm trong **cùng một transaction**: nếu một phần thất bại thì cả hai bị rollback — không tồn tại trạng thái "đã đổi status nhưng thiếu notification" hoặc ngược lại. |
| **INV-USERS-15** | Request lặp lại hoặc hai request đồng thời trên cùng `:id`: `status` chỉ đổi đúng một lần và `Notification` chỉ sinh đúng một bản; lần thứ hai kết thúc bằng lỗi conflict, không phải bằng side effect thứ hai. |
| **INV-USERS-16** | Module chỉ ghi `status` và `updatedAt`; `email`, `role`, `nickname`, `avatarUrl`, `hskLevelGoal`, `bio`, `passwordHash`, `createdAt`, `lastLoginAt` bất biến qua mọi endpoint của module. |
| **INV-USERS-17** | `:id` không tồn tại luôn cho `404 USER_NOT_FOUND`; không bao giờ `200` với body rỗng/null. |
| **INV-USERS-18** | Mọi DateTime trả ra là UTC ISO 8601; `lastLoginAt = null` khi user chưa từng đăng nhập thành công. |

## 5. Ownership / RBAC

RBAC_MATRIX.md: `User · list all` = ✅ Admin, ❌ Teacher, ❌ Student. `User · approve / suspend` = ✅ Admin, ❌ Teacher, ❌ Student. **Không có ownership rule** — Admin thấy mọi user, mọi role.

Kiểm hai tầng (guard **và** service), không chỉ dựa vào `@Roles`:

| Tầng | Điều kiện | Sai thì |
|---|---|---|
| Guard | `req.user.role === 'admin'` | `403 AUTH_INSUFFICIENT_ROLE` |
| Service (bắt buộc, không bỏ) | `actor.status === 'active'` — admin đang `suspended` mà còn token sống vẫn phải bị chặn | `403 AUTH_ACCOUNT_SUSPENDED` |
| Service | `target = SELECT ... WHERE id = :id` — tồn tại? | `404 USER_NOT_FOUND` |
| Service | `target.status` khớp trạng thái nguồn hợp lệ của hành động (§6) | §9 |

**Filter theo `status`/`role` là ranh giới dữ liệu, không phải tiện ích UI → BẮT BUỘC TEST.** Sai filter ở đây không phải lỗi hiển thị mà là rò rỉ tập dữ liệu: một filter bị bỏ qua âm thầm sẽ đẩy tài khoản `pending`/`suspended` vào danh sách mà Admin tin là đã lọc, và Admin sẽ hành động trên hàng sai (duyệt nhầm, khoá nhầm). Hai lớp phải test: (a) filter đúng thì kết quả **chỉ** chứa tập đúng (INV-USERS-03); (b) filter sai enum thì **fail chứ không mở rộng tập** (INV-USERS-04).

## 6. State machine

`User.status` — ba trạng thái, đúng ba chuyển đổi hợp lệ.

```
   register (module Auth, ngoài phạm vi spec này)
        │
        ▼
   ┌─────────┐   approve    ┌────────┐   suspend    ┌───────────┐
   │ pending │ ───────────► │ active │ ───────────► │ suspended │
   └─────────┘              └────────┘ ◄─────────── └───────────┘
        │                              activate
        └── (không có đường ra nào khác — xem C3 ở §16)
```

| Từ | Đến | Hành động | Hợp lệ? |
|---|---|---|---|
| `pending` | `active` | approve | ✅ |
| `active` | `suspended` | suspend | ✅ |
| `suspended` | `active` | activate | ✅ |
| `pending` | `suspended` | — | ❌ Không có endpoint. `suspend` yêu cầu nguồn `active` |
| `pending` | `pending` | approve lặp | ❌ Conflict, không phải no-op |
| `active` | `active` | approve / activate | ❌ Conflict |
| `active` | `pending` | — | ❌ Không tồn tại. Duyệt là **cổng một chiều** |
| `suspended` | `pending` | — | ❌ Không tồn tại |
| `suspended` | `suspended` | suspend lặp | ❌ Conflict |
| bất kỳ | `rejected` | — | ❌ **State `rejected` KHÔNG TỒN TẠI** trong enum |

**Cổng một chiều**: `pending` chỉ đi ra, không đi vào. Hệ quả trực tiếp: một tài khoản bị duyệt nhầm **không thể** trả về hàng đợi chờ duyệt; đường sửa sai duy nhất là `active → suspended`, tức là ghi đè ý nghĩa "đã khoá vì vi phạm" lên trường hợp "duyệt nhầm". Spec ghi nhận hệ quả này, không tự sửa.

**⚠️ Mâu thuẫn C3 — enum không có `rejected`.** `User.status` chỉ có `pending | active | suspended` (ENTITY_USER + _FACTS). Vì `pending → suspended` không hợp lệ và `rejected` không tồn tại, hiện tại hệ thống **không có cách nào biểu diễn "từ chối một đơn đăng ký"**: hồ sơ bị từ chối chỉ có thể nằm mãi ở `pending` và ở lại trong hàng đợi của Admin vĩnh viễn. "Quyết định 5" đề xuất thêm `rejected` nhưng cần migration enum + ADR. Spec này **không tự thêm state, không tự chọn workaround** — xem §16.

## 7. Transaction boundary

**GET** (list + detail): chỉ đọc, không cần transaction tường minh. `READ COMMITTED` (mặc định PostgreSQL) là đủ. Query đếm `total` và query lấy `data[]` chạy trong cùng một snapshot đọc để `meta.total` không lệch với trang đang trả (chấp nhận sai lệch nhỏ nếu không dùng transaction — nếu chọn không bọc, phải ghi rõ là chấp nhận).

**PATCH** (approve / suspend / activate): **một transaction duy nhất**, `READ COMMITTED` + khoá hàng (không cần `SERIALIZABLE`), gồm đúng 4 bước:

1. `SELECT ... FROM "User" WHERE id = :id FOR UPDATE` (hoặc guarded UPDATE ở §8) — khoá hàng target.
2. Kiểm tra `status` nguồn hợp lệ theo §6 → sai thì ném lỗi, transaction rollback, không side effect.
3. `UPDATE "User" SET status = <đích>, "updatedAt" = now() WHERE id = :id`.
4. `INSERT INTO "Notification" (...)` — với approve/suspend. Với activate: bỏ qua bước 4.

Ràng buộc: **bước 3 và bước 4 không được tách transaction** (INV-USERS-14). Mọi tác dụng phụ ra ngoài DB (push/websocket/email nếu có sau này) phải chạy **sau khi commit**, không nằm trong transaction.

## 8. Idempotency & concurrency

**Request lặp** — module này **không idempotent theo thiết kế** và đó là lựa chọn có chủ đích: `approve` lần hai trên user đã `active` trả `409 USER_ALREADY_APPROVED` (theo FE contract) chứ không phải `200` no-op. Lý do: Admin cần biết ai đó đã xử lý hàng này trước mình. Hệ quả tốt: Notification không bao giờ bị nhân đôi vì lần thứ hai không tới được bước INSERT. Không dùng header `Idempotency-Key` (không có trong API_CONVENTIONS.md).

**Hai request đồng thời trên cùng `:id`** — không có unique constraint nào bảo vệ chuyển trạng thái (`UNIQUE(email)` không liên quan), nên **bắt buộc phải khoá**, cấm mẫu đọc-rồi-ghi ngoài khoá:

- **Bắt buộc**: guarded UPDATE — `UPDATE "User" SET status='active', "updatedAt"=now() WHERE id=:id AND status='pending'` rồi kiểm `rowCount`. `rowCount = 1` ⇒ mình thắng cuộc đua, đi tiếp INSERT Notification. `rowCount = 0` ⇒ hoặc user không tồn tại hoặc đã bị người khác đổi trạng thái ⇒ đọc lại để phân biệt `404` với conflict, rollback, **không** INSERT Notification.
- Tương đương chấp nhận được: `SELECT ... FOR UPDATE` rồi kiểm trong transaction.
- **Cấm**: `findUnique` → kiểm status ở tầng service → `update` mà không có khoá/guard. Mẫu này cho phép hai request cùng thắng và sinh hai `account_approved`.

**Khoá**: khoá hàng ở `User.id`, giữ trong suốt transaction §7. Không khoá bảng, không advisory lock.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không có/hỏng access token | 401 | `AUTH_TOKEN_EXPIRED` | có trong API_ERROR_CODES.md |
| Actor không phải admin | 403 | `AUTH_INSUFFICIENT_ROLE` | có |
| Actor là admin nhưng đang `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | có |
| `role`/`status`/`page`/`limit`/`id` sai định dạng hoặc ngoài enum | 400 | `VALIDATION_ERROR` (+ `details`) | có |
| `:id` không tồn tại | 404 | `USER_NOT_FOUND` | có |
| `approve` khi user đã `active` (hoặc `suspended`) | 409 | `USER_ALREADY_APPROVED` | ⚠️ có trong API_ERROR_CODES.md §User Errors và trong FE contract, **nhưng không có trong danh sách đã xác minh của `_FACTS.md`** → cần xác nhận trước khi code |
| `suspend` khi user đang `pending` hoặc đã `suspended` | 409 | **CHƯA CÓ MÃ** | ⛔ chặn — xem §16 |
| `activate` khi user đang `pending` hoặc đã `active` | 409 | **CHƯA CÓ MÃ** | ⛔ chặn — xem §16 |
| Lỗi không lường trước | 500 | (không có code riêng) | — |

**Không bịa mã mới.** Hai dòng ⛔ ở trên là lỗ hổng thật trong registry: `USER_ALREADY_APPROVED` chỉ phủ nhánh approve, không có mã đối xứng cho suspend/activate. Không dùng tạm `VALIDATION_ERROR` (đây là vi phạm quy tắc nghiệp vụ, không phải lỗi DTO) và không dùng tạm `USER_ALREADY_APPROVED` cho nhánh suspend (sai ngữ nghĩa, FE sẽ hiển thị nhầm thông báo).

Envelope lỗi theo API_CONVENTIONS.md — phẳng, có `statusCode`, `error` (reason phrase dạng chuỗi), `message`, `code`, `timestamp`, `path`; `details` **chỉ** xuất hiện ở `VALIDATION_ERROR`; không có cờ `success`.

## 10. Side effect & notification

| Hành động | Notification.type | Recipient (`Notification.userId`) | Số bản ghi | Ghi chú |
|---|---|---|---|---|
| `PATCH .../approve` thành công | `account_approved` | chính user vừa được duyệt | 1 | Trong cùng transaction với UPDATE status |
| `PATCH .../suspend` thành công | `account_suspended` | chính user vừa bị khoá | 1 | Trong cùng transaction. `payload` **có thể** chứa lý do khoá — nhưng body request chưa chốt (§16), nên chưa khoá tên key |
| `PATCH .../activate` thành công | **không có** | — | 0 | Enum Notification không có type nào cho "mở khoá". Không tái dùng `account_approved` (sai ngữ nghĩa: user này chưa từng được duyệt lại). Ghi nhận là lỗ hổng, không tự thêm type |
| Đăng ký mới, `role = teacher` | `new_teacher_registration` | **mọi** user `role = admin` và `status = active` (fan-out N bản ghi) | N | Sinh bởi **module Auth** (`POST /auth/register`), không phải module này. Ghi ở đây vì đây là nguồn nạp hàng đợi `status = pending` mà `GET /admin/users?status=pending` phục vụ |
| Đăng ký mới, `role = student` | `new_student_registration` | như trên | N | như trên |

**GET** không sinh side effect nào (không đánh dấu đã đọc, không ghi audit vào Notification).

`referenceId` / `referenceType`: mục đích là deep-link. Với `account_approved` / `account_suspended`, đối tượng tham chiếu là chính user. Nhưng ENTITY_NOTIFICATION liệt kê `referenceType` ∈ `assignment`/`attempt`/`invoice`/`session` — **không có `user`**. Chưa chốt (§16); tạm thời để cả hai `null` là phương án an toàn duy nhất không bịa giá trị enum.

**Side effect ngoài Notification**: `suspend` phải làm mọi token đang sống của user đó bị từ chối (ENTITY_USER: "`status = suspended` → all JWT tokens rejected"). Cơ chế = kiểm `status` mỗi request ở guard của module Auth, không phải trách nhiệm ghi của module này. ⚠️ ENTITY_USER ghi mã trả về là `401`, còn API_ERROR_CODES.md ghi `AUTH_ACCOUNT_SUSPENDED = 403` — lệch, ghi vào §16.

## 11. Index & query

| Mục đích | Index đề xuất | Ghi chú |
|---|---|---|
| Filter `status` + `role` + sort `createdAt` | `INDEX ("role", "status", "createdAt" DESC)` | Phủ tổ hợp filter phổ biến nhất của màn hình (hàng đợi duyệt: `status=pending`) |
| Filter chỉ `status` | tiền tố của index trên (nếu đảo thứ tự cột thành `("status","role","createdAt" DESC)` thì tối ưu cho hàng đợi `pending`) | Chọn thứ tự cột theo truy vấn thật; đo trước khi chốt |
| Sort `lastLoginAt` | `INDEX ("lastLoginAt" DESC NULLS LAST)` | FE cho sort cột này |
| Tìm kiếm `q` | `pg_trgm` + `GIN INDEX ON lower(nickname) gin_trgm_ops`, `GIN INDEX ON lower(email) gin_trgm_ops` | `ILIKE '%q%'` có wildcard đầu chuỗi ⇒ **B-tree vô dụng**. Không có trgm thì mọi tìm kiếm là seq scan toàn bảng |
| Unique email | đã có (`UNIQUE(email)`) | Không thuộc phạm vi thay đổi |

**Query & rủi ro**

- Phân trang: `COUNT(*)` + `SELECT ... LIMIT/OFFSET` với **`ORDER BY <sortBy> <order>, id ASC`** — tie-breaker `id` là bắt buộc (INV-USERS-07), thiếu nó thì các bản ghi cùng `createdAt` nhảy giữa các trang.
- `SELECT` phải **liệt kê cột tường minh**, cấm `SELECT *` / cấm trả nguyên entity — đây là hàng rào kỹ thuật cho INV-USERS-02.
- **N+1**: endpoint list không join gì thêm (không đếm số lớp, không đếm bài nộp) ⇒ không có N+1. Rủi ro N+1 nằm ở `GET /admin/users/:id` nếu nhúng history theo role — phải lấy bằng số truy vấn cố định (1 truy vấn/panel), không lặp theo từng dòng. Phần này đang bị chặn (§16).
- `OFFSET` lớn sẽ chậm khi bảng user lớn; chấp nhận ở quy mô hiện tại, ghi nhận là nợ kỹ thuật.

## 12. Migration & seed

**Migration**: module này **không cần migration schema mới** — enum `status` (`pending|active|suspended`) và mọi field dùng tới đều đã tồn tại. Cần một migration **chỉ thêm index** (§11), gồm `CREATE EXTENSION IF NOT EXISTS pg_trgm` và các index composite/GIN; dùng `CREATE INDEX CONCURRENTLY` nếu chạy trên DB có dữ liệu.

Hai migration **có thể phát sinh nhưng đang bị chặn**, không được viết trước khi có ADR:
- Thêm giá trị `rejected` vào enum `User.status` (C3) — thay đổi enum + cập nhật mọi guard đọc status.
- Thêm chỗ lưu lý do khoá (suspend reason) — hiện `User` không có field nào, `Notification.payload` là ứng viên nhưng chưa ai chốt.

**Seed để test**:
- ≥ 1 admin `active` (actor gọi API, đồng thời là recipient của `new_*_registration`).
- Phủ đủ ma trận `role × status`: teacher/student ở cả `pending`, `active`, `suspended` (tối thiểu 6 bản ghi) + 1 admin `suspended` để test INV-USERS-01 nhánh actor bị khoá.
- ≥ 1 user có `lastLoginAt = null` (INV-USERS-18) và ≥ 1 có `lastLoginAt` khác null.
- ≥ 25 user tổng cộng để test phân trang thật (page 2, `totalPages`, biên `limit`).
- Cặp user có `createdAt` **trùng nhau** để test tie-breaker (INV-USERS-07).
- Bộ `nickname`/`email` có dấu tiếng Việt và có hoa/thường lẫn lộn để test `q` case-insensitive (INV-USERS-05).

## 13. Security & rate limit

**Dữ liệu nhạy cảm — KHÔNG BAO GIỜ trả ra:**

- **`passwordHash` KHÔNG BAO GIỜ xuất hiện trong bất kỳ response nào của module này** — không ở list, không ở detail, không ở response của approve/suspend/activate, không trong `details` của lỗi, không trong log, không trong trace/APM span. Đây là INV-USERS-02 và là điều kiện chặn merge, không phải khuyến nghị.
- Cách bảo đảm (bắt buộc, không tuỳ chọn): tầng truy vấn dùng **danh sách cột tường minh**; cấm trả object entity thô ra controller; DTO response là allow-list, không phải deny-list (thêm field mới vào `User` không được tự động rò ra API).
- Cùng nguyên tắc với mọi secret khác nếu sau này thêm vào `User` (refresh token hash, MFA secret...).

**Quyền hạn**: Admin **không** có đường đổi mật khẩu, email hay profile của người khác — module cố tình không có endpoint đó (INV-USERS-16). Không có endpoint xoá tài khoản.

**Rate limit**: API_CONVENTIONS.md không quy định (chỉ có `429 Too Many Requests` trong bảng HTTP status). **Proposed**, cần chốt: GET list/detail ~60 req/phút/admin; PATCH ~30 req/phút/admin. Con số là đề xuất, chưa được duyệt.

**Audit**: mọi lần đổi trạng thái phải truy được "ai làm, lúc nào, từ trạng thái nào sang trạng thái nào". Hiện **không có bảng AuditLog** trong danh sách entity ⇒ chỉ còn log ứng dụng (§14), không có bằng chứng bền vững trong DB. Ghi nhận là khoảng trống ở §16.

## 14. Observability

**Log** (structured, mỗi PATCH thành công một dòng): `requestId`, `actorUserId`, `targetUserId`, `action` (approve|suspend|activate), `fromStatus`, `toStatus`, `notificationCreated` (bool), `durationMs`. Log cả **nhánh thất bại** kèm `code` (đặc biệt các nhánh conflict — chúng chỉ ra hai admin đang xử lý trùng hàng). Tuyệt đối không log body/entity thô (§13).

**Metric**: đếm theo `action` × kết quả (success/conflict/not_found/forbidden); độ trễ p95 của `GET /admin/users` tách theo "có `q`" / "không có `q`" (truy vấn trgm là điểm chậm dự kiến); kích thước hàng đợi `COUNT(*) WHERE status='pending'` (chỉ số nghiệp vụ: hàng đợi phình = Admin không xử lý kịp, hoặc là triệu chứng của C3 — hồ sơ bị từ chối kẹt lại vĩnh viễn).

**Cảnh báo**: tỉ lệ conflict tăng đột biến; p95 list vượt ngưỡng; xuất hiện bất kỳ lỗi 500 nào ở nhánh PATCH (nghi ngờ rollback transaction).

## 15. Test matrix

Đây là **invariant gate**: mọi INV ở §4 phải có ít nhất một dòng ở đây. Thiếu một dòng = không merge.

| INV | Loại test | Mô tả |
|---|---|---|
| INV-USERS-01 | integration | Gọi cả 5 endpoint bằng token teacher → 403 `AUTH_INSUFFICIENT_ROLE`; bằng token student → 403; không token → 401. Thêm: admin có `status=suspended` nhưng token còn hạn → 403 `AUTH_ACCOUNT_SUSPENDED` |
| INV-USERS-02 | integration | Serialize toàn bộ response của cả 5 endpoint thành chuỗi, assert **không chứa** khoá `passwordHash` và không chứa chuỗi hash của seed. Lặp cho cả nhánh lỗi (404/409) và assert log không chứa hash |
| INV-USERS-03 | DB thật | Seed đủ ma trận `role × status`; với từng tổ hợp filter (`role`, `status`, `role+status`, `+q`) assert mọi phần tử `data[]` khớp filter **và** số phần tử khớp truy vấn đối chứng chạy thẳng trên DB |
| INV-USERS-04 | integration | `?role=teachers`, `?status=rejected`, `?status=REJECTED`, `?role=` → 400 `VALIDATION_ERROR`, `details` nêu đúng field. Assert **không** trả 200 với danh sách chưa lọc |
| INV-USERS-05 | DB thật | `q` viết hoa/thường khác nhau vẫn khớp; khớp được cả trên `nickname` lẫn `email`; `q` là substring giữa chuỗi vẫn khớp; `q=""`/`q="  "` ⇒ kết quả bằng đúng kết quả khi không gửi `q` |
| INV-USERS-06 | DB thật | Seed 25 user; `limit=10` → `total=25`, `totalPages=3`, `data.length=10`; trang cuối `data.length=5`; filter bật thì `total` phản ánh tập đã lọc, không phải tổng bảng |
| INV-USERS-07 | DB thật | Seed các bản ghi trùng `createdAt`; duyệt hết mọi trang, gom `id` → assert tập gom = tập seed, không phần tử lặp, không thiếu. Lặp cho `sortBy=lastLoginAt` (có giá trị null) |
| INV-USERS-08 | service + integration | approve trên `pending` → 200, `status='active'` trong DB. approve trên `active` → 409, DB không đổi. approve trên `suspended` → 409, DB không đổi |
| INV-USERS-09 | service + integration | suspend trên `active` → 200, `status='suspended'`. suspend trên `pending` → lỗi conflict, DB không đổi. suspend trên `suspended` → lỗi conflict *(⚠️ chưa có mã lỗi — test khoá HTTP 409 + DB không đổi, chốt `code` sau khi §16 được giải)* |
| INV-USERS-10 | service + integration | activate trên `suspended` → 200, `status='active'`. activate trên `pending` → conflict. activate trên `active` → conflict. DB không đổi ở hai nhánh sau *(cùng ghi chú mã lỗi như trên)* |
| INV-USERS-11 | integration | Duyệt toàn bộ 5 endpoint × mọi trạng thái nguồn; assert **không** tổ hợp nào cho ra `status='pending'` sau khi user đã rời `pending` |
| INV-USERS-12 | DB thật | Sau khi chạy toàn bộ bộ test, `SELECT DISTINCT status FROM "User"` ⊆ `{pending, active, suspended}`. Thử ghi `rejected` qua API → không có đường nào làm được |
| INV-USERS-13 | DB thật | approve → đúng 1 `Notification` type `account_approved`, `userId` = user bị tác động (không phải admin). suspend → đúng 1 `account_suspended`. activate → **0** Notification mới. Assert cả số lượng lẫn recipient |
| INV-USERS-14 | DB thật | Ép INSERT Notification thất bại (mock/constraint) → assert `User.status` **vẫn là giá trị cũ** sau rollback và không có Notification mồ côi. Chiều ngược lại: ép UPDATE fail → không có Notification nào được ghi |
| INV-USERS-15 | DB thật (concurrency) | Bắn 2 request approve song song trên cùng `:id` → đúng 1 request trả 200, request kia trả conflict; `COUNT(Notification WHERE type='account_approved' AND userId=:id) = 1`. Lặp cho suspend và activate. Thêm test tuần tự: gọi lại lần 2 → 409, không sinh Notification thứ 2 |
| INV-USERS-16 | DB thật | Snapshot toàn bộ hàng `User` trước/sau mỗi PATCH; assert **chỉ** `status` và `updatedAt` khác; `email`, `role`, `nickname`, `avatarUrl`, `hskLevelGoal`, `bio`, `passwordHash`, `createdAt`, `lastLoginAt` giữ nguyên |
| INV-USERS-17 | integration | uuid hợp lệ nhưng không tồn tại → 404 `USER_NOT_FOUND` trên cả 4 endpoint có `:id`; assert không bao giờ 200 với `data: null`. uuid sai định dạng → 400 `VALIDATION_ERROR` (phân biệt rõ hai nhánh) |
| INV-USERS-18 | integration | Mọi field DateTime trong response khớp regex ISO 8601 UTC (kết thúc `Z`); user chưa từng đăng nhập → `lastLoginAt === null` (không phải chuỗi rỗng, không phải epoch 0) |

Bổ sung ngoài invariant gate (không thay thế các dòng trên): test envelope lỗi đúng shape phẳng của API_CONVENTIONS.md (`details` chỉ có ở `VALIDATION_ERROR`, không có cờ `success`).

## 16. Chưa chốt

| Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|
| **C1 — `nickname` hay `fullName`?** ENTITY_USER + _FACTS định nghĩa field là `nickname`; API_AUTH `POST /auth/register` và `PATCH /auth/me` nhận `fullName`. Là hai tên của một field, hay hai field khác nhau? | Chặn khoá DTO response của **cả 5 endpoint** (cột "Người dùng" của bảng và header trang chi tiết đọc field này), chặn field tìm kiếm của `q` (INV-USERS-05 đang giả định tìm trên `nickname`), chặn hợp đồng FE-BE. Nếu chốt là `fullName` thì phát sinh migration đổi tên cột + sửa mọi DTO | - | trước khi code `GET /admin/users` |
| **C3 — thiếu state `rejected`.** `User.status` chỉ có `pending\|active\|suspended`. "Quyết định 5" đề xuất thêm `rejected` → cần migration enum + ADR | Chặn §6 (state machine không có đường ra cho hồ sơ bị từ chối — chúng kẹt ở `pending` vĩnh viễn và làm phình hàng đợi Admin), chặn migration, chặn giá trị hợp lệ của filter `?status=`, chặn INV-USERS-12. Không tự thêm state, không tự dùng `suspended` thay thế | - | trước khi code endpoint approve |
| **Body của `PATCH .../suspend`.** FE bắt buộc nhập "Lý do khóa" nhưng API_ADMIN.md không định nghĩa body và `User` không có field lưu lý do (`Notification.payload` là ứng viên) | Chặn DTO request của suspend, chặn `payload` của `account_suspended` (§10), có thể chặn migration | - | trước Sprint code suspend |
| **Thiếu mã lỗi cho chuyển trạng thái sai ở suspend/activate.** Registry chỉ có `USER_ALREADY_APPROVED`; không có mã đối xứng cho "suspend user đang pending" / "activate user đang active" | Chặn §9 và 2 dòng test INV-USERS-09 / INV-USERS-10 (hiện chỉ khoá được HTTP 409, chưa khoá được `code`) | - | trước khi code suspend/activate |
| **`USER_ALREADY_APPROVED` có được duyệt chưa?** Có trong API_ERROR_CODES.md và FE contract, nhưng **không** có trong danh sách mã đã xác minh của `_FACTS.md` | Chặn assert `code` của test INV-USERS-08 | - | cùng lúc với dòng trên |
| **Tên query param tìm kiếm: `q` hay `search`?** FE contract dùng `?q=`, API_ADMIN.md mô tả "filter: role, status, search" | Chặn hợp đồng URL (FE đang deep-link bằng `?q=`), chặn DTO §3 | - | trước khi code list |
| **Envelope của PATCH: `data` hay `data.user`?** API_CONVENTIONS.md nói `{ "data": {...} }`; FE contract của cả hai màn hình admin ghi `data.user` | Chặn parse response ở FE cho cả 3 PATCH + GET detail | - | trước khi code |
| **`GET /admin/users/:id` có nhúng history theo role không?** FE yêu cầu `enrollments[]`+`attempts[]` (student) / `classes[]`+`sessions[]` (teacher); API_ADMIN.md không định nghĩa | Chặn DTO `AdminUserDetail`, chặn thiết kế query chống N+1 (§11), chặn quyết định có tách endpoint riêng hay không | - | trước Sprint 3 |
| **`Notification.referenceType` không có giá trị `user`.** Enum liệt kê `assignment`/`attempt`/`invoice`/`session` | Chặn deep-link của `account_approved`/`account_suspended`; tạm để `null` (§10) | - | trước khi code notification |
| **Token của user `suspended` bị từ chối bằng 401 hay 403?** ENTITY_USER ghi 401; API_ERROR_CODES.md ghi `AUTH_ACCOUNT_SUSPENDED = 403` | Chặn hành vi guard sau khi suspend (§10) và cách FE xử lý (401 thường kích hoạt luồng refresh/logout, 403 thì không) | - | trước khi code suspend |
| **Không có bảng AuditLog.** Không có nơi bền vững lưu "ai duyệt/khoá ai, lúc nào" | Chặn yêu cầu truy vết ở §13; hiện chỉ còn log ứng dụng, không truy vấn được | - | trước go-live |
| **Admin có được tự khoá chính mình / khoá admin cuối cùng không?** Không tài liệu nào nói | Rủi ro tự khoá toàn bộ quyền quản trị. Không tự đặt rule ⇒ chưa có invariant nào phủ | - | trước go-live |

*(C2 và C4 trong `_FACTS.md` không chạm tới module này: C2 thuộc nhóm rate/payroll; C4 chỉ ảnh hưởng `hskLevelGoal` ở mức hiển thị read-only — module này không validate giá trị đó.)*
