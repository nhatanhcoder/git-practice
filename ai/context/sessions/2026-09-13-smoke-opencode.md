# 2026-09-13 — Smoke test liên vai + audit student + dựng bản prod đơn — opencode

## Phạm vi
READ-ONLY + vận hành môi trường. Không sửa code app. Đọc `docs/init-promt` rồi làm startup đầy đủ (AGENTS.md + 5 file always-loaded + session mới nhất lúc đó).

## Done
1. **Smoke test liên vai (admin+teacher+student) trên API + DB thật**:
   - `pnpm --filter api test` → **188/188 pass, 31 suites** (auth, approval/lifecycle, teacher classes/lessons/questions/sessions, student enrollment + flashcards/SRS, payroll/billing, vocab importer).
   - Web unit `node --test apps/web/scripts/*.test.mjs` → **156/156 pass**.
   - Playwright `PW_ALL=1` trên prod build → **93 pass / 6 fail / 3 skip** (skip có chủ ý).
2. **Triage 6 fail**:
   - `student-identity` #2, #4 (×2 viewport): pre-existing — thiếu fixture `a01.student@hsk.local` trong DB dev → 429 cascade. Đã ghi trong session 2026-09-11, chưa có ID KNOWN_ISSUES.
   - `student-demo-isolation` #3: do môi trường (login 500 khi API chết), pass sau khi restart.
   - **MỚI: `/admin/payroll` tràn ngang ở 375px (591px content)** — chưa có trong KNOWN_ISSUES, cần cấp WEB ID.
3. **Audit student FE+BE** (2 subagent song song + tự verify): xong thật chỉ auth + classes + flashcards SRS + vocab-import helper. Còn lại ~20 route mock (dev demo / prod UnavailableState); thiếu BE: student lesson view, assignments, attempts, mistake notebook, progress/analytics, gamification, F9–F15, student invoices, notifications inbox; thiếu contract: assignments/attempts/mistakes/lesson-detail; thiếu Playwright coverage nhiều route.
4. **Kế hoạch T1–T9** (trong chat, đã duyệt hướng): mỗi task có test criteria + prompt implement + prompt QC độc lập; đã gộp thành 1 prompt QC duy nhất + instantiate cho cả 9 task. Chưa thực hiện task nào (user dừng ở plan).
5. **Dựng bản prod đơn theo yêu cầu user**: `pnpm --filter web build` + `next start -p 3100` → http://localhost:3100 (live chỗ đã wire, "Chưa khả dụng" chỗ chưa code, không demo). Dev `:3000` giữ nguyên. Code mock chưa xóa (quyết định: xóa dần theo từng task T).
6. **Ghi runbook**: thêm §11 vào `docs/shared/ENVIRONMENT_SETUP.md` (bảng ports, bản prod, bẫy Docker, test LAN).

## Sự cố môi trường (2 lần, cùng gốc)
- Docker Desktop tự tắt → `hsk-postgres` mất → API P1001 crash (`Can't reach database server at localhost:5432`) → FE báo "Không kết nối được máy chủ". Fix: khởi động lại Docker Desktop + `docker compose up -d` + restart API. Khuyến nghị bật "Start Docker Desktop when you sign in".
- Server API cũ (16h tuổi) giữ dead Prisma pool → mọi login 500 trong lúc health báo postgres down. Fix: kill + chạy mới.
- CORS (`main.ts:59`) chỉ cho `localhost:3000`; `NEXT_PUBLIC_API_URL` đóng cứng lúc build → máy khác muốn test phải build lại với IP LAN + chạy API kèm `CORS_ORIGIN` mới (chưa làm, mới khảo sát).

## Quyết định tạm thời
- Mock FE để yên tới khi từng task T wire xong mới xóa (user đồng ý hướng này).
- File rác `apps/web/test-results-bak-1789231926/` (2.208 file backup Playwright) làm phình git status — đã báo user, chờ duyệt mới xóa.

## Ghi chú lane
- Viết file này trong lúc checkout đang dở merge của lane khác (`feat/pw-sweep-routes`, conflict `UU ai/PROGRESS.md`) → KHÔNG commit, chỉ để working-tree. Lane kia xong merge thì commit sau.
- Phát hiện trong log dev của user: đã có `AssignmentsModule`, `StudentAssignmentsController (GET /student/assignments)`, `NotificationsModule` load ở branch user đang chạy — mới hơn audit BE của session này (audit trên `fix/main-tsc-vocab-apply` chưa có). Audit T5/T9 cần re-verify trước khi implement.
