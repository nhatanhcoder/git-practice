---
status: built
design_baseline: v1
last_updated: 2026-09-26
---
# Student grammar library — page spec

> Paste with `_DESIGN-SYSTEM.md`. If you were not given it, stop and ask — do not invent tokens.

## 1 Purpose
Let a student browse and practise the published HSK 1–9 grammar catalog, or narrow it to grammar points attached by teachers to lessons in the student's active classes.

## 2 Access
Student only. Catalog progress belongs only to the caller. `assignedOnly=true` is resolved server-side from active enrollments; the client never infers class membership or slices one page of results.

## 3 API mapping
| Region/action | Method + path | Envelope | Errors |
|---|---|---|---|
| Catalog and all filters | `GET /student/grammar?hskLevel=&category=&search=&assignedOnly=&page=&limit=` | `data[]` + `meta` | `VALIDATION_ERROR` |
| Point detail/deep link | `GET /student/grammar/:id` | `data` | `GRAMMAR_NOT_FOUND` |
| Personal progress | `GET /student/grammar/progress` | `data.studied[]`, `data.practice[]` | authenticated read errors |
| Mark studied | `PUT /student/grammar/progress` | `data` | `GRAMMAR_NOT_FOUND`, `VALIDATION_ERROR` |
| Reorder practice | `GET/POST /student/grammar/:id/practice` | `data` | `GRAMMAR_NOT_FOUND`, `GRAMMAR_PRACTICE_CONFLICT` |

## 4 Page structure
Heading, private progress summary, search, HSK level, grammar category and source filters, paginated cards, detail drawer and reorder-practice modal. Assigned mode does not become a separate catalog or duplicate page.

## 5 Component specs
The source filter uses two existing `pill` buttons: “Tất cả” and “Giáo viên giao”. It composes with every other filter and writes `assignedOnly=true` to the URL. The assigned-empty state provides a one-click return to the full catalog.

## 6 Data
```json
{
  "data": [{ "id": "g-hsk1-ma", "level": 1, "category": "Câu hỏi", "name": "Trợ từ 吗", "formula": "S + 吗？", "hanzi": "你好吗？", "pinyin": "Nǐ hǎo ma?", "vi": "Bạn khỏe không?", "note": "Đặt cuối câu hỏi.", "key": "ma", "frequency": "high" }],
  "meta": { "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
}
```
An assigned query may validly return `data: []` with zero totals. Progress may fail independently and is then unknown, never zero.

## 7 States
Loading keeps a regional skeleton. Ready renders server-confirmed content. Generic Empty explains that filters have no match; assigned Empty says no active-class teacher has assigned grammar. Partial keeps the catalog usable when progress fails. Error retries without mock data. Forbidden redirects through the existing auth handling. Offline is the same recoverable read error and does not replay mutations.

## 8 Copy
“Nguồn”, “Tất cả”, “Giáo viên giao”, “Chưa có điểm ngữ pháp được giao”, “Giáo viên của các lớp bạn đang học chưa gắn điểm ngữ pháp nào.”, “Xem tất cả điểm ngữ pháp”.

## 9 Interactions
Filters reset pagination and are restorable through URL/back/forward. `?point=:id` opens the detail drawer directly; closing it removes only `point` and preserves filters. A stale list or detail response cannot repaint a newer selection. Keyboard focus follows the existing drawer and modal behavior.

## 10 Do not
Do not filter assigned points client-side, include dropped classes, create a teacher-progress view, fabricate mastery/XP, or treat an empty assigned result as an error.
