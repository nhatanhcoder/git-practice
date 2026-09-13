import { test, expect, type Page } from "@playwright/test";
import { join } from "node:path";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const SCREEN_DIR = join(process.cwd(), "test-results", "flashcards");

async function signInAsStudent(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: "student@hsk.local", password: "Password123!" },
  });
  expect(res.ok(), `Login as student must succeed, status: ${res.status()}`).toBe(true);
}

test.describe("Student Flashcards SRS — Checklist & Interactive Verification", () => {
  for (let run = 1; run <= 3; run++) {
    test(`Run ${run}/3: Visual layout, 4-col grid, padding, stats highlights, and pagination reset`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && !msg.text().includes("favicon")) {
          errors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => errors.push(err.message));

      await signInAsStudent(page);

      // 1. Navigate to flashcards page
      await page.goto("/student/flashcards", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(600);

      // Verify page mounted and authenticated
      const heading = page.locator("main h1").first();
      await expect(heading).toHaveText(/Ôn tập SRS/i, { timeout: 15_000 });

      // 2. Check 4 Statistics Cards
      const statGrid = page.locator(".srs-stat-grid");
      await expect(statGrid).toBeVisible();
      const statCards = page.locator(".srs-stat");
      await expect(statCards).toHaveCount(4);

      // Check specific semantic stat cards exist
      await expect(page.locator(".srs-stat--due")).toBeVisible();
      await expect(page.locator(".srs-stat--learned")).toBeVisible();
      await expect(page.locator(".srs-stat--retention")).toBeVisible();
      await expect(page.locator(".srs-stat--reviews")).toBeVisible();

      // Check stat card visual hierarchy (icons, labels, values)
      for (let i = 0; i < 4; i++) {
        const card = statCards.nth(i);
        await expect(card.locator(".srs-stat__icon")).toBeVisible();
        await expect(card.locator(".srs-stat__label")).toBeVisible();
        const val = card.locator(".srs-stat__value");
        await expect(val).toBeVisible();
        // Value text must be non-empty
        const text = (await val.textContent())?.trim();
        expect(text?.length).toBeGreaterThan(0);
      }

      // 3. Check Controls Toolbar
      const controls = page.locator(".srs-controls");
      await expect(controls).toBeVisible();
      await expect(page.locator(".tabs[role='tablist']")).toBeVisible();
      await expect(page.locator(".levels[role='radiogroup']")).toBeVisible();

      // 4. Check Vocabulary Grid & Cards (Desktop: 4 cards/row)
      const vocabGrid = page.locator(".srs-vocab-grid");
      if ((await vocabGrid.count()) > 0 && (await page.locator(".srs-tile").count()) > 0) {
        const tiles = page.locator(".srs-tile");
        const tileCount = await tiles.count();
        expect(tileCount).toBeGreaterThan(0);
        expect(tileCount).toBeLessThanOrEqual(16); // Must not exceed PAGE_SIZE (16)

        // Verify desktop 4-card per row layout by checking Y-coordinates of first 4 cards
        if (tileCount >= 4 && testInfo.project.name === "desktop") {
          const boxes = await Promise.all([
            tiles.nth(0).boundingBox(),
            tiles.nth(1).boundingBox(),
            tiles.nth(2).boundingBox(),
            tiles.nth(3).boundingBox(),
          ]);

          // All 4 first cards must share approximately the same Y (within 2px)
          const y0 = boxes[0]!.y;
          expect(Math.abs(boxes[1]!.y - y0)).toBeLessThanOrEqual(2);
          expect(Math.abs(boxes[2]!.y - y0)).toBeLessThanOrEqual(2);
          expect(Math.abs(boxes[3]!.y - y0)).toBeLessThanOrEqual(2);

          // All 4 cards must have consistent height in row
          const h0 = boxes[0]!.height;
          expect(Math.abs(boxes[1]!.height - h0)).toBeLessThanOrEqual(3);
          expect(Math.abs(boxes[2]!.height - h0)).toBeLessThanOrEqual(3);
          expect(Math.abs(boxes[3]!.height - h0)).toBeLessThanOrEqual(3);
        }

        // 5. Verify Card Padding & Content Boundaries
        const firstTile = tiles.first();
        const tileBox = (await firstTile.boundingBox())!;
        const hanzi = firstTile.locator(".srs-tile__hanzi");
        const hanziBox = (await hanzi.boundingBox())!;
        const btn = firstTile.locator(".srs-tile__btn");
        const btnBox = (await btn.boundingBox())!;

        // Hanzi must have padding from left border (>= 15px) and top border (>= 15px)
        expect(hanziBox.x - tileBox.x).toBeGreaterThanOrEqual(15);
        expect(hanziBox.y - tileBox.y).toBeGreaterThanOrEqual(15);

        // Button must sit INSIDE the card padding, not touching outer edges
        expect(btnBox.x - tileBox.x).toBeGreaterThanOrEqual(15);
        expect(tileBox.x + tileBox.width - (btnBox.x + btnBox.width)).toBeGreaterThanOrEqual(15);
        expect(tileBox.y + tileBox.height - (btnBox.y + btnBox.height)).toBeGreaterThanOrEqual(15);

        // Verify HSK badge styling
        const badge = firstTile.locator(".srs-tile__badge");
        await expect(badge).toBeVisible();
      }

      // 6. Test Pagination Controls & State Transitions
      const pagination = page.locator(".srs-pagination");
      if ((await pagination.count()) > 0) {
        await expect(page.locator(".pagination-info")).toBeVisible();
        const nextBtn = page.locator(".pagination-btns button", { hasText: "Sau" });
        const prevBtn = page.locator(".pagination-btns button", { hasText: "Trước" });

        // Page 1: "Trước" should be disabled
        await expect(prevBtn).toBeDisabled();

        if (await nextBtn.isEnabled()) {
          const firstCardTextBefore = await page.locator(".srs-tile .srs-tile__hanzi").first().textContent();

          // Click Next -> Page 2
          await nextBtn.click();
          await page.waitForTimeout(300);

          const firstCardTextAfter = await page.locator(".srs-tile .srs-tile__hanzi").first().textContent();
          // Cards must be different (pagination slice works, no duplicates)
          expect(firstCardTextAfter).not.toEqual(firstCardTextBefore);
          await expect(prevBtn).toBeEnabled();

          // Click Previous -> Back to Page 1
          await prevBtn.click();
          await page.waitForTimeout(300);
          const firstCardTextBack = await page.locator(".srs-tile .srs-tile__hanzi").first().textContent();
          expect(firstCardTextBack).toEqual(firstCardTextBefore);
        }

        // Test Level Change resets pagination to Page 1
        const hsk2Btn = page.locator(".level-btn", { hasText: "2" });
        if (await hsk2Btn.isVisible()) {
          await hsk2Btn.click();
          await page.waitForTimeout(400);
          // When level switches, active pagination button should be "1"
          const activePageBtn = page.locator(".pagination-btn.is-active");
          if ((await activePageBtn.count()) > 0) {
            await expect(activePageBtn).toHaveText("1");
          }
        }
      }

      // 7. Verify horizontal overflow does not exist
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

      // Save screenshot for review
      const shot = `run${run}-${testInfo.project.name}.png`;
      const file = join(SCREEN_DIR, shot);
      await page.screenshot({ path: file, fullPage: true });

      // No uncaught errors
      expect(errors).toEqual([]);
    });
  }
});
