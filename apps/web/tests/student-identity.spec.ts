import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * A01 — Student shell/dashboard shows the signed-in account, never the fixture.
 *
 * Regression tests that execute real behavior against the live API + dev DB:
 * real logins (API + the actual /login form), real PATCH /auth/me, real reloads.
 * No mocked auth store anywhere — a mock cannot prove a real login works.
 *
 * Fixtures (dev DB only, created by this file, deleted afterwards by script):
 * - A: student@hsk.local / Password123! (seed, nickname "Em Học Sinh Chăm Chỉ")
 * - B: a01.student@hsk.local / Password123! (registered + approved in setup)
 *
 * Run:  PW_BASE_URL=http://localhost:3100 pnpm --filter web test:screens -- student-identity --workers=1
 * Null-nickname test needs a NULL fixture the API cannot produce (PATCH rejects
 * it), so it is skipped unless A01_NULL=1 with B's nickname nulled in the DB.
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const A = { email: "student@hsk.local", password: "Password123!", nickname: "Em Học Sinh Chăm Chỉ" };
const B = { email: "a01.student@hsk.local", password: "Password123!", nickname: "B Tran Test" };
const FIXTURE_NAME = "Nguyễn Minh Anh";
const NULL_MODE = process.env.A01_NULL === "1";

const IGNORED_CONSOLE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon\.ico/i];

function collectPageErrors(page: Page) {
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

async function apiLogin(page: Page, email: string, password: string): Promise<string> {
  const res = await page.request.post(`${API_BASE}/auth/login`, { data: { email, password } });
  if (!res.ok()) throw new Error(`login failed for ${email}: HTTP ${res.status()}`);
  const body = await res.json();
  return body.data.accessToken as string;
}

async function shot(page: Page, name: string, testInfoName: string) {
  await page.screenshot({ path: join(SCREEN_DIR, `a01-${testInfoName}-${name}.png`) });
}

test.describe("A01 student identity", () => {
  test("1. student A sees their own name everywhere, never the fixture", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page, A.email, A.password);
    await page.goto("/student");
    await expect(page.getByRole("heading", { name: /Chăm Chỉ/ })).toBeVisible();

    // Sidebar userchip + profile sheet.
    await expect(page.locator(".userchip")).toContainText(A.nickname);
    await expect(page.locator(".userchip .avatar").first()).toHaveText("EC");
    await page.locator(".userchip").click();
    await expect(page.getByRole("dialog")).toContainText(A.nickname);

    // The fixture person must not appear anywhere.
    await expect(page.locator("body")).not.toContainText(FIXTURE_NAME);

    await shot(page, "dashboard", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("2. logout then real-form login as B shows B, not A, not the fixture", async ({
    page,
    context,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page, A.email, A.password);
    await page.goto("/student");
    await expect(page.locator(".userchip")).toContainText(A.nickname);

    // Logout = drop the session cookie, then drive the REAL login form.
    await context.clearCookies();
    await page.goto("/login");
    await page.locator("#email").fill(B.email);
    await page.locator("#password").fill(B.password);
    await page.locator(".auth-submit").click();
    await page.goto("/student");
    await expect(page.getByRole("heading", { name: /Tran Test/ })).toBeVisible();
    await expect(page.locator(".userchip")).toContainText(B.nickname);

    const body = await page.locator("body").innerText();
    expect(body).not.toContain(A.nickname);
    expect(body).not.toContain(FIXTURE_NAME);

    await shot(page, "dashboard-b", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("3. hard reload while restoring shows a placeholder, never the fixture", async ({
    page,
  }) => {
    const errors = collectPageErrors(page);
    await apiLogin(page, A.email, A.password);

    // Hold the restore request so `unknown` lasts long enough to observe.
    await page.route("**/auth/refresh", async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });
    await page.goto("/student");

    await expect(page.getByText("Đang tải thông tin tài khoản…").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(FIXTURE_NAME);

    // Restore completes afterwards with the real name, not a stuck skeleton.
    await expect(page.getByRole("heading", { name: /Chăm Chỉ/ })).toBeVisible({ timeout: 15000 });
    expect(errors, "console/page errors").toEqual([]);
  });

  test("4. long Vietnamese name does not break layout", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    const token = await apiLogin(page, B.email, B.password);
    const longName = "Nguyễn Thị Thu Hằng Trần Lê";
    try {
      const res = await page.request.patch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { nickname: longName },
      });
      if (!res.ok()) throw new Error(`PATCH nickname failed: HTTP ${res.status()}`);

      await page.goto("/student");
      // Greeting keeps the last two words only, by design.
      await expect(page.getByRole("heading", { name: /Trần Lê/ })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
      const viewport = testInfo.project.use.viewport?.width ?? 1280;
      expect(overflow, "no horizontal overflow").toBeLessThanOrEqual(viewport);

      await shot(page, "long-name", testInfo.project.name);
    } finally {
      await page.request.patch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { nickname: B.nickname },
      });
    }
    expect(errors, "console/page errors").toEqual([]);
  });

  test("5. missing display name falls back to neutral", async ({ page }) => {
    test.skip(!NULL_MODE, "needs B.nickname = NULL in DB (API rejects null)");
    const errors = collectPageErrors(page);
    await apiLogin(page, B.email, B.password);
    await page.goto("/student");
    await expect(page.locator(".userchip")).toContainText("Học viên");
    await expect(page.locator("body")).not.toContainText(FIXTURE_NAME);
    expect(errors, "console/page errors").toEqual([]);
  });
});
