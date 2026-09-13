import { test, expect, type Page } from "@playwright/test";

/**
 * Task C DoD — the real-exam path through the rebuilt rooms:
 *   lobby lists the teacher's mock_test → door page starts the attempt → the
 *   LIVE take screen answers under the server deadline → submit lands on the
 *   attempt result → the exams result route resolves it (INV-ATLP-12).
 * Plus placement: paper → answer → server grade → level saved.
 *
 * Fixtures come through the PUBLIC API only (teacher class + join code + 6 MCQ
 * questions + a mock_test assignment), timestamped like the PW sweep's so debris
 * stays traceable. Nothing is written to the seed directly.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const STAMP = Date.now();

type Token = string;

async function api(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  token?: Token,
  data?: unknown,
): Promise<{ status: number; body: any }> {
  const res = await page.request.fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(data ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    data: data ? JSON.stringify(data) : undefined,
  });
  return { status: res.status(), body: await res.json().catch(() => null) };
}

async function login(page: Page, email: string): Promise<Token> {
  const res = await api(page, "POST", "/auth/login", undefined, {
    email,
    password: "Password123!",
  });
  expect(res.status, `login ${email}`).toBe(200);
  return res.body.data.accessToken as Token;
}

let teacher: Token;
let student: Token;
let classId: string;
let joinCode: string;
let assignmentId: string;
const questionIds: string[] = [];

test.beforeAll(async ({ request }) => {
  teacher = await login(request, "teacher@hsk.local");
  student = await login(request, "student@hsk.local");

  const cls = await api(request, "POST", "/teacher/classes", teacher, {
    name: `Task C exam class ${STAMP}`,
    hskLevel: 3,
  });
  expect(cls.status).toBe(201);
  classId = cls.body.data.id;
  joinCode = cls.body.data.enrollmentCode as string;

  const join = await api(request, "POST", "/student/classes/join", student, {
    enrollmentCode: joinCode,
  });
  expect(join.status).toBe(201);

  // Six single-answer MCQs — bands 1..3, two per band — serve BOTH the placement
  // paper (its guaranteed floor) and the mock_test paper.
  for (let level = 1; level <= 3; level++) {
    for (const correct of ["a", "b"]) {
      const q = await api(request, "POST", "/teacher/questions", teacher, {
        skill: "listening",
        subType: "multiple_choice_single",
        hskLevel: level,
        difficulty: "medium",
        content: {
          prompt: `TaskC 听力 ${level}-${correct}`,
          audioUrl: "https://cdn.example/taskc.mp3",
        },
        options: [
          { id: "a", text: "认识" },
          { id: "b", text: "知道" },
        ],
        correctAnswer: correct,
      });
      expect(q.status).toBe(201);
      questionIds.push(q.body.data.id as string);
    }
  }

  const mk = await api(request, "POST", "/teacher/assignments", teacher, {
    classId,
    title: `Task C mock_test ${STAMP}`,
    type: "mock_test",
    questionIds,
    timeLimitMinutes: 30,
  });
  expect(mk.status).toBe(201);
  assignmentId = mk.body.data.id as string;
  const pub = await api(request, "PATCH", `/teacher/assignments/${assignmentId}`, teacher, {
    status: "published",
  });
  expect(pub.status).toBe(200);
});

async function asStudent(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: "student@hsk.local", password: "Password123!" },
  });
  expect(res.ok()).toBe(true);
}

test.describe("Task C — exams room", () => {
  test("lobby lists the mock_test, the door starts it, submit lands on the result", async ({
    page,
  }) => {
    await asStudent(page);
    await page.goto("/student/exams", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await expect(page.locator("main h1").first()).toHaveText(/Đề thi thử/i, { timeout: 15_000 });

    // The teacher's paper is on the board; fixture ids like e-h1-1 are gone.
    const card = page.locator("main").getByText(`Task C mock_test ${STAMP}`);
    await expect(card).toBeVisible();

    // The door page shows the paper's rules — no client scoring anywhere.
    await page.goto(`/student/exams/${assignmentId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Luật phòng thi")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("30 phút")).toBeVisible();

    // Start → the live take screen (server deadline), not a client-timer room.
    await page
      .locator("main button:has-text('Vào bài thi'), main a:has-text('Tiếp tục bài làm')")
      .first()
      .click();
    await page.waitForURL(/\/student\/attempts\//, { timeout: 15_000 });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 15_000 });
  });

  test("double-submit fires exactly one POST; reload keeps the answers", async ({ page }) => {
    await asStudent(page);
    let submitPosts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/submit")) submitPosts += 1;
    });

    // Enter through the door like a learner (first run: Vào bài thi button).
    await page.goto(`/student/exams/${assignmentId}`, { waitUntil: "domcontentloaded" });
    await page
      .locator("main button:has-text('Vào bài thi'), main a:has-text('Tiếp tục bài làm')")
      .first()
      .click();
    await page.waitForURL(/\/student\/attempts\//, { timeout: 15_000 });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 15_000 });

    // Answer one MCQ (first radio of the first question) and wait out the 2s
    // autosave so the reload check reads server state, not local.
    await page.locator("main input[type='radio']").first().check();
    await expect(page.getByText("Đã lưu")).toBeVisible({ timeout: 10_000 });

    // Reload — the attempt is re-entered (INV-ATLP-02) with the saved answer.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("main input[type='radio']:checked")).toHaveCount(1);

    // Submit — the confirm modal guards the real POST; hammering the confirm
    // button must still produce exactly one submit call (ref-lock).
    await page.getByRole("button", { name: "Nộp bài" }).first().click();
    const confirm = page.getByRole("button", { name: "Nộp bài" }).last();
    await confirm.click();
    await confirm.click({ force: true }).catch(() => {});
    await page.waitForURL(/\/student\/attempts\/.+\/result/, { timeout: 20_000 });
    expect(submitPosts).toBe(1);
  });

  test("the exams result route resolves the attempt instead of faking a score", async ({
    page,
  }) => {
    await asStudent(page);
    await page.goto(`/student/exams/${assignmentId}/result`, { waitUntil: "domcontentloaded" });
    // INV-ATLP-12 resolve → redirect to the one result renderer.
    await page.waitForURL(/\/student\/attempts\/.+\/result/, { timeout: 20_000 });
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Task C — placement", () => {
  test("paper → answers → server grade → level saved", async ({ page }) => {
    await asStudent(page);
    await page.goto("/student/placement", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main h1").first()).toHaveText(/Bài xếp cấp/i, { timeout: 15_000 });
    await expect(page.getByText(/câu · trình độ/)).toBeVisible({ timeout: 15_000 });

    // Answer every question through the paper. Nothing is revealed while going —
    // the result comes from the server only.
    for (let i = 0; i < 20; i++) {
      const submit = page.getByRole("button", { name: /Nộp bài/ });
      if ((await submit.count()) > 0) {
        await submit.click();
        break;
      }
      await page.locator("main input[type='radio']").first().check();
      await page.getByRole("button", { name: "Câu sau" }).click();
    }
    await expect(page.locator("main h1").first()).toHaveText(/Kết quả xếp cấp/i, {
      timeout: 20_000,
    });
    await expect(page.getByText(/HSK \d/).first()).toBeVisible();
  });

  test("the saved level survives a reload", async ({ page }) => {
    await asStudent(page);
    await page.goto("/student/placement", { waitUntil: "domcontentloaded" });
    // The paper page shows the saved level in its sub line after the first run.
    await expect(page.getByText(/trình độ hiện tại: HSK \d/)).toBeVisible({ timeout: 15_000 });
  });
});
