# Build Prompt — First Four New-Design Mockup Pages

Read `docs/prompts/student-product/00-project-master-prompt.md`, then design and code all four pages below as one coherent frontend prototype. This is a new design from scratch.

Do not follow the repository's backend workflow. Do not create Page Contracts, backend routes, database schemas, migrations, auth or RBAC. Use local mock data and local state. Use `ui-ux-pro-max` freely, including its palette and typography if they suit the prototype.

## Pages

### Student Dashboard — `/student`

Create a motivating home base. Include a greeting and current HSK level, XP/rank card, streak card, level progress from HSK 1–9, a prominent Continue Learning action, today's review queue, recent activity and quick links to Grammar, Foundation, Learning Path and Exams. Add interactions for selecting an HSK level, continuing a lesson and opening detail panels.

### HSK Learning Path — `/student/learning-path`

Create the main RPG-style curriculum screen. Include curriculum switcher (`HSK Standard Course`, `Giáo trình Hán ngữ`), HSK 1–9 selector, Map/List toggle, connected lesson nodes, side quests and raid boss nodes. Show completed, current, available and locked states, XP rewards, a node detail drawer and a local demo force-unlock interaction costing 100 XP. Make the map visually legible on mobile.

### Grammar Library — `/student/grammar`

Create a searchable learning library. Include HSK 1–9 filter, category filter, search, mastery summary, grammar cards and a detail drawer. Each card shows formula, Hanzi example, Pinyin, Vietnamese translation, audio control and mastery. Add an exercise preview with tabs or a modal for multiple choice, fill blank, reorder, matching and Speed Reflex.

### Foundation — `/student/foundation`

Create a foundation hub with tabs for Pinyin, Tones, Radicals, Listening and Speaking. Pinyin must show 21 initials and 36 finals with IPA/audio states. Tones show four tone cards and tone-sandhi examples. Radicals show a searchable 214-radical browser. Listening and Speaking show practice cards with play/record placeholder states. Include four PDF download cards and mastery progress.

## Final acceptance

All four routes must be reachable, use the same design system, work with mock data, and feel like a real product when clicked through. Include mobile navigation, hover/pressed/selected states, empty/error demo states and a clear way back to the dashboard. Do not add Music/Karaoke, PK Arena or AI Mentor UI.
