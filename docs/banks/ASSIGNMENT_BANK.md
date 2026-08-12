# 🏦 Assignment Bank

> Distinguishes a **source assignment** (a reusable template) from an **assignment instance** (already assigned to one specific class).

---

## Concepts

| Concept | Description |
|---------|-------------|
| **Source assignment** | A template the teacher builds from the Question Bank. Holds the questionIds, skillType, type, and timeLimitMinutes. Not yet tied to a specific class. |
| **Assignment instance** | A source assignment handed to one class, with a dueDate. In the current schema `Assignment` already carries `classId` — so source and instance are in fact the same record. |

---

## Current Schema

```
Assignment {
  id, title, classId, teacherId,
  skillType: listening | reading | writing | mixed,
  type: homework | mock_test,
  timeLimitMinutes?: number,
  questionIds: string[],   // MongoDB Question._id[]
  dueDate?: DateTime,
  status: draft | published | archived
}
```

---

## Related Flows

- [FLOW_ASSIGNMENT_LIFECYCLE.md](../flows/FLOW_ASSIGNMENT_LIFECYCLE.md) — the full lifecycle
- [ENTITY_ASSIGNMENT.md](../entities/postgres/ENTITY_ASSIGNMENT.md) — detailed schema

---

## TODO

- [ ] Consider splitting "Assignment template" (no classId) from "Assignment instance" (has classId) if reuse becomes necessary
- [ ] Question versioning: if a teacher edits a question after the assignment is published, what is the impact?
