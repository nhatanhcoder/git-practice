# ADR-015: Cột tên người dùng là `nickname`

**Status**: Accepted
**Date**: 2026-08-20 (ratified 2026-08-24)
**Applies to**: `User.nickname`, `API_AUTH.md`, `apps/web`
**Related**: DOC-006 (KNOWN_ISSUES)

## Context

Tên field không khớp giữa hai nguồn:

| Nguồn | Dùng |
|---|---|
| `docs/entities/postgres/ENTITY_USER.md` | `nickname` |
| `docs/api/API_AUTH.md` | `fullName` — ở `POST /auth/register` và `PATCH /auth/me` |

Sự mơ hồ đã lan vào code. `apps/web/src/lib/auth-profile-data.ts` khai **cả hai field với
giá trị giống hệt nhau**; `apps/web/src/lib/user-detail-data.js` chỉ dùng `nickname`.

## Decision

**Cột là `nickname`.** Quyết định này **đã được thực thi** trong migration
`20260820000000_init_users` (merge qua PR #12) và schema comment ghi rõ *"C1 resolved
2026-08-20: the column is `nickname`, not `fullName`"*.

ADR này **ghi nhận lại** quyết định đã có, không tạo quyết định mới.

Ràng buộc kèm theo, do migration áp ở tầng DB:

```sql
CHECK (nickname IS NULL OR btrim(nickname) <> '')   -- nullable nhưng không được rỗng/toàn khoảng trắng
VARCHAR(100)
```

## Consequences

- `API_AUTH.md` vẫn ghi `fullName` ở hai endpoint → **phải sửa thành `nickname`**.
  Schema là bên được chọn; API doc là bên phải theo.
- `apps/web/src/lib/auth-profile-data.ts` bỏ field `fullName`, giữ `nickname`.
- `docs/api/modules/02-users.md` §3 DTO chốt được — trước đó treo vì mâu thuẫn này.
- `docs/api/modules/01-auth.md` phần DTO register cần đổi theo.
- Ràng buộc `btrim() <> ''` nằm ở DB nên service không cần tự kiểm — nhưng vẫn phải trả
  `VALIDATION_ERROR` cho người dùng trước khi chạm DB, đừng để lỗi constraint lọt ra ngoài.

## Bị bác

Phương án `fullName` từng được đề xuất 2026-08-24 với lý do "hệ thống in hoá đơn và bảng
lương nên cần tên thật". Bác vì migration đã chạy với `nickname` và `ENTITY_USER.md` — nguồn
sự thật về field theo `working-rules.md` — cũng ghi `nickname`. Cần phân biệt tên hiển thị
và tên pháp lý trên chứng từ thì **thêm** cột `legalName`, không đổi cột này.
