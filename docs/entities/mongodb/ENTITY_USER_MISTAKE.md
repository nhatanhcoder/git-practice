# ENTITY_USER_MISTAKE
> Status: ✅ Approved for Task B, 2026-09-13
> DB: MongoDB, collection user_mistakes

| Field | Type | Meaning |
|---|---|---|
| userId | string | authenticated student UUID |
| sourceType | flashcard or question | source collection |
| sourceId | string | existing source ObjectId |
| eventAt | Date | latest captured real failure timestamp |
| status | needs_review or reviewed | notebook practice state |
| version | integer | optimistic concurrency revision |
| lastReviewedAt | Date or null | last accepted practice |
| createdAt / updatedAt | Date | Mongoose timestamps |

Unique (userId, sourceType, sourceId). No content copies, synthetic questions, or flashcards.
Later failure reopens the same row. Replaying a source event does not reopen it.
