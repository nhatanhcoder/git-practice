---
module: Notifications
status: proposed
blocked_by: KHÔNG endpoint nào của module được định nghĩa ở bất kỳ API_*.md nào (§2) · không có mã lỗi `NOTIFICATION_*` nào trong API_ERROR_CODES.md (§9) · DEBT-002 polling 60s (§16)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module sở hữu bảng `Notification` và **hộp thư của từng người dùng**: liệt kê thông báo của chính mình, đánh dấu đã đọc, đếm số chưa đọc. Ranh giới quan trọng nhất: module này **không quyết định khi nào có thông báo** — nó bị các module khác gọi (Auth, Users, Sessions, Billing, Assignments, Grading, Scheduler) để ghi bản ghi vào hộp thư. Nó là *đích đến*, không phải *nguồn phát*. Module không sở hữu văn bản hiển thị, không sở hữu kênh gửi (hiện chỉ có polling — DEBT-002), không xoá gì, và không có endpoint tạo thông báo cho client.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `Notification` | Đọc + Ghi | Đọc: chỉ hàng có `userId = actor.id`. Ghi qua endpoint: **chỉ** `isRead`, `readAt`. Ghi qua service nội bộ (do module khác gọi): INSERT. **Không UPDATE** `type`/`referenceId`/`referenceType`/`payload`/`userId`/`createdAt`, **không DELETE** |
| `User` | Đọc | Chỉ để phân giải người nhận khi fan-out (ví dụ `WHERE role='admin' AND status='active'`). Việc đọc này do **module gọi** thực hiện, không phải module này. Endpoint đọc hộp thư **không join `User`** (người nhận luôn là chính actor) |

Module **không** chạm: `Class`, `ClassSession`, `StudentInvoice`, `PayrollPeriod`… Thông báo chỉ giữ `referenceId` + `referenceType` dạng chuỗi, **không có FK** tới các bảng đó — nên không thể join để hiển thị chi tiết, và cũng không thể phát hiện tham chiếu chết (bản ghi đích đã bị xoá/void). Đây là hệ quả của thiết kế trong ENTITY_NOTIFICATION.md, ghi nhận ở §16.

## 2. Endpoints

**Đây là điểm phải đọc trước tiên: không endpoint nào dưới đây tồn tại trong tài liệu.**

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | authenticated (mọi role) | Danh sách thông báo **của chính mình**, phân trang, mới nhất trước | ⛔ **proposed — chưa định nghĩa ở bất kỳ đâu** |
| PATCH | `/api/v1/notifications/:id/read` | authenticated (mọi role) | Đánh dấu **một** thông báo của mình là đã đọc | ⛔ **proposed — chưa định nghĩa ở bất kỳ đâu** |
| PATCH | `/api/v1/notifications/read-all` | authenticated (mọi role) | Đánh dấu **toàn bộ** thông báo chưa đọc của mình là đã đọc | ⛔ **proposed — chưa định nghĩa ở bất kỳ đâu** |
| GET | `/api/v1/notifications/unread-count` | authenticated (mọi role) | Số thông báo chưa đọc của mình (badge đỏ trên chuông) | ⛔ **proposed — chưa định nghĩa ở bất kỳ đâu** |

**"Chưa định nghĩa ở bất kỳ đâu" nghĩa là gì, kiểm chứng được**:
- `API_ADMIN.md` liệt kê 4 nhóm endpoint (users, payroll, invoicing, dashboard) — **không nhóm nào là notification**.
- `API_ADMIN.md` còn có hẳn một mục "⛔ Referenced by FE contracts, not yet defined" với **7 dòng** (payroll/:id, pay-rates, tuition-rates, invoices/summary, invoices/batch, invoices/batch/preview, monitoring/gemini) — **không dòng nào là notification**. Tức là notification thậm chí không nằm trong danh sách "biết là còn thiếu".
- `API_AUTH.md` không có. `API_CONVENTIONS.md`, `API_ERROR_CODES.md` không nhắc tới.
- `front-end-design-docs/pages/_INDEX.md` liệt kê 13 route admin — **không có route notification nào**, dù `root-design-fe.md` §4.6 mô tả chuông + badge + dropdown "5–6 gần nhất" + link **"Xem tất cả"**. Link "Xem tất cả" trỏ đi đâu thì không có trang nào nhận.
- Bảng `Notification` thì ngược lại: **đã có full spec** (`ENTITY_NOTIFICATION.md`), và **4 module khác đã cam kết ghi vào nó** (spec 02 §10 INV-USERS-13, spec 04 §10, spec 01 §10, ENTITY_STUDENT_INVOICE "On creation → triggers `new_invoice`").

Hệ quả trực tiếp: **hệ thống đang có phía ghi mà không có phía đọc.** Dữ liệu sẽ được sinh ra từ Sprint 1 (register → `new_teacher_registration`) và không ai đọc được cho tới khi 4 endpoint trên được duyệt. 4 dòng trong bảng này được suy ra từ yêu cầu UI ở `root-design-fe.md` §4.6 + business rule "Unread count computed from `isRead = false`" của ENTITY_NOTIFICATION.md — **không phải** từ một hợp đồng API đã thống nhất. Chúng phải được một BE owner ký trước khi code.

Không đề xuất: `POST /notifications` (client không bao giờ được tự tạo — RBAC: `Notification · create (system)` = ❌ cho teacher/student), `DELETE /notifications/:id` (append-only), `PATCH /notifications/:id/unread` (§6 là cổng một chiều).

## 3. DTO

### Request

**GET /notifications** — query params (tất cả optional):

| Field | Kiểu | Bắt buộc | Ràng buộc validate |
|---|---|---|---|
| `page` | int | không | ≥ 1, mặc định `1` (API_CONVENTIONS.md) |
| `limit` | int | không | ≥ 1, mặc định `20`, trần đề xuất `50` — dropdown chuông chỉ cần `limit=6` (⚠️ trần là **proposed**, API_CONVENTIONS không quy định) |
| `isRead` | boolean | không | **proposed**. Không gửi = lấy cả đọc lẫn chưa đọc. `false` = chỉ chưa đọc |
| `type` | enum string | không | **proposed**. ∈ 11 giá trị enum của ENTITY_NOTIFICATION.md. Giá trị ngoài enum → `VALIDATION_ERROR`, không im lặng bỏ qua |

**PATCH /notifications/:id/read** — path param `id` (uuid, sai định dạng → `VALIDATION_ERROR`). Không body.

**PATCH /notifications/read-all** — không param, không body. (Cân nhắc `?type=` để "đọc hết nhóm này" — **không đề xuất** cho v1, thêm bề mặt mà UI chưa cần.)

**GET /notifications/unread-count** — không tham số.

### Response

**GET /notifications** → `200`

```
{ "data": [ NotificationItem, ... ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
```

`NotificationItem`:

| Field | Kiểu | Nullable | Ghi chú |
|---|---|---|---|
| `id` | uuid | no | |
| `type` | enum (11 giá trị) | no | Danh sách đầy đủ ở §10 |
| `referenceId` | string | yes | ID của thực thể được nhắc tới |
| `referenceType` | string | yes | ∈ `assignment` \| `attempt` \| `invoice` \| `session`. ⚠️ **không có giá trị `user`** → 4 type `account_*`/`*_registration` buộc phải để `null` |
| `isRead` | bool | no | |
| `readAt` | DateTime UTC ISO 8601 | yes | `null` khi `isRead=false` |
| `payload` | object (jsonb) | yes | Dữ liệu phụ, ví dụ `{ "rejectionReason": "..." }` |
| `createdAt` | DateTime UTC ISO 8601 | no | Khoá sắp xếp chính |

**Không có `message`, không có `title`, không có `senderId`.** ENTITY_NOTIFICATION.md không định nghĩa cột nào chứa văn bản hiển thị ⇒ **văn bản thông báo không có nguồn trong DB**; FE phải tự dựng câu chữ từ `type` + `payload` + `referenceId`. Đây là mâu thuẫn với `PROJECT_KNOWLEDGE.md` mục 15 (bản đó có `message`, `data`, `recipientId`, `senderId`) → §16. Spec này bám ENTITY_NOTIFICATION.md + `_FACTS.md`, là nguồn đã xác minh.

**PATCH /notifications/:id/read** → `200` — `{ "data": NotificationItem }` (trả bản ghi sau khi cập nhật, để FE cập nhật đúng `readAt` mà không phải gọi lại list). ⚠️ Shape này là **proposed**; `204` cũng hợp lệ theo API_CONVENTIONS nhưng làm FE mất giá trị `readAt`.

**PATCH /notifications/read-all** → `200` — `{ "data": { "updated": 7 } }`. ⚠️ **proposed**. `204` sẽ đơn giản hơn nhưng mất số lượng đã đánh dấu, mà FE cần con số đó để cập nhật badge ngay không cần gọi lại `unread-count`.

**GET /notifications/unread-count** → `200` — `{ "data": { "unreadCount": 3 } }`. ⚠️ Tên field **proposed**. Không dùng `meta` cho con số này (`meta` theo API_CONVENTIONS.md dành riêng cho phân trang).

## 4. Rule nghiệp vụ (invariant)

| ID | Phát biểu |
|---|---|
| **INV-NOTIF-01** | `Notification` là **append-only**: không endpoint nào, không job nào xoá một hàng đã tạo. Số hàng của một user chỉ tăng theo thời gian. |
| **INV-NOTIF-02** | Sau khi tạo, các field nội dung (`userId`, `type`, `referenceId`, `referenceType`, `payload`, `createdAt`) là **bất biến**; đường ghi duy nhất còn lại là cặp `isRead`/`readAt`. |
| **INV-NOTIF-03** | `isRead` là **cổng một chiều**: `false → true`. Không tồn tại endpoint, tham số hay đường nghiệp vụ nào đưa `true` về `false`. |
| **INV-NOTIF-04** | `readAt` khác `null` **khi và chỉ khi** `isRead = true`, và được đặt đúng một lần tại lần chuyển trạng thái đầu tiên; đánh dấu đọc lần thứ hai **không** làm `readAt` nhảy. |
| **INV-NOTIF-05** | Mọi truy vấn của mọi endpoint đều bị ràng `userId = actor.id` ở tầng repository; không tham số nào (query, path, body, header) cho phép đọc hoặc sửa hộp thư của người khác. |
| **INV-NOTIF-06** | `unreadCount` **luôn bằng** số phần tử mà `GET /notifications?isRead=false` báo cáo (`meta.total`) tại cùng thời điểm — hai endpoint suy ra từ **cùng một** điều kiện `userId = me AND isRead = false`, không có hai định nghĩa "chưa đọc". |
| **INV-NOTIF-07** | Sau khi `PATCH /notifications/read-all` trả về, mọi thông báo **tồn tại tại thời điểm câu lệnh chạy** của user đó đều có `isRead = true`; thông báo sinh ra sau đó vẫn `false` và đó là hành vi đúng, không phải lỗi. |
| **INV-NOTIF-08** | Không có đường nào để client tạo `Notification`: không endpoint POST, và service tạo chỉ được gọi từ tầng server bởi module nghiệp vụ. Teacher/Student không bao giờ tạo được thông báo cho người khác. |
| **INV-NOTIF-09** | `type` luôn thuộc đúng 11 giá trị enum của ENTITY_NOTIFICATION.md; không giá trị nào ngoài danh sách được ghi xuống DB (đặc biệt: **không có** `payroll_*`, `password_changed`, `account_activated`, `invoice_paid`). |
| **INV-NOTIF-10** | `referenceType` ∈ `{assignment, attempt, invoice, session}` hoặc `null`; không ghi giá trị tự chế. Khi `referenceType = null` thì FE không được suy ra deep-link từ `referenceId`. |
| **INV-NOTIF-11** | Mỗi hàng thuộc về **đúng một** người nhận (`userId` NOT NULL, FK hợp lệ); không có hàng "phát cho tất cả". Gửi cho N admin = **N hàng** riêng biệt. |
| **INV-NOTIF-12** | Một sự kiện nghiệp vụ sinh **tối đa một** thông báo cho **mỗi** người nhận: thao tác lặp lại hoặc retry của cùng một sự kiện không tạo hàng thứ hai. |
| **INV-NOTIF-13** | Việc INSERT thông báo và hành động nghiệp vụ sinh ra nó nằm trong **cùng một transaction**: không tồn tại "đã duyệt tài khoản nhưng không có thông báo", cũng không tồn tại "có thông báo cho việc chưa xảy ra". |
| **INV-NOTIF-14** | `payload` chỉ mang dữ liệu bổ trợ để hiển thị; không hành vi hệ thống nào (định tuyến, phân quyền, đếm) phụ thuộc vào nội dung `payload`. Deep-link chỉ dùng `referenceId` + `referenceType`. |
| **INV-NOTIF-15** | `payload` không bao giờ chứa dữ liệu nhạy cảm: không `passwordHash`, không token, không mật khẩu, không khoá API. |
| **INV-NOTIF-16** | Danh sách sắp xếp `createdAt DESC` với tie-breaker `id` ⇒ thứ tự toàn phần và ổn định: duyệt hết các trang cho ra mỗi hàng đúng một lần, không trùng, không sót. |
| **INV-NOTIF-17** | `meta.total` là số hàng thoả điều kiện **trước** phân trang; `meta.totalPages = ceil(total / limit)`; `data.length ≤ limit`. |
| **INV-NOTIF-18** | Mọi DateTime trả ra là UTC ISO 8601; `readAt = null` (không phải chuỗi rỗng) khi chưa đọc. |

## 5. Ownership / RBAC

RBAC_MATRIX.md có đúng hai dòng liên quan:

| Resource | Action | Admin | Teacher | Student |
|---|---|---|---|---|
| Notification | read own | ✅ | 🔒 | 🔒 |
| Notification | create (system) | ✅ (system) | ❌ | ❌ |

⚠️ **Dòng đầu tự mâu thuẫn**: nhãn hành động là "read **own**" nhưng ô Admin là ✅ = "Full access (own + others)" theo chú giải của chính tài liệu đó. Đọc theo nghĩa đen thì admin được đọc hộp thư người khác. Spec này **chọn cách diễn giải hẹp** — admin chỉ đọc hộp thư của chính mình (INV-NOTIF-05) — vì (a) không có endpoint nào nhận `userId` của người khác, (b) thông báo chứa dữ liệu nghiệp vụ của người khác (số tiền hoá đơn, lý do từ chối buổi dạy), (c) mở rộng quyền sau này là thay đổi tương thích ngược, thu hẹp quyền thì không. Ghi lệch vào §16, không tự sửa RBAC_MATRIX.

Kiểm hai tầng:

| Tầng | Điều kiện | Sai thì |
|---|---|---|
| Guard | Token hợp lệ, chưa hết hạn | `401 AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` |
| Service (bắt buộc) | `actor.status === 'active'` (đọc từ DB — spec 01 §5) | `403 AUTH_ACCOUNT_SUSPENDED` |
| Repository (bắt buộc, không bỏ) | **Mọi** câu truy vấn có `WHERE "userId" = :actorId` — kể cả khi đã có `id` trong path | xem dưới |
| Service | Bản ghi `:id` tồn tại **và** thuộc actor | 404 (⚠️ chưa có mã lỗi — §9) |

**Ràng `userId` phải nằm ở repository, không phải ở service.** Nếu để service tự nhớ thêm điều kiện, chỉ cần một hàm quên là rò toàn bộ hộp thư người khác. Cách an toàn: hàm repository **không nhận** tham số `userId` tuỳ chọn — nó luôn bắt buộc.

**Bản ghi của người khác trả 404, không trả 403.** Trả 403 xác nhận "id này có tồn tại, chỉ là không phải của bạn" — đủ để dò sự tồn tại của thông báo người khác. 404 không tiết lộ gì. (⚠️ Cùng lúc đó, hiện **không có mã lỗi nào** cho 404 ở module này — §9.)

## 6. State machine

Module không có state machine nghiệp vụ phức tạp; nó có đúng **một cổng một chiều**, và điều đáng nói nằm ở những chuyển đổi **không tồn tại**.

```
   Sự kiện nghiệp vụ ở module khác
   (approve user / reject session / create invoice / register / ...)
              │  INSERT trong CÙNG transaction với hành động đó (§7)
              ▼
      ┌───────────────────────┐
      │  unread               │   isRead = false, readAt = null
      └───────────┬───────────┘
                  │  PATCH /notifications/:id/read
                  │  PATCH /notifications/read-all   (hàng loạt, cùng một cổng)
                  ▼
      ┌───────────────────────┐
      │  read                 │   isRead = true,  readAt = <lần đầu tiên>   [KẾT THÚC]
      └───────────────────────┘

      ✗ read → unread        : không có endpoint, không có tham số  (INV-NOTIF-03)
      ✗ * → deleted          : không có DELETE, không có soft-delete, không có archive (INV-NOTIF-01)
      ✗ * → sửa nội dung      : type/referenceId/referenceType/payload bất biến (INV-NOTIF-02)
```

| Từ | Đến | Hành động | Hợp lệ? |
|---|---|---|---|
| — | `unread` | module khác gọi service tạo | ✅ đường tạo **duy nhất** |
| `unread` | `read` | `PATCH /:id/read` | ✅ đặt `readAt = now()` |
| `unread` | `read` | `PATCH /read-all` | ✅ đặt `readAt = now()` cho mọi hàng chưa đọc |
| `read` | `read` | `PATCH /:id/read` lần hai | ✅ **no-op thành công** — không đổi `readAt`, không lỗi (§8) |
| `read` | `unread` | — | ❌ không tồn tại |
| bất kỳ | *xoá* | — | ❌ không tồn tại |
| — | `read` | tạo mới đã đọc sẵn | ❌ mọi thông báo sinh ra ở trạng thái chưa đọc |

**Hệ quả của việc chỉ có một cổng một chiều và không có xoá**: hộp thư chỉ dài ra mãi. Một giáo viên dạy 3 buổi/tuần nhận ~150 thông báo `session_approved`/năm; admin nhận thêm mỗi lượt đăng ký và mỗi buổi chờ duyệt. Không có lưu trữ (archive), không có hết hạn (expiry), không có chính sách giữ (retention) trong bất kỳ tài liệu nào ⇒ trang "Xem tất cả" sẽ phân trang trên tập tăng vô hạn. Ghi nhận ở §16.

## 7. Transaction boundary

Đây là quyết định thiết kế lớn nhất của module, và nó ảnh hưởng tới **mọi** module gọi tới nó.

**Câu hỏi**: hàng `Notification` được INSERT trong cùng transaction với hành động nghiệp vụ sinh ra nó, hay sau khi hành động đó đã commit?

| | **A. Cùng transaction** | **B. Ngoài transaction (sau commit)** |
|---|---|---|
| Tính nhất quán | Tuyệt đối: có hành động ⇔ có thông báo | Có thể lệch: hành động đã commit, tiến trình chết trước khi ghi thông báo ⇒ **mất thông báo vĩnh viễn, không ai biết** |
| Rủi ro cho nghiệp vụ | Lỗi khi ghi thông báo làm **rollback hành động nghiệp vụ**: admin bấm "Duyệt" thất bại chỉ vì bug ở phần thông báo | Nghiệp vụ an toàn: thông báo hỏng không ảnh hưởng việc duyệt |
| Thời gian giữ transaction | Dài hơn; fan-out cho N admin nằm trong transaction, giữ khoá hàng lâu hơn | Ngắn nhất |
| Khả năng thử lại | Không cần: hoặc cả hai, hoặc không cái nào | Cần hàng đợi retry riêng, nếu không thì mất là mất |
| Phát hiện khi hỏng | Ngay lập tức (request lỗi) | **Im lặng** — người dùng chỉ phát hiện khi thắc mắc "sao tôi không được báo" |

**Đề xuất: outbox (transactional outbox), và ở phạm vi hiện tại nó rút gọn thành A.**

Lý do rút gọn: kênh phát hiện tại là **polling — client đọc thẳng bảng `Notification`** (DEBT-002). Nghĩa là **bản thân hàng trong bảng chính là outbox**: ghi được hàng = giao được thông báo. Không có bước gửi ra ngoài nào cần thử lại. Vì vậy quy tắc cụ thể cho hôm nay:

1. **INSERT `Notification` nằm trong cùng transaction với UPDATE/INSERT nghiệp vụ.** (Đã được cam kết ở spec 02 §7 INV-USERS-14 và spec 04 §10 — spec này xác nhận quy tắc chung, không phá lệ.)
2. **Mọi thứ rời khỏi DB nằm ngoài transaction, chạy sau commit**: push, email, webhook, WebSocket khi có (tương lai). Không bao giờ gọi HTTP bên trong transaction.
3. **Service tạo thông báo không tự mở transaction** — nó **nhận** handle transaction của module gọi. Nếu nó tự mở, ta rơi thẳng vào phương án B mà không ai nhận ra.
4. **Giảm rủi ro của A** (rollback nghiệp vụ vì thông báo): giữ bước INSERT tầm thường — không gọi mạng, không đọc thêm bảng, không tính toán; validate `type`/`referenceType` **trước** khi mở transaction; fan-out bằng **một** câu insert nhiều dòng, không vòng lặp. Khi INSERT chỉ có thể hỏng vì DB hỏng, thì "rollback vì thông báo" trở thành tình huống mà rollback đúng là điều ta muốn.

**Khi nào phải nâng lên outbox thật** (bảng `NotificationOutbox` riêng + worker): ngay khi xuất hiện kênh gửi ra ngoài (email/push/WebSocket ở Sprint 6 nếu DEBT-002 được xử lý), hoặc khi fan-out đủ lớn để việc INSERT làm transaction nghiệp vụ chậm đáng kể. Lúc đó: INSERT hàng outbox trong transaction (giữ nguyên tính nguyên tử), worker đọc và gửi ngoài transaction với ngữ nghĩa **at-least-once** + khoá chống trùng (§8) — vì at-least-once cộng với việc gửi trùng là chấp nhận được, còn mất thông báo thì không.

**Mức isolation**: `READ COMMITTED` đủ cho mọi luồng.
- `PATCH /:id/read`: một câu UPDATE có điều kiện, **không cần** transaction tường minh.
- `PATCH /read-all`: **một câu** `UPDATE ... WHERE "userId" = :me AND "isRead" = false` — một câu lệnh đơn đã là nguyên tử; không được thay bằng "SELECT danh sách rồi UPDATE từng cái" (vừa N+1 vừa mở cửa cho đua).
- `GET`: chỉ đọc. `unread-count` và list nếu được gọi trong cùng một màn hình vẫn là hai request độc lập ⇒ **có thể lệch nhau vài giây** một cách hợp lệ; INV-NOTIF-06 phát biểu "tại cùng thời điểm", không đòi hai request khác nhau phải khớp tuyệt đối.

## 8. Idempotency & concurrency

**`PATCH /:id/read` — idempotent theo thiết kế.** Dùng guarded UPDATE:

```
UPDATE "Notification" SET "isRead" = true, "readAt" = now()
WHERE id = :id AND "userId" = :me AND "isRead" = false
```

- `rowCount = 1` ⇒ vừa chuyển trạng thái.
- `rowCount = 0` ⇒ hoặc đã đọc rồi, hoặc không tồn tại/không phải của mình. Phải SELECT lại để phân biệt: nếu tồn tại và của mình ⇒ trả **200 với bản ghi hiện tại** (no-op thành công, `readAt` **không** bị ghi đè — INV-NOTIF-04); nếu không ⇒ 404.
- **Không trả 409 khi đã đọc.** Khác với module Users (approve lần hai = 409 vì admin cần biết ai xử lý trước), ở đây bấm hai lần vào một thông báo là thao tác bình thường của người dùng bình thường (click, mở tab, click lại). Lỗi ở đây là phiền toái vô cớ.

**Hai request `read` đồng thời trên cùng `:id`**: chỉ một câu UPDATE thấy `isRead = false`, nên chỉ một cái đặt `readAt`; cái kia `rowCount = 0` → no-op. Không có khoá nào cần thêm.

**`PATCH /read-all` chạy đồng thời với một thông báo mới đang được tạo**: câu UPDATE chỉ tác động lên các hàng đã nhìn thấy trong snapshot của nó. Thông báo commit sau đó **vẫn chưa đọc**, và badge có thể hiện `1` ngay sau khi người dùng bấm "Đánh dấu tất cả đã đọc". Đây là hành vi **đúng** (INV-NOTIF-07), không phải lỗi cần vá — cố "vá" bằng cách khoá bảng hoặc quét lại sẽ chặn luồng nghiệp vụ chỉ để làm đẹp badge.

**`read-all` gọi hai lần liên tiếp**: lần hai trả `{ "updated": 0 }` — idempotent, không lỗi.

**Chống trùng khi tạo (INV-NOTIF-12)**: hiện **không có ràng buộc nào ở DB** ngăn hai hàng giống hệt nhau. Ba nguồn sinh trùng: (a) module gọi bị retry ở tầng HTTP, (b) người dùng bấm nút hai lần, (c) worker outbox at-least-once trong tương lai. Bảo vệ hiện có: các module gọi đều dùng guarded UPDATE nên lần thứ hai không tới được bước INSERT (spec 02 §8 INV-USERS-15) — **tính không trùng đang được bảo đảm bởi module gọi, không phải bởi module này**. Đề xuất bổ sung hàng rào tại chỗ: unique **một phần** trên `(userId, type, referenceId)` cho các type gắn với một sự kiện **một lần** (`account_approved`, `session_approved`, `session_rejected`, `new_invoice`, `new_teacher_registration`, `new_student_registration`) — và **loại trừ** các type lặp lại hợp lệ (`deadline_reminder` phát lại được, `graded` có thể phát lại khi chấm lại, `new_assignment` mỗi assignment một lần nên vẫn an toàn). Là **proposed**, cần chốt danh sách type trước khi viết migration → §16.

**Không dùng `Idempotency-Key`**: API_CONVENTIONS.md không định nghĩa header này.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không có token / token hỏng | 401 | `AUTH_TOKEN_INVALID` | có trong API_ERROR_CODES.md (⚠️ không có trong `_FACTS.md` — spec 01 §16) |
| Access token hết hạn | 401 | `AUTH_TOKEN_EXPIRED` | có |
| Actor đang `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | có |
| `:id` sai định dạng uuid, `page`/`limit`/`type`/`isRead` sai | 400 | `VALIDATION_ERROR` | có |
| **`:id` không tồn tại, hoặc thuộc user khác** | 404 | ⛔ **không có mã nào** | **API_ERROR_CODES.md không có nhóm `NOTIFICATION_*`.** Không bịa mã → §16 |

**Đây là module duy nhất trong hệ thống không có một mã lỗi nào của riêng nó.** Registry có 10 nhóm (`AUTH_*`, `USER_*`, `CLASS_*`, `QUESTION_*`, `ASSIGNMENT_*`, `ATTEMPT_*`, `FLASHCARD_*`, `PAYROLL_*`, `SESSION_*`, `INVOICE_*`, `RATE_*`, `AI_*`, `VALIDATION_*`) — không nhóm nào cho notification. Hệ quả cụ thể: nhánh 404 (chiếm phần lớn nhánh lỗi của module) **chưa code được đúng hợp đồng**, và test chỉ khoá được HTTP status chứ chưa khoá được `code`. Đây là dấu hiệu bổ sung cho kết luận ở §2 — module này chưa từng được thiết kế ở phía API.

Ghi chú: `AUTH_INSUFFICIENT_ROLE` **không** dùng ở đây (mọi role đều được đọc hộp thư của mình; giới hạn là quyền sở hữu, không phải role).

## 10. Side effect & notification

Đảo chiều so với các module khác: **module này không sinh side effect nào — nó CHÍNH LÀ side effect của module khác.** Nó không gửi mail, không gọi webhook, không đụng bảng nghiệp vụ nào.

### 10.1 Bảng đầy đủ: ai sinh, type gì, gửi cho ai

Nguồn: `ENTITY_NOTIFICATION.md` § Notification Types (11 type) + business rule của các entity liên quan.

| # | `type` | Module / hành động sinh ra | Người nhận (`userId`) | `referenceId` / `referenceType` | `payload` | Trạng thái đường sinh |
|---|---|---|---|---|---|---|
| 1 | `account_approved` | **Users** — `PATCH /admin/users/:id/approve` | user vừa được duyệt (teacher hoặc student) | `user.id` / ⚠️ `null` (enum không có `user`) | — | ✅ endpoint defined; spec 02 §10 |
| 2 | `account_suspended` | **Users** — `PATCH /admin/users/:id/suspend` | user vừa bị khoá | `user.id` / ⚠️ `null` | ⚠️ ứng viên chứa lý do khoá (FE bắt nhập, `User` không có cột lưu) — chưa chốt, spec 02 §16 | ✅ endpoint defined |
| 3 | `new_teacher_registration` | **Auth** — `POST /auth/register` với `role='teacher'` | **mọi** admin (fan-out N hàng) | `user.id` mới / ⚠️ `null` | — | ✅ endpoint defined; spec 01 §10 |
| 4 | `new_student_registration` | **Auth** — `POST /auth/register` với `role='student'` | **mọi** admin (fan-out N hàng) | `user.id` mới / ⚠️ `null` | — | ✅ endpoint defined |
| 5 | `new_invoice` | **Billing** — `POST /admin/invoices` (ENTITY_STUDENT_INVOICE: "On creation → triggers `new_invoice`") | `invoice.studentId` | `invoice.id` / `invoice` | ⚠️ chưa chốt (số tiền? hạn nộp? — §16) | ⚠️ endpoint defined nhưng nhóm `INVOICE_*` và mô hình học phí đang *proposed* |
| 6 | `session_submitted_for_review` | **Sessions (lane Teacher)** — teacher nộp buổi dạy (`→ completed_pending`) | Admin — ⚠️ **một admin nào? tất cả?** chưa chốt | `session.id` / `session` | — | ⛔ **chưa có endpoint nào** cho teacher nộp buổi dạy (spec 04 SCOPE-02) |
| 7 | `session_approved` | **Sessions** — `PATCH /admin/sessions/:id/approve` | `session.teacherId` | `session.id` / `session` | — | ✅ endpoint defined; spec 04 §10 |
| 8 | `session_rejected` | **Sessions** — `PATCH /admin/sessions/:id/reject` | `session.teacherId` | `session.id` / `session` | `{ "rejectionReason": "<nguyên văn>" }` | ✅ endpoint defined; spec 04 §10 |
| 9 | `new_assignment` | **Assignments (lane Teacher)** — teacher xuất bản assignment | **mọi** student đang `active` trong lớp (fan-out theo sĩ số) | `assignment.id` / `assignment` | — | ⛔ chưa có `API_TEACHER.md`, chưa có endpoint |
| 10 | `deadline_reminder` | **Scheduler** — cron chạy tại `dueDate − 24h` | student chưa nộp bài của assignment đó | `assignment.id` / `assignment` | — | ⛔ **không module nào sở hữu scheduler**; không có tài liệu về cron, về việc lọc "chưa nộp", hay về chống gửi trùng |
| 11 | `graded` | **Grading (lane Teacher)** — teacher hoàn tất chấm | `attempt.studentId` | `attempt.id` / `attempt` | — | ⛔ chưa có endpoint (T-GRADE-*, Sprint 4) |

**Đọc bảng này theo chiều thời gian**: 5/11 type có đường sinh đã định nghĩa (1,2,3,4,7,8 — thực tế 6/11), còn lại phụ thuộc các lane chưa có tài liệu API. Nghĩa là ngay cả khi 4 endpoint ở §2 được duyệt và code xong, hộp thư của **student** gần như trống (chỉ có `account_approved`/`account_suspended`/`new_invoice`), vì 3 type dành cho student (`new_assignment`, `deadline_reminder`, `graded`) đều chưa có nguồn.

### 10.2 Những việc **không** sinh thông báo (đã kiểm, không phải bỏ sót)

| Hành động | Vì sao không có |
|---|---|
| `PATCH /admin/users/:id/activate` (mở khoá) | Enum không có type nào cho việc mở khoá — user bị khoá nhầm rồi được mở lại **không được báo** (spec 02 INV-USERS-13) |
| Đổi mật khẩu, đổi email (`/auth/*`) | Không có type; không có tín hiệu bảo mật nào cho chủ tài khoản (spec 01 §10) |
| Chốt/chi trả kỳ lương (`payroll/:id/finalize`, `/pay`) | Không có `payroll_*` — giáo viên không được báo khi lương được chốt hay đã trả (spec 05 §10, Q-PAY-8) |
| Đặt/đổi mức lương, mức học phí (`pay-rates`, `tuition-rates`) | Không có type; cộng với RBAC `TeacherPayRate read = ❌` cho teacher ⇒ giáo viên **không có đường nào** biết mức lương của mình đã đổi |
| Ghi nhận thanh toán, huỷ hoá đơn (`invoices/:id/payments`, `/void`) | Không có type — học sinh không được báo khi hoá đơn đã được ghi nhận trả hay bị huỷ |
| Học sinh tham gia/rời lớp | Không có type — giáo viên không được báo có học sinh mới |

⚠️ `PROJECT_KNOWLEDGE.md` mục 15 có thêm `grading_required`, `weak_student_alert`, `payroll_finalized`, `invoice_created` — **không** nằm trong enum của ENTITY_NOTIFICATION.md. Spec bám ENTITY_NOTIFICATION.md; chênh lệch ghi ở §16.

### 10.3 Giao diện được gọi (contract cho module khác)

- Module gọi **truyền handle transaction của mình vào**; service tạo thông báo không tự mở transaction (§7).
- Module gọi chịu trách nhiệm phân giải danh sách người nhận (ví dụ truy vấn admin `active`); module này chỉ ghi.
- Fan-out: **một** câu insert nhiều dòng cho N người nhận, không vòng lặp (§11).
- Module gọi **không** được đọc/sửa hàng `Notification` đã tạo, kể cả của chính sự kiện mình sinh ra.

## 11. Index & query

```
Notification: INDEX ("userId", "createdAt" DESC, id)                    -- list + phân trang ổn định (INV-NOTIF-16)
Notification: INDEX ("userId") WHERE "isRead" = false   [partial]       -- unread-count + list?isRead=false  ← đường nóng nhất
Notification: INDEX ("userId", type, "createdAt" DESC)   [proposed]     -- chỉ khi filter ?type= được chốt
Notification: UNIQUE ("userId", type, "referenceId")     [proposed,
              một phần theo danh sách type ở §8]                        -- chống trùng INV-NOTIF-12
```

**`unread-count` là truy vấn có tần suất cao nhất toàn hệ thống, và điều đó là do polling.** DEBT-002 quy định nhịp 60 giây ⇒ mỗi người dùng đang mở tab tạo **1 request/phút, vĩnh viễn, kể cả khi không thao tác gì**. 100 người online = ~1,7 req/s liên tục chỉ để hiển thị một con số; 500 người = ~8,3 req/s. So sánh: toàn bộ nghiệp vụ admin (duyệt, chấm, ghi nhận thanh toán) là vài chục request mỗi giờ. Vì vậy:

- `unread-count` **bắt buộc** dùng **partial index** `WHERE "isRead" = false`. Index này chỉ chứa các hàng chưa đọc — tập luôn nhỏ (vài hàng/người), trong khi bảng tổng tăng vô hạn (§6). Không có nó, `COUNT(*)` phải quét toàn bộ lịch sử của user.
- Truy vấn phải là `COUNT` ở DB. Cấm `findMany(...).length`.
- Nếu sau này vẫn nặng: cache đếm theo user với TTL ngắn (< nhịp polling) hoặc cột đếm phi chuẩn hoá — **cả hai đều làm INV-NOTIF-06 chỉ còn đúng "sau cùng"**, nên phải phát biểu lại invariant kèm độ trễ trước khi làm. Không tối ưu trước khi đo.
- Nếu FE gọi cả `unread-count` và `GET /notifications?limit=6` mỗi chu kỳ thì đó là **2 request/phút/người** — cân nhắc bỏ hẳn `unread-count` và lấy con số từ `meta.total` của `?isRead=false&limit=6` (một request thay hai). Là lựa chọn thiết kế API cần chốt → §16.

**N+1 — nguy cơ và cách tránh**:
1. **Không join `User`.** Người nhận luôn là actor; không cần lấy tên người nhận. Nếu FE muốn hiện "**Admin Tuấn** đã duyệt buổi dạy của bạn" thì cần tên **người gây ra sự kiện** — mà `Notification` **không có `senderId`** (§3). Lấy được tên đó chỉ bằng cách join sang bảng nghiệp vụ theo `referenceId`, mà `referenceId` là `varchar` không có FK ⇒ không join được kiểu quan hệ ⇒ sẽ thành **một query cho mỗi thông báo**. Cách duy nhất đúng: **denormalize tên vào `payload`** lúc tạo. Đây là lý do kỹ thuật để `payload` tồn tại, và cần chốt ở §16 cùng với câu hỏi "văn bản thông báo nằm ở đâu".
2. **Không giải chi tiết `referenceId` theo từng hàng.** 20 thông báo thuộc 4 loại khác nhau ⇒ nếu resolve từng cái thì 20 query vào 4 bảng khác nhau. Nếu buộc phải có, gom theo `referenceType` rồi `WHERE id IN (...)` — mỗi loại một query. Đề xuất v1: **không resolve gì cả**, FE deep-link bằng `referenceType` + `referenceId`.
3. `meta.total` bằng `COUNT` riêng với cùng mệnh đề `WHERE`.

**Tăng trưởng bảng**: append-only + fan-out (mỗi lượt đăng ký sinh N hàng cho N admin; mỗi assignment sinh N hàng cho N học sinh) ⇒ đây sẽ là một trong hai bảng lớn nhất hệ thống cùng với `RefreshToken`. Chưa có chính sách giữ dữ liệu → §16. Khi cần: phân vùng theo `createdAt` hoặc chuyển hàng đã đọc quá cũ sang bảng lưu trữ — **không xoá** (INV-NOTIF-01).

## 12. Migration & seed

**Migration tạo bảng `Notification`** theo đúng ENTITY_NOTIFICATION.md: `id` uuid PK · `userId` uuid NOT NULL FK → `User` · `type` enum (11 giá trị, tạo kiểu enum ở Postgres) · `referenceId` varchar NULL · `referenceType` varchar NULL · `isRead` bool NOT NULL DEFAULT false · `readAt` DateTime NULL · `payload` jsonb NULL · `createdAt`/`updatedAt` DateTime NOT NULL.

Ràng buộc và index kèm theo:
- FK `userId` — `ON DELETE CASCADE` (chưa có đường xoá user nên chưa kích hoạt trong thực tế, nhưng phải khai báo dứt khoát).
- CHECK `("isRead" = false AND "readAt" IS NULL) OR ("isRead" = true AND "readAt" IS NOT NULL)` — biến INV-NOTIF-04 thành ràng buộc DB thay vì lời hứa của tầng ứng dụng. **Đề xuất, chưa có trong tài liệu.**
- CHECK `referenceType IN ('assignment','attempt','invoice','session') OR referenceType IS NULL` — khoá INV-NOTIF-10 ở tầng DB. **Đề xuất.**
- Hai index ở §11 (index chính + partial index cho chưa đọc).
- Unique một phần chống trùng: **proposed**, chờ chốt danh sách type (§8).

**Thứ tự migration**: bảng này phải có **trước** khi module Auth và Users chạy được, vì register và approve đều INSERT vào nó trong cùng transaction (§7). Tức là dù bản thân module Notifications ở trạng thái `proposed`, **bảng của nó là phụ thuộc cứng của Sprint 1**.

**Seed**:
- Mỗi role (admin/teacher/student) một hộp thư có: ≥1 hàng chưa đọc, ≥1 hàng đã đọc (`readAt` khác `createdAt`), để kiểm `unreadCount` và filter.
- 1 hàng `session_rejected` có `payload = { rejectionReason: ... }` — kiểm đường đọc jsonb.
- 1 hàng `account_approved` có `referenceType = null` — **bắt buộc**, để FE chứng minh xử lý được deep-link rỗng (§3).
- ≥ 25 hàng cho một user để kiểm phân trang và tie-breaker, trong đó có vài hàng **cùng `createdAt`** (INV-NOTIF-16).
- 2 admin + 1 lượt register trong seed để chứng minh fan-out ra 2 hàng.
- Hộp thư **rỗng** cho ít nhất một user (empty state của FE, `unreadCount = 0`, `total = 0`).

## 13. Security & rate limit

**Ranh giới bảo mật của module là đúng một điều kiện WHERE.** Thông báo mang dữ liệu nghiệp vụ của người khác: `new_invoice` gắn với hoá đơn của một học sinh cụ thể, `session_rejected` chứa nguyên văn lý do admin từ chối buổi dạy của một giáo viên, `new_*_registration` tiết lộ có ai vừa đăng ký. Quên `WHERE "userId" = :me` ở **một** hàm là rò toàn bộ hộp thư của toàn hệ thống qua một endpoint mà không ai coi là nhạy cảm. Vì vậy §5 yêu cầu ràng buộc đó nằm ở repository và là tham số **bắt buộc**, và §15 test nó như một invariant chứ không phải như một tiện ích.

| Chủ đề | Quy tắc |
|---|---|
| Dữ liệu không được ra ngoài | `payload` không chứa `passwordHash`, token, mật khẩu, khoá API (INV-NOTIF-15). Cân nhắc kỹ trước khi đưa số tiền/thông tin cá nhân vào `payload` — nó sẽ nằm trong DB không mã hoá và trong mọi log request |
| Không rò sự tồn tại | Bản ghi của người khác trả **404**, không phải 403 (§5) |
| Rate limit | Polling 60s là hành vi bình thường, nhưng client hỏng (hoặc kẻ xấu) có thể gọi `unread-count` liên tục. Đề xuất giới hạn **theo user**, khoảng 60 req/phút cho nhóm endpoint này — đủ rộng cho polling + thao tác thật, đủ hẹp để chặn vòng lặp lỗi. ⚠️ **proposed**, không có tài liệu; và **chưa có mã lỗi cho 429** (spec 01 §16) |
| Ghi | Không có endpoint tạo/xoá cho client (INV-NOTIF-08, INV-NOTIF-01) ⇒ bề mặt ghi của module chỉ là một cờ boolean một chiều — bề mặt tấn công nhỏ nhất có thể |
| Audit | Không có bảng `AuditLog`. Nhưng bảng `Notification` **append-only** nên bản thân nó là dấu vết mờ của các sự kiện nghiệp vụ ("đã có ai đó được duyệt lúc t"). Không được coi đây là thay thế cho audit thật: nó không ghi **ai** gây ra sự kiện (không có `senderId`) |

## 14. Observability

**Log**:
- Tạo thông báo: `type`, `userId` người nhận, `referenceType`/`referenceId`, module gọi. Mức debug/info. Fan-out ghi **một dòng cho cả lô** kèm số lượng, không mỗi người nhận một dòng.
- Fan-out bất thường (số người nhận vượt ngưỡng, ví dụ > 50) — mức warn: dấu hiệu vòng lặp sai hoặc lớp học khổng lồ.
- Truy cập 404 ở `PATCH /:id/read` — mức info kèm `actorId`: một user gặp nhiều 404 liên tiếp có thể đang dò id của người khác.
- **Không** log toàn bộ `payload` vào log dùng chung (có thể chứa lý do từ chối, số tiền).

**Đo**:
- **QPS và p95 của `unread-count`** — đây là đường nóng (§11); ngưỡng mong đợi p95 < 10ms nhờ partial index. Vượt ngưỡng = index sai hoặc bảng đã cần chính sách lưu trữ.
- Số thông báo tạo mỗi ngày, **tách theo `type`** — dùng để phát hiện type nào không bao giờ được sinh (đường sinh chưa có, §10.1) và type nào sinh quá nhiều.
- **Độ trễ đọc**: phân phối `readAt − createdAt`. Nếu p50 lớn hơn nhiều so với 60s thì badge không có tác dụng thúc đẩy hành động.
- **Tỉ lệ không bao giờ đọc**: số hàng `isRead = false` và `createdAt` cũ hơn 7 ngày. Cao = thông báo đang bị phớt lờ (vấn đề sản phẩm, không phải kỹ thuật).
- Kích thước bảng và tốc độ tăng (§11) — đầu vào cho quyết định retention ở §16.
- **Độ trễ giao hàng thực tế = thời gian ghi hàng + tối đa 60 giây polling.** Con số 60 giây này là hằng số của DEBT-002; mọi cam kết SLA về "báo ngay" đều sai cho tới khi có realtime.

## 15. Test matrix

Đây là **invariant gate**: mọi INV ở §4 phải có ít nhất một dòng ở đây. Thiếu một dòng = không merge.

| INV | Loại test | Mô tả |
|---|---|---|
| INV-NOTIF-01 | integration | Duyệt toàn bộ route đã đăng ký của app → assert không có route `DELETE /notifications*`. Chạy toàn bộ bộ test rồi assert `COUNT(Notification)` chỉ tăng, chưa từng giảm |
| INV-NOTIF-02 | DB thật | Snapshot hàng trước/sau `PATCH /:id/read` và `/read-all` → chỉ `isRead`, `readAt`, `updatedAt` đổi; `userId`/`type`/`referenceId`/`referenceType`/`payload`/`createdAt` giữ nguyên từng byte |
| INV-NOTIF-03 | integration | Không tồn tại endpoint/tham số nào đưa `isRead` về `false`: thử `PATCH /:id/read` với body `{isRead:false}` → body bị bỏ qua, DB vẫn `true` |
| INV-NOTIF-04 | DB thật | Đánh dấu đọc → `readAt` khác null và gần `now()`. Gọi lại sau 2 giây → 200, `readAt` **không đổi**. Assert ràng buộc CHECK: thử UPDATE thẳng DB `isRead=true, readAt=null` → vi phạm constraint |
| INV-NOTIF-05 | DB thật | Seed hộp thư cho user A và user B. Bằng token của A: `GET /notifications` → không phần tử nào có `userId` của B (đối chiếu trực tiếp trên DB); `PATCH /:idCủaB/read` → 404 **và** hàng của B trong DB **không đổi**; `PATCH /read-all` bằng token A → hàng của B vẫn `isRead=false`; `GET /unread-count` bằng token A ≠ tổng của cả hệ thống |
| INV-NOTIF-06 | DB thật | Với nhiều bộ dữ liệu (0 / 1 / 25 chưa đọc, lẫn đã đọc): `unreadCount` == `meta.total` của `?isRead=false` == `COUNT` chạy thẳng trên DB. Lặp lại **sau** mỗi thao tác đánh dấu đọc |
| INV-NOTIF-07 | DB thật (concurrency) | Seed 10 chưa đọc → gọi `read-all` → `updated=10`, `unreadCount=0`, mọi hàng `isRead=true`. Biến thể đua: trong lúc `read-all` chạy, tạo thêm 1 thông báo mới → assert thông báo mới **vẫn chưa đọc** và không có lỗi nào. Gọi `read-all` lần hai → `updated=0` |
| INV-NOTIF-08 | integration | Duyệt route đã đăng ký → không có `POST /notifications`. Thử `POST` → 404/405. Assert service tạo không được gắn vào controller nào |
| INV-NOTIF-09 | DB thật | Sau khi chạy toàn bộ bộ test tích hợp của mọi module: `SELECT DISTINCT type FROM "Notification"` ⊆ đúng 11 giá trị enum. Thử tạo với type tự chế qua service → bị enum của DB từ chối |
| INV-NOTIF-10 | DB thật | `SELECT DISTINCT "referenceType"` ⊆ `{assignment, attempt, invoice, session, NULL}`. Thông báo `account_approved` → `referenceType IS NULL` và response không gợi ý deep-link |
| INV-NOTIF-11 | DB thật | Register khi có 2 admin → **đúng 2** hàng, mỗi hàng một `userId` khác nhau, cùng `type`, cùng `referenceId`; không có hàng nào `userId IS NULL` |
| INV-NOTIF-12 | DB thật (concurrency) | Bắn 2 request approve song song cùng `:userId` → đúng **1** hàng `account_approved`. Gọi lại approve lần hai (tuần tự) → không sinh hàng thứ hai. Lặp cho reject session và tạo invoice |
| INV-NOTIF-13 | DB thật | Ép INSERT `Notification` thất bại (mock/constraint) trong luồng approve → assert `User.status` **vẫn là giá trị cũ** (rollback) và không có hàng notification mồ côi. Chiều ngược lại: ép UPDATE nghiệp vụ thất bại → không có thông báo nào được ghi |
| INV-NOTIF-14 | integration | Tạo hai thông báo cùng `type`/`referenceId` khác `payload` (một cái `payload=null`) → mọi hành vi endpoint (list, đếm, đánh dấu đọc, deep-link) giống hệt nhau; `payload=null` không gây lỗi ở bất kỳ đâu |
| INV-NOTIF-15 | integration | Serialize mọi `payload` trong DB sau bộ test → assert không chứa khoá `passwordHash`/`token`/`password` và không chứa chuỗi hash của seed |
| INV-NOTIF-16 | DB thật | Seed 25 hàng trong đó có nhiều hàng **cùng `createdAt`** → duyệt hết các trang, gom `id` → tập gom == tập seed, không trùng, không sót. Lặp với `limit=6` (kích thước dropdown chuông) |
| INV-NOTIF-17 | DB thật | Seed 42 hàng, `limit=20` → `total=42`, `totalPages=3`, `data.length=20`; trang 3 có 2 phần tử; khi bật `?isRead=false` thì `total` phản ánh tập đã lọc, không phải tổng hộp thư |
| INV-NOTIF-18 | integration | Mọi DateTime khớp regex ISO 8601 UTC (kết thúc `Z`); hàng chưa đọc → `readAt === null` (không phải chuỗi rỗng, không phải epoch 0) |

Bổ sung ngoài invariant gate: test envelope lỗi đúng shape phẳng của API_CONVENTIONS.md; test hộp thư rỗng → `data: []`, `total: 0`, `unreadCount: 0` (không phải 404, không phải null); test `limit` vượt trần → `VALIDATION_ERROR` chứ không im lặng cắt.

## 16. Chưa chốt

| Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|
| **⛔ Cả 4 endpoint chưa được định nghĩa ở bất kỳ tài liệu API nào** (§2). Chúng cũng không nằm trong danh sách 7 dòng "not yet defined" của API_ADMIN.md, tức là chưa từng được ghi nhận là còn thiếu | Chặn **toàn bộ** module: không có hợp đồng thì FE không nối được chuông ở header (`root-design-fe.md` §4.6) và dữ liệu do Auth/Users/Sessions/Billing sinh ra **không ai đọc được**. Đồng thời chặn cả link "Xem tất cả" — không có route notification nào trong `pages/_INDEX.md` | - | trước Sprint 2 (dữ liệu bắt đầu sinh từ Sprint 1) |
| **⛔ Không có mã lỗi `NOTIFICATION_*` nào** trong API_ERROR_CODES.md (§9) | Chặn nhánh 404 (chiếm phần lớn nhánh lỗi của module); test chỉ khoá được HTTP status, không khoá được `code`; FE không có nhánh xử lý riêng | - | cùng lúc với dòng trên |
| **DEBT-002 — thông báo là polling 60 giây, không realtime.** Trạng thái: *Won't Fix (Sprint 6 scope)*, severity Low. Không có WebSocket, không có SSE, không có push | (a) Độ trễ giao hàng tối đa 60s + jitter — mọi cam kết "báo ngay" đều sai; (b) `unread-count` trở thành truy vấn có tần suất cao nhất hệ thống (§11) và định hình toàn bộ chiến lược index; (c) badge có thể lệch tới 60s sau khi người dùng thao tác ở tab khác; (d) nếu Sprint 6 bật realtime thì §7 phải nâng lên outbox thật, §11 và §14 phải viết lại. **Không** thiết kế module như thể realtime sắp có | - | ghi nhận; xem lại ở Sprint 6 |
| **Văn bản thông báo nằm ở đâu?** ENTITY_NOTIFICATION.md **không có cột `message`/`title`**; `PROJECT_KNOWLEDGE.md` mục 15 lại có `message`, `data`, `recipientId`, `senderId` — hai mô hình khác nhau cho cùng một bảng | Chặn DTO §3 và toàn bộ hiển thị: hoặc FE tự dựng câu từ `type`+`payload` (khoá i18n ở FE, BE không đổi được câu chữ khi không deploy FE), hoặc thêm cột (migration + đổi mọi chỗ ghi). Cũng chặn câu hỏi `senderId` ngay dưới | - | trước khi code list |
| **Không có `senderId`** — không biết **ai** gây ra sự kiện | "Admin nào đã duyệt", "giáo viên nào đã nộp" không suy ra được. Muốn hiện tên người gây sự kiện thì buộc phải denormalize vào `payload` lúc tạo (§11), tức là quyết định này khoá luôn shape của `payload` cho nhiều type | - | cùng lúc với dòng trên |
| **`referenceType` không có giá trị `user`** (enum chỉ `assignment`/`attempt`/`invoice`/`session`) | Chặn deep-link của 4 type: `account_approved`, `account_suspended`, `new_teacher_registration`, `new_student_registration` — đúng những type mà admin cần bấm để nhảy sang `/admin/users/[id]`. Tạm để `null` (§10.1), tức là chuông của admin có mục không bấm được | - | trước khi code deep-link |
| **RBAC mâu thuẫn cho admin**: dòng "Notification · read own" nhưng ô Admin là ✅ (= own + others) | Chặn phát biểu INV-NOTIF-05. Spec đang chọn cách hẹp (admin chỉ đọc của mình); nếu chốt cách rộng thì phải thêm endpoint nhận `userId`, thêm test rò rỉ, và §13 phải viết lại | - | trước khi code |
| **Fan-out cho admin: gửi cho tất cả admin hay một admin?** Áp cho `new_teacher_registration`, `new_student_registration`, `session_submitted_for_review` | Chặn §10.1: với 3 admin thì mỗi lượt đăng ký sinh 3 hàng và **cả 3 người cùng thấy cùng một việc cần làm** — không có cơ chế "đã có người xử lý" nên 2 người sẽ bấm duyệt và 1 người nhận 409 (spec 02 §8). Chặn cả ước lượng kích thước bảng | - | trước khi code register |
| **Không có chính sách giữ dữ liệu / lưu trữ.** Append-only, không xoá, không hết hạn (§6) | Bảng tăng vô hạn; trang "Xem tất cả" phân trang trên tập tăng mãi; chưa biết khi nào cần phân vùng hoặc bảng lưu trữ | - | trước go-live |
| **Danh sách type được phép chống trùng bằng UNIQUE** (§8) — `deadline_reminder` và `graded` có thể lặp hợp lệ, các type khác thì không | Chặn migration của unique một phần; không có nó thì INV-NOTIF-12 chỉ được bảo đảm gián tiếp bởi guarded UPDATE của module gọi | - | trước migration |
| **Shape response của `read-all` và `unread-count`** (`{updated}` / `{unreadCount}`), và có nên **bỏ hẳn** `unread-count` để lấy `meta.total` từ list (§11) | Chặn hợp đồng FE; ảnh hưởng trực tiếp số request/phút/người của polling | - | trước khi code |
| **`PATCH /:id/read` trả 200 kèm bản ghi hay 204?** | Chặn DTO §3; 204 làm FE mất `readAt` và phải gọi lại list | - | trước khi code |
| **Ai sở hữu scheduler cho `deadline_reminder`?** Không tài liệu nào định nghĩa cron, cách lọc "student chưa nộp", hay cách chống gửi trùng khi job chạy lại | Chặn 1/11 type; cũng là type duy nhất không do hành động người dùng sinh ra ⇒ cần hạ tầng khác hẳn (job runner, khoá chống chạy song song) | - | trước Sprint 4 |
| **6/11 type chưa có đường sinh** (§10.1: `new_assignment`, `deadline_reminder`, `graded`, `session_submitted_for_review` + phụ thuộc của `new_invoice`) | Hộp thư của **student** gần như trống ở giai đoạn đầu; nếu FE thiết kế dropdown giả định có đủ loại thông báo thì sẽ phải làm lại empty state | - | trước khi thiết kế UI chuông |
| **`payload` của `new_invoice` và `account_suspended` chứa gì?** (số tiền/hạn nộp; lý do khoá — FE bắt nhập nhưng `User` không có cột lưu, spec 02 §16) | Chặn §10.1 và INV-NOTIF-15 (đưa số tiền vào `payload` là đưa dữ liệu tài chính vào jsonb không mã hoá) | - | trước khi code Billing/suspend |
| **Rate limit cho nhóm endpoint polling** và mã lỗi 429 | Chặn §13; hiện không giới hạn, một client lỗi có thể lặp vô hạn `unread-count` | - | trước go-live |

*(C1 chạm module này gián tiếp: nếu chốt đổi `nickname → fullName` thì `payload` nào có denormalize tên người dùng phải đổi theo. C2/C3/C4 không chạm.)*
