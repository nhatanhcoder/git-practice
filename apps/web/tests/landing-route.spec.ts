import { expect, test } from "@playwright/test";

/**
 * Rendered route checks for the public landing (owner direction 2026-09-12:
 * the landing lives at /landing; /student/landing redirects there).
 *
 * Companion to apps/web/scripts/landing-routes.test.mjs, which holds the
 * no-server source assertions. These run against the production build via
 * playwright.config's webServer.
 *
 * Content note: whether /landing carries the prototype's people sections is an
 * OPEN owner decision (WEB-017) — these tests assert structure and behaviour,
 * not either side of that decision.
 */

test.describe("/landing renders", () => {
  test("GET /landing renders (hero, stats strip, CTAs)", async ({ page }) => {
    const response = await page.goto("/landing");
    expect(response?.status()).toBe(200);

    await expect(page.locator("h1").first()).toBeVisible();
    // the prototype's CTAs continue into the app (which gates anonymous users)
    await expect(page.locator('a[href="/student"]').first()).toBeVisible();
  });

  test("/student/landing redirects to /landing (backward compatibility)", async ({ page }) => {
    const response = await page.goto("/student/landing");
    expect(new URL(page.url()).pathname).toBe("/landing");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("deep paths keep their suffix per the :path* redirect", async ({ page }) => {
    await page.goto("/student/landing/teachers");
    expect(new URL(page.url()).pathname).toBe("/landing/teachers");
  });

  test("the login page's brand link leads to /landing", async ({ page }) => {
    await page.goto("/login");
    const brand = page.locator("a.auth-brand");
    await expect(brand).toHaveAttribute("href", "/landing");
  });

  test("no horizontal overflow at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/landing");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
