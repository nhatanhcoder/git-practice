import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import type {
  LearningDetail,
  LearningCatalog,
} from "../src/lib/student/learning-path-service";
const apiRequire = createRequire(
  new URL("../../api/package.json", import.meta.url),
);
const { PrismaClient } = apiRequire("@prisma/client");
const mongoose = apiRequire("mongoose");

test("live vocabulary study, persisted quiz, unlock, isolation and offline state", async ({
  page,
  request,
}, info) => {
  test.skip(
    !process.env.DATABASE_URL || !process.env.MONGODB_URI,
    "Explicit dev DB environment required",
  );
  test.setTimeout(180000);
  const api = process.env.LP_API_URL ?? "http://localhost:3201/api/v1";
  const password = "Password123!";
  const prisma = new PrismaClient();
  const mongo = await mongoose
    .createConnection(process.env.MONGODB_URI)
    .asPromise();
  const ids: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const admin = await request.post(api + "/auth/login", {
      data: { email: "admin@hsk.local", password },
    });
    expect(admin.status()).toBe(200);
    const adminToken = (await admin.json()).data.accessToken;
    const account = async (tag: string) => {
      const email = `lp.browser.${Date.now()}.${info.project.name}.${info.repeatEachIndex}.${tag}@hsk.local`;
      const registered = await request.post(api + "/auth/register", {
        data: {
          email,
          password,
          role: "student",
          fullName: "Learning path test",
        },
      });
      expect(registered.status()).toBe(201);
      const id = (await registered.json()).data.id;
      ids.push(id);
      expect(
        (
          await request.patch(api + `/admin/users/${id}/approve`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          })
        ).status(),
      ).toBe(200);
      return email;
    };
    const a = await account("a"),
      b = await account("b");
    const login = async (email: string, next: string) => {
      await page.goto("/login?next=" + encodeURIComponent(next));
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      const response = page.waitForResponse(
        (r) =>
          r.url() === api + "/auth/login" && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Đăng nhập", exact: true })
        .click();
      const res = await response;
      expect(res.status()).toBe(200);
      return (await res.json()).data.accessToken as string;
    };
    const token = await login(a, "/student/learning-path");
    const headers = { Authorization: `Bearer ${token}` };
    await expect(
      page.getByRole("heading", { name: "Lộ trình từ vựng", exact: true }),
    ).toBeVisible();
    const catalogResponse = await request.get(api + "/student/learning-path", {
      headers,
    });
    const catalog = (await catalogResponse.json()).data as LearningCatalog;
    expect(catalog.total).toBeGreaterThan(1);
    expect(catalog.completed).toBe(0);
    await expect(
      page.getByText(`0/${catalog.total} bài đã hoàn thành`, { exact: true }),
    ).toBeVisible();
    const first = catalog.units[0],
      second = catalog.units[1];
    await page.screenshot({ path: info.outputPath("map.png"), fullPage: true });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Danh sách", exact: true }).click();
    await expect(page).toHaveURL(/view=list/);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Danh sách", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("link", { name: "Học bài", exact: true })
      .first()
      .click();
    await expect(
      page.getByRole("button", { name: "Bắt đầu học", exact: true }),
    ).toBeVisible();
    const detail = (
      await (
        await request.get(api + "/student/learning-path/" + first.slug, {
          headers,
        })
      ).json()
    ).data as LearningDetail;
    await page
      .getByRole("button", { name: "Bắt đầu học", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Đã học từ này", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("study.png"),
      fullPage: true,
    });
    for (let i = 0; i < detail.unit.words.length; i++) {
      await expect(
        page.getByText(`Học từ ${i + 1}/${detail.unit.words.length}`, {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Đã học từ này", exact: true })
        .click();
      if (i === 0) {
        await expect(
          page.getByText(`Học từ 2/${detail.unit.words.length}`, {
            exact: true,
          }),
        ).toBeVisible();
        await page.reload();
      }
    }
    for (let i = 0; i < detail.quiz.length; i++) {
      await expect(
        page.getByText(`Luyện tập · Câu ${i + 1}/${detail.quiz.length}`, {
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("radio", { name: detail.unit.words[i].meaning, exact: true })
        .check();
      await page
        .getByRole("button", { name: "Lưu câu trả lời", exact: true })
        .click();
      if (i === 0) {
        await expect(
          page.getByText(`Luyện tập · Câu 2/${detail.quiz.length}`, {
            exact: true,
          }),
        ).toBeVisible();
        await page.reload();
      }
    }
    const completeButton = page.getByRole("button", {
      name: "Kiểm tra kết quả",
      exact: true,
    });
    await expect(completeButton).toBeEnabled();
    let completionPosts = 0;
    page.on("request", (r) => {
      if (r.method() === "POST" && r.url().endsWith("/complete"))
        completionPosts++;
    });
    await completeButton.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
      button.click();
    });
    await expect(
      page.getByRole("heading", { name: "Đã hoàn thành bài học", exact: true }),
    ).toBeVisible();
    expect(completionPosts).toBe(1);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Đã hoàn thành bài học", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath("result.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Học bài tiếp theo", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: second.title, exact: true }),
    ).toBeVisible();
    expect(
      (
        await request.get(api + "/student/learning-path/" + second.slug, {
          headers,
        })
      ).status(),
    ).toBe(200);
    const progress = (
      await (
        await request.get(api + "/student/learning-path/" + first.slug, {
          headers,
        })
      ).json()
    ).data as LearningDetail;
    expect(progress.progress?.status).toBe("completed");
    expect(
      await mongo
        .collection("user_learning_progress")
        .countDocuments({ userId: ids[0], unitSlug: first.slug }),
    ).toBe(1);
    expect(
      (
        await page.context().request.post(api + "/auth/logout", { headers })
      ).status(),
    ).toBe(204);
    const bToken = await login(b, "/student/learning-path/" + second.slug);
    await expect(
      page.getByText("Bài học chưa mở", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: second.title, exact: true }),
    ).toHaveCount(0);
    const bHeaders = { Authorization: `Bearer ${bToken}` };
    expect(
      (
        await request.get(api + "/student/learning-path/" + second.slug, {
          headers: bHeaders,
        })
      ).status(),
    ).toBe(403);
    await page.goto("/student/learning-path");
    await expect(
      page.getByText(`0/${catalog.total} bài đã hoàn thành`, { exact: true }),
    ).toBeVisible();
    await page.goto(
      "/student/learning-path?curriculum=hsk_standard_course&level=1&view=map&page=1",
    );
    await expect(
      page.getByText("Chưa có nội dung giáo trình", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Học từ vựng Hán Lộ", exact: true })
      .click();
    await expect(
      page.getByText(`0/${catalog.total} bài đã hoàn thành`, { exact: true }),
    ).toBeVisible();
    await page.route("**/api/v1/student/learning-path?**", (route) =>
      route.abort(),
    );
    await page.reload();
    await expect(
      page.getByText("Không tải được lộ trình. Kiểm tra kết nối rồi thử lại.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(`0/${catalog.total} bài đã hoàn thành`, { exact: true }),
    ).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (ids.length) {
      await mongo
        .collection("user_learning_progress")
        .deleteMany({ userId: { $in: ids } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await mongo.close();
    await prisma.$disconnect();
  }
});
