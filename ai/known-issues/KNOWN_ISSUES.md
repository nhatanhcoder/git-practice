# ⚠️ KNOWN_ISSUES.md — Known Issues & Limitations

> Replaces Jira for a solo dev. Track bugs, limitations, and technical debt here.

---

## Format

```
### [ISSUE-XXX] Title

**Severity**: Critical | High | Medium | Low
**Sprint**: Sprint X
**Status**: Open | In Progress | Resolved | Won't Fix

**Description**: ...
**Reproduce**: ...
**Workaround**: ...
**Fix Plan**: ...
```

---

## Open Issues

### [DOC-001] Duplicate docs — git worktree lives inside the repo

**Severity**: High
**Status**: ✅ Resolved 2026-08-14 — `git worktree list` shows only the main checkout;
`.claude/` is absent from disk and gitignored. Kept for the lesson: **worktrees live outside
the repo**, `multi-agent-workflow.md` §5.

**Description**: `.claude/worktrees/updatedocs-to-english/` is a git worktree checked out
**inside** the repo. It holds a second full copy of `ai/` and `docs/` — 88 duplicate `.md`
files against 118 real ones. The copy is stale (its `ai/skills/*.md` are still the empty
0-byte versions).

**Impact**: grep, file search and AI context all return two versions of every file. An agent
can silently read the outdated copy. Its `.git` file also holds an absolute Windows path, so
git run from any other environment fails with `fatal: not a git repository`.

**Fix Plan**:
```
git worktree remove .claude/worktrees/updatedocs-to-english
git worktree add ../Real-updatedocs updatedocs-to-english
```
Worktrees must live **outside** the repo — see `ai/rules/multi-agent-workflow.md` §5.

---

### [DOC-002] Third copy of the repo left in OneDrive

**Severity**: Medium
**Status**: Open

**Description**: The repo was moved to `D:\PersonalProject\Real`, but OneDrive re-synced a
partial copy back to `C:\Users\nhata\OneDrive\Máy tính\Real` (`ai/`, `docs/`, `.git`,
AGENTS.md, CLAUDE.md).

**Fix Plan**: delete the OneDrive copy. Never keep the repo inside OneDrive — see
`docs/shared/ENVIRONMENT_SETUP.md`.

---

### [DOC-003] `root-design-fe.md` is the token source but still marked draft

**Severity**: Medium
**Status**: ✅ Resolved 2026-08-14 — promoted to `status: active`. Its tokens have now been
rendered on `/admin/users`, though see WEB-002: the code does not actually source badge
colours from it yet.

**Description**: `docs/front-end-design-docs/root-design-fe.md` has `status: draft`, yet every
page spec and `specs/_DESIGN-SYSTEM.md` derive their tokens from it. It has also never been
rendered in a real page.

**Fix Plan**: promote to `status: active` once `/admin/users` is built and the tokens are
confirmed on screen.

---

### [DOC-004] HSK level range inconsistent across docs

**Severity**: Medium
**Status**: ✅ Resolved 2026-08-14 — swept all 117 markdown files. Every remaining "HSK 1–6"
string sits inside the note explaining *not* to use 1–6. The range is **1–9**.

**Description**: `ai/context/project-brain.md` says HSK **1–9** (updated 2026-08-11, calling
1–6 a mistaken revert). Some other sources still say 1–6. `ENTITY_USER.md` has
`hskLevelGoal` documented as 1–9.

**Fix Plan**: sweep all docs, settle on 1–9, note it in an ADR.

---

### [API-001] Missing endpoints blocking the Admin UI

**Severity**: High
**Status**: Open

**Description**: Mapping the Admin surface surfaced endpoints that do not exist in
`docs/api/API_ADMIN.md`, the worst being `GET /api/v1/admin/payroll/:id`.
Also, the entire `INVOICE_*` error-code family is absent from `API_ERROR_CODES.md`.

**Status update 2026-08-14**: all 7 endpoints are now *written down* in `API_ADMIN.md`
§ *Referenced by FE contracts, not yet defined*, and the `INVOICE_*` / `RATE_*` / `SESSION_*`
/ `AI_*` code families exist in `API_ERROR_CODES.md` marked **proposed, not agreed**.
**Still Open** — documenting a gap is not closing it. Five business decisions still block
four of the endpoints.

**Fix Plan**: full list in `ai/PROGRESS.md` → `## Needs from the other lane`.

---

### [WEB-001] Sticky table header overlaps the first row

**Severity**: Low
**Status**: Resolved (pattern to avoid)

**Description**: A card wrapping a table with `overflow-hidden` becomes the containing block
for `position: sticky`. A `thead` with `sticky top-[56px]` is then pushed 56px down **inside
the card**, covering row 1.

**Workaround**: drop `overflow-hidden` from the card so the `thead` sticks to the viewport.

**Note**: `next build` passed with this bug present. It was only caught by screenshotting the
page and looking at it — build success is not render correctness.

---

### [BUILD-001] `turbo.json` missing — `pnpm dev` / `pnpm build` fail at repo root

**Severity**: High
**Status**: Open

**Description**: Root `package.json` defines `dev`, `build`, `lint`, `type-check` as
`turbo run <task>`, and `turbo` is in devDependencies, but there is **no `turbo.json`**.
Any command run from the repo root fails. Only `pnpm --filter web dev` works.

**Impact**: CI cannot be set up, and the Sprint 0 DoD ("CI passes lint+build") is
unreachable. Also `eslint.config.mjs` and `.prettierrc` are missing, so there is no lint gate
at all — three agents are writing into this repo with nothing enforcing style or catching
unused imports.

**Fix Plan**: create `turbo.json` with `dev`/`build`/`lint`/`type-check` pipelines, add
eslint + prettier configs. One commit, alone (frozen files, `multi-agent-workflow.md` §2).

---

### [GIT-001] ~118 files permanently show as modified — line endings

**Severity**: High
**Status**: Open — `.gitattributes` added 2026-08-14, **normalisation not yet run**

**Description**: The working tree is CRLF, `HEAD` is LF, there was no `.gitattributes` and
`core.autocrlf` is unset. `git diff --stat` reports ~13,000 changed lines across ~120 files
when the real change is a handful.

**Impact**: this is the highest-risk conflict source in the repo. Review is impossible — a
real change is invisible in the noise. With two agents on different environments (Windows
native vs WSL/container) every merge becomes a whole-file conflict on every file.

**Fix Plan**: run once on Windows, no agent working:
```
git config core.autocrlf false
git add --renormalize .
git commit -m "chore: normalise line endings via .gitattributes"
```

---

### [GIT-002] `.idea/` still tracked despite being gitignored

**Severity**: Low
**Status**: Open

**Description**: `.gitignore` lists `.idea/`, but the files were committed before that, so
git keeps tracking them and they show as modified forever.

**Fix Plan**: `git rm -r --cached .idea && git commit -m "chore: stop tracking .idea"`

---

### [WEB-002] Badge colours hardcoded in CSS instead of `lib/status.ts`

**Severity**: Medium
**Status**: Open

**Description**: The project decision is that `apps/web/src/lib/status.ts` is the **only**
place a status colour is decided (enum → hex). In reality `status.ts` does not exist;
`lib/user-status.js` holds only transition logic, and the colours are hardcoded in
`app/admin/users/users.module.css` (`.pending`, `.active`, `.suspended`).

**Impact**: the rule that exists specifically to prevent colour drift is not enforced by
anything. Teacher and Student screens will each invent their own.

**Fix Plan**: create `lib/status.ts` exporting the enum→token map; drive the CSS from custom
properties set from it. Do this **before** mapping Teacher/Student.

---

### [WEB-003] The two `/admin/users` screens disagree on date format

**Severity**: Medium
**Status**: Open

**Description**: The list stores ISO (`"2026-08-09"`) and formats via `formatDate()`. The
detail dataset stores display strings (`"09/08/2026"`) and has no formatter.

**Impact**: `API_CONVENTIONS.md` mandates UTC ISO 8601 on the wire. When the real API lands,
the list keeps working and the detail screen breaks. The bug is invisible today because both
run on mocks.

**Fix Plan**: all mock data stores ISO; formatting happens only at render. Add the rule to
the spec template so the other 11 admin screens do not repeat it.

---

### [WEB-004] Dev-only REVIEW-STATE switcher shipped in the page

**Severity**: Low
**Status**: Open

**Description**: Both `/admin/users` screens render a fixed-position "REVIEW STATE" widget for
flipping between ready/loading/empty/error. It is design-review scaffolding, unconditionally
rendered.

**Fix Plan**: gate behind `process.env.NODE_ENV !== 'production'`, or strip when the real API
is wired. Decide the convention now — all 13 admin screens will have one.

---

### [WEB-005] Page metadata title static across admin routes

**Severity**: Low
**Status**: Open

**Description**: All 10 newly built admin screens are client components without individual
exported `metadata` or dynamic document title setters, resulting in the fallback title
"Tài khoản | HSK Learning Platform" persisting across all routes.

**Fix Plan**: Add `export const metadata: Metadata` in page / layout wrappers or use
`<title>` tags per admin screen.

---

### [API-002] Hai công thức đọc rate mâu thuẫn nhau — sai số tiền

**Severity**: Critical
**Sprint**: Backend Phase 0
**Status**: Open

**Description**: `ADR-008` (Accepted, 2026-08-13) quy định rates là **append-only**: đổi mức
= tạo bản ghi mới, đọc mức áp dụng bằng
`WHERE effectiveFrom <= <date> ORDER BY effectiveFrom DESC LIMIT 1`.

Nhưng `ENTITY_TEACHER_PAY_RATE.md` và `ENTITY_STUDENT_TUITION_RATE.md` lại ghi *"To update
rate: set `effectiveTo` on current, create new record"* và *"Active rate = where
`effectiveTo IS NULL` or `effectiveTo > today`"* — tức **có UPDATE dòng cũ**, và đọc bằng
một câu SQL khác hẳn.

**Reproduce**: Với cùng một teacher và cùng một kỳ lương, hai câu truy vấn trả về hai bản ghi
rate khác nhau nếu `effectiveTo` bị đặt sai hoặc không đặt → **hai số tiền lương khác nhau**.

**Fix Plan**: Chốt một bên bằng ADR trước khi viết dòng code tính tiền đầu tiên. Bằng chứng
nghiêng về ADR-008: FE `admin-tuition-rates.spec.md` mô tả lịch sử chỉ bằng `effectiveFrom`
+ cờ `current`, không dùng `effectiveTo`. Nếu chọn ADR-008 thì `effectiveTo` nên bỏ khỏi
schema, hoặc đánh dấu rõ là cột suy diễn chỉ để hiển thị.

---

### [API-003] Kỳ payroll `draft` tạo nhầm không có đường huỷ

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: Open

**Description**: Tạo `PayrollPeriod` sẽ gán `payrollPeriodId` lên các `ClassSession` được gom
vào kỳ. Không có endpoint nào xoá kỳ `draft` hay gỡ gán session — `API_ADMIN.md` chỉ có
`POST /admin/payroll`, `GET`, `PATCH /:id/finalize`, `PATCH /:id/pay`.

**Reproduce**: Admin tạo nhầm kỳ lương (sai khoảng ngày, sai teacher) → các session đã bị gán
**khoá vĩnh viễn** khỏi mọi kỳ lương tương lai, vì chúng không còn `payrollPeriodId IS NULL`.

**Workaround**: Sửa trực tiếp DB. Không chấp nhận được khi chạy thật.

**Fix Plan**: Thêm `DELETE /admin/payroll/:id` chỉ cho phép khi `status = draft`, và phải gỡ
`payrollPeriodId` của mọi session trong cùng transaction.

---

### [API-004] `GET /admin/sessions/pending` sẽ vĩnh viễn rỗng

**Severity**: High
**Sprint**: Backend Phase 3
**Status**: Open

**Description**: Màn duyệt buổi dạy không có nguồn dữ liệu. Hai lỗ hổng cộng lại:
1. Không có endpoint tạo `Class` hay `ClassEnrollment` cho bất kỳ role nào trong phạm vi đã
   thiết kế — `API_ADMIN.md` không có, và `Class.create` theo RBAC thuộc Teacher.
2. Ba transition `scheduled → in_progress → completed_pending` của `ClassSession` không có
   endpoint ở đâu cả. Không có gì đưa session vào trạng thái `completed_pending`.

**Reproduce**: Dựng xong `GET /admin/sessions/pending` → luôn trả mảng rỗng. Notification
`session_submitted_for_review` không bao giờ phát sinh.

**Fix Plan**: Quyết SCOPE-01 (xem `ai/PROGRESS.md` § Vẫn chưa chốt). Hai phương án và đề xuất
nằm ở `docs/api/modules/03-classes-enrollment.md` §16.

---

### [DOC-005] `User.status` không biểu diễn được "đơn bị từ chối"

**Severity**: High
**Sprint**: Backend Phase 2
**Status**: Open

**Description**: Quyết định nghiệp vụ #5 (duyệt 2026-08-16) chọn **soft rejection** — giữ bản
ghi, không hard delete. Nhưng `ENTITY_USER.md` chỉ có `status: pending / active / suspended`.
Không có `rejected`.

`pending → suspended` không phải chuyển đổi hợp lệ về mặt ngữ nghĩa (suspend là khoá tài khoản
đang hoạt động), nên hồ sơ bị từ chối **kẹt ở `pending` vĩnh viễn** và lẫn vào hàng đợi chờ duyệt.

**Fix Plan**: ADR-011 + migration thêm giá trị enum `rejected`. Kéo theo: giá trị hợp lệ của
filter `?status=`, state machine ở `docs/api/modules/02-users.md` §6.

---

### [DOC-006] `nickname` vs `fullName` — tên field không khớp giữa entity và API

**Severity**: Medium
**Sprint**: Backend Phase 2
**Status**: Open

**Description**: `ENTITY_USER.md` định nghĩa field `nickname`. Nhưng `API_AUTH.md` dùng
`fullName` ở cả `POST /auth/register` và `PATCH /auth/me`.

**Impact**: Chặn DTO response của cả 5 endpoint users, và chặn cả việc xác định field nào
được tìm kiếm bởi query `?search=`.

**Fix Plan**: Chốt một tên. Chọn `fullName` thì phát sinh migration đổi tên cột.

---

### [DOC-007] Không rõ mã lỗi nào dùng được, mã nào còn chờ duyệt

**Severity**: Medium
**Sprint**: Backend Phase 0
**Status**: Open

**Description**: `API_ERROR_CODES.md` đánh dấu *proposed, not agreed* không nhất quán: nhóm
`INVOICE_*`, `RATE_*`, `AI_*` có banner cảnh báo, nhưng mục "Session Review Errors"
(`SESSION_*`) **không có**. Ngược lại `PAYROLL_*` có trong registry nhưng không xuất hiện
trong bất kỳ danh sách "đã duyệt" nào.

Ngoài ra các nhánh lỗi sau **chưa có mã hợp lệ**: trùng kỳ lương · kỳ lương chồng lấn ·
`per_hour` thiếu `actualStart`/`actualEnd` · xung đột idempotency key · chuyển trạng thái sai
ở suspend/activate · `CLASS_CODE_INVALID` · `CLASS_ARCHIVED` · `CLASS_ALREADY_ENROLLED`.
`PAYROLL_PERIOD_FINALIZED` đang phải gánh 3 ngữ nghĩa khác nhau.

**Fix Plan**: Rà lại toàn bộ registry, đánh dấu trạng thái nhất quán cho từng nhóm, bổ sung
các mã còn thiếu. Không module nào được tự bịa mã.

---

## Technical Debt

### [DEBT-001] No cross-DB transactions

**Severity**: Medium
**Status**: Won't Fix (by design)

**Description**: PostgreSQL and MongoDB do not share a transaction. If creating a Question (MongoDB) succeeds but linking it to an Assignment (PostgreSQL) fails, orphan data can result.

**Workaround**: Periodic cleanup script, or soft-delete instead of hard-delete.

---

### [DEBT-002] No real-time notifications (polling only)

**Severity**: Low
**Status**: Won't Fix (Sprint 6 scope)

**Description**: Notifications use 60-second polling, not real-time WebSocket.

**Workaround**: Polling interval is sufficient for the current use case.

---

## Resolved Issues

*(To be updated as bugs are fixed)*
