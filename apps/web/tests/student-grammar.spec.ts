import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Grammar library (S-SELF-3) — production build, real login, live catalog.
 *
 * 1. The hub loads the server catalog (HSK chips, source categories, no mock
 *    gate, no UnavailableState, no mastery ring).
 * 2. Mark-studied survives a full reload (server round-trip) and unmarking
 *    restores the exact prior state.
 * 3. The reorder drill grades server-side: submitting shows confirmed
 *    feedback with the expected order, and a second fresh submit bumps the
 *    server-derived "Đã luyện N lần" counter.
 *
 * Fixture hygiene: studied toggles are paired (account restored). Practice
 * submits are timestamped by server time and keyed by fresh submissionIds, so
 * reruns never collide; the seeded student's leftover attempt rows are
 * accepted debris (documented policy — counts only, no PII, no cross-test
 * reads depend on them).
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_V1 = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
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
  const res = await page.request.post(`${API_V1}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
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
  await page.route("**/api/v1/student/grammar/progress", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { studied: [], practice: [] } }),
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

test.describe("grammar library on the live catalog", () => {
  test("loads the server catalog with honest states", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/grammar");

    await expect(
      page.getByRole("heading", { name: "Ngữ pháp HSK 1 – 9" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("chưa được kết nối máy chủ")).toHaveCount(0);
    const firstCard = page.locator(".gcard").first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await expect(firstCard.locator(".chip").first()).toContainText(/HSK [1-9]/);
    await page.screenshot({
      path: join(SCREEN_DIR, `grammar-ready-${testInfo.project.name}.png`),
    });

    expect(errors).toEqual([]);
  });

  test("mark-studied survives reload, unmarking restores state", async ({ page }) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/grammar?hskLevel=1");
    const firstCard = page.locator(".gcard").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    const cardName = await firstCard.locator(".gcard__name").innerText();

    const chipInCard = (name: string) =>
      page.evaluate((label) => {
        const cards = Array.from(document.querySelectorAll(".gcard"));
        const card = cards.find(
          (el) => el.querySelector(".gcard__name")?.textContent?.trim() === label.trim(),
        );
        return card?.textContent?.includes("Đã học") ?? null;
      }, name);

    const wasMarked = await chipInCard(cardName);
    await firstCard.click();
    const toggle = page.getByRole("button", { name: /Đánh dấu đã học|Bỏ đánh dấu/ });
    await expect(toggle).toBeVisible({ timeout: 10_000 });
    await toggle.click();
    await expect
      .poll(() => chipInCard(cardName), { timeout: 10_000 })
      .toBe(!wasMarked);

    await page.reload();
    await expect(page.locator(".gcard").first()).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => chipInCard(cardName), { timeout: 15_000 }).toBe(!wasMarked);

    const card = page
      .locator(".gcard", { has: page.locator(".gcard__name", { hasText: cardName }) })
      .first();
    await card.click();
    const toggleBack = page.getByRole("button", { name: /Đánh dấu đã học|Bỏ đánh dấu/ });
    await expect(toggleBack).toBeVisible({ timeout: 10_000 });
    await toggleBack.click();
    await expect.poll(() => chipInCard(cardName), { timeout: 10_000 }).toBe(wasMarked);

    expect(errors).toEqual([]);
  });

  test("reorder drill grades server-side with confirmed feedback", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student/grammar?hskLevel=1");
    const firstCard = page.locator(".gcard").first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    await firstCard.click();
    await page.getByRole("button", { name: /Luyện xếp từ/ }).click();

    const bank = page.locator(".ex-bank .token");
    await expect(bank.first()).toBeVisible({ timeout: 10_000 });
    // Click the first still-enabled token each time: used-up tokens disable
    // by design (duplicates stay clickable until exhausted).
    const clickEnabledToken = () =>
      page.locator(".ex-bank .token:not([disabled])").first().click();
    const count = await bank.count();
    expect(count).toBeGreaterThan(1);
    for (let i = 0; i < count; i++) {
      await clickEnabledToken();
    }
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    const feedback = page.locator(".ex-feedback");
    await expect(feedback).toBeVisible({ timeout: 10_000 });
    await expect(feedback).toContainText(/Chính xác|Chưa đúng/);
    await page.screenshot({
      path: join(SCREEN_DIR, `grammar-drill-${testInfo.project.name}.png`),
    });

    // Fresh retry bumps the server-derived counter (proves persistence).
    await page.getByRole("button", { name: "Luyện lại" }).click();
    const bank2 = page.locator(".ex-bank .token");
    await expect(bank2.first()).toBeVisible({ timeout: 10_000 });
    const count2 = await bank2.count();
    for (let i = 0; i < count2; i++) {
      await page.locator(".ex-bank .token:not([disabled])").first().click();
    }
    await page.getByRole("button", { name: "Kiểm tra" }).click();
    await expect(page.locator(".ex-feedback")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Xong" }).click();
    await expect(page).not.toHaveURL(/(?:\?|&)point=/);
    // Attempts accumulate on the seeded account across runs — assert the two
    // submits from this test persisted (>= 2), never an exact total.
    const counter = page.getByText(/Đã luyện \d+ lần/);
    await expect(counter).toBeVisible({ timeout: 10_000 });
    const shown = Number((await counter.first().innerText()).match(/Đã luyện (\d+) lần/)?.[1]);
    expect(shown).toBeGreaterThanOrEqual(2);

    expect(errors).toEqual([]);
  });

  test("teacher-assigned filter is server-side, composable and URL-restorable", async ({
    page,
  }, testInfo) => {
    const errors = collectPageErrors(page);
    await mockStudentSession(page);

    const listQueries: URLSearchParams[] = [];
    await page.route("**/api/v1/student/grammar?**", async (route) => {
      const url = new URL(route.request().url());
      listQueries.push(url.searchParams);
      const assignedOnly = url.searchParams.get("assignedOnly") === "true";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: assignedOnly
            ? []
            : [
                {
                  id: "g-hsk2-ba",
                  level: 2,
                  category: "Câu chữ 把",
                  name: "Câu chữ 把",
                  formula: "S + 把 + O + V",
                  hanzi: "我把书放在桌子上。",
                  pinyin: "Wǒ bǎ shū fàng zài zhuōzi shàng.",
                  vi: "Tôi đặt sách lên bàn.",
                  note: "Nhấn mạnh cách xử lý tân ngữ.",
                  key: "ba",
                  frequency: "high",
                },
              ],
          meta: {
            total: assignedOnly ? 0 : 1,
            page: 1,
            limit: 20,
            totalPages: assignedOnly ? 0 : 1,
          },
        }),
      });
    });
    await page.route("**/api/v1/student/grammar/g-hsk2-ba", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "g-hsk2-ba",
            level: 2,
            category: "Câu chữ 把",
            name: "Câu chữ 把",
            formula: "S + 把 + O + V",
            hanzi: "我把书放在桌子上。",
            pinyin: "Wǒ bǎ shū fàng zài zhuōzi shàng.",
            vi: "Tôi đặt sách lên bàn.",
            note: "Nhấn mạnh cách xử lý tân ngữ.",
            key: "ba",
            frequency: "high",
          },
        }),
      }),
    );

    await page.goto("/student/grammar?hskLevel=2&assignedOnly=true");
    await expect(page.getByText("Chưa có điểm ngữ pháp được giao", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Giáo viên giao", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(listQueries.at(-1)?.get("hskLevel")).toBe("2");
    expect(listQueries.at(-1)?.get("assignedOnly")).toBe("true");

    await page.getByRole("button", { name: "Xem tất cả điểm ngữ pháp", exact: true }).click();
    await expect(page.locator(".gcard")).toHaveCount(1);
    await expect(page).toHaveURL(/hskLevel=2/);
    await expect(page).not.toHaveURL(/assignedOnly/);
    expect(listQueries.at(-1)?.get("hskLevel")).toBe("2");
    expect(listQueries.at(-1)?.has("assignedOnly")).toBe(false);

    await page.screenshot({
      path: join(SCREEN_DIR, `grammar-assigned-${testInfo.project.name}.png`),
      fullPage: true,
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.locator(".gcard").click();
    await expect(page.getByRole("dialog")).toContainText("Câu chữ 把");
    await expect(page).toHaveURL(/point=g-hsk2-ba/);
    await page.goBack();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/hskLevel=2/);
    await expect(page).not.toHaveURL(/(?:\?|&)point=/);
    expect(errors).toEqual([]);
  });

  test("grammar point deep link closes without losing assigned filters", async ({ page }) => {
    const errors = collectPageErrors(page);
    await mockStudentSession(page);
    const point = {
      id: "g-hsk2-ba",
      level: 2,
      category: "Câu chữ 把",
      name: "Câu chữ 把",
      formula: "S + 把 + O + V",
      hanzi: "我把书放在桌子上。",
      pinyin: "Wǒ bǎ shū fàng zài zhuōzi shàng.",
      vi: "Tôi đặt sách lên bàn.",
      note: "Nhấn mạnh cách xử lý tân ngữ.",
      key: "ba",
      frequency: "high",
    };
    await page.route("**/api/v1/student/grammar?**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      }),
    );
    await page.route("**/api/v1/student/grammar/g-hsk2-ba", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: point }),
      }),
    );

    await page.goto("/student/grammar?hskLevel=2&assignedOnly=true&point=g-hsk2-ba");
    await expect(page.getByRole("dialog")).toContainText("Câu chữ 把");
    await page.getByRole("button", { name: "Đóng bảng chi tiết" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/hskLevel=2/);
    await expect(page).toHaveURL(/assignedOnly=true/);
    await expect(page).not.toHaveURL(/(?:\?|&)point=/);
    expect(errors).toEqual([]);
  });
});
