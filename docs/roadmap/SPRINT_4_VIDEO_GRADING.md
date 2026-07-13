# Sprint 4 — Video Grading

**Duration**: 2 weeks  
**Goal**: Teacher can grade submissions with AI assist. Video submissions upload + expire.

---

## Deliverables

- [ ] Grading queue: teacher sees submitted attempts
- [ ] Attempt review: per-question answer view
- [ ] AI suggest score (Gemini API) for writing questions
- [ ] Teacher: enter score + feedback per question
- [ ] Notification: `graded` to student
- [ ] Mock test: countdown timer + auto-submit
- [ ] Video recording (MediaRecorder API)
- [ ] Video upload to Cloudflare R2
- [ ] videoExpiresAt field + cleanup cron job
- [ ] Student: view result + feedback after graded
- [ ] Analytics: heatmap, progress chart

## Dependencies

- Sprint 2 (assignments, attempts)
- Gemini API key in .env
- Cloudflare R2 bucket setup
