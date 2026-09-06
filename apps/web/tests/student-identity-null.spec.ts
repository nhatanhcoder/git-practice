import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * A01 test 5 (split file) — missing display name falls back to neutral.
 *
 * Separate file because it needs B.nickname = NULL in the DB, a state the API
 * cannot produce (PATCH /auth/me rejects null) and which would break the other
 * tests in student-identity.spec.ts that assert B's real nickname.
 *
 * Setup (dev DB only, own fixture): NULL the nickname first —
 *   tsx scripts/a01-nick-tmp.ts null   (from apps/api, with dotenv)
 * Run:
 *   PW_BASE_URL=http://localhost:3000 pnpm --filter web test:screens -- student-identity-null --workers=1
 * Afterwards restore + delete B (same script: restore, delete).
 * Skipped unless A01_NULL=1, so normal runs never depend on the fixture.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const B_EMAIL = "a01.student@hsk.local";
const B_PASSWORD = "Password123!";
const FIXTURE_NAME = "Nguyễn Minh Anh";

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

test.describe("A01 student identity (null nickname)", () => {
  test("5. missing display name falls back to neutral", async ({ page }) => {
    test.skip(process.env.A01_NULL !== "1", "needs B.nickname = NULL in DB");
    const errors = collectPageErrors(page);

    const res = await page.request.post(`${API_BASE}/auth/login`, {
      data: { email: B_EMAIL, password: B_PASSWORD },
    });
    if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);

    await page.goto("/student");
    await expect(page.locator(".userchip")).toContainText("Học viên");
    await expect(page.locator("body")).not.toContainText(FIXTURE_NAME);
    expect(errors, "console/page errors").toEqual([]);
  });
});
