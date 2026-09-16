---
feature: S-MSTK
role: student
route: /student/mistakes/review
status: built
last_updated: 2026-09-14
---
# Student mistake practice
Production route, student own mistakes. GET /api/v1/student/mistakes/review freezes up to 50
pending items for this session. POST /api/v1/student/mistakes/:id/review with version and
recalled (flashcard) or selectedOptions (question), as defined in 04-mistakes.md.
Regions: progress, prompt/audio/options or recall reveal, server feedback, next/finish.
States: loading; ready; empty when none pending; partial unavailable sources skipped with notice;
error with retry; forbidden; offline error without local progress writes.
Submit lock prevents double-click; 409 refreshes session; no XP or localStorage state.

Page spec: [layout and API mapping](../../specs/student-pages/student-mistakes-review.spec.md).
