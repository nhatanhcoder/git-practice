# SPEC 05 — Payroll & TeacherPayRate

---
module: payroll
status: proposed
blocked_by: C2 (ADR-008 append-only vs ENTITY_TEACHER_PAY_RATE "set effectiveTo on current") — CHẶN §4 · Q-PAY-1 (ranh giới kỳ lương + timezone) · nhóm mã lỗi RATE_* *proposed, not agreed* · thiếu mã lỗi cho trùng kỳ · phụ thuộc spec 04 (SCOPE-01/02)
owner: -
last_updated: 2026-08-19
---

## 0. Tóm tắt

Module chịu trách nhiệm: đặt mức lương giáo viên (`TeacherPayRate`, append-only) và chốt lương theo kỳ (`PayrollPeriod`: gom session đã duyệt → tính tiền → finalize → đánh dấu đã trả). Ranh giới bắt đầu ở `ClassSession.status = 'approved'` (do spec 04 tạo ra) và kết thúc ở `PayrollPeriod.status = 'paid'`. Module này là nơi **duy nhất** được ghi `ClassSession.payrollPeriodId`. Module này KHÔNG duyệt session, KHÔNG sửa `ClassSession.status`, KHÔNG đụng học phí học viên (`StudentInvoice`, thuộc module billing).

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `TeacherPayRate` | Đọc + INSERT | **Chỉ INSERT.** Không UPDATE, không DELETE (ADR-008) — ⚠ C2 |
| `PayrollPeriod` | Đọc + Ghi | Ghi `status`, `totalSessions`, `totalAmount`, `paidAt` |
| `ClassSession` | Đọc + Ghi **1 field** | Chỉ ghi `payrollPeriodId`. Không ghi `status` và không ghi field nào khác |
| `User` | Đọc | Kiểm `role = 'teacher'`; tên hiển thị. ⚠ C1 |
| `Notification` | — | **Không ghi.** Không có notification type nào cho payroll trong ENTITY_NOTIFICATION (Q-PAY-8) |
| `SessionAttendance` | — | Không chạm. Điểm danh không ảnh hưởng tiền lương giáo viên |

## 2. Endpoints

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| POST | `/api/v1/admin/pay-rates` | admin | Tạo mức lương mới cho teacher (append) | **defined** (API_ADMIN.md) |
| GET | `/api/v1/admin/pay-rates` | admin | List mức lương hiện hành + lịch sử | **PROPOSED** — "shape is proposed, not agreed"; blocked on "pay-rate unit basis undecided" |
| POST | `/api/v1/admin/payroll` | admin | Tạo `PayrollPeriod` (draft) + gom + tính tiền | **defined** |
| GET | `/api/v1/admin/payroll` | admin | List kỳ lương, phân trang | **defined** |
| GET | `/api/v1/admin/payroll/:id` | admin | Chi tiết kỳ + breakdown từng session | **PROPOSED** — blocked on "period boundary undecided"; FE `/admin/payroll/[periodId]` phụ thuộc hoàn toàn ("the whole finalize path") |
| PATCH | `/api/v1/admin/payroll/:id/finalize` | admin | `draft → finalized` — cổng một chiều | **defined** |
| PATCH | `/api/v1/admin/payroll/:id/pay` | admin | `finalized → paid` | **defined** |

Không tồn tại và **không được thêm**: `PATCH /admin/pay-rates/:id`, `DELETE /admin/pay-rates/:id`, `DELETE /admin/payroll/:id`, `PATCH /admin/payroll/:id` (sửa số tiền), endpoint bỏ gán session khỏi kỳ.

Teacher đọc kỳ lương của mình: RBAC_MATRIX ghi `PayrollPeriod read own = 🔒 Teacher`, nhưng **không có route nào** hiện thực hoá (không có `API_TEACHER.md`) → Q-PAY-7.

## 3. DTO

### 3.1 `POST /admin/pay-rates`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `teacherId` | uuid | **có** | Tồn tại; `User.role = 'teacher'`; `User.status = 'active'` |
| `rateType` | enum | **có** | `per_session` \| `per_hour`. Không có giá trị nào khác (Q-PAY-9 về `fixed_monthly`) |
| `rateAmount` | Decimal(10,2) | **có** | `> 0`; gửi dạng **string** để tránh mất chính xác float (vd `"250000.00"`); tối đa 2 chữ số thập phân; đơn vị **VND** |
| `effectiveFrom` | Date `YYYY-MM-DD` | **có** | Phải **lớn hơn hẳn** `effectiveFrom` của bản ghi mới nhất hiện có của teacher đó (INV-PAYROLL-16) |

**Không nhận**: `effectiveTo` (⚠ C2 — nếu C2 kết luận theo ENTITY thì DTO này phải đổi), `id`, `createdAt`.

**Response 201**

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "rateType": "per_hour",
            "rateAmount": "250000.00", "effectiveFrom": "2026-09-01",
            "effectiveTo": null, "createdAt": "2026-08-19T09:00:00Z" } }
```

`effectiveTo` trả về luôn `null` theo ADR-008. Giữ field trong response chỉ vì cột tồn tại trong schema; ⚠ C2.

### 3.2 `GET /admin/pay-rates` *(PROPOSED)*

**Request (query)**: `page` (int ≥1, default 1) · `limit` (int 1..100, default 20) · `teacherId` (uuid, optional — có thì trả toàn bộ lịch sử của teacher đó) · `activeOnly` (bool, default `true` — chỉ trả mức đang hiệu lực hôm nay).

**Response 200**

```json
{
  "data": [
    { "teacherId": "uuid", "teacherName": "string",
      "current": { "id": "uuid", "rateType": "per_session", "rateAmount": "300000.00", "effectiveFrom": "2026-07-01" },
      "changesCount": 3 }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

`current` = `null` khi teacher chưa có mức nào (dòng cần hành động, FE sắp lên đầu). Khi truyền `teacherId` + `activeOnly=false` thì trả mảng lịch sử đầy đủ sắp xếp `effectiveFrom DESC`, mỗi phần tử thêm `isCurrent: boolean` (dẫn xuất, không lưu cột).

### 3.3 `POST /admin/payroll`

**Request**

| Field | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `teacherId` | uuid | **có** | Tồn tại; `role = 'teacher'` |
| `periodStart` | Date `YYYY-MM-DD` | **có** | Ngày lịch, không giờ, không timezone |
| `periodEnd` | Date `YYYY-MM-DD` | **có** | `>= periodStart`; độ dài kỳ ≤ 366 ngày |

**Header đề xuất**: `Idempotency-Key: <uuid>` (§8; chưa có trong API_CONVENTIONS.md → Q-PAY-5).

**Response 201**

```json
{ "data": { "id": "uuid", "teacherId": "uuid", "teacherName": "string",
            "periodStart": "2026-07-01", "periodEnd": "2026-07-31",
            "status": "draft", "totalSessions": 18, "totalAmount": "5400000.00",
            "paidAt": null, "createdAt": "2026-08-19T09:00:00Z" } }
```

### 3.4 `GET /admin/payroll`

**Request (query)**: `page` · `limit` · `teacherId` (uuid) · `status` (`draft`|`finalized`|`paid`) · `periodFrom` / `periodTo` (Date, lọc theo `periodStart`) · `sort` (`periodStart_desc` default | `periodStart_asc`).

**Response 200**: `{ "data": [ <object như 3.3 nhưng không có breakdown> ], "meta": {...} }`.

`totalSessions` và `totalAmount` đọc thẳng từ cột đã lưu — **không** JOIN đếm lại (§11).

### 3.5 `GET /admin/payroll/:id` *(PROPOSED)*

**Response 200**

```json
{
  "data": {
    "id": "uuid", "teacherId": "uuid", "teacherName": "string",
    "periodStart": "2026-07-01", "periodEnd": "2026-07-31",
    "status": "finalized", "totalSessions": 18, "totalAmount": "5400000.00",
    "paidAt": null,
    "sessions": [
      { "sessionId": "uuid", "classId": "uuid", "className": "string",
        "scheduledDate": "2026-07-03",
        "actualStart": "2026-07-03T11:00:00Z", "actualEnd": "2026-07-03T13:00:00Z",
        "hours": "2.00",
        "appliedRateId": "uuid", "appliedRateType": "per_hour", "appliedRateAmount": "250000.00",
        "amount": "500000.00" }
    ]
  }
}
```

`sessions[].hours`, `appliedRate*`, `amount` là **dẫn xuất tính lại lúc đọc**, không có cột trong DB. Hệ quả nghiêm trọng: sau khi kỳ đã `finalized`, breakdown được tính lại từ `TeacherPayRate` hiện có — nếu ai đó chèn được một rate lùi vào quá khứ thì `Σ sessions[].amount` sẽ lệch `totalAmount` đã chốt. Đây chính là lý do INV-PAYROLL-16 cấm chèn lùi. Phương án bền hơn (lưu snapshot dòng breakdown) → Q-PAY-4.

### 3.6 `PATCH /admin/payroll/:id/finalize` và `/pay`

**Request**: body rỗng `{}`. Không nhận field nào — đặc biệt không nhận `totalAmount`, `paidAt`, `status`.

**Response 200**: `{ "data": { "id", "status", "totalSessions", "totalAmount", "paidAt", "updatedAt" } }`.

## 4. Rule nghiệp vụ (invariant)

### 4.1 Chọn mức lương áp dụng — điểm chốt của toàn module

| ID | Phát biểu |
|---|---|
| **INV-PAYROLL-01** | Mức áp dụng cho **một session** là bản ghi `TeacherPayRate` của `teacherId` đó có hiệu lực **tại thời điểm session diễn ra**, chọn bằng đúng câu: `WHERE teacherId = :teacherId AND effectiveFrom <= :sessionDate ORDER BY effectiveFrom DESC LIMIT 1`. `:sessionDate` = `ClassSession.scheduledDate`. **CẤM** dùng: mức hiện tại (`effectiveTo IS NULL`), mức tại ngày tạo payroll, mức tại `periodEnd`, mức tại `now()`. |
| **INV-PAYROLL-02** | Hệ quả bắt buộc của INV-PAYROLL-01: **một `PayrollPeriod` có thể chứa nhiều mức khác nhau.** Đổi rate giữa kỳ → session trước ngày đổi tính mức cũ, session từ ngày đổi trở đi tính mức mới. Không có chuyện áp một mức duy nhất cho cả kỳ. |
| **INV-PAYROLL-03** | Mức áp dụng cho một session được xác định **một lần theo `scheduledDate`** và không phụ thuộc thứ tự xử lý, không phụ thuộc thời điểm chạy. Chạy lại phép tính trên cùng tập dữ liệu luôn ra cùng con số (tính xác định). |
| **INV-PAYROLL-04** | `rateType` áp dụng cũng lấy từ chính bản ghi được chọn ở INV-PAYROLL-01 — không lấy từ bản ghi mới nhất. Một kỳ có thể trộn cả `per_session` lẫn `per_hour` nếu teacher đổi hình thức tính giữa kỳ. |

### 4.2 Công thức tiền

| ID | Phát biểu |
|---|---|
| **INV-PAYROLL-05** | `rateType = 'per_session'` → `amount(session) = rate.rateAmount`. Số session, không quan tâm thời lượng. |
| **INV-PAYROLL-06** | `rateType = 'per_hour'` → `amount(session) = rate.rateAmount × hours(session)`, với `hours(session) = (actualEnd − actualStart)` quy ra **giờ thập phân**. **CẤM** dùng `scheduledStart`/`scheduledEnd` — đó là giờ dự kiến, không phải giờ thật. |
| **INV-PAYROLL-07** | `hours` tính ở độ phân giải **phút**: `hours = floor((actualEnd − actualStart) / 60s) / 60`, làm tròn xuống phút gần nhất, biểu diễn Decimal 4 chữ số thập phân. Bỏ phần giây. |
| **INV-PAYROLL-08** | Làm tròn tiền: `amount(session)` làm tròn **HALF_UP về 2 chữ số thập phân tại từng session**, rồi mới cộng. **CẤM** cộng trước rồi làm tròn sau. Lý do: `totalAmount` phải khớp chính xác tổng các dòng hiển thị trên `/admin/payroll/[periodId]` — lệch một đồng giữa tổng và breakdown là bug kế toán, không phải bug hiển thị. |
| **INV-PAYROLL-09** | `totalAmount = Σ amount(session)` trên tập gom, kiểu `Decimal(12,2)`, luôn `>= 0`. |
| **INV-PAYROLL-10** | `totalSessions = COUNT(session)` trên tập gom — **đếm số session**, kể cả khi `rateType = 'per_hour'`. Không phải số giờ. |
| **INV-PAYROLL-11** | Toàn bộ đường tính tiền dùng Decimal end-to-end (Prisma `Decimal` ↔ `numeric` của PostgreSQL). **CẤM** `Number`, `parseFloat`, `+`, `*` của JS ở bất kỳ khâu nào, kể cả khâu serialize. Tiền ra JSON dưới dạng **string**. |

### 4.3 Tập session được gom

| ID | Phát biểu |
|---|---|
| **INV-PAYROLL-12** | Session `s` được gom vào `PayrollPeriod(teacherId, periodStart, periodEnd)` **khi và chỉ khi** cả 4 điều kiện đồng thời đúng: `s.teacherId = :teacherId` **và** `s.status = 'approved'` **và** `s.payrollPeriodId IS NULL` **và** `s.scheduledDate BETWEEN :periodStart AND :periodEnd` (biên **đóng hai đầu** — đề xuất, Q-PAY-1). |
| **INV-PAYROLL-13** | Session chưa `approved` không bao giờ được gom. `status = 'approved'` phải nằm trong mệnh đề WHERE của cả câu SELECT lẫn câu UPDATE, không chỉ kiểm ở tầng ứng dụng. |
| **INV-PAYROLL-14** | Mỗi `ClassSession` thuộc **tối đa một** `PayrollPeriod`. `payrollPeriodId` là gán-một-lần: đã NOT NULL thì không bao giờ bị ghi đè, kể cả khi kỳ cũ bị bỏ. Điều kiện `payrollPeriodId IS NULL` phải nằm trong WHERE của câu UPDATE gán. |
| **INV-PAYROLL-15** | Không có session nào bị tính tiền hai lần: `SELECT payrollPeriodId, COUNT(*) FROM ClassSession WHERE payrollPeriodId IS NOT NULL GROUP BY id HAVING COUNT(*) > 1` luôn rỗng (bảo đảm bởi INV-PAYROLL-14 + khoá chính). |
| **INV-PAYROLL-16** | Nếu **bất kỳ** session nào trong tập gom không tìm được mức áp dụng theo INV-PAYROLL-01 → **toàn bộ request thất bại**, không tạo `PayrollPeriod` nào, không gán `payrollPeriodId` nào. All-or-nothing. **CẤM** tính 0 đồng, **CẤM** bỏ qua session đó. |
| **INV-PAYROLL-17** | `per_hour` mà `actualStart IS NULL` hoặc `actualEnd IS NULL` → không tính được `hours` → request thất bại toàn phần (cùng cơ chế INV-PAYROLL-16). Liên quan Q-SES-3 của spec 04. |
| **INV-PAYROLL-18** | Sau commit: `totalSessions = COUNT(ClassSession WHERE payrollPeriodId = period.id)`. Đây là bất biến kiểm chứng được bằng một câu query đối chiếu, dùng làm assertion trong test và trong job giám sát. |

### 4.4 Vòng đời kỳ lương

| ID | Phát biểu |
|---|---|
| **INV-PAYROLL-19** | Chuyển trạng thái hợp lệ **chỉ có hai**: `draft → finalized`, `finalized → paid`. Mọi chuyển đổi khác bị từ chối, bao gồm `finalized → draft`, `paid → finalized`, `draft → paid` (nhảy cóc), và tự-chuyển. |
| **INV-PAYROLL-20** | `finalized` là **cổng một chiều**: kỳ đã `finalized` thì `totalAmount`, `totalSessions`, `periodStart`, `periodEnd`, `teacherId` và tập session thuộc kỳ đều bất biến vĩnh viễn. Không endpoint nào sửa được. |
| **INV-PAYROLL-21** | Kỳ ở `finalized` hoặc `paid` → mọi `ClassSession` có `payrollPeriodId` trỏ tới kỳ đó bị khoá ghi hoàn toàn (khớp INV-SESSION-03 của spec 04). |
| **INV-PAYROLL-22** | `paidAt IS NULL` khi `status ∈ {draft, finalized}`; `paidAt IS NOT NULL` khi `status = 'paid'`; giá trị được set **đúng một lần** tại thời điểm chuyển sang `paid` và không bao giờ bị ghi đè. |
| **INV-PAYROLL-23** | Không có endpoint xoá kỳ lương. Kỳ tạo nhầm ở `draft` hiện **không có đường huỷ** — xem Q-PAY-6. |

### 4.5 Ràng buộc trùng lặp & rate

| ID | Phát biểu |
|---|---|
| **INV-PAYROLL-24** | Tồn tại **tối đa một** `PayrollPeriod` cho mỗi bộ `(teacherId, periodStart, periodEnd)`. Bảo đảm bằng **UNIQUE constraint ở DB**, không chỉ bằng kiểm tra ở service. |
| **INV-PAYROLL-25** | Hai `PayrollPeriod` của **cùng teacher** không được chồng lấn khoảng ngày. UNIQUE ở INV-PAYROLL-24 **không đủ**: `2026-07-01..07-31` và `2026-07-15..08-15` là hai bộ khác nhau nên vẫn lọt. Cần `EXCLUDE USING gist` trên `daterange` (§12). Trạng thái: **đề xuất**, Q-PAY-3. |
| **INV-PAYROLL-26** | `TeacherPayRate` là append-only: chỉ INSERT. Không UPDATE bản ghi cũ, không DELETE, không có endpoint nào cho phép (ADR-008 Accepted). ⚠ **C2** — xem §16. |
| **INV-PAYROLL-27** | `effectiveFrom` của bản ghi mới phải **lớn hơn hẳn** `MAX(effectiveFrom)` hiện có của teacher đó. Cấm chèn lùi quá khứ. Lý do: chèn lùi làm đổi số tiền của kỳ đã `finalized`/`paid` (xem §3.5 — breakdown tính lại lúc đọc). |
| **INV-PAYROLL-28** | Tối đa một `TeacherPayRate` cho mỗi bộ `(teacherId, effectiveFrom)` — UNIQUE ở DB. Không có ràng buộc này thì câu chọn mức ở INV-PAYROLL-01 trở nên **phi tất định** (hai dòng cùng `effectiveFrom`, `LIMIT 1` chọn ngẫu nhiên). |
| **INV-PAYROLL-29** | `rateAmount > 0`, đúng 2 chữ số thập phân, `Decimal(10,2)`. `rateType ∈ {per_session, per_hour}`. |
| **INV-PAYROLL-30** | `teacherId` phải trỏ tới `User` có `role = 'teacher'`. Kiểm ở service layer (FK chỉ trỏ `User`, không phân biệt role). |
| **INV-PAYROLL-31** | Chỉ actor `role = 'admin'` **và** `status = 'active'` gọi được toàn bộ 7 endpoint. Kiểm ở service layer, không chỉ `@Roles()` guard. |
| **INV-PAYROLL-32** | Response không bao giờ chứa `User.passwordHash`, `User.email`, hay field nhạy cảm khác — chỉ `teacherId` + tên hiển thị. |

## 5. Ownership / RBAC

Guard: `@Roles('admin')` trên cả 7 route. Kiểm thêm ở **service layer**:

- `actor.role === 'admin' && actor.status === 'active'` — sai → `AUTH_INSUFFICIENT_ROLE` 403.
- **Không có ownership filter**: RBAC_MATRIX ghi `TeacherPayRate set = ✅ Admin`, `PayrollPeriod create/finalize/pay = ✅ Admin` → admin thao tác trên mọi teacher.
- Teacher: `PayrollPeriod read own = 🔒` — **chưa có route** (Q-PAY-7). Khi làm phải là route riêng (vd `/api/v1/teacher/payroll`) với điều kiện service-layer `period.teacherId === actor.id`, **không** mở `/admin/*` cho teacher.
- Teacher với `TeacherPayRate`: `❌` — teacher không đọc được cả mức lương của chính mình theo ma trận hiện tại. (Nghiệp vụ đáng ngờ nhưng đây là điều ma trận nói; không tự sửa.)
- Student: `❌` toàn bộ.
- Tách quyền tài chính: hiện mọi admin đều finalize và pay được. Có cần tách vai trò "người chốt" ≠ "người chi" (nguyên tắc four-eyes) không → Q-PAY-10.

## 6. State machine

### 6.1 `PayrollPeriod`

```
       POST /api/v1/admin/payroll
       ├─ gom session (approved, payrollPeriodId IS NULL, trong khoảng ngày)
       ├─ tra rate theo scheduledDate từng session
       ├─ tính amount từng session → totalAmount, totalSessions
       └─ gán payrollPeriodId cho từng session
                    │  ← TẤT CẢ TRONG MỘT TRANSACTION (§7)
                    ▼
              ┌───────────┐
              │   draft   │   totalAmount đã tính, paidAt = NULL
              └───────────┘   sessions đã bị gán payrollPeriodId
                    │
                    │ PATCH /admin/payroll/:id/finalize      (body rỗng)
                    ▼
        ╔═══════════════════════╗
        ║      finalized        ║ ◄══ CỔNG MỘT CHIỀU
        ╚═══════════════════════╝     totalAmount / totalSessions / tập session
                    │                 BẤT BIẾN VĨNH VIỄN — không có đường về draft
                    │                 sessions thuộc kỳ bị khoá ghi (INV-PAYROLL-21)
                    │ PATCH /admin/payroll/:id/pay           (body rỗng)
                    ▼
        ╔═══════════════════════╗
        ║        paid           ║ ◄══ TRẠNG THÁI CUỐI
        ╚═══════════════════════╝     paidAt = now(), set đúng một lần
                                      không có transition ra khỏi đây
```

**Bảng chuyển đổi**

| Từ | Sang | Endpoint | Hợp lệ |
|---|---|---|---|
| (không có) | `draft` | `POST /admin/payroll` | ✅ |
| `draft` | `finalized` | `PATCH /:id/finalize` | ✅ |
| `finalized` | `paid` | `PATCH /:id/pay` | ✅ |
| `draft` | `paid` | — | ❌ nhảy cóc, 409 |
| `finalized` | `draft` | — | ❌ **không tồn tại** |
| `paid` | bất kỳ | — | ❌ **không tồn tại** |
| bất kỳ | (xoá) | — | ❌ không có endpoint (Q-PAY-6) |

**Cổng một chiều — phát biểu chính xác**: sau `finalize`, số tiền đã là cam kết chi trả. Không có "undo", không có cờ admin, không có sửa `totalAmount`. Sai sót sau khi finalize phải xử lý bằng kỳ điều chỉnh ở kỳ sau — **nhưng cơ chế kỳ điều chỉnh chưa được thiết kế** (Q-PAY-6). Cổng khoá lan sang `ClassSession`: session thuộc kỳ finalized bị khoá ghi (bắt tay với INV-SESSION-03).

### 6.2 `TeacherPayRate`

```
(không có) ──INSERT──► bản ghi bất biến ──► [KẾT THÚC]
                            │
                            └── không UPDATE, không DELETE, không status
```

`TeacherPayRate` **không có state machine** — không có cột `status`. "Hiệu lực" là thuộc tính **dẫn xuất từ ngày**, không phải trạng thái lưu trữ: mức hiệu lực tại ngày D = bản ghi có `effectiveFrom <= D` mới nhất. Đây chính là điểm C2 tranh chấp: nếu `effectiveTo` được ghi thì "hiệu lực" biến thành trạng thái lưu trữ và mọi câu ở INV-PAYROLL-01 phải viết lại.

## 7. Transaction boundary

### TX-PAY-A — `POST /admin/payroll` (khối quan trọng nhất của module)

Isolation: `READ COMMITTED` + `SELECT ... FOR UPDATE` ở bước 3. Không dùng `SERIALIZABLE` (chi phí retry cao trên bảng session nóng, và row lock đã đủ tuần tự hoá).

```
BEGIN
 1. Validate DTO. SELECT User WHERE id=:teacherId → tồn tại, role='teacher'
    (fail → rollback, không có gì được ghi)

 2. INSERT PayrollPeriod (teacherId, periodStart, periodEnd,
                          status='draft', totalSessions=0, totalAmount=0)
    -- INSERT TRƯỚC, có chủ ý: UNIQUE(teacherId, periodStart, periodEnd) bắn ngay tại đây,
    -- chặn request song song cùng kỳ ở điểm sớm nhất, TRƯỚC khi tốn công gom và tính.
    -- P2002 → rollback → 409 (§9)

 3. SELECT id, scheduledDate, actualStart, actualEnd
      FROM "ClassSession"
     WHERE "teacherId"=:teacherId AND status='approved'
       AND "payrollPeriodId" IS NULL
       AND "scheduledDate" BETWEEN :periodStart AND :periodEnd
     ORDER BY "scheduledDate", id
       FOR UPDATE
    -- FOR UPDATE khoá hàng: request song song có khoảng ngày chồng lấn phải CHỜ,
    -- rồi đọc lại trạng thái sau commit → không gom trùng.

 4. SELECT id, rateType, rateAmount, effectiveFrom
      FROM "TeacherPayRate" WHERE "teacherId"=:teacherId
     ORDER BY "effectiveFrom" DESC
    -- MỘT query duy nhất, nạp toàn bộ mức của teacher (số dòng nhỏ),
    -- rồi khớp trong bộ nhớ theo scheduledDate → tránh N+1 (§11).

 5. Với từng session: chọn rate (INV-PAYROLL-01) → tính amount (INV-PAYROLL-05..08)
    -- Không tìm được rate         → THROW → rollback toàn phần (INV-PAYROLL-16)
    -- per_hour thiếu actualStart/End → THROW → rollback toàn phần (INV-PAYROLL-17)

 6. UPDATE "ClassSession" SET "payrollPeriodId"=:periodId, "updatedAt"=now()
     WHERE id IN (:ids) AND "payrollPeriodId" IS NULL AND status='approved'
    -- affectedRows PHẢI = số dòng ở bước 3. Khác → THROW → rollback (INV-PAYROLL-14)

 7. UPDATE "PayrollPeriod" SET "totalSessions"=:n, "totalAmount"=:sum, "updatedAt"=now()
     WHERE id=:periodId

 8. INSERT audit (actorId, periodId, action='create', totalAmount, totalSessions, at)
COMMIT
```

**Bắt buộc cùng transaction**: gom + tính + INSERT period + gán `payrollPeriodId` + ghi audit. Không tồn tại trạng thái trung gian nào quan sát được từ bên ngoài: không có period đã tạo mà session chưa gán (kỳ hiển thị 0 đồng sai), không có session đã gán mà period rollback (session bị "mồ côi", khoá vĩnh viễn khỏi mọi kỳ tương lai vì `payrollPeriodId` NOT NULL trỏ tới id không tồn tại).

Nếu bước 6 chạy ngoài transaction của bước 2 thì một lần crash giữa chừng để lại session mồ côi **không thể tự phục hồi** — session đã approved, đã gán, nhưng không bao giờ được trả lương. Đây là mất tiền thật của giáo viên, không phải lỗi dữ liệu nhẹ.

### TX-PAY-B — `finalize`

```
BEGIN
 1. UPDATE "PayrollPeriod" SET status='finalized', "updatedAt"=now()
     WHERE id=:id AND status='draft'          -- conditional update
    -- affectedRows = 0 → THROW (phân loại lỗi ở §8)
 2. INSERT audit (actorId, periodId, action='finalize', totalAmount tại thời điểm chốt, at)
COMMIT
```

Audit phải ghi lại `totalAmount` **tại thời điểm chốt** — đây là bản ghi duy nhất chứng minh số tiền đã cam kết, độc lập với việc breakdown ở §3.5 được tính lại.

### TX-PAY-C — `pay`

```
BEGIN
 1. UPDATE "PayrollPeriod" SET status='paid', "paidAt"=now(), "updatedAt"=now()
     WHERE id=:id AND status='finalized' AND "paidAt" IS NULL
 2. INSERT audit (actorId, periodId, action='pay', paidAt, at)
COMMIT
```

`AND "paidAt" IS NULL` là dư thừa về logic (status đã bao hàm) nhưng giữ lại làm hàng rào thứ hai cho INV-PAYROLL-22.

### TX-PAY-D — `POST /admin/pay-rates`

```
BEGIN
 1. SELECT User WHERE id=:teacherId → role='teacher'
 2. pg_advisory_xact_lock(hashtext('pay_rate:' || :teacherId))
    -- tuần tự hoá theo teacher; không thể FOR UPDATE vì có thể chưa có dòng nào
 3. SELECT MAX("effectiveFrom") FROM "TeacherPayRate" WHERE "teacherId"=:teacherId
    -- :effectiveFrom <= max → THROW RATE_EFFECTIVE_DATE_IN_PAST (INV-PAYROLL-27)
 4. INSERT "TeacherPayRate" (...)
    -- UNIQUE(teacherId, effectiveFrom) là hàng rào cuối nếu advisory lock bị bỏ qua
 5. INSERT audit
COMMIT
```

**Không được nằm trong transaction** (mọi TX): gọi HTTP ngoài, gửi email/thông báo ngân hàng, ghi file. Nếu sau này cần thông báo cho teacher khi kỳ `paid` thì dùng outbox (INSERT trong TX, worker gửi ngoài TX) — chưa trong phạm vi, Q-PAY-8.

## 8. Idempotency & concurrency

### 8.1 Hai request tạo payroll cùng kỳ cho cùng teacher

Đây là kịch bản phải chặn tuyệt đối: gom trùng = trả lương hai lần.

**Ba lớp phòng thủ, cần cả ba** (mỗi lớp chặn một kịch bản khác nhau):

| Lớp | Cơ chế | Chặn kịch bản |
|---|---|---|
| **L1 — DB constraint** | `UNIQUE (teacherId, periodStart, periodEnd)` trên `PayrollPeriod`, đặt tên `payroll_period_teacher_range_uq` | Hai admin **khác nhau** cùng bấm tạo kỳ 07/2026 cho cùng teacher. INSERT ở bước 2 của TX-PAY-A → người thua nhận Prisma `P2002` → 409. Đây là hàng rào **không thể vượt**, kể cả khi tầng ứng dụng có bug. |
| **L2 — Idempotency key** | Header `Idempotency-Key: <uuid>` + bảng phụ `IdempotencyKey(key PK, endpoint, actorId, requestHash, responseStatus, responseBody jsonb, createdAt)`, TTL 24h | **Cùng một client** retry vì timeout mạng, hoặc user double-click. L1 không cứu được ở đây vì client cần lại **response cũ**, không phải một lỗi 409 khó hiểu. Ngữ nghĩa: cùng `key` + cùng `requestHash` → phát lại response đã lưu nguyên trạng (201 + body cũ); cùng `key` + khác `requestHash` → 422. Ghi `IdempotencyKey` **trong cùng TX-PAY-A**. |
| **L3 — Predicate trên session** | `AND "payrollPeriodId" IS NULL` trong WHERE của bước 6 (TX-PAY-A) + kiểm `affectedRows` khớp số dòng bước 3 | Hai kỳ **khác nhau nhưng chồng lấn ngày** (vd `07-01..07-31` và `07-15..08-15`) — L1 không bắt được vì hai bộ khoá khác nhau. L3 bảo đảm mỗi session chỉ vào đúng một kỳ, nên tiền không nhân đôi ngay cả khi kỳ chồng lấn được tạo. |

**Vẫn còn lỗ**: L3 chặn nhân đôi tiền nhưng **không chặn tạo kỳ chồng lấn**, dẫn tới hai kỳ mà kỳ sau chỉ nhặt được phần session còn thừa — số liệu báo cáo méo. Bịt bằng `EXCLUDE USING gist` (INV-PAYROLL-25, §12) — đề xuất, Q-PAY-3.

**Vì sao `FOR UPDATE` ở bước 3 là cần thiết dù đã có L3**: không có nó, hai request chồng lấn cùng SELECT ra tập session trùng nhau, cùng chạy tới bước 6, một request thắng và request kia thấy `affectedRows` lệch → rollback sau khi đã làm hết việc. Có `FOR UPDATE`, request thứ hai chờ ở bước 3, đọc lại sau commit và thấy các session đã có `payrollPeriodId` → tự loại chúng ra một cách sạch sẽ.

### 8.2 finalize / pay đồng thời

**Conditional update — optimistic lock lấy `status` làm cột version** (giống spec 04 §8):

```sql
UPDATE "PayrollPeriod" SET status='finalized', "updatedAt"=now()
 WHERE id = $1 AND status = 'draft';
```

Prisma `updateMany` → kiểm `count === 1`. **Cấm** `findUnique` kiểm status rồi `update` theo `id` — read-then-write không nguyên tử, hai admin cùng finalize sẽ cùng "thắng" và ghi hai dòng audit.

Phân loại khi `affectedRows = 0` (một `SELECT id, status` sau rollback):

| Kết quả | HTTP | code |
|---|---|---|
| 0 dòng | 404 | `PAYROLL_PERIOD_NOT_FOUND` |
| finalize mà status ∈ {`finalized`,`paid`} | 409 | `PAYROLL_PERIOD_FINALIZED` |
| pay mà status = `draft` | 409 | `PAYROLL_PERIOD_FINALIZED` (chưa finalize thì không được pay) |
| pay mà status = `paid` | 409 | `PAYROLL_PERIOD_FINALIZED` |

⚠ Ba nhánh cuối dùng chung một mã vì registry **không có** mã riêng cho "chưa finalize" và "đã paid". Đây là lỗ hổng mã lỗi → Q-PAY-11. Không tự đặt mã mới.

### 8.3 `POST /admin/pay-rates` đồng thời

Hai admin cùng set mức cho một teacher cùng lúc → không có lock thì cả hai qua bước kiểm `MAX(effectiveFrom)` rồi cùng INSERT, tạo hai bản ghi cùng `effectiveFrom` → INV-PAYROLL-01 trở thành phi tất định (`LIMIT 1` chọn ngẫu nhiên một trong hai mức khác nhau → **số tiền lương phụ thuộc may rủi**). Chặn bằng `pg_advisory_xact_lock` (TX-PAY-D bước 2) + `UNIQUE(teacherId, effectiveFrom)` làm hàng rào cuối.

### 8.4 Payroll chạy song song với approve session (spec 04)

TX-PAY-A bước 3 khoá hàng `ClassSession` bằng `FOR UPDATE`; TX-SES-A của spec 04 ghi cùng hàng bằng conditional UPDATE. Hai transaction chạm cùng hàng → PostgreSQL tuần tự hoá tự động ở tầng row lock. Hai kết quả có thể xảy ra, cả hai đều đúng: (a) approve commit trước → session lọt vào tập gom; (b) payroll commit trước → session vào kỳ sau. Không có kịch bản session bị gom với status cũ.

### 8.5 Request lặp trên finalize / pay

Lần hai nhận **409**, không trả 200 giả-idempotent (cùng lý do spec 04 §8: đây là hành động tài chính, nuốt lặng lần bấm thứ hai che mất tranh chấp giữa hai admin). Không dùng `Idempotency-Key` cho hai endpoint này — khoá tự nhiên `(periodId, status hiện tại)` đã đủ.

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái code |
|---|---|---|---|
| Không token / token hỏng | 401 | `AUTH_TOKEN_INVALID` | có trong API_ERROR_CODES.md |
| Token hết hạn | 401 | `AUTH_TOKEN_EXPIRED` | có trong API_ERROR_CODES.md |
| Không phải admin / admin bị suspend | 403 | `AUTH_INSUFFICIENT_ROLE` | có trong API_ERROR_CODES.md |
| DTO sai (`rateAmount <= 0`, `periodEnd < periodStart`, enum sai, uuid sai) | 400 | `VALIDATION_ERROR` + `details` | có trong API_ERROR_CODES.md |
| `teacherId` không tồn tại | 404 | `USER_NOT_FOUND` | có trong API_ERROR_CODES.md |
| `teacherId` tồn tại nhưng `role ≠ 'teacher'` | 400 | `VALIDATION_ERROR` với `details.teacherId` | có trong API_ERROR_CODES.md |
| `:id` kỳ lương không tồn tại | 404 | `PAYROLL_PERIOD_NOT_FOUND` | ⚠ **tranh chấp** — có trong registry API_ERROR_CODES.md §3, **không có** trong danh sách "Mã lỗi đã có" của `_FACTS.md` (Q-PAY-11) |
| finalize khi ≠ `draft`; pay khi ≠ `finalized` | 409 | `PAYROLL_PERIOD_FINALIZED` | ⚠ **tranh chấp** (như trên) |
| Không có mức lương hiệu lực tại `scheduledDate` của một session bất kỳ | 404 | `RATE_NOT_FOUND` | **proposed, not agreed** (nhóm RATE_*) |
| `effectiveFrom` ≤ `MAX(effectiveFrom)` hiện có | 400 | `RATE_EFFECTIVE_DATE_IN_PAST` | **proposed, not agreed** |
| Có ai đó thêm route sửa/xoá rate | 409 | `RATE_IMMUTABLE` | **proposed, not agreed** — hiện không route nào cần dùng |
| **Trùng kỳ `(teacherId, periodStart, periodEnd)`** | 409 | **DUPLICATE_ENTRY** | ⚠ **LỖ HỔNG** — mã này chỉ xuất hiện trong đoạn code `GlobalExceptionFilter` ở API_ERROR_CODES.md §5 (map Prisma `P2002`), **không có trong bảng registry §3**. Không có mã `PAYROLL_PERIOD_DUPLICATE` (*proposed*, 2026-08-19). Cần chốt (Q-PAY-11) |
| Kỳ chồng lấn ngày (nếu bật EXCLUDE constraint) | 409 | *(chưa có mã)* | ⚠ **LỖ HỔNG** (Q-PAY-3 + Q-PAY-11) |
| `per_hour` mà `actualStart`/`actualEnd` NULL | 400 | *(chưa có mã)* | ⚠ **LỖ HỔNG** — `PAYROLL_SESSION_NOT_COMPLETED` gần nghĩa nhất nhưng không đúng ngữ nghĩa (session đã approved rồi). Q-PAY-11 |
| `Idempotency-Key` trùng, `requestHash` khác | 422 | *(chưa có mã)* | ⚠ **LỖ HỔNG** — Q-PAY-5 |

**Tổng kết mã lỗi**: module này có **4 nhánh lỗi không có mã hợp lệ** và **2 nhóm mã ở trạng thái tranh chấp**. Không được tự đặt mã mới. Nếu tới lúc code vẫn chưa chốt: dùng HTTP status đúng + `VALIDATION_ERROR` hoặc mã gần nhất, ghi TODO có mã theo dõi, và **không** khoá contract FE cho các nhánh đó.

Envelope lỗi flat theo API_CONVENTIONS.md; `details` chỉ có ở `VALIDATION_ERROR`.

## 10. Side effect & notification

**Module này KHÔNG sinh Notification nào.** `ENTITY_NOTIFICATION.md` liệt kê 11 type và **không có type nào cho payroll**: không có `payroll_finalized`, không có `payroll_paid`, không có `pay_rate_changed`.

Hệ quả nghiệp vụ: giáo viên **không được thông báo** khi kỳ lương của mình được chốt hay được chi trả, và không được thông báo khi mức lương của mình thay đổi. Kết hợp với việc RBAC cho teacher đọc `TeacherPayRate` là `❌`, giáo viên **không có bất kỳ đường nào** biết mức lương của mình đã đổi. → Q-PAY-8.

**Side effect thực tế của module** (không phải notification):

| Hành động | Tác dụng phụ lên bảng khác |
|---|---|
| `POST /admin/payroll` | Ghi `ClassSession.payrollPeriodId` cho N session → khoá lớp thứ hai lên các session đó (INV-SESSION-03 spec 04) |
| `PATCH /:id/finalize` | Khoá vĩnh viễn số tiền + khoá ghi toàn bộ session thuộc kỳ (INV-PAYROLL-21) |
| `PATCH /:id/pay` | Set `paidAt`; là input cho ô "monthly payroll" của `GET /admin/dashboard/stats` |
| `POST /admin/pay-rates` | Đổi mức áp dụng cho **các session tương lai**; không đổi kỳ đã tạo (nhờ INV-PAYROLL-27 cấm chèn lùi) |

Không gửi email, không webhook, không gọi cổng ngân hàng. `PATCH /:id/pay` chỉ **ghi nhận** rằng chuyển khoản đã xảy ra ngoài hệ thống (ENTITY_PAYROLL_PERIOD: "Admin marks after actual bank transfer").

## 11. Index & query

```
PayrollPeriod:  UNIQUE ("teacherId", "periodStart", "periodEnd")   -- INV-PAYROLL-24, tên payroll_period_teacher_range_uq
PayrollPeriod:  INDEX  ("teacherId", "periodStart" DESC)           -- GET /admin/payroll lọc + sort
PayrollPeriod:  INDEX  (status)                                    -- lọc theo trạng thái + dashboard
TeacherPayRate: UNIQUE ("teacherId", "effectiveFrom")              -- INV-PAYROLL-28 (bắt buộc, không phải tối ưu)
TeacherPayRate: INDEX  ("teacherId", "effectiveFrom" DESC)         -- câu chọn mức INV-PAYROLL-01
ClassSession:   INDEX  ("teacherId", status, "scheduledDate")      -- câu gom TX-PAY-A bước 3
ClassSession:   INDEX  ("payrollPeriodId")                         -- breakdown GET /admin/payroll/:id
ClassSession:   INDEX  ("teacherId", "scheduledDate")
                  WHERE status='approved' AND "payrollPeriodId" IS NULL   -- partial, tập gom luôn nhỏ
```

**Nguy cơ N+1 — bắt buộc chặn**:

1. **Nặng nhất**: vòng lặp tra `TeacherPayRate` cho từng session → N query cho N session (một kỳ 20–40 session = 40 query). **Sửa**: một query nạp toàn bộ mức của teacher (`ORDER BY effectiveFrom DESC`), khớp trong bộ nhớ bằng cách quét mảng đã sắp xếp tìm phần tử đầu tiên có `effectiveFrom <= scheduledDate`. Số dòng rate mỗi teacher luôn nhỏ (đơn vị chục).
2. `GET /admin/payroll` list: **cấm** JOIN `ClassSession` để đếm lại `totalSessions` — đọc thẳng cột đã lưu. Đó là lý do cột này tồn tại.
3. `GET /admin/payroll` list: vòng lặp lấy `teacherName` từng dòng → dùng `include: { teacher: { select: { id, nickname } } }`.
4. `GET /admin/payroll/:id`: lấy toàn bộ session của kỳ trong **một** query (index `payrollPeriodId`), lấy `Class` bằng `include`, lấy rate bằng một query như mục 1.
5. `meta.total`: `COUNT(*)` riêng cùng WHERE, không `findMany().length`.

**Query kiểm tra tính đúng đắn** (chạy trong job giám sát, §14):

```sql
-- INV-PAYROLL-18: totalSessions phải khớp số session thực gán
SELECT p.id, p."totalSessions", COUNT(s.id)
  FROM "PayrollPeriod" p LEFT JOIN "ClassSession" s ON s."payrollPeriodId" = p.id
 GROUP BY p.id, p."totalSessions" HAVING p."totalSessions" <> COUNT(s.id);
-- kết quả PHẢI rỗng

-- session mồ côi: đã gán nhưng kỳ không tồn tại
SELECT s.id FROM "ClassSession" s
 WHERE s."payrollPeriodId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "PayrollPeriod" p WHERE p.id = s."payrollPeriodId");
-- PHẢI rỗng (FK đảm bảo, nhưng kiểm để bắt trường hợp FK chưa được tạo)

-- session đã gán nhưng chưa approved: vi phạm INV-PAYROLL-13
SELECT id FROM "ClassSession" WHERE "payrollPeriodId" IS NOT NULL AND status <> 'approved';
-- PHẢI rỗng
```

## 12. Migration & seed

**Migration bắt buộc**

```
-- PayrollPeriod
ADD UNIQUE ("teacherId", "periodStart", "periodEnd")     -- INV-PAYROLL-24
ADD CHECK  ("periodEnd" >= "periodStart")
ADD CHECK  ("totalAmount" >= 0 AND "totalSessions" >= 0)
ADD CHECK  (("status" = 'paid') = ("paidAt" IS NOT NULL))  -- INV-PAYROLL-22
ADD INDEX  ("teacherId", "periodStart" DESC), INDEX (status)

-- TeacherPayRate
ADD UNIQUE ("teacherId", "effectiveFrom")                -- INV-PAYROLL-28
ADD CHECK  ("rateAmount" > 0)
ADD INDEX  ("teacherId", "effectiveFrom" DESC)

-- ClassSession
ADD FK     ("payrollPeriodId") REFERENCES "PayrollPeriod"(id)   -- xác nhận đã có
ADD INDEX  ("payrollPeriodId")
ADD partial INDEX như §11
```

**Migration đề xuất, chờ quyết** (không chạy trước khi chốt):

```
-- Q-PAY-3: chống kỳ chồng lấn (INV-PAYROLL-25)
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT payroll_period_no_overlap
  EXCLUDE USING gist (
    "teacherId" WITH =,
    daterange("periodStart", "periodEnd", '[]') WITH &&
  );
-- Bắt buộc kiểm dữ liệu chồng lấn hiện có TRƯỚC khi chạy, nếu không migration fail.

-- Q-PAY-5: bảng idempotency
CREATE TABLE "IdempotencyKey" (
  key text PRIMARY KEY, endpoint text NOT NULL, "actorId" uuid NOT NULL,
  "requestHash" text NOT NULL, "responseStatus" int, "responseBody" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
```

**Migration phụ thuộc C2** (không chạy trước khi chốt C2): nếu chốt theo ADR-008 thuần thì cột `TeacherPayRate.effectiveTo` trở thành cột chết → hoặc DROP (breaking cho FE contract), hoặc giữ và thêm `CHECK ("effectiveTo" IS NULL)` để cấm ghi. Nếu chốt theo ENTITY doc thì phải thêm cơ chế UPDATE và **viết lại toàn bộ INV-PAYROLL-01, 26, 27, §6.2, §7 TX-PAY-D**.

**Seed để test tiền và tranh chấp** (phải INSERT thẳng DB vì SCOPE-01/02 của spec 04 chặn đường tạo qua API):

1. 2 admin `role=admin, status=active` (để test hai admin tranh chấp).
2. Teacher **T1** — `rateType=per_session`, 2 mức: `250000.00` từ `2026-07-01`, `300000.00` từ `2026-07-16`.
3. Teacher **T2** — `rateType=per_hour`, 1 mức `200000.00` từ `2026-07-01`.
4. Teacher **T3** — **không có mức nào** (test INV-PAYROLL-16).
5. Teacher **T4** — mức đầu tiên từ `2026-07-10`, và có session `approved` ngày `2026-07-05` (**trước** mức đầu tiên → test INV-PAYROLL-16 ở nhánh "có rate nhưng chưa hiệu lực").
6. Session của T1: 4 session `approved` ngày `07-03, 07-10, 07-20, 07-25` → kỳ 07/2026 phải ra `2×250000 + 2×300000 = 1.100.000` với `totalSessions = 4`. **Đây là ca kiểm chứng INV-PAYROLL-02.**
7. Session của T2: session 2h00 (`11:00Z→13:00Z`) → `400000.00`; session 1h30 (`11:00Z→12:30Z`) → `300000.00`; session 1h37m20s → `hours = 1.6166` (làm tròn xuống phút: 97 phút) → `200000 × 97/60 = 323333.333…` → **HALF_UP 2 chữ số = `323333.33`**. Tổng kỳ = `1.023.333,33`. **Đây là ca kiểm chứng INV-PAYROLL-07 + INV-PAYROLL-08.**
8. Session của T2 thiếu `actualEnd` (test INV-PAYROLL-17).
9. Session `completed_pending` và `rejected` trong khoảng kỳ (phải **không** được gom — INV-PAYROLL-13).
10. Session `approved` đã có `payrollPeriodId` trỏ tới một kỳ cũ (phải **không** bị gom lại — INV-PAYROLL-14).
11. Session `approved` ngày `2026-06-30` và `2026-08-01` (test biên kỳ, INV-PAYROLL-12).
12. 1 kỳ `draft`, 1 kỳ `finalized`, 1 kỳ `paid` sẵn để test transition.

## 13. Security & rate limit

- **Không trả ra**: `User.passwordHash`, `User.email`, `User.lastLoginAt`, `User.bio`. Dùng `select` tường minh, không `include: { teacher: true }` trần (INV-PAYROLL-32).
- **Tiền lương là dữ liệu nhân sự nhạy cảm**: `rateAmount`, `totalAmount` **không** được đưa vào log level `info`, không vào APM trace attribute, không vào analytics event. Chỉ xuất hiện trong bảng audit có kiểm soát truy cập.
- **Không** log `Idempotency-Key` kèm body (body chứa tiền).
- Rò rỉ chéo teacher: mọi endpoint đều admin-only nên không có nguy cơ tenant; nhưng khi làm route teacher (Q-PAY-7) thì **bắt buộc** lọc `period.teacherId === actor.id` ở service, không dựa vào query param client gửi.
- **Rate limit đề xuất** (API_CONVENTIONS.md không có mục rate limit → Q-PAY-12): `POST /admin/payroll` **10 req/phút/admin** (mỗi request là TX nặng có row lock, spam sẽ khoá bảng session); `POST /admin/pay-rates` 20/phút; `PATCH finalize|pay` 20/phút; các `GET` 60/phút. Vượt → 429 — ⚠ chưa có mã 429 trong registry.
- **Audit bắt buộc, bất biến, không xoá**: mọi `create`/`finalize`/`pay`/`set-rate` ghi `actorId`, `entityId`, `action`, `totalAmount` hoặc `rateAmount` tại thời điểm đó, `at`, `ip`. Audit của `finalize` là chứng từ duy nhất cho số tiền đã cam kết.
- Validate uuid trước khi query để tránh lỗi Prisma lộ chi tiết schema ra response.

## 14. Observability

**Log** (structured; **không** kèm số tiền — xem §13):
- `payroll.create.attempt` / `.success` / `.conflict` / `.rollback` — `{ actorId, teacherId, periodStart, periodEnd, sessionCount }`
- `payroll.create.no_rate` — `{ teacherId, sessionId, scheduledDate }` — **level ERROR**, đây là dữ liệu thiếu chặn cả kỳ lương
- `payroll.finalize.conflict` / `payroll.pay.conflict` — `{ actorId, periodId, observedStatus }` — **level WARN**, hai admin tranh chấp
- `payrate.create.success` / `.rejected_backdate` — `{ actorId, teacherId, effectiveFrom }`

**Metric**:
- `payroll_create_latency_ms` — histogram. TX-PAY-A giữ row lock trên `ClassSession`; p99 tăng = nguy cơ khoá lan sang luồng approve của spec 04.
- `payroll_create_rollback_total{reason}` — `reason ∈ {no_rate, missing_actual_time, affected_rows_mismatch, duplicate_period}`. `affected_rows_mismatch` khác 0 = có race chưa bịt.
- `payroll_period_conflict_total` — counter tranh chấp finalize/pay.
- `payroll_draft_age_seconds` — histogram tuổi kỳ `draft`. Kỳ nằm draft quá lâu = lương chưa được chốt.
- `payroll_sessions_unpaid_gauge` — số session `approved` có `payrollPeriodId IS NULL` cũ hơn 45 ngày. Tăng = có giáo viên bị bỏ sót khỏi mọi kỳ lương. **Đây là metric quan trọng nhất của module** — nó bắt đúng loại lỗi mà không ai khiếu nại cho tới khi quá muộn.
- `payroll_integrity_violations_gauge` — số dòng trả về từ 3 câu query kiểm tra ở §11, chạy định kỳ. Phải luôn bằng 0.

**Cảnh báo**: `payroll_sessions_unpaid_gauge > 0`; `payroll_integrity_violations_gauge > 0` (severity cao nhất); `payroll_create_rollback_total{reason="affected_rows_mismatch"}` > 0; `payroll_draft_age_seconds` p95 > 14 ngày.

## 15. Test matrix

`svc` = unit service · `int` = integration qua HTTP + **DB thật** · `db` = trực tiếp trên **DB thật**. **Mọi test tiền và mọi test concurrency chạy trên PostgreSQL thật (testcontainer hoặc DB test riêng) — CẤM mock Prisma.** Lý do: sai số Decimal, constraint, row lock và hành vi `READ COMMITTED` không tái hiện được trên mock, mà đó chính là ba thứ có thể làm sai tiền.

| INV | Loại | Mô tả test |
|---|---|---|
| INV-PAYROLL-01 | **int (DB thật)** | Teacher có mức `250000` từ `07-01` và `300000` từ `07-16`. Session ngày `07-10` phải áp `250000`; session `07-16` phải áp `300000` (biên: đúng ngày `effectiveFrom` áp mức **mới**); session `07-20` áp `300000`. Thêm mức `400000` từ `08-01` **sau khi** đã có kỳ 07 → tính lại kỳ 07 không đổi. |
| INV-PAYROLL-02 | **int (DB thật)** | Seed §12 mục 6 → `totalAmount = "1100000.00"`, `totalSessions = 4`. Khẳng định kỳ chứa **2 mức khác nhau** bằng cách đối chiếu `GET /admin/payroll/:id` breakdown: 2 dòng `appliedRateAmount="250000.00"`, 2 dòng `"300000.00"`. |
| INV-PAYROLL-03 | int (DB thật) | Gọi tính toán 3 lần trên cùng tập dữ liệu (rollback giữa các lần) → ra cùng `totalAmount` từng đồng. Đảo thứ tự `ORDER BY` của bước 3 → kết quả không đổi. |
| INV-PAYROLL-04 | int (DB thật) | Teacher đổi `per_session` → `per_hour` giữa kỳ. Session trước mốc tính theo count, sau mốc tính theo giờ. Kiểm từng dòng breakdown có `appliedRateType` đúng. |
| INV-PAYROLL-05 | int (DB thật) | `per_session`, 5 session độ dài khác nhau (kể cả 1 session 15 phút) → `totalAmount = 5 × rate`, không phụ thuộc thời lượng. |
| INV-PAYROLL-06 | **int (DB thật)** | `per_hour` 200000đ: 2h00 → `400000.00`; 1h30 → `300000.00`; 0h45 → `150000.00`. Kiểm **cấm dùng scheduled**: session có `scheduled` 2h nhưng `actual` 1h → phải ra `200000.00`, không phải `400000.00`. |
| INV-PAYROLL-07 | **int (DB thật)** | 1h37m20s → làm tròn xuống 97 phút → `hours = 1.6166…`. 1h00m59s → 60 phút → `hours = 1.00`. 0h00m30s → 0 phút → `amount = 0.00`. |
| INV-PAYROLL-08 | **int (DB thật)** | Ca §12 mục 7: 3 session → `400000.00 + 300000.00 + 323333.33 = 1023333.33`. Khẳng định **`Σ breakdown[].amount` === `totalAmount`** đúng từng đồng. Ca đối chứng: nếu cộng trước rồi làm tròn sẽ ra số khác → test phải fail nếu ai đó đổi thứ tự. |
| INV-PAYROLL-09 | db | `totalAmount` cột `numeric(12,2)`; INSERT giá trị âm → CHECK chặn. Kỳ rỗng → `totalAmount = 0.00`. |
| INV-PAYROLL-10 | int (DB thật) | `per_hour` với 3 session tổng 7.5 giờ → `totalSessions = 3` (**không phải 7 hay 8**). |
| INV-PAYROLL-11 | **int (DB thật)** | Rate `333333.33` × 3 session `per_session` → `999999.99` chính xác. Rate `0.01` × 10000 session → không mất chính xác. Kiểm response JSON: tiền là **string**, không phải number. Kiểm không có `Number()`/`parseFloat` trên đường tính (test tĩnh: grep + lint rule). |
| INV-PAYROLL-12 | **int (DB thật)** | Kỳ `07-01..07-31`: session `06-30` và `08-01` **không** vào; session `07-01` và `07-31` **có** vào (biên đóng hai đầu). |
| INV-PAYROLL-13 | int (DB thật) | Trong khoảng kỳ có session `completed_pending`, `rejected`, `scheduled`, `in_progress` → không cái nào được gom; `payrollPeriodId` của chúng vẫn NULL sau commit. |
| INV-PAYROLL-14 | **db — concurrency thật** | Tạo kỳ A `07-01..07-15` rồi kỳ B `07-10..07-25` (chồng lấn). Session ngày `07-12` phải thuộc **đúng một** kỳ. Chạy song song hai request → khẳng định `affectedRows` khớp hoặc rollback sạch; không session nào bị đổi `payrollPeriodId`. |
| INV-PAYROLL-15 | db | Câu query "session tính hai lần" ở §11 trả về rỗng sau mọi test. |
| INV-PAYROLL-16 | **int (DB thật)** | Teacher T3 (không mức nào) → `POST /admin/payroll` trả 404 `RATE_NOT_FOUND`; khẳng định **`COUNT(PayrollPeriod)` không đổi** và **không session nào bị gán** `payrollPeriodId`. Teacher T4 (session `07-05` trước mức đầu `07-10`) → cùng kết quả. Ca hỗn hợp: 9 session có rate + 1 session không → **cả 10 đều không được gán**, kỳ không được tạo. |
| INV-PAYROLL-17 | int (DB thật) | `per_hour` với session thiếu `actualEnd` → request fail toàn phần, không tạo kỳ, không gán session nào. |
| INV-PAYROLL-18 | db | Sau mỗi test tạo kỳ, chạy query đối chiếu `totalSessions` ở §11 → rỗng. Đưa vào `afterEach` của cả suite. |
| INV-PAYROLL-19 | int (DB thật) | Ma trận 3 status × 2 action: `draft`+pay → 409; `finalized`+finalize → 409; `paid`+finalize → 409; `paid`+pay → 409; `draft`+finalize → 200; `finalized`+pay → 200. Sau mỗi lần 409, DB không đổi (so khớp `updatedAt`). |
| INV-PAYROLL-20 | **int (DB thật)** | Sau finalize: không endpoint nào đổi được `totalAmount`/`totalSessions`/tập session. Gửi `totalAmount` trong body finalize/pay → bị strip. Tạo kỳ mới chồng lấn → không session nào bị gỡ khỏi kỳ đã finalized. |
| INV-PAYROLL-21 | int + db | Session thuộc kỳ `finalized`: mọi UPDATE qua service bị chặn; `UPDATE ... WHERE payrollPeriodId IS NULL` cho `affectedRows = 0`. Bắt tay với test INV-SESSION-03 của spec 04. |
| INV-PAYROLL-22 | int + db | `draft`/`finalized` → `paidAt` NULL. Sau pay → NOT NULL. Gọi pay lần hai → 409, `paidAt` **không đổi**. DB: INSERT `status='paid', paidAt=NULL` → CHECK chặn; INSERT `status='draft', paidAt=now()` → CHECK chặn. |
| INV-PAYROLL-23 | int | Không tồn tại route DELETE cho `/admin/payroll/:id` (404 route, không phải 403). |
| INV-PAYROLL-24 | **db — concurrency thật** | Hai connection song song cùng `POST /admin/payroll` với cùng `(teacherId, periodStart, periodEnd)`. Khẳng định: đúng **1** kỳ trong DB; đúng **1** response 201, response kia 409; **tổng session được gán = số session của một kỳ, không nhân đôi**; `totalAmount` của kỳ duy nhất đúng bằng giá trị kỳ vọng. Lặp ≥ 50 vòng. |
| INV-PAYROLL-25 | db | (Khi bật EXCLUDE) INSERT kỳ `07-01..07-31` rồi `07-15..08-15` cùng teacher → constraint chặn. Cùng khoảng nhưng **khác teacher** → cho phép. Kỳ liền kề `07-01..07-31` + `08-01..08-31` → cho phép (biên `'[]'` không chồng). |
| INV-PAYROLL-26 | int | Không tồn tại route PATCH/DELETE cho `/admin/pay-rates/:id`. Sau nhiều lần POST, `COUNT(TeacherPayRate)` tăng đúng bằng số lần POST và **không bản ghi cũ nào có `updatedAt` thay đổi**. |
| INV-PAYROLL-27 | int (DB thật) | Đã có mức `effectiveFrom='2026-07-01'`: POST với `2026-06-15` → 400 `RATE_EFFECTIVE_DATE_IN_PAST`; với `2026-07-01` (bằng) → 400; với `2026-07-02` → 201. |
| INV-PAYROLL-28 | **db — concurrency thật** | Hai connection cùng INSERT rate cùng `(teacherId, effectiveFrom)` → đúng 1 thành công. Không có UNIQUE thì test này phải fail (chứng minh constraint là cần thiết, không phải trang trí). |
| INV-PAYROLL-29 | int + db | `rateAmount` = `0`, `-1`, `"abc"`, `"100.999"` → 400 `VALIDATION_ERROR`. `rateType = "fixed_monthly"` → 400. DB: CHECK chặn `rateAmount <= 0`. |
| INV-PAYROLL-30 | int (DB thật) | `teacherId` trỏ user `role='student'` hoặc `role='admin'` → 400 với `details.teacherId`. `teacherId` không tồn tại → 404 `USER_NOT_FOUND`. |
| INV-PAYROLL-31 | int | 7 endpoint × {token teacher, token student, admin `status='suspended'`, không token} → 403/403/403/401. |
| INV-PAYROLL-32 | int | So khớp toàn bộ key của mọi response với whitelist; khẳng định không có `passwordHash`, `email`. |

**Test bổ sung không gắn INV** (vẫn bắt buộc):
- **Idempotency (Q-PAY-5)**: cùng `Idempotency-Key` + cùng body gửi 2 lần → 1 kỳ trong DB, response thứ hai giống hệt response đầu. Cùng key + body khác → 422.
- **Rollback nguyên tử TX-PAY-A**: bơm lỗi ở bước 6 và bước 7 → sau rollback: 0 kỳ mới, 0 session bị gán, 0 dòng audit.
- **Kỳ rỗng**: kỳ không có session nào đủ điều kiện → hành vi hiện chưa chốt (Q-PAY-6); test phải khoá hành vi đã chọn để không trôi.
- **N+1 gate**: bật query log, tạo kỳ có 40 session → tổng số query ≤ 8. `GET /admin/payroll` 20 dòng → ≤ 4 query. Ngưỡng là gate CI.
- **Envelope**: response thành công khớp `{ data }` / `{ data, meta }`; lỗi khớp envelope flat 7 field.

## 16. Chưa chốt

| # | Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|---|
| **C2** 🔴 | **Mâu thuẫn nghiêm trọng nhất của module.** `ADR-008 Rates append-only` (status **Accepted**) nói: đổi mức = **TẠO BẢN GHI MỚI** với `effectiveFrom` mới, **không update endpoint, không delete**, và câu đọc mức là `WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1` — **không hề dùng `effectiveTo`**. Nhưng `ENTITY_TEACHER_PAY_RATE.md` (và `ENTITY_STUDENT_TUITION_RATE.md`) ghi: *"To update rate: **set `effectiveTo` on current**, create new record"* và *"Active rate = where `effectiveTo IS NULL` or `effectiveTo > today`"* — tức **CÓ update dòng cũ**. **Hai cái không thể cùng đúng.** Ba hệ quả nếu code trước khi chốt: (a) hai câu SQL chọn mức khác nhau → hai số tiền khác nhau cho cùng một kỳ lương; (b) nếu ghi `effectiveTo` thì `TeacherPayRate` hết append-only, phải thiết kế lại concurrency (§8.3) và audit; (c) mọi invariant INV-PAYROLL-01, 02, 03, 04, 26, 27 và toàn bộ §6.2, §7 TX-PAY-D phải viết lại. **Spec này tạm chốt theo ADR-008** (lý do: ADR ở trạng thái Accepted, ENTITY doc không phải ADR; và FE `admin-tuition-rates.spec.md` mô tả lịch sử mức chỉ bằng `effectiveFrom` + cờ `current`, **không có `effectiveTo`** → thêm một phiếu cho ADR-008). **Đây là chốt tạm, không phải quyết định.** Ghi chú kiểm chứng: file `docs/shared/decisions/008-append-only-rates.md` được API_ADMIN.md và API_ERROR_CODES.md dẫn link nhưng **không tồn tại trong bộ tài liệu** (thư mục `docs/shared/` chỉ có `RBAC_MATRIX.md`) — nội dung ADR-008 hiện chỉ biết qua tóm tắt trong `_FACTS.md`, chưa đọc được bản gốc. | **CHẶN TOÀN BỘ §4** — không được code phép tính tiền trước khi chốt | BE lead + PO + tác giả ADR-008 | **trước mọi dòng code của module** |
| **Q-PAY-1** 🔴 | **Ranh giới kỳ lương — ba câu hỏi con, phải trả lời cả ba.** (1) **Timezone**: `periodStart`/`periodEnd` là `Date` (không timezone), nhưng `ClassSession.actualStart` là `DateTime` **UTC** (API_CONVENTIONS: mọi DateTime là UTC) trong khi lớp học diễn ra theo giờ Việt Nam (UTC+7). Một buổi học 06:00 ngày `01/07` giờ VN = `2026-06-30T23:00Z` — **rơi sang tháng trước** nếu neo theo UTC. Spec này neo tập gom vào `ClassSession.scheduledDate` (kiểu `Date`, không timezone, nên miễn nhiễm) — **nhưng phải xác nhận `scheduledDate` được ghi theo ngày địa phương VN chứ không phải ngày UTC của `actualStart`**. Nếu ghi theo UTC thì mọi buổi học sáng sớm bị tính sai tháng. (2) **Biên đóng/mở**: spec chốt tạm `BETWEEN periodStart AND periodEnd` (đóng hai đầu, `[]`). Cần xác nhận không ai hiểu là `[)`. (3) **Kỳ có phải luôn là tháng dương lịch không?** FE `pages/_INDEX.md` ghi rõ "period boundary undecided" và đó là lý do `GET /admin/payroll/:id` bị block. Nếu kỳ tuỳ ý thì phải bịt chồng lấn (Q-PAY-3); nếu kỳ luôn là tháng thì UNIQUE `(teacherId, periodStart, periodEnd)` gần như đủ. | INV-PAYROLL-12; `GET /admin/payroll/:id` (PROPOSED, block toàn bộ luồng finalize của FE); INV-PAYROLL-25 | PO + BE lead | **trước Sprint 3** |
| **Q-PAY-9** | **Có thêm `rateType = fixed_monthly` không?** Hiện enum chỉ có `per_session` \| `per_hour`. FE `pages/_INDEX.md` liệt kê "Pay-rate unit basis" là **quyết định #2 đang treo**, và đó là lý do `GET /admin/pay-rates` bị chặn. Nếu thêm `fixed_monthly` thì: (a) enum đổi → migration; (b) INV-PAYROLL-05/06 thêm nhánh thứ ba; (c) **`totalSessions` mất ý nghĩa** với lương cứng (18 buổi hay 2 buổi đều cùng số tiền) — phải định nghĩa lại cột; (d) sinh câu hỏi tính theo tỉ lệ khi teacher vào/nghỉ giữa tháng; (e) sinh câu hỏi kỳ lương không phải tháng thì chia thế nào. **Chốt sau khi đã code sẽ phải viết lại §4.** | Enum `rateType`; INV-PAYROLL-05/06/10; `GET /admin/pay-rates` | PO | **trước Sprint 3** |
| Q-PAY-3 | Chống kỳ chồng lấn: có bật `EXCLUDE USING gist` không (cần extension `btree_gist`, cần dọn dữ liệu chồng lấn cũ trước)? Nếu không bật thì chấp nhận tồn tại kỳ chồng lấn với số liệu méo — INV-PAYROLL-14 vẫn giữ tiền không nhân đôi nhưng báo cáo sai. | INV-PAYROLL-25; migration §12 | BE lead + DBA | trước Sprint 3 |
| Q-PAY-4 | Breakdown ở `GET /admin/payroll/:id` hiện **tính lại lúc đọc** từ `TeacherPayRate`, không lưu snapshot. Sau khi kỳ `finalized`, nếu dữ liệu rate bị đụng bằng bất kỳ đường nào (migration, sửa tay DB, hoặc nếu C2 kết luận cho phép update) thì breakdown lệch `totalAmount` đã chốt. Có thêm bảng `PayrollPeriodLine` (snapshot từng dòng: `sessionId`, `appliedRateId`, `hours`, `amount`) không? | Độ tin cậy §3.5; khả năng đối soát kế toán | BE lead | trước Sprint 4 |
| Q-PAY-5 | `Idempotency-Key`: `API_CONVENTIONS.md` **không có mục nào** về idempotency. Có chuẩn hoá header + bảng `IdempotencyKey` toàn hệ thống không, hay chỉ riêng payroll? Mã lỗi cho "key trùng, body khác" là gì? | §8.1 lớp L2; migration §12 | BE lead | trước Sprint 3 |
| Q-PAY-6 | **Kỳ `draft` tạo nhầm không có đường huỷ.** Không có `DELETE /admin/payroll/:id`. Session đã bị gán `payrollPeriodId` và không có endpoint gỡ gán → tạo nhầm một kỳ là **khoá vĩnh viễn** các session đó khỏi mọi kỳ tương lai. Liên quan: kỳ rỗng (0 session) nên trả 201 với `totalAmount=0` hay từ chối? Và sai sót phát hiện **sau** finalize xử lý thế nào (cơ chế kỳ điều chỉnh chưa được thiết kế)? | INV-PAYROLL-23; §6.1; vận hành thực tế | PO + BE lead | **trước Sprint 3** |
| Q-PAY-7 | RBAC_MATRIX ghi `PayrollPeriod read own = 🔒 Teacher` và ENTITY_PAYROLL_PERIOD ghi "Teacher can view own PayrollPeriods (read-only)", nhưng **không có route nào** và không có `API_TEACHER.md`. Giáo viên hiện không xem được lương của mình. | §5; lane teacher | BE lead | trước Sprint 4 |
| Q-PAY-8 | **Không có Notification type nào cho payroll** trong ENTITY_NOTIFICATION (11 type, không có `payroll_*`, không có `pay_rate_changed`). Cộng với `TeacherPayRate read = ❌` cho teacher (RBAC_MATRIX), giáo viên **không có đường nào biết mức lương của mình đã thay đổi hay kỳ lương đã được chi trả**. Có bổ sung type không (cần migration enum + ADR)? | §10; trải nghiệm giáo viên | PO | trước Sprint 4 |
| **Q-PAY-11** | **Lỗ hổng mã lỗi — 4 nhánh không có mã hợp lệ.** (a) Trùng kỳ: không có `PAYROLL_PERIOD_DUPLICATE` (*proposed*, 2026-08-19); **DUPLICATE_ENTRY** chỉ xuất hiện trong đoạn code `GlobalExceptionFilter` ở API_ERROR_CODES.md §5, **không có trong bảng registry §3**. (b) Kỳ chồng lấn: không có mã. (c) `per_hour` thiếu `actualStart`/`actualEnd`: không có mã đúng ngữ nghĩa. (d) Idempotency key xung đột: không có mã. **Thêm nữa**: nhóm `PAYROLL_*` (`PAYROLL_PERIOD_NOT_FOUND`, `PAYROLL_PERIOD_FINALIZED`, `PAYROLL_SESSION_*`) **có** trong registry API_ERROR_CODES.md §3 nhưng **không có** trong danh sách "Mã lỗi đã có" của `_FACTS.md` → trạng thái tranh chấp (đây là **mâu thuẫn thứ 5**, chưa được ghi trong `_FACTS.md`, trùng với Q-SES-1 của spec 04). Và `PAYROLL_PERIOD_FINALIZED` đang phải gánh 3 ngữ nghĩa khác nhau (§8.2) vì thiếu mã. | §9 toàn bộ; FE không map được error | BE owner API_ERROR_CODES | **trước khi code §9** |
| Q-PAY-10 | Có tách vai trò "người finalize" ≠ "người pay" (nguyên tắc four-eyes cho hành động chi tiền) không? Hiện mọi admin làm được cả hai. | §5 | PO | trước Sprint 4 |
| Q-PAY-12 | `API_CONVENTIONS.md` không có mục rate limit; registry không có mã 429. §13 đang đề xuất. | §13 | BE lead | Sprint 4 |
| Q-PAY-13 | Không có ENTITY doc cho bảng audit, nhưng §7, §13 và INV-PAYROLL-19/20/22 đều dựa vào nó. Audit của `finalize` là chứng từ tài chính duy nhất. Bảng tên gì, ai sở hữu? (trùng Q-SES-8 của spec 04) | Migration §12; §13 | BE lead | trước Sprint 3 |
| **C1** | `User.nickname` (ENTITY_USER) vs `fullName` (API_AUTH). `teacherName` trong DTO §3.2, §3.3, §3.5 đọc field nào? | Contract FE của cả 3 màn payroll | BE lead | trước khi khoá contract |

**Phụ thuộc ngược lên spec 04**: module này chỉ có dữ liệu đầu vào khi có session `approved`. Mà `SCOPE-01` (`Class`/`ClassEnrollment` không có endpoint) và `SCOPE-02` (không có endpoint teacher-side để đưa session tới `completed_pending`) của spec 04 đang chặn nguồn đó. **Payroll không thể chạy end-to-end trước khi hai lỗ hổng phạm vi kia được lấp** — chỉ test được bằng seed DB.
