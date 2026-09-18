import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Student nav restructure (2026-09-18 plan) — production build, real login.
 *
 * 1. Desktop rail shows Trang chủ + exactly three groups (Lớp học / Tự luyện /
 *    Kho kiến thức) in order; the five account routes live ONLY in the avatar
 *    menu, not the rail; every rail link navigates (active state follows).
 * 2. The avatar menu opens from the rail userchip (desktop) and the mobilebar
 *    avatar (mobile): identity header, a real streak row (SRS stats endpoint —
 *    a number or "—", never a mock), and the five account links, each landing
 *    on its route. Escape closes with focus restored to the trigger.
 * 3. Mobile "Thêm" sheet lists the same three groups; 375px has no horizontal
 *    overflow on rail, sheet, or avatar menu.
 *
 * Fixtures: none created — uses the seeded student@hsk.local (dev DB).
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const STUDENT = { email: "student@hsk.local", password: "Password123!" };
const IGNORED_CONSOLE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon\.ico/i];

const ACCOUNT_LINKS: Array<[string, string]> = [
  ["Sổ tay lỗi sai", "/student/mistakes"],
  ["Tiến độ học tập", "/student/progress"],
  ["Kho huy hiệu", "/student/badges"],
  ["Bảng xếp hạng", "/student/leaderboard"],
  ["Hóa đơn học phí", "/student/invoices"],
];

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

async function apiLogin(page: Page): Promise<void> {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
}

test.describe("student nav restructure", () => {
  test("desktop rail groups in order; account routes only in avatar", async ({
    page,
  }, testInfo) => {
    test.skip(
      (testInfo.project.use.viewport?.width ?? 1280) < 768,
      "rail is desktop-only",
    );
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student");

    const rail = page.locator(".rail__nav");
    await expect(rail).toBeVisible({ timeout: 15_000 });
    await expect(rail.locator(".rail__group")).toHaveText(
      ["Lớp học", "Tự luyện", "Kho kiến thức"],
      { timeout: 10_000 },
    );
    // Moved routes must not remain in the rail.
    for (const href of [
      "/student/mistakes",
      "/student/progress",
      "/student/badges",
      "/student/leaderboard",
      "/student/invoices",
    ]) {
      await expect(rail.locator(`a[href="${href}"]`)).toHaveCount(0);
    }
    // Self-study practice entry added by this restructure.
    await expect(rail.locator('a[href="/student/placement"]')).toHaveCount(1);

    // Every rail link navigates and the active state follows.
    await rail.locator('a[href="/student/grammar"]').click();
    await expect(page).toHaveURL(/\/student\/grammar/);
    await expect(rail.locator('a[href="/student/grammar"]')).toHaveClass(/is-active/);

    await page.screenshot({
      path: join(SCREEN_DIR, `nav-rail-${testInfo.project.name}.png`),
    });
    expect(errors).toEqual([]);
  });

  test("avatar menu: real streak, five links, Escape restores focus", async ({
    page,
  }, testInfo) => {
    test.skip(
      (testInfo.project.use.viewport?.width ?? 1280) < 768,
      "rail userchip is desktop-only",
    );
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student");

    const trigger = page.locator(".userchip");
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await trigger.click();
    const menu = page.locator(".sheet", { hasText: "Hồ sơ học viên" });
    await expect(menu).toBeVisible({ timeout: 10_000 });

    // Real streak row: a number from the SRS stats endpoint, or "—" when the
    // server knows nothing — never a mock, never a spinner left behind.
    const streakRow = menu.getByLabel("Chuỗi ngày học");
    await expect(streakRow).toBeVisible({ timeout: 10_000 });
    await expect(streakRow.locator(".num")).toHaveText(/^(\d+|—)$/, { timeout: 10_000 });

    for (const [label, href] of ACCOUNT_LINKS) {
      await expect(menu.locator(`a[href="${href}"]`, { hasText: label })).toHaveCount(1);
    }
    // One link actually lands.
    await menu.locator('a[href="/student/progress"]').click();
    await expect(page).toHaveURL(/\/student\/progress/);

    // Escape closes and focus returns to the trigger.
    await page.goto("/student");
    await page.locator(".userchip").click();
    await expect(page.locator(".sheet", { hasText: "Hồ sơ học viên" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sheet", { hasText: "Hồ sơ học viên" })).toBeHidden();
    await expect(page.locator(".userchip")).toBeFocused();

    await page.screenshot({
      path: join(SCREEN_DIR, `nav-avatar-${testInfo.project.name}.png`),
    });
    expect(errors).toEqual([]);
  });

  test("mobile sheet groups, avatar, and 375px no-overflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      (testInfo.project.use.viewport?.width ?? 1280) >= 768,
      "mobile-only",
    );
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student");

    // Topbar streak HUD is gone; the avatar opens the account menu instead.
    await expect(page.locator(".mobilebar .hud__stat--streak")).toHaveCount(0);
    await page.locator(".mobilebar button[aria-haspopup='dialog']").click();
    const menu = page.locator(".sheet", { hasText: "Hồ sơ học viên" });
    await expect(menu).toBeVisible({ timeout: 10_000 });
    await expect(
      menu.getByLabel("Chuỗi ngày học").locator(".num"),
    ).toHaveText(/^(\d+|—)$/, { timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();

    // "Thêm" sheet carries the same three groups, no account links.
    await page.getByRole("button", { name: "Thêm" }).click();
    const sheet = page.locator(".sheet", { hasText: "Tất cả khu vực học" });
    await expect(sheet).toBeVisible({ timeout: 10_000 });
    await expect(sheet.locator(".rail__group")).toHaveText(
      ["Lớp học", "Tự luyện", "Kho kiến thức"],
      { timeout: 10_000 },
    );
    await expect(sheet.locator('a[href="/student/progress"]')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow, "no 375px horizontal overflow with the sheet open").toBe(true);
    await page.screenshot({
      path: join(SCREEN_DIR, `nav-mobile-${testInfo.project.name}.png`),
    });
    expect(errors).toEqual([]);
  });
});
