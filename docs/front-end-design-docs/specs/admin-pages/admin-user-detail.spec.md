---
page: Admin · User Detail
route: /admin/users/[userId]
contract: ../../pages/admin-pages/admin-user-detail.md
requires: _DESIGN-SYSTEM.md
status: ready-for-design
last_updated: 2026-08-11
---

# Page Spec — Admin · User Detail

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

the read-only profile of one account, with its history, plus the three status actions. The Admin lands here from the accounts list before deciding to approve or suspend someone.

## 2. Access

admin. No ownership rule. On denial → `/admin/users`.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Profile + history | `GET /api/v1/admin/users/:id` | `data.user` | `USER_NOT_FOUND` |
| Approve / Suspend / Reactivate | same three `PATCH` routes as `/admin/users` | `data.user` | `USER_NOT_FOUND`, `USER_ALREADY_APPROVED` |

⛔ **Response must embed role-dependent history** — Student: `enrollments[]` + `attempts[]`;
Teacher: `classes[]` + `sessions[]`. Not specified in `API_ADMIN.md`. Confirm before build.

---

## 4. Page structure — top to bottom

1. **Back link** — `chevron-left` + `Quay lại danh sách`
2. **Header card** — 64px avatar, `nickname` (Lexend 600, 22px), email, role text, status pill, primary status action button on the right
3. **Identity card** — 3-column definition grid: Ngày đăng ký · Đăng nhập gần nhất · Trạng thái
4. **History panel** — **role-dependent**, see §5

There is no edit form on this page. Admin may read other users' profiles, not change them.

## 5. Component specs

### Header card status action

One button only, matching the current status:
`pending` → `Duyệt tài khoản` (primary, `#0F172A`) ·
`active` → `Khóa tài khoản` (danger outline, `#DC2626`) ·
`suspended` → `Mở khóa tài khoản` (primary)

### History panel — role-dependent

| Role | Panels |
|---|---|
| `student` | **Lớp đã tham gia** (class name, teacher, joined date, enrollment status pill) + **Bài đã nộp** (assignment, class, submitted date, score, attempt status pill) |
| `teacher` | **Lớp đang dạy** (class name, student count, status pill) + **Buổi học** (date, class, duration, session status pill) |
| `admin` | none — hide the panel entirely, do not render an empty shell |

Each panel is a card with a title and a compact table (row height 40px, max 5 rows,
`Xem tất cả` link if more).

### Session-history placeholder

Below the history panels, render a **disabled card**: title `Lịch sử đăng nhập`, body
`Chưa khả dụng — phụ thuộc Sprint 5`, 60% opacity, no interaction. Do not omit it and do
not leave blank space where it will go.

### Modals

Same three as the accounts list: approve (confirm), suspend (**required** reason
textarea, submit disabled while empty), reactivate (confirm). `max-width: 480px`.

## 6. Data — use these exact values

```json
{
  "user": { "nickname":"Nguyễn Minh Anh","email":"minhanh@example.com","role":"student",
            "status":"pending","createdAt":"09/08/2026","lastLoginAt":null,
            "avatarUrl":null,"hskLevelGoal":4 },
  "enrollments": [],
  "attempts": []
}
```

A second dataset for the state switcher (`Ready: teacher`):

```json
{
  "user": { "nickname":"Phạm Thị Lan","email":"lan.pham@example.com","role":"teacher",
            "status":"active","createdAt":"02/03/2026","lastLoginAt":"11/08/2026 07:42","bio":"Giáo viên HSK 1–4" },
  "classes": [
    {"name":"HSK 2 — Nhóm A","students":8,"status":"active"},
    {"name":"HSK 1 — Nhóm C","students":5,"status":"active"}
  ],
  "sessions": [
    {"date":"08/08/2026","class":"HSK 2 — Nhóm A","duration":"90 phút","status":"completed_pending"},
    {"date":"06/08/2026","class":"HSK 2 — Nhóm A","duration":"90 phút","status":"approved"},
    {"date":"01/08/2026","class":"HSK 1 — Nhóm C","duration":"60 phút","status":"approved"}
  ]
}
```

The default (`Nguyễn Minh Anh`) is deliberately a **brand-new pending student with no
history and a null last-login** — the exact case the empty states must handle.

## 7. States — render all, switchable

Switcher: `Ready: student · Ready: teacher · Loading · Empty · Partial · Error 404 · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Header card skeleton + history skeleton, independently |
| **Ready** | Two datasets above |
| **Empty** | User exists, no history → inside each panel: `inbox` icon 15% opacity + `Chưa có hoạt động nào`. Never a blank card |
| **Partial** | Header + identity resolved, history panels still skeleton — history is the slower join |
| **Error 404** | **Full-page** not-found: centred `alert-circle`, `Không tìm thấy tài khoản này.`, button `Quay lại danh sách`. Not an inline banner — the record does not exist |
| **Forbidden** | N/A — route guard redirects before render |
| **Offline** | N/A |

## 8. Copy — exact strings

| Location | String |
|---|---|
| Back link | `Quay lại danh sách` |
| Identity labels | `Ngày đăng ký` · `Đăng nhập gần nhất` · `Trạng thái` |
| Null last login | `—` |
| Student panels | `Lớp đã tham gia` · `Bài đã nộp` |
| Teacher panels | `Lớp đang dạy` · `Buổi học` |
| Placeholder card | `Lịch sử đăng nhập` / `Chưa khả dụng — phụ thuộc Sprint 5` |
| Empty panel | `Chưa có hoạt động nào` |
| 404 | `Không tìm thấy tài khoản này.` |
| Status pills | `Chờ duyệt` · `Đang hoạt động` · `Đã khóa` |
| Toasts | `Đã duyệt tài khoản` · `Đã khóa tài khoản` · `Đã mở khóa tài khoản` |

## 9. Interactions

- Status button → its modal → confirm → toast + pill updates optimistically
- History rows are **not** clickable in this mockup (no Admin route for a class or attempt)
- Transitions 150–300ms; honour `prefers-reduced-motion`
- Visible focus ring `#2563EB` 2px, 2px offset
- Below 768px: identity grid 3→1 column, history tables become stacked card lists

## 10. Constraints — do NOT

- Do not add an edit form, or make any profile field editable
- Do not add a delete-account action
- Do not render the teacher panels for a student, or vice versa
- Do not omit the Sprint-5 placeholder card
