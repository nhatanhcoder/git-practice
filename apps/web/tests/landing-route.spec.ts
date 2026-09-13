import { expect, test } from "@playwright/test";

/**
 * Rendered route checks for the public landing (owner direction 2026-09-12:
 * the landing lives at /landing; /student/landing redirects there).
 *
 * Companion to apps/web/scripts/landing-routes.test.mjs, which holds the
 * no-server source assertions (no hardcoded old path, no invented people).
 * These run against the production build via playwright.config's webServer.
 */

test.describe("/landing renders", () => {
  test("GET /landing renders the honest landing (hero, stats, CTAs)", async ({ page }) => {
    const response = await page.goto("/landing");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1, name: /Một con đường, từ HSK 1 đến HSK 9/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lộ trình HSK 1–9" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phương pháp" })).toBeVisible();

    // the stats strip carries the verified platform counts
    await expect(page.getByText("Bộ thủ Khang Hy")).toBeVisible();
    await expect(page.locator(".landing-stat").first()).toBeVisible();

    // CTAs lead to the auth gate
    await expect(page.locator('a[href="/register"]').first()).toBeVisible();
    await expect(page.locator('a[href="/login"]').first()).toBeVisible();

    // WEB-017: nothing about people, anywhere on the page
    const body = (await page.locator("body").innerText()).toLowerCase();
    for (const invented of ["giáo viên", "tiến sĩ", "giám khảo", "bảng vàng"]) {
      expect(body).not.toContain(invented);
    }
  });

  test("/student/landing redirects to /landing (backward compatibility)", async ({ page }) => {
    const response = await page.goto("/student/landing");
    expect(response?.url() ?? page.url()).toContain("/landing");
    expect(new URL(page.url()).pathname).toBe("/landing");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Một con đường");
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
