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
| **LearningCatalog** | author / publish | ⛔ contract needed | ⛔ contract needed | ❌ |
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
