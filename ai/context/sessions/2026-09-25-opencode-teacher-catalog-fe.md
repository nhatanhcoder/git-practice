# 2026-09-25 — Teacher Learning Catalog FE (3 màn) — opencode

Branch `feat/teacher-learning-catalog`, worktree `../Real-teacher-catalog` (không động
vào checkout bẩn `codex/student-practice-live`). Claim PROGRESS commit riêng `057ee8f`.

## Owner decisions đã chốt trước khi code
- Backend Slice 1B (`codex/learning-catalog-backend`) chưa merge → FE bám contract accepted.
- "Làm hết đi" 2026-09-25: gộp cả 3 màn (ngoại lệ skill "một màn một lượt"), chốt C1–C4
  theo đề xuất, build chặt từ contract+spec+design-system (ui-ux-pro-max/ui-styling vắng
  mặt trong worktree mới — skill cấm tự cài; Python 3.13 có sẵn nhưng không dùng tới).

## Đã viết (không mock, không endpoint bịa)
- `lib/teacher/learning-catalog-service.ts`: 13 endpoint đúng contract + `describeCatalogError`.
- `/teacher/learning-paths`: tabs link `?status=`, badge count từ `meta` mỗi tab (6 request
  song song, fail lẻn → ẩn badge), bảng + card mobile, create modal (VALIDATION_ERROR.details
  → per-field), xoá có điều kiện + 409 trung thực, redirect `?notice=` cho màn 2–3.
- `/teacher/learning-paths/[pathId]`: header theo state, review panel, frozen banner, split
  Tự soạn (modal title+level+từ đầu tiên vì API bắt buộc 1–8 words khi create) / Chọn từ
  catalog (picker search+HSK), reorder lạc quan + revert, publish/unpublish confirm,
  submit confirm. Foreign path (404/403) → redirect + toast (C1: contract 404 thắng).
- `/teacher/learning-paths/[pathId]/units/[unitId]`: word editor 1–8, dup-hanzi, PATCH
  diff-field, Ctrl+S, beforeunload, reference panel read-only, banner published amber,
  freeze + immutable đúng INV-LCAT-07 (C3: module thắng API_TEACHER).
- Shared: nav `Lộ trình học` (icon Route), `status.ts` +3 tone, `routes.ts` + 2 resolver
  (SKIP trung thực khi chưa có data).
- Docs: 3 contract + 3 spec → `built`, `_INDEX` Design `v1`, Needs C2/C4.

## Verify
- web build ✅ · type-check ✅ · web scripts 238/238 · check-docs 9/9.
- Temp PW spec 6/6 rồi xoá: mount, error trung thực, redirect+toast (stub đứng cho Slice 1B),
  modal validate, no-overflow, screenshots desktop+375px đã đọc.
- Shared sweep route tĩnh: chỉ rớt đúng tín hiệu backend-vắng (6× resource 404 noise);
  h1/overflow/screenshot pass. Dynamic routes SKIP (chưa có data).
- 2 lỗi tự bắt qua screenshot, sửa cùng ngày: error đè empty-state giả; subtitle "0 lộ trình" khi lỗi.

## Còn lại (không thuộc slice này)
- E2E live (CRUD/reorder/submit/publish thật): chạy lại sweep sau khi Slice 1B merge.
- Reference panel không có link ra catalog entry: chưa tồn tại route đó — hiện slug text,
  không render link chết.
- Push + PR: chưa làm, chờ owner.
