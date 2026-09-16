---
status: built
design_baseline: v1
route: /student/badges
last_updated: 2026-09-16
---

# Student Attempt Badges — Page Spec

Student-only live view of `GET /student/badges`. Show earned count, all/earned/locked filters and
the four fixed server-computed badges. Each card contains title, condition, current/target progress,
earned/locked text and earned date when present. Loading, ready, zero-earned empty, partial, error,
forbidden and offline states use no fixture fallback. Cards stack at 375px. The client may filter
the returned catalog but never computes unlocks or writes progress. No XP rewards, rarity, streak,
vocabulary, community or content badges.
