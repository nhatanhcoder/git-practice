import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * A02 — Demo isolation & production gating (WEB-016).
 *
 * Runs against a PRODUCTION build (`pnpm --filter web build` + `next start`).
 * Verifies that:
 * 1. `?demo=1` or a storage flag never brings up the demo switcher in production.
 * 2. Mock progress (XP/streak/rank) never presents itself as the account's real data.
 * 3. Unbacked routes render the honest UnavailableState, not fake submissions.
 * 4. Preferences live in `hanlu-preferences`; the legacy `hanlu-student` store is
 *    never deleted or rewritten.
 *
 * Fixtures: none created — uses the seeded student@hsk.local (dev DB).
 * Run:  pnpm --filter web build && pnpm --filter web test:screens -- student-demo-isolation --workers=1
 * (with the API running on :3001 and the seeded DB in place)
 */

const SCREEN_DIR = join(process.cwd(), "test-results", "screens");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const STUDENT = { email: "student@hsk.local", password: "Password123!" };

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

async function apiLogin(page: Page): Promise<void> {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email: STUDENT.email, password: STUDENT.password },
  });
  if (!res.ok()) throw new Error(`login failed: HTTP ${res.status()}`);
}

async function shot(page: Page, name: string, testInfoName: string) {
  await page.screenshot({ path: join(SCREEN_DIR, `a02-${testInfoName}-${name}.png`) });
}

test.describe("A02 demo isolation & production gating", () => {
  test("1. demo switcher never renders in production, even with ?demo=1", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student?demo=1");

    // WEB-016: the switcher must not exist in the production DOM.
    await expect(page.locator(".demo-switch")).toHaveCount(0);

    // Rank line in the userchip must be the neutral "Học viên", never a mock
    // rank ("Thám hoa", "Trạng nguyên", …). Desktop only: the rail hosting the
    // userchip is hidden below 768px (same constraint as the A01 spec).
    const desktop = (testInfo.project.use.viewport?.width ?? 1280) >= 768;
    if (desktop) {
      await expect(page.locator(".userchip__text > span:last-child")).toHaveText("Học viên");
      // Mock XP/streak must not surface as the account's own progress.
      // Absent progress measurements render as an em dash ("—") in production.
      await expect(page.locator(".hud__stat--xp .num")).toHaveText("—");
      await expect(page.locator(".hud__stat--streak .num").first()).toHaveText("—");
    }

    await shot(page, "demo-switch-hidden", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("2. profile drawer shows the account, hides demo-only tools", async ({ page }, testInfo) => {
    test.skip((testInfo.project.use.viewport?.width ?? 1280) < 768, "userchip is desktop-only");
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student");

    await page.locator(".userchip").click();
    const drawer = page.locator(".sheet");
    await expect(drawer).toBeVisible();

    // Production shows the real account identity, not mock rank/level/join data.
    await expect(drawer).toContainText(STUDENT.email);

    // Demo-only actions stay in development.
    await expect(drawer.getByRole("button", { name: /Đặt lại tiến độ demo/i })).toHaveCount(0);
    await expect(drawer.getByRole("link", { name: /Làm bài kiểm tra xếp cấp/i })).toHaveCount(0);

    await shot(page, "profile-drawer-prod", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("3. every unbacked route renders the honest UnavailableState", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);

    const cases: { path: string; title: string }[] = [
      { path: "/student/assignments", title: "Bài tập về nhà" },
      { path: "/student/exams", title: "Thi thử HSK" },
      { path: "/student/placement", title: "Kiểm tra xếp cấp" },
      { path: "/student/learning-path", title: "Lộ trình HSK" },
      { path: "/student/writing", title: "Luyện viết chữ Hán" },
      { path: "/student/lego", title: "Ghép câu Lego" },
      { path: "/student/workplace", title: "Mô phỏng công sở" },
      { path: "/student/badges", title: "Kho huy hiệu" },
      { path: "/student/leaderboard", title: "Bảng xếp hạng" },
      { path: "/student/progress", title: "Tiến độ học tập" },
      // Detail routes gate before any data lookup, so any slug proves the gate.
      { path: "/student/attempts/unknown-id", title: "Làm bài tập" },
      { path: "/student/exams/unknown-id", title: "Làm bài thi thử" },
      { path: "/student/exams/unknown-id/result", title: "Kết quả thi thử" },
      { path: "/student/attempts/unknown-id/result", title: "Kết quả bài tập" },
      { path: "/student/learning-path/unknown-id", title: "Nội dung bài học" },
      { path: "/student/workplace/unknown-id", title: "Tình huống công sở" },
      { path: "/student/writing/unknown-id", title: "Luyện viết chữ Hán" },
    ];

    for (const { path, title } of cases) {
      await page.goto(path);
      const unavail = page.locator(".unavailable-state");
      await expect(unavail, `${path} must show UnavailableState`).toBeVisible();
      await expect(unavail.getByRole("heading", { name: title })).toBeVisible();
      await expect(
        unavail.getByRole("link", { name: /Về trang chủ học viên/i }),
      ).toHaveAttribute("href", "/student");
    }

    // Repo-static routes (grammar and foundation) are live, not unavailable.
    await page.goto("/student/grammar");
    await expect(page.locator(".unavailable-state")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Thư viện ngữ pháp" })).toBeVisible();

    await page.goto("/student/foundation");
    await expect(page.locator(".unavailable-state")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nền tảng phát âm" })).toBeVisible();

    await page.goto("/student/assignments");
    await expect(page.locator(".unavailable-state")).toBeVisible();
    await shot(page, "unavailable-state", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("4. theme preference is stored in hanlu-preferences, legacy store untouched", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);

    // Pre-seed the legacy mock progress store as an existing user would have it.
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "hanlu-student",
        JSON.stringify({
          state: {
            theme: "dark",
            showPinyin: true,
            showMeaning: true,
            student: { xp: 5240, streakDays: 12 },
          },
        }),
      );
    });

    await apiLogin(page);
    await page.goto("/student");

    const themeBtn = page.locator('button[aria-label^="Chuyển sang giao diện"]:visible');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();

    const storage = await page.evaluate(() => ({
      prefs: window.localStorage.getItem("hanlu-preferences"),
      legacy: window.localStorage.getItem("hanlu-student"),
    }));

    expect(storage.prefs, "hanlu-preferences must exist after toggling").not.toBeNull();
    expect(JSON.parse(storage.prefs!).state.theme).toBe("light");

    // The legacy progress store must survive, byte-for-byte in intent.
    expect(storage.legacy).not.toBeNull();
    expect(JSON.parse(storage.legacy!).state.student.xp).toBe(5240);
    expect(JSON.parse(storage.legacy!).state.student.streakDays).toBe(12);

    await shot(page, "preferences-split", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });

  test("5. production dashboard shows only live features, no mock progress widgets", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await apiLogin(page);
    await page.goto("/student");

    // The genuinely wired or repo-static features are reachable.
    await expect(page.getByRole("heading", { name: "Chào mừng đến Hán Lộ" })).toBeVisible();
    await expect(page.locator('a.shortcut[href="/student/flashcards"]')).toBeVisible();
    await expect(page.locator('a.shortcut[href="/student/mistakes"]')).toBeVisible();
    await expect(page.locator('a.shortcut[href="/student/classes"]')).toBeVisible();
    await expect(page.locator('a.shortcut[href="/student/grammar"]')).toBeVisible();
    await expect(page.locator('a.shortcut[href="/student/foundation"]')).toBeVisible();

    // Mock widgets must not present local progress as the learner's own.
    await expect(page.getByText("Tiếp tục học")).toHaveCount(0);
    await expect(page.getByText("Ôn tập hôm nay")).toHaveCount(0);
    await expect(page.getByText("Hoạt động gần đây")).toHaveCount(0);

    const body = await page.locator("body").innerText();
    expect(body).not.toContain("5.240");
    expect(body).not.toContain("Thám hoa");

    await shot(page, "dashboard-prod", testInfo.project.name);
    expect(errors, "console/page errors").toEqual([]);
  });
});
