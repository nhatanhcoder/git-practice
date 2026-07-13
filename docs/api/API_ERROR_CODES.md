# ⚠️ API_ERROR_CODES.md — Chuẩn hóa Error Response

> **Áp dụng từ**: Sprint 1  
> **Mục tiêu**: Tất cả errors đều có format nhất quán, FE dễ handle

---

## 1. Standard Response Format

### Success Response

```typescript
// 200 OK / 201 Created
{
  "success": true,
  "data": { ... },          // Hoặc array [...] 
  "meta": {                  // Chỉ cho paginated responses
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
    "message": "Không tìm thấy người dùng với ID này",  // Human-readable
    "details": { ... }            // Optional: validation errors, etc.
  }
}
```

---

## 2. HTTP Status Codes

| Code | Meaning | Khi nào dùng |
|------|---------|-------------|
| `200` | OK | GET, PATCH thành công |
| `201` | Created | POST tạo mới thành công |
| `204` | No Content | DELETE thành công |
| `400` | Bad Request | Validation error, business rule violation |
| `401` | Unauthorized | Chưa login hoặc token expired |
| `403` | Forbidden | Đã login nhưng không có quyền |
| `404` | Not Found | Resource không tồn tại |
| `409` | Conflict | Duplicate data (email đã tồn tại, đã enrolled) |
| `422` | Unprocessable | DTO hợp lệ nhưng logic fail |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Lỗi server không lường trước |

---

## 3. Error Code Registry

### Auth Errors (AUTH_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `AUTH_EMAIL_EXISTS` | 409 | Email đã được đăng ký |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu sai |
| `AUTH_ACCOUNT_PENDING` | 403 | Tài khoản chờ admin duyệt |
| `AUTH_ACCOUNT_SUSPENDED` | 403 | Tài khoản bị khóa |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token hết hạn |
| `AUTH_TOKEN_INVALID` | 401 | Token không hợp lệ |
| `AUTH_REFRESH_INVALID` | 401 | Refresh token không hợp lệ hoặc đã dùng |
| `AUTH_INSUFFICIENT_ROLE` | 403 | Không đủ quyền cho action này |

### User Errors (USER_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `USER_NOT_FOUND` | 404 | Không tìm thấy user |
| `USER_ALREADY_APPROVED` | 409 | User đã được duyệt rồi |
| `USER_AVATAR_UPLOAD_FAILED` | 500 | Lỗi upload avatar |

### Class Errors (CLASS_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `CLASS_NOT_FOUND` | 404 | Không tìm thấy lớp |
| `CLASS_ACCESS_DENIED` | 403 | Không phải teacher của lớp này |
| `CLASS_ALREADY_ARCHIVED` | 400 | Lớp đã archive |
| `CLASS_ENROLL_CODE_INVALID` | 404 | Mã tham gia lớp không đúng |
| `CLASS_ALREADY_ENROLLED` | 409 | Học sinh đã trong lớp này |
| `CLASS_NOT_ENROLLED` | 400 | Học sinh không ở trong lớp |

### Question Errors (QUESTION_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `QUESTION_NOT_FOUND` | 404 | Không tìm thấy câu hỏi |
| `QUESTION_NOT_OWNER` | 403 | Không phải người tạo câu hỏi |
| `QUESTION_AUDIO_REQUIRED` | 400 | Loại câu hỏi này cần file audio |
| `QUESTION_AUDIO_UPLOAD_FAILED` | 500 | Lỗi upload audio |

### Assignment Errors (ASSIGNMENT_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `ASSIGNMENT_NOT_FOUND` | 404 | Không tìm thấy bài tập |
| `ASSIGNMENT_NO_QUESTIONS` | 400 | Bài tập cần ít nhất 1 câu hỏi |
| `ASSIGNMENT_PAST_DUE` | 400 | Bài tập đã hết hạn |
| `ASSIGNMENT_ALREADY_SUBMITTED` | 409 | Đã nộp bài này rồi |

### Attempt Errors (ATTEMPT_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `ATTEMPT_NOT_FOUND` | 404 | Không tìm thấy lần làm bài |
| `ATTEMPT_ALREADY_SUBMITTED` | 409 | Bài đã nộp, không thể sửa |
| `ATTEMPT_NOT_IN_PROGRESS` | 400 | Không phải trạng thái làm bài |
| `ATTEMPT_NOT_OWNER` | 403 | Không phải bài của bạn |
| `ATTEMPT_TIME_EXCEEDED` | 400 | Đã hết thời gian làm bài |

### Flashcard Errors (FLASHCARD_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `FLASHCARD_NOT_FOUND` | 404 | Không tìm thấy flashcard |
| `FLASHCARD_ALREADY_IN_REVIEW` | 409 | Đã thêm vào danh sách ôn rồi |
| `FLASHCARD_INVALID_RATING` | 400 | Rating phải từ 0-5 |

### Payroll Errors (PAYROLL_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `PAYROLL_SESSION_NOT_FOUND` | 404 | Không tìm thấy buổi học |
| `PAYROLL_SESSION_NOT_COMPLETED` | 400 | Buổi học chưa hoàn thành |
| `PAYROLL_PERIOD_NOT_FOUND` | 404 | Không tìm thấy kỳ lương |
| `PAYROLL_PERIOD_FINALIZED` | 409 | Kỳ lương đã chốt, không thể sửa |

### Validation Errors (VALIDATION_*)

| Code | HTTP | Mô tả |
|------|------|-------|
| `VALIDATION_ERROR` | 400 | DTO validation fail (với details) |

---

## 4. Validation Error Format

```typescript
// POST /auth/register với dữ liệu sai
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

// Usage in service:
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
      // Interceptor xử lý tự động (refresh)
      break;
    case 'AUTH_ACCOUNT_PENDING':
      toast.info('Tài khoản đang chờ admin duyệt');
      break;
    case 'AUTH_ACCOUNT_SUSPENDED':
      toast.error('Tài khoản của bạn đã bị khóa. Liên hệ admin.');
      break;
    case 'VALIDATION_ERROR':
      // Map details vào form errors (react-hook-form)
      return apiError.details;
    default:
      toast.error(apiError?.message || 'Đã xảy ra lỗi. Thử lại sau.');
  }
}
```
