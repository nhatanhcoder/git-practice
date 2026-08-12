# 🎓 Student — Permissions

> Specific Student permissions. Full source of truth: [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)

---

## Summary

Students have **learning** permissions — viewing and taking assignments in the classes they have joined, doing SRS reviews, and viewing invoices. They cannot create content or view anyone else's data.

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

### Flashcards
- ✅ Read all flashcards (by HSK level)
- 🔒 Update their own UserFlashcardState

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

## Related

- [RBAC_MATRIX.md](../../shared/RBAC_MATRIX.md)
- [FEATURES_STUDENT.md](./FEATURES_STUDENT.md)
