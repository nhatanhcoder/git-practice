/**
 * Pure-rule tests for the student invoice screens (S-BILL-1/2).
 * Mirrors the conventions of classes/student-classes.test.mjs and
 * dashboard-live.test.mjs: import the TS rules module directly.
 *
 * Each test names the hazard it guards against:
 *  - money is rendered as the decimal string the server sent, never parsed
 *  - `outstandingAmount` is never re-derived client-side (INV-BILLING-16)
 *  - "not yours", "does not exist" and "voided" are one indistinguishable answer
 *  - a failed load is an error, not "you have no invoices" (WEB-011 family)
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatMoney,
  formatPeriod,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  isValidUuid,
  resolveInvoiceListOutcome,
  resolveInvoiceDetailOutcome,
  describeInvoiceFailure,
  resolveRecorderName,
} from "../src/lib/student/invoices-rules.ts";

// ---------------------------------------------------------------- money rules

test("formatMoney groups digits the Vietnamese way without parsing the value", () => {
  assert.equal(formatMoney("1500000.00"), "1.500.000,00 ₫");
  assert.equal(formatMoney("500000"), "500.000 ₫");
  assert.equal(formatMoney("0.00"), "0,00 ₫");
});

test("formatMoney never invents a value for an absent amount", () => {
  assert.equal(formatMoney(null), "—");
  assert.equal(formatMoney(undefined), "—");
  assert.equal(formatMoney(""), "—");
});

test("formatMoney keeps large amounts digit-exact — no float round-trip", () => {
  // 2^53+1 as a decimal string: Number() would collapse this. The renderer
  // must not, even though real VND invoices are far smaller.
  assert.ok(formatMoney("9007199254740993.00").includes("9.007.199.254.740.993"));
});

test("formatMoney marks a negative amount visibly instead of hiding the sign", () => {
  assert.ok(formatMoney("-150000.00").startsWith("−"));
});

// -------------------------------------------------------------- period rules

test("formatPeriod renders the invoiced month as a vi range", () => {
  assert.equal(formatPeriod("2026-09-01", "2026-09-30"), "01/09/2026 – 30/09/2026");
});

test("formatPeriod answers '—' rather than 'undefined/undefined' for bad input", () => {
  assert.equal(formatPeriod("", ""), "—");
  assert.equal(formatPeriod("not-a-date", "2026-09-30"), "—");
});

// --------------------------------------------------------------- list states

test("a failed invoice fetch is an error, not an empty account (WEB-011 family)", () => {
  assert.equal(resolveInvoiceListOutcome(true, null, 0), "loading");
  assert.equal(resolveInvoiceListOutcome(false, new Error("network"), 0), "error");
  assert.equal(resolveInvoiceListOutcome(false, null, 0), "empty");
  assert.equal(resolveInvoiceListOutcome(false, null, 3), "ready");
});

// ------------------------------------------------------------- detail states

test("a non-UUID invoiceId never becomes a network call", () => {
  assert.equal(isValidUuid("not-a-uuid"), false);
  assert.equal(isValidUuid("382473aa-5739-4330-9fa1-93e8f02ae458"), true);
  assert.equal(
    resolveInvoiceDetailOutcome(false, false, null, null),
    "invalid_id",
    "outcome is invalid_id before any fetch",
  );
});

test("INVOICE_NOT_FOUND collapses not-yours / nonexistent / voided into one answer", () => {
  // The API returns the same 404 for all three (INV-BILLING-33); the screen
  // must not distinguish them either.
  assert.equal(
    resolveInvoiceDetailOutcome(false, true, { code: "INVOICE_NOT_FOUND" }, null),
    "not_found",
  );
});

test("a ready detail outranks a stale error object", () => {
  assert.equal(resolveInvoiceDetailOutcome(false, true, {}, { id: "x" }), "ready");
});

test("an unexpected outcome is retryable error, not not_found", () => {
  // detail null, no error, not loading, valid id — the fetch neither answered
  // nor failed; the honest presentation is a retry, not "doesn't exist".
  assert.equal(resolveInvoiceDetailOutcome(false, true, null, null), "error");
});

// ------------------------------------------------------------ error wording

test("failure wording maps registry codes and keeps a generic fallback", () => {
  assert.ok(describeInvoiceFailure({ code: "INVOICE_NOT_FOUND" }).length > 0);
  assert.ok(describeInvoiceFailure({ code: "SOMETHING_ELSE" }).includes("thử lại"));
  assert.ok(describeInvoiceFailure(new Error("network")).includes("thử lại"));
});

// ------------------------------------------------------------ status labels

test("all four statuses have labels and tones; void stays renderable but unreachable", () => {
  assert.equal(INVOICE_STATUS_LABELS.paid, "Đã thanh toán");
  assert.equal(INVOICE_STATUS_LABELS.unpaid, "Chưa thanh toán");
  assert.equal(INVOICE_STATUS_LABELS.partially_paid, "Thanh toán một phần");
  assert.equal(INVOICE_STATUS_LABELS.void, "Đã hủy");
  assert.equal(INVOICE_STATUS_TONES.paid, "success");
  assert.equal(INVOICE_STATUS_TONES.unpaid, "danger");
});

// ------------------------------------------------------------ recorder name

test("a payment's recorder shows a display name, never an email or empty string", () => {
  assert.equal(resolveRecorderName({ name: "Cô Hoa" }), "Cô Hoa");
  assert.equal(resolveRecorderName({ name: null }), "Trung tâm");
  assert.equal(resolveRecorderName({ name: "   " }), "Trung tâm");
});
