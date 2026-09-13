import { expect, test, type Page } from "@playwright/test";

/**
 * Login theme tests (2026-09-12).
 *
 * The auth shell used to hardcode data-theme="dark" AND style text through
 * --fg/--fg-muted tokens that tokens.css never defined — the title inherited
 * the browser default and washed out on the dark ground. These tests pin the
 * fix from both directions:
 *   1. the shell follows the persisted preference (`hanlu-preferences`) and
 *      the toggle flips it;
 *   2. the actually-rendered text/input/label/button pairs meet WCAG AA
 *      contrast (≥ 4.5:1) in BOTH themes — measured from computed styles,
 *      not eyeballed.
 */

async function setThemeBeforeLoad(page: Page, theme: "dark" | "light") {
  await page.addInitScript((t) => {
    window.localStorage.setItem(
      "hanlu-preferences",
      JSON.stringify({ state: { theme: t, showPinyin: true, showMeaning: true }, version: 0 }),
    );
  }, theme);
}

/** Walk up from an element to find the first ancestor with an opaque background. */
async function effectiveBackground(page: Page, selector: string): Promise<[number, number, number]> {
  return page.$eval(
    selector,
    (el) => {
      const parse = (c: string): [number, number, number, number] | null => {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const parts = m[1].split(",").map((x) => parseFloat(x));
        return [parts[0], parts[1], parts[2], parts[3] ?? 1];
      };
      let node: Element | null = el;
      while (node) {
        const bg = parse(getComputedStyle(node).backgroundColor);
        if (bg && bg[3] >= 0.99) return [bg[0], bg[1], bg[2]];
        node = node.parentElement;
      }
      return [255, 255, 255];
    },
  );
}

async function contrast(page: Page, selector: string): Promise<number> {
  const [fg, bg] = await Promise.all([
    page.$eval(selector, (el) => getComputedStyle(el).color),
    effectiveBackground(page, selector),
  ]);
  return page.evaluate(
    ({ fg, bg }) => {
      const lum = (c: [number, number, number]) => {
        const ch = c.map((v) => {
          const s = v / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
      };
      const parseRgb = (c: string): [number, number, number] => {
        const m = c.match(/rgba?\(([^)]+)\)/)!;
        const parts = m[1].split(",").map((x) => parseFloat(x));
        return [parts[0], parts[1], parts[2]];
      };
      const l1 = lum(parseRgb(fg));
      const l2 = lum(bg);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },
    { fg, bg },
  );
}

for (const theme of ["dark", "light"] as const) {
  test.describe(`login contrast — ${theme} mode`, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("data-theme follows the saved preference", async ({ page }) => {
      await setThemeBeforeLoad(page, theme);
      await page.goto("/login");
      await expect(page.locator(".auth-root")).toHaveAttribute("data-theme", theme);
    });

    test("heading, sub, label, input text and submit button all meet AA contrast", async ({ page }) => {
      await setThemeBeforeLoad(page, theme);
      await page.goto("/login");
      // type into the input so its TEXT colour (not placeholder) is measured
      await page.locator("#email").fill("ban@vidu.com");

      for (const selector of [".auth-title", ".auth-sub", ".auth-label", "#email"]) {
        const ratio = await contrast(page, selector);
        expect(ratio, `${selector} contrast in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
      }

      // the Đăng nhập button: its own text colour against its own background
      const btnRatio = await page.$eval("button[type=submit]", (el) => {
        const lum = (c: string) => {
          const m = c.match(/rgba?\(([^)]+)\)/)!;
          const p = m[1].split(",").map((x) => parseFloat(x));
          const ch = p.slice(0, 3).map((v) => {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
        };
        const cs = getComputedStyle(el);
        const l1 = lum(cs.color);
        const l2 = lum(cs.backgroundColor);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      });
      expect(btnRatio, `submit button contrast in ${theme} mode`).toBeGreaterThanOrEqual(4.5);

      // the big art-panel title too — the element that was literally washed out
      const artRatio = await contrast(page, ".auth-art__title");
      expect(artRatio, `art panel title contrast in ${theme} mode`).toBeGreaterThanOrEqual(4.5);
    });
  });
}

test.describe("login theme toggle", () => {
  test("toggling flips data-theme, and a reload keeps the choice", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator(".auth-root")).toHaveAttribute("data-theme", "dark");

    await page.locator(".auth-theme-toggle").click();
    await expect(page.locator(".auth-root")).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator(".auth-root")).toHaveAttribute("data-theme", "light");

    await page.locator(".auth-theme-toggle").click();
    await expect(page.locator(".auth-root")).toHaveAttribute("data-theme", "dark");
  });
});
