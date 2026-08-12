# 📏 CONVENTIONS.md — Code & Git Conventions

> **Applies to**: the entire project (FE + BE)  
> **Updated**: 2026-07-09

---

## 1. Git Conventions

### Branch Strategy

```
main          → Production-ready code (protected)
develop       → Integration branch
│
├── feature/  → New features
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
  feat     → A new feature
  fix      → A bug fix
  docs     → Documentation changes
  style    → Formatting (no logic change)
  refactor → Refactoring
  test     → Adding/updating tests
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
## Description
[Brief description of the change]

## Sprint Task
- [ ] Closes #S1-03 (Task ID from TASK_BOARD.md)

## Type of change
- [ ] feat: a new feature
- [ ] fix: a bug fix
- [ ] refactor

## Checklist
- [ ] Code is linted (`pnpm lint`)
- [ ] TypeScript has no errors (`pnpm type-check`)
- [ ] Tests written/updated
- [ ] Swagger docs updated (if a new API was added)
- [ ] .env.example updated (if a new env var was added)
```

---

## 2. TypeScript Conventions

```typescript
// ✅ GOOD: Explicit types, no any
interface CreateClassDto {
  name: string;
  hskLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  description?: string;
}

// ❌ BAD: Avoid any
function processData(data: any) { ... }

// ✅ GOOD: Use enums for fixed values
enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  STUDENT = 'student',
}

// ✅ GOOD: Explicit return types on services
async findById(id: string): Promise<User | null> { ... }

// ✅ GOOD: Destructure with types
const { id, role }: JwtPayload = req.user;
```

---

## 3. NestJS Conventions

### Module Structure

```typescript
// Every feature module follows exactly this structure:
modules/
└── classes/
    ├── classes.module.ts        // @Module decorator
    ├── classes.controller.ts    // HTTP handlers only
    ├── classes.service.ts       // Business logic
    ├── classes.repository.ts    // DB queries (optional, when complex)
    └── dto/
        ├── create-class.dto.ts
        ├── update-class.dto.ts
        └── enroll-class.dto.ts
```

### Controller Rules

```typescript
@Controller('classes')
@ApiTags('Classes')                           // Swagger group
@UseGuards(JwtAuthGuard, RolesGuard)          // Auth guard always at controller level
export class ClassesController {

  @Post()
  @Roles('teacher')                           // Role at method level
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, type: ClassResponseDto })
  async create(
    @Body() dto: CreateClassDto,              // DTO with validation
    @CurrentUser() user: JwtPayload,          // User from the JWT
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

  // ✅ Throw a BusinessException; never return null for not-found
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
// ✅ GOOD: Props interface before the component
interface ClassCardProps {
  classData: ClassDto;
  onEnroll?: () => void;
}

export function ClassCard({ classData, onEnroll }: ClassCardProps) {
  // Hooks first
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
// ✅ camelCase for field names
model User {
  id        String   @id @default(cuid())
  fullName  String                          // camelCase
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")                            // snake_case for the table name
}
```

### MongoDB (Mongoose)

```typescript
// ✅ snake_case for MongoDB field names (JSON convention)
const QuestionSchema = new Schema({
  hsk_level: { type: Number, required: true },
  created_by: { type: String, required: true },
  // ...
});

// A virtual maps back to camelCase where needed:
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
- **Version**: always prefixed `/api/v1/`
- **Filtering**: Query params: `GET /questions?skill=listening&hskLevel=3&page=1`
- **ID in path**: `GET /classes/:classId` (descriptive, not `:id`)
- **Actions**: `POST /classes/:classId/archive` (verb as last segment)
- **Pagination**: `{ data: [...], meta: { total, page, limit, totalPages } }`

---

## 7. Testing Conventions

```typescript
// ✅ Test file naming: [name].spec.ts (unit) / [name].e2e-spec.ts (e2e)
// ✅ describe() per class/function, it() per behavior

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

# ✅ Prefix NEXT_PUBLIC_ for frontend-exposed vars
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_APP_NAME=...

# ❌ No NEXT_PUBLIC_ prefix → server-side only
JWT_SECRET=...      # Secret! Never expose it
```
