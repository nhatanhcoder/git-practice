# ⚠️ KNOWN_ISSUES.md — Known Issues & Limitations

> Thay thế Jira cho solo dev. Ghi lại bugs, limitations, và technical debt.

---

## Format

```
### [ISSUE-XXX] Tiêu đề

**Severity**: Critical | High | Medium | Low  
**Sprint**: Sprint X  
**Status**: Open | In Progress | Resolved | Won't Fix  

**Mô tả**: ...
**Reproduce**: ...
**Workaround**: ...
**Fix Plan**: ...
```

---

## Open Issues

*(Sẽ được cập nhật khi phát triển)*

---

## Technical Debt

### [DEBT-001] Không có cross-DB transactions

**Severity**: Medium  
**Status**: Won't Fix (by design)

**Mô tả**: PostgreSQL và MongoDB không share transaction. Nếu create Question (MongoDB) thành công nhưng link Assignment (PostgreSQL) fail, sẽ có orphan data.

**Workaround**: Cleanup script định kỳ, hoặc soft-delete thay vì hard-delete.

---

### [DEBT-002] No real-time notifications (polling only)

**Severity**: Low  
**Status**: Won't Fix (Sprint 6 scope)

**Mô tả**: Notifications dùng polling mỗi 60s, không phải WebSocket real-time.

**Workaround**: Polling interval đủ cho use case hiện tại.

---

## Resolved Issues

*(Sẽ được cập nhật khi fix bugs)*
