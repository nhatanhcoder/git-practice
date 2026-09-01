## [2026-08-28] — Build first four Student mockup pages — opencode

**Done**:
- Built the Student prototype per `docs/prompts/student-product/00-build-first-four-pages-ui-ux-pro-max.md` (mockup mode — no contracts, no backend, local mock data):
  - `/student` — dashboard: greeting, Tiếp tục học CTA, XP/rank, streak, daily goal, interactive HSK 1–9 level strip + detail drawer, Ôn hôm nay queue (expandable cards + start-review demo), recent activity, quick links.
  - `/student/learning-path` — curriculum switcher (HSK Standard Course / Giáo trình Hán ngữ), HSK 1–9 selector, Map/List toggle, RPG node map (lesson / side-quest / boss) with completed/current/available/locked states, node drawer, **force-unlock demo costing 100 XP** (zustand XP store shared with dashboard), designed empty state for Han Yu levels 7–9.
  - `/student/grammar` — search + HSK level + category filters (URL-synced), mastery summary ring, grammar card grid, detail drawer with formula/examples/audio placeholders + 5 exercise mini-demos (MCQ, fill, click-to-reorder, match pairs, Speed Reflex — all interactive).
  - `/student/foundation` — 5 URL-synced tabs: Pinyin (21 initials + 36 finals, IPA, audio placeholders, tips), Tones (4 contour-SVG cards + 4 sandhi rules), Radicals (**all 214 Kangxi radicals**, search + stroke filter + drawer with curated example words), Listening & Speaking practice cards with play/record placeholder state machines, 4 PDF download cards (fake download with states).
  - Student shell: desktop sidebar, mobile header + bottom nav + menu sheet, nav covers all 9 IA areas (5 stub "Sắp ra mắt" pages), XP/streak chips.
  - Design system: `.student-root` scoped tokens in `student.css`, tailwind `sp-*` palette; fonts Nunito + DM Sans; palette indigo #4F46E5 / orange #EA580C (ui-ux-pro-max typography result 3 "fintech gamification" + color "Educational App" — style search had no exact match, synthesized soft-rounded direction). Icons: lucide only. Reduced-motion, focus-visible, aria labels, 375px→1440px responsive.
  - Every page has a Demo-state switcher (Ready/Loading/Empty/Error).
- `radicals-data.ts`: 214 Kangxi radicals extracted from Wikipedia (delegated agent), verified sequential 1–214, spot-checked #30/61/85/96/140/149/167/214.
- Fixed pre-existing `pnpm check:docs` failures in the uncommitted `docs/front-end-design-docs/STUDENT_UI_UX.md` (flashcard endpoints lacked `/student` prefix → mismatched `API_STUDENT.md`; dashboard-gap wording tripped the endpoint regex). All 8 checks now pass.

**In progress** (and why it's unfinished):
- Mockup only — 5 stub routes (workplace, exams, mistakes, writing, leaderboard) and Character Writing / Lego Word Order not started.

**Contract/temporary decisions to preserve**:
- Mockup mode per `docs/prompts/student-product/` — fresh visual system allowed, local mock data, NO Page Contracts/backend/auth for this prototype. The `sp-*` tokens bypass `root-design-fe.md` deliberately and stay until the human decides what graduates.
- XP lives in a local zustand store (`src/lib/student/store.ts`) so dashboard + learning-path share the 100-XP force-unlock demo.

**Needs from the other lane**:
- None — frontend-only, no API calls anywhere.

**Blocker / needs follow-up**:
- Changes not committed (human did not ask). Working tree also carries pre-existing uncommitted work: branch `docs/adr-011-015` has ADR-011 (Proposed) + ADR-015 (Accepted) + PROGRESS/README edits; untracked: `docs/prompts/`, `hsk-learning-ia` skill, `STUDENT_UI_UX.md`, `_to_delete/`, `_backup/`, `finish-pull.ps1`.
- No screenshots captured this session (no browser tooling); verify visually via `pnpm --filter web dev` → `/student`.

**Next steps**:
- Human review of the four pages (Vietnamese copy, palette, interactions).
- Continue mockup build order: Character Writing → Mistake Notebook/SRS → CBT Exam Room.
