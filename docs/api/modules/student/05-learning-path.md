---
status: implemented
last_updated: 2026-09-15
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
{slug,title,level,order,wordCount,state:locked|available|in_progress|completed}.
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
