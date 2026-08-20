---
module: classes-enrollment
status: deferred
blocked_by: SCOPE-01 — chưa quyết phạm vi. Không có endpoint nào trong docs/api/ cho phía Admin.
owner: -
last_updated: 2026-08-19
---

# Module Spec — Classes + Enrollment

## 0. Tóm tắt

Lớp học và ghi danh. **Module này không phục vụ màn Admin nào** — Admin không tạo lớp, không
ghi danh học sinh (xem RBAC: `Class.create` = ❌ cho Admin).

Nó có mặt ở đây vì **Sessions/Attendance và Payroll phụ thuộc nó**. Không có `Class` thì không
có `ClassSession`; không có `ClassEnrollment` thì không có `SessionAttendance`. Cả nhánh
payroll đứng sau hai bảng này.

Đây là **lỗ hổng phạm vi**, không phải module bị hoãn vì ưu tiên thấp.

## 1. Bảng chạm tới

| Bảng | Đọc/Ghi | Ghi chú |
|---|---|---|
| `Class` | Ghi (Teacher) · Đọc (Admin, gián tiếp) | Admin chỉ đọc qua session/payroll |
| `ClassEnrollment` | Ghi (Student join) · Đọc | Admin chỉ đọc |
| `User` | Đọc | teacherId, studentId |

## 2. Endpoints

**Không có endpoint nào được định nghĩa cho Admin.** RBAC gán quyền tạo/sửa cho Teacher và
quyền ghi danh cho Student — nhưng `docs/api/API_TEACHER.md` và `API_STUDENT.md` chưa được
đối chiếu với module spec này.

| Method | Path | Role | Mô tả | Trạng thái |
|---|---|---|---|---|
| POST | `/api/v1/classes` | teacher | Tạo lớp, sinh `enrollmentCode` 8 ký tự | ⛔ chưa đối chiếu |
| PATCH | `/api/v1/classes/:id` | teacher (own) | Sửa lớp | ⛔ chưa đối chiếu |
| GET | `/api/v1/classes` | teacher (own) / student (enrolled) | Danh sách lớp | ⛔ chưa đối chiếu |
| POST | `/api/v1/classes/join` | student | Ghi danh bằng `enrollmentCode` | ⛔ chưa đối chiếu |
| GET | `/api/v1/classes/:id/students` | teacher (own) | Danh sách học sinh trong lớp | ⛔ chưa đối chiếu |

**Phần tối thiểu Sessions cần** (nếu chọn phương án B ở mục 16):

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/admin/classes` | admin | Đọc lớp, để hiển thị tên lớp trong màn session/payroll |
| GET | `/api/v1/admin/classes/:id/enrollments` | admin | Đọc học sinh đang `active`, để tính attendance |

Hai endpoint này **chưa tồn tại trong `API_ADMIN.md`**.

## 3. DTO

Không đặc tả ở đây. DTO thuộc về module Teacher/Student, sẽ viết khi phạm vi được chốt.
Chỉ ghi phần Admin đọc:

```
ClassSummary  = { id, name, hskLevel, teacherId, teacherName, status, studentCount }
EnrollmentRef = { studentId, nickname, status, joinedAt }
```

`studentCount` là suy diễn (`COUNT(ClassEnrollment WHERE status='active')`), không phải cột.

## 4. Rule nghiệp vụ (invariant)

| ID | Invariant |
|---|---|
| INV-CLASS-01 | `enrollmentCode` dài đúng 8 ký tự chữ-số, **duy nhất toàn hệ thống** |
| INV-CLASS-02 | Chỉ lớp `status = active` mới ghi danh được |
| INV-CLASS-03 | Chỉ teacher sở hữu lớp mới sửa được: `class.teacherId === req.user.id` |
| INV-CLASS-04 | Archive lớp **không** xoá enrollment và assignment đang có |
| INV-CLASS-05 | `UNIQUE(classId, studentId)` — một học sinh chỉ ghi danh một lần mỗi lớp |
| INV-CLASS-06 | Rời lớp = `status = dropped`, **không xoá bản ghi** (giữ lịch sử) |
| INV-CLASS-07 | Học sinh chỉ xem được nội dung lớp khi enrollment `status = active` |
| INV-CLASS-08 | Mọi `ClassSession` phải trỏ tới một `Class` tồn tại — không có session mồ côi |

## 5. Ownership / RBAC

```
Teacher   class.teacherId === req.user.id           tạo/sửa/archive
Student   enrollment.studentId === req.user.id      chỉ lớp mình đã ghi danh, status=active
Admin     ❌ tạo/sửa  ·  👁️ đọc (chỉ để hiển thị trong session/payroll)
```

Admin đọc được lớp **không** đồng nghĩa Admin sửa được. Guard phải tách hai quyền này.

## 6. State machine

```
Class:            active ──archive──► archived
                     ▲                    │
                     └──── (chưa quyết: có cho un-archive không?) ────┘

ClassEnrollment:  (join) ──► active ──leave──► dropped
                                 ▲                │
                                 └── (chưa quyết: join lại được không?) ──┘
```

Hai transition dấu hỏi chưa có quy định ở bất kỳ tài liệu nào.

## 7. Transaction boundary

- **Ghi danh**: kiểm `enrollmentCode` + kiểm lớp `active` + tạo `ClassEnrollment` — một
  transaction. Nếu không, hai request cùng lúc tạo hai bản ghi trùng trước khi unique
  constraint kịp chặn ở lần commit thứ hai.
- **Tạo lớp**: sinh `enrollmentCode` + INSERT — một transaction, retry khi đụng unique.

## 8. Idempotency & concurrency

| Kịch bản | Cơ chế |
|---|---|
| Sinh `enrollmentCode` trùng | `UNIQUE(enrollmentCode)` + retry tối đa N lần. Không tự tin vào random |
| Hai request join cùng lúc | `UNIQUE(classId, studentId)` là hàng phòng thủ cuối. Kiểm ở service **không đủ** |
| Join lại sau khi dropped | Phải quyết: UPDATE bản ghi cũ về `active`, hay chặn? Xem mục 16 |

## 9. Error → mã lỗi

| Nhánh lỗi | HTTP | code | Trạng thái |
|---|---|---|---|
| Mã ghi danh không tồn tại | 404 | `CLASS_ENROLL_CODE_INVALID` | ✅ có |
| Lớp đã archive | 400 | `CLASS_ALREADY_ARCHIVED` | ✅ có (registry ghi HTTP 400) |
| Đã ghi danh rồi | 409 | `CLASS_ALREADY_ENROLLED` | ✅ có |
| Không phải chủ lớp | 403 | `AUTH_INSUFFICIENT_ROLE` | ✅ có |
| Validate sai | 400 | `VALIDATION_ERROR` | ✅ có |

Cả ba mã **đã tồn tại** trong `API_ERROR_CODES.md` § Class Errors. Bản spec đầu tiên viết sai
tên (CLASS_CODE_INVALID, CLASS_ARCHIVED — hai mã không tồn tại) — `pnpm check:docs` bắt được, đã sửa 2026-08-19.
Đây đúng là loại lỗi mà check tồn tại để chặn: bịa tên mới trong khi mã đúng đã có sẵn.

## 10. Side effect & notification

Không có notification type nào trong `ENTITY_NOTIFICATION.md` gắn với ghi danh hay tạo lớp.
Nếu nghiệp vụ cần (ví dụ báo teacher có học sinh mới), phải **thêm enum type mới** —
đó là migration, không phải chi tiết.

## 11. Index & query

```
Class.enrollmentCode          UNIQUE       tra cứu lúc join, đường nóng
Class.teacherId                            danh sách lớp của teacher
ClassEnrollment(classId, studentId) UNIQUE ràng buộc + tra cứu
ClassEnrollment.studentId                  danh sách lớp của student
ClassEnrollment(classId, status)           đếm sĩ số active
```

**Nguy cơ N+1**: danh sách lớp kèm `studentCount` — đếm trong vòng lặp là sai. Dùng một
query gộp có `GROUP BY classId`.

## 12. Migration & seed

Chưa có migration nào. Khi làm, `Class` và `ClassEnrollment` phải migrate **trước**
`ClassSession` và `SessionAttendance` — quan hệ khoá ngoại bắt buộc thứ tự này.

Seed cần cho test payroll: ít nhất 1 teacher · 1 class · 3 student đã ghi danh · 5 session
`approved` trải qua ranh giới tháng.

## 13. Security & rate limit

- `enrollmentCode` là **bí mật yếu**: ai có mã cũng vào được lớp. Cần rate limit trên
  `POST /classes/join` để chặn dò mã (8 ký tự alphanumeric = đoán được nếu cho thử vô hạn).
- Không trả `enrollmentCode` ra cho student trong bất kỳ response nào.

## 14. Observability

Log: tạo lớp, ghi danh thành công/thất bại, số lần dò mã sai theo IP.

## 15. Test matrix

| INV | Loại test | Mô tả |
|---|---|---|
| INV-CLASS-01 | service | Sinh 1000 mã, không trùng, đúng 8 ký tự alphanumeric |
| INV-CLASS-01 | **DB thật** | Ép trùng mã → unique constraint chặn, retry thành công |
| INV-CLASS-02 | integration | Join lớp `archived` → 409 |
| INV-CLASS-03 | integration | Teacher B sửa lớp của teacher A → 403 |
| INV-CLASS-04 | service | Archive lớp → enrollment vẫn còn, assignment vẫn còn |
| INV-CLASS-05 | **DB thật** | Hai request join đồng thời → đúng 1 bản ghi, request kia 409 |
| INV-CLASS-06 | service | Leave → `status=dropped`, bản ghi vẫn tồn tại |
| INV-CLASS-07 | integration | Student `dropped` đọc nội dung lớp → 403 |
| INV-CLASS-08 | **DB thật** | Xoá Class có session → FK chặn |

## 16. Chưa chốt

| Câu hỏi | Chặn gì | Owner | Cần quyết trước |
|---|---|---|---|
| **SCOPE-01: phạm vi module này** — làm đầy đủ (kéo scope Teacher vào sớm) hay tối thiểu đủ cho Sessions? | **Toàn bộ Sessions + Payroll**. Không có Class thì `GET /admin/sessions/pending` vĩnh viễn rỗng | - | trước Phase 3 |
| **SCOPE-02**: ba transition `scheduled → in_progress → completed_pending` không có endpoint ở đâu | Notification `session_submitted_for_review` không có nơi phát sinh | - | cùng SCOPE-01 |
| Un-archive lớp có cho phép không? | state machine | - | khi làm module |
| Join lại sau `dropped`: UPDATE về `active` hay chặn? | INV-CLASS-05, unique constraint | - | khi làm module |

| `hskLevel` của Class ghi 1–9, GLOSSARY nói 1–6 (DOC-004) | validate | - | trước migration |

### Hai phương án cho SCOPE-01

**A. Làm đầy đủ** — Class + Enrollment thành module BE hoàn chỉnh, kéo phần scope Teacher vào
sớm hơn kế hoạch.
*Được*: Sessions/Payroll có nền thật, không phải làm lại. Teacher module sau này đỡ việc.
*Mất*: phình phạm vi giai đoạn Admin; phải thiết kế thêm API Teacher/Student.

**B. Tối thiểu** — chỉ làm phần Admin đọc được (2 endpoint ở mục 2) + seed dữ liệu lớp bằng
script, chưa có đường tạo lớp qua API.
*Được*: nhanh, đủ để Sessions/Payroll chạy và test.
*Mất*: hệ thống chưa dùng thật được (không ai tạo được lớp qua UI); phải quay lại làm tiếp.

**Đề xuất: B**, kèm điều kiện ghi rõ trong `PROGRESS.md` rằng Sessions/Payroll xây trên nền
tạm, và Class/Enrollment đầy đủ là việc bắt buộc trước khi có người dùng thật.
