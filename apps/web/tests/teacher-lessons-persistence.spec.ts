import { expect, test } from "@playwright/test";

const classId = "11111111-1111-4111-8111-111111111111";
const firstId = "22222222-2222-4222-8222-222222222222";
const secondId = "33333333-3333-4333-8333-333333333333";

test("failed lesson reorder reverts the visible order and never reports success", async ({ page }) => {
  let reorderCalls = 0;

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const reply = (status: number, body: unknown) => route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

    if (path.endsWith("/auth/refresh")) {
      await reply(200, { data: { accessToken: "test-teacher-token" } });
    } else if (path.endsWith("/auth/me")) {
      await reply(200, { data: {
        id: "44444444-4444-4444-8444-444444444444",
        email: "teacher@example.test",
        role: "teacher",
        status: "active",
        nickname: "Giáo viên",
        avatarUrl: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        lastLoginAt: null,
      } });
    } else if (path.endsWith(`/teacher/classes/${classId}/lessons/reorder`)) {
      reorderCalls += 1;
      await reply(409, {
        statusCode: 409,
        code: "LESSON_ORDER_INDEX_CONFLICT",
        message: "Không lưu được thứ tự bài học",
      });
    } else if (path.endsWith(`/teacher/classes/${classId}/lessons`)) {
      await reply(200, { data: [
        { id: firstId, title: "Bài 1", description: "", contentType: "document", orderIndex: 1 },
        { id: secondId, title: "Bài 2", description: "", contentType: "document", orderIndex: 2 },
      ] });
    } else if (path.endsWith(`/teacher/classes/${classId}`)) {
      await reply(200, { data: {
        id: classId,
        name: "Lớp HSK 3",
        hskLevel: 3,
        status: "active",
        enrollmentCode: "HSK3ABCD",
        description: null,
        students: [],
      } });
    } else {
      throw new Error(`Unexpected API call: ${route.request().method()} ${path}`);
    }
  });

  await page.goto(`/teacher/classes/${classId}/lessons`);
  const rows = page.locator('section[aria-label="Danh sách bài học"] ol > li');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Bài 1");

  await page.getByRole("button", { name: "Chuyển Bài 1 xuống" }).click();
  await expect(page.getByText("Không lưu được thứ tự bài học", { exact: true })).toBeVisible();
  await expect(rows.first()).toContainText("Bài 1");
  await expect(rows.nth(1)).toContainText("Bài 2");
  await expect(page.getByText("Đã đổi thứ tự bài học")).toHaveCount(0);
  expect(reorderCalls).toBe(1);
});

test("lesson save and delete cannot be cancelled after the request starts", async ({ page }, testInfo) => {
  let releaseCreate: () => void = () => {};
  let releaseDelete: () => void = () => {};
  const createGate = new Promise<void>((resolve) => { releaseCreate = resolve; });
  const deleteGate = new Promise<void>((resolve) => { releaseDelete = resolve; });
  const lesson = { id: firstId, title: "Bài kiểm thử", description: "", contentType: "document", orderIndex: 1 };

  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    const reply = (status: number, body: unknown) => route.fulfill({
      status, contentType: "application/json", body: JSON.stringify(body),
    });
    if (path.endsWith("/auth/refresh")) {
      await reply(200, { data: { accessToken: "test-teacher-token" } });
    } else if (path.endsWith("/auth/me")) {
      await reply(200, { data: {
        id: "44444444-4444-4444-8444-444444444444",
        email: "teacher@example.test", role: "teacher", status: "active",
        nickname: "Giáo viên", avatarUrl: null,
        createdAt: "2026-09-01T00:00:00.000Z", lastLoginAt: null,
      } });
    } else if (path.endsWith(`/teacher/classes/${classId}/lessons`) && method === "POST") {
      await createGate;
      await reply(201, { data: lesson });
    } else if (path.endsWith(`/teacher/lessons/${firstId}`) && method === "DELETE") {
      await deleteGate;
      await reply(200, { data: { success: true } });
    } else if (path.endsWith(`/teacher/classes/${classId}/lessons`)) {
      await reply(200, { data: [] });
    } else if (path.endsWith(`/teacher/classes/${classId}`)) {
      await reply(200, { data: {
        id: classId, name: "Lớp HSK 3", hskLevel: 3, status: "active",
        enrollmentCode: "HSK3ABCD", description: null, students: [],
      } });
    } else {
      throw new Error(`Unexpected API call: ${method} ${path}`);
    }
  });

  await page.goto(`/teacher/classes/${classId}/lessons`);
  await page.getByRole("button", { name: "Thêm bài học đầu tiên" }).click();
  const createDialog = page.getByRole("dialog", { name: "Thêm bài học" });
  await createDialog.getByRole("textbox", { name: "Tiêu đề *" }).fill("Bài kiểm thử");
  await createDialog.getByRole("button", { name: "Thêm bài học" }).click();
  await expect(createDialog.getByRole("button", { name: "Hủy" })).toBeDisabled();
  await expect(createDialog.getByRole("button", { name: "Đang lưu..." })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("lesson-save-pending.png"), fullPage: true });
  await page.keyboard.press("Escape");
  await expect(createDialog).toBeVisible();
  releaseCreate();
  await expect(createDialog).toHaveCount(0);
  await expect(page.getByText("Bài kiểm thử")).toBeVisible();

  await page.getByRole("button", { name: "Thao tác cho Bài kiểm thử" }).click();
  await page.getByRole("button", { name: "Xoá", exact: true }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Xoá bài học" });
  await deleteDialog.getByRole("button", { name: "Xoá bài học" }).click();
  await expect(deleteDialog.getByRole("button", { name: "Hủy" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(deleteDialog).toBeVisible();
  releaseDelete();
  await expect(deleteDialog).toHaveCount(0);
  await expect(page.getByText("Bài kiểm thử")).toHaveCount(0);
});
