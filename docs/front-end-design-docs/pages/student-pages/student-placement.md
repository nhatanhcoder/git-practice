---
feature: S-SELF-7
role: student
route: /student/placement
status: built (mock — ⛔ backend)
last_updated: 2026-09-12
---

# Page Contract — Student · Placement Test (S-SELF-7)

## Purpose
Let a new learner take a placement test that recommends a starting HSK level, then route them into the learning path at that level.

## Access
- Allowed roles: `student`
- Ownership rule: would be token-scoped; **no placement endpoints exist** (see Data)

## Entry points
- From: Student sidebar → "Kiểm tra xếp cấp" (in the mobile "Thêm" sheet); deep link `/student/placement`

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| ⛔ Start a placement session | none defined | — |
| ⛔ Submit placement answers | none defined | — |
| ⛔ Placement result / recommended level | none defined | — |

Blocked on: same as the mock-exam room — **ADR-005 is a 0-byte stub** (`DOC-017`), no transport contract for placement attempts (`API_STUDENT.md` § no-endpoint list), and the placement decision rule (how a recommended level is computed and whether it is advisory only) has never been settled. Recorded under "Needs from the other lane".

## Regions
1. Page Header: title "Kiểm tra xếp cấp"
2. Placement intro / entry card ("Bài kiểm tra xếp cấp")
3. (⛔ test flow) questions, navigation — mock only
4. (⛔ result) "Kết quả xếp cấp" with the recommended level — mock only

## States
- [x] Loading — skeleton
- [x] Ready — mock content (⛔ no live data)
- [x] Empty — N/A (placement content is static in the mock)
- [x] Partial — N/A (single dataset)
- [x] Error — load failure wording
- [x] Forbidden — handled by Student shell `RequireAuth`
- [x] Offline / stale — network error wording; no fallback fixtures (WEB-011 family)

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Start placement | entry card | ⛔ no contract — mock flow only | — |

## Out of scope
Official grades (placement is advisory self-placement until decided otherwise); teacher assignment of levels.
