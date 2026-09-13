import { apiRequest, type ApiResponse, type ApiError } from "../api-client";
import type {
  InvoiceListMeta,
  StudentInvoice,
  StudentInvoiceDetail,
} from "./invoices-rules";

export * from "./invoices-rules";

/**
 * Fetches the signed-in student's own non-void invoices (S-BILL-1).
 * Endpoint: GET /student/invoices — ownership is decided entirely by the
 * token server-side (INV-BILLING-33); this function cannot ask for anyone
 * else's list because the query DTO has no studentId field at all.
 */
export async function fetchMyInvoices(
  page = 1,
  limit = 20,
): Promise<{ invoices: StudentInvoice[]; meta: InvoiceListMeta }> {
  const response: ApiResponse<StudentInvoice[]> = await apiRequest<StudentInvoice[]>(
    `/student/invoices?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`,
  );
  const invoices = Array.isArray(response.data) ? response.data : [];
  const meta = response.meta ?? {
    total: invoices.length,
    page,
    limit,
    totalPages: invoices.length > 0 ? 1 : 0,
  };
  return { invoices, meta };
}

/**
 * Fetches one of the student's own invoices with its payment history (S-BILL-2).
 * Endpoint: GET /student/invoices/:id — payments[] embedded, `paidAt ASC, id ASC`,
 * void and other students' invoices both answer 404 INVOICE_NOT_FOUND.
 */
export async function fetchMyInvoiceDetail(invoiceId: string): Promise<StudentInvoiceDetail> {
  const response = await apiRequest<{ invoice: StudentInvoiceDetail }>(
    `/student/invoices/${encodeURIComponent(invoiceId)}`,
  );
  return response.data.invoice;
}

// Aliases the two pages import, mirroring classes-service.ts's re-export style.
export {
  formatMoney as formatInvoiceMoney,
  formatPeriod as formatInvoicePeriod,
  describeInvoiceFailure as describeInvoiceError,
  resolveInvoiceListOutcome as resolveInvoicesOutcome,
  resolveInvoiceDetailOutcome as resolveMyInvoiceOutcome,
  isValidUuid as isValidInvoiceId,
} from "./invoices-rules";

export { ApiError };
