import { test, expect, type ConsoleMessage, type Page, type APIRequestContext } from "@playwright/test";
import { join } from "node:path";

/**
 * Sprint 4 DoD slice in a browser — production build, real logins, real API.
 *
 * 1. Student starts an assignment from /student/assignments ("Làm bài"), answers
 *    one MCQ, submits through the confirm modal, lands on the result showing the
 *    partial (MCQ scored, writing pending — never a fake total).
 * 2. Teacher opens the grading drawer from /teacher/grading, scores both answers
 *    (MCQ 1 + essay 0.8), finishes — the draft and the AI original stay separate.
 * 3. Student reloads the result: "Đã chấm xong", total 1.8 / 2, key revealed.
 *
 * Fixtures (dev database only): fixed smk.* accounts (created once, reused —
 * register-then-approve tolerate 409s), one timestamped class + assignment per
 * run joined via the real enrollment code. Leftover rows are timestamp-titled
 * and traceable; the attempt lifecycle e2e (which cleans up after itself) owns
 * the matrix assertions — this spec owns what a person sees.
 *
 * Run with --workers=1: the three tests share one attempt in serial order.
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const STUDENT = { email: "smk.student@hsk.local", password: "Password123!" };
const TEACHER = { email: "smk.teacher@hsk.local", password: "Password123!" };
const IGNORED_CONSOLE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon\.ico/i];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    // The shell bootstraps the session on every anonymous mount: POST
    // /auth/refresh with no cookie answers 401 by design ("no session"), and
    // the browser logs it. Tests attach the collector after login, so this
    // fires only for genuine in-session failures. See word-bank spec, which
    // avoids it by seeding the cookie via API before the first navigation.
    if (/401 \(Unauthorized\)/.test(text) && !loggedIn.get(page)) return;
    errors.push(`console.error: ${text}`);
  });
  page.on("pageerror", (err) => errors.push(`uncaught: ${err.message}`));
  return errors;
}

// Tracks logins per page so the expected anonymous-bootstrap 401 above only
// applies before the test signs in.
const loggedIn = new WeakMap<Page, boolean>();

async function api(request: APIRequestContext, method: string, path: string, token?: string, data?: unknown) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await request.fetch(`${API_BASE}${path}`, { method, headers, data });
  const body = await res.json().catch(() => null);
  return { status: res.status(), body };
}

async function ensureAccount(request: APIRequestContext, email: string, role: string): Promise<void> {
  const reg = await api(request, "POST", "/auth/register", undefined, {
    email,
    password: "Password123!",
    fullName: email,
    role,
  });
  // 201 first run (approve by the returned id); 409 means a previous run left
  // an approved account behind — reused as-is.
  if (reg.status === 201) {
    const admin = await api(request, "POST", "/auth/login", undefined, {
      email: "admin@hsk.local",
      password: "Password123!",
    });
    await api(request, "PATCH", `/admin/users/${reg.body.data.id}/approve`, admin.body.data.accessToken);
  }
}

async function uiLogin(page: Page, email: string, password: string, landing: string | RegExp): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(landing, { timeout: 15_000 });
  loggedIn.set(page, true);
}

let assignmentTitle = "";
let attemptId = "";
let resultUrl = "";

test.describe.serial("sprint 4 DoD in the browser", () => {
  test.beforeAll(async ({ request }) => {
    const stamp = Date.now();
    await ensureAccount(request, TEACHER.email, "teacher");
    await ensureAccount(request, STUDENT.email, "student");

    const login = async (email: string) =>
      (await api(request, "POST", "/auth/login", undefined, { email, password: "Password123!" })).body.data
        .accessToken as string;
    const teacherToken = await login(TEACHER.email);

    const cls = await api(request, "POST", "/teacher/classes", teacherToken, {
      name: `Lớp DoD ${stamp}`,
      hskLevel: 3,
    });
    const classId = cls.body.data.id as string;
    const code = cls.body.data.enrollmentCode as string;
    const studentToken = await login(STUDENT.email);
    await api(request, "POST", "/student/classes/join", studentToken, { enrollmentCode: code });

    const mcq = await api(request, "POST", "/teacher/questions", teacherToken, {
      skill: "reading",
      subType: "multiple_choice_multi",
      hskLevel: 3,
      difficulty: "medium",
      content: { prompt: "选择正确的词。" },
      options: [
        { id: "a", text: "认识" },
        { id: "b", text: "知道" },
      ],
      correctAnswer: ["a"],
    });
    const essay = await api(request, "POST", "/teacher/questions", teacherToken, {
      skill: "writing",
      subType: "essay",
      hskLevel: 3,
      difficulty: "medium",
      content: { prompt: "请介绍你的家庭。", rubric: "Nội dung, từ vựng, ngữ pháp" },
      correctAnswer: null,
    });
    assignmentTitle = `Bài DoD ${stamp}`;
    const asg = await api(request, "POST", "/teacher/assignments", teacherToken, {
      classId,
      title: assignmentTitle,
      type: "homework",
      dueDate: "2026-12-31T17:00:00Z",
      questionIds: [mcq.body.data.id, essay.body.data.id],
      status: "published",
    });
    if (asg.status !== 201) throw new Error(`fixture assignment failed: ${JSON.stringify(asg.body)}`);
  });

  test("student takes the assignment and submits from the browser", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await uiLogin(page, STUDENT.email, STUDENT.password, /\/student/);
    await page.goto("/student/assignments");
    await expect(page.getByText(assignmentTitle).first()).toBeVisible({ timeout: 15_000 });

    const row = page.locator(".panel", { hasText: assignmentTitle }).last();
    await row.getByRole("button", { name: /Làm bài/ }).click();
    await page.waitForURL(/\/student\/attempts\//, { timeout: 15_000 });
    attemptId = page.url().split("/student/attempts/")[1].split("?")[0];
    resultUrl = `/student/attempts/${attemptId}/result`;

    // Answer the MCQ (first option) and leave the essay blank on purpose.
    await page.locator(".attempt-option input").first().check();
    await page.screenshot({ path: join(SCREEN_DIR, `dod-take-${testInfo.project.name}.png`) });

    await page.locator(".attempt-bar button", { hasText: "Nộp bài" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /^Nộp bài$/ }).click();
    await page.waitForURL(/\/result$/, { timeout: 15_000 });

    // Partial, stated as partial: MCQ scored, writing pending, total "—".
    // Exact eyebrow text — the "Đã nộp bài" toast shares the prefix and may
    // still be visible (strict mode would match both).
    await expect(page.getByText("Đã nộp — chờ chấm", { exact: true })).toBeVisible();
    await expect(page.getByText(/chờ giáo viên/)).toBeVisible();
    await expect(errors).toEqual([]);
  });

  test("teacher grades both answers from the drawer", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await uiLogin(page, TEACHER.email, TEACHER.password, /\/teacher/);
    await page.goto("/teacher/grading");
    // Desktop renders the queue table, 375px renders <article> cards instead
    // (same data, CSS-swapped; module class names are hashed in prod, so match
    // by element). Click whichever the viewport shows.
    const tableRow = page.locator("tbody tr", { hasText: assignmentTitle }).first();
    const mobileCard = page.locator("article", { hasText: assignmentTitle }).first();
    const target = (await mobileCard.count()) > 0 && (await mobileCard.isVisible())
      ? mobileCard
      : tableRow;
    await expect(target).toBeVisible({ timeout: 15_000 });
    await target.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    // CSS-module class names are hashed in the production build — locate by
    // element type, in question order (MCQ first, essay second).
    const scoreInputs = drawer.locator('input[type="number"]');
    await expect(scoreInputs.first()).toBeVisible({ timeout: 10_000 });
    await scoreInputs.nth(0).fill("1");
    await scoreInputs.nth(1).fill("0.8");
    await drawer.locator("textarea").first().fill("Tốt, chú ý ngữ pháp.");
    await page.screenshot({ path: join(SCREEN_DIR, `dod-grading-${testInfo.project.name}.png`) });

    await drawer.getByRole("button", { name: /Hoàn thành chấm/ }).click();
    await expect(page.getByText(/hoàn thành chấm/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(errors).toEqual([]);
  });

  test("student sees the graded total and the revealed key", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await uiLogin(page, STUDENT.email, STUDENT.password, /\/student/);
    await page.goto(resultUrl);
    await expect(page.getByText("Đã chấm xong")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("1.8 / 2")).toBeVisible();
    await expect(page.getByText(/Đáp án đúng/)).toBeVisible();
    await page.screenshot({ path: join(SCREEN_DIR, `dod-result-${testInfo.project.name}.png`) });
    await expect(errors).toEqual([]);
  });
});
