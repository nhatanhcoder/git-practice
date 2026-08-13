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
  "success": true,
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
// 4xx / 5xx
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",     // Machine-readable error code
    "message": "Không tìm thấy người dùng với ID này",  // Human-readable (Vietnamese UI copy)
    "details": { ... }            // Optional: validation errors, etc.
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

### User Errors (USER_*)

| Code | HTTP | Description |
|------|------|-------|
| `USER_NOT_FOUND` | 404 | User not found |
| `USER_ALREADY_APPROVED` | 409 | The user has already been approved |
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

### Question Errors (QUESTION_*)

| Code | HTTP | Description |
|------|------|-------|
| `QUESTION_NOT_FOUND` | 404 | Question not found |
| `QUESTION_NOT_OWNER` | 403 | Not the author of the question |
| `QUESTION_AUDIO_REQUIRED` | 400 | This question type requires an audio file |
| `QUESTION_AUDIO_UPLOAD_FAILED` | 500 | Audio upload failed |

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
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": {
      "email": ["Email không đúng định dạng"],
      "password": ["Mật khẩu phải có ít nhất 8 ký tự", "Phải có chữ hoa và số"],
      "fullName": ["Tên không được để trống"]
    }
  }
}
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
      success: false,
      error: { code, message, details }
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
  const apiError = error.response?.data?.error;

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
