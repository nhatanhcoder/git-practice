import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";
import { selectScreens } from "./routes";

/**
 * The screen check every UI commit runs.
 *
 * It is deliberately shallow — it does not assert business rules, which belong in
 * `scripts/*.test.mjs`. What it does is the thing `next build` cannot: load the
 * real page, look for failures that only exist once something is rendered (a
 * screen that throws, a console error, a 375px layout that scrolls sideways) and
 * leave a screenshot behind so a human can see what actually shipped.
 */

/** Screenshots land here, one folder per viewport. Git-ignored; CI uploads them. */
const SCREEN_DIR = join(process.cwd(), "test-results", "screens");

const screens = selectScreens();

/** Next.js and React noise that says nothing about the screen under test. */
const IGNORED_CONSOLE = [/Download the React DevTools/i, /\[Fast Refresh\]/i, /favicon\.ico/i];

function collectPageErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(`console.error: ${text}`);
  });

  page.on("pageerror", (err) => {
    errors.push(`uncaught: ${err.message}`);
  });

  return errors;
}

for (const screen of screens) {
  test(`${screen.area} ${screen.name} — ${screen.path}`, async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);

    const response = await page.goto(screen.path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `HTTP status for ${screen.path}`).toBeLessThan(400);

    // A rendered heading inside the content column is the cheapest proof the screen
    // actually mounted rather than falling into an error boundary that returns 200.
    // Scoped to the `main` landmark on purpose: the Student shell also renders an h1
    // in its mobile bar, which is display:none on desktop and would otherwise make
    // this assertion viewport-dependent. All three areas wrap content in `<main>`.
    const heading = page.locator("main h1").first();
    await expect(heading).toBeVisible();

    // Every path in the manifest is supposed to resolve to real content. The
    // dynamic screens answer a bad id with their own in-page "not found" branch,
    // which still returns 200 and still renders an h1 — so without this the check
    // would happily screenshot a broken lesson route and call it green.
    await expect(heading).not.toHaveText(/Không tìm thấy/i);

    // Let fonts, icons and entry animations settle so the screenshot is not a
    // picture of a half-painted page.
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(400);

    // 375px is in the matrix specifically to catch horizontal overflow — the
    // Foundation screen shipped with it once already.
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(
      overflow.scrollWidth,
      `${screen.path} scrolls horizontally at ${testInfo.project.name} ` +
        `(${overflow.scrollWidth}px of content in a ${overflow.clientWidth}px viewport)`,
    ).toBeLessThanOrEqual(overflow.clientWidth + 1);

    // One predictable path per screen per viewport, so a reviewer can compare the
    // same file across commits instead of hunting through per-run folders.
    const shot = `${screen.area}-${screen.name}.png`;
    const file = join(SCREEN_DIR, testInfo.project.name, shot);
    await page.screenshot({ path: file, fullPage: true });
    await testInfo.attach(`${testInfo.project.name}/${shot}`, { path: file, contentType: "image/png" });

    expect(errors, `${screen.path} logged browser errors`).toEqual([]);
  });
}
