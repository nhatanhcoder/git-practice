---
feature: S-SELF-2, S-SELF-9
role: student
route: /student/foundation
status: built
approval: proposed
last_updated: 2026-09-16
---
# Page Contract — Student · Foundation
## Purpose
Study pronunciation, tones and radicals, with honest media availability and private study state.
Backend live since 2026-09-16 (catalog + studied-state); audio/PDF intentionally have no
backend (D4) and stay visibly unavailable.
## Access
- Allowed roles: student; existing Student shell, no new Auth/RBAC behavior.
- Ownership: only current learner's progress; catalog published/read-only per existing RBAC.
- On denial: existing shell handling; no private data or fallback demo.
## Entry points
- Student navigation → Foundation; deep link `/student/foundation?tab=pinyin`.
- URL tab choice restores on reload/back; proposed item selection stays inside this hub.

## Data
| Need | Endpoint | Envelope field |
|---|---|---|
| Published groups/items | `GET /student/foundation` (live 2026-09-16) | `data.revision` + `data.groups` (8 groups, §3) |
| Own study state | `GET /student/foundation/progress` (live) | `data.studied[]` (`kind/key/studied/updatedAt`; readers filter `studied === true`) |
| Save study state | `PUT /student/foundation/progress` (live) | body `kind/key/studied` → `data` saved record; `VALIDATION_ERROR` on unknown kind/key |
| Audio/PDF | NONE (D4 — no licensed assets) | controls render unavailable with reason, never a fake download |
Media/progress failures must not hide readable catalog content (separable reads).

## Regions
1. Title, return-to-Dashboard action, clear study-state summary if available.
2. Pinyin / tones / radicals / listening / speaking tabs; selected tab in URL.
3. Sound/rule cards or searchable, stroke-filtered radicals; detail and study action.
4. Listening transcript, speaking prompt and explicitly available media controls.
5. PDF resources; missing files show unavailable, not a fake download.

## States
- [ ] Loading — independent content/progress skeletons.
- [ ] Ready — published content; private state only when known.
- [ ] Empty — no published items or no filter matches; explain/reset filters.
- [ ] Partial — content usable when progress/media unavailable; no fabricated numbers.
- [ ] Error — content retry; failed save retains prior state and local draft.
- [ ] Forbidden — existing shell/denied state; no content leakage.
- [ ] Offline / stale — explicit failure, no queued writes or fallback fixtures.

## Actions
| Action | Trigger | Result | Error code |
|---|---|---|---|
| Choose tab/filter | tabs/search/strokes/page | catalog already loaded; URL/back restore | — (local read) |
| Inspect item | card | same-screen detail from loaded catalog | — |
| Mark/unmark studied | explicit control | F-save; UI changes after confirmation | `VALIDATION_ERROR` |
| Play/download | no verified asset exists | control unavailable with reason | — (no endpoint by design) |
| Record/playback | explicit permission, after D4 | local session only, no assessment | permission/unavailable message |
| Retry/return | retry or Dashboard link | retry failed read only / `/student` | existing handling |

## Out of scope
Cloud voice upload/scoring, XP/streak, official grades, SRS mutation and catalog authoring.
