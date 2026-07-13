# Sprint 5 — Testing & Polish

**Duration**: 2 weeks  
**Goal**: All core flows tested, UI polished, production deploy.

---

## Deliverables

- [ ] Unit tests: auth service, SRS algorithm, grading service
- [ ] Integration tests: enrollment flow, assignment lifecycle, payroll cycle
- [ ] E2E tests (Playwright): student completes mock test
- [ ] UI polish: responsive design, loading states, error handling
- [ ] Notification bell + real-time updates (polling or SSE)
- [ ] Admin dashboard charts
- [ ] Performance: Prisma query optimization, MongoDB indexes
- [ ] Security audit: CORS, rate limiting, input sanitization
- [ ] Production deploy: Vercel (FE) + Railway (BE) + Supabase + MongoDB Atlas

## Acceptance Criteria

- Coverage >= 70% for services
- E2E: student can join class → take mock test → view result
- All 3 actors can complete core workflows without bugs
