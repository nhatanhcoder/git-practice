import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  MISSING_FIGURES,
  buildDashboardTiles,
} from "../src/lib/student/dashboard-rules.ts";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const mockClasses = [
  { id: "c1", name: "Lớp HSK 3", hskLevel: 3 },
  { id: "c2", name: "Lớp HSK 4", hskLevel: 4 },
];

const mockStats = {
  totalCards: 40,
  dueToday: 7,
  matureCards: 12,
  retentionRate: 85,
  totalReviews: 130,
  streak: null,
};

describe("Task A · dashboard tiles come from live shapes only", () => {
  it("builds the seven tiles in order with real values", () => {
    const tiles = buildDashboardTiles(mockClasses, mockStats);
    assert.deepEqual(
      tiles.map((t) => t.label),
      [
        "Lớp đã tham gia",
        "Thẻ đến hạn",
        "Thẻ đã học",
        "Đã thuộc",
        "Tỉ lệ ghi nhớ",
        "Lượt ôn",
        "Chuỗi ngày",
      ],
    );
    const byKey = Object.fromEntries(tiles.map((t) => [t.key, t.value]));
    assert.equal(byKey.classes, "2");
    assert.equal(byKey.due, "7");
    assert.equal(byKey.learned, "40");
    assert.equal(byKey.matured, "12");
    assert.equal(byKey.retention, "85%");
    assert.equal(byKey.reviews, "130");
  });

  it("renders a null streak as an em dash, never 0", () => {
    const tiles = buildDashboardTiles(mockClasses, mockStats);
    assert.equal(tiles.find((t) => t.key === "streak")?.value, "—");
    const withStreak = buildDashboardTiles(mockClasses, { ...mockStats, streak: 9 });
    assert.equal(withStreak.find((t) => t.key === "streak")?.value, "9");
  });

  it("renders an unknown class count as an em dash instead of 0 (failed source)", () => {
    const tiles = buildDashboardTiles(null, mockStats);
    assert.equal(tiles.find((t) => t.key === "classes")?.value, "—");
  });

  it("names the missing figures without inventing values for them", () => {
    assert.deepEqual(MISSING_FIGURES, [
      "Tổng XP",
      "Danh hiệu",
      "Phút học hôm nay",
      "Tiến độ bậc HSK",
      "Bài đang học dở",
      "Lịch sử hoạt động",
    ]);
  });
});

describe("Task A · dashboard wiring invariants (static)", () => {
  const page = read("../src/app/student/(app)/page.tsx");
  const service = read("../src/lib/student/dashboard-service.ts");

  it("production body fetches the two live sources independently", () => {
    assert.match(page, /fetchDashboardLive/);
    assert.match(page, /buildDashboardTiles/);
    assert.match(page, /MISSING_FIGURES/);
    assert.match(service, /fetchMyEnrolledClasses/);
    assert.match(service, /fetchSrsStats/);
    assert.match(service, /allSettled/);
  });

  it("no mock figure survives on the production path", () => {
    assert.doesNotMatch(page, /MOCK\(student\): every figure/);
    assert.match(page, /Chưa có số liệu/);
  });

  it("identity still comes from the live session", () => {
    assert.match(page, /useDisplayIdentity/);
  });
});
