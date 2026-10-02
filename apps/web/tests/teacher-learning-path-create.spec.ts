import { expect, test } from "@playwright/test";

const teacherId = "44444444-4444-4444-8444-444444444444";
const pathId = "11111111-1111-4111-8111-111111111111";

test("Teacher creates a learning path from the implemented flat list response", async ({ page }) => {
  let created = false;
  let createPayload: unknown;
  const path = {
    id: pathId,
    title: "HSK 3 · Gia đình",
    description: "Ôn từ vựng gia đình",
    curriculumKey: "tp-hsk-3-gia-dinh-11111111",
    status: "draft",
    submittedAt: null,
    reviewedAt: null,
    rejectionReason: null,
    unitCount: 0,
    publishedUnitCount: 0,
    createdAt: "2026-09-27T00:00:00.000Z",
    updatedAt: "2026-09-27T00:00:00.000Z",
  };

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname;
    const method = route.request().method();
    const reply = (status: number, body: unknown) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (endpoint.endsWith("/auth/refresh")) {
      await reply(200, { data: { accessToken: "test-teacher-token" } });
    } else if (endpoint.endsWith("/auth/me")) {
      await reply(200, { data: {
        id: teacherId,
        email: "teacher@example.test",
        role: "teacher",
        status: "active",
        nickname: "Giáo viên",
        avatarUrl: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        lastLoginAt: null,
      } });
    } else if (endpoint.endsWith("/teacher/learning-paths") && method === "GET") {
      const rows = created && (!url.searchParams.has("status") || url.searchParams.get("status") === "draft")
        ? [path]
        : [];
      await reply(200, { data: rows, meta: {
        total: rows.length, page: 1, limit: 20, totalPages: rows.length ? 1 : 0,
      } });
    } else if (endpoint.endsWith("/teacher/learning-paths") && method === "POST") {
      createPayload = route.request().postDataJSON();
      created = true;
      await reply(201, { data: path });
    } else if (endpoint.endsWith(`/teacher/learning-paths/${pathId}`)) {
      await reply(200, { data: { ...path, units: [] } });
    } else {
      throw new Error(`Unexpected API request: ${method} ${endpoint}`);
    }
  });

  await page.goto("/teacher/learning-paths");
  await expect(page.getByText("Chưa có lộ trình nào")).toBeVisible();
  await page.getByRole("button", { name: "Tạo lộ trình" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Tạo lộ trình" });
  await dialog.getByLabel("Tên lộ trình *").fill("HSK 3 · Gia đình");
  await dialog.getByLabel("Mô tả").fill("Ôn từ vựng gia đình");
  await dialog.getByRole("button", { name: "Tạo lộ trình" }).click();

  await expect(page).toHaveURL(new RegExp(`/teacher/learning-paths/${pathId}$`));
  await expect(page.getByRole("heading", { name: path.title })).toBeVisible();
  expect(createPayload).toEqual({
    title: "HSK 3 · Gia đình",
    description: "Ôn từ vựng gia đình",
  });
});
