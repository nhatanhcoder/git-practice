# 2026-08-25 — Đồng bộ repo, gỡ index.lock, dọn tàn dư pull hỏng

**Người/agent:** Claude (Cowork, remote sandbox + device mount)
**Trạng thái:** ✅ hoàn tất phần đồng bộ — còn 2 việc chờ người quyết

## Bối cảnh
Vào phiên với local `main` tụt 18 commit sau `origin/main`, `.git/index.lock` 0 byte
kẹt từ 24/08 18:29, và một đống file untracked là bản dựng lại nhầm.

## Sự cố giữa phiên — MOUNT KHÔNG CHO `unlink`
`git pull` qua device mount fail hàng loạt:
```
error: unable to unlink old '.gitignore': Operation not permitted
error: unable to unlink old 'AGENTS.md': Operation not permitted
... (54 file)
```
Git **tạo được file mới nhưng không thay được file cũ** → cây làm việc nửa vời:
file mới xuất hiện dạng untracked, index không đổi, HEAD vẫn `4be69ea`.

> **BẪY MỚI — cần vào KNOWN_ISSUES:** qua device mount, `rm`/`unlink` bị cấm nhưng
> `mv` (rename) thì được. Hệ quả:
> - `git pull` / `merge` / `checkout <branch>` **không dùng trực tiếp được**
> - Lock kẹt (`.git/index.lock`) **gỡ được** bằng `mv`, không cần đợi Windows
> - Cách vòng: `git show origin/main:<path> > <path>` (ghi đè tại chỗ, không unlink)
>   cho từng file → `git update-ref` → `git reset` (mixed)

## Đã làm
1. Gỡ `.git/index.lock` bằng `mv`.
2. Xác minh 18 commit thiếu = PR #8 → #12 (`66f3c4b` scaffold NestJS + Prisma migration
   + docker-compose; `37601a2`, `0a1dcc9` dịch `docs/api/` và `ai/` sang tiếng Anh).
3. Khôi phục `.gitignore` về bản HEAD (bản local thêm `.agents/skills/` sẽ conflict).
4. Backup `docker-compose.yml` + `.env.example` bản local vào `_backup/`.
5. Thử `git pull` → thất bại (xem trên). Dọn tàn dư: 36 file byte-identical với
   `origin/main` + `prisma/` root + `ai/skills/` rỗng + `apps/api/dist/` → `_to_delete/`.
6. **Đồng bộ thủ công thành công**: ghi đè tại chỗ 54 file (33 A + 21 M, 0 D) từ
   `origin/main` → `git update-ref refs/heads/main` → `git reset`.
   **`git diff HEAD` rỗng, `git fsck` sạch, HEAD = `d277ca1`.**
7. Điền `.env` từ `.env.example` bản chính thức (1705 byte).
8. Tạo branch `docs/adr-011-015`, **stage** ADR-011 + ADR-015 + session file này.
9. Verify: `check-docs` **8/8 passed**; `apps/api/prisma/` đủ 4 file kể cả migration
   `20260820000000_init_users`; GIT-002 (`.idea/`) đã hết tracked → **có thể đóng**.

## Phát hiện — doc mâu thuẫn, KHÔNG tự chọn bên
### 1. Hạ tầng local: bản PR #12 khác hẳn mô tả cũ
| | Bản cũ (local, 24/08) | Bản PR #12 (chính thức) |
|---|---|---|
| Service Postgres | `postgres` | `db` |
| Cổng Postgres | cứng `5433` | `${POSTGRES_PORT:-5432}` |
| Tên DB | `hsk` | `hsk_dev` |
| MongoDB | container local `27018` | **bỏ hẳn — chạy Atlas** |

→ Mọi doc/ghi chú còn nói "Postgres 5433, Mongo 27018" đã **lỗi thời**. Cần sweep.

### 2. `.env.example` bản PR #12 THIẾU toàn bộ khối auth
Bản local có `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_TTL`,
`JWT_REFRESH_TTL`, `BCRYPT_ROUNDS`, `COOKIE_DOMAIN`, `COOKIE_SECURE`, `CORS_ORIGIN`,
`NEXT_PUBLIC_API_URL`. Bản chính thức **không có biến nào trong số đó**.
`01-auth` lại là module spec duy nhất ở trạng thái `accepted`.
→ Đây là **khoảng trống thật**, không phải khác biệt phong cách. Chạm auth ⇒ **chờ duyệt**.
Bản cũ giữ ở `_backup/env.example.local`.

### 3. DOC-004 còn sót một chỗ
`ai/context/HANDOFF.md:127` vẫn viết "HSK 1–6 tuition rates table". Dòng 244 là tiêu đề
lịch sử (đúng, để nguyên). Chưa sửa — chờ xác nhận.

## Còn phải làm
- [ ] **`git commit`** trên Windows — sandbox không có git identity, không tự ký thay
      người dùng. File đã stage sẵn, chỉ cần `git commit`.
- [ ] Quyết khối auth trong `.env.example` (mục 2) — **cần duyệt**
- [ ] Sweep "5433 / 27018 / Mongo local" khỏi doc (mục 1)
- [ ] Sửa `HANDOFF.md:127` (mục 3)
- [ ] `ai/PROGRESS.md` + `KNOWN_ISSUES.md`: ghi bẫy mount, đóng GIT-002
- [ ] Xoá `_to_delete/`, `_backup/`, `finish-pull.ps1` (script không còn cần)
- [ ] `.git/objects/*/tmp_obj_*` — vài file rác, `git gc` sẽ dọn

## Không đụng tới
Không sửa schema, không sửa doc nghiệp vụ, không quyết blocker nào
(tiền, SCOPE-01, API-002, DOC-005, API-003 vẫn nguyên).
