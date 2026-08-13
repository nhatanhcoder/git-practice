---
page: Admin · Session Review
route: /admin/payroll/sessions
contract: ../../pages/admin-pages/admin-session-review.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · Session Review

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

the queue of teacher-submitted sessions awaiting approval. This is the gate that feeds payroll — no session is payable until it passes here. The Admin's job is to clear the queue.

## 2. Access

admin. No ownership rule — any class, any teacher. On denial → `/login`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Pending queue | `GET /api/v1/admin/sessions/pending?teacherId=` | `data[]`, `meta` | — |
| Approve | `PATCH /api/v1/admin/sessions/:id/approve` | `data.session` | `PAYROLL_SESSION_NOT_FOUND`, `PAYROLL_SESSION_NOT_COMPLETED` |
| Reject | `PATCH /api/v1/admin/sessions/:id/reject` | `data.session` | `PAYROLL_SESSION_NOT_FOUND` |

⛔ The queue payload must embed scheduled vs actual times, lesson topic, teaching notes
**and per-student attendance** — the drawer cannot be built without them, and no session
detail endpoint exists.

`approved` is a **one-way** transition and the gate that feeds payroll.

---

## 4. Page structure

1. **Title row** — `h1` `Buổi học chờ duyệt` + count `5 buổi`
2. **Filter toolbar** — teacher select, date-range
3. **Session table**
4. **Review drawer** — right-side, opens on row click; approve/reject happen here

## 5. Component specs

### Session table

| Column | Content | Align |
|---|---|---|
| Giáo viên | avatar 28px + nickname | left |
| Lớp | class name | left |
| Ngày dạy | `08/08/2026` | left |
| Thời lượng thực tế | `90 phút` | right |
| Chủ đề | lesson topic, truncated with ellipsis | left |
| Điểm danh | `7/8` + a 4px bar | left |
| (actions) | `check` and `x` icon buttons | right |

The `Điểm danh` bar is a 40px-wide track, `#E2E8F0`, filled `#16A34A` by present ratio.
It is a **meter**, not a chart — no legend, no axis.

### Review drawer — where the decision is made

Width `520px`. Contents top to bottom:

1. Teacher + class header, session date
2. **Thời gian** — scheduled vs actual, side by side:
   `Theo lịch 19:00 – 20:30` / `Thực tế 19:05 – 20:35 (90 phút)`.
   Highlight the actual figures — they drive pay
3. **Chủ đề bài học** — full lesson topic
4. **Ghi chú giảng dạy** — teaching notes, or `Không có ghi chú`
5. **Điểm danh** — student list with a status pill each: `Có mặt` `#16A34A`, `Vắng có phép` `#D97706`, `Vắng không phép` `#DC2626`
6. Footer bar: `Từ chối` (danger ghost) + `Duyệt buổi học` (primary)

### Reject modal

Opens over the drawer. Required `Lý do từ chối` textarea, submit disabled while empty.
Helper text: `Giáo viên sẽ nhận được lý do này và có thể chỉnh sửa rồi gửi lại.`

## 6. Data — use these exact values

```json
{
  "sessions": [
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"08/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:05 – 20:35","minutes":90,
     "topic":"Bài 12 — Trợ từ ngữ khí 吗 / 呢","notes":"Học sinh nắm bài tốt, cần luyện thêm phát âm.",
     "attendance":{"present":7,"excused":1,"unexcused":0,"total":8}},
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"06/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:00 – 20:30","minutes":90,
     "topic":"Bài 11 — Câu hỏi lựa chọn","notes":"",
     "attendance":{"present":8,"excused":0,"unexcused":0,"total":8}},
    {"teacher":"Đỗ Hải Yến","class":"HSK 3 — Nhóm B","date":"06/08/2026",
     "scheduled":"18:00 – 19:30","actual":"18:10 – 19:25","minutes":75,
     "topic":"Bài 8 — Bổ ngữ kết quả","notes":"Kết thúc sớm 5 phút.",
     "attendance":{"present":5,"excused":0,"unexcused":1,"total":6}},
    {"teacher":"Đỗ Hải Yến","class":"HSK 1 — Nhóm C","date":"05/08/2026",
     "scheduled":"17:00 – 18:00","actual":"17:00 – 18:00","minutes":60,
     "topic":"Bài 5 — Số đếm và ngày tháng","notes":"",
     "attendance":{"present":4,"excused":1,"unexcused":0,"total":5}},
    {"teacher":"Phạm Thị Lan","class":"HSK 2 — Nhóm A","date":"01/08/2026",
     "scheduled":"19:00 – 20:30","actual":"19:00 – 20:50","minutes":110,
     "topic":"Bài 10 — Ôn tập giữa kỳ","notes":"Dạy bù 20 phút cho phần ôn tập.",
     "attendance":{"present":8,"eqused":0,"unexcused":0,"total":8}}
  ]
}
```

Deliberate coverage: an over-run session (110 min), an under-run (75 min), an exact
match, an unexcused absence, and two sessions with empty notes.

## 7. States

Switcher: `Ready · Loading · Empty · Error · Drawer · Modal: từ chối · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Table skeleton |
| **Ready** | Five rows above |
| **Empty** | **A success state — make it read that way.** Centred `check-circle` in `#16A34A` at 15%, `Không có buổi học chờ duyệt`, body `Tất cả buổi học đã được xử lý.` No CTA — there is nothing to do |
| **Partial** | N/A |
| **Error** | Inline retry, filters preserved |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Buổi học chờ duyệt` |
| Columns | `Giáo viên` · `Lớp` · `Ngày dạy` · `Thời lượng thực tế` · `Chủ đề` · `Điểm danh` |
| Drawer sections | `Thời gian` · `Chủ đề bài học` · `Ghi chú giảng dạy` · `Điểm danh` |
| Time labels | `Theo lịch` · `Thực tế` |
| No notes | `Không có ghi chú` |
| Attendance pills | `Có mặt` · `Vắng có phép` · `Vắng không phép` |
| Actions | `Duyệt buổi học` · `Từ chối` |
| Reject field | `Lý do từ chối` |
| Reject helper | `Giáo viên sẽ nhận được lý do này và có thể chỉnh sửa rồi gửi lại.` |
| Toasts | `Đã duyệt buổi học` · `Đã từ chối buổi học` |
| Empty | `Không có buổi học chờ duyệt` / `Tất cả buổi học đã được xử lý.` |

## 9. Interactions

- Row click → drawer. Approving or rejecting closes the drawer and **removes the row** with a 200ms fade+collapse, then updates the count
- Approving the last row transitions the page to the Empty success state
- Below 768px: table → card list; drawer → full-screen sheet

## 10. Constraints — do NOT

- Do not let the Admin edit session times, topic, notes or attendance — approve or reject only. Corrections are the teacher's job on resubmit
- Do not allow rejection without a reason
- Do not show approved or rejected sessions here — this is a queue, not a log
- Do not use a chart for attendance; a meter bar only
