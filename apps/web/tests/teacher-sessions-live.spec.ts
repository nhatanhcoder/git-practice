import { expect, test } from "@playwright/test";

const classId = "11111111-1111-4111-8111-111111111111";
const teacherId = "44444444-4444-4444-8444-444444444444";
const sessionId = "55555555-5555-4555-8555-555555555555";

test("Teacher sees own live agenda and creates one planned session", async ({ page }) => {
  let created = false;
  let posted: Record<string, unknown> | null = null;

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
        id: teacherId,
        email: "teacher@example.test",
        role: "teacher",
        status: "active",
        nickname: "Giáo viên",
        avatarUrl: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        lastLoginAt: null,
      } });
    } else if (path.endsWith("/teacher/classes")) {
      await reply(200, { data: [{
        id: classId, name: "Lớp HSK 3", hskLevel: 3, status: "active",
        enrollmentCode: "HSK3ABCD", studentCount: 0,
      }] });
    } else if (path.endsWith("/teacher/sessions") && route.request().method() === "POST") {
      posted = route.request().postDataJSON() as Record<string, unknown>;
      created = true;
      await reply(201, { data: {
        id: sessionId, classId, teacherId, ...posted,
        scheduledDate: "2026-09-24T00:00:00.000Z",
        notes: null,
        status: "scheduled",
        actualStart: null, actualEnd: null,
        rejectionReason: null, payrollPeriodId: null,
        createdAt: "2026-09-24T10:00:00.000Z",
        updatedAt: "2026-09-24T10:00:00.000Z",
      } });
    } else if (path.endsWith("/teacher/sessions") && route.request().method() === "GET") {
      const data = created ? [{
        id: sessionId, classId, className: "Lớp HSK 3",
        scheduledDate: "2026-09-24", scheduledStart: "19:00", scheduledEnd: "20:30",
        actualStart: null, actualEnd: null, topic: "Ôn ngữ pháp HSK 3", notes: null,
        status: "scheduled", rejectionReason: null, payrollPeriodId: null,
        attendanceSummary: { present: 0, absentExcused: 0, absentUnexcused: 0, total: 0 },
        createdAt: "2026-09-24T10:00:00.000Z", updatedAt: "2026-09-24T10:00:00.000Z",
      }] : [];
      await reply(200, { data, meta: { total: data.length, page: 1, limit: 100, totalPages: 1 } });
    } else {
      throw new Error(`Unexpected API call: ${route.request().method()} ${path}`);
    }
  });

  await page.goto("/teacher/sessions");
  await expect(page.getByText("Chưa có buổi học nào trong khoảng này")).toBeVisible();
  await page.getByRole("button", { name: "Tạo buổi học" }).first().click();
  const form = page.locator("form");
  await form.locator("select").selectOption(classId);
  await form.locator('input[type="date"]').fill("2026-09-24");
  await form.locator('input[type="time"]').nth(0).fill("19:00");
  await form.locator('input[type="time"]').nth(1).fill("20:30");
  await form.locator('input:not([type])').fill("Ôn ngữ pháp HSK 3");
  await form.getByRole("button", { name: "Tạo buổi học" }).click();

  await expect(page.getByText("Ôn ngữ pháp HSK 3")).toBeVisible();
  await expect(page.getByText("Lớp HSK 3").last()).toBeVisible();
  await expect(page.getByText("Đã tạo buổi học.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu" })).toHaveCount(0);
  expect(posted).toEqual({
    classId,
    scheduledDate: "2026-09-24",
    scheduledStart: "19:00",
    scheduledEnd: "20:30",
    topic: "Ôn ngữ pháp HSK 3",
  });
});
