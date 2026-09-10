# 🔌 API Conventions

> Applies to **all** endpoints. Read this file before reading any API_*.md file.

---

## Auth Header

```http
Authorization: Bearer <access_token>
```

The refresh token is sent automatically via the httpOnly cookie `refresh_token`.

---

## Base URL

```
Development:  http://localhost:3001/api/v1
Production:   https://<domain>/api/v1
```

---

## Pagination

```json
GET /api/v1/users?page=1&limit=20

Response:
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## Error Envelope

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": ["must be a valid email"]
  },
  "timestamp": "2026-07-13T00:00:00Z",
  "path": "/api/v1/auth/register"
}
```

**This flat shape is canonical.** `code` / `message` / `details` sit at the top level —
there is no `success` flag and no nested `error` object. `error` is the HTTP reason
phrase (a string), not a container. `details` is `Record<fieldName, string[]>` and is
present only on `VALIDATION_ERROR`.

> Full error codes: [API_ERROR_CODES.md](./API_ERROR_CODES.md)

---

## Versioning

- Prefix: `/api/v1/`
- Breaking changes = new version `/api/v2/`
- Non-breaking changes = additive, backward compatible

---

## Timezone

- All DateTime fields: **UTC ISO 8601** (e.g., `2026-07-13T07:00:00Z`)
- The frontend is responsible for converting to the user's local timezone

---

## Response Format

```json
// Success (single object)
{ "data": { ... } }

// Success (list)
{ "data": [...], "meta": { ... } }

// Success (no content)
HTTP 204 No Content
```

---

## Common Headers

| Header | Value |
|--------|-------|
| Content-Type | application/json |
| Accept | application/json |
| Authorization | Bearer {token} |

---

## Rate Limiting

> Written 2026-09-08 from the implemented behavior. This section documents what is **locked**
> versus what is still **open** — it does not invent limits or codes that no owner has agreed to.

**Locked — login only (implemented):**

| Rule | Value |
|---|---|
| Endpoint | `POST /api/v1/auth/login` |
| Limit | 5 failed attempts per 15-minute sliding window per `(ip, normalized email)` key |
| Block response | `429 AUTH_TOO_MANY_REQUESTS` (in the registry and `error-codes.ts`) |
| On block | No bcrypt comparison runs (CPU protection), no remaining-time disclosure |
| Identical for unknown emails | Yes — the counter cannot be used to enumerate accounts |
| Counter reset | On successful login for that key |
| Storage | **In-process memory (`Map`) — single-instance only** (see below) |

**Proposed, not agreed — do not code against these:**

- `register`, `refresh` and `change-password` rate limits (01-auth.md §13 proposals). No
  thresholds, no error codes — `AUTH_TOO_MANY_REQUESTS` covers **login only**.
- Generic `TOO_MANY_REQUESTS` (429) — still in the *proposed, not agreed* section of
  `API_ERROR_CODES.md`. Agreed codes it must not collide with: `AUTH_TOO_MANY_REQUESTS` (login),
  `AI_QUOTA_EXCEEDED` (AI quota).
- `Retry-After` header on 429 responses — not implemented, not specified anywhere.

**Multi-instance limitation (recorded as KNOWN_ISSUES `API-016`):** the login counter and the
refresh-rotation grace cache both live in instance-local memory. Consequences when the API runs
as more than one instance behind a load balancer:

1. The effective login limit becomes **5 × N** (each instance keeps its own counter).
2. Worse: the 15-second rotation grace window is also instance-local. A dropped refresh response
   retried on a **different** instance re-presents a rotated parent token outside that instance's
   cache → it is indistinguishable from replay → the whole token family is revoked → the user is
   force-logged-out. The single-flight guard on the frontend only protects within one tab.

**Fix direction (needs an infrastructure decision before scaling):** a shared store (Redis or
equivalent) for both the login counter and the rotation grace cache, chosen at deploy time.
No code or dependency exists for this yet — recorded so scaling is not attempted without it.
