# 🔌 API Conventions

> Áp dụng cho **tất cả** endpoints. Đọc file này trước khi đọc bất kỳ API_*.md nào.

---

## Auth Header

```http
Authorization: Bearer <access_token>
```

Refresh token được gửi tự động qua httpOnly cookie `refresh_token`.

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
  "details": [
    { "field": "email", "message": "must be a valid email" }
  ],
  "timestamp": "2026-07-13T00:00:00Z",
  "path": "/api/v1/auth/register"
}
```

> Full error codes: [API_ERROR_CODES.md](./API_ERROR_CODES.md)

---

## Versioning

- Prefix: `/api/v1/`
- Breaking changes = new version `/api/v2/`
- Non-breaking changes = additive, backward compatible

---

## Timezone

- Tất cả DateTime fields: **UTC ISO 8601** (e.g., `2026-07-13T07:00:00Z`)
- Frontend chịu trách nhiệm convert sang timezone local của user

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
