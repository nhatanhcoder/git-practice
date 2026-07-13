# 📏 CONVENTIONS.md — Quy ước Code & Git

> **Áp dụng cho**: Toàn bộ dự án (FE + BE)  
> **Cập nhật**: 2026-07-09

---

## 1. Git Conventions

### Branch Strategy

```
main          → Production-ready code (protected)
develop       → Integration branch
│
├── feature/  → Tính năng mới
│   └── feature/S1-auth-login
│   └── feature/S2-class-enrollment
│
├── fix/      → Bug fixes
│   └── fix/S3-question-upload-audio
│
└── chore/    → Config, deps, docs
    └── chore/update-prisma-schema
```

### Commit Message Format (Conventional Commits)

```
<type>(<scope>): <description>

Types:
  feat     → Tính năng mới
  fix      → Sửa bug
  docs     → Chỉnh tài liệu
  style    → Formatting (không đổi logic)
  refactor → Refactor code
  test     → Thêm/sửa tests
  chore    → Build, deps, config

Scope: auth | users | classes | questions | assignments | attempts | flashcards | analytics | payroll | invoices | notifs | shared

Examples:
  feat(auth): implement JWT refresh token rotation
  fix(classes): fix enrollment code collision on retry
  docs(arch): add sequence diagram for exam flow
  test(attempts): add unit tests for auto-grading service
```

### Pull Request Template

```markdown
## Mô tả
[Mô tả ngắn gọn thay đổi]

## Sprint Task
- [ ] Closes #S1-03 (Task ID từ TASK_BOARD.md)

## Loại thay đổi
- [ ] feat: Tính năng mới
- [ ] fix: Sửa bug
- [ ] refactor

## Checklist
- [ ] Code đã được lint (`pnpm lint`)
- [ ] TypeScript không có errors (`pnpm type-check`)
- [ ] Đã viết/cập nhật tests
- [ ] Swagger docs cập nhật (nếu có API mới)
- [ ] .env.example cập nhật (nếu có env mới)
```

---

## 2. TypeScript Conventions

```typescript
// ✅ GOOD: Explicit types, no any
interface CreateClassDto {
  name: string;
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6;
  description?: string;
}

// ❌ BAD: Avoid any
function processData(data: any) { ... }

// ✅ GOOD: Use enums cho fixed values
enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// ✅ GOOD: Return type explicit cho services
async findById(id: string): Promise<User | null> { ... }

// ✅ GOOD: Destructure với types
const { id, role }: JwtPayload = req.user;
```

---

## 3. NestJS Conventions

### Module Structure

```typescript
// Mỗi feature module có đúng cấu trúc:
modules/
└── classes/
    ├── classes.module.ts        // @Module decorator
    ├── classes.controller.ts    // HTTP handlers only
    ├── classes.service.ts       // Business logic
    ├── classes.repository.ts    // DB queries (optional, nếu phức tạp)
    └── dto/
        ├── create-class.dto.ts
        ├── update-class.dto.ts
        └── enroll-class.dto.ts
```

### Controller Rules

```typescript
@Controller('classes')
@ApiTags('Classes')                           // Swagger group
@UseGuards(JwtAuthGuard, RolesGuard)          // Auth guard luôn ở controller level
export class ClassesController {

  @Post()
  @Roles('teacher')                           // Role ở method level
  @ApiOperation({ summary: 'Tạo lớp học mới' })
  @ApiResponse({ status: 201, type: ClassResponseDto })
  async create(
    @Body() dto: CreateClassDto,              // DTO với validation
    @CurrentUser() user: JwtPayload,          // User từ JWT
  ): Promise<ApiResponse<ClassResponseDto>> {
    const result = await this.classesService.create(dto, user.sub);
    return { success: true, data: result };
  }
}
```

### Service Rules

```typescript
@Injectable()
export class ClassesService {

  constructor(private readonly prisma: PrismaService) {}

  // ✅ Throw BusinessException, không trả null cho not found
  async findById(id: string, userId: string): Promise<Class> {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new BusinessException('CLASS_NOT_FOUND', '...', 404);
    if (cls.teacherId !== userId) throw new BusinessException('CLASS_ACCESS_DENIED', '...', 403);
    return cls;
  }
}
```

---

## 4. Next.js Conventions

### File Naming

```
PascalCase  → Components (ClassCard.tsx, UserMenu.tsx)
camelCase   → Hooks (useAuth.ts, useClasses.ts)
camelCase   → Utils (formatDate.ts, generateCode.ts)
kebab-case  → Route segments (app/student/class-detail/)
```

### Component Structure

```typescript
// ✅ GOOD: Props interface trước component
interface ClassCardProps {
  classData: ClassDto;
  onEnroll?: () => void;
}

export function ClassCard({ classData, onEnroll }: ClassCardProps) {
  // Hooks ở đầu
  const router = useRouter();
  const { user } = useAuth();

  // Handlers
  const handleClick = () => { ... };

  // Early returns (loading, error)
  if (!classData) return <Skeleton />;

  // JSX
  return (
    <Card>...</Card>
  );
}
```

### API Call Pattern

```typescript
// ✅ GOOD: React Query + separate API function
// lib/api/classes.api.ts
export const classesApi = {
  getAll: () => apiClient.get<ApiResponse<ClassDto[]>>('/classes'),
  create: (dto: CreateClassDto) => apiClient.post<ApiResponse<ClassDto>>('/classes', dto),
};

// hooks/useClasses.ts
export function useClasses() {
  return useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.getAll(),
  });
}

// Component
function ClassList() {
  const { data, isLoading } = useClasses();
  ...
}
```

---

## 5. Database Conventions

### Prisma

```prisma
// ✅ camelCase cho field names
model User {
  id        String   @id @default(cuid())
  fullName  String                          // camelCase
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")                            // snake_case cho table name
}
```

### MongoDB (Mongoose)

```typescript
// ✅ snake_case cho MongoDB field names (JSON convention)
const QuestionSchema = new Schema({
  hsk_level: { type: Number, required: true },
  created_by: { type: String, required: true },
  // ...
});

// Virtual để map sang camelCase khi cần:
QuestionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.hskLevel = ret.hsk_level;
    delete ret.hsk_level;
  }
});
```

---

## 6. API Conventions

- **URL**: kebab-case, plural nouns: `/api/v1/classes`, `/api/v1/flash-cards`
- **Version**: Luôn prefix `/api/v1/`
- **Filtering**: Query params: `GET /questions?skill=listening&hskLevel=3&page=1`
- **ID in path**: `GET /classes/:classId` (descriptive, không phải `:id`)
- **Actions**: `POST /classes/:classId/archive` (verb as last segment)
- **Pagination**: `{ data: [...], meta: { total, page, limit, totalPages } }`

---

## 7. Testing Conventions

```typescript
// ✅ Test file naming: [name].spec.ts (unit) / [name].e2e-spec.ts (e2e)
// ✅ Describe theo class/function, it() theo behavior

describe('ClassesService', () => {
  describe('enroll()', () => {
    it('should successfully enroll a student with valid code', async () => { ... });
    it('should throw CLASS_ENROLL_CODE_INVALID when code not found', async () => { ... });
    it('should throw CLASS_ALREADY_ENROLLED when student already enrolled', async () => { ... });
  });
});
```

---

## 8. Environment Variables Naming

```
# ✅ SCREAMING_SNAKE_CASE
DATABASE_URL=...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...

# ✅ Prefix NEXT_PUBLIC_ cho FE-exposed vars
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_APP_NAME=...

# ❌ Không có prefix NEXT_PUBLIC_ → chỉ server-side
JWT_SECRET=...      # Secret! Không bao giờ expose
```
