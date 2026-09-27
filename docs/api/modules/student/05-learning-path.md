---
status: implemented
last_updated: 2026-09-20
---
# S-SELF-1 — Vocabulary learning path
## 0. Approval and boundaries
Owner approved catalog/progress schema and student-owned API, then selected real vocabulary first.
Curriculum hanlo_vocabulary uses only the approved A11 writing.json words and extraction policy.
hsk_standard_course and han_yu_jiao_cheng return an honest empty catalog; no textbook content is fabricated.
## 1. Storage
Mongo learning_units: immutable published vocabulary snapshots (source SHA256, ordered words).
Mongo user_learning_progress: unique (userId, unitSlug), optimistic revision, studyIndex,
answers in word order, bestScore, lastScore, status, startedAt, completedAt.
See ENTITY_LEARNING_UNIT and ENTITY_USER_LEARNING_PROGRESS.
## 2. Catalog publishing
CLI learning-path-import.ts dry-runs by default; --apply creates missing units only.
Reuse extractVocabulary (lowest HSK level then source order), group 8 words per unit, merge a
one-word tail into the preceding unit. Sort hanzi with binary string comparison, per level 1–9.
Slugs hanlo-v1-hsk-N-unit-M. Existing mismatched content aborts before writes; never replace
content behind recorded progress. New curriculum revisions require a separate explicit rollout.
Source snapshots are vocabulary content, never new Flashcard rows or private teacher questions.
## 3. Transport
All paths under /api/v1/student/learning-path; all success responses wrapped in data.
GET ?curriculum=hanlo_vocabulary&level=1&page=1 (page size 12):
{curriculum,level,units,total,completed,page,totalPages}. Unit summary:
{slug,title,level,order,wordCount,state:locked|available|in_progress|completed|unavailable}.
`unavailable` is emitted only for a published reference node whose source is no longer visible;
the node stays in the ordered catalog and its detail endpoint returns `LEARNING_UNIT_NOT_FOUND`.
GET /:slug: {unit:{slug,title,level,order,words:[{hanzi,pinyin,meaning}]},
progress:null|{status,studyIndex,answers:string[],revision,bestScore,lastScore,completedAt},
quiz:[{prompt,options:[{id,text}]}],nextSlug,result:null|{score,total,passed,feedback:[{hanzi,meaning,correct}]} }.
GET locked unit returns 403 without words/quiz. Invalid/unpublished slug returns 404.
POST /:slug/start -> detail, HTTP 200; idempotent create or existing progress.
POST /:slug/study {revision,index} -> detail, HTTP 200; index must equal saved studyIndex.
POST /:slug/answers {revision,index,choiceId} -> detail, HTTP 200; all words studied first.
POST /:slug/complete {revision} -> detail, HTTP 200; all answers required, server grading.
No userId/status/score/unlock field accepted in any request.
## 4. Invariants
LP-01: student-only/token-owned; no cross-user private state.
LP-02: first unit of each level available; later unit requires previous published unit completed.
LP-03: GET never creates progress. Concurrent start produces one row.
LP-04: study advances one word per accepted revision; cannot skip forward.
LP-05: answers persist on server, accepted choices must be in the generated question options.
LP-06: only server score >= ceil(0.8 * wordCount) completes; failure remains in_progress.
LP-07: stale revision/concurrent saves cannot overwrite a newer state or duplicate completion.
LP-08: completion never downgrades, bestScore never decreases; next unit unlocks on success.
LP-09: no client key/score accepted; correct choice IDs are opaque per unit/question/meaning.
LP-10: textbook curricula and absent levels return empty, never generated mock lessons.
LP-11: immutable publication is idempotent; no SRS/Flashcard/official Attempt writes.
LP-12: production deep links, reload, URL filters and error states use real API only.
## 5. Access
Student own only. Teacher/admin 403 via existing roles guard. No Auth changes.
## 6. States
Absent -> in_progress -> completed. Failed assessment remains in_progress.
Completed progress cannot be edited; start can read it idempotently. No XP unlock.
## 7. Assessment
Study is acknowledgment, not proof of reading. Practice is untimed/open-book; not an exam.
Each question asks the meaning of one Hanzi. Options deduplicate equal meanings, have opaque
deterministic IDs and deterministic mixed order. Server recomputes correctness.
## 8. Concurrency
Every mutation except idempotent start matches revision/status atomically and increments revision.
A response failure requires GET before retry. Unique progress index handles racing starts.
## 9. Errors
LEARNING_UNIT_NOT_FOUND 404; LEARNING_UNIT_LOCKED 403; LEARNING_PROGRESS_CONFLICT 409;
LEARNING_STEP_INVALID 400; existing VALIDATION_ERROR/auth codes unchanged.
## 10. Side effects
Only progress and explicit catalog publication; no XP, SRS, enrollment, grades, notifications.
## 11. Pagination
12 units/page, totals from the selected level/catalog. Counts include all pages.
## 12. Rollout
Build API; run importer dry-run then --apply on intended dev DB; no startup auto-seed.
Only fully published snapshots visible. A partial failed import is repaired by rerun.
## 13. Security
Do not expose locked content. Query/payload cannot select another user. No HTML from snapshots.
## 14. Observability
Propagate DB errors, no mock fallback; log aggregate import counts without credentials.
## 15. Verification
Three independent real-DB lifecycle rounds and three production browser rounds:
learn/save/reload/complete, failure/stale/duplicate, isolation/locked/deleted/offline, desktop+375px.
## 16. Limits
HSK bands inherited from approved source, not a claim of official curriculum alignment.
No grammar/audio invented. No textbook publication or global personal-level gating in this slice.

## 17. Addendum — teacher-authored paths share this contract (added 2026-09-19)

[ADR-017](../../../shared/decisions/017-teacher-authored-learning-catalog.md) lets a teacher author a
learning path and publish its units once an admin has approved the path. Those units enter **this**
catalog; they do not get a second contract, a second progress store or a second quiz format.

**Nothing in §0–§16 changes.** `?curriculum=` still defaults to `hanlo_vocabulary`, every existing
response shape stays byte-identical, and the 12 invariants above apply to a teacher unit exactly as
they apply to a corpus unit. What is added:

- `GET /api/v1/student/learning-path/curricula` — the curricula a student may browse: the built-in
  `hanlo_vocabulary` plus every **approved** teacher path. Additive endpoint; the catalog and
  progress endpoints are untouched.
- Visibility is `path.status = approved` **and** `unit.published = true`. A `suspended` path and its
  units leave the catalog under the same rule as an unpublished unit — LP-10 already states that an
  absent catalog returns empty, never generated content, and this is the same situation.
- A lesson whose **referenced** source unit has been unpublished renders as an honest unavailable
  node (`state: "unavailable"`, `wordCount: 0`); it is never silently dropped. Its detail endpoint
  returns `LEARNING_UNIT_NOT_FOUND`. This follows `WEB-011`'s lesson: the screen must be able to say
  it cannot show something.
- Unlock order stays LP-02 (first unit of a level available, later units need the previous one
  completed). Teacher paths do not get a free-order mode.
- Suspend or unpublish hides content and **never** deletes `user_learning_progress`. Restoring the
  path shows the student the same state as before, because progress is keyed by `unitSlug` and the
  slug of a published unit never changes.

New errors raised by these paths are the authoring/moderation family in §9 of
[teacher 07](../teacher/07-learning-catalog.md) and
[admin 09](../09-learning-catalog-moderation.md); no student-facing code is added to §9 above.
