---
status: built
design_baseline: v1
route: /student/leaderboard
last_updated: 2026-09-16
---

# Student Leaderboard — Page Spec

Student-only live view of `GET /student/leaderboard`. Lead with the caller's eligibility/rank,
then show one semantic ranking table/card list: rank, stable alias, normalized score and official
graded-attempt count. Mark the caller with text, not colour alone. Explain that aliases protect
identity and that three attempts are required. Loading, ready, empty, partial, error, forbidden and
offline states must never fall back to rivals or XP fixtures. At 375px rows become cards without
horizontal overflow. No podium avatars, names, profile links, metric tabs, XP, streak or retention.
