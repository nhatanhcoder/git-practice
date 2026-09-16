---
status: built
design_baseline: v1
route: /student/progress
last_updated: 2026-09-16
---

# Student Progress — Page Spec

## Purpose and access

Give a signed-in student an honest view of their own graded-attempt history. The page never accepts a user id and never shows peer, XP, streak, rank or badge data.

## API mapping

| Region | Method + path | Envelope |
|---|---|---|
| Totals, heatmap, skills | GET `/student/progress` | `data.totals`, `data.heatmap[]`, `data.skillBreakdown` |
| Score series | GET `/student/progress/chart` | `data.points[]` |

## Structure and interaction

Header explains the UTC week boundary; three factual totals; semantic skill×week table; three labelled skill bars; twelve-week chart with a button that exposes the same values as a table. Colour supports the printed percentage and is never the only signal.

## Seven states

Loading uses a skeleton. Ready shows both responses. Empty explains that a teacher must grade a first attempt. Partial renders missing values as `—`. Error and offline discard stale values and offer retry. Forbidden renders an explicit access message; the student shell also enforces the route role.

## Responsive and accessibility

At 375px metrics and content collapse to one column; wide data tables scroll inside their panel without widening the page. Controls meet the shared button target, tables use row/column headers, and the chart has a textual table alternative.

## Do not

Do not add fixture fallbacks, infer zero from no data, expose question content or answer keys, normalize scores beyond the accepted API response, or restore mock gamification figures.
