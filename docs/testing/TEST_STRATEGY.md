# 🧪 TESTING_STRATEGY.md — Chiến lược Testing

> **Framework**: Jest (Unit + Integration) + Playwright (E2E)  
> **Target coverage**: 70% cho services

---

## 1. Testing Pyramid

```
        ▲
       /E\         E2E Tests (Playwright)
      /   \        ~10 tests — Critical user flows
     /─────\       Slow, high confidence
    /  INT  \      Integration Tests (Jest + Supertest)
   /─────────\     ~30 tests — API endpoint tests
  /   UNIT    \    Fast, isolated
 /─────────────\   Unit Tests (Jest)
 ───────────────   ~100 tests — Services, utils, algorithms

```

---

## 2. Unit Tests

### Target: Business Logic Services

```
apps/api/src/modules/
├── auth/          → auth.service.spec.ts
├── classes/       → classes.service.spec.ts
├── questions/     → questions.service.spec.ts
├── attempts/      → attempts.service.spec.ts
└── flashcards/    → flashcards.service.spec.ts

lib/
├── srs/           → sm2.spec.ts (pure algorithm)
└── utils/         → code-generator.spec.ts
```

### Template Unit Test

```typescript
// classes.service.spec.ts
describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockDeep<PrismaService>() },
      ],
    }).compile();

    service = module.get(ClassesService);
    prisma = module.get(PrismaService);
  });

  describe('enroll()', () => {
    const mockClass = {
      id: 'class-uuid',
      enrollmentCode: 'ABC12345',
      status: 'active',
      teacherId: 'teacher-uuid',
    };

    it('should successfully enroll student with valid code', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass as any);
      prisma.classEnrollment.findUnique.mockResolvedValue(null);
      prisma.classEnrollment.create.mockResolvedValue({ id: 'enroll-uuid' } as any);

      const result = await service.enroll('ABC12345', 'student-uuid');
      expect(result).toBeDefined();
      expect(prisma.classEnrollment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ studentId: 'student-uuid' }) })
      );
    });

    it('should throw CLASS_ENROLL_CODE_INVALID when code not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);
      await expect(service.enroll('INVALID', 'student-uuid'))
        .rejects.toMatchObject({ code: 'CLASS_ENROLL_CODE_INVALID' });
    });

    it('should throw CLASS_ALREADY_ENROLLED when student already enrolled', async () => {
      prisma.class.findFirst.mockResolvedValue(mockClass as any);
      prisma.classEnrollment.findUnique.mockResolvedValue({ id: 'existing' } as any);
      await expect(service.enroll('ABC12345', 'student-uuid'))
        .rejects.toMatchObject({ code: 'CLASS_ALREADY_ENROLLED' });
    });

    it('should throw CLASS_ALREADY_ARCHIVED when class is archived', async () => {
      prisma.class.findFirst.mockResolvedValue({ ...mockClass, status: 'archived' } as any);
      await expect(service.enroll('ABC12345', 'student-uuid'))
        .rejects.toMatchObject({ code: 'CLASS_ALREADY_ARCHIVED' });
    });
  });
});
```

### Critical Unit Tests

| Service | Methods to test |
|---------|----------------|
| `auth.service` | `register`, `login`, `refresh`, `logout` |
| `classes.service` | `create`, `enroll`, `generateEnrollmentCode` |
| `attempts.service` | `submit`, `autoGrade`, `checkAndFinalizeGrading` |
| `flashcards.service` | `submitReview`, `getReviewQueue` |
| `sm2` lib | `calculateSM2` (all ratings, edge cases) |

---

## 3. Integration Tests

### API Endpoint Tests (Supertest)

```typescript
// auth.e2e-spec.ts (using Supertest)
describe('Auth Endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],  // Full app với real DB (test DB)
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  describe('POST /auth/register', () => {
    it('should return 201 with valid data', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@test.com', password: 'Test1234!', fullName: 'Test User', role: 'student' })
        .expect(201)
        .expect(res => {
          expect(res.body.success).toBe(true);
        });
    });

    it('should return 409 when email already exists', async () => {
      // Create user first
      await request(app.getHttpServer()).post('/auth/register').send({ email: 'dup@test.com', ... });
      // Try again
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', ... })
        .expect(409);
    });
  });
});
```

### Critical Flow Tests

| Flow | Endpoints |
|------|-----------|
| Auth flow | Register → Login → Refresh → Logout |
| Class flow | Create class → Enroll student → List students |
| Exam flow | Create assignment → Start attempt → Save answers → Submit → View results |
| Grading flow | Submit writing → Teacher grade → Student notified |
| SRS flow | Add flashcard → Review queue → Submit rating → Next date |

---

## 4. E2E Tests (Playwright)

### Critical User Journeys

```typescript
// e2e/student-exam.spec.ts
test('Student completes an exam', async ({ page }) => {
  // 1. Login as student
  await page.goto('/login');
  await page.fill('#email', 'student@test.com');
  await page.fill('#password', 'password');
  await page.click('#login-button');
  await expect(page).toHaveURL('/student');

  // 2. Navigate to class
  await page.click('[data-testid="class-card-0"]');
  await expect(page).toHaveURL(/\/student\/classes\/.*/);

  // 3. Open assignment
  await page.click('[data-testid="assignment-0"]');
  await page.click('#start-exam-button');

  // 4. Answer MCQ question
  await page.click('[data-testid="option-A"]');
  await expect(page.locator('[data-testid="autosave-indicator"]')).toContainText('Đã lưu');

  // 5. Submit
  await page.click('#submit-button');
  await page.click('#confirm-submit');
  await expect(page).toHaveURL(/\/student\/results\/.*/);
  await expect(page.locator('[data-testid="total-score"]')).toBeVisible();
});
```

### E2E Scenarios

| Scenario | Actor | Steps |
|---------|-------|-------|
| `auth.spec.ts` | All | Register, login, logout |
| `admin-approve.spec.ts` | Admin | Approve pending user |
| `teacher-create-class.spec.ts` | Teacher | Create class, get enrollment code |
| `student-exam.spec.ts` | Student | Join class, do exam, see results |
| `teacher-grade.spec.ts` | Teacher | Grade writing submission |
| `student-flashcard.spec.ts` | Student | SRS review session |

---

## 5. Test Database Setup

```bash
# Tạo test database riêng (không dùng production)
# .env.test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hsk_test"
MONGODB_URI="mongodb://localhost:27017/hsk-test"

# Reset và seed trước mỗi test suite
beforeAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE users, classes CASCADE`;
  await seedTestData(prisma);
});
```

---

## 6. Running Tests

```bash
# Unit tests
cd apps/api
pnpm test                    # Run once
pnpm test:watch              # Watch mode
pnpm test:cov                # With coverage report

# Integration tests
pnpm test:e2e                # Supertest (API)

# E2E (Playwright)
cd apps/web
pnpm playwright install      # Install browsers
pnpm test:e2e                # Run all E2E
pnpm test:e2e --ui           # Open Playwright UI

# Coverage report
open coverage/lcov-report/index.html
```

---

## 7. Coverage Goals

| Layer | Target | Current |
|-------|--------|---------|
| Services (critical) | 80% | - |
| Services (all) | 70% | - |
| Utils / Lib | 90% | - |
| Controllers | 50% | - |
| Total | 65% | - |
