---
status: built
design_baseline: v1
last_updated: 2026-09-15
---
# Learning path — page spec
> Paste with _DESIGN-SYSTEM.md. If absent, stop; do not invent tokens.
## 1 Purpose
Find the next vocabulary unit at the chosen HSK level.
## 2 Access
Student only; server-owned progress and prerequisite enforcement.
## 3 API mapping
GET /student/learning-path?curriculum=&level=&page= returns data catalog summary.
Errors from module 05-learning-path; mutations require revision and exact DTO fields.
## 4 Structure
Heading, selectors, progress panel, map/list toggle, unit trail and pagination.
## 5 Components
Reuse the existing Hán Lộ prototype map/node as visual reference, Panel, Chip, Bar, PageHead,
SkeletonPanel and buttons. No new shell, palette or font. Map becomes one column at375px.
## 6 Data
Approved source words (hanzi/pinyin/meaning), nullable progress/result, four node states:
locked/available/in_progress/completed. Empty textbook catalogs have no unit data.
No fabricated metrics, duration or XP. Exact count of words from unit snapshot.
## 7 States
Loading skeleton; ready; successful empty; partial pages/saved stage; error retry;
forbidden or locked message; offline error with refetch before further writes.
## 8 Copy
“Lộ trình từ vựng”, “Từ vựng Hán Lộ”, “Chưa có nội dung giáo trình”, “Học bài”,
“Tiếp tục học”, “Đã học từ này”, “Lưu câu trả lời”, “Kiểm tra kết quả”, “Học bài tiếp theo”.
## 9 Interactions
URL filters restore on back/forward. Native controls with permanent labels and visible focus.
Mutation ref lock, disabled pending controls, error recovery via GET; no blind POST replay.
Study -> practice -> server result -> next. Failed result provides feedback and retry.
## 10 Do not
No mock/prototype progress in production, no guessed textbook mapping, no XP-based unlock.
## Visual reference
Reuse the pre-existing map/list and three-step lesson mockups in the two route pages.
Preserve Hán Lộ components; screenshots of the connected production UI verify the adaptation.
