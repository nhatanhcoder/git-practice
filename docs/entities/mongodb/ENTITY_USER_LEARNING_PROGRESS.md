---
status: implemented
last_updated: 2026-09-15
---
# UserLearningProgress — Mongo user_learning_progress
Unique (userId,unitSlug). userId is authenticated student UUID, unitSlug published catalog slug.
status in_progress|completed; studyIndex integer number of acknowledged words; answers string[]
(in unit word order, empty strings unanswered); revision positive integer; bestScore integer default0;
lastScore integer|null; startedAt Date; completedAt Date|null; createdAt/updatedAt Date.
Only server grades. Student can save current study acknowledgment or a valid quiz choice.
All writes revision checked. Completion monotonic. No linkage to official Attempt or SM-2.
