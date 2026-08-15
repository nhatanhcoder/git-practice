---
page: Admin · My Profile
route: /admin/profile
contract: ../../pages/admin-pages/admin-profile.md
requires: _DESIGN-SYSTEM.md
status: built
design_baseline: v1
last_updated: 2026-08-11
---

# Page Spec — Admin · My Profile

> **Paste this together with `_DESIGN-SYSTEM.md`.**
> That file holds the tokens, layout shell, standard components, chart rules and global
> do-NOTs. This file holds only what is specific to this page.
>
> **If you were not given `_DESIGN-SYSTEM.md`, stop and ask for it.** Do not invent
> colours, fonts or spacing — this product has a locked design system.

---

## 1. Purpose

the Admin's own account: name, email, avatar, and password. This screen edits the signed-in user only — it is not a tool for editing anyone else.

## 2. Access

admin, **self only**. This screen never edits another account — `/admin/users/[userId]` is read-only for profile fields.

## 3. API mapping

| Region / action | Method + path | Envelope | Errors |
|---|---|---|---|
| Load profile | `GET /api/v1/auth/me` | `data.user` | — |
| Save profile | `PATCH /api/v1/auth/me` | `data.user` | `VALIDATION_ERROR`, `AUTH_EMAIL_EXISTS` |
| Change password | `POST /api/v1/auth/change-password` | — | `VALIDATION_ERROR`, `AUTH_INVALID_CREDENTIALS` |
| Upload avatar | Supabase Storage | `data.avatarUrl` | `USER_AVATAR_UPLOAD_FAILED` |

⚠️ These are **shared auth endpoints, not admin-specific** — confirm they exist in
`docs/api/API_AUTH.md` rather than adding `/admin/*` routes for them.

`VALIDATION_ERROR.details` is keyed by field name; map it into per-field errors.

---

## 4. Page structure

1. **Title row** — `h1` `Hồ sơ của tôi`
2. **Profile card** — avatar + name + email, own submit button
3. **Password card** — three fields, own submit button

Two cards, **two independent submits**. Never one `Lưu` covering both — changing a
password must not be a side effect of correcting a typo in a name.

Max content width `640px` — this is a form page, not a data page; a full-width form at
1440px is unreadable.

## 5. Component specs

### Profile card

- Avatar block: 80px circle, `Đổi ảnh` text button beneath, `Xóa ảnh` if one is set
- `Tên hiển thị` — text, required
- `Email` — email, required, helper text `Dùng để đăng nhập.`
- Footer: `Lưu thay đổi` (primary), disabled until a field is dirty

### Password card

- `Mật khẩu hiện tại` — password, required
- `Mật khẩu mới` — password, required, with a strength meter beneath: 4px track, segments filling `#DC2626` → `#D97706` → `#16A34A`
- `Xác nhận mật khẩu mới` — password, required
- Helper under `Mật khẩu mới`: `Ít nhất 8 ký tự, có chữ hoa và số.`
- Footer: `Đổi mật khẩu` (primary), disabled until all three are filled

### Field-level errors

Errors map from the API's `VALIDATION_ERROR.details` object, keyed by field name. Render
beneath the field: 13px `#DC2626`, plus a `#DC2626` border on the input. Do **not** show
a toast for validation failures — the error belongs next to the field that caused it.

## 6. Data — use these exact values

```json
{
  "profile": { "nickname":"Bùi Anh Tuấn","email":"tuanbui@example.com","avatarUrl":null,
               "role":"admin","createdAt":"05/11/2025" },
  "validationErrorExample": {
    "email": ["Email đã được sử dụng"],
    "password": ["Mật khẩu phải có ít nhất 8 ký tự","Phải có chữ hoa và số"]
  }
}
```

Avatar is null — the mockup must show the initials-fallback avatar (`BT`, `#0F172A`
background, white Lexend 600 text), which is the common case.

## 7. States

Switcher: `Ready · Loading · Saving · Validation error · Error · Mobile`

| State | Appearance |
|---|---|
| **Loading** | Both cards skeleton |
| **Ready** | Data above |
| **Saving** | The submitted card's button shows a 16px spinner + `Đang lưu…`, its fields disabled. **The other card stays fully interactive** |
| **Validation error** | Both example errors rendered inline, on email and on the new-password field |
| **Empty** | N/A — a signed-in user always has a profile |
| **Partial** | N/A |
| **Error** | Card-level banner above the failing card's fields |
| **Forbidden** / **Offline** | N/A |

## 8. Copy

| Location | String |
|---|---|
| Title | `Hồ sơ của tôi` |
| Card titles | `Thông tin cá nhân` · `Đổi mật khẩu` |
| Fields | `Tên hiển thị` · `Email` · `Mật khẩu hiện tại` · `Mật khẩu mới` · `Xác nhận mật khẩu mới` |
| Email helper | `Dùng để đăng nhập.` |
| Password helper | `Ít nhất 8 ký tự, có chữ hoa và số.` |
| Avatar actions | `Đổi ảnh` · `Xóa ảnh` |
| Submits | `Lưu thay đổi` · `Đổi mật khẩu` |
| Saving | `Đang lưu…` |
| Toasts | `Đã lưu hồ sơ` · `Đã đổi mật khẩu` |

## 9. Interactions

- Avatar upload shows an optimistic preview; on failure it reverts and shows an inline error
- Password strength meter updates on keystroke
- Submitting one card never disables the other
- Below 768px: cards full width, avatar block centres above the fields

## 10. Constraints — do NOT

- Do not merge the two forms behind one save button
- Do not allow changing own role or account status
- Do not show validation failures as toasts
- Do not add session/device management — out of scope
