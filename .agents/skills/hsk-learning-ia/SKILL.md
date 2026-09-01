---
name: hsk-learning-ia
description: Information architecture, content structure and navigation flows for the HSK Student learning product. Use when designing, building, reviewing or changing learning paths, lesson hubs, grammar, foundation, exams, SRS, writing or workplace learning flows. Do not use for Admin UI, backend-only work or marketing landing pages.
---

# HSK Learning IA

This skill defines how learners move from the Student Dashboard to HSK content, practice and results. It applies to both frontend mockups and production implementation: mockups use local mock data, while production work connects to the project's APIs.

## Product facts

- HSK levels: **1–9**. Never use 1–6.
- Two curricula: `hsk_standard_course` (15 lessons/level) and `han_yu_jiao_cheng` (6 books/51 lessons).
- Student learning areas: Dashboard, Learning Path, Grammar, Foundation, Workplace, HSK Exams, Mistake Notebook/SRS, Lego Word Order, Character Writing, Leaderboard/Streak/Badges.
- Do not create IA, routes, navigation items or CTAs for Music/Karaoke, PK Arena or AI Mentor/Tiểu Long.
- Default UI copy is Vietnamese; Hanzi/Pinyin are learning content.

## Six IA rules

### 1. Two clicks to a learning action

From `/student`, the learner must reach a screen with a start/continue-learning CTA within two clicks. Put level, curriculum and mode choices in selectors/tabs on the hub instead of intermediary pages that only contain one choice.

### 2. Every meaningful state has a URL

Clicking a module or lesson should navigate to a bookmarkable, shareable, back-navigable route. Use modals/drawers only for previews, quick details or confirmation; never make a modal the required step for choosing a primary branch.

### 3. Distinguish study, practice and exam

Use consistent Vietnamese labels: `Học bài`, `Luyện tập`, and `Thi thử`/`Thi HSK` depending on context. Each mode must make the following clear:

| Mode | Timer | Feedback | Progress |
|---|---|---|---|
| Học bài | Not required | During the lesson | Yes |
| Luyện tập | None or light timer | After each question/section | Yes |
| Thi HSK | Yes, authoritative | After submission | Counts toward score/high score |

Do not use `Thi thật` for a mockup that does not have CBT behavior. Do not call a practice activity `Exam` merely because it contains questions.

### 4. Every content hub has a primary axis and useful filters

Choose one primary structure for each hub; make the other dimensions filters:

- Learning Path: curriculum → HSK level → node sequence.
- Grammar: HSK level → category/search.
- Foundation: module tab → item type.
- Exams: HSK level → exam/set → section.
- Mistakes: due/scheduled/learned status → HSK level/source.
- Writing: character list → HSK level/radical/search.
- Workplace: scenario category → difficulty.

Do not mix multiple equal-level structures in a way that makes the page feel like unrelated modules pasted together.

### 5. Back navigation is predictable

Hub-level pages use `← Quay lại Dashboard` or another consistent parent label. Lesson-level pages use `← Quay lại <hub name>`. Browser back must work; never create a dead end after completing a lesson.

### 6. Progress must close the loop

Every learning unit must define:

1. What the learner completes and how long it takes.
2. Which state the UI displays: not started, in progress, completed, mastery or score.
3. What the next CTA is after completion.

Results must lead to exactly one primary action: continue the lesson, practice a weak area, review mistakes or start an exam.

## Standard Student shell

Navigation should include: Dashboard, Learning Path, Grammar, Foundation, Workplace, Exams, Mistakes, Writing and Progress/Leaderboard. On mobile, use a compact header plus bottom navigation or a menu sheet. Do not add removed features.

The Dashboard should prioritize `Tiếp tục học`, `Ôn hôm nay`, HSK 1–9 level progress, XP/streak and learning progress. It must not become an admin KPI dashboard.

## Learning unit template

Each card/lesson/scenario/exam should include: name, curriculum/source, HSK level, what it contains, estimated duration, personal state, progress/score and the appropriate CTA. Do not use a card that only says `Lesson 1` or `Test 1` without explaining what the learner will do.

## HSK-specific routing patterns

```text
/student
/student/learning-path?curriculum=hsk_standard_course&level=1
/student/grammar?level=1&category=...
/student/foundation?tab=pinyin
/student/workplace?category=...
/student/exams?level=1
/student/mistakes?status=due&level=1
/student/writing?level=1&radical=...
/student/leaderboard?level=1
```

Use query parameters for reversible filters and tabs. Use path segments for entities that need a stable detail page, such as `/student/grammar/[grammarId]` or `/student/exams/[examId]`.

## Mockup mode vs implementation mode

### Mockup mode

Use when the user wants to inspect a new design. Do not require flow-mapper, Page Contracts, backend, APIs, databases, auth or RBAC. Use realistic local mock data and local state. Make filters, tabs, drawers, progress, audio placeholders and navigation clickable. Use `ui-ux-pro-max` freely for visual direction.

### Implementation mode

Use when the user explicitly asks for production functionality. Read the project rules and relevant contracts, define exact data/API behavior, preserve the same IA rules, and enforce student ownership/RBAC in the service layer. Do not silently turn a mockup request into backend work.

## Review checklist

- HSK 1–9 appears consistently; there is no hardcoded 1–6 selector.
- Removed features do not appear in navigation or cross-links.
- Dashboard → learning action takes at most two clicks.
- Main branches have real URLs and usable browser back behavior.
- Mode names and behavior are not misleading.
- Each hub has one clear primary axis and useful filters.
- Every unit shows what it contains, estimated duration, state and next action.
- Empty, loading and error states explain what the learner can do next.
- Mobile layout preserves navigation, CTA visibility and readable content.
- No emoji is used as a structural navigation icon.
