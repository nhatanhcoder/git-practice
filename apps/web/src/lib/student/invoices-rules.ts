/**
 * Pure rules for the student invoice screens (S-BILL-1/2).
 *
 * Leaf module on purpose — no local imports — so apps/web/scripts/*.test.mjs
 * can import it directly under `node --test` (the same convention as
 * classes-rules.ts / srs-session.ts / dashboard-live.ts).
 *
 * The money rule that shapes everything here: amounts arrive as decimal
 * strings from the envelope and are RENDERED, never computed
 * (`outstandingAmount` is server-derived, INV-BILLING-16).
 */

export type InvoiceStatus = "unpaid" | "partially_paid" | "paid" | "void";

export interface StudentInvoice {
  id: string;
  code: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface StudentInvoicePayment {
  id: string;
  amount: string;
  paidAt: string;
  paymentMethod: string;
  transactionReference: string | null;
  recordedBy: { id: string; name: string | null };
  createdAt: string;
}

export interface StudentInvoiceDetail extends StudentInvoice {
  payments: StudentInvoicePayment[];
}

export interface InvoiceListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Vietnamese labels for the four invoice statuses. `void` is included for
 * type completeness only — the API hides voided invoices from students
 * (06-billing.md §5), so it never reaches a rendered screen.
 */
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  unpaid: "Chưa thanh toán",
  partially_paid: "Thanh toán một phần",
  paid: "Đã thanh toán",
  void: "Đã hủy",
};

/** Chip tone per status, matching the semantic tones the student screens use. */
export const INVOICE_STATUS_TONES: Record<InvoiceStatus, "danger" | "warn" | "success" | "neutral"> = {
  unpaid: "danger",
  partially_paid: "warn",
  paid: "success",
  void: "neutral",
};

/**
 * Renders a decimal money string exactly as the envelope sent it, with a
 * Vietnamese thousands separator and the đ unit. No Number() parsing, no
 * arithmetic — a decimal string larger than Number.MAX_SAFE_INTEGER (VND
 * amounts are integers in practice, but the contract says decimal strings)
 * must not silently lose digits at render time. "—" for anything absent.
 */
export function formatMoney(amount: string | null | undefined): string {
  if (!amount) return "—";
  const negative = amount.startsWith("-");
  const digitsOnly = negative ? amount.slice(1) : amount;
  const [whole, frac] = digitsOnly.split(".");
  if (!/^\d+$/.test(whole ?? "")) return amount; // not a decimal string — show as-is
  const grouped = (whole as string).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = frac ? `,${frac.slice(0, 2).padEnd(2, "0")}` : "";
  return `${negative ? "−" : ""}${grouped}${fraction} ₫`;
}

/** "01/09/2026 – 30/09/2026" from two ISO dates (display happens here, not in data). */
export function formatPeriod(periodStart: string, periodEnd: string): string {
  const start = formatDateParts(periodStart);
  const end = formatDateParts(periodEnd);
  if (!start || !end) return "—";
  return `${start} – ${end}`;
}

/** A single ISO date (e.g. a due date) as dd/MM/yyyy — a period range around one date reads as a typo. */
export function formatDate(iso: string): string {
  return formatDateParts(iso) ?? "—";
}

function formatDateParts(iso: string): string | null {
  const parts = iso.split("T")[0].split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return null;
  return `${day}/${month}/${year}`;
}

export type InvoiceListOutcome = "loading" | "error" | "empty" | "ready";

export function resolveInvoiceListOutcome(
  loading: boolean,
  error: unknown,
  count: number,
): InvoiceListOutcome {
  if (loading) return "loading";
  if (error) return "error";
  if (count === 0) return "empty";
  return "ready";
}

export type InvoiceDetailOutcome =
  | "loading"
  | "invalid_id"
  | "not_found"
  | "error"
  | "ready";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * The detail screen's primary state. `not_found` covers both `INVOICE_NOT_FOUND`
 * and the 403/401 family — the API deliberately makes "not yours" and "does not
 * exist" the same answer, so the screen does too. A generic failure that is
 * NOT one of those codes is `error` (retryable); anything else risks showing
 * "hóa đơn không tồn tại" for what was really a broken connection.
 */
export function resolveInvoiceDetailOutcome(
  loading: boolean,
  validId: boolean,
  error: unknown,
  detail: StudentInvoiceDetail | null,
): InvoiceDetailOutcome {
  if (loading) return "loading";
  if (!validId) return "invalid_id";
  if (detail) return "ready";
  if (error) return "not_found";
  return "error";
}

/**
 * Registry-code → message for the invoice screens. Only codes the contract
 * (student-invoice-detail.md / API_STUDENT.md § Billing) names; anything else
 * falls through to generic retry wording rather than a guessed cause.
 */
const INVOICE_FAILURE_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: "Không tìm thấy hóa đơn. Nó có thể đã bị hủy hoặc không thuộc về bạn.",
  VALIDATION_ERROR: "Đường dẫn hóa đơn không hợp lệ.",
};

export function describeInvoiceFailure(err: unknown): string {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    const message = INVOICE_FAILURE_MESSAGES[code];
    if (message) return message;
  }
  return "Không tải được hóa đơn lúc này. Kiểm tra kết nối rồi thử lại.";
}

/** Display name for the admin who recorded a payment; never an email. */
export function resolveRecorderName(recorder: { name: string | null }): string {
  return recorder.name?.trim() || "Trung tâm";
}
