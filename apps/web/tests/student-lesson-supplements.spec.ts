import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_ID = "22222222-2222-4222-8222-222222222222";
const EMPTY_LESSON_ID = "33333333-3333-4333-8333-333333333333";
const IGNORED_CONSOLE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon\.ico/i];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });
  page.on("pageerror", (err) => errors.push(`uncaught: ${err.message}`));
  return errors;
}

async function mockStudentSession(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/refresh", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { accessToken: "p7-student-token" } }),
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: "p7-student",
          email: "p7.student@hsk.local",
          nickname: "Học viên P7",
          role: "student",
          status: "active",
        },
      }),
    }),
  );
  await page.route("**/api/v1/notifications/unread-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { count: 0 } }),
    }),
  );
}

test.describe("student lesson supplements", () => {
  test.beforeEach(async ({ page }) => {
    await mockStudentSession(page);
    await page.route(`**/api/v1/student/classes/${CLASS_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: CLASS_ID, name: "Lớp HSK 2 buổi tối" } }),
      }),
    );
    await page.route(`**/api/v1/student/classes/${CLASS_ID}/lessons/${EMPTY_LESSON_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: EMPTY_LESSON_ID,
            title: "Bài không có nội dung bổ trợ",
            description: null,
            contentType: "text",
            contentUrl: null,
            orderIndex: 1,
            createdAt: "2026-09-26T00:00:00.000Z",
            supplements: [],
          },
        }),
      }),
    );
    await page.route(`**/api/v1/student/classes/${CLASS_ID}/lessons/${LESSON_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: LESSON_ID,
            title: "Ôn tập tuần 1",
            description: "Ôn lại từ vựng và mẫu câu đã học.",
            contentType: "text",
            contentUrl: null,
            orderIndex: 0,
            createdAt: "2026-09-26T00:00:00.000Z",
            supplements: [
              {
                id: "supp-grammar",
                sourceType: "grammar_point",
                sourceKey: "g-hsk2-ba",
                orderIndex: 2,
                title: "Câu chữ 把",
                available: true,
              },
              {
                id: "supp-unit",
                sourceType: "learning_unit",
                sourceKey: "hsk2-workplace",
                orderIndex: 1,
                title: "Giao tiếp công sở",
                available: true,
              },
              {
                id: "supp-dead",
                sourceType: "learning_unit",
                sourceKey: "secret-dead-source",
                orderIndex: 3,
                title: null,
                available: false,
              },
            ],
          },
        }),
      }),
    );
  });

  test("renders server order, correct destinations and an honest unavailable row", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await page.goto(`/student/classes/${CLASS_ID}/lessons/${LESSON_ID}`);
    await expect(page.getByRole("heading", { name: "Ôn tập tuần 1" })).toBeVisible();

    const panel = page.getByRole("heading", { name: "Nội dung bổ trợ" }).locator("..");
    const rows = panel.locator("li");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("Giao tiếp công sở");
    await expect(rows.nth(1)).toContainText("Câu chữ 把");
    await expect(rows.nth(2)).toContainText("Nội dung này hiện không khả dụng");
    await expect(rows.nth(0).getByRole("link")).toHaveAttribute(
      "href",
      "/student/learning-path/hsk2-workplace",
    );
    await expect(rows.nth(1).getByRole("link")).toHaveAttribute(
      "href",
      "/student/grammar?point=g-hsk2-ba",
    );
    await expect(rows.nth(2).getByRole("link")).toHaveCount(0);
    await expect(rows.nth(2)).not.toContainText("secret-dead-source");

    await page.screenshot({
      path: join(SCREEN_DIR, `lesson-supplements-${testInfo.project.name}.png`),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("renders a successful empty supplement state", async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto(`/student/classes/${CLASS_ID}/lessons/${EMPTY_LESSON_ID}`);
    await expect(
      page.getByText("Giáo viên chưa gắn nội dung bổ trợ nào cho bài học này.", { exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
});
