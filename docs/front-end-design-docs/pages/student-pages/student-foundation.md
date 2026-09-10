---
feature: S-SELF-2, S-SELF-9
role: student
route: /student/foundation
status: contracted
approval: proposed
last_updated: 2026-09-10
---
# Page Contract — Student · Foundation
## Purpose
Study pronunciation, tones and radicals, with honest media availability and private study state.
This contract is proposed/blocked; production backend is NOT IMPLEMENTED.
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
| Published groups/items | ⛔ F-read, path missing | ⛔ DTO missing |
| Own study state | ⛔ F-progress, path missing | ⛔ DTO missing |
| Save study state | ⛔ F-save, path/body missing | ⛔ DTO missing |
| Audio/PDF | ⛔ M-read, delivery missing | ⛔ resource fields missing |
Blocked on: [module decisions D1–D5](../../../api/modules/student/02-foundation-grammar.md); DOC-011/CR-3.

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
| Choose tab/filter | tabs/search/strokes/page | F-read if needed; URL/back restore | ⛔ TODO(error-code) |
| Inspect item | card | same-screen detail; F-read if needed | ⛔ TODO(error-code) |
| Mark/unmark studied | explicit control | F-save; UI changes after confirmation | ⛔ TODO(error-code) |
| Play/download | verified asset only | M-read/resource; failure shown | ⛔ TODO(error-code) |
| Record/playback | explicit permission, after D4 | local session only, no assessment | permission/unavailable message |
| Retry/return | retry or Dashboard link | retry failed read only / `/student` | existing handling |

## Out of scope
Cloud voice upload/scoring, XP/streak, official grades, SRS mutation and catalog authoring.
