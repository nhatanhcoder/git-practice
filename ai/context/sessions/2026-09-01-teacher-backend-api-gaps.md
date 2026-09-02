# 2026-09-01 — Teacher/Admin backend docs: close API-006 + API-007 — Claude Code

**Context**: owner asked to update backend docs for Teacher and Admin, explicitly **no DB setup**
("no setup db yet, do it later"). Scope agreed up front as the small one: close the API-surface
gaps and fix stale claims; **no Teacher module specs written this session**.

**Two owner decisions taken before writing** (both blocked everything else):
1. **`API-006` route convention → role-prefixed** (`/api/v1/teacher/classes/...`).
2. **Scope → "lấp lỗ hổng + sửa stale"**, not full module specs.

**Analysis that changed the picture**:
- `docs/api/modules/` is **Admin-only** — the title says so, but the folder name does not. The
  Teacher backend has **no module spec at all**. Recorded as a new § 11 gap map in its `_INDEX.md`.
- `API-006` was worse than the entry said. It recorded "neither side is implemented". In fact a
  **third** source — `docs/api/modules/03-classes-enrollment.md`, the backend build source — used
  bare `/api/v1/classes` too, siding against `API_TEACHER.md`. Verified `API_STUDENT.md` and
  `API_ADMIN.md` in the real repo: both role-prefixed. So the outliers were the module spec and
  `FLOW_ENROLLMENT.md`, not `API_TEACHER.md`.
- `ENTITY_LESSON.md` + `ENTITY_LESSON_ASSIGNMENT.md` are **full specs** that nobody had read when
  the Lessons FE contract was written. Three things the contract had marked
  "inferred / unconfirmed / to be settled" are written business rules: ownership inherits from the
  parent class; delete is blocked while a linked assignment has active Attempts; and
  Lesson↔Assignment is **M:N** (`FEATURES_TEACHER.md` T-LESSON-3 still calls that undecided —
  entity specs outrank feature docs).

**Done**:
- `API_TEACHER.md` § **Lessons** — 8 endpoints covering T-LESSON-1…5, with writable fields and the
  four entity-sourced rules. Every path/field/rule traced to the entity specs; nothing invented.
- `API_ERROR_CODES.md` — `LESSON_*` family (6 codes), marked *proposed, not agreed* per the
  registry convention. Each maps to a constraint already in the entity specs.
- `docs/api/modules/03-classes-enrollment.md` § 2 — rewritten to role-prefixed paths quoted from
  the role API docs. Recorded two consequences instead of smoothing them over: the old
  `GET /classes` row served two roles and splits into two endpoints that already exist; and there
  is **no** standalone `GET /classes/:id/students` (the roster is embedded in class detail).
- `docs/flows/FLOW_ENROLLMENT.md` — supersede note at the top. Its 35 path references were **not**
  rewritten: that would have touched Student routes outside this change.
- `docs/api/modules/_INDEX.md` — fixed the stale *"No backend line has been written yet"* (untrue
  since PR #12), made the Admin-only scope explicit, added § 11 Teacher gap map with a
  dependency-ordered suggestion and the two things to settle first.
- Un-stale'd the FE docs the new endpoints contradicted: `teacher-lessons-list.md` (was "every
  action ⛔"), `teacher-flow.md` (branch + transitions 9–13 + gap table), `pages/_INDEX.md`
  (blocked-on columns, plus two prose lines still claiming Teacher areas were "not yet mapped"
  while the table right above listed all nine as built).

**Verification**: `node scripts/check-docs.mjs` → all 8 checks passed. No code touched, so no
build run — this is a docs-only change.

**Blocker / needs follow-up**:
- **Lesson row in `RBAC_MATRIX.md` / `PERMISSIONS_TEACHER.md`** — deliberately not done. It
  touches RBAC and was not in the approved scope; needs its own approval.
- `LESSON_*` codes are *proposed, not agreed* — a BE owner has to sign them off before code uses
  them. Same for the Lessons endpoints, which are not yet cross-checked.
- `FLOW_ENROLLMENT.md`'s 35 stale path references — own task.
- Teacher module specs (5 modules) — the real remaining work, see `PROGRESS.md`.

**Next steps**:
- Owner: approve the RBAC Lesson row, and decide whether to start Teacher module specs (the
  Classes+Lessons one first, as a format check, was offered and deferred).
