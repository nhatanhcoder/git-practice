# ADR-011: Thiếu state `rejected` — khoảng trống chưa lấp

**Status**: Proposed
**Date**: 2026-08-24
**Applies to**: `User.status`, enum `user_status`
**Related**: DOC-005 (KNOWN_ISSUES), quyết định nghiệp vụ #5 duyệt 2026-08-16

## Context

Hai thứ đang mâu thuẫn nhau, và **cả hai đều đã được ghi nhận**:

| Nguồn | Nói gì |
|---|---|
| Quyết định nghiệp vụ #5, duyệt 2026-08-16 (`ai/context/HANDOFF.md`) | **soft rejection** — từ chối thì giữ bản ghi, không hard delete |
| Migration `20260820000000_init_users`, đã merge | `CREATE TYPE user_status AS ENUM ('pending','active','suspended')` — **không có** `rejected` |

Nghĩa là: nghiệp vụ yêu cầu một trạng thái mà schema không biểu diễn được.

Hệ quả cụ thể:

- `pending → suspended` sai ngữ nghĩa — `suspended` là khoá một tài khoản **đang hoạt động**,
  không phải từ chối một đơn chưa từng được duyệt.
- Đơn bị từ chối **kẹt ở `pending` vĩnh viễn**, lẫn vào hàng đợi chờ duyệt của Admin.
- `apps/web/src/lib/user-status.js` xác nhận: `nextStatus()` chỉ có 3 nhánh
  (approve / suspend / activate), **không có nhánh reject**. FE hiện không có đường từ chối.

Migration đã merge **không sai** — nó bám sát `ENTITY_USER.md`, và `ENTITY_USER.md` mới là
thứ chưa được cập nhật sau quyết định 16/08.

## Đề xuất (chưa được duyệt)

Thêm `rejected` vào enum:

```
pending ──approve──► active ──suspend──► suspended ──activate──► active
   │
   └──reject──► rejected          (điểm cuối — không có đường quay lại)
```

- `rejected` là trạng thái cuối, không transition ra.
- Chỉ `pending → rejected` hợp lệ. `active → rejected` và `suspended → rejected` **không**.
- Bản ghi giữ nguyên, `email` vẫn chiếm chỗ trong unique index.
- Hàng đợi duyệt lọc `status = 'pending'`, `rejected` không xuất hiện ở đó.

## Việc phải làm nếu duyệt

1. Migration `ALTER TYPE "user_status" ADD VALUE 'rejected'` — Postgres cho phép, không mất
   dữ liệu. **Lưu ý**: `ADD VALUE` không chạy được trong transaction ở Postgres < 12;
   bản đang dùng là 16 nên không sao.
2. `ENTITY_USER.md` cập nhật enum.
3. `apps/web/src/lib/user-status.js` thêm nhánh `reject`.
4. Filter `?status=` ở `GET /admin/users` nhận thêm giá trị.
5. Cần một mã lỗi cho transition sai — registry **chưa có** (DOC-007). Không bịa ở đây.

## Chưa quyết

- **Có lưu lý do từ chối không?** `ClassSession` có `rejectionReason`, `User` thì không.
  Bất đối xứng này là thật. Nếu cần thì là một cột nữa, migration riêng.
- **Email của đơn bị từ chối vẫn bị khoá** — người dùng không đăng ký lại được bằng email cũ.
  Chấp nhận ở quy mô hiện tại hay không, chưa ai quyết.

## Vì sao để `Proposed` chứ không `Accepted`

Đụng enum của một migration đã merge. Theo `working-rules.md`, thay đổi schema cần người
duyệt rõ ràng — và bản thân quyết định 16/08 mới chỉ là một dòng trong HANDOFF, chưa từng
thành ADR. Ghi ra để khoảng trống này không biến mất, không phải để tự thông qua.
