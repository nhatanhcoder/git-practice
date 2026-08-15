import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  abbreviateVnd,
  emptyDashboardData,
  formatVnd,
  initialsOf,
  initialDashboardData,
} from "../src/lib/dashboard-data.ts";

describe("Dashboard helpers & formatting", () => {
  it("formats VND with dot thousands separator and suffix", () => {
    assert.equal(formatVnd(12500000), "12.500.000 ₫");
    assert.equal(formatVnd(7250000), "7.250.000 ₫");
    assert.equal(formatVnd(0), "0 ₫");
  });

  it("computes initials for the first and last word", () => {
    assert.equal(initialsOf("Nguyễn Minh Anh"), "NA");
    assert.equal(initialsOf("Phạm Thị Lan"), "PL");
  });

  it("abbreviates VND for axis ticks", () => {
    assert.equal(abbreviateVnd(20000000), "20tr");
    assert.equal(abbreviateVnd(5000000), "5tr");
    assert.equal(abbreviateVnd(0), "0");
  });

  it("has the default dashboard data shape with a partial T8 month", () => {
    assert.equal(initialDashboardData.kpi.pendingUsers, 2);
    assert.equal(initialDashboardData.kpi.pendingSessions, 5);
    assert.equal(initialDashboardData.chart.length, 6);
    assert.equal(initialDashboardData.chart[5].partial, true);
    assert.equal(initialDashboardData.pendingSessions.length, 5);
  });
});

describe("emptyDashboardData", () => {
  it("zeroes pending counts and empties queues but keeps the chart", () => {
    const empty = emptyDashboardData(initialDashboardData);
    assert.equal(empty.kpi.pendingUsers, 0);
    assert.equal(empty.kpi.pendingSessions, 0);
    assert.equal(empty.pendingUsers.length, 0);
    assert.equal(empty.pendingSessions.length, 0);
    assert.equal(empty.chart.length, 6, "chart still renders in empty state");
    assert.equal(empty.kpi.revenueThisMonth, initialDashboardData.kpi.revenueThisMonth);
  });
});
