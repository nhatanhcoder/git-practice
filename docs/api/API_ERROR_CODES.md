---
status: active
last_updated: 2026-09-18
---

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

### Supplement Errors (SUPPLEMENT_*) — proposed with API-020 (`teacher/08-supplements.md`)

> ⛔ **Proposed, not agreed.** Needs BE-owner sign-off (API-020 §16). Not usable yet.

| Code | HTTP | Description |
|------|------|-------|
| `SUPPLEMENT_ALREADY_ATTACHED` | 409 | This source is already attached to this lesson |
| `SUPPLEMENT_NOT_ATTACHED` | 404 | No such supplement link on this lesson |
| `SUPPLEMENT_ORDER_CONFLICT` | 409 | Reorder payload is not the complete dense `1..N` permutation of the lesson's supplements |
| `SUPPLEMENT_SOURCE_NOT_FOUND` | 404 | Attach source is unknown or not published — fail closed, no content leak |

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

### Word Bank Errors (WORD_BANK_*)

Registered 2026-09-12 with the word-bank module (branch `feat/student-word-bank`,
`docs/api/modules/student/02-word-bank.md`). "Not found" and "not mine" deliberately share
one code so a caller cannot probe for another student's bookmark ids.

| Code | HTTP | Description |
|------|------|-------|
| `WORD_BANK_NOT_FOUND` | 404 | Saved word does not exist or belongs to another student |

### Foundation/Grammar Errors (GRAMMAR_*) — added 2026-09-16 (`feat/student-foundation-be`)

`02-foundation-grammar.md` §9 (D5-approved). The catalogues are read-only, so the
family is a single code: the only failure a caller can produce is asking for a
grammar item outside the corpus. Foundation studied-state writes validate
kind/key against the pinned catalog and answer `VALIDATION_ERROR` (existing
code) — a foundation unknown-key is always a client bug, never a missing row.
A learner with no studied-state is **not** an error — it is a valid empty
progress record.

| Code | HTTP | Description |
|------|------|-------|
| `GRAMMAR_NOT_FOUND` | 404 | No grammar item with that id exists in the catalogue |
| `GRAMMAR_PRACTICE_CONFLICT` | 409 | Same practice `submissionId` retried with a different answer (option-A port 2026-09-16) |

### Placement Errors (PLACEMENT_*) — added 2026-09-13, Task C (`modules/student/04-placement.md`)

| Code | HTTP | Description |
|------|------|-------|
| `PLACEMENT_NO_QUESTIONS` | 409 | The question bank has no eligible band-1 question, so a paper cannot be served or graded |

### Self-study practice errors — agreed 2026-09-18

Registered with [student module 06](modules/student/06-writing-lego-workplace.md).
Invalid permutations, blank replies and out-of-order workplace turns use the
existing `VALIDATION_ERROR`; they do not need feature-specific codes.

| Code | HTTP | Description |
|------|------|-------------|
| `WRITING_CHAR_NOT_FOUND` | 404 | No writing character with that source id exists |
| `LEGO_STATION_NOT_FOUND` | 404 | No Lego station with that source id exists |
| `WORKPLACE_SCENARIO_NOT_FOUND` | 404 | No workplace scenario with that source id exists |
| `WORKPLACE_TURN_NOT_FOUND` | 404 | No turn with that id exists in the selected scenario |

### Notification Errors (NOTIFICATION_*)

Registered 2026-09-12 with module 07's implementation (branch `feat/student-notifications`).
One code is the whole family by design: "not found" and "not yours" deliberately share it so
a caller cannot probe for the existence of other users' notifications
(`07-notifications.md` §5/§9).

| Code | HTTP | Description |
|------|------|-------|
| `NOTIFICATION_NOT_FOUND` | 404 | Notification does not exist or belongs to another user |

### Payroll Errors (PAYROLL_*)

| Code | HTTP | Description |
|------|------|-------|
| `PAYROLL_SESSION_NOT_FOUND` | 404 | Class session not found |
| `PAYROLL_SESSION_NOT_COMPLETED` | 400 | The class session is not yet completed |
| `PAYROLL_PERIOD_NOT_FOUND` | 404 | Payroll period not found |
| `PAYROLL_PERIOD_FINALIZED` | 409 | The payroll period is finalized and cannot be edited |
| `PAYROLL_PERIOD_ALREADY_PAID` | 409 | The payroll period is already marked paid |
| `PAYROLL_PERIOD_DUPLICATE` | 409 | A payroll period already exists for this teacher in that date range |
| `PAYROLL_PERIOD_OVERLAP` | 409 | The payroll period overlaps an existing period for this teacher |
| `PAYROLL_SESSION_HOURLY_MISSING_TIME` | 400 | Hourly pay calculation requires actualStart and actualEnd |

### Session Review Errors (SESSION_*)

| Code | HTTP | Description |
|------|------|-------|
| `SESSION_NOT_FOUND` | 404 | Class session not found |
| `SESSION_ALREADY_REVIEWED` | 409 | Already approved or rejected — approval is one-way |
| `SESSION_REJECT_REASON_REQUIRED` | 400 | Rejecting a session requires a reason |
| `SESSION_INVALID_TRANSITION` | 409 | The session status does not allow this action (teacher start/end/submit from a wrong status) |

### Invoice Errors (INVOICE_*)

> ✅ **Agreed 2026-09-05** per ADR-013.

| Code | HTTP | Description |
|------|------|-------|
| `INVOICE_NOT_FOUND` | 404 | Invoice not found |
| `INVOICE_ALREADY_VOID` | 409 | The invoice is already voided |
| `INVOICE_ALREADY_PAID` | 409 | A fully paid invoice cannot be voided or re-issued |
| `INVOICE_PERIOD_DUPLICATE` | 409 | An invoice already exists for this student + period |
| `INVOICE_NO_TUITION_RATE` | 400 | No `StudentTuitionRate` is in effect for this student on the billing date |
| `INVOICE_PAYMENT_EXCEEDS_TOTAL` | 400 | The recorded payment exceeds the outstanding balance |
| `INVOICE_BATCH_PARTIAL_FAILURE` | 422 | Batch generation partly failed — `details` lists the failed student IDs |
| `INVOICE_VOID_WITH_PAYMENTS_FORBIDDEN` | 409 | Cannot void an invoice with recorded payments |
| `INVOICE_PREVIEW_HASH_MISMATCH` | 409 | Batch preview hash mismatch or data has changed |

### Rate Errors (RATE_*)

> ✅ **Agreed 2026-09-05** per ADR-008, ADR-012, ADR-013.

| Code | HTTP | Description |
|------|------|-------|
| `RATE_NOT_FOUND` | 404 | No rate is in effect for this subject on the given date |
| `RATE_EFFECTIVE_DATE_IN_PAST` | 400 | `effectiveFrom` may not precede the newest existing rate |
| `RATE_IMMUTABLE` | 409 | An existing rate cannot be edited or deleted — add a new one instead |

### AI / Gemini Errors (AI_*)

> ✅ **Agreed 2026-09-05** per ADR-014.

| Code | HTTP | Description |
|------|------|-------|
| `AI_QUOTA_EXCEEDED` | 429 | The Gemini quota for this key is exhausted |
| `AI_KEY_INVALID` | 401 | The configured Gemini API key was rejected |
| `AI_GRADING_FAILED` | 502 | Gemini returned an unusable grading response |

### Idempotency Errors (IDEMPOTENCY_*)

| Code | HTTP | Description |
|------|------|-------|
| `IDEMPOTENCY_KEY_CONFLICT` | 422 | Request payload differs from the previous request with this idempotency key |

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

## Mistake notebook — approved Task B 2026-09-13

| Code | HTTP | Meaning |
|---|---|---|
| MISTAKE_NOT_FOUND | 404 | Missing, foreign or unavailable mistake |
| MISTAKE_REVIEW_STALE | 409 | Version changed or already resolved; reload session |

## Learning path — approved 2026-09-15

| Code | HTTP | Meaning |
|---|---|---|
| `LEARNING_UNIT_NOT_FOUND` | 404 | Invalid or unpublished unit |
| LEARNING_UNIT_LOCKED | 403 | Previous unit not completed |
| LEARNING_PROGRESS_CONFLICT | 409 | Stale revision, not started or already completed |
| LEARNING_STEP_INVALID | 400 | Study/answer/completion precondition fails |

## Learning catalog — teacher authoring + admin moderation — **agreed** 2026-09-19

> ✅ **agreed.** Proposed and owner-approved 2026-09-19 with
> [ADR-017](../shared/decisions/017-teacher-authored-learning-catalog.md) and the two module specs
> ([teacher 07](./modules/teacher/07-learning-catalog.md), [admin 09](./modules/09-learning-catalog-moderation.md)).
> The owner approved the DB/RBAC implementation scope after reviewing the Slice 0 hand-off; these
> codes are usable by Slice 1. Every branch below is a rule stated in one of the two specs.

| Code | HTTP | Description |
|---|---|---|
| `LEARNING_PATH_NOT_FOUND` | 404 | Path does not exist |
| `LEARNING_PATH_ACCESS_DENIED` | 403 | Path exists but is not owned by the calling teacher |
| `LEARNING_PATH_INVALID_STATUS` | 409 | Transition not legal from the current status, including a lost race between two actors |
| `LEARNING_PATH_FROZEN` | 409 | Write attempted while the path is `pending_review` or `suspended` |
| `LEARNING_PATH_EMPTY` | 409 | Approval attempted on a path that has no unit at all |
| `LEARNING_PATH_REJECTION_REASON_REQUIRED` | 400 | `rejectionReason` missing, whitespace-only, shorter than 10 or longer than 2000 chars |
| `LEARNING_PATH_HAS_PUBLISHED_UNITS` | 409 | Delete attempted on a path that has a published unit or recorded student progress |
| `LEARNING_UNIT_PUBLISHED_IMMUTABLE` | 409 | Content edit or delete attempted on a unit that has ever been published — publish a new unit instead |
| `LEARNING_UNIT_ORDER_INVALID` | 400 | Reorder payload is not the complete `1..N` permutation of the path's units |
| `LEARNING_UNIT_NOT_OWNED` | 403 | Unit's parent path is not owned by the calling teacher |
| `LEARNING_UNIT_REFERENCE_INVALID` | 409 | Reference target does not exist or is not published |
