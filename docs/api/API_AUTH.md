# 🔐 API Auth — Authentication Endpoints

> Dùng chung cho cả 3 actor. Conventions: [API_CONVENTIONS.md](./API_CONVENTIONS.md)

---

## POST /api/v1/auth/register

Đăng ký tài khoản mới. Status sẽ là `pending` cho đến khi admin duyệt.

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

**Errors**: `EMAIL_ALREADY_EXISTS` (409), `VALIDATION_ERROR` (400)

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
Sets httpOnly cookie: `refresh_token` (7 ngày)

**Errors**: `INVALID_CREDENTIALS` (401), `ACCOUNT_PENDING` (403), `ACCOUNT_SUSPENDED` (403)

---

## POST /api/v1/auth/refresh

Silent token refresh. Dùng cookie `refresh_token`.

**Response 200**: `{ "data": { "accessToken": "eyJ..." } }`

**Errors**: `INVALID_REFRESH_TOKEN` (401), `REFRESH_TOKEN_EXPIRED` (401)

---

## POST /api/v1/auth/logout

Invalidate refresh token.

**Headers**: `Authorization: Bearer <access_token>`  
**Response**: 204 No Content

---

## GET /api/v1/auth/me

Lấy profile của user đang đăng nhập.

**Response 200**: `{ "data": { ...userProfile } }`

---

## POST /api/v1/auth/change-password

**Body**: `{ "currentPassword": "...", "newPassword": "..." }`  
**Response**: 204 No Content

---

## Liên quan

- [FLOW_AUTH.md](../flows/FLOW_AUTH.md) — sequence diagram đầy đủ
- [ENTITY_USER.md](../entities/postgres/ENTITY_USER.md)
