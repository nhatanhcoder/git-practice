# 🎓 Student — Permissions

> Specific Student permissions. Full source of truth: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Summary

Students have **learning** permissions across two lanes: class work and personal self-study.
They can view/take work in joined classes, update their own self-study/SRS progress and view their
own invoices. They cannot create platform catalog content or view anyone else's private progress.

---

## Permissions by Resource

### Classes
- ✅ Join a class with an enrollmentCode
- 🔒 Read the classes they are enrolled in
- ❌ Cannot create or edit a class

### Assignments
- 🔒 Read assignments belonging to their own classes
- 🔒 Create an Attempt (1 attempt per assignment)
- 🔒 Submit their own attempt
- 🔒 Read the result once it is graded

### Self-study catalog & supplemental practice
- ✅ Read published platform learning units
- 🔒 Update only their own self-study progress and gamification state
- 🔒 Open teacher-selected supplements only while actively enrolled in that class
- ❌ Cannot author, publish or mutate the platform catalog
- ❌ Cannot turn personal practice into an official grade

### Flashcards
- ✅ Read all flashcards (by HSK level)
- 🔒 Update their own UserFlashcardState
- 🔒 SM-2 scheduling is calculated for their own state only

### Finance
- 🔒 Read their own StudentInvoice
- 🔒 Read their own TuitionPayment history
- ❌ Cannot create a payment (only an admin records one)

### Profile
- 🔒 Read / update their own profile
- ❌ Cannot read anyone else's profile

### Notifications
- 🔒 Read their own notifications

---

## Notes

- A student only sees assignments for classes they are actively enrolled in (status=active)
- After dropping a class (status=dropped): they lose access to new assignments but keep past attempts
- An Attempt can only be created once per assignment (unless the teacher resets it)
- A teacher may see completion only for supplemental units assigned to that teacher's active class
- Voluntary self-study history unrelated to an assigned supplement remains private to the student
- ⛔ Leaderboard visibility/opt-out and catalog authoring permissions need a separate contract

## Related

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)
- [FEATURES_STUDENT.md](./FEATURES_STUDENT.md)
