import { expect, test, type Page } from "@playwright/test";

const pathId = "11111111-1111-4111-8111-111111111111";
const unitId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const now = "2026-09-29T08:00:00.000Z";

async function catalogFixture(page: Page, options: { conflict?: boolean; rejectFailure?: boolean; loadStatus?: number; approved?: boolean; many?: boolean } = {}) {
  const unit = { id: unitId, slug: "tp-family-u1", title: "Gia đình", order: 1, level: 3, kind: "authored", wordCount: 1, published: Boolean(options.approved), referenceSlug: null, words: [{ hanzi: "家", pinyin: "jiā", meaning: "nhà" }] };
  const path = { id: pathId, title: "Từ vựng gia đình", description: "Từ vựng dùng trong gia đình.", status: options.approved ? "approved" : "pending_review", owner: { id: "teacher-1", nickname: "Giáo viên kiểm thử" }, unitCount: 2, publishedUnitCount: unit.published ? 1 : 0, submittedAt: now, createdAt: now, reviewedAt: null as string | null, reviewedBy: null as { id: string; nickname: string } | null, rejectionReason: null as string | null, units: [unit, { ...unit, id: "bbbbbbbbbbbbbbbbbbbbbbbb", title: "Bài tham chiếu", kind: "reference", order: 2, published: false, referenceSlug: "catalog-source", words: undefined }] };
  const writes: Array<{ endpoint: string; body: Record<string, unknown> }> = [];
  let failedReject = false;
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.replace("/api/v1", "");
    const method = route.request().method();
    const reply = (status: number, body: unknown) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (endpoint === "/auth/refresh") return reply(200, { data: { accessToken: "admin-test-token" } });
    if (endpoint === "/auth/me") return reply(200, { data: { id: "admin-1", nickname: "Admin kiểm thử", email: "admin@example.test", role: "admin", status: "active", avatarUrl: null } });
    if (method === "GET") {
      if (options.loadStatus) return reply(options.loadStatus, { code: options.loadStatus === 403 ? "AUTH_INSUFFICIENT_ROLE" : "INTERNAL_SERVER_ERROR", message: "Không tải được nội dung" });
      if (endpoint === `/admin/learning-paths/${pathId}`) return reply(200, { data: path });
      if (endpoint === "/admin/learning-units") return reply(200, { data: unit.published ? [unit] : [], meta: { page: 1, limit: 20, total: unit.published ? 1 : 0, totalPages: 1 } });
      if (endpoint === "/admin/learning-paths") {
        const currentPage = Number(url.searchParams.get("page") || 1);
        const status = url.searchParams.get("status") || "pending_review";
        const all = options.many ? Array.from({ length: 25 }, (_, index) => ({ ...path, id: `path-${index}`, title: `Lộ trình ${index + 1}`, submittedAt: new Date(Date.UTC(2026, 8, 1, index)).toISOString() })) : [path];
        const filtered = all.filter((item) => item.status === status);
        return reply(200, { data: filtered.slice((currentPage - 1) * 20, currentPage * 20), meta: { page: currentPage, limit: 20, total: filtered.length, totalPages: Math.ceil(filtered.length / 20) } });
      }
    }
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      writes.push({ endpoint, body });
      if (options.conflict) {
        path.status = "approved";
        return reply(409, { code: "LEARNING_PATH_INVALID_STATUS", message: "Đã duyệt bởi admin khác" });
      }
      if (endpoint.endsWith("/reject") && options.rejectFailure && !failedReject) {
        failedReject = true;
        return reply(400, { code: "LEARNING_PATH_REJECTION_REASON_REQUIRED", message: "Lý do cần rõ hơn" });
      }
      if (endpoint.endsWith("/unpublish")) { unit.published = false; return reply(200, { data: unit }); }
      if (endpoint.endsWith("/approve") || endpoint.endsWith("/restore")) path.status = "approved";
      if (endpoint.endsWith("/suspend")) path.status = "suspended";
      if (endpoint.endsWith("/reject")) { path.status = "rejected"; path.rejectionReason = body.rejectionReason as string; }
      path.reviewedAt = now;
      path.reviewedBy = { id: "admin-1", nickname: "Admin kiểm thử" };
      return reply(200, { data: path });
    }
    throw new Error(`Unexpected API request ${method} ${endpoint}`);
  });
  return writes;
}

test("approve waits for API success and removes the row from the queue", async ({ page }, testInfo) => {
  const writes = await catalogFixture(page);
  await page.goto("/admin/learning-paths");
  await expect(page.getByRole("link", { name: "Từ vựng gia đình" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("queue.png"), fullPage: true });
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Duyệt lộ trình" }).click();
  await expect(page.getByRole("heading", { name: "Không có lộ trình nào chờ duyệt" })).toBeVisible();
  expect(writes).toEqual([{ endpoint: `/admin/learning-paths/${pathId}/approve`, body: {} }]);
});

test("reject validates trimmed reason and preserves it after API field failure", async ({ page }, testInfo) => {
  const writes = await catalogFixture(page, { rejectFailure: true });
  await page.goto("/admin/learning-paths");
  await page.getByRole("button", { name: "Từ chối", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Lý do từ chối", { exact: true }).fill("    ");
  await expect(dialog.getByRole("button", { name: "Từ chối lộ trình" })).toBeDisabled();
  await dialog.getByLabel("Lý do từ chối", { exact: true }).fill("Cần sửa nội dung ví dụ");
  await dialog.getByRole("button", { name: "Từ chối lộ trình" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("Lý do từ chối", { exact: true })).toHaveValue("Cần sửa nội dung ví dụ");
  await page.screenshot({ path: testInfo.outputPath("reject-error.png"), fullPage: true });
  await dialog.getByRole("button", { name: "Từ chối lộ trình" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Không có lộ trình nào chờ duyệt" })).toBeVisible();
  expect(writes[1].body).toEqual({ rejectionReason: "Cần sửa nội dung ví dụ" });
});

test("409 refreshes the queue without retrying the mutation", async ({ page }) => {
  const writes = await catalogFixture(page, { conflict: true });
  await page.goto("/admin/learning-paths");
  await page.getByRole("button", { name: "Duyệt", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Duyệt lộ trình" }).click();
  await expect(page.getByText("Nội dung đã được xử lý bởi người khác.", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Không có lộ trình nào chờ duyệt" })).toBeVisible();
  expect(writes).toHaveLength(1);
});

test("detail previews authored words and supports suspend, restore and unpublish", async ({ page }, testInfo) => {
  const writes = await catalogFixture(page, { approved: true });
  await page.goto(`/admin/learning-paths/${pathId}`);
  await page.getByRole("button", { name: "1. Gia đình" }).click();
  await expect(page.getByText("jiā", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("detail.png"), fullPage: true });
  await page.getByRole("button", { name: "2. Bài tham chiếu" }).click();
  await expect(page.getByText("Chưa xem được nội dung bài tham chiếu tại đây.")).toBeVisible();
  await page.getByRole("button", { name: "Tạm ẩn", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Tạm ẩn lộ trình" }).click();
  await expect(page.getByRole("button", { name: "Khôi phục", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Khôi phục lộ trình" }).click();
  await page.getByRole("button", { name: "Gỡ", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Gỡ bài học" }).click();
  await expect(page.getByRole("button", { name: "Gỡ", exact: true })).toHaveCount(0);
  expect(writes.map((write) => write.endpoint.split("/").pop())).toEqual(["suspend", "restore", "unpublish"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("all-status view paginates without sending an unsupported status value", async ({ page }) => {
  await catalogFixture(page, { many: true });
  await page.goto("/admin/learning-paths?status=all&page=2");
  await expect(page.getByRole("link", { name: "Lộ trình 21", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lộ trình 25", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lộ trình 1", exact: true })).toHaveCount(0);
  await expect(page.getByText("Trang 2 / 2")).toBeVisible();
});

test("published-unit list retains the confirmed removed row and dialog supports Escape", async ({ page }) => {
  const writes = await catalogFixture(page, { approved: true });
  await page.goto("/admin/learning-paths?view=units");
  const remove = page.getByRole("button", { name: "Gỡ", exact: true });
  await remove.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect(writes).toHaveLength(0);
  await remove.click();
  await page.getByRole("dialog").getByRole("button", { name: "Gỡ bài học" }).click();
  await expect(remove).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Đã gỡ bài học");
  expect(writes).toEqual([{ endpoint: `/admin/learning-units/${unitId}/unpublish`, body: {} }]);
});

for (const status of [403, 500]) {
  test(`load ${status} renders an honest error rather than an empty queue`, async ({ page }, testInfo) => {
    await catalogFixture(page, { loadStatus: status });
    await page.goto("/admin/learning-paths");
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Không có lộ trình nào chờ duyệt" })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`error-${status}.png`), fullPage: true });
  });
}
