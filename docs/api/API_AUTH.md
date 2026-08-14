# 🔐 API Auth — Authentication Endpoints

> Shared by all three actors. Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)

---

## POST /api/v1/auth/register

Register a new account. Status stays `pending` until an admin approves it.

**Body**:
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "fullName": "Nguyen Van A",
  "role": "student" | "teacher"
}
```

**Response 201**:
```json
{ "data": { "message": "Registration successful. Awaiting admin approval." } }
```

**Errors**: `AUTH_EMAIL_EXISTS` (409), `VALIDATION_ERROR` (400)

---

## POST /api/v1/auth/login

**Body**:
```json
{ "email": "user@example.com", "password": "password123" }
```

**Response 200**:
```json
{
  "data": {
    "accessToken": "eyJ...",
    "user": { "id": "...", "email": "...", "role": "student", "status": "active" }
  }
}
```
Sets httpOnly cookie: `refresh_token` (7 days)

**Errors**: `AUTH_INVALID_CREDENTIALS` (401), `AUTH_ACCOUNT_PENDING` (403), `AUTH_ACCOUNT_SUSPENDED` (403)

---

## POST /api/v1/auth/refresh

Silent token refresh. Uses the `refresh_token` cookie.

**Response 200**: `{ "data": { "accessToken": "eyJ..." } }`

**Errors**: `AUTH_REFRESH_INVALID` (401), `AUTH_TOKEN_EXPIRED` (401)

---

## POST /api/v1/auth/logout

Invalidate refresh token.

**Headers**: `Authorization: Bearer <access_token>`  
**Response**: 204 No Content

---

## GET /api/v1/auth/me

Get the currently authenticated user's profile.

**Response 200**: `{ "data": { ...userProfile } }`

---

## PATCH /api/v1/auth/me

Update the authenticated user's own profile. Self-service for every role;
an admin editing *another* user goes through `PATCH /api/v1/admin/users/:id/*`
(approve / suspend / activate) — see [API_ADMIN.md](./API_ADMIN.md).

**Body** (all fields optional):
```json
{ "fullName": "Nguyen Van A", "email": "user@example.com", "avatarUrl": "https://..." }
```

**Response 200**: `{ "data": { ...userProfile } }`

**Errors**: `VALIDATION_ERROR` (400), `AUTH_EMAIL_EXISTS` (409), `USER_AVATAR_UPLOAD_FAILED` (500)

---

## POST /api/v1/auth/change-password

**Body**: `{ "currentPassword": "...", "newPassword": "..." }`  
**Response**: 204 No Content

**Errors**: `VALIDATION_ERROR` (400), `AUTH_INVALID_CREDENTIALS` (401)

---

## Related

- [FLOW_AUTH.md](../flows/FLOW_AUTH.md) — full sequence diagram
- [ENTITY_USER.md](../entities/postgres/ENTITY_USER.md)
