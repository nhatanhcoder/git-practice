---
feature: S-MSTK
role: student
route: /student/mistakes
status: built
last_updated: 2026-09-14
---
# Student mistake notebook
Task B includes real flashcard failures and graded wrong questions. Word bank is separate.
Data: GET /api/v1/student/mistakes?page=1&limit=20 (04-mistakes.md).
Student-only; token-owned rows. No create/delete control.
Regions: heading, review link, list with source/status, pagination.
States: loading message; ready list; empty after successful zero response; partial unavailable
source row; error with retry; forbidden through shell/API; offline as fetch error, no stale fallback.
Open review -> /student/mistakes/review.

Page spec: [layout and API mapping](../../specs/student-pages/student-mistakes.spec.md).
