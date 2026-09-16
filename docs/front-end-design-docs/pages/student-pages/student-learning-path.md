---
feature: S-SELF-1
role: student
route: /student/learning-path
status: built
last_updated: 2026-09-15
---
# Learning path
## Purpose
Choose an HSK vocabulary unit and resume server-owned progress.
## Access
Student own progress, role denied by shell/API.
## Entry
Dashboard/sidebar; URL ?curriculum=&level=&view=&page=.
## Data
GET /api/v1/student/learning-path -> data.units,total,completed,page,totalPages.
## Regions
Heading; curriculum+HSK filters; completion summary; map/list; pagination.
## States
Loading skeleton; ready map/list; empty catalog with vocabulary CTA; partial via pagination;
error with retry; forbidden via shell/API; offline error without cached completion.
## Actions
Filter -> URL and refetch. Available unit -> /student/learning-path/[nodeId].
Locked node -> explanatory disabled state (previous unit required). No XP purchase.
## Scope
Real hanlo_vocabulary first; two textbook curricula explicitly empty pending verified content.
Spec: ../../specs/student-pages/student-learning-path.spec.md.
