import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Foundation (S-SELF-2) — production build, real login, live catalog.
 *
 * 1. The hub loads the real corpus (21 initials, tone cards drawn from source
 *    coordinates, 214 radicals) — no UnavailableState gate, no mock switcher.
 * 2. Marking a sound studied survives a full reload (server round-trip, not
 *    browser-local state), and unmarking restores the exact prior state.
 * 3. Deep links restore tabs; radicals search filters; listening/speaking/PDF
 *    controls are honestly disabled (no audio/files by design, D4).
 *
 * Fixture hygiene: every mark is toggled twice, so the seeded student's
 * progress is identical before and after the run.
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const STUDENT = { email: "student@hsk.local", password: "Password123!" };
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

async function apiLogin(page: Page): Promise<void> {
  // page.request shares the browser context's cookies: /auth/login drops the
  // httpOnly refresh cookie, and the app restores the session from it on goto.
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
}

test.describe("foundation hub on the live catalog", () => {
  test("loads the real corpus with honest progress, no mock gate", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/foundation");

    await expect(
      page.getByRole("heading", { name: "Gốc rễ tiếng Trung" }),
    ).toBeVisible({ timeout: 15_000 });
    // The production UnavailableState gate is gone for this route.
    await expect(page.getByText("chưa được kết nối máy chủ")).toHaveCount(0);
    // 21 initials + 36 finals render from the catalog on the pinyin tab.
    await expect(page.getByText("21 thanh mẫu").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".sound-cell")).toHaveCount(57, { timeout: 10_000 });
    // Progress overview shows real counts, never placeholder percentages.
    await expect(page.getByText("đã học").first()).toBeVisible();
    await page.screenshot({
      path: join(SCREEN_DIR, `foundation-ready-${testInfo.project.name}.png`),
    });

    expect(errors).toEqual([]);
  });

  test("marking a sound survives reload, unmarking restores state", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/foundation");
    // Desktop and mobile-375 run concurrently against the same seeded account:
    // each project toggles its own sound so the two runs cannot flip one row.
    const cellIndex = testInfo.project.name === "mobile-375" ? 1 : 0;
    const targetCell = page.locator(".sound-cell").nth(cellIndex);
    await expect(targetCell).toBeVisible({ timeout: 15_000 });

    // Anchor on the sound label, not the cell index: catalog order is source
    // order (pedagogical, not sorted), so re-query by sound after reload.
    const sound = await targetCell.locator(".sound-cell__p").innerText();
    const isMarked = () =>
      page.evaluate((label) => {
        const cells = [...document.querySelectorAll(".sound-cell")];
        const cell = cells.find(
          (el) => el.querySelector(".sound-cell__p")?.textContent?.trim() === label.trim(),
        );
        return cell?.classList.contains("is-mastered") ?? null;
      }, sound);

    const wasMarked = await isMarked();
    await targetCell.click();
    await expect.poll(isMarked, { timeout: 10_000 }).toBe(!wasMarked);

    // Full reload: the flip must come back from the server, not the tab.
    await page.reload();
    await expect(page.locator(".sound-cell").first()).toBeVisible({ timeout: 15_000 });
    await expect.poll(isMarked, { timeout: 15_000 }).toBe(!wasMarked);

    // Restore: toggle back so the seeded account is untouched.
    await page.evaluate((label) => {
      const cells = [...document.querySelectorAll<HTMLButtonElement>(".sound-cell")];
      cells
        .find((el) => el.querySelector(".sound-cell__p")?.textContent?.trim() === label.trim())
        ?.click();
    }, sound);
    await expect.poll(isMarked, { timeout: 10_000 }).toBe(wasMarked);

    expect(errors).toEqual([]);
  });

  test("deep links, radicals search, and honestly-disabled media", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/foundation?tab=radicals");
    await expect(page.locator(".radical-cell").first()).toBeVisible({
      timeout: 15_000,
    });
    await page.getByLabel("Tìm bộ thủ").fill("水");
    await expect(page.locator(".radical-cell__char", { hasText: "水" })).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/student/foundation?tab=listening");
    const listenBtn = page.getByRole("button", { name: /Nghe \(chưa có audio\)/ }).first();
    await expect(listenBtn).toBeVisible({ timeout: 10_000 });
    await expect(listenBtn).toBeDisabled();

    await page.goto("/student/foundation?tab=speaking");
    const recordBtn = page.getByRole("button", { name: /Ghi âm \(chưa có\)/ }).first();
    await expect(recordBtn).toBeVisible({ timeout: 10_000 });
    await expect(recordBtn).toBeDisabled();
    await page.screenshot({
      path: join(SCREEN_DIR, `foundation-speaking-${testInfo.project.name}.png`),
    });

    expect(errors).toEqual([]);
  });
});
