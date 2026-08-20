---
title: Backend Module Specs — Admin
status: active
last_updated: 2026-08-19
---

# Backend Module Specs — Admin

> Đặc tả backend cho **toàn bộ phần Admin**. 8 module, ~3.900 dòng.
> Đây là **spec, không phải code**. Chưa có dòng backend nào được viết.
>
> Bối cảnh project: đọc `docs/BACKEND_PLAN.md` trước nếu bạn chưa biết gì về hệ thống.

---

## 1. Bản đồ module

Ranh giới module đi theo **transaction boundary**, không theo bảng. Invoice + payment + rate
phải chung một transaction nên chung một module; session + attendance chung một state machine
nên chung một module.

| # | Module | File | Status | Invariant | Chặn bởi |
|---|---|---|---|---|---|
| 1 | Auth | `01-auth.md` | ✅ `accepted` | 24 | — |
| 2 | Users / Admin Users | `02-users.md` | 🔶 `proposed` | 18 | vòng đời tài khoản (C3) |
| 3 | Classes + Enrollment | `03-classes-enrollment.md` | ⛔ `deferred` | 8 | **SCOPE-01 — chưa quyết phạm vi** |
| 4 | Sessions + Attendance | `04-sessions-attendance.md` | 🔶 `proposed` | 16 | SCOPE-01 |
| 5 | Payroll + Pay Rates | `05-payroll.md` | 🔶 `proposed` | 33 | C2 · ranh giới kỳ lương · rateType |
| 6 | Billing (rate+invoice+payment) | `06-billing.md` | 🔶 `proposed` | 34 | biểu diễn tiền · mô hình học phí · C2 |
| 7 | Notifications | `07-notifications.md` | 🔶 `proposed` | 21 | chưa có endpoint nào định nghĩa |
| 8 | Dashboard / Reporting | `08-dashboard.md` | ⛔ `deferred` | 14 | làm cuối cùng, theo thiết kế |

**Tổng 168 invariant.** Mỗi invariant có ít nhất một dòng trong test matrix (mục 15) của
module tương ứng — đây là **invariant gate** thay cho coverage %.

Chỉ **Auth** đủ điều kiện code ngay. 7 module còn lại chờ quyết định.

## 2. Thứ tự phụ thuộc

```
Auth ──► Users ──► Classes+Enrollment ──► Sessions+Attendance ──► Payroll
                            │                                        │
                            └──────────────► Billing ◄───────────────┘
                                                 │
                                                 ▼
                                            Dashboard
   Notifications: bị GỌI bởi Users · Sessions · Billing — không đứng riêng
```

**Không được né blocker bằng cách đổi thứ tự.** Session cần User, Teacher, Class, Enrollment
tồn tại trước. Đây là lỗi đã mắc một lần trong bản kế hoạch trước.

## 3. Cấu trúc mỗi file — 16 mục, cố định

```
0  Tóm tắt              8  Idempotency & concurrency
1  Bảng chạm tới        9  Error → mã lỗi
2  Endpoints           10  Side effect & notification
3  DTO                 11  Index & query
4  Invariant           12  Migration & seed
5  Ownership / RBAC    13  Security & rate limit
6  State machine       14  Observability
7  Transaction boundary 15 Test matrix   ← phải phủ 100% mục 4
                       16  Chưa chốt
```

Mục 4 và mục 15 là cặp: **mọi invariant phải có test**. Mục 16 là nơi ghi mơ hồ — không
được xoá cho sạch, phải ghi kèm owner và cái nó chặn.

## 4. Quy ước chung — không lặp lại trong từng file

Envelope (`API_CONVENTIONS.md`):

```json
{ "data": {...} }                                    // đơn
{ "data": [...], "meta": { total,page,limit,totalPages } }  // list
                                                     // 204 khi không nội dung

{ "statusCode":400, "error":"Bad Request", "message":"...",
  "code":"VALIDATION_ERROR", "details":{ "email":["..."] },
  "timestamp":"...", "path":"/api/v1/..." }          // lỗi — FLAT
```

`error` là chuỗi lý do HTTP, **không phải object bọc**. Không có cờ `success`.
`details` chỉ xuất hiện ở `VALIDATION_ERROR`.

- Base URL `/api/v1` · mọi DateTime **UTC ISO 8601** · phân trang `?page=&limit=`
- Mã lỗi lấy từ `API_ERROR_CODES.md`, **không bịa mã mới**
- `passwordHash` không bao giờ xuất hiện trong response
- Prisma `Decimal` không được lọt thẳng ra JSON

## 5. ⚠️ 5 mâu thuẫn trong tài liệu nguồn

Phát hiện khi viết spec. **Chưa sửa file nào** — sửa tài liệu nguồn là việc riêng, cần duyệt.

| ID | Mâu thuẫn | Hậu quả |
|---|---|---|
| **C1** | `ENTITY_USER` có field `nickname`; `API_AUTH.md` register/PATCH dùng `fullName` | Chặn DTO response của cả 5 endpoint users. Chốt `fullName` = phát sinh migration đổi tên cột |
| **C2** | ADR-008 nói rates **append-only**, đọc bằng `effectiveFrom <= date ORDER BY DESC LIMIT 1`. Nhưng `ENTITY_TEACHER_PAY_RATE` và `ENTITY_STUDENT_TUITION_RATE` ghi *"set `effectiveTo` on current, create new"* — tức có UPDATE dòng cũ | **Hai câu SQL khác nhau → hai số tiền khác nhau cho cùng một kỳ lương.** Nghiêm trọng nhất |
| **C3** | `User.status` chỉ có `pending / active / suspended`. Không có `rejected` | Hệ thống **không có cách biểu diễn "từ chối đơn đăng ký"** — hồ sơ bị từ chối kẹt ở `pending` vĩnh viễn |
| **C4** | `User.hskLevelGoal` và `Class.hskLevel` ghi **1–9**; GLOSSARY + DATABASE_SCHEMA nói **1–6** | Validate sai phía nào cũng hỏng. Đã tracked là DOC-004 |
| **C5** | `_FACTS.md` xếp `SESSION_*` vào nhóm *proposed*, nhưng `API_ERROR_CODES.md` mục "Session Review Errors" **không** có banner proposed. Ngược lại `PAYROLL_*` có trong registry nhưng thiếu trong danh sách đã xác minh | Không biết mã nào dùng được ngay, mã nào phải chờ duyệt |

## 6. Quyết định chặn

### Đã duyệt 2026-08-16 — nhưng chưa phải ADR

Ghi trong `ai/context/HANDOFF.md` § 2026-08-16, mục *Temporary decisions to preserve*.
Một dòng trong HANDOFF **không phải** quyết định kiến trúc có hiệu lực — HANDOFF là nơi ghi
thứ tạm thời và dễ quên. Cả năm phải thành ADR trước khi code đụng schema.

| # | Quyết định | Chốt là | ADR cần | Module |
|---|---|---|---|---|
| 1 | Mô hình học phí | flat theo tháng, mỗi học sinh một mức | ADR-013 | 6 |
| 2 | Đơn vị tính lương | dual-mode `per_session` + `per_hour`, **không** có `fixed_monthly` | ADR-012 | 5 |
| 3 | Ranh giới kỳ lương | tháng dương lịch — **còn thiếu** timezone, biên đóng/mở, chống chồng lấn | ADR-012 | 5 |
| 4 | Gemini key | một key dùng chung của nền tảng, không BYOK | ADR-014 | 8 |
| 5 | Từ chối đăng ký | soft rejection, giữ bản ghi | ADR-011 | 2 |

Quyết định 5 kéo theo migration: `User.status` hiện **không có** `rejected` (xem C3 / DOC-005).

### Vẫn chưa chốt

| # | Quyết định | Chặn module |
|---|---|---|
| **A** | **Biểu diễn tiền** — chưa từng được hỏi. Decimal vs integer VND · rounding · JSON serialization. Prisma `Decimal` không được lọt thẳng ra API | 5, 6 |
| **B** | **SCOPE-01** — phạm vi Classes/Enrollment: đầy đủ hay tối thiểu đủ cho Sessions | 3, 4, 5 |
| **C** | **C2** — hai công thức đọc rate mâu thuẫn (xem mục 5) | 5, 6 — mọi phép tính tiền |

## 7. Lỗ hổng mã lỗi

Các nhánh lỗi dưới đây **chưa có mã hợp lệ** trong `API_ERROR_CODES.md`:

```
payroll   trùng kỳ · kỳ chồng lấn · per_hour thiếu actualStart/End · xung đột idempotency key
          (PAYROLL_PERIOD_FINALIZED đang gánh 3 ngữ nghĩa khác nhau)
classes   CLASS_CODE_INVALID · CLASS_ARCHIVED · CLASS_ALREADY_ENROLLED
users     chuyển trạng thái sai ở suspend/activate
billing   toàn nhóm INVOICE_* và RATE_* đang là *proposed, not agreed*
```

Không module nào tự bịa mã. Tất cả đánh dấu ⛔ tại mục 9 của file tương ứng.

## 8. Ba phát hiện nghiêm trọng nhất

**Payroll — kỳ `draft` tạo nhầm không có đường huỷ.** Session đã bị gán `payrollPeriodId`,
mà không có endpoint gỡ gán. Tạo nhầm một kỳ là **khoá vĩnh viễn** các session đó khỏi mọi
kỳ lương tương lai. Chưa có endpoint xoá/huỷ draft ở bất kỳ tài liệu nào.

**Payroll — timezone làm lệch tháng.** `periodStart/End` kiểu `Date`, còn `actualStart` là
DateTime UTC. Buổi học 06:00 giờ VN ngày 01/07 = `2026-06-30T23:00Z`, rơi sang tháng trước.
Spec 05 neo tập gom vào `scheduledDate` để miễn nhiễm — nhưng phải xác nhận `scheduledDate`
được ghi theo ngày VN.

**Sessions — nguồn dữ liệu không tồn tại.** `GET /admin/sessions/pending` sẽ **vĩnh viễn rỗng**:
không có endpoint tạo Class, không có endpoint cho ba transition
`scheduled → in_progress → completed_pending`. Màn duyệt buổi dạy không có gì để duyệt.

## 9. Đọc theo vai trò

| Bạn là | Đọc |
|---|---|
| Người quyết nghiệp vụ | mục 5, 6 của file này → mục 16 của từng module |
| Người code Auth | `01-auth.md` — module duy nhất đủ điều kiện bắt đầu |
| Người review | mục 4 + mục 15 của module đang review (invariant ↔ test) |
| Người thiết kế DB | mục 1, 7, 8, 11, 12 của mọi module + mục 5 file này |
| Người mới hoàn toàn | `docs/BACKEND_PLAN.md` trước, rồi quay lại đây |

## 10. Ghi chú về độ tin cậy

Spec được viết bằng cách đọc trực tiếp `docs/entities/postgres/*`, `docs/api/*`,
`RBAC_MATRIX.md`. Tên field, endpoint và mã lỗi **lấy nguyên từ tài liệu nguồn**, không suy đoán.

Hai đính chính so với ghi chú trong quá trình soạn: `docs/shared/decisions/008-append-only-rates.md`
**có tồn tại** trong repo (đã xác minh, Status: Accepted, 2026-08-13); `API_TEACHER.md` và
`API_STUDENT.md` cũng **có tồn tại**. Chúng chỉ không nằm trong tập file được nạp lúc soạn spec.

Chỗ nào tài liệu nguồn mâu thuẫn, spec **ghi lại mâu thuẫn** thay vì tự chọn một bên.
