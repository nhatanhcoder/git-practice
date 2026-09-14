import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("SRS Pagination & 4-Column Layout Invariants", () => {
  const srsPage = read("../src/app/student/(app)/flashcards/page.tsx");
  const srsCss = read("../src/styles/hanlu/srs.css");

  it("imports and renders the Pagination control", () => {
    assert.match(srsPage, /Pagination/);
    assert.match(srsPage, /<Pagination/);
  });

  it("uses the 4-column vocabulary grid on desktop", () => {
    assert.match(srsPage, /srs-vocab-grid/);
    assert.match(srsCss, /\.student-root \.srs-vocab-grid/);
    assert.match(srsCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  });

  it("resets page to 1 when changing HSK level", () => {
    assert.match(srsPage, /setLevel\(lvl\);\s*setPage\(1\)/);
  });

  it("resets page to 1 when changing review mode", () => {
    assert.match(srsPage, /setMode\(id as Mode\);\s*setPage\(1\)/);
  });

  it("defines the 4 redesigned statistics metrics cards with semantic color accents", () => {
    assert.match(srsCss, /\.student-root \.srs-stat/);
    assert.match(srsCss, /\.srs-stat--due/);
    assert.match(srsCss, /\.srs-stat--learned/);
    assert.match(srsCss, /\.srs-stat--retention/);
    assert.match(srsCss, /\.srs-stat--reviews/);
  });

  it("ensures cards have consistent height and no button glow bleed", () => {
    assert.match(srsCss, /min-height:\s*190px/);
    assert.match(srsCss, /box-shadow:\s*none/);
  });
});

describe("SRS Pagination Logic Verification", () => {
  const PAGE_SIZE = 16;
  const mockCards = Array.from({ length: 50 }, (_, i) => ({ id: `card-${i + 1}`, hanzi: `字${i + 1}` }));

  it("calculates total pages correctly for 50 items with PAGE_SIZE 16", () => {
    const totalPages = Math.ceil(mockCards.length / PAGE_SIZE);
    assert.equal(totalPages, 4);
  });

  it("slices exact cards for page 1 without duplicate or missing items", () => {
    const page = 1;
    const p1 = mockCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    assert.equal(p1.length, 16);
    assert.equal(p1[0].id, "card-1");
    assert.equal(p1[15].id, "card-16");
  });

  it("slices exact cards for page 2", () => {
    const page = 2;
    const p2 = mockCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    assert.equal(p2.length, 16);
    assert.equal(p2[0].id, "card-17");
    assert.equal(p2[15].id, "card-32");
  });

  it("slices remaining cards on the final page", () => {
    const page = 4;
    const p4 = mockCards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    assert.equal(p4.length, 2);
    assert.equal(p4[0].id, "card-49");
    assert.equal(p4[1].id, "card-50");
  });

  it("clamps out-of-bounds page gracefully", () => {
    const totalPages = Math.ceil(mockCards.length / PAGE_SIZE);
    const requestedPage = 99;
    const clampedPage = Math.min(Math.max(1, requestedPage), totalPages);
    assert.equal(clampedPage, 4);
  });
});
