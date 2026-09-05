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

## GET /api/v1/auth/me/marketing

Read the authenticated user's own marketing profile — the optional data collected to target
advertising. Never returns another account's profile; there is no path to one here.

**Response 200**: `{ "data": { "exists": false, ... } }`

`exists` is `false` and every field is `null` when nothing has been filled in. The endpoint
always answers with an object rather than `null`, because `EnvelopeInterceptor` passes `null`
through untouched (so 204s stay bodiless) and a `null` return would arrive as an **empty 200
body**, which a client cannot tell apart from a truncated response.

**Errors**: `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` (401)

---

## PATCH /api/v1/auth/me/marketing

Create or update the authenticated user's own marketing profile. All fields optional — signup
creates the account first and offers this separately, so a person who skips it entirely is in a
valid state.

**Body** (all optional):
```json
{
  "birthYear": 1998, "gender": "female", "province": "Hà Nội", "phone": "0912345678",
  "occupation": "office_worker", "learningGoal": "work", "currentLevel": 3,
  "referralSource": "facebook", "utmSource": "fb", "utmMedium": "cpc", "utmCampaign": "hsk4-t9",
  "marketingConsent": true, "consentChannels": ["email", "zalo"]
}
```

`gender`: `female` / `male` / `other` / `prefer_not_to_say` ·
`occupation`: `student` / `office_worker` / `teacher` / `freelancer` / `other` ·
`learningGoal`: `study_abroad` / `work` / `certificate` / `hobby` / `other` ·
`consentChannels`: `email` / `sms` / `zalo` · `birthYear`: 1900…current year ·
`currentLevel`: 0–9 · `phone`: Vietnamese mobile (`0xxxxxxxxx` or `+84xxxxxxxxx`), normalised.

**Only the fields present in the request are written.** A request carrying one answer does not
null the others.

**Consent is not stored as sent.** The server decides the consent columns:

| Request | Stored |
|---|---|
| `marketingConsent: true` | `consentedAt` and `consentVersion` stamped; empty `consentChannels` defaults to `["email"]` |
| `marketingConsent: true` again | `consentedAt` **unchanged** — consent happened when it first happened |
| `marketingConsent: false` | `withdrawnAt` stamped and `consentChannels` cleared |
| consent not mentioned | consent left exactly as it was |
| `birthYear` implies under 16 | `marketingConsent` forced `false`, `guardianConsentRequired: true` |

The last row is the reason the birth **year** is collected at all. A person under 16 cannot give
valid consent for their own data to be used in advertising, so the row is marked instead and a
query for "who may we advertise to" cannot pick them up.

**Response 200**: `{ "data": { "exists": true, ... } }`

**Errors**: `VALIDATION_ERROR` (400), `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` (401)

---

## DELETE /api/v1/auth/me/marketing

Withdraw consent and **delete the collected marketing data**. The account is untouched — this is
why the data lives in its own table rather than in columns on `User`.

A withdrawal that only flipped a boolean would leave the phone number, birth year and everything
else in the table, so this deletes the row.

**Response 200**: `{ "data": { "deleted": true } }` — `false` when there was nothing stored.

**Errors**: `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_EXPIRED` (401)

---

## POST /api/v1/auth/change-password

**Body**: `{ "currentPassword": "...", "newPassword": "..." }`  
**Response**: 204 No Content

**Errors**: `VALIDATION_ERROR` (400), `AUTH_INVALID_CREDENTIALS` (401)

---

## Related

- [FLOW_AUTH.md](../flows/FLOW_AUTH.md) — full sequence diagram
- [ENTITY_USER.md](../entities/postgres/ENTITY_USER.md)
