import { defineConfig, devices } from "@playwright/test";

/**
 * Screen verification for `apps/web`.
 *
 * This exists because `next build` passing has repeatedly not meant the page
 * renders correctly — WEB-001 shipped a sticky header covering the first table
 * row through a green build. Every UI commit runs these against a *production*
 * build and produces screenshots at both viewports; see `ai/rules/working-rules.md`
 * § Verify.
 *
 * Two projects, deliberately: desktop is where layout regressions show, 375px is
 * where overflow does. Neither alone has been enough.
 */

const PORT = Number(process.env.PW_PORT ?? 3000);
const BASE_URL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results/output",
  // A screen is either right or it is not; a retry that goes green on the second
  // attempt hides a real flake in a mockup with no network.
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-375",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: false },
    },
  ],
  webServer: {
    // `start`, not `dev`: dev-only overlays and unminified timing have masked
    // real regressions before. Run `pnpm --filter web build` first.
    command: "pnpm run start",
    url: BASE_URL,
    // Locally this reuses a server you already have on the port. That is a trap:
    // reusing one started from an older build silently verifies the wrong code —
    // it happened while writing this file, and a fixed 375px overflow still
    // reported as broken. Stop stray servers before trusting a run.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
