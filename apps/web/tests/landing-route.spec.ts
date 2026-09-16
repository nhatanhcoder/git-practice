import { expect, test } from "@playwright/test";

/**
 * Rendered route checks for the landing removal (WEB-017 final resolution,
 * owner decision on record: the prototype page — invented teachers and student
 * results — is gone; both historical paths land on the login gate).
 *
 * Companion to apps/web/scripts/landing-routes.test.mjs, which holds the
 * no-server source assertions. These run against the production build via
 * playwright.config's webServer.
 */

test.describe("landing removal redirects", () => {
  test("/landing redirects to the login gate", async ({ page }) => {
    await page.goto("/landing");
    expect(new URL(page.url()).pathname).toBe("/login");
    await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  });

  test("/student/landing redirects to the login gate (one hop, no dead intermediate)", async ({ page }) => {
    await page.goto("/student/landing");
    expect(new URL(page.url()).pathname).toBe("/login");
    await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  });

  test("/student/landing deep paths also land on the gate", async ({ page }) => {
    await page.goto("/student/landing/teachers");
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("the login page's brand link leads to the app root, not a removed page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("a.auth-brand")).toHaveAttribute("href", "/");
  });

  test("no horizontal overflow on the gate at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/landing"); // redirected to /login
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
