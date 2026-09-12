import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * WEB-020 — Mobile "More" sheet: nav labels compact by tile width.
 *
 * Runs against a PRODUCTION build (`pnpm --filter web build` + `next start`).
 * Before the fix, three long labels ("Bài tập được giao", "Từ vựng Flashcard",
 * "Mô phỏng công sở") wrapped to two lines inside their tiles, making those
 * grid rows ~20px taller than every other row. Each tile now renders both the
 * full label and the existing short one; a per-tile CSS container query shows
 * whichever fits on a single line.
 *
 * What this proves, at three widths:
 * 1. 375px (the screenshot's viewport): every tile shows its SHORT label and
 *    every tile height is identical — no row stretches.
 * 2. 640px: tiles are wide enough to keep the FULL label, still one uniform
 *    height, and no label wraps to two lines.
 * 3. The swap is per-tile width, not per-viewport media query: at 640px every
 *    tile is wide, so all full labels show.
 *
 * Fixtures: none created — uses the seeded student@hsk.local (dev DB).
 * Run:  pnpm --filter web build && pnpm --filter web test:screens -- sheet-labels
 * (with the API running on :3001 and the seeded DB in place)
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
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
}

async function openMoreSheet(page: Page): Promise<void> {
  await page.goto("/student");
  await page.getByRole("button", { name: "Thêm" }).click();
  const grid = page.locator(".sheet__grid");
  await expect(grid).toBeVisible();
}

/**
 * The core WEB-020 assertions, shared by every width: the tile set carries the
 * expected spelling of each label, and no tile is taller than another.
 */
async function assertUniformTileHeights(page: Page, testInfoName: string, name: string) {
  const heights = await page
    .locator(".sheet__grid > .sheet__item")
    .evaluateAll((tiles) => tiles.map((tile) => Math.round((tile as HTMLElement).offsetHeight)));

  expect(heights.length).toBe(15);
  const distinct = Array.from(new Set(heights));
  // One shared height for every tile is the whole point of the fix; allow none
  // to differ by even a pixel.
  expect(distinct.length, `tile heights at ${name}: [${heights.join(", ")}]`).toBe(1);

  await page.screenshot({ path: join(SCREEN_DIR, `web020-${testInfoName}-${name}.png`) });
  return { height: heights[0] };
}

test.describe("WEB-020 sheet label compaction", () => {
  test("375px: short labels shown, one uniform tile height", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await openMoreSheet(page);

    // The three labels that used to wrap must show their short spelling…
    await expect(page.locator(".sheet__item", { hasText: "Bài tập" }).first()).toBeVisible();
    await expect(page.locator(".sheet__item", { hasText: "Từ vựng" }).first()).toBeVisible();
    await expect(page.locator(".sheet__item", { hasText: "Công sở" }).first()).toBeVisible();

    // …and their full spellings must be display:none inside every tile. The short
    // spelling must also compute to something other than none — the first cut of
    // this test asserted only the hidden half, which let a specificity bug (both
    // spans hidden, icon-only tiles) pass as green. Assert BOTH sides of the swap.
    // The shown value is "block", not the declared "inline": .sheet__item is a flex
    // container, and flex items are blockified (CSS Flexbox §4) — the computed
    // display of any visible span here is block. "none" is never blockified.
    const swap = await page.evaluate(() => {
      const fulls = Array.from(document.querySelectorAll<HTMLElement>(".sheet__label"));
      const shorts = Array.from(document.querySelectorAll<HTMLElement>(".sheet__label--short"));
      return {
        full: Array.from(new Set(fulls.map((el) => getComputedStyle(el).display))),
        short: Array.from(new Set(shorts.map((el) => getComputedStyle(el).display))),
      };
    });
    expect(swap.full).toEqual(["none"]);
    expect(swap.short).toEqual(["block"]);

    await assertUniformTileHeights(page, testInfo.title.replace(/[^a-z0-9]+/gi, "-"), "375px");

    expect(errors).toEqual([]);
  });

  test("640px: full labels restored, still one uniform tile height", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.setViewportSize({ width: 640, height: 900 });
    await openMoreSheet(page);

    // Wide tiles keep the full spelling…
    await expect(
      page.locator(".sheet__item", { hasText: "Bài tập được giao" }).first(),
    ).toBeVisible();
    await expect(page.locator(".sheet__item", { hasText: "Mô phỏng công sở" }).first()).toBeVisible();

    // …the short spelling is the one hidden now (both halves asserted — see the
    // 375px case; the visible value is "block" because flex items are blockified)…
    const swap = await page.evaluate(() => {
      const fulls = Array.from(document.querySelectorAll<HTMLElement>(".sheet__label"));
      const shorts = Array.from(document.querySelectorAll<HTMLElement>(".sheet__label--short"));
      return {
        full: Array.from(new Set(fulls.map((el) => getComputedStyle(el).display))),
        short: Array.from(new Set(shorts.map((el) => getComputedStyle(el).display))),
      };
    });
    expect(swap.full).toEqual(["block"]);
    expect(swap.short).toEqual(["none"]);

    // …and no visible label wraps to a second line.
    const wrapped = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll<HTMLElement>(".sheet__item"));
      return tiles.filter((tile) => tile.offsetHeight > 60).length;
    });
    expect(wrapped).toBe(0);

    const slug = testInfo.title.replace(/[^a-z0-9]+/gi, "-");
    const { height } = await assertUniformTileHeights(page, slug, "640px");
    expect(height).toBeLessThanOrEqual(60);

    expect(errors).toEqual([]);
  });

  test("520px: per-tile swap still keeps every row uniform", async ({ page }, testInfo) => {
    // Between the two: any threshold artifact would show here as mixed spellings
    // and mixed heights. The assertion is not WHICH spelling shows — it is that
    // whichever shows, every tile is one height and no label wraps.
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.setViewportSize({ width: 520, height: 880 });
    await openMoreSheet(page);

    const heights = await page
      .locator(".sheet__grid > .sheet__item")
      .evaluateAll((tiles) => tiles.map((tile) => Math.round((tile as HTMLElement).offsetHeight)));
    const distinct = Array.from(new Set(heights));
    expect(distinct.length, `tile heights at 520px: [${heights.join(", ")}]`).toBe(1);
    expect(distinct[0]).toBeLessThanOrEqual(60);

    await page.screenshot({
      path: join(SCREEN_DIR, `web020-${testInfo.title.replace(/[^a-z0-9]+/gi, "-")}-520px.png`),
    });
    expect(errors).toEqual([]);
  });
});
