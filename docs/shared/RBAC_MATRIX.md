---
status: active
last_updated: 2026-09-14
---

# 🔐 RBAC Matrix — Actor × Resource × Action

> **The single source of truth** for all permissions in the system.  
> Every route guard and API middleware must reference this document.  
> Per-actor permission details: see `docs/actors/<role>/PERMISSIONS_<ROLE>.md`
> Student learning model: [ADR-016](decisions/016-combined-student-learning-domain.md).

---

## Legend

| Symbol | Meaning |
|---------|-------|
| ✅ | Full access (own + others) |
| 🔒 | Own only (only the user's own data) |
| 👁️ | Read-only |
| ❌ | No access |

---

## Matrix overview

| Resource | Action | Admin | Teacher | Student |
|----------|--------|-------|---------|---------|
| **User** | list all | ✅ | ❌ | ❌ |
| **User** | read own profile | ✅ | 🔒 | 🔒 |
| **User** | update own profile | ✅ | 🔒 | 🔒 |
| **User** | approve / suspend | ✅ | ❌ | ❌ |
| **Class** | create | ❌ | ✅ | ❌ |
| **Class** | read | 👁️ (audit / session display) | 🔒 (own classes) | 🔒 (enrolled) |
| **Class** | update / archive | ❌ | 🔒 | ❌ |
| **ClassEnrollment** | enroll (via code) | ❌ | ❌ | ✅ |
| **ClassEnrollment** | list (own class) | ❌ | 🔒 | 🔒 |
| **Lesson** | create / update / delete / reorder (own class) | ❌ | 🔒 | ❌ |
| **Lesson** | read (own class / own active enrollment) | ❌ | 🔒 | 🔒 |
| **LessonAssignment** | link / unlink (own class) | ❌ | 🔒 | ❌ |
| **Question** | create / update / delete | ❌ | ✅ | ❌ |
| **Question** | read | ❌ | ✅ | 👁️ (in attempt) |
| **Assignment** | create / update / delete | ❌ | 🔒 | ❌ |
| **Assignment** | list (own class) | ❌ | 🔒 | 🔒 |
| **Attempt** | create / submit | ❌ | ❌ | 🔒 |
| **Attempt** | grade | ❌ | 🔒 | ❌ |
| **Attempt** | read (own) | ❌ | 👁️ | 🔒 |
| **ClassSession** | create / log | ❌ | 🔒 | ❌ |
| **ClassSession** | approve / reject | ✅ | ❌ | ❌ |
| **SessionAttendance** | mark | ❌ | 🔒 | ❌ |
| **SessionAttendance** | read own | ❌ | 🔒 | 🔒 |
| **TeacherPayRate** | set | ✅ | ❌ | ❌ |
| **PayrollPeriod** | create / finalize / pay | ✅ | ❌ | ❌ |
| **PayrollPeriod** | read own | ❌ | 🔒 | ❌ |
| **StudentTuitionRate** | set | ✅ | ❌ | ❌ |
| **StudentInvoice** | create | ✅ | ❌ | ❌ |
| **StudentInvoice** | read own | ❌ | ❌ | 🔒 |
| **TuitionPayment** | record | ✅ | ❌ | ❌ |
| **Flashcard** | read / study | ❌ | ❌ | ✅ |
| **UserFlashcardState** | read / update own | ❌ | ❌ | 🔒 |
| **LearningCatalog** | read published units | 👁️ | 👁️ | 👁️ |
| **LearningCatalog** | author / publish own path + own units | ❌ | ✅ (own; publish only while the path is `approved`) | ❌ |
| **LearningCatalog** | review: approve / reject / suspend / restore a path | ✅ | ❌ | ❌ |
| **LearningCatalog** | unpublish any published unit, on any path | ✅ | 🔒 (own units only) | ❌ |
| **SupplementalPractice** | assign catalog unit to own class | ❌ | 🔒 | ❌ |
| **SupplementalPractice** | read / complete | ❌ | 👁️ (own active class) | 🔒 (own active enrollment) |
| **SelfStudyProgress** | read / update own | ❌ | ❌ | 🔒 |
| **SelfStudyProgress** | read assigned-unit completion | ❌ | 👁️ (own active class only) | 🔒 |
| **GamificationState** | read / update own through system events | ❌ | ❌ | 🔒 |
| **Notification** | read own | ✅ | 🔒 | 🔒 |
| **Notification** | create (system) | ✅ (system) | ❌ | ❌ |

---

## Route Guard Implementation

`⛔ contract needed` records an accepted product capability whose authoring owner is still
undecided. It is not permission to implement either Admin or Teacher authoring. Supplemental
practice never grants a teacher access to unrelated voluntary self-study history.

> **Lesson rows** were added 2026-09-03, together with the Teacher module specs
> (`docs/api/modules/teacher/01-classes-lessons.md`). Ownership is inherited from the parent
> class (`lesson.class.teacherId === actor`), per `ENTITY_LESSON.md` — the row records what
> the entity spec already required; it does not introduce a new grant.

```typescript
// NestJS: use the @Roles() decorator + RolesGuard
@Roles(Role.ADMIN)
@Get('users')
listAllUsers() { ... }

@Roles(Role.TEACHER)
@Post('questions')
createQuestion() { ... }

// Ownership check: use a custom guard or a service-level check
// e.g., assignment.teacherId === req.user.id
```

---

## Related

- [PERMISSIONS_ADMIN.md](../actors/admin/PERMISSIONS_ADMIN.md)
- [PERMISSIONS_TEACHER.md](../actors/teacher/PERMISSIONS_TEACHER.md)
- [PERMISSIONS_STUDENT.md](../actors/student/PERMISSIONS_STUDENT.md)
- [API_CONVENTIONS.md](../api/API_CONVENTIONS.md) — auth header, error 403
- [diagrams/rbac-matrix.mmd](../diagrams/rbac-matrix.mmd)

### Task B: UserMistake (approved 2026-09-13)
Student may read and review own rows only; system captures real failures. Teacher/admin have no access. All lookups use token userId; no client creation endpoint.

## Vocabulary learning path — approved 2026-09-15

Student may read published vocabulary catalog and read/start/study/answer/complete own unit progress. Locked content requires prior completion. Teacher/admin cannot call student learning-path routes. Catalog publication uses an operator CLI, not a new public permission.

## Teacher-authored learning catalog — approved 2026-09-19

Supersedes the last sentence of the section above: the operator CLI is **no longer the only** way a
catalog entry is published. Per [ADR-017](../shared/decisions/017-teacher-authored-learning-catalog.md):

- A **teacher** creates and owns a `LearningPath`, authors units in it, submits it for review, and —
  once approved — **publishes each unit themselves**. Ownership is a service-layer predicate on the
  path owner; unit rights derive from the parent path. A teacher never touches another teacher's
  path (`LEARNING_PATH_ACCESS_DENIED`).
- An **admin** approves, rejects (with a reason), suspends and restores paths, and may
  **unpublish any published unit on any path** — including one published after its path was
  approved. Admin has no authoring right, and no endpoint lets an admin edit content.
- Scope is the **platform catalog**: an approved path is visible to every student, with no
  enrollment requirement (ADR-017 §2).
- Students gain no new permission: the same read/study rules and the same `unitSlug`-keyed progress
  apply, whether a unit comes from the CLI corpus or from a teacher. Suspend or unpublish hides
  content and never deletes progress.
- Catalog publication by CLI remains valid for the built-in `hanlo_vocabulary` corpus; it is now one
  producer among two.

