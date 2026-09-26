# 2026-09-26 — PR #99 concurrency blockers fix — opencode

PR #99 (`codex/learning-catalog-backend`): CI xanh nhưng independent review chặn merge
(P1 migration order, P1 frozen race, P2 create race). Owner lệnh "fix".

## Lane
`apps/api/**` là lane claude/codex. Fix theo lệnh owner trực tiếp; làm trên worktree +
branch riêng (`../Real-pr99-fix`, `fix/pr99-catalog-concurrency`, based tại PR head
357068d). Không động vào worktree `learning-catalog-backend` của codex, không push vào
nhánh đó. Song song lúc làm: lane khác merge PR #100 (migration split = P1-1) —
nhánh này không chạm schema/migration nên không xung đột.

## Fix (chỉ `learning-catalog.service.ts` + 2 dòng controller + tests)
- `withPathLock(pathId, work)`: một PG interactive tx (`timeout 15000, maxWait 5000`) giữ
  `pg_advisory_xact_lock(hashtext(pathId), 7)` — serialize mọi mutation cùng path xuyên
  process/instance (plain Postgres). Mongo writes chạy trong lock nhưng ngoài PG tx
  (DEBT-001). Mọi PG I/O trong lock qua đúng 1 connection (bài học: bản đầu dùng
  `this.prisma` lẫn `tx` → 2 conn/op → pool-convoy 500 khi 10 concurrent; sửa bằng cách
  cho loaders nhận `tx = this.prisma` mặc định và mọi call-site trong lock truyền tx).
- Teacher: updatePath (conditional `status in (draft,rejected,approved)` + recheck →
  NOT_FOUND/FROZEN), removePath, submitPath (dùng tx ngoài thay vì tx lồng), createUnit
  (count+cap trong lock), updateUnit/removeUnit/reorder/publish/unpublish (probe pathId →
  lock → fresh load; updateUnit null → NOT_FOUND).
- Admin: approve/reject/suspend/restore bọc lock; `moderatePath` nhận tx ngoài;
  approve re-check unitCount trong lock.
- Follow-up: DELETE teacher → 204; helper `request()` trong e2e chịu body rỗng;
  strip trailing whitespace session 2026-09-20.

## Tests (+4 e2e, file `learning-catalog.e2e.test.ts`)
- Frozen race (submit vs removeUnit, 12 vòng): pre-fix RỚT (both-200), post-fix pass.
- Cap race (seed 99 + 10 concurrent, levels mix): pre-fix RỚT (`[201,201,201,500×5,400×2]`
  — đúng 3 phát hiện của review: vượt cap, dup order, 500 duplicate-key); post-fix đúng
  1 winner + 9×400, 100 units, order 1..100 duy nhất.
- Double-submit: [200,409] (pass cả pre/post — regression lock).
- Frozen sequential (update/remove/reorder/publish trên pending_review → FROZEN).
- Riêng file: 16/16. Full suite: chỉ rớt 1 pay-rate assertion do reused `hsk_dev` state
  (trùng ghi nhận của codex trong PROGRESS; CI clean-DB xanh; diff này không chạm pay-rate).
- Build + type-check + lint + check-docs (chạy ở commit) — xem kết quả dưới.

## Verify tại commit
- `pnpm --filter api type-check` ✅ · `pnpm --filter api build` ✅ · `pnpm lint` ✅ ·
  catalog e2e 16/16 ✅ · full API suite: 1 rớt môi trường (pay-rate, như trên).

## Giao
- Push branch `fix/pr99-catalog-concurrency`. KHÔNG merge vào #99 (nhánh của codex đang
  rebase sau #100) — owner/codex cherry-pick hoặc merge sau khi #99 rebase xong.
- Sau merge #99: chạy lại FE sweep (teacher catalog FE chờ Slice 1B).
