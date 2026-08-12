# 🔄 Flow: Grading

> Submit → Teacher grades → Feedback → Notification  
> Actors: **Teacher**, **Student**  
> Related: [FLOW_ASSIGNMENT_LIFECYCLE.md](./FLOW_ASSIGNMENT_LIFECYCLE.md)

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
  │            [Teacher opens grading queue]     │                     │
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

## Attempt states

```
in_progress → submitted → graded
```

---

## AI Grading Prompt

Full details: [AI_FEATURES.md](../shared/AI_FEATURES.md)

```
Input:  question prompt + rubric + student answer
Output: { suggestedScore: number, reasoning: string }
```

The teacher can always override the AI's score.

---

## Notifications Triggered

| Event | Recipient | Type |
|-------|-----------|------|
| Attempt graded | Student | `graded` |
