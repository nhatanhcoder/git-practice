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
