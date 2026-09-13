---
status: built
design_baseline: v1
route: /student/mistakes/review
last_updated: 2026-09-14
---
# Mistake practice — Page spec

> Paste with `_DESIGN-SYSTEM.md`. If you were not given it, stop and ask — do not invent tokens.

## 1. Purpose
Practice a frozen queue of real mistakes and persist each outcome.

## 2. Access
Student only; token-owned rows. Auth shell handles unauthenticated/foreign roles.
API forbids teacher/admin (403); foreign or missing review IDs share 404.

## 3. API mapping
GET `/api/v1/student/mistakes/review` → `data[]`: pending queue, maximum 50.
POST `/api/v1/student/mistakes/:id/review` → `data.correct/status/version/explanation`.
Body: version + recalled boolean for flashcard, or selectedOptions array for question.
400 VALIDATION_ERROR; 404 MISTAKE_NOT_FOUND; 409 MISTAKE_REVIEW_STALE.

## 4. Page structure
Back link, heading, progress, source prompt/audio, answer controls, feedback, next/finish.

## 5. Component specs
Compose existing Hán Lộ PageHead, Panel and buttons inside the student shell.
Long prompts wrap; audio is contained to card width; controls wrap at 375px.
No new palette, typography, modal or design-system component.

## 6. Data
Live test source: hanzi `认真学习`, pinyin `rèn zhēn xué xí`, meaning `học tập chăm chỉ`.
`sourceType`: flashcard | question; `status`: needs_review | reviewed.
Null audio/pinyin/meaning/lastReviewedAt are valid. Deleted source has available=false.
IDs and dates always come from API responses; samples never ship as fallback data.
Question options are {id,text}; no correctAnswer/key is returned in list or queue.

## 7. States
Loading: polite loading text. Ready: API content. Empty: successful zero response.
Partial: unavailable source note (review skips it). Error: retry panel.
Forbidden: auth shell/API denial. Offline: retry error, no stale/local completion.

## 8. Copy
“Ôn lỗi sai”, “Hiện nghĩa”, “Chưa nhớ”, “Đã nhớ”, “Kiểm tra”, “Tiếp tục”.
“Đúng — đã lưu trạng thái đã ôn.” / “Chưa đúng — nội dung vẫn cần ôn.”

## 9. Interactions
Native buttons/labels support keyboard. Accepted server responses drive changes.
Review uses a synchronous ref lock; errors require queue refresh before another submit.
Reload restores persisted notebook state. Pagination applies only to the list.

## 10. Do NOT
Do not copy flashcards, create mistakes from bookmarks, award XP or alter official scores.
Do not restore demo/localStorage mistakes. Do not expose pre-grade answer keys.

## Verification artifact
Existing student patterns were composed directly; no visual redesign or new mockup was commissioned.
Production render reviewed at 1280px and 375px through student-mistakes-live.spec.ts.
