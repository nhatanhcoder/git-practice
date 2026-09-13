import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Word bank (S-SRS-6/7) on the flashcards screen — production build, real login.
 *
 * Covers the two surfaces this slice wired:
 * 1. Browse tab: every vocabulary tile carries a "Lưu từ" button; clicking it saves
 *    through POST /student/word-bank and only then flips to "Đã lưu" (disabled).
 * 2. Bank tab: the saved word appears in the list with a "Bỏ lưu" button; removing it
 *    clears the list back to the honest empty state, and the tile's button re-arms.
 *
 * Fixtures: the seeded student's own bank only — saves and deletes are this account's
 * own rows, which is exactly what the module guarantees it can touch. The hanzi used
 * (书) comes from the imported catalog, so the save always hydrates to a real card.
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

async function cleanBank(page: Page): Promise<void> {
  // Idempotent setup: clear the seeded student's bank so the test starts from a known
  // state. Uses the API itself — the same ownership-scoped rows the test will create.
  const list = await page.request.get(`${API_BASE}/student/word-bank`, {
    headers: { authorization: `Bearer ${await loginToken(page)}` },
  });
  if (!list.ok()) return;
  const rows = (await list.json()).data ?? [];
  for (const row of rows) {
    await page.request.delete(`${API_BASE}/student/word-bank/${row.id}`, {
      headers: { authorization: `Bearer ${await loginToken(page)}` },
    });
  }
}

let cachedToken: string | null = null;
async function loginToken(page: Page): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  cachedToken = (await res.json()).data.accessToken;
  return cachedToken!;
}

test.describe("word bank on the flashcards screen", () => {
  test.beforeEach(() => {
    cachedToken = null;
  });

  test("save from a browse tile, see it in the bank tab, remove it again", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await cleanBank(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/student/flashcards");

    // Browse tab: the first tile's save button exists and is armed.
    const firstTile = page.locator(".srs-tile").first();
    await expect(firstTile).toBeVisible({ timeout: 15_000 });
    const saveBtn = firstTile.locator(".srs-tile__save");
    await expect(saveBtn).toBeEnabled();
    await expect(saveBtn).toContainText("Lưu từ");

    // The hanzi on that tile is what the bank row must name — read it before saving.
    const hanzi = await firstTile.locator(".srs-tile__hanzi").innerText();

    await saveBtn.click();
    await expect(saveBtn).toContainText("Đã lưu", { timeout: 10_000 });
    await expect(saveBtn).toBeDisabled();
    await page.screenshot({
      path: join(SCREEN_DIR, `wbank-saved-${testInfo.project.name}.png`),
    });

    // Bank tab shows the row with the same hanzi.
    await page.getByRole("tab", { name: /Kho từ/ }).click();
    const bankTile = page.locator(".srs-tile").first();
    await expect(bankTile).toBeVisible({ timeout: 10_000 });
    await expect(bankTile.locator(".srs-tile__hanzi")).toHaveText(hanzi.trim());

    // Remove: back to the honest empty state. (EmptyState's title is a styled <p>, not a
    // heading element — match by text.)
    await bankTile.locator("button", { hasText: "Bỏ lưu" }).click();
    await expect(
      page.getByText("Kho từ còn trống"),
    ).toBeVisible({ timeout: 10_000 });

    expect(errors).toEqual([]);
  });

  test("the bank tab shows the honest empty state before any save", async ({ page }) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await cleanBank(page);
    await page.goto("/student/flashcards");
    await page.getByRole("tab", { name: /Kho từ/ }).click();
    await expect(
      page.getByText("Kho từ còn trống"),
    ).toBeVisible({ timeout: 10_000 });
    expect(errors).toEqual([]);
  });
});
