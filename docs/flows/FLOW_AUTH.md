# 🔐 AUTH_FLOW.md — Authentication & Authorization Flow

> **Pattern**: JWT (Access Token + Refresh Token)  
> **Implementation**: NestJS + Passport.js + @nestjs/jwt

---

## 1. Token Strategy Overview

```
Access Token  → Short-lived (15 minutes) — stored in memory (Zustand)
Refresh Token → Long-lived (7 days)      — stored in httpOnly cookie
```

**Why two tokens?**
- A short access token → if leaked, the exposure window is only 15 minutes
- An httpOnly refresh token → unreadable from JavaScript (XSS protection)
- The refresh token rotates on every use (replay attack protection)

---

## 2. Register Flow

```
Frontend                    NestJS BE                   PostgreSQL
   │                            │                            │
   │── POST /auth/register ────►│                            │
   │   {                        │                            │
   │     email,                 │ ① Validate DTO             │
   │     password,              │   (class-validator)        │
   │     fullName,              │                            │
   │     role: "student"        │ ② Check email unique ─────►│
   │   }                        │                   ◄───────│
   │                            │                            │
   │                            │ ③ Hash password            │
   │                            │   bcrypt(pw, 12)           │
   │                            │                            │
   │                            │ ④ Create user ────────────►│
   │                            │   status: "pending"  ◄────│
   │                            │                            │
   │◄── 201 Created ───────────│                            │
   │    {                       │                            │
   │      message: "Registered   │                           │
   │      successfully. Awaiting │                           │
   │      admin approval"        │                           │
   │    }                       │                            │
   │                            │                            │
   │                            │ ⑤ Create Notification ────►│
   │                            │   → Admin: "New user"      │
```

---

## 3. Login Flow

```
Frontend                    NestJS BE                   PostgreSQL
   │                            │                            │
   │── POST /auth/login ────────►│                            │
   │   { email, password }      │                            │
   │                            │ ① Find user by email ─────►│
   │                            │                      ◄────│
   │                            │                            │
   │                            │ ② Check status             │
   │                            │   pending? → 403           │
   │                            │   suspended? → 403         │
   │                            │   active? → continue       │
   │                            │                            │
   │                            │ ③ Verify password          │
   │                            │   bcrypt.compare()         │
   │                            │   fail? → 401              │
   │                            │                            │
   │                            │ ④ Sign tokens              │
   │                            │   accessToken (15m)        │
   │                            │   refreshToken (7d)        │
   │                            │                            │
   │                            │ ⑤ Save refresh token ─────►│
   │                            │   (hashed in DB)     ◄────│
   │                            │                            │
   │◄── 200 OK ────────────────│                            │
   │    {                       │                            │
   │      accessToken: "eyJ..." │                            │
   │      user: { id, role...} │                            │
   │    }                       │                            │
   │    Set-Cookie:             │                            │
   │    refreshToken=...; HttpOnly; Secure; SameSite=Strict  │
```

---

## 4. Authenticated Request Flow

```
Frontend                         NestJS BE
   │                                  │
   │── GET /classes ─────────────────►│
   │   Authorization: Bearer eyJ...   │
   │                                  │
   │                       JwtAuthGuard:
   │                       ① Extract token from header
   │                       ② jwt.verify(token, secret)
   │                       ③ Token expired? → 401
   │                       ④ Attach user to req.user
   │                                  │
   │                       RolesGuard:
   │                       ⑤ @Roles('teacher') check
   │                       ⑥ req.user.role !== 'teacher'? → 403
   │                                  │
   │                       Controller:
   │                       ⑦ Execute handler
   │                       ⑧ Return data
   │                                  │
   │◄── 200 { success, data } ────────│
```

---

## 5. Token Refresh Flow

```
Frontend (Axios Interceptor)         NestJS BE
   │                                      │
   │ Request fails with 401               │
   │                                      │
   │── POST /auth/refresh ───────────────►│
   │   Cookie: refreshToken=abc...        │
   │                                      │
   │                         RefreshJwtGuard:
   │                         ① Extract from httpOnly cookie
   │                         ② Verify refresh token signature
   │                         ③ Find token in DB ──────────────► PostgreSQL
   │                         ④ Token revoked? → 401 ◄──────────
   │                         ⑤ Generate new accessToken
   │                         ⑥ Rotate refreshToken (revoke old, save new)
   │                                      │
   │◄── 200 { accessToken: "eyJ..." } ───│
   │                                      │
   │ Retry original request               │
   │ with new accessToken                 │
```

### Axios Interceptor (Frontend):

```typescript
// apps/web/lib/api/axios.ts
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post('/auth/refresh'); // httpOnly cookie auto-sent
        const newToken = data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        error.config.headers['Authorization'] = `Bearer ${newToken}`;
        return axiosInstance(error.config);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 6. Logout Flow

```
Frontend                    NestJS BE               PostgreSQL
   │                            │                       │
   │── POST /auth/logout ──────►│                       │
   │   Cookie: refreshToken     │                       │
   │                            │ ① Revoke refresh ────►│
   │                            │   token in DB    ◄────│
   │                            │                       │
   │◄── 200 OK ────────────────│                       │
   │    Set-Cookie: refreshToken=; Max-Age=0  (clear)   │
   │                            │                       │
   │ Clear accessToken from     │                       │
   │ Zustand store              │                       │
   │ Redirect to /login         │                       │
```

---

## 7. Role-Based Access Control

### Roles & Permissions

| Route Pattern | Admin | Teacher | Student |
|--------------|-------|---------|---------|
| `GET /admin/*` | ✅ | ❌ | ❌ |
| `POST /classes` | ❌ | ✅ | ❌ |
| `GET /classes` | ✅ | ✅ | ✅ |
| `POST /classes/enroll` | ❌ | ❌ | ✅ |
| `POST /questions` | ❌ | ✅ | ❌ |
| `POST /attempts` | ❌ | ❌ | ✅ |
| `GET /users/me` | ✅ | ✅ | ✅ |

### NestJS Implementation:

```typescript
// Decorator usage
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {

  @Post()
  @Roles('teacher')                    // Teacher only
  create(@Body() dto: CreateClassDto) {}

  @Get()
  @Roles('admin', 'teacher', 'student') // All roles
  findAll() {}

  @Post('enroll')
  @Roles('student')                    // Student only
  enroll(@Body() dto: EnrollDto) {}
}
```

---

## 8. JWT Payload Structure

```typescript
interface JwtPayload {
  sub: string;        // user.id (UUID)
  email: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active';
  iat: number;        // Issued at
  exp: number;        // Expires at
}
```

---

## 9. Security Checklist

- [x] Passwords hashed with bcrypt (rounds: 12)
- [x] Access token 15min — shrinks the exposure window if leaked
- [x] Refresh token in an httpOnly cookie — unreadable from JS
- [x] Refresh token hashed in the DB (never stored in plaintext)
- [x] Refresh token rotation — prevent replay attacks
- [x] Rate limiting on `/auth/login` (5 req/min)
- [x] Account status checked before login
- [x] HTTPS only in production (Secure cookie flag)
