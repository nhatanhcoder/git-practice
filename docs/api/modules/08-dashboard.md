---
module: Dashboard / Reporting
status: deferred
blocked_by: phụ thuộc mọi module khác (§16 — phải làm CUỐI CÙNG) · payload của `GET /admin/dashboard/stats` chưa được định nghĩa ở đâu · `GET /admin/monitoring/gemini` bị chặn kép (Quyết định 4 mô hình khoá Gemini + chưa có dữ liệu AI usage thật, T-GRADE-3) · `ENTITY_AI_USAGE_LOG.md` là file RỖNG (0 byte)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module **chỉ là một phép chiếu (projection)**: nó tổng hợp số liệu từ các bảng do module khác sở hữu và trả về dưới dạng các ô KPI. Nó **không sở hữu bảng nào**, không có migration bảng của riêng mình, không ghi một dòng nào xuống DB, không sinh notification, không có state machine. Mọi con số ở đây đều là **hàm** của dữ liệu người khác; định nghĩa nghiệp vụ của từng con số ("thế nào là hoá đơn chưa trả", "kỳ lương tháng này gồm những trạng thái nào") thuộc về module sở hữu bảng đó, **không** thuộc về module này. Hệ quả trực tiếp và là lý do module ở trạng thái `deferred`: mỗi khi một module nguồn đổi cách định nghĩa trạng thái của mình, mọi ô ở đây và mọi test ở đây phải viết lại.

Ranh giới thứ hai: `GET /admin/monitoring/gemini` được đặt trong module này vì nó là màn hình chỉ-đọc mang tính báo cáo, nhưng nó đọc dữ liệu AI usage mà **hiện chưa có bảng nào định nghĩa** — xem §1 và §16.

## 1. Bảng chạm tới

**Đọc hết, ghi không gì cả.** Không bảng nào trong danh sách dưới đây thuộc quyền sở hữu của module này.

| Bảng | Đọc/Ghi | Chủ sở hữu | Dùng cho ô nào |
|---|---|---|---|
| `User` | Đọc | module Users (spec 02) | Đếm theo `role` × `status`: chờ duyệt, giáo viên đang hoạt động, học sinh đang hoạt động, tài khoản bị khoá |
| `ClassSession` | Đọc | module Sessions (spec 04) | Đếm `status='completed_pending'` (hàng chờ duyệt buổi dạy) |
| `PayrollPeriod` | Đọc | module Payroll (spec 05) | Tổng lương kỳ hiện tại; số kỳ ở `draft`/`finalized` chưa chi |
| `StudentInvoice` | Đọc | module Billing | Đếm/cộng theo `status`; công nợ còn lại |
| `TuitionPayment` | Đọc | module Billing | Doanh thu thu được theo tháng (`paidAt`) |
| `Class`, `ClassEnrollment` | Đọc *(nếu có ô lớp/sĩ số)* | module Classes | Chưa chốt có ô nào không — §3 |
| *AI usage* | Đọc | ⛔ **không có bảng** | `GET /admin/monitoring/gemini`. `ENTITY_AI_USAGE_LOG.md` tồn tại nhưng **rỗng 0 byte** — không có một định nghĩa field nào. Không thể viết truy vấn cho một bảng chưa được định nghĩa |
| `Notification` | **Không chạm** | module Notifications (spec 07) | Dashboard không đọc thông báo; chuông là kênh riêng |

Vì module không ghi, nó **không cần** quyền ghi ở tầng DB. Nếu hạ tầng cho phép, dùng connection/role chỉ-đọc cho các truy vấn của module này — biến INV-DASH-03 từ quy ước thành ràng buộc kỹ thuật.

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| GET | `/api/v1/admin/dashboard/stats` | admin | "User stats, financial summary" | **defined (chỉ đường dẫn)** — API_ADMIN.md § Dashboard. ⚠️ **Payload không được định nghĩa ở bất kỳ đâu**; `pages/_INDEX.md` ghi route `/admin` đang *blocked on: stats payload shape* |
| GET | `/api/v1/admin/monitoring/gemini` | admin | Hạn mức/dùng bao nhiêu của Gemini, cho màn `/admin/monitoring` | ⛔ **PROPOSED, bị chặn** — API_ADMIN.md § "Referenced by FE contracts, not yet defined", cột *Blocked on*: "Gemini key model undecided". `pages/_INDEX.md` ghi màn này *blocked on* **"all of it"** và **T-GRADE-3** |

Không có (và không đề xuất cho v1): endpoint biểu đồ theo chuỗi thời gian, endpoint xuất báo cáo, endpoint dashboard cho teacher/student. `root-design-fe.md` §8 có nhắc "Teacher Dashboard" nhưng tài liệu thiết kế của nó chưa tồn tại.

**Một chi tiết quan trọng của `/admin/dashboard/stats`**: `pages/_INDEX.md` mô tả "KPI tiles double as the work queue" — các ô KPI **đồng thời là hàng chờ việc** của admin (bấm vào ô "5 tài khoản chờ duyệt" là sang thẳng danh sách đã lọc). Đây chính là lý do INV-DASH-01 ở §4 là invariant quan trọng nhất của module: nếu con số trên ô không khớp với màn hình mà nó dẫn tới, admin sẽ bấm vào ô rồi thấy một danh sách khác, và sẽ mất lòng tin vào toàn bộ số liệu tài chính.

## 3. DTO

### Request

`GET /admin/dashboard/stats` — **không tham số cho v1**. Không có `?from=`/`?to=`/`?period=` nào được định nghĩa; thêm tham số nghĩa là thêm hợp đồng phải giữ. Ô nào có ý nghĩa "tháng này" thì mốc tháng do **server** quyết (§4 INV-DASH-10), không nhận từ client.

`GET /admin/monitoring/gemini` — không xác định được: đơn vị đo (theo khoá? theo giáo viên?) phụ thuộc Quyết định 4. Không viết DTO cho nó ở đây.

### Response

⚠️ **Toàn bộ phần này là *proposed*.** API_ADMIN.md chỉ ghi 5 chữ "User stats, financial summary". Bảng dưới đây là **các ô ứng viên kèm biểu thức nguồn chính xác**, để phần chưa chốt là *chọn ô nào*, chứ không phải *ô đó nghĩa là gì*.

`{ "data": DashboardStats }` — không dùng `meta` (không phân trang).

| Field đề xuất | Kiểu | Biểu thức nguồn (chuẩn duy nhất) | Màn chi tiết phải khớp (INV-DASH-01) | Ghi chú |
|---|---|---|---|---|
| `pendingUsers` | int | `COUNT(User WHERE status='pending')` | `GET /admin/users?status=pending` → `meta.total` | Là hàng chờ việc |
| `activeTeachers` | int | `COUNT(User WHERE role='teacher' AND status='active')` | `GET /admin/users?role=teacher&status=active` | |
| `activeStudents` | int | `COUNT(User WHERE role='student' AND status='active')` | `GET /admin/users?role=student&status=active` | |
| `suspendedUsers` | int | `COUNT(User WHERE status='suspended')` | `GET /admin/users?status=suspended` | |
| `sessionsPendingReview` | int | `COUNT(ClassSession WHERE status='completed_pending')` | `GET /admin/sessions/pending` → `meta.total` | Hàng chờ việc |
| `unpaidInvoices` | int | ⚠️ **`COUNT(StudentInvoice WHERE status='unpaid')` hay `WHERE status IN ('unpaid','partially_paid')`?** | `GET /admin/invoices?status=unpaid` | **Chưa chốt và đây là rủi ro số một của INV-DASH-01** — xem §16 |
| `outstandingAmount` | Decimal(12,2) | `SUM(totalAmount − paidAmount) WHERE status IN ('unpaid','partially_paid')` — **`void` bị loại** | Tổng cột còn nợ ở màn `/admin/invoices` cùng bộ lọc | Không bao giờ trừ trên hoá đơn `void` |
| `revenueThisMonth` | Decimal(12,2) | ⚠️ `SUM(TuitionPayment.amount WHERE paidAt ∈ [đầu tháng, đầu tháng sau))` **hay** cộng theo kỳ của invoice? Hai con số khác nhau | Danh sách thanh toán lọc theo tháng | Chưa chốt — §16 |
| `payrollThisMonth` | Decimal(12,2) | ⚠️ `SUM(PayrollPeriod.totalAmount WHERE <kỳ giao tháng này> AND status IN (?))` — gồm `draft` không? | `GET /admin/payroll` cùng bộ lọc | ENTITY_PAYROLL_PERIOD: "Fills 'monthly payroll' slot in Admin Dashboard **after Sprint 7**". Ranh giới kỳ lương là Quyết định 3 chưa chốt |
| `generatedAt` | DateTime UTC ISO 8601 | thời điểm tính | — | **Bắt buộc nếu bật cache** (INV-DASH-09); nên có ngay cả khi không cache, để FE hiển thị "số liệu lúc HH:mm" |

Không đưa vào response: danh sách bản ghi, tên/email người dùng, bất kỳ dữ liệu cá nhân nào (INV-DASH-11). Dashboard trả **số**, không trả **hàng**; muốn xem hàng thì bấm sang màn chi tiết.

`GET /admin/monitoring/gemini` — **không định nghĩa DTO**. Không có bảng nguồn (§1), không có đơn vị đo đã chốt (§16). Viết DTO lúc này chắc chắn phải bỏ đi.

## 4. Rule nghiệp vụ (invariant)

| ID | Phát biểu |
|---|---|
| **INV-DASH-01** | **Mỗi con số trên dashboard bằng đúng con số của màn chi tiết tương ứng khi áp cùng bộ lọc, tại cùng một thời điểm.** Dashboard báo 5 hoá đơn chưa trả ⇒ `GET /admin/invoices` lọc "chưa trả" trả `meta.total = 5`, không phải 4, không phải 6. Áp cho **mọi** ô ở §3, không riêng ô nào. |
| **INV-DASH-02** | Mỗi con số được suy ra từ **đúng một** biểu thức đã đăng ký ở §3, dùng chung một chỗ định nghĩa với màn chi tiết; không có con số nào được tính bằng hai đoạn mã ở hai nơi. (Hai bản sao của một biểu thức là cách INV-DASH-01 bị phá vỡ trong im lặng.) |
| **INV-DASH-03** | Module **không ghi**: không INSERT/UPDATE/DELETE bảng nào, không sinh Notification nào, không đổi trạng thái nào. Gọi endpoint bao nhiêu lần cũng không thay đổi trạng thái hệ thống. |
| **INV-DASH-04** | Mọi ô trong **một** response được đọc từ **cùng một ảnh chụp (snapshot)** dữ liệu; không tồn tại response mà ô A phản ánh thời điểm t₁ còn ô B phản ánh t₂ (ví dụ: "5 hoá đơn chưa trả" nhưng `outstandingAmount` đã trừ mất khoản vừa thu). |
| **INV-DASH-05** | Hoá đơn `status='void'` **không bao giờ** được tính vào bất kỳ ô đếm hay ô tiền nào. |
| **INV-DASH-06** | Mọi phép cộng tiền được thực hiện ở tầng DB trên kiểu Decimal, không cộng bằng số thực dấu phẩy động ở tầng ứng dụng; giá trị trả ra giữ đúng scale 2 chữ số thập phân. |
| **INV-DASH-07** | Tập rỗng cho ra `0`, không phải `null` và không phải lỗi: hệ thống chưa có hoá đơn nào thì `unpaidInvoices = 0` và `outstandingAmount = "0.00"`. |
| **INV-DASH-08** | Chỉ actor có `role='admin'` **và** `status='active'` gọi được; teacher/student bị từ chối trước khi bất kỳ truy vấn tổng hợp nào chạy. |
| **INV-DASH-09** | Nếu bật cache: **cả response** được cache như một khối, không cache từng ô riêng lẻ; mọi ô trong một response đến từ cùng một lần tính; response kèm `generatedAt` là thời điểm tính thật (không phải thời điểm trả). |
| **INV-DASH-10** | Ranh giới thời gian là **nửa mở** `[đầu kỳ, đầu kỳ sau)` và dùng **cùng một múi giờ, cùng một định nghĩa** với màn chi tiết; không có bản ghi nào bị đếm hai lần hoặc rơi mất ở ranh giới giữa hai tháng. |
| **INV-DASH-11** | Response chỉ chứa số liệu tổng hợp: không danh sách, không email, không tên, không `passwordHash`, không id của bản ghi cụ thể. |
| **INV-DASH-12** | Mọi ô đếm theo trạng thái chỉ dùng giá trị **có thật** trong enum tương ứng; không ô nào đếm theo trạng thái không tồn tại (ví dụ `User.status='rejected'` — C3) và không ô nào âm thầm bỏ sót một giá trị enum khi enum được mở rộng. |
| **INV-DASH-13** | `GET /admin/monitoring/gemini` không bao giờ trả khoá API Gemini, một phần khoá, hay bất cứ thứ gì tái tạo được khoá; chỉ trả số liệu sử dụng. |
| **INV-DASH-14** | Số `0` phải phân biệt được với "chưa có dữ liệu / chưa triển khai": ô mà nguồn dữ liệu chưa tồn tại (AI usage) **không** được trả `0` như thể đã đo và bằng không. |

## 5. Ownership / RBAC

`RBAC_MATRIX.md` **không có dòng nào cho resource "Dashboard"** — quyền của module này không được định nghĩa trực tiếp ở đâu (§16). Suy ra gián tiếp: dashboard phơi bày dạng tổng hợp của `User` (list all = ✅ chỉ Admin), `StudentInvoice`, `TuitionPayment`, `PayrollPeriod` (đều ✅ chỉ Admin) ⇒ **chỉ admin**. API_ADMIN.md cũng ghi ở đầu file: mọi route dưới `/admin` yêu cầu `role=admin`.

Không có ownership rule (admin thấy toàn hệ thống, không có "của tôi").

| Tầng | Điều kiện | Sai thì |
|---|---|---|
| Guard | `req.user.role === 'admin'` | `403 AUTH_INSUFFICIENT_ROLE` |
| Service (bắt buộc, không bỏ) | `actor.status === 'active'` — admin bị khoá mà token còn hạn vẫn phải bị chặn | `403 AUTH_ACCOUNT_SUSPENDED` |
| Service | — không có kiểm quyền theo hàng: mọi truy vấn là tổng hợp toàn hệ thống | — |

**Vì sao phải chặn trước khi truy vấn**: các câu tổng hợp ở đây là những câu nặng nhất hệ thống (§11). Chạy chúng rồi mới kiểm quyền vừa rò rỉ thời gian phản hồi vừa cho phép người không có quyền tiêu tài nguyên DB.

## 6. State machine

**Module không sở hữu trạng thái nào** — không có bảng, nên không có vòng đời để vẽ. Nhưng nó **đọc trạng thái của bốn máy trạng thái khác**, và đó mới là thứ cần vẽ, vì mỗi mũi tên dưới đây là một sự kiện làm số trên dashboard nhảy:

```
   User.status                 ClassSession.status                PayrollPeriod.status
   pending ─► active           scheduled ─► in_progress           draft ─► finalized ─► paid
        │        │                   ─► completed_pending             │         │        │
        │        ▼                        ─► approved / rejected      │         │        │
        └──► suspended ◄─► active              │                      │         │        │
             │    │                            │                      │         │        │
             ▼    ▼                            ▼                      ▼         ▼        ▼
        pendingUsers                  sessionsPendingReview        payrollThisMonth (gồm trạng thái nào? chưa chốt)
        activeTeachers/Students

   StudentInvoice.status                          TuitionPayment
   unpaid ─► partially_paid ─► paid                (INSERT, không có state)
        └──────────► void                                │
             │              │                            ▼
             ▼              ▼                     revenueThisMonth
        unpaidInvoices   outstandingAmount  (void bị loại — INV-DASH-05)
```

Đọc sơ đồ này theo chiều phụ thuộc: **module Dashboard không có quyền tự định nghĩa lại bất kỳ mũi tên nào ở trên.** Nếu module Users thêm `rejected` (C3), nếu module Billing đổi ngưỡng `partially_paid`, nếu Payroll đổi ranh giới kỳ — thì các ô ở dưới đổi nghĩa mà không cần sửa một dòng nào trong module này. Đó chính là lý do §16 kết luận module phải làm cuối cùng.

Vòng đời duy nhất thuộc về module là **vòng đời của endpoint**, và cả hai đang ở nửa trái:

```
   proposed ──► defined (đường dẫn) ──► defined (payload) ──► implemented
      │                 │
      │                 └── GET /admin/dashboard/stats  ← đang ở đây (đường dẫn có, payload chưa)
      └── GET /admin/monitoring/gemini                  ← đang ở đây (chỉ mới được ghi nhận là còn thiếu)
```

## 7. Transaction boundary

Không có ghi ⇒ không có transaction ghi. Nhưng **vẫn cần một transaction đọc**, vì lý do ở INV-DASH-04.

- Toàn bộ các câu tổng hợp của **một** request chạy trong **một** transaction chỉ-đọc ở mức `REPEATABLE READ` — để mọi ô nhìn thấy cùng một ảnh chụp. Nếu để mỗi câu chạy độc lập ở `READ COMMITTED`, một lần ghi nhận thanh toán xảy ra giữa hai câu sẽ cho ra response tự mâu thuẫn (đếm còn 5 hoá đơn chưa trả nhưng tổng công nợ đã trừ mất khoản vừa thu) — người đọc sẽ kết luận là dashboard sai, và họ đúng.
- Cách tương đương và rẻ hơn: gom tất cả thành **một câu SQL duy nhất** dùng nhiều subquery/CTE — một câu lệnh luôn chạy trên một ảnh chụp nhất quán, không cần transaction tường minh. Đây là cách được đề xuất (§11).
- Không khoá gì (`FOR UPDATE`, `FOR SHARE` bị cấm ở module này) — dashboard không được phép làm chậm nghiệp vụ đang chạy.
- Đặt `statement_timeout` riêng cho các truy vấn của module (đề xuất 2 giây, §11): một câu tổng hợp bị kẹt không được kéo cả trang admin xuống.
- Nếu về sau dùng materialized view: lệnh làm mới chạy trong transaction riêng của nó, bằng `REFRESH ... CONCURRENTLY` để không khoá người đọc.

## 8. Idempotency & concurrency

`GET` là thao tác an toàn và idempotent theo định nghĩa: gọi lại không đổi trạng thái (INV-DASH-03), chỉ có thể trả số khác vì dữ liệu đã đổi.

**Vấn đề đồng thời duy nhất của module là cache stampede.** Nếu bật cache (§11) và nhiều admin cùng mở dashboard đúng lúc cache hết hạn, tất cả cùng lao vào tính lại bộ truy vấn nặng nhất hệ thống. Xử lý: **single-flight** (chỉ một tiến trình tính, những request khác chờ và dùng chung kết quả) + rải TTL ngẫu nhiên vài giây để các khoá không hết hạn cùng lúc.

**Số liệu đổi giữa lúc xem dashboard và lúc bấm sang màn chi tiết** — không phải vi phạm INV-DASH-01. Invariant nói "tại cùng một thời điểm"; giữa hai request cách nhau vài giây, một admin khác có thể đã duyệt một tài khoản. Cách xử lý đúng: hiển thị `generatedAt` để người dùng biết số liệu tính lúc nào, và **không** cố đóng băng số. Cách xử lý sai: cache lâu để "hai màn khớp nhau" — nó biến sai lệch tạm thời thành sai lệch cố định.

**Không có Idempotency-Key, không có ETag/If-None-Match** (không được API_CONVENTIONS.md định nghĩa). Nếu sau này muốn giảm tải polling của dashboard thì ETag là hướng đúng, nhưng phải chốt ở tầng conventions cho toàn hệ thống.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không có token / token hỏng | 401 | `AUTH_TOKEN_INVALID` | có trong API_ERROR_CODES.md (⚠️ không có trong `_FACTS.md` — spec 01 §16) |
| Access token hết hạn | 401 | `AUTH_TOKEN_EXPIRED` | có |
| Token của teacher/student | 403 | `AUTH_INSUFFICIENT_ROLE` | có |
| Admin đang `suspended` | 403 | `AUTH_ACCOUNT_SUSPENDED` | có |
| Tham số sai (nếu về sau có tham số) | 400 | `VALIDATION_ERROR` | có |
| Truy vấn tổng hợp vượt `statement_timeout` | 500 | ⚠️ **không có mã** | Không có code cho timeout/quá tải trong registry. Không bịa → §16 |
| `GET /admin/monitoring/gemini` — mọi nhánh | — | ⛔ `AI_QUOTA_EXCEEDED` (429), `AI_KEY_INVALID` (401), `AI_GRADING_FAILED` (502) đều **proposed, not agreed** (API_ERROR_CODES.md ghi rõ: blocked on Gemini key model, UC-A-005) | **Chưa dùng được mã nào** |

Không có nhóm `DASHBOARD_*` trong registry — và ở module này điều đó **không phải thiếu sót**: dashboard không có nhánh lỗi nghiệp vụ nào của riêng nó (không có "không tìm thấy", không có "trạng thái sai"), chỉ có lỗi xác thực/phân quyền dùng chung. Ngoại lệ duy nhất là nhánh quá tải ở trên.

## 10. Side effect & notification

**Không có.** Module không sinh `Notification` nào (không type nào trong ENTITY_NOTIFICATION.md liên quan tới báo cáo), không gửi mail, không gọi webhook, không ghi audit, không đụng bảng nào.

Một side effect **kỹ thuật** duy nhất nếu bật cache: ghi vào cache store. Không được coi đây là ngoại lệ của INV-DASH-03 (không có trạng thái nghiệp vụ nào bị đổi) nhưng phải nhớ khi debug "vì sao số không đổi sau khi tôi duyệt".

Chiều ngược lại thì đáng chú ý hơn: **module này là nơi hậu quả của module khác hiện ra**. Ô `sessionsPendingReview` chính là hàng chờ của module Sessions; ô `pendingUsers` là hàng chờ của module Users. Nếu một module ghi sai trạng thái, triệu chứng đầu tiên người dùng thấy sẽ là "số trên dashboard sai" — và điều tra sẽ bắt đầu nhầm chỗ, ở đây, thay vì ở module gây lỗi. §14 vì vậy yêu cầu một job đối chiếu định kỳ, để phân biệt "dashboard tính sai" với "dữ liệu nguồn sai".

## 11. Index & query

Đây là module **dễ N+1 nhất và có truy vấn chậm nhất** hệ thống, vì một request duy nhất chạm vào 5–6 bảng và luôn quét trên toàn bộ dữ liệu chứ không lọc theo một người dùng.

### 11.1 Bốn quy tắc bắt buộc

1. **Không bao giờ lấy danh sách rồi đếm ở tầng ứng dụng.** `findMany().length` trên `StudentInvoice` là kéo toàn bộ bảng hoá đơn qua mạng để lấy một số nguyên. Dùng `COUNT`/`SUM` ở DB.
2. **Gom mọi ô trên cùng một bảng vào MỘT câu.** Bốn ô đếm hoá đơn theo trạng thái ⇒ **một** câu `SELECT status, COUNT(*), SUM(...) FROM "StudentInvoice" GROUP BY status`, không phải bốn câu `COUNT` riêng. Tương tự `User`: **một** câu `GROUP BY role, status` phục vụ cả bốn ô người dùng. Bốn ô → một lần quét.
3. **Gom nhiều bảng vào một round trip** bằng một câu có nhiều subquery vô hướng (hoặc CTE). Lợi ích kép: giảm 6 round trip xuống 1, **và** đảm bảo INV-DASH-04 mà không cần transaction tường minh (§7).
4. **Cấm mọi vòng lặp theo bản ghi.** Mẫu N+1 kinh điển ở module này: lấy danh sách giáo viên rồi lặp từng người để cộng lương kỳ này (1 + N câu, N tăng theo số giáo viên); hoặc lấy danh sách hoá đơn rồi lặp từng cái để cộng `TuitionPayment`. Thay bằng **một** câu `GROUP BY teacherId` / `GROUP BY invoiceId`. Cấm dùng `include` quan hệ của ORM trong module này — dashboard chỉ cần số, không cần đối tượng.

### 11.2 Index cần cho từng ô

```
User:           INDEX (role, status)                                   -- một câu GROUP BY role,status phục vụ 4 ô
ClassSession:   INDEX (status)  hoặc  partial:
                CREATE INDEX ... ON "ClassSession"(id) WHERE status='completed_pending'
                                                                       -- tập chờ duyệt luôn nhỏ so với tổng buổi dạy
                                                                       -- (spec 04 §11 đã yêu cầu index này — dùng lại, KHÔNG tạo trùng)
StudentInvoice: INDEX (status)                                         -- GROUP BY status
StudentInvoice: partial INDEX WHERE status IN ('unpaid','partially_paid')
                                                                       -- SUM(totalAmount - paidAmount): chỉ quét phần còn nợ,
                                                                          bỏ qua toàn bộ hoá đơn đã trả (phần lớn bảng theo thời gian)
StudentInvoice: INDEX ("dueDate")                                      -- chỉ khi có ô "quá hạn"
TuitionPayment: INDEX ("paidAt")                                       -- doanh thu theo tháng; cân nhắc BRIN khi bảng lớn và
                                                                          dữ liệu ghi theo thứ tự thời gian (BRIN nhỏ hơn B-tree nhiều lần)
PayrollPeriod:  INDEX (status)                                         -- đã có ở spec 05 §11 — dùng lại
PayrollPeriod:  INDEX ("periodStart", "periodEnd")                     -- lọc kỳ giao với tháng hiện tại
```

**Index thuộc về migration của module sở hữu bảng, không thuộc migration của module này** (§12) — nếu mỗi module tự tạo index cho nhu cầu của mình sẽ sinh ra các index trùng lặp gần giống nhau, tốn ghi và gây nhầm lẫn khi tối ưu.

### 11.3 Materialized view: chưa, và mốc để cân nhắc

**Đề xuất KHÔNG dùng materialized view ở v1.** Ở quy mô hiện tại (hàng trăm user, hàng nghìn hoá đơn/buổi dạy), các câu `GROUP BY` có index ở trên chạy vài mili giây; MV chỉ thêm một tầng dữ liệu cũ và **trực tiếp đe doạ INV-DASH-01** (dashboard đọc MV, màn chi tiết đọc bảng gốc ⇒ hai nguồn khác nhau ⇒ lệch nhau đúng bằng độ trễ làm mới — chính là loại lỗi mà invariant số một sinh ra để chặn).

Mốc cân nhắc MV — khi **cả hai** điều sau đúng: (a) một câu tổng hợp vượt **300–500ms** đo được ở production, và (b) bảng nguồn vượt cỡ **1 triệu hàng** (hai ứng viên sớm nhất là `TuitionPayment` và `ClassSession`, vì cả hai chỉ tăng theo thời gian, không bao giờ co lại). Khi đó: `REFRESH MATERIALIZED VIEW CONCURRENTLY` theo lịch, **bắt buộc** trả `generatedAt`, và phải phát biểu lại INV-DASH-01 kèm "trong phạm vi độ trễ làm mới" — tức là hạ chuẩn một cách công khai, có ghi vào spec, chứ không âm thầm.

### 11.4 Cache: chưa, và nếu bật thì bật thế nào

**Đề xuất KHÔNG cache ở v1** — vì hai lý do: các ô là **hàng chờ việc** (admin duyệt một tài khoản rồi quay lại thấy con số cũ sẽ tưởng thao tác thất bại và bấm lại), và các ô tiền là số liệu tài chính (số cũ ở đây tạo ra quyết định sai).

Điều kiện để bật: p95 của endpoint vượt **500ms** đo được ở production. Khi bật, bắt buộc đủ 5 điều:

| # | Yêu cầu | Vì sao |
|---|---|---|
| 1 | **TTL 30–60 giây**, không hơn | 60s là nhịp đã tồn tại trong hệ thống (polling thông báo, DEBT-002) nên người dùng đã quen mức trễ đó; dài hơn thì hàng chờ việc trở nên không đáng tin |
| 2 | Cache **cả response**, không cache từng ô | INV-DASH-09 — trộn ô mới với ô cũ tạo ra response tự mâu thuẫn, tệ hơn là số cũ đồng nhất |
| 3 | Trả `generatedAt` | Người dùng phải phân biệt được "số đúng bây giờ" với "số lúc HH:mm" |
| 4 | **Single-flight** + TTL rải ngẫu nhiên | Chống stampede (§8) |
| 5 | **Vô hiệu hoá theo hành động** cho các ô hàng chờ việc | Sau `approve`/`suspend`/`approve session`/`record payment`, xoá cache ngay — nếu không, đúng nhóm người dùng vừa thao tác sẽ là nhóm thấy số sai. (Nếu không làm được điều 5 thì TTL phải xuống 10–15 giây cho nhóm ô hàng chờ việc.) |

Cả TTL lẫn cơ chế vô hiệu hoá đều **chưa được tài liệu nào chốt** → §16.

### 11.5 Bảo vệ

`statement_timeout` 2 giây cho các truy vấn của module (§7) và rate limit nhẹ theo user cho endpoint (dashboard thường tự làm mới định kỳ ở FE). Một admin giữ tab dashboard mở với auto-refresh 10 giây là đủ để giữ CPU của DB ở mức cao nếu truy vấn chưa được tối ưu.

## 12. Migration & seed

**Module này không sở hữu migration nào** — 0 bảng, 0 cột, 0 enum. Đây là hệ quả trực tiếp của §0 và là một tính chất tốt: dashboard có thể bị viết lại hoàn toàn mà không cần một migration nào.

Nó chỉ **đặt yêu cầu index** lên migration của module khác (§11.2). Quy tắc: index cho ô dashboard được thêm vào migration của module sở hữu bảng, kèm chú thích rõ "phục vụ `GET /admin/dashboard/stats`", để lần sau ai đó dọn index không xoá nhầm.

**Seed — phần quan trọng nhất của module.** Cần một **bộ dữ liệu đối chứng (golden dataset)** có số biết trước cho từng ô, dùng chung cho cả test dashboard lẫn test các màn chi tiết (đây là điều kiện để test INV-DASH-01 có nghĩa). Bộ dữ liệu phải có đủ **các mẫu biên**, vì mọi lỗi lệch số đều nằm ở đây:

| Mẫu biên | Kiểm điều gì |
|---|---|
| 1 hoá đơn `void` có `totalAmount` lớn | INV-DASH-05 — nếu bị tính, tổng công nợ sẽ sai rõ rệt |
| 1 hoá đơn `partially_paid` | Ranh giới định nghĩa "chưa trả" (§16) — ô này lộ ngay quyết định chưa chốt |
| 1 hoá đơn `paid` đúng bằng `totalAmount` | Ngưỡng `paidAmount >= totalAmount` |
| 1 thanh toán có `paidAt` **ngày cuối tháng trước** và 1 cái **ngày đầu tháng này** | INV-DASH-10 — ranh giới nửa mở; đây là chỗ lệch múi giờ hiện ra |
| 1 user mỗi trạng thái × mỗi role (kể cả `suspended`) | INV-DASH-12 |
| 1 buổi dạy ở **mỗi** trạng thái trong 5 trạng thái | Ô hàng chờ không được đếm nhầm `approved`/`rejected` |
| 1 kỳ lương ở mỗi `draft`/`finalized`/`paid` | Ô lương — trạng thái nào được tính (§16) |
| 1 giáo viên **không có** buổi dạy nào, 1 học sinh **không có** hoá đơn nào | INV-DASH-07 — `SUM` trên tập rỗng phải là 0, không null |
| Hệ thống **rỗng hoàn toàn** (bộ seed thứ hai) | Toàn bộ ô = 0, không lỗi, không null |

## 13. Security & rate limit

| Chủ đề | Quy tắc |
|---|---|
| Phạm vi | Chỉ admin `active` (§5). Đây là endpoint phơi bày **bức tranh tài chính toàn hệ thống** trong một request duy nhất — doanh thu, công nợ, chi lương. Một rò rỉ ở đây tương đương rò rỉ cả bảng hoá đơn |
| Dữ liệu không được trả | Danh sách bản ghi, email, tên, id cá nhân (INV-DASH-11). Nếu FE cần "5 hoá đơn quá hạn gần nhất" thì đó là một endpoint danh sách có phân trang, không phải nhồi vào dashboard |
| Khoá Gemini | INV-DASH-13 — không trả khoá, không trả 4 ký tự cuối, không trả độ dài. Nếu mô hình khoá là "mỗi giáo viên một khoá" (Quyết định 4) thì màn monitoring còn phơi bày *ai đang dùng bao nhiêu*, tức là dữ liệu về hiệu suất cá nhân — cần chốt ai được xem |
| Rate limit | Đề xuất giới hạn theo user cho endpoint nặng này (§11.5). ⚠️ Chưa có mã lỗi cho 429 (spec 01 §16) |
| Log | Không đổ toàn bộ payload số liệu tài chính vào log dùng chung; log truy vấn chậm thì log **kế hoạch thực thi**, không log kết quả |
| Từ chối sớm | Kiểm quyền **trước** khi chạy truy vấn (§5) — vừa là bảo mật vừa là chống lạm dụng tài nguyên |

## 14. Observability

**Đo — theo từng ô, không chỉ theo endpoint**: đặt tên metric cho từng câu tổng hợp (`dashboard.query.users`, `.invoices`, `.payments`, `.payroll`, `.sessions`) và đo p95/p99 riêng. Lý do: khi endpoint chậm đi sau vài tháng, nguyên nhân gần như chắc chắn là **một** ô (thường là ô cộng `TuitionPayment` theo tháng, vì bảng đó chỉ tăng); đo gộp cả endpoint sẽ chỉ cho biết "chậm" mà không biết chậm ở đâu.

- p95/p99 toàn endpoint; **cảnh báo khi > 2 giây** (chạm `statement_timeout`).
- Log truy vấn > 500ms **kèm kế hoạch thực thi** — đây là ngưỡng cân nhắc materialized view ở §11.3, cần số liệu thật để quyết chứ không phải cảm tính.
- Nếu bật cache: tỉ lệ hit/miss, số lần stampede bị chặn bởi single-flight, tuổi trung bình của dữ liệu được phục vụ (`now − generatedAt`).
- **Job đối chiếu định kỳ kiểm INV-DASH-01 trên production**: chạy dashboard và các truy vấn của màn chi tiết trong cùng một transaction rồi so từng cặp; lệch ⇒ cảnh báo. Đây là invariant duy nhất trong hệ thống **đáng theo dõi liên tục ở production**, vì nó vỡ một cách âm thầm khi module nguồn đổi định nghĩa trạng thái mà không ai sửa dashboard (§10) — không có test nào bắt được điều đó ở thời điểm biên dịch.
- Đếm số lần gọi endpoint theo admin — phát hiện tab auto-refresh quên đóng.
- Kích thước các bảng nguồn theo thời gian: đầu vào cho quyết định MV/partition ở §11.3.

## 15. Test matrix

Đây là **invariant gate**: mọi INV ở §4 phải có ít nhất một dòng ở đây. Thiếu một dòng = không merge.

| INV | Loại test | Mô tả |
|---|---|---|
| INV-DASH-01 | DB thật (test đối chiếu) | Với bộ dữ liệu đối chứng (§12): gọi `/admin/dashboard/stats` **và** từng endpoint chi tiết tương ứng (`/admin/users?status=pending`, `?role=teacher&status=active`, `/admin/sessions/pending`, `/admin/invoices?status=...`, `/admin/payroll`) → assert **từng cặp** bằng nhau. Lặp lại **sau mỗi thao tác ghi**: duyệt 1 user → cả hai giảm/tăng cùng nhau; ghi nhận 1 thanh toán → ô đếm và ô tiền đổi khớp với màn hoá đơn; huỷ (void) 1 hoá đơn → cả hai loại nó ra |
| INV-DASH-02 | service | Assert dashboard và màn chi tiết dùng **chung một** hàm/khối điều kiện dựng bộ lọc (kiểm bằng test gọi cùng builder), không có hai bản sao biểu thức. Test hồi quy: đổi định nghĩa ở một chỗ → **cả hai** phía đổi theo |
| INV-DASH-03 | DB thật | Chụp checksum/số hàng của **mọi** bảng trước và sau 100 lần gọi cả hai endpoint → assert không đổi. Chạy endpoint bằng connection chỉ-đọc → vẫn thành công (chứng minh không có đường ghi) |
| INV-DASH-04 | DB thật (concurrency) | Trong lúc request dashboard đang chạy, một transaction khác ghi nhận thanh toán rồi commit → assert response trả về **nhất quán nội bộ** (ô đếm và ô tiền cùng phản ánh trạng thái trước, hoặc cùng phản ánh sau; không lẫn lộn). Lặp nhiều lần để bắt đua |
| INV-DASH-05 | DB thật | Seed 1 hoá đơn `void` giá trị lớn → assert `unpaidInvoices` và `outstandingAmount` **không** đổi so với khi không có nó. Void một hoá đơn `unpaid` đang tính → cả ô đếm lẫn ô tiền giảm đúng bằng phần của nó |
| INV-DASH-06 | DB thật | Seed các giá trị có phần thập phân dễ sinh sai số dấu phẩy động (ví dụ nhiều khoản `0.10`, `1_500_000.55`) → assert tổng khớp **chính xác** với tổng tính bằng Decimal; assert response giữ đúng 2 chữ số thập phân và không xuất hiện dạng khoa học |
| INV-DASH-07 | integration | Chạy trên DB rỗng (bộ seed thứ hai) → mọi ô đếm `= 0`, mọi ô tiền `= "0.00"`, không field nào `null`, HTTP 200 (không phải 404, không phải 500) |
| INV-DASH-08 | integration | Token teacher → 403 `AUTH_INSUFFICIENT_ROLE`; token student → 403; không token → 401; admin `suspended` còn token hạn → 403 `AUTH_ACCOUNT_SUSPENDED`. Assert **không** truy vấn tổng hợp nào chạy ở các nhánh này (spy/đếm query) |
| INV-DASH-09 | integration | Chỉ chạy khi bật cache: gọi 2 lần trong TTL → hai response **giống hệt nhau kể cả `generatedAt`**; sau TTL → `generatedAt` mới. Assert không tồn tại response trộn ô cũ ô mới (ghi dữ liệu giữa hai lần gọi, kiểm tính nhất quán nội bộ) |
| INV-DASH-10 | DB thật | Seed thanh toán tại **đúng ranh giới**: `23:59:59` ngày cuối tháng trước, `00:00:00` ngày đầu tháng này, `00:00:00` ngày đầu tháng sau → assert mỗi bản ghi được đếm **đúng một lần** trong đúng một tháng, không trùng, không mất. Lặp với dữ liệu quanh mốc đổi ngày theo múi giờ VN để lộ quyết định múi giờ chưa chốt (§16) |
| INV-DASH-11 | integration | Serialize response → assert không chứa `passwordHash`, không chứa `@` (email), không chứa mảng bản ghi; mọi field là số hoặc chuỗi số hoặc timestamp |
| INV-DASH-12 | DB thật | Assert tổng các ô đếm theo trạng thái của một bảng **bằng** `COUNT(*)` toàn bảng (không giá trị enum nào bị bỏ sót). Test hồi quy: thêm một giá trị enum mới vào `User.status` (ví dụ `rejected` — C3) → test **phải fail**, buộc người thêm enum phải cập nhật dashboard |
| INV-DASH-13 | integration | (Khi endpoint monitoring được mở khoá) Serialize response → assert không chứa khoá Gemini, không chứa tiền tố/hậu tố của khoá; assert khoá không xuất hiện trong log của request đó |
| INV-DASH-14 | integration | Ô mà nguồn chưa tồn tại (AI usage) **không** trả `0`: hoặc vắng mặt khỏi payload, hoặc mang dấu hiệu "chưa có dữ liệu" đã chốt. Assert không có ô nào trả `0` trong khi bảng nguồn của nó chưa được tạo |

Bổ sung ngoài invariant gate: test **số lượng câu truy vấn** cho một request dashboard không vượt ngưỡng (ví dụ ≤ 3) — đây là cách duy nhất bắt được N+1 quay lại sau một lần refactor; test envelope lỗi đúng shape phẳng của API_CONVENTIONS.md.

## 16. Chưa chốt

| Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|
| **⛔ THỨ TỰ THI CÔNG — module này phải làm CUỐI CÙNG.** Mọi ô là hàm của bảng do module khác sở hữu (§1, §6). Làm sớm thì phải viết lại, không phải "có thể", mà là chắc chắn: Billing chưa chốt mô hình học phí (Quyết định 1, `INVOICE_*` còn *proposed*), Payroll chưa chốt ranh giới kỳ (Quyết định 3) và đơn vị tính lương (Quyết định 2), Users có thể thêm `rejected` (C3), rates còn mâu thuẫn append-only (C2). Mỗi quyết định trong số đó làm đổi **nghĩa** của ít nhất một ô, và làm đổi **toàn bộ** test đối chiếu ở §15 | Chặn việc code module. Mốc đề xuất: **sau Sprint 7** — ENTITY_PAYROLL_PERIOD.md ghi thẳng "Fills 'monthly payroll' slot in Admin Dashboard **after Sprint 7**". Việc nên làm sớm thay vì code: chốt **danh sách ô** và **biểu thức nguồn** (§3), vì đó là thứ các module khác cần biết để đặt index và giữ INV-DASH-02 | - | trước Sprint 7 |
| **⛔ MONITORING GEMINI BỊ CHẶN KÉP (thực ra là ba lớp).** (1) **Mô hình khoá chưa chốt** — Quyết định 4 (`pages/_INDEX.md`), UC-A-005: khoá dùng chung hay mỗi giáo viên một khoá. Quyết định này định luôn **đơn vị đo** (theo khoá hay theo người) ⇒ định luôn schema và mọi ô của màn hình. (2) **Chưa có dữ liệu AI usage thật** — Gemini chỉ được gọi khi giáo viên chấm bài viết (AI Suggest, Sprint 4, T-GRADE-3); trước đó màn hình không có gì để hiển thị, và không có dữ liệu thật thì không kiểm chứng được ô nào đúng. (3) **`ENTITY_AI_USAGE_LOG.md` là file RỖNG (0 byte)** — bảng nguồn chưa có một field nào được định nghĩa | Chặn toàn bộ màn `/admin/monitoring` (`pages/_INDEX.md` ghi *blocked on: **all of it***). Chặn DTO §3, chặn mọi index, chặn `AI_*` error codes (đang *proposed, not agreed*). **Không code, không viết DTO trước** — mọi thứ viết bây giờ sẽ bị bỏ | - | sau Sprint 4 (có dữ liệu) **và** sau Quyết định 4 |
| **Payload của `GET /admin/dashboard/stats` gồm những ô nào?** API_ADMIN.md chỉ ghi "User stats, financial summary"; `pages/_INDEX.md` ghi route `/admin` *blocked on: stats payload shape* | Chặn §3 (toàn bộ), chặn hợp đồng FE, chặn danh sách index ở §11.2 (không biết ô nào thì không biết cần index nào) | - | trước khi code |
| **"Hoá đơn chưa trả" là `unpaid`, hay `unpaid` + `partially_paid`?** | **Rủi ro số một của INV-DASH-01**: nếu dashboard chọn một cách và màn `/admin/invoices` chọn cách khác thì hai màn lệch nhau vĩnh viễn và không ai coi đó là bug của mình. Chặn cả ô đếm lẫn ô tiền | - | trước khi code, cùng lúc với màn invoices |
| **Doanh thu tính theo `TuitionPayment.paidAt` hay theo kỳ của hoá đơn?** Hai con số khác nhau và cùng có lý: một cái là tiền thực thu, một cái là doanh thu ghi nhận | Chặn ô `revenueThisMonth`; chặn ý nghĩa của mọi so sánh "so với tháng trước" mà FE muốn hiển thị (`root-design-fe.md` §4.1 có mũi tên xu hướng) | - | trước khi code |
| **Kỳ lương "tháng này" gồm trạng thái nào — `draft`, `finalized`, `paid`?** Và ranh giới kỳ có phải tháng dương lịch không (Quyết định 3 chưa chốt) | Chặn ô `payrollThisMonth`. Gồm `draft` = tiền dự kiến; chỉ `paid` = tiền đã chi — hai con số chênh nhau rất xa và dùng cho hai mục đích khác nhau | - | trước Sprint 7 |
| **Múi giờ cho ranh giới tháng: UTC hay giờ Việt Nam (UTC+7)?** API_CONVENTIONS.md nói mọi DateTime là UTC và **FE chịu trách nhiệm đổi sang giờ địa phương** — nhưng ở đây việc gộp nhóm xảy ra ở **server** | Chặn INV-DASH-10 và test tương ứng. Chênh 7 tiếng làm các giao dịch từ 00:00–07:00 ngày 1 rơi sang tháng trước — đủ để làm lệch báo cáo doanh thu cuối tháng và làm dashboard khác với cảm nhận của người dùng | - | trước khi code ô theo tháng |
| **Có bật cache không, TTL bao nhiêu, vô hiệu hoá theo hành động thế nào?** (§11.4 đề xuất: không cache ở v1; nếu bật thì 30–60s + single-flight + `generatedAt` + invalidate sau hành động ghi) | Chặn INV-DASH-09 và dòng test tương ứng. Chọn sai làm hàng chờ việc hiển thị số cũ ngay sau khi admin vừa xử lý | - | trước khi tối ưu (không chặn v1) |
| **`generatedAt` đặt ở đâu trong envelope?** API_CONVENTIONS.md chỉ có `data` và `meta`, mà `meta` đang dành cho phân trang | Chặn shape response; là quyết định cấp conventions, không phải cấp module — nếu đặt bừa vào `meta` sẽ tạo tiền lệ cho toàn hệ thống | - | trước khi code |
| **`RBAC_MATRIX.md` không có dòng nào cho "Dashboard".** Quyền hiện được suy gián tiếp từ các bảng nguồn (§5) | Chặn tính đầy đủ của ma trận quyền — một endpoint phơi bày toàn bộ tài chính mà không có dòng nào trong tài liệu quyền chính thức | - | trước go-live |
| **Không có mã lỗi cho nhánh quá tải / timeout** (§9) | Chặn hành vi khi truy vấn vượt `statement_timeout`; hiện chỉ có thể trả 500 chung chung | - | trước go-live |
| **Ô nào là "hàng chờ việc" và có cần độ tươi cao hơn ô khác không?** `pages/_INDEX.md`: "KPI tiles double as the work queue" | Chặn thiết kế cache (§11.4 điều 5) và chặn quyết định TTL phân nhóm | - | cùng lúc với quyết định cache |
| **C4 (DOC-004) — HSK 1–9 hay 1–6.** Chỉ ảnh hưởng nếu dashboard có ô phân bố theo `hskLevelGoal`/`hskLevel` | Chặn số lượng nhóm của ô đó (9 nhóm hay 6); nếu không có ô nào theo HSK thì không chặn gì | - | chỉ khi chốt có ô HSK |
| **C3 — nếu `User.status` thêm `rejected`** thì ô `pendingUsers` đổi nghĩa (hồ sơ bị từ chối hiện đang kẹt ở `pending` và **đang được đếm** vào hàng chờ duyệt) | Chặn INV-DASH-12 và độ chính xác của ô hàng chờ quan trọng nhất của admin: hôm nay con số này **phình lên** vì chứa cả hồ sơ đã bị từ chối mà không có cách nào đánh dấu | - | cùng lúc với ADR vòng đời tài khoản |

*(C1 không chạm module này — dashboard không trả tên người dùng. C2 chạm gián tiếp: nếu rate không thực sự append-only thì cách đọc "mức đang áp dụng" đổi, làm đổi mọi ô tiền suy ra từ rate.)*
