# ⚠️ API_ERROR_CODES.md — Standardised Error Responses

> **In effect from**: Sprint 1  
> **Goal**: Every error has a consistent format so the frontend can handle them uniformly

> **Note on language**: descriptive prose in this document is English, but the
> Vietnamese strings inside the code samples are **runtime messages shown to
> end users** — the product's UI language is Vietnamese, so they are left as-is.

---

## 1. Standard Response Format

### Success Response

```typescript
// 200 OK / 201 Created
{
  "data": { ... },          // Or an array [...]
  "meta": {                  // Paginated responses only
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error Response

```typescript
// 4xx / 5xx — flat envelope, canonical shape (see API_CONVENTIONS.md § Error Envelope)
{
  "statusCode": 404,                                    // Mirrors the HTTP status
  "error": "Not Found",                                 // HTTP reason phrase
  "code": "USER_NOT_FOUND",                             // Machine-readable error code
  "message": "Không tìm thấy người dùng với ID này",    // Human-readable (Vietnamese UI copy)
  "details": { ... },                                   // Optional: validation errors, etc.
  "timestamp": "2026-08-14T07:00:00Z",
  "path": "/api/v1/admin/users/123"
}
}
```

---

## 2. HTTP Status Codes

| Code | Meaning | When to use |
|------|---------|-------------|
| `200` | OK | Successful GET or PATCH |
| `201` | Created | Successful POST that created a resource |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Validation error, business rule violation |
| `401` | Unauthorized | Not logged in, or the token expired |
| `403` | Forbidden | Logged in but lacking permission |
| `404` | Not Found | The resource does not exist |
| `409` | Conflict | Duplicate data (email already exists, already enrolled) |
| `422` | Unprocessable | The DTO is valid but the logic fails |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unanticipated server error |

---

## 3. Error Code Registry

### Auth Errors (AUTH_*)

| Code | HTTP | Description |
|------|------|-------|
| `AUTH_EMAIL_EXISTS` | 409 | The email is already registered |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_ACCOUNT_PENDING` | 403 | The account is awaiting admin approval |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | The account is suspended |
| `AUTH_TOKEN_EXPIRED` | 401 | The access token has expired |
| `AUTH_TOKEN_INVALID` | 401 | The token is invalid |
| `AUTH_REFRESH_INVALID` | 401 | The refresh token is invalid or already used |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Insufficient permission for this action |
| `AUTH_TOO_MANY_REQUESTS` | 429 | Quá nhiều lần thử đăng nhập, vui lòng thử lại sau |

### User Errors (USER_*)

| Code | HTTP | Description |
|------|------|-------|
| `USER_NOT_FOUND` | 404 | User not found |
| `USER_ALREADY_APPROVED` | 409 | The user has already been approved |
| `USER_ALREADY_SUSPENDED` | 409 | The user has already been suspended |
| `USER_ALREADY_ACTIVE` | 409 | The user is already active |
| `USER_INVALID_STATUS_TRANSITION` | 400 | Invalid user account status transition |
| `USER_AVATAR_UPLOAD_FAILED` | 500 | Avatar upload failed |

### Class Errors (CLASS_*)

| Code | HTTP | Description |
|------|------|-------|
| `CLASS_NOT_FOUND` | 404 | Class not found |
| `CLASS_ACCESS_DENIED` | 403 | Not the teacher of this class |
| `CLASS_ALREADY_ARCHIVED` | 400 | The class is already archived |
| `CLASS_ENROLL_CODE_INVALID` | 404 | The class enrollment code is wrong |
| `CLASS_ALREADY_ENROLLED` | 409 | The student is already in this class |
| `CLASS_NOT_ENROLLED` | 400 | The student is not in the class |

### Lesson Errors (LESSON_*)

> ✅ **Agreed 2026-09-03** (owner sign-off with the Teacher module specs). Originally added
> 2026-09-01 as *proposed* with the Lessons section of `API_TEACHER.md` (`API-007`); each code
> maps to a constraint already written in
> [ENTITY_LESSON.md](../entities/postgres/ENTITY_LESSON.md) /
> [ENTITY_LESSON_ASSIGNMENT.md](../entities/postgres/ENTITY_LESSON_ASSIGNMENT.md).

| Code | HTTP | Description |
|------|------|-------|
| `LESSON_NOT_FOUND` | 404 | Lesson not found |
| `LESSON_ACCESS_DENIED` | 403 | Not the teacher of the lesson's parent class |
| `LESSON_HAS_ACTIVE_ATTEMPTS` | 409 | Cannot delete — a linked assignment has active attempts |
| `LESSON_ORDER_INDEX_CONFLICT` | 409 | `(classId, orderIndex)` already taken — reorder was not transactional |
| `LESSON_ASSIGNMENT_ALREADY_LINKED` | 409 | This assignment is already linked to this lesson |
| `LESSON_ASSIGNMENT_NOT_LINKED` | 404 | No such link between this lesson and assignment |

### Question Errors (QUESTION_*)

| Code | HTTP | Description |
|------|------|-------|
| `QUESTION_NOT_FOUND` | 404 | Question not found |
| `QUESTION_NOT_OWNER` | 403 | Not the author of the question |
| `QUESTION_AUDIO_REQUIRED` | 400 | This question type requires an audio file |
| `QUESTION_AUDIO_UPLOAD_FAILED` | 500 | Audio upload failed |
| `QUESTION_IN_USE` | 409 | Cannot edit/delete — a published assignment uses this question |

### Assignment Errors (ASSIGNMENT_*)

| Code | HTTP | Description |
|------|------|-------|
| `ASSIGNMENT_NOT_FOUND` | 404 | Assignment not found |
| `ASSIGNMENT_NO_QUESTIONS` | 400 | An assignment needs at least one question |
| `ASSIGNMENT_PAST_DUE` | 400 | The assignment is past its due date |
| `ASSIGNMENT_ALREADY_SUBMITTED` | 409 | This assignment has already been submitted |

### Attempt Errors (ATTEMPT_*)

| Code | HTTP | Description |
|------|------|-------|
| `ATTEMPT_NOT_FOUND` | 404 | Attempt not found |
| `ATTEMPT_ALREADY_SUBMITTED` | 409 | Already submitted; cannot be edited |
| `ATTEMPT_NOT_IN_PROGRESS` | 400 | The attempt is not in progress |
| `ATTEMPT_NOT_OWNER` | 403 | Not your attempt |
| `ATTEMPT_TIME_EXCEEDED` | 400 | The time limit has been exceeded |
| `ATTEMPT_NOT_SUBMITTED` | 409 | Grading requires a submitted attempt |

### Flashcard Errors (FLASHCARD_*)

| Code | HTTP | Description |
|------|------|-------|
| `FLASHCARD_NOT_FOUND` | 404 | Flashcard not found |
| `FLASHCARD_ALREADY_IN_REVIEW` | 409 | Already added to the review list |
| `FLASHCARD_INVALID_RATING` | 400 | The rating must be between 0 and 5 |

### Payroll Errors (PAYROLL_*)

| Code | HTTP | Description |
|------|------|-------|
| `PAYROLL_SESSION_NOT_FOUND` | 404 | Class session not found |
| `PAYROLL_SESSION_NOT_COMPLETED` | 400 | The class session is not yet completed |
| `PAYROLL_PERIOD_NOT_FOUND` | 404 | Payroll period not found |
| `PAYROLL_PERIOD_FINALIZED` | 409 | The payroll period is finalized and cannot be edited |

### Session Review Errors (SESSION_*)

| Code | HTTP | Description |
|------|------|-------|
| `SESSION_NOT_FOUND` | 404 | Class session not found |
| `SESSION_ALREADY_REVIEWED` | 409 | Already approved or rejected — approval is one-way |
| `SESSION_REJECT_REASON_REQUIRED` | 400 | Rejecting a session requires a reason |
| `SESSION_INVALID_TRANSITION` | 409 | The session status does not allow this action (teacher start/end/submit from a wrong status) |

### Invoice Errors (INVOICE_*)

> ⚠️ **Proposed, not agreed.** Blocked on the tuition model decision
> (FEATURES_ADMIN A-INV-1). Confirm before Sprint 3.

| Code | HTTP | Description |
|------|------|-------|
| `INVOICE_NOT_FOUND` | 404 | Invoice not found |
| `INVOICE_ALREADY_VOID` | 409 | The invoice is already voided |
| `INVOICE_ALREADY_PAID` | 409 | A fully paid invoice cannot be voided or re-issued |
| `INVOICE_PERIOD_DUPLICATE` | 409 | An invoice already exists for this student + period |
| `INVOICE_NO_TUITION_RATE` | 400 | No `StudentTuitionRate` is in effect for this student on the billing date |
| `INVOICE_PAYMENT_EXCEEDS_TOTAL` | 400 | The recorded payment exceeds the outstanding balance |
| `INVOICE_BATCH_PARTIAL_FAILURE` | 422 | Batch generation partly failed — `details` lists the failed student IDs |

### Rate Errors (RATE_*)

> ⚠️ **Proposed, not agreed.** Rates are append-only — see
> [ADR 008](../shared/decisions/008-append-only-rates.md).

| Code | HTTP | Description |
|------|------|-------|
| `RATE_NOT_FOUND` | 404 | No rate is in effect for this subject on the given date |
| `RATE_EFFECTIVE_DATE_IN_PAST` | 400 | `effectiveFrom` may not precede the newest existing rate |
| `RATE_IMMUTABLE` | 409 | An existing rate cannot be edited or deleted — add a new one instead |

### AI / Gemini Errors (AI_*)

> ⚠️ **Proposed, not agreed.** Blocked on the Gemini key model decision (UC-A-005).

| Code | HTTP | Description |
|------|------|-------|
| `AI_QUOTA_EXCEEDED` | 429 | The Gemini quota for this key is exhausted |
| `AI_KEY_INVALID` | 401 | The configured Gemini API key was rejected |
| `AI_GRADING_FAILED` | 502 | Gemini returned an unusable grading response |

### Fallback Errors — emitted by the Global Exception Filter

> ⚠️ These two codes **have been emitted by the `GlobalExceptionFilter` in §5 all along** but were never
> registered in §3. `pnpm check:docs` flagged them on 2026-08-19 when module specs referenced
> them. Registered here so the registry matches the sample code — **not** to encourage usage.

| Code | HTTP | Description |
|------|------|-------|
| `DUPLICATE_ENTRY` | 409 | Prisma P2002 (unique violation) falls through to the global filter |
| `INTERNAL_SERVER_ERROR` | 500 | Unmapped error — the filter's default branch |

**These are last-resort codes, not business codes.** Services **must** catch errors and rethrow
specific codes before they fall through to the filter. Example: `register` catches P2002 and
throws `AUTH_EMAIL_EXISTS` (409) — if it leaked out as `DUPLICATE_ENTRY`, the frontend receives a
`code` it has no handler branch for and falls into the default toast. `DUPLICATE_ENTRY` appearing
in production logs = an error branch someone forgot to map.

### Proposed, not agreed

> ⚠️ **Not usable yet.** Needs a BE owner to sign off each row. Listing them is not locking them.

| Code | HTTP | Description | Needed for |
|------|------|-------------|---------|
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded | `API_CONVENTIONS.md` has no rate-limit section yet — must be written first |
| `PAYROLL_PERIOD_DUPLICATE` | 409 | A payroll period already exists for this teacher in that date range | `POST /admin/payroll` — `PAYROLL_PERIOD_FINALIZED` currently carries 3 different meanings |

### Validation Errors (VALIDATION_*)

| Code | HTTP | Description |
|------|------|-------|
| `VALIDATION_ERROR` | 400 | DTO validation failed (with details) |

---

## 4. Validation Error Format

```typescript
// POST /auth/register with invalid data
// Response 400:
{
  "statusCode": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ",
  "details": {
    "email": ["Email không đúng định dạng"],
    "password": ["Mật khẩu phải có ít nhất 8 ký tự", "Phải có chữ hoa và số"],
    "fullName": ["Tên không được để trống"]
  },
  "timestamp": "2026-08-14T07:00:00Z",
  "path": "/api/v1/auth/register"
}

> `details` is always `Record<fieldName, string[]>` — one entry per invalid field.
> It is absent on non-validation errors.
```

---

## 5. NestJS Implementation

### Global Exception Filter

```typescript
// common/filters/http-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Đã xảy ra lỗi không mong muốn';
    let details = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exRes = exception.getResponse() as any;
      code = exRes.code || 'HTTP_ERROR';
      message = exRes.message || exception.message;
      details = exRes.details;
    } else if (exception instanceof PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'Dữ liệu đã tồn tại';
      }
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status] ?? 'Error',
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest<Request>().url,
    });
  }
}
```

### Custom Business Exception

```typescript
// common/exceptions/business.exception.ts
export class BusinessException extends HttpException {
  constructor(errorCode: string, message: string, statusCode = 400, details?: any) {
    super({ code: errorCode, message, details }, statusCode);
  }
}

// Usage in a service:
throw new BusinessException('CLASS_ENROLL_CODE_INVALID', 'Mã tham gia lớp không đúng', 404);
```

---

## 6. Frontend Error Handling

```typescript
// apps/web/lib/api/error-handler.ts
export function handleApiError(error: AxiosError) {
  const apiError = error.response?.data;   // flat envelope — code/message/details at top level

  switch (apiError?.code) {
    case 'AUTH_TOKEN_EXPIRED':
      // Handled automatically by the interceptor (refresh)
      break;
    case 'AUTH_ACCOUNT_PENDING':
      toast.info('Tài khoản đang chờ admin duyệt');
      break;
    case 'AUTH_ACCOUNT_SUSPENDED':
      toast.error('Tài khoản của bạn đã bị khóa. Liên hệ admin.');
      break;
    case 'VALIDATION_ERROR':
      // Map details onto form errors (react-hook-form)
      return apiError.details;
    default:
      toast.error(apiError?.message || 'Đã xảy ra lỗi. Thử lại sau.');
  }
}
```
