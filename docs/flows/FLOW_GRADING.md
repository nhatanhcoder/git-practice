# 🔄 Flow: Grading

> Submit → Teacher chấm → Feedback → Notification  
> Actors: **Teacher**, **Student**  
> Liên quan: [FLOW_ASSIGNMENT_LIFECYCLE.md](./FLOW_ASSIGNMENT_LIFECYCLE.md)

---

## Sequence

```
Student               NestJS BE              Gemini AI           PostgreSQL
  │                       │                      │                     │
  │── POST /submit ──────►│                      │                     │
  │                       │── Update Attempt ───────────────────────►│
  │                       │   status: submitted                        │
  │◄── 200 OK ────────────│                      │                     │
  │                       │                      │                     │
  │            [Teacher opens grading queue]      │                     │
  │                       │                      │                     │
Teacher                   │                      │                     │
  │── GET /attempts ─────►│                      │                     │
  │◄── [list of submitted]│                      │                     │
  │                       │                      │                     │
  │── POST /ai-suggest ──►│                      │                     │
  │                       │── Gemini prompt ────►│                     │
  │                       │◄── suggested score + reasoning             │
  │◄── AI suggestion ─────│                      │                     │
  │                       │                      │                     │
  │── PATCH /grade ──────►│                      │                     │
  │   {score, feedback}   │── Update Attempt ───────────────────────►│
  │                       │   status: graded                           │
  │                       │── Create Notification ──────────────────►│
  │                       │   type: graded                             │
  │◄── 200 OK ────────────│                      │                     │
```

---

## Trạng thái Attempt

```
in_progress → submitted → graded
```

---

## AI Grading Prompt

Xem chi tiết: [AI_FEATURES.md](../shared/AI_FEATURES.md)

```
Input:  question prompt + rubric + student answer
Output: { suggestedScore: number, reasoning: string }
```

Teacher luôn có quyền override điểm AI.

---

## Notifications Triggered

| Event | Recipient | Type |
|-------|-----------|------|
| Attempt graded | Student | `graded` |
