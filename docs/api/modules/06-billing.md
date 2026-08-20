# SPEC 06 — Billing (StudentTuitionRate · StudentInvoice · TuitionPayment)

---
module: billing
status: proposed
blocked_by: C2 (ADR-008 append-only vs ENTITY_STUDENT_TUITION_RATE "set effectiveTo on current") — CHẶN §4.1 · Q-BILL-1 (biểu diễn tiền Decimal/VND) — CHẶN TOÀN MODULE · Q-BILL-2 (mô hình học phí, FEATURES_ADMIN A-INV-1) · Q-BILL-3 (batch partial-failure) · nhóm mã lỗi INVOICE_* và RATE_* *proposed, not agreed* · Q-BILL-5 (void đã có payment → refund?) · Q-BILL-6 (overpayment)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module chịu trách nhiệm toàn bộ dòng tiền **thu của học viên**: đặt mức học phí (`StudentTuitionRate`, append-only), phát hành hoá đơn (`StudentInvoice`), ghi nhận thanh toán (`TuitionPayment`). Ba bảng nằm chung một module vì chúng chia sẻ **một ranh giới transaction**: ghi một payment vừa INSERT bảng con vừa UPDATE tổng tiền và trạng thái của bảng cha, và số tiền trên hoá đơn được quyết định bởi bảng rate tại thời điểm phát hành — tách ra ba module là tách một transaction thành ba, tức là chấp nhận sai số tiền.

Ranh giới **bắt đầu** ở `StudentTuitionRate` (admin đặt mức) và **kết thúc** ở `StudentInvoice.status ∈ {paid, void}`. Module này KHÔNG đụng lương giáo viên (`TeacherPayRate`, `PayrollPeriod` — thuộc spec 05), KHÔNG duyệt session, KHÔNG tạo/sửa `User`, KHÔNG gọi cổng thanh toán nào (VietQR chỉ là **chuỗi đối chiếu** lưu ở `transactionReference`, không phải tích hợp API).

⚠ Module này là module **rủi ro tài chính cao nhất** của hệ thống: nó là nơi duy nhất có một trường tổng hợp (`paidAmount`) phải luôn khớp với một tập bản ghi con, và là nơi duy nhất có hai admin có thể ghi đồng thời lên cùng một hàng tiền.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `StudentTuitionRate` | Đọc + INSERT | **Chỉ INSERT.** Không UPDATE, không DELETE (ADR-008) — ⚠ C2 |
| `StudentInvoice` | Đọc + INSERT + UPDATE **hạn chế** | UPDATE chỉ được chạm 3 field: `paidAmount`, `status`, `updatedAt`. Không endpoint nào sửa `totalAmount`, `periodStart`, `periodEnd`, `studentId`, `dueDate` sau khi tạo (INV-BILLING-21) |
| `TuitionPayment` | Đọc + INSERT | **Chỉ INSERT.** Bất biến tuyệt đối (INV-BILLING-23) |
| `User` | Đọc | Kiểm `role = 'student'` cho `studentId`; kiểm `role = 'admin'` + `status = 'active'` cho `recordedBy`; tên hiển thị. ⚠ C1 |
| `Notification` | INSERT | Type `new_invoice` gửi student khi tạo hoá đơn. **Chỉ một type duy nhất** — không có type cho payment, không có type cho void (§10) |
| `ClassEnrollment` | — | **Không chạm** ở mô hình `monthly` hiện tại. Sẽ phải chạm nếu Q-BILL-2 chốt theo per-class |
| `PayrollPeriod` / `TeacherPayRate` | — | Không chạm. Tiền vào và tiền ra là hai module độc lập, không có ràng buộc chéo |
| *(bảng audit)* | INSERT | Chưa có ENTITY doc — Q-BILL-11. Payment và void là chứng từ tài chính, bắt buộc có audit |

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| POST | `/api/v1/admin/tuition-rates` | admin | Tạo mức học phí mới cho student (append) | **defined** (API_ADMIN.md) |
| GET | `/api/v1/admin/tuition-rates` | admin | List mức hiện hành + lịch sử | **PROPOSED** — "shape is proposed, not agreed"; blocked on "tuition model undecided" |
| POST | `/api/v1/admin/invoices` | admin | Tạo một hoá đơn | **defined** |
| GET | `/api/v1/admin/invoices` | admin | List hoá đơn, phân trang, lọc | **defined** |
| GET | `/api/v1/admin/invoices/:id` | admin | Chi tiết hoá đơn + `payments[]` nhúng | **defined** |
| PATCH | `/api/v1/admin/invoices/:id/void` | admin | Huỷ hoá đơn — cổng một chiều | **defined** |
| POST | `/api/v1/admin/invoices/:id/payments` | admin | Ghi nhận một lần thanh toán | **defined** |
| GET | `/api/v1/admin/invoices/summary` | admin | Số tổng hợp cho header màn `/admin/invoices` | **PROPOSED** — blocked on: — (không có blocker kỹ thuật, chỉ chưa ai ký) |
| POST | `/api/v1/admin/invoices/batch` | admin | Sinh hàng loạt hoá đơn cho một kỳ | **PROPOSED** — blocked on "partial-failure semantics" (Q-BILL-3) |
| POST | `/api/v1/admin/invoices/batch/preview` | admin | Chạy khô, không ghi gì | **PROPOSED** — blocked on: — |

**Không tồn tại và không được thêm**: `PATCH /admin/tuition-rates/:id`, `DELETE /admin/tuition-rates/:id` (ADR-008 + API_ADMIN.md ghi rõ "no PATCH, no DELETE"), `PATCH /admin/invoices/:id` (sửa số tiền), `DELETE /admin/invoices/:id`, `PATCH|DELETE /admin/invoices/:id/payments/:paymentId` (INV-BILLING-23), bất kỳ endpoint nào ghi thẳng `paidAmount` hoặc `status`.

**SCOPE-BILL-01 — lỗ hổng phạm vi**: `RBAC_MATRIX.md` ghi `StudentInvoice read own = 🔒 Student` và `ENTITY_STUDENT_INVOICE` ghi "Student sees only own invoices (S-BILL-1)", nhưng **không có route nào** hiện thực hoá (không có `API_STUDENT.md` trong bộ tài liệu). Học viên hiện **không có đường nào xem hoá đơn của mình** — trong khi vẫn nhận notification `new_invoice` trỏ tới một trang không tồn tại. Xem Q-BILL-8.

## 3. DTO

Quy ước chung cho toàn module: **mọi giá trị tiền truyền qua HTTP là `string`**, không phải `number` (INV-BILLING-14). Mọi `Date` là `YYYY-MM-DD` (không giờ, không timezone). Mọi `DateTime` là UTC ISO 8601.

### 3.1 `POST /admin/tuition-rates`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `studentId` | uuid | **có** | Tồn tại; `User.role = 'student'`; `User.status = 'active'` |
| `rateAmount` | string decimal | **có** | `> 0`; tối đa 2 chữ số thập phân; `Decimal(10,2)` → trần `99999999.99`; đơn vị VND. Gửi dạng string (vd `"2500000.00"`) |
| `billingCycle` | enum | không | Chỉ nhận `monthly`. Mặc định `monthly`. Giá trị khác → 400 (Q-BILL-2) |
| `effectiveFrom` | Date | **có** | Phải **lớn hơn hẳn** `MAX(effectiveFrom)` hiện có của student đó (INV-BILLING-05) |

**Không nhận**: `effectiveTo` (⚠ C2 — nếu C2 chốt theo ENTITY doc thì DTO này phải đổi), `id`, `createdAt`, `updatedAt`.

**Response 201**

```json
{ "data": { "rate": {
    "id": "uuid", "studentId": "uuid", "rateAmount": "2500000.00",
    "billingCycle": "monthly", "effectiveFrom": "2026-09-01",
    "effectiveTo": null, "createdAt": "2026-08-19T09:00:00Z" } } }
```

⚠ **C5 (mâu thuẫn envelope, mới)**: `admin-tuition-rates.md` (page contract) ghi "Envelope field: **`data.rate`**" — tức object lồng thêm một cấp. `API_CONVENTIONS.md` ghi envelope là `{ "data": {...} }` với object nằm thẳng trong `data`. Hai cách đọc khác nhau: FE đọc `res.data.rate.rateAmount`, BE theo convention sẽ trả `res.data.rateAmount` → **FE nhận `undefined`, không phải lỗi HTTP**. Spec này tạm theo page contract (`data.rate`) vì đó là bên tiêu thụ, nhưng phải chốt một lần cho toàn hệ thống (Q-BILL-9). `effectiveTo` luôn trả `null` theo ADR-008; giữ field chỉ vì cột tồn tại trong schema.

### 3.2 `GET /admin/tuition-rates` *(PROPOSED)*

**Request (query)**: `page` (int ≥1, default 1) · `limit` (int 1..100, default 20) · `studentId` (uuid, optional — có thì trả toàn bộ lịch sử của student đó) · `activeOnly` (bool, default `true`).

**Response 200**

```json
{
  "data": [
    { "studentId": "uuid", "studentName": "string",
      "current": { "id": "uuid", "rateAmount": "2500000.00", "billingCycle": "monthly", "effectiveFrom": "2026-03-01" },
      "changesCount": 2 }
  ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

`current = null` khi student chưa có mức nào — FE sắp các dòng này **lên đầu** (`admin-tuition-rates.spec.md` §5: "These rows sort to the top", §10: "Do not sort students with no rate to the bottom"). Khi truyền `studentId` + `activeOnly=false` → trả mảng lịch sử đầy đủ `ORDER BY effectiveFrom DESC`, mỗi phần tử thêm `isCurrent: boolean` (**dẫn xuất lúc đọc, không lưu cột**).

⚠ Endpoint này phải trả **cả student chưa có rate** — tức nguồn dữ liệu là bảng `User WHERE role='student'` LEFT JOIN rate, không phải bảng rate. Nếu implement từ bảng rate thì dòng cần hành động nhất sẽ biến mất khỏi màn hình.

### 3.3 `POST /admin/invoices`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `studentId` | uuid | **có** | Tồn tại; `role = 'student'`; `status = 'active'` |
| `periodStart` | Date | **có** | Ngày lịch |
| `periodEnd` | Date | **có** | `>= periodStart`; độ dài kỳ ≤ 366 ngày |
| `dueDate` | Date | **có** | `>= periodStart` (INV-BILLING-29). Đề xuất mặc định `periodEnd + 7 ngày` nếu client bỏ trống — **chưa chốt** (Q-BILL-10) |
| `totalAmount` | string decimal | **không** | Bỏ trống → lấy từ rate tại `periodStart` (INV-BILLING-01). Có → **ghi đè**; `> 0`, ≤ 2 chữ số thập phân, `Decimal(12,2)` |

**Header đề xuất**: `Idempotency-Key: <uuid>` (§8.3; chưa có trong API_CONVENTIONS.md → Q-BILL-4).

⚠ `totalAmount` ghi đè được là suy ra từ `ENTITY_STUDENT_TUITION_RATE`: "System uses active rate as **default** `totalAmount`" — chữ *default* hàm ý sửa được. Nhưng ghi đè khiến hoá đơn **không còn giải thích được bằng rate nào** (bảng `StudentInvoice` không có cột `rateId`, không có cột `rateAmountSnapshot`) → mất khả năng đối soát. Xem Q-BILL-7.

**Response 201**

```json
{ "data": { "invoice": {
    "id": "uuid", "studentId": "uuid", "studentName": "string",
    "periodStart": "2026-09-01", "periodEnd": "2026-09-30",
    "totalAmount": "2500000.00", "paidAmount": "0.00",
    "outstandingAmount": "2500000.00", "status": "unpaid",
    "dueDate": "2026-10-07", "createdAt": "2026-08-19T09:00:00Z" } } }
```

`outstandingAmount = totalAmount − paidAmount`, **dẫn xuất lúc đọc, không lưu cột** (INV-BILLING-16). Lý do phải trả ra: FE cần nó để giới hạn ô nhập số tiền ở form ghi payment; bắt FE tự trừ hai string decimal là mời gọi phép trừ float.

### 3.4 `GET /admin/invoices`

**Request (query)**: `page` · `limit` · `studentId` (uuid) · `status` (`unpaid`|`partially_paid`|`paid`|`void`, cho phép lặp) · `periodFrom` / `periodTo` (Date, lọc theo `periodStart`) · `dueBefore` (Date) · `overdue` (bool — `status ∈ {unpaid, partially_paid}` AND `dueDate < <hôm nay theo giờ VN>`, xem Q-BILL-12) · `sort` (`periodStart_desc` default | `periodStart_asc` | `dueDate_asc`).

**Response 200**: `{ "data": [ <object như 3.3, KHÔNG có payments[]> ], "meta": {...} }`.

`paidAmount` đọc thẳng từ cột — **cấm** JOIN `TuitionPayment` để `SUM` lại ở endpoint list (§11). Cột tồn tại chính vì lý do này.

### 3.5 `GET /admin/invoices/:id`

**Response 200** — `payments[]` **nhúng** (page contract `admin-invoice-detail`: "embedded `payments[]`"):

```json
{ "data": { "invoice": {
    "id": "uuid", "studentId": "uuid", "studentName": "string",
    "periodStart": "2026-09-01", "periodEnd": "2026-09-30",
    "totalAmount": "2500000.00", "paidAmount": "1000000.00",
    "outstandingAmount": "1500000.00", "status": "partially_paid",
    "dueDate": "2026-10-07", "createdAt": "2026-08-19T09:00:00Z",
    "payments": [
      { "id": "uuid", "amount": "1000000.00", "paidAt": "2026-09-05T03:00:00Z",
        "paymentMethod": "bank_transfer", "transactionReference": "FT26248xxxx",
        "recordedBy": { "id": "uuid", "name": "string" },
        "createdAt": "2026-09-05T03:12:00Z" } ] } } }
```

`payments[]` sắp `ORDER BY paidAt ASC, id ASC` (thứ tự tất định — hai payment cùng `paidAt` vẫn phải ra cùng thứ tự mọi lần đọc). **Không phân trang `payments[]`**: số payment mỗi hoá đơn là đơn vị đơn vị chục, và tách trang sẽ khiến `Σ payments[].amount` trên màn hình không khớp `paidAmount` — đúng loại lỗi hiển thị bị hiểu nhầm thành lỗi tiền.

### 3.6 `PATCH /admin/invoices/:id/void`

**Request**: `{ "reason": "string" }` — bắt buộc, 5..500 ký tự.

⛔ **Không có cột nào để lưu `reason`.** `ENTITY_STUDENT_INVOICE` không có `voidReason`, không có `voidedAt`, không có `voidedBy`. Huỷ một hoá đơn là hành động tài chính có hệ quả (§4.3) nhưng hệ thống **không lưu được ai huỷ, lúc nào, vì sao** ngoài bảng audit chưa tồn tại. Hai lựa chọn: (a) thêm 3 cột + migration; (b) chỉ ghi audit. → Q-BILL-11.

**Response 200**: object invoice như §3.3 với `status: "void"`. `paidAmount` **giữ nguyên**, không reset về 0 (INV-BILLING-19).

### 3.7 `POST /admin/invoices/:id/payments`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `amount` | string decimal | **có** | `> 0` **và** `<= invoice.totalAmount − invoice.paidAmount` (INV-BILLING-10); ≤ 2 chữ số thập phân; `Decimal(10,2)` |
| `paidAt` | DateTime UTC | **có** | `<= now() + 5 phút` (dung sai lệch đồng hồ). Cho phép lùi quá khứ (khớp sao kê ngân hàng) |
| `paymentMethod` | string | **có** | ≤ 50 ký tự. Cột là `varchar(50)` **tự do** — ENTITY chỉ ghi "e.g. `bank_transfer`, `cash`, `vietqr`". Đề xuất whitelist đúng 3 giá trị đó; chưa chốt (Q-BILL-13) |
| `transactionReference` | string | không | ≤ 200 ký tự. Dùng để đối chiếu sao kê VietQR |

**Không nhận**: `recordedBy` (server lấy từ token — INV-BILLING-24), `invoiceId` (lấy từ path), `id`, `createdAt`.

**Header đề xuất**: `Idempotency-Key: <uuid>` (§8.2).

**Response 201** — trả **cả payment lẫn trạng thái mới của invoice**:

```json
{ "data": {
    "payment": { "id": "uuid", "invoiceId": "uuid", "amount": "1500000.00",
                 "paidAt": "2026-09-20T04:00:00Z", "paymentMethod": "bank_transfer",
                 "transactionReference": "FT26263xxxx",
                 "recordedBy": { "id": "uuid", "name": "string" },
                 "createdAt": "2026-09-20T04:05:00Z" },
    "invoice": { "id": "uuid", "totalAmount": "2500000.00", "paidAmount": "2500000.00",
                 "outstandingAmount": "0.00", "status": "paid" } } }
```

Bắt buộc trả `invoice` trong cùng response: nếu FE phải gọi lại `GET /admin/invoices/:id` để biết trạng thái mới thì có một cửa sổ mà admin thứ hai đã ghi thêm payment → FE hiển thị số dư sai và cho nhập tiếp một số tiền đã không còn hợp lệ.

### 3.8 `GET /admin/invoices/summary` *(PROPOSED)*

**Request (query)**: **đúng bộ filter của §3.4** (`studentId`, `status`, `periodFrom`, `periodTo`, `dueBefore`, `overdue`) trừ `page`/`limit`/`sort`.

```json
{ "data": { "summary": {
    "invoiceCount": 42, "totalInvoiced": "105000000.00",
    "totalPaid": "78500000.00", "totalOutstanding": "26500000.00",
    "countByStatus": { "unpaid": 8, "partially_paid": 5, "paid": 28, "void": 1 },
    "overdueCount": 3, "overdueAmount": "7500000.00" } } }
```

Hai ràng buộc bắt buộc: (1) `void` **không** tính vào `totalInvoiced`/`totalOutstanding` (hoá đơn đã huỷ không phải khoản phải thu) nhưng vẫn hiện trong `countByStatus` — nếu không, tổng ở header không bao giờ khớp bảng bên dưới; (2) filter phải khớp §3.4 tuyệt đối, nếu lệch một điều kiện thì header và bảng nói hai con số khác nhau trên cùng màn hình.

### 3.9 `POST /admin/invoices/batch/preview` *(PROPOSED)*

**Request**: `periodStart` · `periodEnd` · `dueDate` (Date, bắt buộc) · `studentIds` (uuid[], optional — bỏ trống = **mọi** `User role='student' status='active'`).

```json
{ "data": {
    "rows": [
      { "studentId": "uuid", "studentName": "string", "outcome": "ok",
        "rateId": "uuid", "rateAmount": "2500000.00", "totalAmount": "2500000.00" },
      { "studentId": "uuid", "studentName": "string", "outcome": "no_rate",
        "rateId": null, "rateAmount": null, "totalAmount": null },
      { "studentId": "uuid", "studentName": "string", "outcome": "duplicate",
        "existingInvoiceId": "uuid", "existingStatus": "unpaid" }
    ],
    "summary": { "ok": 38, "no_rate": 1, "duplicate": 1, "totalAmount": "95000000.00" } } }
```

`outcome ∈ {ok, no_rate, duplicate}`. **Endpoint này ghi 0 byte** — không invoice, không notification, không audit ngoài dòng log truy cập (INV-BILLING-31).

### 3.10 `POST /admin/invoices/batch` *(PROPOSED)*

**Request**: như §3.9 + `Idempotency-Key` (bắt buộc, không phải đề xuất — §8.3).

Hình dạng response **phụ thuộc Q-BILL-3** (§7 TX-BILL-E). Hai hình dạng ứng với hai phương án được liệt kê ở §7; **không chốt ở đây**.

## 4. Rule nghiệp vụ (invariant)

### 4.1 Chọn mức học phí — điểm chốt của toàn module

| ID | Phát biểu |
|---|---|
| **INV-BILLING-01** | Mức áp dụng cho một `StudentInvoice` là bản ghi `StudentTuitionRate` của `studentId` đó có hiệu lực **tại `periodStart` của hoá đơn**, chọn bằng đúng câu: `WHERE "studentId" = :studentId AND "effectiveFrom" <= :periodStart ORDER BY "effectiveFrom" DESC LIMIT 1`. **CẤM** dùng: mức hiện tại (`effectiveTo IS NULL`), mức tại `now()`, mức tại ngày tạo hoá đơn, mức tại `periodEnd`, mức tại `dueDate`. |
| **INV-BILLING-02** | `totalAmount` là **ảnh chụp tại thời điểm tạo**. Mọi thay đổi rate sau đó — kể cả rate mới có `effectiveFrom` nằm trong kỳ — **không bao giờ** làm đổi `totalAmount` của hoá đơn đã tạo. Không có job nào tính lại, không có endpoint nào tính lại. |
| **INV-BILLING-03** | Không tìm được mức theo INV-BILLING-01 → **toàn bộ request thất bại**, không tạo hoá đơn nào. **CẤM** rơi về `0`, **CẤM** rơi về mức hiện tại, **CẤM** tạo hoá đơn `totalAmount` null. |
| **INV-BILLING-04** | `StudentTuitionRate` là append-only: chỉ INSERT. Không UPDATE bản ghi cũ, không DELETE, không endpoint nào cho phép (ADR-008 Accepted). ⚠ **C2** — xem §16. |
| **INV-BILLING-05** | `effectiveFrom` của bản ghi mới phải **lớn hơn hẳn** `MAX(effectiveFrom)` hiện có của student đó. Cấm chèn lùi quá khứ. Lý do trực tiếp: chèn lùi làm đổi mức áp dụng của **các kỳ đã phát hành hoá đơn**, khiến `GET /admin/tuition-rates` (lịch sử) không còn giải thích được các hoá đơn đã gửi cho phụ huynh. |
| **INV-BILLING-06** | Tối đa một `StudentTuitionRate` cho mỗi bộ `(studentId, effectiveFrom)` — **UNIQUE ở DB**. Thiếu ràng buộc này thì câu ở INV-BILLING-01 trở nên **phi tất định**: hai dòng cùng `effectiveFrom` khác `rateAmount`, `LIMIT 1` chọn ngẫu nhiên → **số tiền hoá đơn phụ thuộc may rủi**. |
| **INV-BILLING-07** | `rateAmount > 0`, đúng ≤ 2 chữ số thập phân, `Decimal(10,2)`. `billingCycle` chỉ nhận `monthly` — enum hiện chỉ có một giá trị (Q-BILL-2). |
| **INV-BILLING-08** | `studentId` phải trỏ tới `User` có `role = 'student'`. Kiểm ở **service layer** — FK chỉ trỏ `User`, không phân biệt role, nên DB không đỡ được việc đặt học phí cho một giáo viên. |

### 4.2 Số học của tiền — phần không được sai một đồng

| ID | Phát biểu |
|---|---|
| **INV-BILLING-09** | `StudentInvoice.paidAmount` = **TỔNG `amount` của mọi `TuitionPayment` có `invoiceId` = hoá đơn đó**, tại **mọi thời điểm đã commit**. Không có ngoại lệ, không có độ trễ, không có job đồng bộ. Hoá đơn không có payment nào → `paidAmount = 0.00`. Bất biến này kiểm chứng được bằng một câu query đối chiếu (§11) và phải được chạy như assertion sau **mọi** test của module. |
| **INV-BILLING-10** | Mỗi `TuitionPayment.amount` phải thoả **đồng thời**: `amount > 0` **VÀ** `amount <= (invoice.totalAmount − invoice.paidAmount)` **đọc tại thời điểm ghi, dưới khoá**. Không cho trả vượt. Không cho `amount = 0`. Không cho `amount < 0` (không có khái niệm payment âm — hệ quả: **không có cơ chế hoàn tiền**, xem Q-BILL-5). |
| **INV-BILLING-11** | Hệ quả bắt buộc của INV-BILLING-09 + 10: `0 <= paidAmount <= totalAmount` **luôn đúng**. Ràng buộc này phải tồn tại dưới dạng **CHECK constraint ở DB**, không chỉ là suy luận. |
| **INV-BILLING-12** | `status` là **hàm dẫn xuất** của `(paidAmount, totalAmount)`, không bao giờ được đặt độc lập: `status = 'void'` → giữ `void` (cổng một chiều, INV-BILLING-18); ngược lại `paidAmount = 0` → `unpaid`; `0 < paidAmount < totalAmount` → `partially_paid`; `paidAmount >= totalAmount` → `paid`. Phép dẫn xuất phải được tính **trong câu SQL từ giá trị hàng hiện tại**, không tính trong JS từ một giá trị đã đọc trước đó (§8.1). |
| **INV-BILLING-13** | `totalAmount > 0`. Hoá đơn 0 đồng là mâu thuẫn nội tại: theo INV-BILLING-12, `paidAmount(0) >= totalAmount(0)` → `status = 'paid'` **ngay khi tạo**, trái với `ENTITY_STUDENT_INVOICE`: "`status = unpaid` on creation". Phải chặn bằng CHECK ở DB. |
| **INV-BILLING-14** | Toàn bộ đường tính tiền dùng Decimal end-to-end (Prisma `Decimal` ↔ `numeric` của PostgreSQL). **CẤM** `Number`, `parseFloat`, `+`, `-`, `*` của JS ở mọi khâu, **kể cả khâu serialize**. Tiền ra JSON dưới dạng **string**. Đối tượng `Prisma.Decimal` **không được lọt thẳng vào response** — phải qua serializer tường minh (Q-BILL-1). |
| **INV-BILLING-15** | Mọi giá trị tiền do module này ghi xuống DB có **phần thập phân bằng 0** (VND không có đơn vị phụ). ⚠ **PROPOSED** — bị chặn bởi Q-BILL-1; schema hiện tại (`Decimal(10,2)`/`(12,2)`) **cho phép** `0.01` và module hiện **không có** ràng buộc nào chặn. |
| **INV-BILLING-16** | `outstandingAmount = totalAmount − paidAmount` là **dẫn xuất lúc đọc**, không có cột, không nhận từ client, không lưu cache. |

### 4.3 Vòng đời hoá đơn

| ID | Phát biểu |
|---|---|
| **INV-BILLING-17** | Chuyển trạng thái hợp lệ **chỉ có 5**: `unpaid → partially_paid`, `unpaid → paid`, `partially_paid → paid`, `unpaid → void`, `partially_paid → void`. Mọi chuyển đổi khác bị từ chối, gồm: `paid → *` (kể cả `void`), `void → *`, `partially_paid → unpaid`, `paid → partially_paid`. |
| **INV-BILLING-18** | `void` là **cổng một chiều, trạng thái cuối**: hoá đơn `void` **không nhận thêm payment**. Điều kiện `status <> 'void'` phải nằm trong **mệnh đề WHERE của câu UPDATE**, không chỉ là `if` ở service (§8.1). |
| **INV-BILLING-19** | `void` **không xoá, không sửa** các `TuitionPayment` đã có và **không reset** `paidAmount` về 0. Hệ quả: tồn tại hợp lệ hoá đơn `status='void'` với `paidAmount > 0` — tức tiền học viên đã nộp cho một hoá đơn đã huỷ. Hệ thống **hiện không có cơ chế nào** biểu diễn việc trả lại số tiền đó (INV-BILLING-10 cấm `amount <= 0`). → Q-BILL-5. |
| **INV-BILLING-20** | Hoá đơn `status = 'paid'` **không được void**. Điều kiện `status IN ('unpaid','partially_paid')` nằm trong WHERE của câu UPDATE void. |
| **INV-BILLING-21** | Sau khi tạo, `studentId`, `periodStart`, `periodEnd`, `totalAmount`, `dueDate` **bất biến vĩnh viễn**. Không endpoint nào sửa. Không có endpoint xoá hoá đơn. Sai sót chỉ xử lý được bằng `void` + tạo hoá đơn mới (và `void` chỉ dùng được khi chưa `paid` — INV-BILLING-20). |
| **INV-BILLING-22** | `paidAmount` và `status` **chỉ đổi như hệ quả** của (a) INSERT một `TuitionPayment` hoặc (b) hành động `void`. Không có đường ghi trực tiếp nào từ API. Body request có chứa `paidAmount`/`status` thì bị **strip**, không phải bị lỗi. |

### 4.4 `TuitionPayment` — bất biến

| ID | Phát biểu |
|---|---|
| **INV-BILLING-23** | `TuitionPayment` **bất biến tuyệt đối**: chỉ INSERT. Không UPDATE, không DELETE, không route PATCH/DELETE tồn tại. `updatedAt` sau khi INSERT **không bao giờ** khác `createdAt`. (`ENTITY_TUITION_PAYMENT`: "Immutable once created — no edit/delete".) |
| **INV-BILLING-24** | `recordedBy` = id của actor lấy từ **token**, không bao giờ lấy từ body. Actor phải là `role='admin'` **và** `status='active'`. Đây là chữ ký trên chứng từ tài chính — nhận từ body nghĩa là bất kỳ admin nào cũng ký tên người khác được. |
| **INV-BILLING-25** | `invoiceId` bất biến: một payment thuộc **đúng một** hoá đơn và **không bao giờ** chuyển được sang hoá đơn khác. Ghi nhầm hoá đơn = void hoá đơn sai + ghi lại — không có đường sửa nhẹ hơn. |
| **INV-BILLING-26** | `paidAt <= now() + 5 phút`. Cho phép lùi quá khứ (đối chiếu sao kê), **không** cho phép tương lai. |
| **INV-BILLING-27** | Khi `transactionReference IS NOT NULL`: bộ `(paymentMethod, transactionReference)` là **duy nhất toàn hệ thống**. Một giao dịch ngân hàng chỉ được ghi nhận một lần, kể cả khi ghi nhầm sang hai hoá đơn khác nhau. ⚠ **PROPOSED** — suy ra từ `ENTITY_TUITION_PAYMENT`: "`transactionReference` used to match against VietQR bank statements"; chưa có trong tài liệu nguồn. |

### 4.5 Trùng lặp & biên kỳ

| ID | Phát biểu |
|---|---|
| **INV-BILLING-28** | Tồn tại **tối đa một hoá đơn KHÔNG `void`** cho mỗi bộ `(studentId, periodStart, periodEnd)`. Bảo đảm bằng **partial UNIQUE index ở DB** (`WHERE status <> 'void'`), không chỉ kiểm ở service. Dùng partial (không phải UNIQUE thường) vì hoá đơn bị huỷ **phải phát hành lại được** cho cùng kỳ — UNIQUE thường sẽ khoá vĩnh viễn kỳ đó. |
| **INV-BILLING-29** | `periodEnd >= periodStart` **và** `dueDate >= periodStart`. CHECK ở DB. |
| **INV-BILLING-30** | Hai hoá đơn không-`void` của **cùng student** không được chồng lấn khoảng ngày. INV-BILLING-28 **không đủ**: `09-01..09-30` và `09-15..10-15` là hai bộ khác nhau nên vẫn lọt → học viên bị tính tiền hai lần cho nửa cuối tháng 9. Cần `EXCLUDE USING gist` trên `daterange` (§12). ⚠ **PROPOSED** — Q-BILL-14. |
| **INV-BILLING-31** | `POST /admin/invoices/batch/preview` **không ghi gì**: 0 `StudentInvoice`, 0 `Notification`, 0 `TuitionPayment`, 0 dòng audit nghiệp vụ. Chạy preview 100 lần thì DB không đổi một byte. |

### 4.6 RBAC & rò rỉ

| ID | Phát biểu |
|---|---|
| **INV-BILLING-32** | Cả 10 endpoint chỉ chấp nhận actor `role = 'admin'` **và** `status = 'active'`. Kiểm ở **service layer**, không chỉ `@Roles()` guard. |
| **INV-BILLING-33** | Không có đường nào để một actor không phải admin đọc được hoá đơn của người khác. Khi route student được mở (SCOPE-BILL-01), điều kiện `invoice.studentId = actor.id` phải nằm trong **WHERE của query**, không phải là một `if` sau khi đã đọc. |
| **INV-BILLING-34** | Response của module **không bao giờ** chứa `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`, `User.hskLevelGoal`. Chỉ `studentId`/`recordedBy.id` + tên hiển thị. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` trên cả 10 route. Kiểm thêm ở **service layer**:

- `actor.role === 'admin' && actor.status === 'active'` — sai → `AUTH_INSUFFICIENT_ROLE` 403. Lý do phải kiểm lại `status`: token đã phát vẫn còn hiệu lực sau khi admin bị suspend; role guard đọc claim trong token, không đọc DB.
- **Không có ownership filter cho admin**: `RBAC_MATRIX.md` ghi `StudentTuitionRate set = ✅`, `StudentInvoice create = ✅`, `TuitionPayment record = ✅` → admin thao tác trên mọi học viên.
- `recordedBy` **luôn** `= actor.id` (INV-BILLING-24). Không có tham số nào cho phép ghi thay người khác.
- Teacher: `❌` trên cả ba bảng — không có route nào, không có trường hợp ngoại lệ.
- Student: `StudentInvoice read own = 🔒` theo RBAC_MATRIX nhưng **chưa có route** (SCOPE-BILL-01). Khi mở, câu điều kiện bắt buộc: `WHERE "studentId" = :actorId AND status <> 'void'` — và phải là **handler riêng**, không tái dùng handler admin với một tham số `studentId` từ query (tái dùng = IDOR chỉ chờ một lần quên guard).
- Không có tách vai trò "người phát hành hoá đơn" ≠ "người ghi nhận thanh toán". Mọi admin làm được cả hai → một admin có thể tự tạo hoá đơn, tự ghi đã thu đủ, tự void. Xem Q-BILL-15.

## 6. State machine

### 6.1 `StudentInvoice`

```
                    POST /admin/invoices
                            │
                            ▼
                    ┌───────────────┐
                    │    unpaid     │  paidAmount = 0
                    └───────┬───────┘
             payment        │        payment
        (0 < Σ < total)     │     (Σ >= total)
              ┌─────────────┴─────────────┐
              ▼                           ▼
      ┌───────────────┐   payment  ┌─────────────┐
      │partially_paid │───────────►│    paid     │ ◄── TRẠNG THÁI CUỐI
      └───────┬───────┘ (Σ>=total) └─────────────┘     không void được
              │                                        không quay lui được
              │ PATCH /void          PATCH /void            (INV-BILLING-20)
              │      ┌───────────────────┘  ✗ TỪ CHỐI 409
              ▼      ▼
      ┌─────────────────┐
      │      void       │ ◄── TRẠNG THÁI CUỐI. Không nhận payment (INV-BILLING-18)
      └─────────────────┘     paidAmount GIỮ NGUYÊN (INV-BILLING-19)
```

**Hai cổng một chiều**: `paid` và `void`. Cả hai đều không có đường ra — kể cả bằng đường sửa DB hợp lệ, vì payment bất biến nên `paidAmount` không giảm được.

`paid → void` bị từ chối là quyết định có chủ ý (`INVOICE_ALREADY_PAID`: "A fully paid invoice cannot be voided or re-issued"). Hệ quả vận hành: hoá đơn ghi nhầm mà **đã ghi đủ tiền** thì không có đường sửa nào — không void được, không xoá được, không sửa `totalAmount` được. Đây là ngõ cụt thật, không phải suy diễn. → Q-BILL-5.

### 6.2 `StudentTuitionRate`

```
   POST /admin/tuition-rates ──► (bản ghi mới, effectiveFrom > MAX hiện có)
                                       │
                                       └──► KHÔNG có state. KHÔNG có transition.
                                            KHÔNG UPDATE. KHÔNG DELETE. (ADR-008)
```

Cột `effectiveTo` theo ADR-008 là **cột chết**: luôn `NULL`, không ai ghi. "Mức hiện hành" là bản ghi có `effectiveFrom` lớn nhất `<= <ngày quan tâm>`, không phải bản ghi có `effectiveTo IS NULL`. ⚠ **C2** — nếu C2 chốt theo ENTITY doc thì mục này, INV-BILLING-01/04/05, §7 TX-BILL-D và §8.5 phải viết lại toàn bộ.

### 6.3 `TuitionPayment`

```
   POST /admin/invoices/:id/payments ──► (bản ghi mới) ──► BẤT BIẾN VĨNH VIỄN
```

Không state, không transition, không xoá. Đây là sổ cái.

## 7. Transaction boundary

### TX-BILL-A — `POST /admin/invoices/:id/payments` (khối quan trọng nhất của module)

**Isolation: `READ COMMITTED` + `SELECT ... FOR UPDATE` ở bước 1.** Không dùng `SERIALIZABLE`.

```
BEGIN  -- READ COMMITTED
 1. SELECT id, "totalAmount", "paidAmount", status
      FROM "StudentInvoice" WHERE id = :invoiceId
      FOR UPDATE
    -- 0 dòng → rollback → 404 INVOICE_NOT_FOUND
    -- FOR UPDATE: biến tranh chấp thành hàng đợi. Admin thứ hai CHỜ tại đây,
    -- rồi đọc lại paidAmount SAU khi admin thứ nhất commit.

 2. Kiểm trên giá trị vừa đọc DƯỚI KHOÁ (không phải giá trị đọc ở request trước):
      status = 'void'                                   → rollback → 409
      status = 'paid'                                   → rollback → 409 (outstanding = 0)
      amount <= 0                                       → rollback → 400
      amount > (totalAmount - paidAmount)               → rollback → 400

 3. INSERT "TuitionPayment" (id, "invoiceId", amount, "paidAt", "paymentMethod",
                             "transactionReference", "recordedBy" = :actorId)
    -- UNIQUE (paymentMethod, transactionReference) nếu bật → P2002 → rollback → 409

 4. UPDATE "StudentInvoice"
       SET "paidAmount" = "paidAmount" + :amount,
           status = CASE
                      WHEN "paidAmount" + :amount >= "totalAmount" THEN 'paid'
                      WHEN "paidAmount" + :amount > 0              THEN 'partially_paid'
                      ELSE 'unpaid' END,
           "updatedAt" = now()
     WHERE id = :invoiceId
       AND status <> 'void'
       AND "paidAmount" + :amount <= "totalAmount"
    -- affectedRows PHẢI = 1. Khác → THROW → rollback.
    -- LƯU Ý: paidAmount và status tính TỪ GIÁ TRỊ CỘT, không từ giá trị đọc ở bước 1.

 5. INSERT audit (actorId, invoiceId, paymentId, action='record_payment',
                  amount, paidAmountAfter, statusAfter, at, ip)
COMMIT
```

**Bắt buộc cùng một transaction**: INSERT `TuitionPayment` + UPDATE `paidAmount` + tính lại `status` + ghi audit. Không tồn tại trạng thái trung gian quan sát được:

- Nếu INSERT payment commit mà UPDATE invoice không → `paidAmount` nhỏ hơn `Σ payments` → **INV-BILLING-09 vỡ**. Hệ thống báo học viên còn nợ số tiền đã trả; đối soát thủ công là cách duy nhất phát hiện.
- Nếu UPDATE invoice commit mà INSERT payment không → `paidAmount` lớn hơn `Σ payments` → hoá đơn hiển thị đã thu nhưng **không có chứng từ nào**. Đây là mất tiền thật của trung tâm.
- Không có đường tự phục hồi cho cả hai chiều, vì payment bất biến (INV-BILLING-23) nên không có thao tác bù trừ hợp lệ.

**Vì sao `READ COMMITTED` đủ — và đủ ở điều kiện nào**

`READ COMMITTED` **không** đủ nếu viết theo kiểu đọc-tính-ghi:

```
-- SAI: lost update
SELECT "paidAmount" ...            -- T1 đọc 0, T2 đọc 0
newPaid = 0 + 1_500_000 (trong JS) -- cả hai cùng tính ra 1.500.000
UPDATE ... SET "paidAmount" = :newPaid  -- T2 ghi đè T1
-- Kết quả: 2 payment 1.5tr, paidAmount = 1.500.000. INV-BILLING-09 vỡ.
```

`READ COMMITTED` **đủ** khi câu ghi là **một câu UPDATE tự tham chiếu có điều kiện bảo vệ nằm trong WHERE** (bước 4). Cơ chế: khi T2 chạm hàng đang bị T1 khoá, T2 chờ; T1 commit; T2 **đọc lại phiên bản hàng mới nhất và ĐÁNH GIÁ LẠI mệnh đề WHERE** trên phiên bản đó (EvalPlanQual). Nên `paidAmount + :amount <= totalAmount` được kiểm trên số dư **sau** T1, không phải số dư T2 đã đọc lúc đầu. Đây là lý do biểu thức `"paidAmount" = "paidAmount" + :amount` (cộng theo cột) là bắt buộc và biểu thức `= :computedValue` (gán giá trị đã tính ở JS) là cấm.

**Vì sao vẫn cần `SELECT ... FOR UPDATE` ở bước 1** — ba lý do, không phải thừa:

1. **Phân loại lỗi.** Không có khoá, bước 4 chỉ trả về `affectedRows = 0` mà không nói vì sao (void? vượt số dư? không tồn tại?). Muốn trả đúng mã lỗi phải đọc lại hàng sau rollback — một round-trip nữa và vẫn có thể đọc ra trạng thái đã đổi lần nữa. Với khoá, kiểm ở bước 2 là chính xác và ổn định.
2. **Bảo vệ INSERT ở bước 3.** INSERT payment xảy ra **trước** UPDATE. Không có khoá, T2 đã ghi xong bản ghi payment rồi mới phát hiện vượt số dư ở bước 4 → rollback (đúng, nhưng lãng phí và làm nhiễu sequence/audit). Có khoá, T2 dừng ở bước 2.
3. **Cho phép chiến lược "tính lại từ `SUM`".** Nếu có ngày ta đổi bước 4 thành `SET "paidAmount" = (SELECT COALESCE(SUM(amount),0) FROM "TuitionPayment" WHERE "invoiceId" = :id)` thì **`READ COMMITTED` một mình KHÔNG đủ**: T2 chạy `SUM` sẽ không thấy payment chưa commit của T1. Chính `FOR UPDATE` ở bước 1 làm T2 phải chờ T1 commit, nên `SUM` mới đầy đủ. Nói cách khác: khoá là thứ giữ cho cả hai chiến lược ghi đều đúng.

**Vì sao không `SERIALIZABLE`**: giao dịch chỉ chạm **một hàng** invoice; `FOR UPDATE` đã tuần tự hoá đúng phạm vi cần thiết. `SERIALIZABLE` thêm nghĩa vụ bắt `40001` và retry ở mọi endpoint, đổi lại không chặn thêm kịch bản nào. Chi phí không mua được gì.

**Ghi chú khoá (chính xác, không phải chi tiết vặt)**: INSERT một `TuitionPayment` tham chiếu FK tới invoice sẽ lấy `FOR KEY SHARE` trên hàng invoice cha. `FOR KEY SHARE` **xung đột với `FOR UPDATE`** — nên hai transaction payment trên **cùng** invoice tuần tự hoá đúng như mong muốn. Ngược lại, một `UPDATE` thường trên invoice (không đụng cột khoá) chỉ lấy `FOR NO KEY UPDATE`, **không** xung đột với `FOR KEY SHARE` — nghĩa là nếu bỏ `FOR UPDATE` ở bước 1 thì INSERT payment của T2 **không hề bị chặn** bởi UPDATE của T1; chỉ hai câu UPDATE ở bước 4 mới chặn nhau. Đó chính xác là kịch bản ở lý do (2) ở trên. Khoá ở phạm vi **một hàng invoice** nên hai hoá đơn khác nhau không bao giờ chặn nhau — không có vấn đề thông lượng.

### TX-BILL-B — `POST /admin/invoices`

Isolation: `READ COMMITTED`. Không cần khoá hàng (không có hàng nào để khoá — đang tạo mới); dựa vào UNIQUE constraint.

```
BEGIN
 1. SELECT id, role, status FROM "User" WHERE id = :studentId
    -- không tồn tại → 404 USER_NOT_FOUND;  role <> 'student' → 400
 2. Nếu totalAmount không được gửi:
      SELECT id, "rateAmount" FROM "StudentTuitionRate"
       WHERE "studentId" = :studentId AND "effectiveFrom" <= :periodStart
       ORDER BY "effectiveFrom" DESC LIMIT 1
    -- 0 dòng → rollback → 400 INVOICE_NO_TUITION_RATE (INV-BILLING-03)
 3. INSERT "StudentInvoice" (..., "totalAmount" = :amount, "paidAmount" = 0,
                             status = 'unpaid')
    -- partial UNIQUE (studentId, periodStart, periodEnd) WHERE status <> 'void'
    -- → P2002 → rollback → 409 INVOICE_PERIOD_DUPLICATE
 4. INSERT "Notification" (userId = :studentId, type = 'new_invoice',
                           referenceId = invoice.id, referenceType = 'invoice',
                           isRead = false, payload = {...})
 5. INSERT audit (actorId, invoiceId, action='create', totalAmount, rateId, at)
COMMIT
```

**Notification nằm TRONG transaction** (bước 4) vì `Notification` là một hàng trong **cùng database** — không phải lời gọi mạng. Đưa ra ngoài để "tránh transaction dài" là đánh đổi sai: nó tạo ra hai trạng thái hỏng (hoá đơn không có thông báo; thông báo trỏ tới hoá đơn đã rollback → deep-link 404) để đổi lấy vài mili-giây. Nếu sau này có gửi email/push thật thì mới cần outbox pattern, và outbox row cũng nằm trong transaction này.

### TX-BILL-C — `PATCH /admin/invoices/:id/void`

```
BEGIN
 1. UPDATE "StudentInvoice" SET status = 'void', "updatedAt" = now()
     WHERE id = :id AND status IN ('unpaid','partially_paid')   -- conditional update
    -- affectedRows = 0 → THROW, phân loại lỗi ở §8.4
    -- KHÔNG chạm paidAmount (INV-BILLING-19). KHÔNG xoá payment nào.
 2. INSERT audit (actorId, invoiceId, action='void', reason,
                  paidAmountAtVoid, statusBefore, at, ip)
COMMIT
```

`paidAmountAtVoid` là trường **bắt buộc** trong audit: nếu khác 0 thì đây là bản ghi duy nhất chứng minh trung tâm đang giữ tiền của một hoá đơn đã huỷ (Q-BILL-5, metric ở §14).

### TX-BILL-D — `POST /admin/tuition-rates`

```
BEGIN
 1. SELECT id, role, status FROM "User" WHERE id = :studentId  -- role='student'
 2. SELECT pg_advisory_xact_lock(hashtext('tuition_rate:' || :studentId))
    -- tuần tự hoá theo student; không có nó thì hai request cùng qua bước 3
 3. SELECT MAX("effectiveFrom") FROM "StudentTuitionRate" WHERE "studentId" = :studentId
    -- :effectiveFrom <= MAX → rollback → 400 RATE_EFFECTIVE_DATE_IN_PAST
 4. INSERT "StudentTuitionRate" (...)
    -- UNIQUE (studentId, effectiveFrom) là hàng rào cuối → P2002 → 409
 5. INSERT audit (actorId, studentId, rateId, action='set_rate', rateAmount,
                  effectiveFrom, at)
COMMIT
```

Không gửi notification: `ENTITY_NOTIFICATION` không có type nào cho việc đổi học phí (§10).

### TX-BILL-E — `POST /admin/invoices/batch` *(PROPOSED — CHƯA CHỐT, Q-BILL-3)*

Đây là câu hỏi mở, spec **không tự quyết**. Hai phương án, kèm hệ quả đo được:

**Phương án A — all-or-nothing (một transaction cho cả lô)**

```
BEGIN
  với từng student trong danh sách (ORDER BY studentId — thứ tự tất định, chống deadlock):
      chọn rate tại periodStart → không có → THROW (huỷ TOÀN BỘ lô)
      INSERT invoice  → P2002 → THROW (huỷ TOÀN BỘ lô)
      INSERT notification
  INSERT audit (action='batch_create', count, totalAmount)
COMMIT
```

- **Được**: không có trạng thái nửa vời; retry đơn giản (lô hoặc chưa chạy, hoặc đã chạy xong); một dòng audit duy nhất cho cả lô; `Idempotency-Key` chỉ cần bọc một response.
- **Mất**: **một** học viên thiếu rate làm **toàn bộ** kỳ của 40 học viên không phát hành được — và đó là kịch bản thường gặp, không phải hiếm (FE fixture có sẵn "Mai Tuấn Kiệt · Chưa thiết lập"). Admin phải sửa từng lỗi rồi chạy lại cả lô. Transaction dài giữ khoá và một lượng lớn dòng mới trong một lần commit; với vài trăm học viên, thời gian chạy đủ dài để chạm timeout HTTP.
- Mã lỗi: 422 với `details` liệt kê học viên hỏng — nhưng **không tạo gì cả**, trái ngữ nghĩa của `INVOICE_BATCH_PARTIAL_FAILURE` ("Batch generation **partly failed**").

**Phương án B — per-item (một transaction cho mỗi hoá đơn)**

```
với từng student (ORDER BY studentId):
    BEGIN
      chọn rate → không có → rollback item này, ghi vào failed[]
      INSERT invoice → P2002 → rollback item này, ghi vào skipped[]
      INSERT notification
    COMMIT
INSERT audit (action='batch_create', created[], failed[], skipped[])
```

- **Được**: một học viên hỏng không chặn 39 người còn lại; mỗi transaction ngắn; khớp đúng mã `INVOICE_BATCH_PARTIAL_FAILURE` (422) đã có trong registry; chạy lại lô an toàn nhờ partial UNIQUE của INV-BILLING-28 (item đã tạo → `skipped`).
- **Mất**: response không còn là 201 sạch — phải trả 422 kèm `details` ngay cả khi 39/40 thành công, hoặc trả 200 kèm phân loại (chưa có chuẩn nào trong `API_CONVENTIONS.md`). Sập giữa chừng để lại lô chạy dở — phải dựa hoàn toàn vào UNIQUE để chạy lại. `Idempotency-Key` phức tạp hơn: phải lưu được kết quả **từng item**, không chỉ một response.

**Đề xuất của spec (cần BE lead + PO ký, không phải quyết định)**: **Phương án B, nhưng chặn bằng một pha kiểm-trước bắt buộc trong cùng request** — validate toàn bộ danh sách (rate, trùng kỳ, role, status) **trước khi ghi dòng đầu tiên**; có bất kỳ `outcome = no_rate` nào → **từ chối cả lô** với 422 + `details`, chưa ghi gì; toàn bộ hợp lệ → ghi per-item trong các transaction riêng. Lý do: gộp được ưu điểm "không phát hành nhầm" của A với ưu điểm "transaction ngắn, chạy lại được" của B, và biến `INVOICE_BATCH_PARTIAL_FAILURE` thành lỗi **chỉ do sự cố hạ tầng**, không phải do dữ liệu thiếu — thứ mà admin sửa được bằng cách bấm chạy lại. Kèm điều kiện: `POST /admin/invoices/batch/preview` phải được gọi trước và hiển thị đúng danh sách sẽ tạo.

### Bảng tổng hợp ranh giới

| Thao tác | Bắt buộc cùng TX | Isolation | Khoá |
|---|---|---|---|
| Ghi payment | INSERT payment + UPDATE `paidAmount` + tính `status` + audit | READ COMMITTED | `SELECT ... FOR UPDATE` trên 1 hàng invoice |
| Tạo invoice | INSERT invoice + INSERT notification + audit | READ COMMITTED | không (dựa UNIQUE) |
| Void | UPDATE có điều kiện + audit | READ COMMITTED | không (conditional update) |
| Set rate | advisory lock + kiểm MAX + INSERT + audit | READ COMMITTED | `pg_advisory_xact_lock` theo student |
| Batch | **CHƯA CHỐT** — Q-BILL-3 | READ COMMITTED | khoá theo thứ tự `studentId` tăng dần |

## 8. Idempotency & concurrency

### 8.1 Hai admin ghi payment cùng lúc cho cùng một hoá đơn

Kịch bản phải chặn tuyệt đối. Hoá đơn `2.500.000`, đã trả `1.000.000`, số dư `1.500.000`. Admin A ghi `1.500.000` (chuyển khoản), admin B cùng lúc ghi `1.500.000` (tiền mặt). Sai một nhịp là `paidAmount = 4.000.000` trên hoá đơn `2.500.000`, hoặc `paidAmount = 2.500.000` với ba chứng từ tổng `4.000.000`.

**Bốn lớp phòng thủ, cần cả bốn** (mỗi lớp chặn một kịch bản mà lớp khác không chặn):

| Lớp | Cơ chế | Chặn kịch bản | Vì sao lớp khác không đủ |
|---|---|---|---|
| **L1 — Row lock** | `SELECT ... FROM "StudentInvoice" WHERE id = :id FOR UPDATE` (TX-BILL-A bước 1) | Hai admin thao tác đồng thời trên cùng hoá đơn: người thứ hai **chờ**, đọc lại số dư sau commit của người thứ nhất, và bị từ chối với **mã lỗi đúng** thay vì một `affectedRows = 0` không rõ nguyên nhân | Chỉ có L2 thì lỗi trả về mơ hồ và bản ghi payment đã bị INSERT trước khi phát hiện vượt số dư |
| **L2 — Conditional UPDATE** | `UPDATE ... SET "paidAmount" = "paidAmount" + :amt, status = CASE ... WHERE id = :id AND status <> 'void' AND "paidAmount" + :amt <= "totalAmount"` | Lost update và trả vượt, **kể cả khi ai đó lỡ bỏ L1** hoặc mở một đường ghi thứ hai không qua service. Dưới `READ COMMITTED`, WHERE được đánh giá lại trên phiên bản hàng mới nhất (§7) | Kiểm ở service (`if (amount > outstanding) throw`) là **TOCTOU**: khoảng cách giữa lúc đọc và lúc ghi là nơi mất tiền |
| **L3 — CHECK constraint** | `CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")` trên `StudentInvoice` | **Hàng phòng thủ cuối.** Chặn mọi đường ghi: migration ẩu, script sửa tay, endpoint mới do người khác thêm, bug của ORM. Không thể vượt kể cả khi toàn bộ tầng ứng dụng sai | L1/L2 chỉ tồn tại trong code đường-đi-đúng; L3 tồn tại trong dữ liệu |
| **L4 — Query đối soát** | `SELECT` so `paidAmount` với `SUM(payments)` (§11), chạy định kỳ + trong `afterEach` của test | **Trôi tổng hợp** — trường hợp `paidAmount` lệch `Σ payments` mà vẫn nằm trong `[0, totalAmount]` nên L3 không thấy. Đây là loại lỗi duy nhất mà không ràng buộc DB nào bắt được | CHECK constraint **không biểu diễn được** điều kiện cross-row aggregate; PostgreSQL không có constraint dạng đó |

**Ràng buộc DB là hàng phòng thủ cuối** (nhắc lại vì đây là điểm hay bị cắt khi gấp): kiểm ở service layer chỉ đúng khi *mọi* đường ghi đi qua đúng service đó. Trong đời thật thì có migration, có seed, có script vá dữ liệu lúc 2 giờ sáng, có endpoint thứ hai do người khác viết ba tháng sau. Ba ràng buộc **bắt buộc phải có ở DB** cho module này:

```
CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")   -- INV-BILLING-11
CHECK ("totalAmount" > 0)                                     -- INV-BILLING-13
CHECK (amount > 0)                       trên TuitionPayment  -- INV-BILLING-10
```

Cộng thêm CHECK liên kết `status` với `paidAmount` (§12) — nó biến INV-BILLING-12 từ quy ước code thành bất biến dữ liệu.

**Không dùng làm cơ chế chặn**: `SERIALIZABLE` (thừa, §7); `SELECT ... FOR SHARE` (không chặn hai người ghi); optimistic lock bằng cột `version` (`StudentInvoice` không có cột đó và thêm cột là migration, trong khi `FOR UPDATE` đã đủ).

### 8.2 Ghi payment lặp (double-click, retry mạng)

**Không thể khử trùng bằng dữ liệu nghiệp vụ**: hai payment cùng `invoiceId`, cùng `amount`, cùng `paymentMethod`, cùng ngày là **hoàn toàn hợp lệ** (học viên trả 500k tiền mặt hai lần trong ngày). Mọi cách dedupe "thông minh" dựa trên nội dung đều sẽ nuốt mất một khoản thu thật.

Hai cơ chế, khác mục đích:

1. **`Idempotency-Key: <uuid>`** (đề xuất, Q-BILL-4) — bảng `IdempotencyKey(key PK, endpoint, actorId, requestHash, responseStatus, responseBody jsonb, createdAt)`, TTL 24h, ghi **trong cùng TX-BILL-A**. Cùng `key` + cùng `requestHash` → phát lại response đã lưu nguyên trạng (201 + body cũ). Cùng `key` + khác `requestHash` → 422. Đây là thứ duy nhất xử lý đúng "client bấm hai lần / retry vì timeout" — vì client cần **lại response cũ**, không phải một payment thứ hai và cũng không phải một lỗi khó hiểu.
2. **`UNIQUE (paymentMethod, transactionReference) WHERE "transactionReference" IS NOT NULL`** (INV-BILLING-27, đề xuất) — chặn **ghi trùng một giao dịch ngân hàng có thật**, kể cả khi hai admin ghi ở hai thời điểm cách nhau vài ngày, ghi vào hai hoá đơn khác nhau, không có `Idempotency-Key` nào liên quan. Đây là lỗi thao tác phổ biến nhất khi đối chiếu sao kê thủ công.

Hai cơ chế không thay thế nhau: (1) chặn lặp **kỹ thuật** trong vài giây; (2) chặn lặp **nghiệp vụ** trong nhiều ngày.

### 8.3 Batch chạy hai lần → không được tạo trùng hoá đơn

**Hai lớp, cần cả hai:**

| Lớp | Cơ chế | Chặn |
|---|---|---|
| **DB (bắt buộc)** | `CREATE UNIQUE INDEX ... ON "StudentInvoice" ("studentId","periodStart","periodEnd") WHERE status <> 'void'` (INV-BILLING-28) | Mọi đường tạo trùng: batch chạy hai lần, batch + tạo tay, hai admin cùng bấm, batch retry sau timeout. Đây là **hàng rào không thể vượt**. Partial (`WHERE status <> 'void'`) để hoá đơn đã huỷ vẫn phát hành lại được cho cùng kỳ |
| **Ứng dụng** | `Idempotency-Key` **bắt buộc** trên `POST /admin/invoices/batch` (không phải tuỳ chọn) | Client cần **response cũ**, không phải 409. Với batch, response còn chứa danh sách đã tạo — không phát lại được thì admin không biết lô trước đã tạo những ai |

**Vì sao unique constraint một mình không đủ cho batch**: nó khiến lần chạy thứ hai trả về "40 lỗi trùng" thay vì "đã chạy rồi, đây là kết quả" — về mặt dữ liệu là an toàn, về mặt vận hành thì admin không phân biệt được "lô đã chạy xong" với "lô hỏng hoàn toàn", và phản ứng tự nhiên là đi xoá dữ liệu bằng tay. Đó là lúc tiền bắt đầu sai.

**Vì sao `Idempotency-Key` một mình không đủ**: nó chỉ chặn **cùng một client gửi cùng một key**. Hai admin cùng bấm "Sinh hoá đơn tháng 9" ở hai máy sinh ra hai key khác nhau → hai lô hợp lệ → mỗi học viên hai hoá đơn.

**Khoảng trống còn lại**: cả hai lớp trên chỉ chặn **trùng chính xác bộ ba** `(studentId, periodStart, periodEnd)`. Lô `09-01..09-30` và lô `09-15..10-15` là hai bộ khác nhau → lọt cả hai lớp → học viên nhận hai hoá đơn chồng nửa tháng. Bịt bằng `EXCLUDE USING gist` (INV-BILLING-30, §12) — **đề xuất**, Q-BILL-14.

**Trôi giữa preview và batch**: `preview` tính tiền tại thời điểm T1, `batch` ghi tại T2. Nếu giữa T1 và T2 có ai đó INSERT một rate mới có `effectiveFrom <= periodStart` thì số tiền thực ghi khác số đã duyệt trên màn hình. INV-BILLING-05 (cấm chèn lùi) bịt trường hợp `periodStart` trong quá khứ, **không bịt** trường hợp phát hành trước cho kỳ tương lai (tháng 8 sinh hoá đơn tháng 9, rate mới `effectiveFrom = 09-01` chèn vào giữa). Đề xuất: `batch` nhận thêm `previewHash` (hash của danh sách `(studentId, totalAmount)` đã preview); lệch → 409 kèm diff, không ghi. Chưa chốt → Q-BILL-16.

### 8.4 Void chạy song song với ghi payment

Cả hai đều là UPDATE có điều kiện trên **cùng một hàng** invoice, nên PostgreSQL tuần tự hoá ở tầng row lock. Hai kết cục, **cả hai đều đúng**:

- Payment commit trước → void thấy `status` đã thành `partially_paid`/`paid`. Nếu thành `paid` → void bị từ chối 409 (INV-BILLING-20); nếu `partially_paid` → void thành công, để lại hoá đơn `void` có `paidAmount > 0` (INV-BILLING-19 → Q-BILL-5).
- Void commit trước → payment thấy `status = 'void'`, `WHERE status <> 'void'` không khớp → `affectedRows = 0` → rollback → 409 `INVOICE_ALREADY_VOID`. Bản ghi payment đã INSERT ở bước 3 bị rollback cùng — **không** có payment mồ côi trỏ vào hoá đơn đã huỷ.

Không có kết cục thứ ba. Điều kiện `status <> 'void'` **phải** nằm trong WHERE; nếu chỉ kiểm ở service thì kịch bản thứ hai tạo ra payment trên hoá đơn đã huỷ.

**Phân loại khi `affectedRows = 0`** (một `SELECT id, status, paidAmount, totalAmount` sau rollback):

| Kết quả | HTTP | code |
|---|---|---|
| 0 dòng | 404 | `INVOICE_NOT_FOUND` |
| ghi payment, `status = 'void'` | 409 | `INVOICE_ALREADY_VOID` |
| ghi payment, `status = 'paid'` | 409 | `INVOICE_ALREADY_PAID` |
| ghi payment, còn dư nhưng `amount >` số dư | 400 | `INVOICE_PAYMENT_EXCEEDS_TOTAL` |
| void, `status = 'void'` | 409 | `INVOICE_ALREADY_VOID` |
| void, `status = 'paid'` | 409 | `INVOICE_ALREADY_PAID` |

### 8.5 `POST /admin/tuition-rates` đồng thời

Hai admin cùng đặt mức cho một học viên: không khoá thì cả hai qua bước kiểm `MAX(effectiveFrom)` rồi cùng INSERT hai bản ghi **cùng `effectiveFrom`, khác `rateAmount`** → câu chọn mức ở INV-BILLING-01 (`ORDER BY effectiveFrom DESC LIMIT 1`) trở thành **phi tất định**: mỗi lần tạo hoá đơn có thể ra một trong hai số tiền. Chặn bằng `pg_advisory_xact_lock` (TX-BILL-D bước 2) + `UNIQUE (studentId, effectiveFrom)` làm hàng rào cuối (INV-BILLING-06).

### 8.6 Request lặp trên `void`

Lần hai nhận **409**, **không** trả 200 giả-idempotent. Lý do giống spec 04/05: đây là hành động tài chính; nuốt lặng lần bấm thứ hai che mất việc hai admin đang thao tác chồng nhau trên cùng một hoá đơn — thông tin mà người vận hành cần biết. Không dùng `Idempotency-Key` cho endpoint này: khoá tự nhiên `(invoiceId, status hiện tại)` đã đủ.

### 8.7 Thứ tự khoá & deadlock

Mọi thao tác chạm nhiều hàng invoice trong một transaction (batch phương án A, job đối soát) **phải** khoá theo thứ tự tăng dần của một khoá tất định (`ORDER BY id` hoặc `ORDER BY "studentId", "periodStart"`). Hai lô chạy song song với thứ tự khác nhau sẽ deadlock; PostgreSQL sẽ huỷ một bên với `40P01` và lô đó mất trắng công đã làm.

## 9. Error → mã lỗi

⚠ **Toàn bộ nhóm `INVOICE_*` và `RATE_*` đang ở trạng thái *proposed, not agreed*** (`API_ERROR_CODES.md` §3 ghi rõ hai lời cảnh báo; `_FACTS.md` xác nhận: "Nhóm INVOICE_* RATE_* SESSION_* AI_* = *proposed, not agreed* — chưa dùng được"). Nghĩa là **mọi nhánh lỗi đặc thù của module này hiện chưa có mã hợp lệ để dùng**. Không được bịa mã mới; dưới đây liệt kê mã **cần** và đánh dấu trạng thái.

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không token / token hỏng | 401 | `AUTH_TOKEN_INVALID` | ✅ có trong API_ERROR_CODES.md |
| Token hết hạn | 401 | `AUTH_TOKEN_EXPIRED` | ✅ có |
| Không phải admin / admin bị suspend | 403 | `AUTH_INSUFFICIENT_ROLE` | ✅ có |
| DTO sai (`amount <= 0`, `rateAmount <= 0`, `periodEnd < periodStart`, `dueDate < periodStart`, `paidAt` tương lai, uuid sai, `billingCycle` sai, quá 2 chữ số thập phân) | 400 | `VALIDATION_ERROR` + `details` | ✅ có |
| `studentId` không tồn tại | 404 | `USER_NOT_FOUND` | ✅ có |
| `studentId` tồn tại nhưng `role ≠ 'student'` | 400 | `VALIDATION_ERROR` với `details.studentId` | ✅ có |
| `:id` hoá đơn không tồn tại | 404 | `INVOICE_NOT_FOUND` | ⚠ **proposed, not agreed** |
| Ghi payment vào hoá đơn `void` | 409 | `INVOICE_ALREADY_VOID` | ⚠ **proposed, not agreed** |
| Void hoá đơn đã `void` | 409 | `INVOICE_ALREADY_VOID` | ⚠ **proposed, not agreed** |
| Void hoá đơn `paid`; ghi payment vào hoá đơn `paid` | 409 | `INVOICE_ALREADY_PAID` | ⚠ **proposed, not agreed** |
| Trùng `(studentId, periodStart, periodEnd)` (P2002 partial UNIQUE) | 409 | `INVOICE_PERIOD_DUPLICATE` | ⚠ **proposed, not agreed** |
| Không có rate hiệu lực tại `periodStart` khi tạo hoá đơn | 400 | `INVOICE_NO_TUITION_RATE` | ⚠ **proposed, not agreed** |
| `amount >` số dư (`totalAmount − paidAmount`) | 400 | `INVOICE_PAYMENT_EXCEEDS_TOTAL` | ⚠ **proposed, not agreed** |
| Batch hỏng một phần | 422 | `INVOICE_BATCH_PARTIAL_FAILURE` + `details` liệt kê `studentId` hỏng | ⚠ **proposed, not agreed** — và ngữ nghĩa phụ thuộc Q-BILL-3 |
| `GET /admin/tuition-rates` cho student chưa có mức, khi endpoint yêu cầu một mức cụ thể | 404 | `RATE_NOT_FOUND` | ⚠ **proposed, not agreed** |
| `effectiveFrom <= MAX(effectiveFrom)` hiện có | 400 | `RATE_EFFECTIVE_DATE_IN_PAST` | ⚠ **proposed, not agreed** |
| Ai đó thêm route sửa/xoá rate | 409 | `RATE_IMMUTABLE` | ⚠ **proposed, not agreed** — hiện không route nào cần dùng |
| **Trùng `(paymentMethod, transactionReference)`** — ghi trùng một giao dịch ngân hàng | 409 | ⛔ **CẦN BỔ SUNG** | ⛔ **không có mã nào.** `INVOICE_PERIOD_DUPLICATE` sai ngữ nghĩa (đây là trùng giao dịch, không phải trùng kỳ). `DUPLICATE_ENTRY` chỉ xuất hiện trong đoạn code `GlobalExceptionFilter` ở §5, **không có trong bảng registry §3** |
| **`Idempotency-Key` trùng, `requestHash` khác** | 422 | ⛔ **CẦN BỔ SUNG** | ⛔ không có mã; `API_CONVENTIONS.md` không có mục idempotency (Q-BILL-4) |
| **Hoá đơn chồng lấn kỳ** (nếu bật EXCLUDE constraint) | 409 | ⛔ **CẦN BỔ SUNG** | ⛔ không có mã (Q-BILL-14) |
| **Void hoá đơn đang có `paidAmount > 0`** (nếu chốt là chặn — Q-BILL-5) | 409 | ⛔ **CẦN BỔ SUNG** | ⛔ không có mã. Hiện spec cho phép, nên chưa cần — nhưng nếu Q-BILL-5 chốt "chặn" thì bắt buộc có |
| **`totalAmount` ghi đè khác rate** (nếu chốt là cấm — Q-BILL-7) | 400 | ⛔ **CẦN BỔ SUNG** | ⛔ không có mã |
| **`paymentMethod` ngoài whitelist** (nếu chốt whitelist — Q-BILL-13) | 400 | `VALIDATION_ERROR` với `details.paymentMethod` | ✅ dùng được (không cần mã mới) |
| Vượt rate limit | 429 | ⛔ **CẦN BỔ SUNG** | ⛔ registry không có mã 429 nào (Q-BILL-17) |
| Lỗi không lường trước | 500 | `INTERNAL_SERVER_ERROR` | ⚠ chỉ xuất hiện trong code mẫu §5, không có trong registry §3 |

**Tổng kết mã lỗi của module**: **11 nhánh** phải dùng mã thuộc nhóm `INVOICE_*`/`RATE_*` — tất cả đều **chưa được duyệt**; **5 nhánh** ⛔ **không có mã nào** kể cả trong bảng proposed. Nếu tới lúc code vẫn chưa chốt: dùng đúng HTTP status + `VALIDATION_ERROR` hoặc mã gần nghĩa nhất, ghi `TODO(error-code)` có mã theo dõi (đúng cách FE đang làm: `admin-tuition-rates.md` ghi thẳng `TODO(error-code)` trong bảng Actions), và **không khoá contract FE** cho các nhánh đó.

Envelope lỗi **flat** theo `API_CONVENTIONS.md`: `statusCode` · `error` (reason phrase, string) · `code` · `message` (tiếng Việt) · `details` (**chỉ** ở `VALIDATION_ERROR`) · `timestamp` · `path`. Không có cờ `success`, không có object `error` lồng.

## 10. Side effect & notification

| Hành động | Notification | Người nhận | referenceType / referenceId |
|---|---|---|---|
| `POST /admin/invoices` (và mỗi hoá đơn trong batch) | `new_invoice` | student (`userId = invoice.studentId`) | `invoice` / `invoice.id` |
| `POST /admin/invoices/:id/payments` | ⛔ **không có type** | — | — |
| `PATCH /admin/invoices/:id/void` | ⛔ **không có type** | — | — |
| `POST /admin/tuition-rates` | ⛔ **không có type** | — | — |

`payload` của `new_invoice` (jsonb): `{ periodStart, periodEnd, totalAmount, dueDate }` — đủ để FE dựng thông báo mà không cần gọi thêm API. `isRead = false`, `readAt = null`.

**Ba lỗ hổng thông báo, đều là lỗ hổng nghiệp vụ chứ không phải thiếu tính năng phụ**:

1. **Không có `payment_recorded`**: học viên chuyển khoản xong **không có bất kỳ xác nhận nào** rằng trung tâm đã ghi nhận. Kết hợp với SCOPE-BILL-01 (student không có route xem hoá đơn), học viên **không có đường nào** biết mình đã trả tới đâu.
2. **Không có `invoice_voided`**: hoá đơn bị huỷ nhưng thông báo `new_invoice` cũ vẫn nằm trong danh sách của học viên (`ENTITY_NOTIFICATION`: "Notifications are append-only — never deleted, only marked read") → deep-link tới một hoá đơn đã huỷ, không có cách nào thu hồi.
3. **Không có `tuition_rate_changed`**: học phí đổi mà học viên/phụ huynh không được báo. RBAC cho student đọc `StudentTuitionRate` cũng là `❌` (không có dòng nào trong RBAC_MATRIX cho phép) → không có đường nào biết.

Thêm type = migration enum `Notification.type` + ADR → Q-BILL-8.

**Side effect thực tế khác** (không phải notification):

| Hành động | Tác dụng phụ |
|---|---|
| `POST /admin/invoices` | Tạo khoản phải thu → vào `GET /admin/dashboard/stats` ("financial summary") và `GET /admin/invoices/summary` |
| `POST /admin/invoices/:id/payments` | Đổi `paidAmount` + `status`; đổi `totalOutstanding` của mọi báo cáo; là chứng từ kế toán (audit bắt buộc) |
| `PATCH /:id/void` | Rút hoá đơn khỏi khoản phải thu; **không** rút tiền đã thu (INV-BILLING-19) |
| `POST /admin/tuition-rates` | Đổi số tiền của **các hoá đơn phát hành trong tương lai**; không đụng hoá đơn đã tạo (INV-BILLING-02) |

Không gửi email, không webhook, **không gọi API ngân hàng nào**. "VietQR" trong tài liệu chỉ là chuỗi tham chiếu lưu ở `transactionReference` để đối chiếu sao kê **thủ công** — không có tích hợp, không có callback, không có webhook xác nhận. Nếu sau này có webhook ngân hàng thật thì nó sẽ là **một nguồn ghi payment thứ hai** và toàn bộ §8.1 phải được xem lại (khi đó `recordedBy` không còn là một admin).

## 11. Index & query

```
StudentInvoice:      UNIQUE INDEX ("studentId","periodStart","periodEnd") WHERE status <> 'void'
                       -- INV-BILLING-28, tên student_invoice_period_uq. PARTIAL, không phải UNIQUE thường.
StudentInvoice:      INDEX ("studentId", "periodStart" DESC)      -- GET /admin/invoices lọc + sort
StudentInvoice:      INDEX (status)                                -- lọc + summary + dashboard
StudentInvoice:      INDEX ("dueDate") WHERE status IN ('unpaid','partially_paid')
                       -- partial: truy vấn quá hạn chỉ quan tâm hoá đơn chưa thu xong
TuitionPayment:      INDEX ("invoiceId")                           -- payments[] nhúng ở §3.5 + query đối soát
TuitionPayment:      INDEX ("paidAt" DESC)                         -- đối chiếu sao kê theo ngày
TuitionPayment:      UNIQUE INDEX ("paymentMethod","transactionReference")
                       WHERE "transactionReference" IS NOT NULL    -- INV-BILLING-27 (ĐỀ XUẤT)
TuitionPayment:      INDEX ("recordedBy")                          -- audit: ai ghi những khoản nào
StudentTuitionRate:  UNIQUE ("studentId","effectiveFrom")          -- INV-BILLING-06 (BẮT BUỘC, không phải tối ưu)
StudentTuitionRate:  INDEX ("studentId","effectiveFrom" DESC)      -- câu chọn mức INV-BILLING-01
```

**Nguy cơ N+1 — bắt buộc chặn**:

1. **Nặng nhất — batch/preview**: vòng lặp tra `StudentTuitionRate` cho từng học viên → N query cho N học viên (40 học viên = 40 query, và preview chạy mỗi lần admin đổi tham số). **Sửa**: một query nạp rate của **toàn bộ** danh sách `WHERE "studentId" = ANY(:ids) ORDER BY "studentId", "effectiveFrom" DESC`, gom nhóm trong bộ nhớ, chọn phần tử đầu tiên có `effectiveFrom <= periodStart`. Số dòng rate mỗi học viên là đơn vị chục.
2. **Batch — kiểm trùng kỳ**: vòng lặp `findFirst` từng học viên → N query. **Sửa**: một query `WHERE "studentId" = ANY(:ids) AND "periodStart" = :ps AND "periodEnd" = :pe AND status <> 'void'`.
3. `GET /admin/invoices` list: **cấm** JOIN + `SUM("TuitionPayment")` để tính lại `paidAmount`. Đọc thẳng cột. Đó là lý do cột tồn tại (`ENTITY_STUDENT_INVOICE`: "Accumulated from TuitionPayment records").
4. `GET /admin/invoices` list: vòng lặp lấy `studentName` từng dòng → dùng `include: { student: { select: { id, nickname } } }` (⚠ C1).
5. `GET /admin/invoices/:id`: `payments[]` trong **một** query (index `invoiceId`); `recordedBy.name` bằng `include` có `select` tường minh — **không** `include: { recordedBy: true }` trần (lộ `passwordHash`, `email` — INV-BILLING-34).
6. `GET /admin/invoices/summary`: **một** query aggregate (`COUNT`, `SUM`, `FILTER`), không phải 4 query theo status rồi cộng ở JS, và tuyệt đối không phải `findMany().reduce()`.
7. `meta.total`: `COUNT(*)` riêng cùng WHERE, không `findMany().length`.

**Query kiểm tra tính đúng đắn** (chạy trong job giám sát §14 **và** trong `afterEach` của toàn bộ test suite — §15):

```sql
-- L4 / INV-BILLING-09: paidAmount phải khớp tổng payment. KẾT QUẢ PHẢI RỖNG.
SELECT i.id, i."paidAmount", COALESCE(SUM(p.amount), 0) AS sum_payments
  FROM "StudentInvoice" i
  LEFT JOIN "TuitionPayment" p ON p."invoiceId" = i.id
 GROUP BY i.id, i."paidAmount"
HAVING i."paidAmount" <> COALESCE(SUM(p.amount), 0);

-- INV-BILLING-12: status phải khớp dẫn xuất từ paidAmount. PHẢI RỖNG.
SELECT id, status, "paidAmount", "totalAmount" FROM "StudentInvoice"
 WHERE status <> 'void' AND status <> CASE
         WHEN "paidAmount" >= "totalAmount" THEN 'paid'
         WHEN "paidAmount" > 0             THEN 'partially_paid'
         ELSE 'unpaid' END;

-- INV-BILLING-11: trả vượt. PHẢI RỖNG.
SELECT id FROM "StudentInvoice" WHERE "paidAmount" > "totalAmount" OR "paidAmount" < 0;

-- INV-BILLING-19 / Q-BILL-5: hoá đơn đã huỷ nhưng đang giữ tiền của học viên.
-- KHÔNG bắt buộc rỗng, nhưng mỗi dòng là một khoản phải hoàn chưa có quy trình.
SELECT id, "studentId", "paidAmount" FROM "StudentInvoice"
 WHERE status = 'void' AND "paidAmount" > 0;

-- INV-BILLING-15 / Q-BILL-1: tiền có phần thập phân khác 0 (không trả được bằng VND).
SELECT id, "paidAmount", "totalAmount" FROM "StudentInvoice"
 WHERE "totalAmount" <> trunc("totalAmount") OR "paidAmount" <> trunc("paidAmount")
UNION ALL SELECT id, amount, amount FROM "TuitionPayment" WHERE amount <> trunc(amount);

-- INV-BILLING-30: hai hoá đơn không-void chồng lấn kỳ của cùng học viên. PHẢI RỖNG.
SELECT a.id, b.id FROM "StudentInvoice" a JOIN "StudentInvoice" b
    ON a."studentId" = b."studentId" AND a.id < b.id
 WHERE a.status <> 'void' AND b.status <> 'void'
   AND daterange(a."periodStart", a."periodEnd", '[]')
    && daterange(b."periodStart", b."periodEnd", '[]');
```

## 12. Migration & seed

**Migration bắt buộc**

```sql
-- StudentInvoice
ADD CHECK ("totalAmount" > 0)                                       -- INV-BILLING-13
ADD CHECK ("paidAmount" >= 0 AND "paidAmount" <= "totalAmount")     -- INV-BILLING-11 (hàng phòng thủ cuối)
ADD CHECK ("periodEnd" >= "periodStart" AND "dueDate" >= "periodStart")  -- INV-BILLING-29
ADD CHECK (                                                          -- INV-BILLING-12 thành bất biến dữ liệu
      status = 'void'
   OR (status = 'unpaid'         AND "paidAmount" = 0)
   OR (status = 'partially_paid' AND "paidAmount" > 0 AND "paidAmount" < "totalAmount")
   OR (status = 'paid'           AND "paidAmount" >= "totalAmount"))
CREATE UNIQUE INDEX student_invoice_period_uq
    ON "StudentInvoice" ("studentId","periodStart","periodEnd") WHERE status <> 'void';
CREATE INDEX ON "StudentInvoice" ("studentId","periodStart" DESC);
CREATE INDEX ON "StudentInvoice" (status);
CREATE INDEX ON "StudentInvoice" ("dueDate") WHERE status IN ('unpaid','partially_paid');

-- TuitionPayment
ADD CHECK (amount > 0)                                              -- INV-BILLING-10
ADD FK ("invoiceId") REFERENCES "StudentInvoice"(id)                -- xác nhận đã có, ON DELETE RESTRICT
ADD FK ("recordedBy") REFERENCES "User"(id)
CREATE INDEX ON "TuitionPayment" ("invoiceId");
CREATE INDEX ON "TuitionPayment" ("paidAt" DESC);
CREATE INDEX ON "TuitionPayment" ("recordedBy");

-- StudentTuitionRate
ADD UNIQUE ("studentId","effectiveFrom")                            -- INV-BILLING-06
ADD CHECK ("rateAmount" > 0)                                        -- INV-BILLING-07
CREATE INDEX ON "StudentTuitionRate" ("studentId","effectiveFrom" DESC);
```

⚠ `ON DELETE RESTRICT` cho `TuitionPayment.invoiceId` là bắt buộc, **không** `CASCADE`: cascade nghĩa là xoá một hoá đơn sẽ xoá sạch chứng từ thanh toán. Không có endpoint xoá hoá đơn (INV-BILLING-21), nhưng constraint là thứ còn lại khi ai đó chạy `DELETE` bằng tay.

**Migration đề xuất, chờ quyết** (không chạy trước khi chốt):

```sql
-- INV-BILLING-27 (Q-BILL-13): chống ghi trùng một giao dịch ngân hàng
CREATE UNIQUE INDEX tuition_payment_txref_uq ON "TuitionPayment" ("paymentMethod","transactionReference")
  WHERE "transactionReference" IS NOT NULL;
-- Phải dọn dữ liệu trùng hiện có TRƯỚC, nếu không migration fail.

-- INV-BILLING-30 (Q-BILL-14): chống hoá đơn chồng lấn kỳ
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "StudentInvoice" ADD CONSTRAINT student_invoice_no_overlap
  EXCLUDE USING gist ("studentId" WITH =,
                      daterange("periodStart","periodEnd",'[]') WITH &&)
  WHERE (status <> 'void');

-- INV-BILLING-15 (Q-BILL-1): ép VND là số nguyên
ALTER TABLE "StudentInvoice"  ADD CHECK ("totalAmount" = trunc("totalAmount")
                                     AND "paidAmount"  = trunc("paidAmount"));
ALTER TABLE "TuitionPayment"  ADD CHECK (amount = trunc(amount));
ALTER TABLE "StudentTuitionRate" ADD CHECK ("rateAmount" = trunc("rateAmount"));

-- Q-BILL-11: cột audit cho void (nếu không dùng bảng audit riêng)
ALTER TABLE "StudentInvoice" ADD COLUMN "voidedAt" timestamptz,
                             ADD COLUMN "voidedBy" uuid REFERENCES "User"(id),
                             ADD COLUMN "voidReason" text;
ALTER TABLE "StudentInvoice" ADD CHECK ((status = 'void') = ("voidedAt" IS NOT NULL));

-- Q-BILL-4: bảng idempotency (dùng chung với spec 05)
CREATE TABLE "IdempotencyKey" (
  key text PRIMARY KEY, endpoint text NOT NULL, "actorId" uuid NOT NULL,
  "requestHash" text NOT NULL, "responseStatus" int, "responseBody" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now());
```

**Migration phụ thuộc C2** (không chạy trước khi chốt C2): nếu chốt theo ADR-008 thuần thì `StudentTuitionRate.effectiveTo` là cột chết → hoặc DROP (breaking cho contract FE nếu FE đã đọc), hoặc giữ và thêm `CHECK ("effectiveTo" IS NULL)` để cấm ghi. Nếu chốt theo ENTITY doc thì phải thêm cơ chế UPDATE và **viết lại INV-BILLING-01, 02, 04, 05, §6.2, §7 TX-BILL-D, §8.5**.

**Seed để test tiền và tranh chấp** (INSERT thẳng DB; số liệu lấy từ fixture FE `admin-tuition-rates.spec.md` §6 để hai lane dùng chung một bộ dữ liệu):

1. **2 admin** `role=admin, status=active` (A1, A2) — để test hai admin tranh chấp.
2. **S1 "Nguyễn Minh Anh"** — 2 rate: `2200000.00` từ `2026-01-01`, `2500000.00` từ `2026-03-01`. **Đây là học viên trung tâm của mọi test C2 và test chọn rate.**
3. **S2 "Hoàng Văn Nam"** — 2 rate: `2500000.00` từ `2026-01-01`, `2800000.00` từ `2026-06-01`.
4. **S3 "Mai Tuấn Kiệt"** — **không có rate nào** (test INV-BILLING-03 và `outcome = no_rate` của preview).
5. **S4** — rate đầu tiên `2500000.00` từ `2026-09-01` (tức **chưa hiệu lực** tại `periodStart = 2026-08-01` → test nhánh "có rate nhưng chưa hiệu lực" của INV-BILLING-03).
6. **S5** — user `role='teacher'` dùng nhầm làm `studentId` (test INV-BILLING-08).
7. Hoá đơn **I1** của S1, kỳ `2026-09-01..09-30`, `totalAmount=2500000.00`, `paidAmount=0.00`, `unpaid` — đối tượng chính của test payment.
8. Hoá đơn **I2** của S1, kỳ `2026-08-01..08-31`, `totalAmount=2500000.00`, `paidAmount=1000000.00`, `partially_paid`, có 1 payment `1000000.00` — test số dư `1500000.00`.
9. Hoá đơn **I3**, `paid` đủ (`paidAmount = totalAmount = 2500000.00`, 2 payment) — test INV-BILLING-20 (void bị từ chối) và ghi thêm payment bị từ chối.
10. Hoá đơn **I4**, `void`, `paidAmount = 500000.00`, có 1 payment — test INV-BILLING-18/19 và query "void đang giữ tiền".
11. Hoá đơn **I5** của S1 kỳ `2026-09-15..10-14` — **chồng lấn** với I1, dùng để test INV-BILLING-30 (hiện tạo được → chứng minh lỗ hổng; sau khi bật EXCLUDE thì phải bị chặn).
12. Payment có `transactionReference = 'FT26248TEST01'` — để test INV-BILLING-27 bằng cách ghi lại đúng chuỗi đó vào hoá đơn khác.

## 13. Security & rate limit

- **Không trả ra**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`, `User.hskLevelGoal`. Dùng `select` tường minh ở mọi `include`; **cấm** `include: { student: true }` và `include: { recordedBy: true }` trần (INV-BILLING-34).
- **Tiền học phí là dữ liệu tài chính cá nhân**: `rateAmount`, `totalAmount`, `paidAmount`, `amount` **không** vào log level `info`, không vào APM trace attribute, không vào analytics event. Chỉ xuất hiện trong bảng audit có kiểm soát truy cập và trong `Notification.payload` (nằm trong DB, gửi đúng chủ sở hữu).
- **`transactionReference` là dữ liệu ngân hàng**: không log nguyên chuỗi; nếu cần log để debug đối soát thì che giữa (`FT26***01`). Không đưa vào URL, không đưa vào query param (URL vào access log của mọi tầng proxy).
- **`recordedBy` luôn từ token** (INV-BILLING-24). Không có tham số nào ghi thay người khác — chữ ký trên chứng từ tài chính.
- **Audit bắt buộc, bất biến, không xoá** cho: `record_payment`, `void`, `create_invoice`, `batch_create`, `set_rate`. Mỗi dòng ghi `actorId`, `entityId`, `action`, số tiền tại thời điểm đó, `paidAmountAfter`/`statusAfter` (với payment), `reason` (với void), `at`, `ip`. **Audit của payment và void là chứng từ kế toán duy nhất** khi cần đối chất với phụ huynh.
- **IDOR**: hiện mọi endpoint admin-only nên không có nguy cơ; nhưng khi mở route student (SCOPE-BILL-01) thì `studentId` **bắt buộc** lấy từ token và nằm trong WHERE — **không** nhận từ query param, **không** tái dùng handler admin.
- **Rate limit đề xuất** (`API_CONVENTIONS.md` không có mục rate limit → Q-BILL-17): `POST /admin/invoices/:id/payments` **20 req/phút/admin**; `POST /admin/invoices` 30/phút; `POST /admin/tuition-rates` 20/phút; `PATCH /:id/void` 20/phút; **`POST /admin/invoices/batch` 2/phút** (transaction nặng, chạm hàng trăm dòng, mỗi lần gửi N notification); `POST .../batch/preview` 10/phút; các `GET` 60/phút. Vượt → 429 — ⛔ chưa có mã 429 trong registry.
- Validate uuid **trước khi** query để tránh lỗi Prisma lộ chi tiết schema ra response.
- **Không có four-eyes**: một admin tự tạo hoá đơn → tự ghi đã thu đủ → tự void. Xem Q-BILL-15.

## 14. Observability

**Log** (structured; **không** kèm số tiền — §13):

- `billing.invoice.create.attempt` / `.success` / `.duplicate` / `.no_rate` — `{ actorId, studentId, periodStart, periodEnd }`. `.no_rate` **level ERROR** (dữ liệu thiếu chặn phát hành).
- `billing.payment.record.attempt` / `.success` / `.rejected_overpay` / `.rejected_void` / `.rejected_paid` — `{ actorId, invoiceId, paymentMethod }`. Ba nhánh `rejected_*` **level WARN**.
- `billing.payment.lock_wait` — `{ invoiceId, waitMs }` khi chờ `FOR UPDATE` > 200ms → dấu hiệu hai admin đang thao tác chồng.
- `billing.invoice.void` — `{ actorId, invoiceId, statusBefore, hadPayments: boolean }` — **level WARN khi `hadPayments = true`**.
- `billing.rate.create.success` / `.rejected_backdate` — `{ actorId, studentId, effectiveFrom }`.
- `billing.batch.*` — `{ actorId, periodStart, periodEnd, requested, created, failed, skipped }`.

**Metric**:

- **`billing_paidamount_drift_gauge`** — số dòng trả về từ query đối soát L4 (§11). **PHẢI LUÔN = 0.** Đây là **metric quan trọng nhất của module**: nó là cách duy nhất phát hiện INV-BILLING-09 đã vỡ, và nó vỡ âm thầm — không ai khiếu nại cho tới lúc đối chiếu cuối kỳ.
- `billing_integrity_violations_gauge{check}` — số dòng của 4 query đối soát còn lại (§11): `status_mismatch`, `overpaid`, `decimal_residue`, `period_overlap`. Phải = 0 (trừ `period_overlap` cho tới khi Q-BILL-14 chốt).
- `billing_payment_rejected_total{reason}` — `reason ∈ {overpay, void, paid, not_found}`. `overpay` tăng đột biến = FE đang cho nhập số tiền vượt số dư (lỗi UX) **hoặc** hai admin đang tranh chấp (lỗi vận hành) — phân biệt bằng `billing_payment_lock_wait_ms`.
- `billing_payment_lock_wait_ms` — histogram. p99 tăng = nhiều admin thao tác trên cùng hoá đơn.
- **`billing_void_with_payments_total`** — counter hoá đơn bị void khi `paidAmount > 0`. Mỗi lần tăng là **một khoản tiền trung tâm đang giữ mà không có quy trình hoàn** (Q-BILL-5). Cảnh báo ngay từ lần đầu, không đợi ngưỡng.
- `billing_invoice_overdue_gauge` — số hoá đơn `unpaid|partially_paid` có `dueDate < hôm nay`, kèm `billing_overdue_amount_gauge`.
- `billing_invoice_unbilled_students_gauge` — số học viên `active` **không có hoá đơn** cho kỳ hiện tại. Tăng = có học viên bị bỏ sót khỏi vòng phát hành — loại lỗi không ai báo cáo cho tới cuối kỳ.
- `billing_students_without_rate_gauge` — số học viên `active` chưa có `StudentTuitionRate` nào. Đây là số chặn batch (§7 TX-BILL-E).
- `billing_batch_duration_ms` / `billing_batch_partial_failure_total`.

**Cảnh báo**: `billing_paidamount_drift_gauge > 0` (**severity cao nhất, gọi người**); `billing_integrity_violations_gauge > 0`; `billing_void_with_payments_total` tăng; `billing_invoice_unbilled_students_gauge > 0` sau ngày phát hành; `billing_payment_rejected_total{reason="overpay"}` p95 tăng bất thường.

## 15. Test matrix

`svc` = unit service · `int` = integration qua HTTP + **DB thật** · `db` = trực tiếp trên **DB thật** · `conc` = **concurrency trên DB thật, nhiều connection**.

> **MỌI test tiền và MỌI test concurrency chạy trên PostgreSQL THẬT (testcontainer hoặc DB test riêng). CẤM mock Prisma.** Lý do cụ thể, không phải nguyên tắc chung: (1) hành vi `Decimal`/`numeric` — làm tròn, tràn scale, so sánh — không tái hiện được trên mock; (2) `CHECK`/`UNIQUE`/partial index là **hàng phòng thủ cuối** của module (§8.1 L3), mock sẽ luôn cho qua và test sẽ xanh trên một hệ thống đã hỏng; (3) `FOR UPDATE`, thứ tự khoá, và việc `READ COMMITTED` đánh giá lại WHERE (§7) **là cơ chế duy nhất** giữ cho INV-BILLING-09/10 đúng — mock không có khái niệm khoá. Ba thứ đó chính là ba thứ làm sai tiền.
>
> **Assertion toàn cục bắt buộc**: `afterEach` của **toàn bộ** suite chạy 3 query đối soát đầu ở §11 và khẳng định **rỗng**. Test nào làm vỡ INV-BILLING-09 sẽ fail ngay tại test đó, không trôi sang test sau.

| INV | Loại | Mô tả test |
|---|---|---|
| INV-BILLING-01 | **int (DB thật)** | S1 có rate `2200000` từ `2026-01-01` và `2500000` từ `2026-03-01`. Hoá đơn kỳ `2026-02-01..02-28` → `totalAmount = "2200000.00"`. Kỳ `2026-03-01..03-31` → `"2500000.00"` (biên: **đúng ngày `effectiveFrom` áp mức mới**). Kỳ `2026-04-01..04-30` → `"2500000.00"`. **Ca quyết định**: hôm nay `2026-08-19`, tạo hoá đơn kỳ `2026-01-01..01-31` → phải ra `"2200000.00"` (rate tại `periodStart`), **KHÔNG** phải `"2500000.00"` (rate hiện tại). **Ca tương lai**: S2 có `2500000` từ `01-01` và `2800000` từ `2026-06-01`; hôm nay `2026-05-20` tạo hoá đơn kỳ `2026-06-01..06-30` → phải ra `"2800000.00"`, **KHÔNG** phải `"2500000.00"` — tức neo vào `periodStart` chứ không vào `now()`. |
| INV-BILLING-02 | **int (DB thật)** | Tạo hoá đơn kỳ `2026-09-01..09-30` cho S1 → `2500000.00`. Sau đó INSERT rate `3000000.00` từ `2026-09-01`… (bị INV-BILLING-05 chặn) → dùng `2026-10-01` thay thế. Đọc lại hoá đơn → `totalAmount` **không đổi**. Khẳng định không tồn tại job/endpoint nào làm đổi: so `updatedAt` trước/sau. |
| INV-BILLING-03 | **int (DB thật)** | S3 (không rate) → `POST /admin/invoices` trả 400 `INVOICE_NO_TUITION_RATE`; khẳng định `COUNT("StudentInvoice")` **không đổi** và **không có** notification nào được tạo. S4 (rate từ `2026-09-01`, kỳ `2026-08-01..08-31`) → cùng kết quả. **Cấm fallback**: khẳng định không có hoá đơn `totalAmount = 0` nào được tạo. |
| INV-BILLING-04 | int | Không tồn tại route `PATCH`/`DELETE /admin/tuition-rates/:id` (404 route, không phải 403). Sau 5 lần POST, `COUNT("StudentTuitionRate")` tăng đúng 5 và **không bản ghi cũ nào có `updatedAt` thay đổi**. |
| INV-BILLING-05 | int (DB thật) | S1 đã có `effectiveFrom = 2026-03-01`: POST `2026-02-01` → 400 `RATE_EFFECTIVE_DATE_IN_PAST`; POST `2026-03-01` (bằng) → 400; POST `2026-03-02` → 201. |
| INV-BILLING-06 | **conc** | Hai connection cùng INSERT rate cho S1 với **cùng `effectiveFrom`**, khác `rateAmount` (`2600000` vs `2700000`) → đúng **1** thành công, 1 nhận 409. Tắt UNIQUE → test **phải fail** (chứng minh constraint là cần thiết, không phải trang trí). Lặp ≥ 50 vòng. |
| INV-BILLING-07 | int + db | `rateAmount` = `0`, `-1`, `"abc"`, `"100.999"`, `"100000000.00"` (tràn `Decimal(10,2)`) → 400. `billingCycle = "per_class"` → 400. DB: CHECK chặn `rateAmount <= 0`. |
| INV-BILLING-08 | int (DB thật) | `studentId` trỏ S5 (`role='teacher'`) hoặc một admin → 400 với `details.studentId`. `studentId` không tồn tại → 404 `USER_NOT_FOUND`. Áp cho cả `POST /admin/tuition-rates` lẫn `POST /admin/invoices`. |
| **INV-BILLING-09** | **int + db + conc** | (a) Hoá đơn mới → `paidAmount = "0.00"`. (b) Ghi 1, 2, 3 payment → sau **mỗi** lần, `paidAmount` = tổng chính xác các `amount` đã ghi. (c) Sau **mọi** test của suite, query đối soát L4 (§11) rỗng. (d) **conc**: 10 connection cùng ghi payment `100000.00` vào hoá đơn `2500000.00`, lặp 50 vòng → `paidAmount` cuối cùng = `100000 × (số request thành công)` **đúng từng đồng**, và `= SUM(payments)`. (e) Bơm lỗi giữa INSERT payment và UPDATE invoice → sau rollback: 0 payment mới, `paidAmount` không đổi. |
| **INV-BILLING-10** | **int (DB thật)** | Hoá đơn `2500000.00`, `paidAmount = 0`: `amount = "2500000.00"` → 201, `status='paid'`. Hoá đơn mới: `amount = "2500000.01"` → 400 `INVOICE_PAYMENT_EXCEEDS_TOTAL`; `amount = "0"` → 400; `amount = "-100000.00"` → 400; `amount = "0.00"` → 400. Hoá đơn I2 (`paidAmount=1000000`, dư `1500000`): `"1500000.00"` → 201 `paid`; `"1500000.01"` → 400; `"1500001.00"` → 400. Sau mỗi lần 400: khẳng định **0 bản ghi `TuitionPayment` mới** và `paidAmount` không đổi. |
| INV-BILLING-11 | **db** | `UPDATE "StudentInvoice" SET "paidAmount" = "totalAmount" + 1` → CHECK chặn. `SET "paidAmount" = -1` → CHECK chặn. Đây là test **của ràng buộc DB**, chạy bằng SQL trực tiếp không qua service — mục đích chính xác là chứng minh hàng phòng thủ cuối tồn tại. |
| **INV-BILLING-12** | **int + db** | Ma trận: `paidAmount=0` → `unpaid`; `=1đ` → `partially_paid`; `= total − 1đ` → `partially_paid`; `= total` → `paid`. Sau khi void: ghi thêm bị chặn, `status` giữ `void` bất kể `paidAmount`. **db**: `UPDATE ... SET status='paid' WHERE "paidAmount"=0` → CHECK chặn; `SET status='unpaid'` khi `paidAmount>0` → CHECK chặn. Query đối soát `status_mismatch` (§11) rỗng sau toàn suite. |
| INV-BILLING-13 | int + db | `POST /admin/invoices` với `totalAmount = "0.00"` → 400. `"-100.00"` → 400. **db**: INSERT `totalAmount = 0` → CHECK chặn. Ghi rõ lý do trong test name: hoá đơn 0đ sẽ là `paid` ngay lúc tạo, trái ENTITY "status = unpaid on creation". |
| **INV-BILLING-14** | **int (DB thật)** | (a) Mọi field tiền trong **mọi** response là `string`, không phải `number` — kiểm bằng `typeof` trên toàn bộ payload của 10 endpoint. (b) Không field nào có dạng `{"s":1,"e":6,"d":[...]}` (dấu hiệu `Prisma.Decimal` lọt thẳng ra JSON). (c) Test tĩnh: grep + lint rule cấm `Number(`, `parseFloat(`, `+`/`-`/`*` trên biến kiểu Decimal trong thư mục module. (d) Rate `"999999.99"` × ghi 3 payment `"333333.33"` → `paidAmount = "999999.99"`, `status='paid'` — không mất một xu. |
| INV-BILLING-15 | **db** *(PROPOSED)* | Query `decimal_residue` (§11) rỗng. Khi CHECK `= trunc()` được bật: INSERT `amount = "1000.50"` → chặn. **Trước khi Q-BILL-1 chốt, test này chạy ở chế độ báo cáo (không fail build) nhưng vẫn phải in ra số dòng vi phạm.** |
| INV-BILLING-16 | int | `outstandingAmount` trong mọi response = `totalAmount − paidAmount` đúng từng đồng. Không tồn tại cột `outstandingAmount` trong schema (kiểm `information_schema.columns`). Gửi `outstandingAmount` trong request body → bị strip, không lỗi. |
| INV-BILLING-17 | **int (DB thật)** | Ma trận 4 status × 2 hành động (ghi payment, void): `unpaid`+payment(một phần) → `partially_paid`; `unpaid`+payment(đủ) → `paid`; `partially_paid`+payment(đủ) → `paid`; `unpaid`+void → `void`; `partially_paid`+void → `void`; `paid`+void → **409**; `paid`+payment → **409**; `void`+void → **409**; `void`+payment → **409**. Sau mỗi 409, DB không đổi (so `updatedAt` và `COUNT(TuitionPayment)`). |
| **INV-BILLING-18** | **int + db + conc** | Hoá đơn I4 (`void`): `POST .../payments` → 409 `INVOICE_ALREADY_VOID`, và **`COUNT("TuitionPayment" WHERE "invoiceId" = I4)` không đổi** (chứng minh INSERT ở bước 3 đã rollback). **db**: chạy trực tiếp câu UPDATE của TX-BILL-A bước 4 trên hoá đơn void → `affectedRows = 0` (chứng minh điều kiện nằm trong WHERE, không chỉ ở service). **conc**: void và payment gửi đồng thời, lặp 50 vòng → luôn đúng một bên thắng; không bao giờ tồn tại payment trỏ vào hoá đơn `void` được tạo **sau** thời điểm void. |
| INV-BILLING-19 | int + db | Void I2 (`paidAmount = 1000000.00`, 1 payment) → sau void: `paidAmount` vẫn `"1000000.00"`, `COUNT(payments) = 1`, payment không đổi một field nào (so toàn bộ hàng trước/sau). Query "void đang giữ tiền" (§11) trả **đúng 1 dòng** → khẳng định metric `billing_void_with_payments_total` tăng 1. |
| INV-BILLING-20 | int (DB thật) | Void I3 (`paid`) → 409 `INVOICE_ALREADY_PAID`; `status` vẫn `paid`. **db**: `UPDATE ... SET status='void' WHERE id=I3 AND status IN ('unpaid','partially_paid')` → `affectedRows = 0`. |
| INV-BILLING-21 | int | Không tồn tại route `PATCH /admin/invoices/:id` và `DELETE /admin/invoices/:id` (404 route). Gửi `totalAmount`, `periodStart`, `dueDate`, `studentId` trong body của `/void` và `/payments` → bị strip; đọc lại hoá đơn thấy các field **không đổi**. |
| INV-BILLING-22 | int | Gửi `paidAmount`, `status` trong body `POST /admin/invoices` và `POST .../payments` → bị strip (không phải 400). Hoá đơn tạo ra luôn `paidAmount = "0.00"`, `status = "unpaid"` bất kể body. |
| **INV-BILLING-23** | **int + db** | Không tồn tại route `PATCH`/`DELETE /admin/invoices/:id/payments/:paymentId` (404 route). Sau khi ghi payment: đọc lại và khẳng định `updatedAt === createdAt`. Ghi thêm 2 payment nữa rồi đọc lại payment đầu → **mọi field bằng đúng lúc tạo**. **db**: `DELETE FROM "TuitionPayment"` bị chặn bởi quy ước vận hành (không có constraint chặn được DELETE — ghi rõ trong test là **khoảng trống đã biết**, chỉ có audit và backup bảo vệ). |
| INV-BILLING-24 | int (DB thật) | Gửi `recordedBy` = id của admin khác trong body → bị strip; bản ghi có `recordedBy = actor.id`. Token của admin `status='suspended'` → 403, không có payment nào được tạo. |
| INV-BILLING-25 | int + db | Không có endpoint nào nhận `invoiceId` trong body của `POST /admin/invoices/:id/payments` (lấy từ path). **db**: `UPDATE "TuitionPayment" SET "invoiceId" = <khác>` không có đường đi qua API; nếu chạy tay thì query đối soát L4 (§11) phải bắt được ngay trên **cả hai** hoá đơn — test này chạy chính câu đó để chứng minh cơ chế phát hiện hoạt động. |
| INV-BILLING-26 | int | `paidAt` = `now() + 1 giờ` → 400 `VALIDATION_ERROR`. `paidAt` = `now() + 2 phút` → 201 (trong dung sai). `paidAt` = `2026-01-01T00:00:00Z` (lùi xa) → 201. |
| INV-BILLING-27 | **conc** *(PROPOSED)* | Ghi payment với `transactionReference = 'FT26248TEST01'` vào I1 → 201. Ghi **cùng chuỗi đó** với cùng `paymentMethod` vào I2 → 409. `transactionReference = null` hai lần → **cả hai 201** (partial index chỉ áp khi NOT NULL). **conc**: hai connection cùng chuỗi → đúng 1 thành công. |
| **INV-BILLING-28** | **conc** | Hai connection cùng `POST /admin/invoices` cho S1 kỳ `2026-09-01..09-30`: đúng **1** hoá đơn trong DB, 1 response 201, 1 response 409 `INVOICE_PERIOD_DUPLICATE`, và **đúng 1 notification** `new_invoice`. Lặp ≥ 50 vòng. Void hoá đơn đó rồi tạo lại cùng kỳ → **201** (partial index cho phép phát hành lại). Tạo lần 3 khi lần 2 còn sống → 409. |
| INV-BILLING-29 | int + db | `periodEnd < periodStart` → 400. `dueDate < periodStart` → 400. **db**: CHECK chặn cả hai. |
| INV-BILLING-30 | **db** *(PROPOSED)* | Với seed I1 (`09-01..09-30`) và I5 (`09-15..10-14`) cùng S1: query `period_overlap` (§11) trả **1 dòng** → chứng minh lỗ hổng đang tồn tại. Sau khi bật EXCLUDE: INSERT I5 bị chặn; kỳ liền kề `09-01..09-30` + `10-01..10-31` → **cho phép**; cùng kỳ nhưng **khác student** → cho phép; hoá đơn `void` chồng lấn → cho phép (mệnh đề `WHERE status <> 'void'`). |
| INV-BILLING-31 | **int (DB thật)** *(PROPOSED)* | Chụp `COUNT` của `StudentInvoice`, `TuitionPayment`, `Notification`, `StudentTuitionRate` và `MAX(updatedAt)` từng bảng trước/sau khi gọi `POST .../batch/preview` **10 lần** với danh sách 40 học viên → **không một con số nào đổi**. |
| INV-BILLING-32 | int | 10 endpoint × {token teacher, token student, admin `status='suspended'`, admin `status='pending'`, không token} → 403/403/403/403/401. Kiểm cả trường hợp token còn hạn nhưng admin vừa bị suspend (kiểm ở service, không ở guard). |
| INV-BILLING-33 | int | Không tồn tại route student nào cho invoice (xác nhận SCOPE-BILL-01). Khi mở: student A gọi `GET` với `?studentId=<B>` → chỉ nhận hoá đơn của A (param bị bỏ qua), không phải 403 — chứng minh filter nằm trong WHERE. |
| INV-BILLING-34 | int | So khớp toàn bộ key của **mọi** response với whitelist; khẳng định không có `passwordHash`, `email`, `lastLoginAt`, `bio`, `hskLevelGoal` ở bất kỳ độ sâu nào (kể cả trong `payments[].recordedBy`). |

**Ca làm tròn — số liệu kỳ vọng cụ thể** (chạy trên DB thật, đây là các ca sẽ vỡ nếu ai đó chạm vào phép tính):

| # | Kịch bản | Kỳ vọng chính xác |
|---|---|---|
| R1 | Hoá đơn `2500000.00`; payment `1000000.00` rồi `1500000.00` | Sau P1: `paidAmount="1000000.00"`, `partially_paid`, `outstanding="1500000.00"`. Sau P2: `paidAmount="2500000.00"`, `paid`, `outstanding="0.00"` |
| R2 | Hoá đơn `2500000.00` chia **3 phần bằng nhau** | `2500000 / 3 = 833333.3333…` → mỗi payment `"833333.33"`. Sau 3 payment: `paidAmount = "2499999.99"`, `status = "partially_paid"` (**KHÔNG** phải `paid`), `outstanding = "0.01"`. **Payment thứ 4 phải là `"0.01"` mới đóng được hoá đơn** — nhưng `0.01 ₫` **không tồn tại trong tiền mặt VND**. Đây là ca chứng minh Q-BILL-1: hoá đơn kẹt vĩnh viễn ở `partially_paid` |
| R3 | Tiếp R2, payment thứ 4 = `"0.02"` | 400 `INVOICE_PAYMENT_EXCEEDS_TOTAL` (vượt `0.01`). Payment `"0.01"` → 201, `paidAmount = "2500000.00"`, `paid` |
| R4 | Nếu Q-BILL-1 chốt "VND nguyên": chia 3 | `833333 + 833333 + 833334 = 2500000` → `paid`, `outstanding = "0.00"`, **0 dư**. Phép chia phải giao phần lẻ cho payment cuối, không rải đều |
| R5 | Rate `"999999.99"`, 3 payment `"333333.33"` | `paidAmount = "999999.99"` đúng từng xu, `paid`. Nếu ai đó dùng float: `333333.33 × 3 = 999999.9899999999` → test fail |
| R6 | Hoá đơn `2500000.00`, payment `"2500000.001"` | 400 `VALIDATION_ERROR` (quá 2 chữ số thập phân) — **không** được làm tròn thành `2500000.00` rồi chấp nhận |
| R7 | Payment `"100000000.00"` (vượt trần `Decimal(10,2)` của `TuitionPayment.amount`) | Phải là **400 `VALIDATION_ERROR`**, **không** phải 500 do numeric overflow của PostgreSQL. Ca này lộ bất đối xứng schema: `totalAmount` là `Decimal(12,2)` (trần ~10 tỷ) nhưng `amount` là `Decimal(10,2)` (trần ~100 triệu) → **một hoá đơn trên 100 triệu không thể trả một lần**, buộc phải chia nhỏ. Q-BILL-1 |
| R8 | **C2 — hai câu SQL, hai số tiền** | Hôm nay `2026-08-19`. S1: rate `2200000` từ `01-01`, `2500000` từ `03-01`. Hoá đơn kỳ `2026-01-01..01-31`: **câu ADR-008** (`effectiveFrom <= periodStart ORDER BY DESC LIMIT 1`) → `"2200000.00"`. **Câu ENTITY** (`effectiveTo IS NULL OR effectiveTo > today`) → `"2500000.00"`. **Lệch 300.000₫/hoá đơn**; với 40 học viên là **12.000.000₫ một kỳ**. Test này phải tồn tại và phải **fail** cho tới khi C2 được chốt — nó là cái chuông báo |
| R9 | **C2 — khoảng trống rate** | Rate A `2200000` từ `01-01` có `effectiveTo = 2026-02-28`; rate B `2500000` từ `2026-04-01`. Hoá đơn kỳ `2026-03-01..03-31`: **câu ADR-008** → chọn A → `"2200000.00"` (áp một mức đã bị đóng). **Câu ENTITY** → không có mức active → **400 `INVOICE_NO_TUITION_RATE`**, không tạo hoá đơn. Hai kết cục khác nhau về **bản chất**: một bên phát hành hoá đơn, một bên từ chối |

**Test bổ sung không gắn INV** (vẫn bắt buộc):

- **Idempotency (Q-BILL-4)**: cùng `Idempotency-Key` + cùng body gửi 2 lần vào `POST .../payments` → **1** payment trong DB, response thứ hai **giống hệt** response đầu. Cùng key + body khác (`amount` khác) → 422. Cùng body + key khác → **2** payment (đúng, vì đó là hai lần trả tiền thật).
- **Rollback nguyên tử TX-BILL-A**: bơm lỗi ở bước 4 và bước 5 → sau rollback: 0 payment mới, `paidAmount` không đổi, 0 dòng audit.
- **Rollback nguyên tử TX-BILL-B**: bơm lỗi ở bước 4 (notification) → **0 hoá đơn** được tạo. Chứng minh notification nằm trong transaction.
- **Deadlock (§8.7)**: hai lô batch chồng danh sách học viên, chạy song song với thứ tự khoá **ngược nhau** → tái hiện `40P01`; sau khi ép `ORDER BY studentId` → không còn deadlock trong 100 vòng.
- **N+1 gate**: bật query log — `POST .../batch/preview` với 40 học viên → **≤ 6 query tổng**; `GET /admin/invoices` 20 dòng → ≤ 4 query; `GET /admin/invoices/:id` có 5 payment → ≤ 3 query; `GET /admin/invoices/summary` → **1 query**. Ngưỡng là gate CI.
- **Envelope**: response thành công khớp `{ data }` / `{ data, meta }`; lỗi khớp envelope **flat 7 field**; `details` **chỉ** xuất hiện ở `VALIDATION_ERROR` (và ở `INVOICE_BATCH_PARTIAL_FAILURE` nếu Q-BILL-3 chốt thế — hiện là **vi phạm convention**, ghi vào Q-BILL-3).
- **C5 envelope `data.rate`**: khẳng định hình dạng response khớp page contract FE, không chỉ khớp API_CONVENTIONS.

## 16. Chưa chốt

| # | Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|---|
| **Q-BILL-1** 🔴 | **Biểu diễn tiền — CHẶN TOÀN MODULE.** Ba vấn đề riêng biệt trong một: **(a) Đơn vị.** Entity dùng `Decimal(10,2)`/`Decimal(12,2)`, tức cho phép 2 chữ số thập phân. **VND không có đơn vị phụ** — không có "xu". Hệ quả đo được ở ca R2 (§15): hoá đơn `2.500.000₫` chia ba thành `833.333,33 × 3 = 2.499.999,99` → dư `0,01₫` **không ai trả được bằng tiền mặt** → hoá đơn kẹt vĩnh viễn ở `partially_paid`, và vì payment bất biến nên **không có đường thoát**. Phải chốt: dùng `Decimal(x,0)`? giữ `(x,2)` + CHECK `= trunc()`? hay chuyển hết sang integer VND? Mỗi lựa chọn là một migration khác nhau. **(b) Serialize.** `Prisma.Decimal` **không được lọt thẳng ra JSON response** — nó là đối tượng `Decimal.js`, hình dạng JSON của nó phụ thuộc phiên bản và cấu hình, và bất kỳ ai lỡ `Number(x)` trên đường đi là mất chính xác. Cần một interceptor/serializer toàn cục Decimal → string, và một lint rule cấm `Number`/`parseFloat` trong module. Chưa có thứ nào tồn tại. **(c) Bất đối xứng scale.** `TuitionPayment.amount` là `Decimal(10,2)` (trần ~99.999.999,99) nhưng `StudentInvoice.totalAmount` là `Decimal(12,2)` (trần ~9.999.999.999,99): **một hoá đơn trên 100 triệu không thể được trả bằng một payment duy nhất**, và nếu client gửi số đó thì lỗi phát ra là numeric overflow của PostgreSQL (500), không phải 400 (ca R7). | **CHẶN TOÀN BỘ MODULE** — mọi endpoint đều đọc hoặc ghi tiền; §4.2, §12, §15 đều phụ thuộc | BE lead + PO + kế toán | **trước mọi dòng code của module** |
| **C2** 🔴 | **Append-only vs `effectiveTo` — hai câu SQL, hai số tiền.** `ADR-008` (status **Accepted**, tóm tắt trong `_FACTS.md`) nói: đổi mức = **TẠO BẢN GHI MỚI** với `effectiveFrom` mới, **không update endpoint, không delete**, và câu đọc mức là `WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1` — **không dùng `effectiveTo`**. Nhưng `ENTITY_STUDENT_TUITION_RATE.md` ghi: *"To update rate: **set `effectiveTo` on current**, create new with new `effectiveFrom`"* và *"Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`"* — tức **CÓ update dòng cũ**, và neo vào **`today`** chứ không vào `periodStart`. **Hai cái không thể cùng đúng.** Hệ quả đo được: ca **R8** (§15) — cùng một hoá đơn kỳ 01/2026 ra `2.200.000₫` theo ADR-008 và `2.500.000₫` theo ENTITY; lệch **300.000₫/hoá đơn**, 40 học viên = **12 triệu/kỳ**. Ca **R9** — với khoảng trống rate, ADR-008 **phát hành** hoá đơn còn ENTITY **từ chối** phát hành. Thêm hai hệ quả cấu trúc: (a) nếu ghi `effectiveTo` thì `StudentTuitionRate` hết append-only → §8.5 và §6.2 phải thiết kế lại; (b) INV-BILLING-01/02/04/05, §7 TX-BILL-D phải viết lại. **Spec này tạm chốt theo ADR-008** — lý do: ADR ở trạng thái Accepted còn ENTITY doc không phải ADR; `API_ADMIN.md` viết thẳng "Both rate endpoints are read-only history views over **append-only tables** (see ADR 008) — no PATCH, no DELETE"; và page contract FE mô tả lịch sử mức **chỉ bằng `effectiveFrom` + cờ `current`**, không có `effectiveTo`. **Đây là chốt tạm, không phải quyết định.** | **CHẶN §4.1** — không được code phép chọn rate; kéo theo `POST /admin/invoices` và cả batch | BE lead + PO + tác giả ADR-008 | **trước mọi dòng code của module** |
| **Q-BILL-2** 🔴 | **Mô hình học phí.** `billingCycle` hiện chỉ có **một** giá trị `monthly`, và `ENTITY_STUDENT_TUITION_RATE` ghi thẳng: *"Tuition model (per-class / monthly flat / package) must be agreed before Sprint 7"*; `pages/_INDEX.md` xếp đây là **quyết định treo số 1**, chặn `/admin/tuition-rates` và **toàn bộ invoicing**. Nếu chốt **per-class**: số tiền phụ thuộc số buổi thực học → module phải đọc `ClassEnrollment` + `ClassSession` + `SessionAttendance` (hiện §1 ghi "không chạm"), `totalAmount` không còn suy ra được từ một mức duy nhất, và toàn bộ INV-BILLING-01 đổi bản chất. Nếu chốt **package**: kỳ hoá đơn không còn là tháng → `periodStart`/`periodEnd` đổi ngữ nghĩa, `billingCycle` cần thêm giá trị (migration enum), và câu hỏi "trả góp gói" sinh ra một mô hình lịch thanh toán chưa hề tồn tại. **Chốt sau khi đã code sẽ phải viết lại §3, §4.1, §7 và toàn bộ batch.** | Enum `billingCycle`; INV-BILLING-01/07; `GET /admin/tuition-rates` (PROPOSED); cả 4 endpoint batch/summary | PO | **trước Sprint 3** |
| **Q-BILL-3** 🔴 | **Batch partial failure: all-or-nothing hay per-item?** Hai phương án đã phân tích đầy đủ ở §7 TX-BILL-E kèm được/mất. Mã `INVOICE_BATCH_PARTIAL_FAILURE` (422) đã tồn tại trong registry với mô tả *"Batch generation **partly failed** — `details` lists the failed student IDs"* → tài liệu nguồn **nghiêng về per-item**, nhưng mã đó chưa được duyệt và `details` ở nhánh không phải `VALIDATION_ERROR` là **vi phạm `API_CONVENTIONS.md`** ("`details` is present only on `VALIDATION_ERROR`"). **Spec đề xuất phương án B + pha kiểm-trước bắt buộc**, không tự quyết. Kèm câu hỏi con: response 201 hay 207 hay 200-kèm-phân-loại? `Idempotency-Key` lưu kết quả cả lô hay từng item? | `POST /admin/invoices/batch` toàn bộ; FE `/admin/invoices/generate` step 3; §9 (envelope `details`) | BE lead + PO + FE lead | **trước Sprint 3** |
| **Q-BILL-5** 🔴 | **Void một hoá đơn đã có payment thì sao? Hoàn tiền bằng cách nào?** Hiện: void **không** reset `paidAmount`, **không** xoá payment (INV-BILLING-19) → tồn tại hoá đơn `void` mà trung tâm đang giữ tiền học viên. Hệ thống **không có bất kỳ cách nào biểu diễn việc hoàn lại**: `amount > 0` là bất biến (INV-BILLING-10) nên không có payment âm; payment bất biến (INV-BILLING-23) nên không xoá được; không có bảng `Refund`, không có `status = 'refunded'`. Ba lựa chọn: (a) **chặn cứng** — không cho void khi `paidAmount > 0` (cần mã lỗi mới ⛔); (b) **cho void, ghi nợ ngoài hệ thống** — hiện trạng, tức sổ sách chỉ nằm trong đầu admin; (c) **thêm cơ chế refund** — bảng mới hoặc nới `amount` cho phép âm (phá INV-BILLING-10 và mọi CHECK). Liên quan trực tiếp: hoá đơn `paid` **không void được** (INV-BILLING-20) → ghi nhầm mà đã thu đủ là **ngõ cụt tuyệt đối**. | §4.3; §6.1; metric `billing_void_with_payments_total`; quy trình vận hành thực tế | PO + kế toán | **trước Sprint 3** |
| **Q-BILL-6** 🔴 | **Overpayment: chặn cứng hay cho phép rồi ghi dư?** Tài liệu nguồn tự mâu thuẫn nhẹ: `ENTITY_TUITION_PAYMENT` nói `amount ≤ (totalAmount − paidAmount)` (**chặn cứng**), nhưng `ENTITY_STUDENT_INVOICE` định nghĩa `paid` là `paidAmount **>=** totalAmount` — dấu `>=` chỉ có ý nghĩa nếu `>` xảy ra được. Spec chốt tạm **chặn cứng** (INV-BILLING-10 + CHECK constraint). Nhưng thực tế: học viên chuyển dư 50.000₫, hoặc trả gộp hai tháng vào một lần chuyển khoản — hiện admin **không ghi nhận được**, phải yêu cầu chuyển lại. Nếu đổi sang "cho phép + ghi dư" thì: CHECK `paidAmount <= totalAmount` phải **gỡ bỏ** (mất hàng phòng thủ cuối), cần khái niệm số dư/credit của học viên (bảng mới), và cần quy tắc tự động khấu trừ vào hoá đơn kỳ sau. **Đổi sau khi đã có dữ liệu thật = migration gỡ constraint trên bảng tiền.** | INV-BILLING-10/11; CHECK constraint §12; §8.1 lớp L3 | PO + kế toán | **trước Sprint 3** |
| **Q-BILL-4** | **`Idempotency-Key`**: `API_CONVENTIONS.md` **không có mục nào** về idempotency. Có chuẩn hoá header + bảng `IdempotencyKey` toàn hệ thống không (dùng chung spec 05), hay chỉ riêng billing? Mã lỗi cho "key trùng, body khác" là gì (⛔ chưa có)? Với batch thì lưu response cả lô hay từng item (giao với Q-BILL-3)? | §8.2, §8.3; migration §12; `POST .../batch` | BE lead | trước Sprint 3 |
| **Q-BILL-7** | **`totalAmount` có được ghi đè không?** ENTITY ghi rate là *"**default** totalAmount"* → hàm ý sửa được. Nhưng `StudentInvoice` **không có cột `rateId`** và không có `rateAmountSnapshot` → một hoá đơn ghi đè **không giải thích được bằng bất kỳ rate nào**, và ngay cả hoá đơn không ghi đè cũng chỉ suy ra rate được bằng cách chạy lại câu SELECT (mà nếu C2 chốt sai chiều thì ra kết quả khác). Ba lựa chọn: cấm ghi đè (cần mã lỗi ⛔); cho ghi đè + thêm cột `rateId` + `overrideReason`; cho ghi đè và chấp nhận không truy vết được. Liên quan trực tiếp tới khả năng đối soát khi phụ huynh thắc mắc. | §3.3; INV-BILLING-01/02; khả năng đối soát | PO + BE lead | trước Sprint 3 |
| **Q-BILL-8** | **Thiếu 3 loại notification** (§10): không có `payment_recorded`, không có `invoice_voided`, không có `tuition_rate_changed`. Cộng với **SCOPE-BILL-01** (student không có route xem hoá đơn) và RBAC không cho student đọc rate, học viên **không có đường nào** biết: mình đã trả tới đâu, hoá đơn đã bị huỷ, học phí đã đổi. Thêm type = migration enum `Notification.type` + ADR. Đồng thời phải mở route student (`GET /student/invoices`, `GET /student/invoices/:id`) — nếu không thì `new_invoice` đang deep-link tới một trang không tồn tại. | §10; SCOPE-BILL-01; INV-BILLING-33; lane student | PO + BE lead | trước Sprint 4 |
| **Q-BILL-9** | **C5 — hình dạng envelope.** Page contract FE ghi `data.rate` (và `data.invoice` theo cùng lối), `API_CONVENTIONS.md` ghi `{ "data": {...} }` phẳng. Lệch nhau thì FE nhận `undefined` **không kèm lỗi HTTP** — loại bug khó lần nhất. Phải chốt **một** quy ước cho toàn hệ thống, không riêng billing. | §3 toàn bộ; contract FE của 4 màn billing | BE lead + FE lead | **trước khi khoá contract** |
| **Q-BILL-10** | `dueDate` bắt buộc client gửi, hay server tính mặc định (`periodEnd + N ngày`)? Nếu mặc định thì N bằng bao nhiêu và ai đặt? Ảnh hưởng trực tiếp `overdue` và `billing_invoice_overdue_gauge`. | §3.3; §14 | PO | trước Sprint 3 |
| **Q-BILL-11** | **Void không lưu được lý do.** `StudentInvoice` không có `voidReason`/`voidedAt`/`voidedBy`. Thêm 3 cột (migration §12) hay chỉ ghi bảng audit? **Và bảng audit chưa có ENTITY doc** dù §7, §13 và INV-BILLING-19/24 đều dựa vào nó — audit của payment là chứng từ kế toán duy nhất. Bảng tên gì, ai sở hữu? (trùng Q-PAY-13 của spec 05) | §3.6; §12; §13 | BE lead | trước Sprint 3 |
| **Q-BILL-12** | **Timezone của `dueDate`/`overdue`.** `periodStart`/`periodEnd`/`dueDate`/`effectiveFrom` là `Date` (không timezone); `paidAt` là `DateTime` **UTC**. Lớp học và việc thu tiền diễn ra theo giờ VN (UTC+7). Một hoá đơn `dueDate = 2026-09-30` sẽ bị đánh dấu quá hạn khi `now() > 2026-09-30T00:00Z`, tức **07:00 sáng ngày 30 giờ VN** — học viên bị coi là trễ **ngay trong ngày đến hạn**. So sánh `overdue` phải neo vào ngày địa phương VN, không vào UTC. (Trùng nhóm vấn đề với Q-PAY-1 của spec 05.) | §3.4 filter `overdue`; §14 metric quá hạn | BE lead | trước Sprint 3 |
| **Q-BILL-13** | `paymentMethod` là `varchar(50)` **tự do**, ENTITY chỉ nêu ví dụ. Tự do nghĩa là `bank_transfer`, `Bank Transfer`, `chuyển khoản` cùng tồn tại → báo cáo theo phương thức thanh toán vô nghĩa, và INV-BILLING-27 (unique theo `paymentMethod` + `transactionReference`) **bị vô hiệu hoá** vì cùng một giao dịch ghi với hai cách viết sẽ lọt. Chốt whitelist (enum hoặc CHECK) hay giữ tự do? | §3.7; INV-BILLING-27; báo cáo | PO + BE lead | trước Sprint 3 |
| **Q-BILL-14** | Chống hoá đơn chồng lấn kỳ: có bật `EXCLUDE USING gist` không (cần `btree_gist`, cần dọn dữ liệu chồng lấn cũ trước)? Không bật = chấp nhận học viên có thể bị tính tiền hai lần cho phần kỳ chồng nhau, mà INV-BILLING-28 **không bắt được**. Cần mã lỗi mới ⛔. | INV-BILLING-30; migration §12; §9 | BE lead + DBA | trước Sprint 3 |
| **Q-BILL-15** | Có tách vai trò "người phát hành hoá đơn" ≠ "người ghi nhận thanh toán" ≠ "người void" (four-eyes cho tiền mặt) không? Hiện một admin làm được cả ba, và `paymentMethod = 'cash'` là đường tiền không để lại dấu vết ngân hàng. | §5; §13 | PO | trước Sprint 4 |
| **Q-BILL-16** | Trôi giữa `preview` và `batch` (§8.3): có yêu cầu `previewHash` để bảo đảm số tiền admin duyệt trên màn hình đúng bằng số tiền được ghi không? Nếu không thì màn `/admin/invoices/generate` step 2 chỉ là trang trí. | §8.3; `POST .../batch` | BE lead + FE lead | trước Sprint 3 |
| **Q-BILL-17** | `API_CONVENTIONS.md` không có mục rate limit; registry không có mã 429 nào. §13 đang đề xuất. | §13; §9 | BE lead | Sprint 4 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH). `studentName` (§3.2–3.5) và `recordedBy.name` (§3.5, §3.7) đọc field nào? | Contract FE của 4 màn billing | BE lead | trước khi khoá contract |

**Phụ thuộc ngược**: module không chạy được end-to-end nếu chưa có học viên `role='student', status='active'` (spec 02) và chưa có rate cho họ. Batch chỉ có nghĩa khi **mọi** học viên active đã có rate — metric `billing_students_without_rate_gauge` (§14) chính là con số chặn.
