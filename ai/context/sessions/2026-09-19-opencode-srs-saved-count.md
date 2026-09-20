## [2026-09-19] — SRS reviewed-saved-words count — opencode — branch `feat/srs-saved-review-count`

**Ask**: count reviewed words based on total saved words. Delivered as additive
`savedWords` + `reviewedSavedWords` on `GET /student/flashcards/stats` (INV-SRS-13)
plus an "Đã ôn X/Y" tile on the flashcards page. Dashboard tiles untouched.

**Design**: saved hanzi joined to review states through the catalog; saved hanzi
with no catalog card counts as saved, never reviewed. No schema change, no new
routes, no Auth/RBAC/money impact.

**Verification**: api build · 7/7 SRS e2e · word-bank + flow suites green · web
build + type-check · 238/238 unit · eslint · check-docs 9/9 · live browser tile
2/2 viewports (temp spec, removed after).

**Incident — teardown "hang", root-caused**: the e2e file stopped exiting after
my change. Full investigation (DB locks: none; pool: fine; standalone deletes:
fast; live-handle dump) ended at the complete log: `PrismaClientValidationError:
Unknown argument '$in'` in `after()` — a Mongo operator typo in a Prisma call,
introduced while editing teardown. The throw skipped `app.close()`, leaving the
server + pools open so the process lived forever. Fixed (`in`), bank cleanup
restored, exits clean. Lessons: read FULL failure logs, never tail-only; keep
edits minimal around unfamiliar syntax.
