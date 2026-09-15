---
feature: S-SELF-1
role: student
route: /student/learning-path/[nodeId]
status: built
last_updated: 2026-09-15
---
# Vocabulary unit
## Purpose
Study words, practice meanings, pass and continue to the next unit.
## Access
Student; locked unit 403, invalid/missing 404. No content rendered on denial.
## Data
GET /api/v1/student/learning-path/:slug -> unit,progress,quiz,nextSlug,result.
## Regions
Back link; title/status; start; study word; quiz; result and next action.
## States
Loading skeleton; ready stage; empty source -> not-found; partial saved progress;
error/retry; forbidden/locked; offline pauses saving and requires refetch.
## Actions
POST /:slug/start; /study {revision,index}; /answers {revision,index,choiceId};
 /complete {revision}. All HTTP200 data detail; server drives stage, score and unlock.
LEARNING_UNIT_NOT_FOUND/LOCKED/PROGRESS_CONFLICT/STEP_INVALID; VALIDATION_ERROR.
## Scope
No official grade, XP, fabricated audio or local progress. Correctness server-side.
Spec: ../../specs/student-pages/student-learning-path-node.spec.md.
