---
module: Auth
status: accepted
blocked_by: - (không quyết định nghiệp vụ nào chặn phần lõi; các điểm hở ghi ở §16 — C1 chặn tên field DTO, không chặn luồng)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module sở hữu **danh tính và phiên đăng nhập**: tạo tài khoản (`status=pending`), xác thực mật khẩu, phát/xoay/thu hồi token, và cho phép chủ tài khoản tự đọc – tự sửa hồ sơ của chính mình. Ranh giới: module này **không đổi `User.status`** (approve/suspend/activate thuộc module Users, `PATCH /admin/users/:id/*`) và **không đọc/ghi dữ liệu của user khác** — mọi endpoint chỉ tác động lên `req.user.id`, không endpoint nào nhận `:id`. Ba thứ module này độc quyền sở hữu: `User.passwordHash`, bảng `RefreshToken`, và cookie `refresh_token`. Không module nào khác được chạm vào ba thứ đó.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `User` | Đọc + Ghi | INSERT khi register (luôn `status=pending`). UPDATE: `lastLoginAt` (login), `passwordHash` (change-password), `nickname`/`email`/`avatarUrl` (PATCH /me). **Không bao giờ ghi `role`, `status`**. Đọc `passwordHash` chỉ trong hàm xác thực, không bao giờ đưa ra khỏi service |
| `RefreshToken` | Đọc + Ghi | INSERT khi login + mỗi lần rotate; UPDATE `revokedAt` khi rotate/logout/đổi mật khẩu/phát hiện replay. ⚠️ **Bảng này không có file `ENTITY_*.md`** trong `docs/entities/postgres/` và không có trong `_FACTS.md`; định nghĩa duy nhất tìm được là `PROJECT_KNOWLEDGE.md` mục 16 (`id · userId · tokenHash unique · expiresAt · revokedAt`). Các field mà §6/§8 cần (`familyId`, `replacedById`, lý do thu hồi) **chưa tồn tại** → §12 + §16 |
| `Notification` | Ghi (INSERT) | Chỉ 2 type: `new_teacher_registration`, `new_student_registration`, gửi cho admin. Append-only. Không đọc |
| *(bộ đếm rate limit)* | Đọc + Ghi | **Không có bảng** trong tài liệu. Không dùng bảng Postgres cho đếm login fail (ghi nóng, không cần bền vững) — đề xuất Redis/in-memory store của `@nestjs/throttler`. Là hạ tầng chưa được chốt → §16 |
| Supabase Storage | Ghi (ngoài DB) | Upload avatar cho `PATCH /auth/me`. Nằm **ngoài mọi transaction** (§7) |

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | public | Tạo tài khoản mới, luôn ở `pending`, chờ admin duyệt | defined (API_AUTH.md) |
| POST | `/api/v1/auth/login` | public | Đổi email+mật khẩu lấy access token + cookie `refresh_token` | defined |
| POST | `/api/v1/auth/refresh` | public *(xác thực bằng cookie)* | Xoay refresh token, phát access token mới | defined |
| POST | `/api/v1/auth/logout` | authenticated (mọi role) | Thu hồi refresh token của phiên hiện tại, xoá cookie | defined |
| GET | `/api/v1/auth/me` | authenticated (mọi role) | Hồ sơ của chính người đang đăng nhập | defined |
| PATCH | `/api/v1/auth/me` | authenticated (mọi role) | Tự sửa hồ sơ của chính mình | defined |
| POST | `/api/v1/auth/change-password` | authenticated (mọi role) | Đổi mật khẩu, cần mật khẩu hiện tại | defined |

Không có: `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `GET /auth/sessions`. **Không tồn tại đường khôi phục mật khẩu** trong toàn bộ tài liệu API → §16. `/auth/refresh` là endpoint public duy nhất được xác thực bằng cookie thay vì header — đó là lý do §13 phải nói về CSRF.

## 3. DTO

### Request

**POST /auth/register**

| Field | Kiểu | Bắt buộc | Ràng buộc validate |
|---|---|---|---|
| `email` | string | có | Định dạng email, ≤ 255 ký tự, **chuẩn hoá `trim` + lowercase trước khi lưu và trước khi so trùng** (⚠️ ENTITY_USER chỉ nói "unique", không nói phân biệt hoa/thường → §16) |
| `password` | string | có | ≥ 8 ký tự (API_AUTH). ⚠️ API_ERROR_CODES.md và FE profile spec còn yêu cầu "có chữ hoa và số" — **hai nguồn, hai luật** → §16. Không bao giờ log, không bao giờ echo lại trong `details` |
| `fullName` | string | có | ⚠️ **C1** — field entity tên là `nickname`. Tên trong body theo API_AUTH.md là `fullName`. Không tự đổi, xem §16. Ràng buộc: trim, 1–100 ký tự (khớp `varchar(100)` của `nickname`) |
| `role` | enum string | có | ∈ `student` \| `teacher`. **`admin` không phải giá trị hợp lệ** — không có đường tự đăng ký làm admin (INV-AUTH-03) |

Không nhận `status`, `hskLevelGoal`, `bio`, `avatarUrl`, `id` trong body register — thừa field phải bị loại bỏ (whitelist), không im lặng bỏ qua rồi lưu.

**POST /auth/login** — `email` (string, có, chuẩn hoá như trên), `password` (string, có). Không validate độ dài mật khẩu ở login (validate độ dài ở đây làm lộ chính sách và tạo thêm một nhánh phân biệt) — sai định dạng email vẫn phải cho ra cùng kết quả với sai mật khẩu (§13).

**POST /auth/refresh** — **không có body**. Đầu vào duy nhất: cookie `refresh_token`. Không chấp nhận refresh token trong body hay header (nếu chấp nhận thì cookie httpOnly mất tác dụng bảo vệ).

**POST /auth/logout** — không body. `Authorization: Bearer <access_token>` + cookie `refresh_token`.

**GET /auth/me** — không tham số.

**PATCH /auth/me** — tất cả field optional, nhưng body rỗng `{}` → `VALIDATION_ERROR` (không cho phép PATCH rỗng làm `updatedAt` nhảy vô nghĩa):

| Field | Kiểu | Bắt buộc | Ràng buộc validate |
|---|---|---|---|
| `fullName` | string | không | ⚠️ C1 như trên; trim, 1–100 |
| `email` | string | không | Định dạng email, ≤255, chuẩn hoá; trùng email người khác → `AUTH_EMAIL_EXISTS` |
| `avatarUrl` | string | không | URL hợp lệ, https, trỏ tới Supabase Storage. `null` = xoá avatar (FE có nút `Xóa ảnh`) — ⚠️ API_AUTH không nói `null` có được chấp nhận không → §16 |

**Không có** `hskLevelGoal`, `bio`, `role`, `status` trong body → hệ quả: `hskLevelGoal` (mục tiêu HSK của học sinh) và `bio` (giới thiệu giáo viên) **không có bất kỳ endpoint nào ghi được**, dù cả hai là field của `User` và hiển thị ở màn chi tiết. Ghi nhận, không tự thêm field → §16.

**POST /auth/change-password** — `currentPassword` (string, có), `newPassword` (string, có, cùng chính sách với `password` ở register, và **phải khác** `currentPassword`). FE có ô thứ ba `Xác nhận mật khẩu mới` — đó là ràng buộc FE, **không** gửi lên API.

### Response

**POST /auth/register** → `201`

```
{ "data": { "message": "Registration successful. Awaiting admin approval." } }
```

Không trả `id`, không trả token, không trả bất kỳ field nào của user vừa tạo. (Trả `id` là rò rỉ không cần thiết; trả token là sai — tài khoản đang `pending`.)

**POST /auth/login** → `200`, kèm header `Set-Cookie: refresh_token=<...>; HttpOnly; ...` (thuộc tính cookie ở §13)

```
{ "data": { "accessToken": "<jwt>",
            "user": { "id": "...", "email": "...", "role": "student", "status": "active" } } }
```

`user` ở đây **đúng 4 field** theo API_AUTH.md — không nhồi thêm `nickname`/`avatarUrl`; FE muốn thêm thì gọi `GET /auth/me`. Không có `refreshToken` trong body (INV-AUTH-09). Không có `expiresIn` (không được định nghĩa; FE biết 15 phút từ tài liệu, hoặc đọc `exp` trong JWT).

**POST /auth/refresh** → `200` + `Set-Cookie` mới (token đã xoay)

```
{ "data": { "accessToken": "<jwt>" } }
```

**POST /auth/logout** → `204`, kèm `Set-Cookie` xoá cookie (`Max-Age=0`, cùng `Path`/`Domain` với lúc set — sai `Path` là cookie không bị xoá).

**GET /auth/me** · **PATCH /auth/me** → `200` — `{ "data": UserProfile }`

`UserProfile`:

| Field | Kiểu | Nullable | Ghi chú |
|---|---|---|---|
| `id` | uuid | no | |
| `email` | string | no | |
| `role` | `admin`\|`teacher`\|`student` | no | |
| `status` | `pending`\|`active`\|`suspended` | no | |
| `nickname` | string | yes | ⚠️ C1 — nếu chốt theo API_AUTH thì key này phải là `fullName` ở cả request lẫn response |
| `avatarUrl` | string | yes | |
| `hskLevelGoal` | int | yes | Chỉ có nghĩa với `student`. ⚠️ C4: ENTITY_USER ghi 1–9, GLOSSARY/DATABASE_SCHEMA ghi 1–6 (DOC-004) — module này chỉ đọc, không validate |
| `bio` | text | yes | Chỉ có nghĩa với `teacher` |
| `lastLoginAt` | DateTime UTC ISO 8601 | yes | `null` khi chưa từng đăng nhập thành công |
| `createdAt` | DateTime UTC ISO 8601 | no | |
| `updatedAt` | DateTime UTC ISO 8601 | no | |

`passwordHash` **không xuất hiện** trong bất kỳ response nào, kể cả nhánh lỗi và kể cả `details`.

**POST /auth/change-password** → `204`, không body. Không trả token mới (INV-AUTH-17 thu hồi hết token cũ ⇒ FE phải cho đăng nhập lại; ⚠️ hệ quả UX này chưa được tài liệu nào mô tả → §16).

## 4. Rule nghiệp vụ (invariant)

| ID | Phát biểu |
|---|---|
| **INV-AUTH-01** | `passwordHash` không bao giờ rời khỏi tầng service: không có trong response nào, không có trong log nào, không có trong `details` của lỗi nào, không có trong claim của JWT nào. |
| **INV-AUTH-02** | Mật khẩu chỉ được lưu dưới dạng bcrypt **cost 12**; mật khẩu thô không bao giờ được ghi xuống đĩa, ghi log hay gửi đi nơi khác; so khớp chỉ qua hàm so sánh của bcrypt, không tự so chuỗi. |
| **INV-AUTH-03** | Mọi user tạo bởi `POST /auth/register` luôn có `status = pending` và `role ∈ {student, teacher}`; không tồn tại giá trị body nào khiến register cho ra `status = active` hoặc `role = admin`. |
| **INV-AUTH-04** | `email` là duy nhất toàn hệ thống sau chuẩn hoá (trim + lowercase): hai request register cùng email — kể cả đồng thời, kể cả khác kiểu hoa/thường — cho ra **đúng một** hàng `User`; request thua nhận `409 AUTH_EMAIL_EXISTS`. |
| **INV-AUTH-05** | Login chỉ phát token khi `status = active`. `pending` → `403 AUTH_ACCOUNT_PENDING`, `suspended` → `403 AUTH_ACCOUNT_SUSPENDED`; cả hai nhánh **không** phát access token, **không** set cookie, **không** ghi `RefreshToken`, **không** đụng `lastLoginAt`. |
| **INV-AUTH-06** | Email không tồn tại và mật khẩu sai cho ra **cùng một phản hồi**: cùng HTTP 401, cùng `code = AUTH_INVALID_CREDENTIALS`, cùng `message`, cùng shape (không `details`), và thời gian phản hồi cùng phân phối (không có nhánh nào trả về sớm hơn vì bỏ qua bcrypt). |
| **INV-AUTH-07** | `AUTH_ACCOUNT_PENDING` / `AUTH_ACCOUNT_SUSPENDED` chỉ được trả **sau khi mật khẩu đã đúng**. Mật khẩu sai trên tài khoản `pending`/`suspended` vẫn trả `AUTH_INVALID_CREDENTIALS`. (Trạng thái tài khoản là thông tin chỉ chủ tài khoản mới được biết.) |
| **INV-AUTH-08** | Access token có hạn đúng **15 phút**, refresh token đúng **7 ngày**, tính từ lúc phát; token quá hạn bị từ chối ở mọi endpoint (`AUTH_TOKEN_EXPIRED`), không có gia hạn ngầm cho access token. |
| **INV-AUTH-09** | Refresh token chỉ đi qua cookie `refresh_token` với cờ `HttpOnly`: không nằm trong body response, không nằm trong header response nào khác, không đọc được bằng JavaScript, và không được chấp nhận nếu client gửi nó qua body/header. |
| **INV-AUTH-10** | Mỗi lần `/auth/refresh` thành công là một lần **xoay**: token vừa dùng bị đánh dấu thu hồi trong cùng transaction với việc phát token mới. Ngoài cửa sổ ân hạn (§8), mỗi family có **tối đa một** token còn dùng được. |
| **INV-AUTH-11** | Trình lại một refresh token đã bị thu hồi/đã xoay (ngoài cửa sổ ân hạn) là **REPLAY**: hệ thống thu hồi **toàn bộ family** của token đó, không phát token mới, trả `401 AUTH_REFRESH_INVALID`. Việc thu hồi family **được commit** dù request kết thúc bằng lỗi. |
| **INV-AUTH-12** | Sau khi một family bị thu hồi, không token nào thuộc family đó còn dùng được — kể cả token mới nhất, kể cả token chưa hết hạn. Đường duy nhất để tiếp tục là đăng nhập lại. |
| **INV-AUTH-13** | Refresh token chỉ được lưu dưới dạng băm (`tokenHash`, UNIQUE); giá trị thô không tồn tại trong DB, trong log hay trong bản backup. Đọc trộm DB không thu được token dùng được. |
| **INV-AUTH-14** | `lastLoginAt` được cập nhật **sau khi phát token thành công** ở `/auth/login` và chỉ ở đó: login thất bại (mọi nhánh lỗi), `/auth/refresh`, `/auth/logout` **không** làm nó đổi. |
| **INV-AUTH-15** | Trạng thái tài khoản được kiểm **theo từng request** trên dữ liệu DB, không chỉ tin vào claim trong JWT: user bị `suspended` sau khi đã có access token còn hạn vẫn bị từ chối ở mọi endpoint được bảo vệ, và refresh token của họ không xoay được nữa. |
| **INV-AUTH-16** | `/auth/logout` thu hồi refresh token của phiên hiện tại và xoá cookie; gọi lại lần hai (không cookie, hoặc cookie đã thu hồi) vẫn trả `204`, không lỗi, không side effect mới. Logout **không** làm access token đang cầm biến mất — nó sống tối đa hết 15 phút của nó (giới hạn đã biết của JWT không trạng thái). |
| **INV-AUTH-17** | `POST /auth/change-password` chỉ thành công khi `currentPassword` đúng; khi thành công, **toàn bộ** refresh token của user (mọi family, mọi thiết bị) bị thu hồi trong cùng transaction với việc ghi `passwordHash` mới. |
| **INV-AUTH-18** | Việc ghi `passwordHash` mới và việc thu hồi token là **nguyên tử**: không tồn tại trạng thái "đã đổi mật khẩu nhưng token cũ vẫn xoay được", cũng không tồn tại "đã thu hồi token nhưng mật khẩu chưa đổi". |
| **INV-AUTH-19** | `PATCH /auth/me` chỉ ghi lên hàng `User` có `id = req.user.id`, và chỉ ghi được `nickname`(⚠️C1)/`email`/`avatarUrl` + `updatedAt`. `id`, `role`, `status`, `passwordHash`, `createdAt`, `lastLoginAt` bất biến qua endpoint này. |
| **INV-AUTH-20** | Đổi email qua `PATCH /auth/me` vẫn giữ nguyên tính duy nhất của `email` (trùng → `409 AUTH_EMAIL_EXISTS`, không ghi gì) và **không** đổi `status` — đổi email không đưa tài khoản active về `pending`. |
| **INV-AUTH-21** | Quá **5 lần login thất bại trong 15 phút** cho cùng một khoá đếm thì các lần tiếp theo bị chặn bằng HTTP 429 mà **không** thực hiện so khớp mật khẩu; hành vi chặn giống hệt nhau với email tồn tại và email không tồn tại (không được dùng 429 để dò tài khoản). Login **thành công** không bị chặn bởi bộ đếm của lần thất bại trước đó khi chưa chạm ngưỡng. |
| **INV-AUTH-22** | Hai request `/auth/refresh` đồng thời mang **cùng một** refresh token hợp lệ (hai tab của cùng trình duyệt) **không phải** replay: đúng một lần xoay xảy ra, cả hai request nhận access token dùng được, family **không** bị thu hồi, và giá trị cookie cuối cùng ở trình duyệt là token còn dùng được. |
| **INV-AUTH-23** | Mọi response lỗi của module theo đúng envelope phẳng của API_CONVENTIONS.md (`statusCode`/`error`/`code`/`message`/`timestamp`/`path`, không cờ `success`, không object `error` lồng); `details` **chỉ** xuất hiện ở `VALIDATION_ERROR`. |
| **INV-AUTH-24** | Mọi field DateTime trả ra là UTC ISO 8601; `lastLoginAt = null` (không phải chuỗi rỗng, không phải epoch 0) khi user chưa từng đăng nhập thành công. |

## 5. Ownership / RBAC

RBAC_MATRIX.md: `User · read own profile` = ✅ Admin / 🔒 Teacher / 🔒 Student; `User · update own profile` = ✅ Admin / 🔒 Teacher / 🔒 Student. Module này **không có endpoint nào bị giới hạn theo role** — mọi role đăng nhập được đều gọi được cả 7 endpoint. Vì vậy `AUTH_INSUFFICIENT_ROLE` không xuất hiện ở §9.

Quyền sở hữu ở đây là **cấu trúc, không phải kiểm tra**: không endpoint nào nhận `:id` hay `userId` trong body/query, nên không tồn tại đường để trỏ vào hàng của người khác. Đây là lựa chọn có chủ đích — thêm `?userId=` vào `/auth/me` sẽ biến một invariant cấu trúc thành một invariant phải test.

Kiểm hai tầng (không chỉ dựa vào guard):

| Tầng | Điều kiện | Sai thì |
|---|---|---|
| Guard | Có `Authorization: Bearer`, chữ ký JWT hợp lệ, chưa quá `exp` | `401 AUTH_TOKEN_INVALID` / `401 AUTH_TOKEN_EXPIRED` |
| Guard/Service (bắt buộc) | Đọc lại `User` theo `sub` của token: hàng còn tồn tại | `401 AUTH_TOKEN_INVALID` (user đã bị xoá — hiện chưa có đường xoá user) |
| Service (bắt buộc, không bỏ) | `user.status === 'active'` — **đọc từ DB, không đọc từ claim** | `403 AUTH_ACCOUNT_SUSPENDED` (⚠️ 401 hay 403: xem §16) |
| Service | Mọi truy vấn dùng `id = req.user.id`, không nhận id từ input | — (không có nhánh sai) |

**Vì sao phải đọc `status` từ DB mỗi request**: access token sống 15 phút. Nếu chỉ tin `status` trong claim, một tài khoản bị admin `suspend` vẫn thao tác bình thường tới 15 phút — với vai trò teacher/admin thì 15 phút đó đủ để duyệt buổi học, ghi nhận thanh toán, hoặc đổi email tài khoản để giữ quyền truy cập. Đây là ranh giới bảo mật, không phải tối ưu hiệu năng ⇒ chấp nhận một truy vấn `User` theo primary key mỗi request (có thể cache ngắn hạn nhưng phải chốt TTL — §16).

## 6. State machine

Hai máy trạng thái, thuộc hai chủ sở hữu khác nhau. Module Auth **đọc** cái thứ nhất và **sở hữu** cái thứ hai.

### 6.1 `User.status` — module Users sở hữu, Auth chỉ là cổng kiểm

```
   register (Auth)          approve (Users)          suspend (Users)
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐             ┌────────┐               ┌───────────┐
   │ pending │ ──────────► │ active │ ────────────► │ suspended │
   └─────────┘             └────────┘ ◄──────────── └───────────┘
        │                             activate (Users)
        │
   login → 403 AUTH_ACCOUNT_PENDING          login → 403 AUTH_ACCOUNT_SUSPENDED
   (không token, không cookie)               (không token; token cũ cũng bị từ chối — INV-AUTH-15)
```

Auth chỉ ghi trạng thái đầu tiên (`pending` lúc register) và **không có đường nào** đổi trạng thái sau đó.

### 6.2 `RefreshToken` — rotation + family, module Auth sở hữu

Một lần `login` thành công tạo một **family** (một phiên đăng nhập trên một trình duyệt/thiết bị) và token đầu tiên của family đó. Mỗi lần `/auth/refresh` thành công nối thêm một mắt xích.

```
login OK
   │  tạo familyId = f, phát RT1
   ▼
 RT1 ──refresh OK──► RT2 ──refresh OK──► RT3 ──refresh OK──► RT4 (active)
  │                   │                   │                   │
  ▼                   ▼                   ▼                   │
rotated             rotated             rotated               └── là token duy nhất
(revokedAt=t1,      (revokedAt=t2,      (revokedAt=t3,            còn dùng được của f
 replacedBy=RT2)     replacedBy=RT3)     replacedBy=RT4)          (ngoài cửa sổ ân hạn)
```

Trạng thái của **một token**:

```
  active ──(dùng ở /auth/refresh, hợp lệ)────────► rotated                [kết thúc]
  active ──(POST /auth/logout)───────────────────► revoked:logout         [kết thúc]
  active ──(POST /auth/change-password)──────────► revoked:password_change[kết thúc]
  active ──(qua expiresAt, không cần ghi DB)─────► expired                [kết thúc]
  active ──(family bị thu hồi vì replay)─────────► revoked:replay         [kết thúc]

  rotated | revoked:* ──(bị trình ra lần nữa ở /auth/refresh)──► ┌──────────────────┐
                                                                 │ REPLAY DETECTED  │
                                                                 └──────────────────┘
```

Cổng REPLAY — đây là phần bắt buộc phải đúng:

```
  Trình ra RT2 (đã rotated lúc t2), hiện tại là T
        │
        ├─ family f đã bị thu hồi?            ──► CÓ  ─► 401 AUTH_REFRESH_INVALID (không thu hồi lại, không báo động lần hai)
        │
        ├─ (T − t2) ≤ G (cửa sổ ân hạn) VÀ
        │  token con của RT2 (RT3) vẫn đang active?  ──► CÓ  ─► ĐUA HỢP LỆ, không phải replay (§8)
        │                                                        trả lại đúng access token/cookie của lần xoay đó
        │
        └─ ngược lại                          ──────────► REPLAY
                                                            │
                                                            ├─ thu hồi TOÀN BỘ family f
                                                            │   (RT1..RTn, mọi trạng thái, lý do = replay)
                                                            ├─ COMMIT phần thu hồi (§7)
                                                            ├─ ghi log mức cảnh báo + metric (§14)
                                                            └─ 401 AUTH_REFRESH_INVALID
```

| Từ | Đến | Hành động | Hợp lệ? |
|---|---|---|---|
| `active` | `rotated` | `/auth/refresh` | ✅ đồng thời phát token con |
| `active` | `revoked:logout` | `/auth/logout` | ✅ |
| `active` | `revoked:password_change` | đổi mật khẩu | ✅ áp cho **mọi** family của user |
| `active` | `revoked:replay` | phát hiện replay ở family | ✅ áp cho **mọi** token của family đó |
| `rotated` | `active` | — | ❌ không có đường quay lại |
| `revoked:*` | bất kỳ trạng thái dùng được | — | ❌ **cổng một chiều**; thu hồi là vĩnh viễn |
| `expired` | bất kỳ | — | ❌ hết hạn không cứu được, kể cả trong cửa sổ ân hạn |

**Cổng một chiều**: thu hồi không đảo ngược được. Hệ quả nghiệp vụ trực tiếp: một lần phát hiện replay là **đăng xuất toàn bộ phiên đó**, và người dùng thật (nếu là dương tính giả) bị buộc đăng nhập lại. Vì vậy §8 phải phân biệt cho đúng "đua hợp lệ" với "replay" — dương tính giả ở đây không phải phiền toái nhỏ, nó là đăng xuất cưỡng bức giữa lúc đang làm việc.

**Phạm vi thu hồi khi replay**: thu hồi **family**, không thu hồi mọi family của user. Lý do: kẻ tấn công chỉ cầm được token của một phiên (một lần trộm cookie); thu hồi hết mọi thiết bị của user vì một phiên bị lộ là hình phạt quá rộng và biến mọi lỗi mạng thành sự cố toàn tài khoản. Nếu chính sách muốn "một replay = đăng xuất mọi thiết bị" thì phải chốt riêng — §16.

## 7. Transaction boundary

Mức isolation mặc định `READ COMMITTED` là đủ cho mọi luồng; tính đúng đắn dựa vào **UNIQUE constraint** và **guarded UPDATE có kiểm `rowCount`**, không dựa vào `SERIALIZABLE`.

| Luồng | Trong CÙNG một transaction | Bắt buộc nằm NGOÀI transaction |
|---|---|---|
| `register` | (1) INSERT `User` (`status=pending`) → (2) INSERT `Notification` `new_teacher_registration`/`new_student_registration` cho **mọi** admin, bằng **một câu bulk insert**, không vòng lặp | Không có (không gửi mail/push ở phạm vi hiện tại) |
| `login` | (1) INSERT `RefreshToken` (family mới) → (2) UPDATE `User.lastLoginAt` | Ký JWT (thuần CPU, làm trước khi mở transaction), set cookie (sau commit) |
| `refresh` — nhánh thành công | (1) guarded UPDATE thu hồi token cũ (`... WHERE tokenHash=:h AND revokedAt IS NULL`) → kiểm `rowCount=1` → (2) INSERT token con cùng `familyId` | Ký access token mới, ghi cookie (sau commit) |
| `refresh` — nhánh REPLAY | Transaction **riêng**, chỉ chứa: UPDATE thu hồi toàn bộ family | Ném lỗi 401 **sau khi transaction thu hồi đã commit** |
| `logout` | Một câu UPDATE duy nhất (không cần transaction tường minh) | Xoá cookie (sau khi UPDATE trả về) |
| `change-password` | (1) UPDATE `User.passwordHash` → (2) UPDATE thu hồi **mọi** `RefreshToken` của user | Băm bcrypt mật khẩu mới (**~250ms ở cost 12** — phải làm **trước** khi mở transaction, không giữ transaction mở suốt thời gian băm) |
| `PATCH /auth/me` | Một câu UPDATE duy nhất; tính duy nhất của email do UNIQUE constraint đảm bảo | Upload/xoá file avatar trên Supabase Storage — **không thể rollback**, phải xử lý như side effect ngoài (§10) |

**Cái bẫy quan trọng nhất của module này**: ở nhánh REPLAY, nếu việc thu hồi family nằm chung transaction với luồng xử lý rồi ném lỗi 401, thì **transaction bị rollback và family không hề bị thu hồi** — hệ thống báo lỗi cho kẻ tấn công nhưng token vẫn sống, tức là phòng thủ trông như có mà thực tế không có. Bắt buộc: mở transaction riêng cho việc thu hồi, commit, rồi mới ném lỗi (INV-AUTH-11).

Cái bẫy thứ hai: bcrypt cost 12 mất khoảng 200–300ms. Băm **bên trong** một transaction đang mở (khi register hoặc đổi mật khẩu) sẽ giữ kết nối và khoá hàng suốt thời gian đó; dưới tải cao là cạn pool kết nối. Băm trước, mở transaction sau.

## 8. Idempotency & concurrency

**`register`** — không idempotent theo thiết kế; hàng rào duy nhất là `UNIQUE(email)` ở DB (chuẩn hoá lowercase trước khi ghi, hoặc unique index trên `lower(email)`). Hai request cùng email chạy song song: một cái INSERT thắng, cái kia dính vi phạm unique. **Bắt buộc bắt lỗi P2002 ngay trong AuthService và ném lại `AUTH_EMAIL_EXISTS`** — không được để nó rơi xuống global exception filter, vì filter đó ánh xạ P2002 thành **DUPLICATE_ENTRY**, một mã **không có trong API_ERROR_CODES.md** (§9, §16). Cấm mẫu "SELECT xem email tồn tại chưa → INSERT" nếu không có unique constraint đỡ phía sau: hai request có thể cùng vượt qua bước SELECT.

**`login`** — hai login song song của cùng user là hợp lệ và tạo **hai family độc lập** (hai thiết bị). Không có khoá, không có giới hạn số phiên (⚠️ không giới hạn số phiên đồng thời → §16). `lastLoginAt` ghi đè theo thứ tự commit — lệch vài mili giây là chấp nhận được.

**`logout`** — idempotent: guarded UPDATE `... SET revokedAt = now() WHERE tokenHash = :h AND revokedAt IS NULL`; `rowCount = 0` (không có cookie, token lạ, token đã thu hồi) vẫn trả `204`. Không bao giờ trả lỗi ở logout — lỗi ở đây chỉ làm FE kẹt lại ở trạng thái "đã đăng xuất một nửa".

**`change-password`** — hai request song song với cùng `currentPassword` đúng: cả hai đều hợp lệ về mặt nghiệp vụ, kết quả cuối là một trong hai mật khẩu mới. Nếu muốn "cái thứ hai phải thất bại" thì phải khoá hàng `User FOR UPDATE` rồi so lại `currentPassword` **bên trong** khoá. Đề xuất: khoá hàng, vì thế mạnh hơn và chi phí bằng không ở lưu lượng thực tế.

**`/auth/refresh`** — phần khó nhất của module.

*Vì sao đây là đua hợp lệ chứ không phải tấn công*: cookie thuộc về trình duyệt, không thuộc về tab. Hai tab của cùng một người dùng cùng thấy access token hết hạn tại thời điểm gần nhau (rất phổ biến: một tab để mở, một tab đang thao tác; hoặc trang có nhiều request song song cùng nhận 401 rồi cùng gọi refresh). Cả hai gửi **đúng cùng một** giá trị `refresh_token`. Với cài đặt rotation ngây thơ: tab A xoay RT2→RT3, tab B đến sau thấy RT2 đã `rotated` ⇒ kết luận REPLAY ⇒ thu hồi cả family ⇒ **người dùng thật bị đăng xuất giữa chừng**, mà nguyên nhân là hai tab, không phải kẻ trộm. Rotation không có xử lý đua sẽ tạo ra đăng xuất ngẫu nhiên và không tái hiện được — đúng loại lỗi tốn nhiều thời gian nhất để truy.

*Nguyên thuỷ chống hai token con*: mọi cài đặt phải bắt đầu bằng **guarded UPDATE** chứ không phải "SELECT rồi UPDATE":

```
UPDATE "RefreshToken" SET "revokedAt" = now(), reason = 'rotated'
WHERE "tokenHash" = :h AND "revokedAt" IS NULL
```

`rowCount = 1` ⇒ mình là người xoay ⇒ INSERT token con. `rowCount = 0` ⇒ ai đó đã xoay/thu hồi trước ⇒ **chưa kết luận replay vội**, đi tiếp vào cây quyết định ở §6.2. Điều này đảm bảo dù bao nhiêu request đến cùng lúc, chỉ một token con được sinh ra.

*Hai cách xử lý đua, phải chọn một (đề xuất: cách A)*:

| | **A. Ân hạn + trả lại kết quả cũ** (đề xuất) | **B. Ân hạn + cho phát token anh em** |
|---|---|---|
| Cách làm | Khi xoay xong, lưu **kết quả của lần xoay** (access token vừa ký + giá trị refresh token con thô) vào cache ngoài DB, khoá theo `tokenHash` của token cha, TTL = G. Request đến sau trong cửa sổ G nhận **đúng bản sao** kết quả đó | Token cha đã `rotated` nhưng còn trong G thì được phép sinh thêm một token con nữa trong cùng family; family tạm thời có 2 lá |
| Kết quả cho 2 tab | Hai response **giống hệt nhau**; cookie ghi hai lần cùng một giá trị ⇒ không có chuyện tab này ghi đè token của tab kia | Hai response khác nhau; tab ghi sau đè cookie của tab ghi trước ⇒ token của tab kia thành mồ côi (vẫn active nhưng không ai cầm) |
| Giữ được INV-AUTH-10 | Có, chặt: mỗi lần xoay đúng một token con | Yếu đi: trong G có thể tồn tại 2 token dùng được |
| Chi phí | Cần một cache ngoài DB (Redis) hoặc cột lưu tạm; **lưu token thô trong TTL ngắn** — đổi lấy đúng đắn bằng một chỗ lưu nhạy cảm có hạn dùng | Không cần hạ tầng mới |
| Rủi ro còn lại | Cache mất (restart Redis) ⇒ rơi về nhánh replay ⇒ đăng xuất; chấp nhận được nếu cache có sẵn | Cửa sổ để kẻ trộm dùng token cha bị nới rộng đúng bằng G |

Cách thứ ba, có thể **kết hợp với A**: **single-flight** — request thứ hai lấy advisory lock theo `familyId`, chờ request thứ nhất commit, rồi đọc kết quả từ cache. Bỏ được nhánh "đọc cache trượt" nhưng thêm độ trễ chờ.

*Điều kiện phân biệt (chuẩn để cài đặt và để test)* — coi là **đua hợp lệ** khi **và chỉ khi** cả bốn điều sau cùng đúng: (1) token trình ra tồn tại, (2) trạng thái là `rotated` (không phải `revoked:logout`/`revoked:password_change`/`revoked:replay`), (3) `now − revokedAt ≤ G`, (4) family chưa bị thu hồi và token con vẫn còn `active`. Thiếu bất kỳ điều nào ⇒ **REPLAY** ⇒ thu hồi family. Đặc biệt: token bị thu hồi do `logout` mà được trình lại **không** phải đua — người dùng đã chủ động kết thúc phiên, không có lý do hợp lệ nào để nó quay lại.

*Giá trị G*: đề xuất **30 giây** (đủ cho đua giữa các tab, kể cả mạng chậm; đủ ngắn để không nới rộng cửa sổ tấn công đáng kể). Chưa có tài liệu nào quy định ⇒ §16. G phải cấu hình được và phải có metric đếm số lần rơi vào nhánh ân hạn (§14) để hiệu chỉnh.

**`change-password` xảy ra đồng thời với `refresh`** — refresh đang bay sẽ thấy token đã bị thu hồi với lý do `password_change`. Đây **không** phải replay và **không** được kích hoạt báo động: trả `401 AUTH_REFRESH_INVALID`, ghi log mức info. Đây chính là lý do cột "lý do thu hồi" phải tồn tại trong bảng (§12) — thiếu nó thì mọi lần đổi mật khẩu sẽ tạo ra một cảnh báo replay giả, và cảnh báo giả nhiều lần sẽ khiến cảnh báo thật bị bỏ qua.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| register: body sai định dạng / thiếu field / `role='admin'` | 400 | `VALIDATION_ERROR` | có trong registry + `_FACTS` |
| register: email đã tồn tại (kể cả do đua, bắt từ vi phạm unique) | 409 | `AUTH_EMAIL_EXISTS` | có |
| login: email không tồn tại | 401 | `AUTH_INVALID_CREDENTIALS` | có |
| login: mật khẩu sai (mọi `status`) | 401 | `AUTH_INVALID_CREDENTIALS` | có — **phải giống hệt dòng trên** (INV-AUTH-06) |
| login: mật khẩu đúng, `status=pending` | 403 | `AUTH_ACCOUNT_PENDING` | có |
| login: mật khẩu đúng, `status=suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | có |
| login: vượt 5 lần thất bại/15 phút | 429 | ⚠️ **không có mã nào** | API_ERROR_CODES.md có HTTP 429 trong bảng status nhưng **không có code** cho rate limit (`AI_QUOTA_EXCEEDED` là 429 nhưng thuộc nhóm AI và đang *proposed*). **Không bịa mã** → §16 |
| refresh: không có cookie / token không tồn tại / đã thu hồi / **replay** | 401 | `AUTH_REFRESH_INVALID` | có |
| refresh: token còn trong DB nhưng quá `expiresAt` | 401 | `AUTH_TOKEN_EXPIRED` | có |
| endpoint được bảo vệ: không có/hỏng chữ ký/sai định dạng token | 401 | `AUTH_TOKEN_INVALID` | ⚠️ có trong API_ERROR_CODES.md nhưng **không có trong danh sách "Mã lỗi đã có" của `_FACTS.md`** → §16 |
| endpoint được bảo vệ: access token quá 15 phút | 401 | `AUTH_TOKEN_EXPIRED` | có |
| endpoint được bảo vệ: user đã bị `suspended` sau khi phát token | 403 | `AUTH_ACCOUNT_SUSPENDED` | có — ⚠️ ENTITY_USER.md nói "all JWT tokens rejected (401)" → xung đột 401/403, §16 |
| `PATCH /auth/me`: email trùng người khác | 409 | `AUTH_EMAIL_EXISTS` | có |
| `PATCH /auth/me`: body rỗng / field sai định dạng | 400 | `VALIDATION_ERROR` | có |
| `PATCH /auth/me`: upload avatar thất bại | 500 | `USER_AVATAR_UPLOAD_FAILED` | có |
| change-password: `currentPassword` sai | 401 | `AUTH_INVALID_CREDENTIALS` | có |
| change-password: `newPassword` không đạt chính sách / trùng mật khẩu cũ | 400 | `VALIDATION_ERROR` | có |
| logout: mọi tình huống | 204 | — | không có nhánh lỗi (INV-AUTH-16) |

**Ba điểm phải chú ý**:
1. **REPLAY không có mã riêng và điều đó là cố ý.** Trả một mã riêng (kiểu AUTH_TOKEN_REUSED — cố ý **không** đăng ký mã này) sẽ báo cho kẻ tấn công biết hệ thống đã phát hiện ra hắn và token nào đã bị dùng. Phân biệt replay với các nhánh khác chỉ được làm ở **log/metric** (§14), không ở response.
2. **P2002 phải được bắt trong service.** Global filter ánh xạ P2002 → **DUPLICATE_ENTRY**, mã này không nằm trong bất kỳ nhóm nào của API_ERROR_CODES.md, nên nếu để lọt, FE sẽ nhận một `code` mà nó không có nhánh xử lý và rơi vào toast mặc định.
3. **`AUTH_INSUFFICIENT_ROLE` không dùng ở module này** — không endpoint nào giới hạn theo role.

## 10. Side effect & notification

| Hành động | Notification `type` | `userId` (người nhận) | `referenceId` / `referenceType` | `payload` |
|---|---|---|---|---|
| `POST /auth/register` với `role='teacher'` | `new_teacher_registration` | **mọi** user có `role='admin'` (fan-out N bản ghi) | `user.id` mới / ⚠️ `referenceType` không có giá trị `user` trong enum (`assignment`/`attempt`/`invoice`/`session`) ⇒ để `null` | ⚠️ chưa chốt; deep-link tới `/admin/users/[id]` cần `referenceId` nên vẫn ghi `referenceId` |
| `POST /auth/register` với `role='student'` | `new_student_registration` | **mọi** admin | như trên | như trên |

Các hành động **không** sinh notification, vì enum của ENTITY_NOTIFICATION.md không có type tương ứng: `login`, `login thất bại`, `logout`, `refresh`, **`change-password`**, `PATCH /auth/me` (kể cả khi đổi email). Hệ quả đáng chú ý: **đổi mật khẩu không báo cho chủ tài khoản** — nếu kẻ tấn công chiếm được phiên và đổi mật khẩu, chủ tài khoản không nhận được tín hiệu nào (và cũng không có luồng quên mật khẩu để giành lại). Ghi nhận, không tự thêm type → §16.

Side effect khác (không phải notification):

| Hành động | Side effect | Ghi chú |
|---|---|---|
| `login` | `Set-Cookie: refresh_token`, INSERT `RefreshToken`, UPDATE `lastLoginAt` | `lastLoginAt` là input cho cột "Lần đăng nhập cuối" ở `GET /admin/users` (spec 02) |
| `refresh` | `Set-Cookie` mới, thu hồi token cũ, INSERT token con | |
| `logout` / `change-password` | Thu hồi token (một family / toàn bộ) | |
| `PATCH /auth/me` với avatar | Upload/xoá file trên Supabase Storage | **Không rollback được.** Thứ tự bắt buộc: upload trước → UPDATE DB sau; nếu UPDATE hỏng thì file mồ côi trên storage (rác, không phải lỗi dữ liệu). Thứ tự ngược lại sẽ cho ra `avatarUrl` trỏ vào file không tồn tại — tệ hơn |
| Đăng ký khi hệ thống có nhiều admin | N bản ghi Notification | Bulk insert một câu, không vòng lặp (§11) |

Fan-out cho admin dùng chung quy tắc transaction với module Notifications (spec 07 §7): hàng `Notification` INSERT trong **cùng** transaction với hành động nghiệp vụ; mọi thứ rời khỏi DB (push, email) nằm ngoài, sau commit.

## 11. Index & query

```
User:         UNIQUE (email)                          -- hoặc UNIQUE (lower(email)) nếu chốt không phân biệt hoa/thường
User:         (khoá chính id)                          -- đọc lại status mỗi request (§5)
RefreshToken: UNIQUE ("tokenHash")                     -- tra token khi refresh/logout; là hàng rào chống 2 hàng cùng token
RefreshToken: INDEX ("userId", "revokedAt")            -- thu hồi toàn bộ token của user khi đổi mật khẩu
RefreshToken: INDEX ("familyId")                       -- thu hồi cả family khi replay   [field proposed, §12]
RefreshToken: INDEX ("expiresAt")                      -- job dọn token hết hạn
Notification: INDEX ("userId", "createdAt")            -- do module Notifications sở hữu (spec 07 §11)
```

**Chi phí thật của module nằm ở CPU, không ở I/O**: bcrypt cost 12 tốn ~200–300ms mỗi lần so khớp và **không** song song hoá được trong một tiến trình Node đơn luồng nếu dùng bản đồng bộ. Bắt buộc dùng bản bất đồng bộ (chạy trên thread pool). Hệ quả cần biết trước: mỗi worker chỉ phục vụ được vài login đồng thời — rate limit ở §13 vừa là biện pháp bảo mật vừa là biện pháp bảo vệ năng lực xử lý.

**Truy vấn theo luồng — số query bắt buộc, không được nhiều hơn**:

| Luồng | Query |
|---|---|
| `login` | 1 SELECT `User` theo email (select đúng field cần: `id, email, passwordHash, role, status`) + 1 INSERT `RefreshToken` + 1 UPDATE `User` |
| `refresh` | 1 guarded UPDATE token cũ + 1 INSERT token con (+ 1 SELECT chỉ khi `rowCount=0`, để đi cây quyết định §6.2) |
| `GET /auth/me` | 1 SELECT theo primary key |
| `register` | 1 INSERT `User` + 1 SELECT danh sách admin (`WHERE role='admin' AND status='active'`) + 1 bulk INSERT `Notification` |

**Nguy cơ N+1 duy nhất**: vòng lặp `for (admin of admins) createNotification(...)` ở register. Với 3 admin thì vô hại, nhưng nó nằm trong transaction cùng với INSERT `User` — số câu lệnh tỉ lệ thuận với số admin và kéo dài transaction. Dùng một câu insert nhiều dòng.

**Dọn dẹp**: bảng `RefreshToken` tăng đơn điệu (mỗi lần refresh thêm một hàng — một user hoạt động liên tục 7 ngày với access token 15 phút sinh tới ~670 hàng). Cần job xoá hàng đã `expiresAt < now() - <giữ lại>` (đề xuất giữ 30 ngày cho mục đích điều tra). Chưa có tài liệu nào quy định → §16.

## 12. Migration & seed

**Bảng `User`**: module này không thêm/sửa cột nào (do module Users/migration nền sở hữu). Chỉ **yêu cầu** một điều: quyết định về tính duy nhất của email không phân biệt hoa/thường phải được phản ánh trong migration (`citext`, hoặc unique index trên `lower(email)`, hoặc chuẩn hoá lowercase ở tầng ứng dụng + unique thường). Ba cách cho ba hành vi khác nhau khi dữ liệu cũ đã lẫn hoa/thường → phải chốt trước khi có dữ liệu thật.

**Bảng `RefreshToken`**: **chưa tồn tại và chưa có ENTITY spec**. Migration phải tạo mới, gồm phần đã có tài liệu và phần bắt buộc phải thêm để §6/§8 chạy được:

| Cột | Nguồn | Ghi chú |
|---|---|---|
| `id` | PROJECT_KNOWLEDGE.md #16 | uuid, khoá chính |
| `userId` | PROJECT_KNOWLEDGE.md #16 | FK → `User`, `ON DELETE CASCADE` |
| `tokenHash` | PROJECT_KNOWLEDGE.md #16 | UNIQUE, băm một chiều của token thô |
| `expiresAt` | PROJECT_KNOWLEDGE.md #16 | = thời điểm phát + 7 ngày |
| `revokedAt` | PROJECT_KNOWLEDGE.md #16 | `null` = còn dùng được |
| `familyId` | **proposed** — cần cho INV-AUTH-11/12 | uuid, sinh lúc login, giữ nguyên qua mọi lần xoay |
| `replacedById` | **proposed** — cần cho cửa sổ ân hạn §8 | FK tự trỏ, `null` khi chưa xoay |
| `revokedReason` | **proposed** — cần để không báo động giả (§8) | enum `rotated` \| `logout` \| `password_change` \| `replay` |
| `createdAt` | **proposed** | phục vụ điều tra và job dọn dẹp |

Ba cột `familyId`/`replacedById`/`revokedReason` **không có trong bất kỳ tài liệu nguồn nào** — spec này nêu chúng như yêu cầu kỹ thuật bắt buộc, và việc phê duyệt bảng `RefreshToken` (kèm một `ENTITY_REFRESH_TOKEN.md`) là một mục ở §16. Không code trước khi bảng được chốt.

**Seed để test được module**:
- 1 admin `active`, 1 teacher `active`, 1 student `active`, 1 teacher `pending`, 1 student `suspended` — mật khẩu biết trước, băm bằng **đúng cost 12** (seed bằng cost thấp sẽ làm test hiệu năng và test cost sai).
- 1 user `active` chưa từng đăng nhập (`lastLoginAt = null`) để khoá INV-AUTH-24.
- 1 user có email viết hoa lẫn thường để test chuẩn hoá.
- Ít nhất 2 admin để test fan-out notification khi register (bulk insert, không vòng lặp).
- Test rotation/ân hạn cần **tiêm được đồng hồ** (clock injectable) để tua qua G và qua hạn 15 phút/7 ngày mà không phải chờ thật.

## 13. Security & rate limit

**Dữ liệu tuyệt đối không được ra ngoài**

| Thứ | Quy tắc |
|---|---|
| `passwordHash` | Không có trong DTO nào, log nào, `details` nào, claim JWT nào. Cách thực thi: repository dùng `select` liệt kê tường minh; hàm duy nhất được phép đọc `passwordHash` là hàm xác thực, và nó nhận vào/trả ra boolean, không trả ra hash |
| Mật khẩu thô | Không log, không đưa vào `details` của `VALIDATION_ERROR` (thông báo lỗi mô tả luật, không lặp lại giá trị), không đưa vào APM/breadcrumb |
| Refresh token thô | Không log, không ghi DB (chỉ băm), không trả trong body. Nếu chọn phương án A ở §8 thì bản thô nằm trong cache TTL = G — phải là store riêng, không phải log, không phải bảng dùng chung |
| Header `Authorization`, header `Cookie` | Phải nằm trong danh sách redact của logger/APM |
| JWT claim | Chỉ `sub`, `role`, `jti`, `iat`, `exp` (+ `status` nếu muốn, nhưng **vẫn phải** kiểm lại DB — §5). Không nhét `email`, `nickname`, `passwordHash`, không nhét dữ liệu nghiệp vụ |

**Rate limit login: 5 lần/15 phút**
- Chỉ đếm **lần thất bại**; login thành công không tính vào bộ đếm và (đề xuất) xoá bộ đếm của khoá đó.
- Hai bộ đếm chạy song song: theo **email đã chuẩn hoá** (chống dò mật khẩu vào một tài khoản) và theo **IP** (chống rải mật khẩu qua nhiều tài khoản). Chỉ đếm theo IP là vô dụng với kẻ có nhiều IP; chỉ đếm theo email là vô dụng với kiểu password spraying.
- Đếm theo email **phải hành xử y hệt với email không tồn tại** — nếu email lạ không bị đếm (hoặc bị đếm khác), kẻ tấn công phân biệt được tài khoản có thật bằng chính hành vi rate limit. Đây là biến thể tinh vi của lỗ hổng liệt kê tài khoản.
- Vượt ngưỡng → HTTP 429, **không** so khớp bcrypt (bảo vệ CPU), **không** tiết lộ thời gian còn lại theo tài khoản. ⚠️ Chưa có `code` cho 429 → §16.
- Đề xuất áp rate limit rộng hơn (chưa có tài liệu, để §16): `register` (chống tạo hàng loạt tài khoản rác làm ngập hàng chờ duyệt của admin) và `change-password`/`refresh` (chống lạm dụng).

**Chống liệt kê tài khoản (user enumeration) — bắt buộc**
1. **Sai email và sai mật khẩu trả CÙNG một mã lỗi**: `401 AUTH_INVALID_CREDENTIALS`, cùng `message`, cùng shape, không `details`, không field phụ nào khác nhau (INV-AUTH-06).
2. **Cân bằng thời gian**: khi email không tồn tại, vẫn chạy một phép so bcrypt với một hash giả cố định rồi mới trả lỗi. Không làm điều này thì nhánh "email lạ" trả về nhanh hơn ~250ms và trở thành oracle đo được từ xa.
3. **Trạng thái tài khoản chỉ lộ sau khi mật khẩu đúng** (INV-AUTH-07). Nếu trả `AUTH_ACCOUNT_PENDING` ngay khi thấy email tồn tại thì mọi nỗ lực ở điểm 1 và 2 đều vô nghĩa.
4. **Rate limit không được phân biệt** (điểm ở trên).
5. **Giới hạn đã biết, không tự sửa**: `POST /auth/register` trả `409 AUTH_EMAIL_EXISTS` — tức là **register vẫn là một oracle liệt kê tài khoản theo đúng thiết kế đã ghi trong API_AUTH.md**. Spec này không tự đổi hành vi đó (đổi sẽ phá UX đăng ký và phá hợp đồng FE); ghi nhận là rủi ro chấp nhận có ý thức, và vì vậy `register` cũng cần rate limit. → §16.

**Cookie `refresh_token`** — `HttpOnly` (bắt buộc, API_AUTH đã ghi), `Secure` (bắt buộc ở production), `Max-Age` 7 ngày khớp `expiresAt` trong DB, `Path` hẹp nhất có thể (đề xuất `/api/v1/auth` — cookie sẽ không bị gửi kèm mọi request nghiệp vụ), `SameSite` **chưa được tài liệu nào quy định** → §16. Lựa chọn `SameSite` quyết định luôn bề mặt CSRF:

**CSRF** — `/auth/refresh` là endpoint POST được xác thực **hoàn toàn bằng cookie**, không cần header nào. Đó chính là hình dạng kinh điển của mục tiêu CSRF: một trang bất kỳ có thể khiến trình duyệt nạn nhân gọi `/auth/refresh`. Mức thiệt hại có giới hạn (kẻ tấn công không đọc được response vì CORS, nên không lấy được access token) nhưng **hậu quả thật là làm xoay token liên tục**, và nếu kẻ tấn công ép gọi hai lần thì có thể kích hoạt nhánh replay ⇒ **đăng xuất nạn nhân từ xa**. Phòng thủ tối thiểu: `SameSite=Lax` trở lên (chặn POST cross-site), cộng kiểm `Origin`/`Referer` ở endpoint refresh. Phải chốt cùng lúc với quyết định FE/API có cùng site hay không → §16.

**Khác**: `bcrypt` cost 12 cố định, không cấu hình theo môi trường (test chạy cost thấp sẽ không phát hiện được sai cost ở production — nếu buộc phải hạ cost khi test thì phải có một test riêng khoá đúng cost của cấu hình production). Không có bảng `AuditLog` trong toàn bộ tài liệu ⇒ **không có nơi bền vững lưu "ai đăng nhập lúc nào, từ đâu, thất bại bao nhiêu lần"** ngoài log ứng dụng ⇒ điều tra sự cố bảo mật sẽ phụ thuộc vào retention của log → §16.

## 14. Observability

**Log** (không bao giờ chứa token thô, mật khẩu, hash; chỉ `jti`/tiền tố của `tokenHash`/`familyId`):

| Sự kiện | Mức | Kèm theo |
|---|---|---|
| Login thành công | info | `userId`, `role`, IP, user-agent |
| Login thất bại | info | **nhóm lý do** (`invalid_credentials` / `pending` / `suspended`), email đã băm hoặc rút gọn, IP. Không log mật khẩu, không log email đầy đủ nếu chính sách riêng tư yêu cầu |
| Chạm ngưỡng rate limit | warn | khoá đếm (email băm / IP), số lần |
| Refresh xoay thành công | debug | `userId`, `familyId`, `jti` cũ → mới |
| Rơi vào **cửa sổ ân hạn** (đua hợp lệ) | info | `familyId`, độ trễ so với lần xoay — **dùng để hiệu chỉnh G** |
| **REPLAY phát hiện** | **warn/alert** | `userId`, `familyId`, số token bị thu hồi, IP + user-agent của cả lần xoay gốc lẫn lần trình lại (hai UA khác nhau là dấu hiệu trộm cookie thật sự) |
| Thu hồi vì `logout` / `password_change` | info | Phải phân biệt rõ với replay, nếu không sẽ tạo báo động giả (§8) |
| Đổi mật khẩu thành công | info | `userId`, số token bị thu hồi |
| Đổi email thành công | info | `userId`, email cũ → mới (là sự kiện nhạy cảm: chiếm tài khoản thường bắt đầu bằng đổi email) |

**Đo**:
- Tỉ lệ login thành công/thất bại theo thời gian; đột biến thất bại theo một email = tấn công dò mật khẩu.
- Số lần **replay phát hiện/ngày** — ngưỡng cảnh báo là **> 0 kéo dài**: hoặc đang bị tấn công, hoặc cửa sổ ân hạn đang quá ngắn (dương tính giả). Hai nguyên nhân phân biệt bằng metric "ân hạn" ở trên.
- Tỉ lệ request rơi vào nhánh ân hạn / tổng số refresh — nếu cao bất thường thì FE đang gọi refresh dồn (thiếu single-flight ở interceptor).
- p95/p99 thời gian bcrypt và thời gian `/auth/login` — cost 12 khiến login là endpoint chậm nhất hệ thống; theo dõi để biết khi nào phải tăng worker.
- Số hàng `RefreshToken` và tốc độ tăng — theo dõi job dọn dẹp (§11).
- Tỉ lệ 401 trên các endpoint nghiệp vụ — tăng đột ngột thường nghĩa là luồng refresh của FE hỏng.

## 15. Test matrix

Đây là **invariant gate**: mọi INV ở §4 phải có ít nhất một dòng ở đây. Thiếu một dòng = không merge.

| INV | Loại test | Mô tả |
|---|---|---|
| INV-AUTH-01 | integration | Serialize response của cả 7 endpoint (cả nhánh thành công lẫn 400/401/403/409) thành chuỗi → assert không chứa khoá `passwordHash` và không chứa chuỗi hash của seed. Giải mã payload JWT → assert không có `passwordHash`. Bắt log trong lúc chạy → assert không chứa hash |
| INV-AUTH-02 | DB thật | Sau register, đọc thẳng `passwordHash` từ DB → assert tiền tố bcrypt và **cost = 12**; assert giá trị ≠ mật khẩu thô; login bằng đúng mật khẩu → 200 |
| INV-AUTH-03 | integration | register với `role='admin'` → 400; với `status='active'` thêm vào body → field bị loại, DB vẫn `pending`; mọi register hợp lệ → DB `status='pending'` |
| INV-AUTH-04 | DB thật (concurrency) | Bắn 2 register song song cùng email → đúng 1 bản ghi `User`, 1 request 201 và 1 request **409 `AUTH_EMAIL_EXISTS`** (không phải 500, không phải **DUPLICATE_ENTRY**). Lặp với `A@x.com` vs `a@x.com` |
| INV-AUTH-05 | integration + DB thật | Login user `pending` (mật khẩu đúng) → 403 `AUTH_ACCOUNT_PENDING`; `suspended` → 403 `AUTH_ACCOUNT_SUSPENDED`. Assert: không có `Set-Cookie`, không có `accessToken`, `COUNT(RefreshToken)` không tăng, `lastLoginAt` không đổi |
| INV-AUTH-06 | integration | So sánh **từng byte** response của (email không tồn tại) và (email tồn tại + mật khẩu sai): cùng `statusCode`, `error`, `code`, `message`, không `details`. Thêm test thời gian: chạy N lần mỗi nhánh, assert phân phối thời gian không tách rời (không có nhánh nhanh hơn một ngưỡng) |
| INV-AUTH-07 | integration | Sai mật khẩu trên tài khoản `pending` → `AUTH_INVALID_CREDENTIALS` (**không** `AUTH_ACCOUNT_PENDING`); lặp cho `suspended` |
| INV-AUTH-08 | integration (clock giả) | Tua đồng hồ 14 phút → access token còn dùng được; 15 phút + 1 giây → 401 `AUTH_TOKEN_EXPIRED`. Tua 7 ngày + 1 phút → refresh token hết hạn → 401 `AUTH_TOKEN_EXPIRED` |
| INV-AUTH-09 | integration | Response login/refresh không chứa chuỗi refresh token; header `Set-Cookie` có `HttpOnly` (và `Secure` ở cấu hình production). Gửi refresh token trong body/header thay vì cookie → 401, không phát token |
| INV-AUTH-10 | DB thật | Sau mỗi lần refresh: token cũ có `revokedAt ≠ null`, token mới `revokedAt = null`, cùng `familyId`; `COUNT(* WHERE familyId=f AND revokedAt IS NULL) = 1` (đo ngoài cửa sổ ân hạn). Chuỗi 5 lần refresh liên tiếp đều đúng |
| INV-AUTH-11 | DB thật | Refresh bằng RT1 (đã xoay từ lâu, ngoài G) → 401 `AUTH_REFRESH_INVALID`, **và** `COUNT(* WHERE familyId=f AND revokedAt IS NULL) = 0`, **và** việc thu hồi vẫn còn sau khi request lỗi kết thúc (đọc lại từ connection khác — bắt đúng lỗi rollback ở §7) |
| INV-AUTH-12 | integration | Sau khi family bị thu hồi, dùng token mới nhất của family đó → 401; access token cũ vẫn sống tới hết 15 phút (ghi nhận giới hạn) nhưng không xoay được nữa; login lại → family mới, hoạt động bình thường |
| INV-AUTH-13 | DB thật | `SELECT` toàn bảng `RefreshToken` → không cột nào chứa giá trị token thô mà client cầm; `tokenHash` là UNIQUE (thử insert trùng → vi phạm constraint) |
| INV-AUTH-14 | DB thật | Login thành công → `lastLoginAt` cập nhật (sau thời điểm phát token). Login thất bại (3 nhánh) → không đổi. `/auth/refresh`, `/auth/logout` → không đổi |
| INV-AUTH-15 | integration | Login → có access token còn hạn → admin `suspend` user đó → gọi `GET /auth/me` bằng token cũ → bị từ chối; gọi `/auth/refresh` → bị từ chối. (Khoá cả HTTP code sau khi §16 giải xung đột 401/403) |
| INV-AUTH-16 | integration + DB thật | Logout → 204, token bị thu hồi trong DB, cookie bị xoá đúng `Path`. Logout lần hai (không cookie) → vẫn 204, `COUNT` token thu hồi không đổi. Logout với cookie rác → 204 |
| INV-AUTH-17 | DB thật | Sai `currentPassword` → 401, `passwordHash` không đổi, token không bị thu hồi. Đúng → 204, đăng nhập bằng mật khẩu mới thành công, mật khẩu cũ thất bại, **mọi** refresh token của user (tạo từ 2 lần login khác nhau = 2 family) đều bị thu hồi |
| INV-AUTH-18 | DB thật | Ép bước thu hồi token thất bại → assert `passwordHash` **vẫn là giá trị cũ** (rollback); chiều ngược lại: ép UPDATE `passwordHash` thất bại → assert không token nào bị thu hồi |
| INV-AUTH-19 | DB thật | Snapshot hàng `User` trước/sau `PATCH /auth/me` → chỉ `nickname`(⚠️C1)/`email`/`avatarUrl`/`updatedAt` đổi. Gửi thêm `role`/`status`/`id`/`passwordHash` trong body → bị loại bỏ, DB không đổi, không 500 |
| INV-AUTH-20 | DB thật | PATCH email trùng user khác → 409 `AUTH_EMAIL_EXISTS`, DB không đổi (kể cả `updatedAt`). Đổi email hợp lệ → `status` giữ nguyên `active`, đăng nhập bằng email mới thành công |
| INV-AUTH-21 | integration (clock giả) | 5 lần sai liên tiếp → lần 6 trả 429 **và không** chạy bcrypt (đo bằng thời gian phản hồi hoặc spy). Lặp y hệt với email **không tồn tại** → assert hành vi và mã trả về giống hệt. Tua 15 phút → login lại được. 4 lần sai rồi 1 lần đúng → 200 |
| INV-AUTH-22 | DB thật (concurrency) | Bắn 2 request `/auth/refresh` song song với **cùng** cookie → cả hai 200 với access token dùng được; đúng **1** token con được tạo (`COUNT(WHERE parent=RT_n) = 1`); family **không** bị thu hồi; giá trị cookie cuối cùng dùng được. Lặp 50 lần để bắt lỗi đua thưa. Biến thể ngoài G: request thứ hai sau G → 401 và family bị thu hồi (đúng là replay) |
| INV-AUTH-23 | integration | Mọi nhánh lỗi của 7 endpoint: response có đủ `statusCode`/`error`/`code`/`message`/`timestamp`/`path`, **không** có `success`, `error` là chuỗi không phải object; `details` chỉ xuất hiện ở `VALIDATION_ERROR` và có dạng `Record<field, string[]>` |
| INV-AUTH-24 | integration | Mọi DateTime trong `GET /auth/me` khớp regex ISO 8601 UTC (kết thúc `Z`); user seed chưa đăng nhập → `lastLoginAt === null` |

Bổ sung ngoài invariant gate (không thay thế các dòng trên): test P2002 ở register **không** rò **DUPLICATE_ENTRY** ra ngoài; test cookie có `Path` đúng cho cả lúc set và lúc xoá; test upload avatar thất bại → 500 `USER_AVATAR_UPLOAD_FAILED` và `avatarUrl` trong DB không đổi.

## 16. Chưa chốt

| Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|
| **C1 — `nickname` hay `fullName`?** ENTITY_USER.md + `_FACTS.md` định nghĩa field là `nickname` (`varchar(100)`, nullable, "Display name (student); full name (teacher/admin)"). API_AUTH.md dùng `fullName` ở **cả** body `POST /auth/register` **và** body `PATCH /auth/me`. API_ERROR_CODES.md ví dụ validation cũng dùng khoá `fullName`. Nhưng FE spec `admin-profile.spec.md` mục 6 lại trả dữ liệu mẫu với khoá `nickname`. Ba tài liệu, hai tên, một field | Chặn **khoá DTO của 3 trong 7 endpoint** (register, PATCH /me, và response của GET /me) — tức là chặn hợp đồng FE–BE ở màn đăng ký và màn hồ sơ. Nếu chốt `fullName` thì phát sinh migration **đổi tên cột** `nickname → fullName` và sửa lan sang mọi module đang đọc `nickname` (spec 02 §3 danh sách user, spec 04 §11 include teacher). Nếu chốt `nickname` thì phải sửa API_AUTH.md và FE form. **Không tự chọn bên nào** — cả hai đều đang được viện dẫn ở tài liệu đang có hiệu lực | - | trước khi code `POST /auth/register` (là endpoint đầu tiên của Sprint 1) |
| **Bảng `RefreshToken` chưa được phê duyệt.** Không có `ENTITY_REFRESH_TOKEN.md`; định nghĩa duy nhất nằm ở PROJECT_KNOWLEDGE.md #16 với 5 cột. Ba cột `familyId`, `replacedById`, `revokedReason` là **bắt buộc** để §6/§8 chạy được nhưng chưa có ở bất kỳ đâu | Chặn migration của cả module; chặn INV-AUTH-11/12/22 (không có `familyId` thì không thu hồi family được, không có `revokedReason` thì mọi lần đổi mật khẩu tạo cảnh báo replay giả) | - | trước Sprint 1 |
| **Cửa sổ ân hạn G bằng bao nhiêu, và chọn phương án A hay B ở §8?** Đề xuất A + G = 30s | Chặn hành vi của INV-AUTH-22 và dòng test tương ứng; A yêu cầu có Redis (phụ thuộc hạ tầng), B yêu cầu nới lỏng cách phát biểu INV-AUTH-10 | - | trước khi code `/auth/refresh` |
| **Không có mã lỗi nào cho HTTP 429.** API_ERROR_CODES.md liệt kê 429 ở bảng HTTP status nhưng registry không có code rate limit (`AI_QUOTA_EXCEEDED` là 429 nhưng thuộc nhóm AI và đang *proposed, not agreed*) | Chặn §9 và dòng test INV-AUTH-21 (hiện chỉ khoá được HTTP 429, chưa khoá được `code`); FE không có nhánh xử lý | - | trước khi code rate limit |
| **`AUTH_TOKEN_INVALID` đã được duyệt chưa?** Có trong API_ERROR_CODES.md nhưng **không** có trong danh sách "Mã lỗi đã có" của `_FACTS.md` | Chặn assert `code` cho mọi nhánh 401 không phải refresh (§9) | - | cùng lúc với dòng trên |
| **Token của user `suspended` bị từ chối bằng 401 hay 403?** ENTITY_USER.md: "status = suspended → all JWT tokens rejected (401)". API_ERROR_CODES.md: `AUTH_ACCOUNT_SUSPENDED = 403` | Chặn §5, §9 và test INV-AUTH-15. Khác biệt không nhỏ: FE thường coi 401 là tín hiệu "thử refresh rồi đăng xuất", còn 403 là "hiện thông báo" — chọn sai làm FE lặp vô hạn vòng refresh | - | trước khi code guard |
| **`SameSite` của cookie `refresh_token` và phòng thủ CSRF cho `/auth/refresh`.** Không tài liệu nào quy định. Phụ thuộc FE (`:3000`) và API (`:3001`) ở production có cùng site hay không | Chặn cấu hình cookie; nếu khác site thì buộc `SameSite=None; Secure` ⇒ mất phòng thủ CSRF mặc định ⇒ phải thêm kiểm `Origin` hoặc CSRF token, tức là thêm bề mặt hợp đồng FE–BE | - | trước khi lên môi trường có domain thật |
| **Chính sách mật khẩu: chỉ "≥ 8 ký tự" hay còn "chữ hoa + số"?** API_AUTH.md ghi `min8chars`; API_ERROR_CODES.md và FE profile spec hiển thị luật mạnh hơn | Chặn DTO §3, chặn thông điệp trong `details`, chặn seed và test | - | trước khi code register |
| **Email có phân biệt hoa/thường không?** ENTITY_USER chỉ nói "unique" | Chặn migration (chọn `citext` / unique trên `lower(email)` / chuẩn hoá ở ứng dụng), chặn INV-AUTH-04 và luồng đăng nhập | - | trước migration đầu tiên |
| **Không có luồng quên/đặt lại mật khẩu.** Không có `POST /auth/forgot-password`, `/auth/reset-password`, không có `PATCH /admin/users/:id/reset-password` | Người dùng quên mật khẩu **không có đường nào lấy lại tài khoản**; cộng với việc không có notification khi đổi mật khẩu (§10), một tài khoản bị chiếm là mất vĩnh viễn. Chặn kế hoạch vận hành, không chặn code Sprint 1 | - | trước go-live |
| **Đổi email có thu hồi token / có cần xác minh email mới không?** Hiện `PATCH /auth/me` đổi email ngay, không xác minh, không thu hồi phiên | Chặn INV-AUTH-20 (hiện đang phát biểu là "không đổi status, không thu hồi"). Là bước kinh điển của chiếm tài khoản: kẻ chiếm phiên đổi email rồi giữ quyền vĩnh viễn | - | trước go-live |
| **`hskLevelGoal` và `bio` không có endpoint nào ghi được.** Không có trong body `PATCH /auth/me`, cũng không có trong module Users (chỉ đổi `status`) | Hai field sẽ luôn `null` trong thực tế; chặn tính năng "mục tiêu HSK" của học sinh và "giới thiệu" của giáo viên | - | trước Sprint 2 |
| **Envelope của `/auth/me`: `data` hay `data.user`?** API_CONVENTIONS.md nói `{ "data": {...} }`; FE `admin-profile.spec.md` §3 ghi `data.user` cho cả GET và PATCH | Chặn parse response ở FE cho 2 endpoint; cùng loại lệch đã ghi ở spec 02 §16 ⇒ nên chốt một lần cho toàn hệ thống | - | trước khi code màn hồ sơ |
| **Số phiên đồng thời tối đa và chính sách dọn `RefreshToken`.** Không giới hạn số family/user; không có job dọn token hết hạn | Bảng tăng đơn điệu (~670 hàng/user/tuần khi hoạt động liên tục); chặn kế hoạch vận hành DB, không chặn code | - | trước go-live |
| **Register là oracle liệt kê tài khoản theo thiết kế** (`AUTH_EMAIL_EXISTS` 409). Chấp nhận hay đổi sang phản hồi trung tính "nếu email chưa dùng, tài khoản đã được tạo"? | Nếu chấp nhận: mọi nỗ lực chống liệt kê ở login chỉ giảm được một phần rủi ro; nếu đổi: phá hợp đồng API_AUTH.md hiện tại và UX form đăng ký | - | trước go-live |
| **Không có bảng `AuditLog`.** Không có nơi bền vững lưu ai đăng nhập/đăng xuất/đổi mật khẩu lúc nào | Chặn yêu cầu truy vết ở §13/§14; điều tra sự cố phụ thuộc hoàn toàn vào retention log ứng dụng | - | trước go-live |
| **Có cache `User.status` cho guard không, TTL bao nhiêu?** §5 yêu cầu đọc DB mỗi request | Nếu có cache thì INV-AUTH-15 chỉ đúng sau TTL ⇒ phải phát biểu lại invariant kèm trễ tối đa; nếu không cache thì mỗi request tốn một truy vấn khoá chính | - | trước khi tối ưu hiệu năng |

*(C2 và C3 trong `_FACTS.md` không chạm tới module này: C2 thuộc nhóm rate/payroll; C3 chạm gián tiếp — nếu thêm `status='rejected'` thì §6.1 và INV-AUTH-05 phải bổ sung một nhánh lỗi login cho trạng thái mới, hiện chưa có mã lỗi tương ứng. C4 chỉ ảnh hưởng `hskLevelGoal` ở mức đọc, module này không validate.)*
