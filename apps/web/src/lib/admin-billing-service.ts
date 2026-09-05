import { apiRequest, type ApiResponse } from './api-client';

export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'void';

export interface StudentTuitionRateRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  current: {
    id: string;
    rateAmount: string;
    billingCycle: string;
    effectiveFrom: string;
  } | null;
  changesCount: number;
}

export interface TuitionRateHistoryItem {
  id: string;
  studentId: string;
  rateAmount: string;
  billingCycle: string;
  effectiveFrom: string;
  isCurrent?: boolean;
  createdAt: string;
}

export interface StudentInvoiceItem {
  id: string;
  code: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  status: InvoiceStatus;
  createdAt: string;
}

export interface TuitionPaymentItem {
  id: string;
  amount: string;
  paidAt: string;
  paymentMethod: string;
  transactionReference: string | null;
  recordedBy: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface StudentInvoiceDetail extends StudentInvoiceItem {
  payments: TuitionPaymentItem[];
}

export interface InvoiceSummary {
  invoiceCount: number;
  totalInvoiced: string;
  totalPaid: string;
  totalOutstanding: string;
  countByStatus: {
    unpaid: number;
    partially_paid: number;
    paid: number;
    void: number;
  };
  overdueCount: number;
  overdueAmount: string;
}

export interface BatchPreviewRow {
  studentId: string;
  studentName: string;
  outcome: 'ok' | 'no_rate' | 'duplicate';
  rateId: string | null;
  rateAmount: string | null;
  totalAmount: string | null;
  existingInvoiceId?: string;
  existingStatus?: string;
}

export interface BatchPreviewResult {
  rows: BatchPreviewRow[];
  summary: {
    ok: number;
    no_rate: number;
    duplicate: number;
    totalAmount: string;
  };
  previewHash: string;
}

export interface FetchInvoicesParams {
  page?: number;
  limit?: number;
  studentId?: string;
  status?: InvoiceStatus;
  periodFrom?: string;
  periodTo?: string;
  dueBefore?: string;
  overdue?: boolean;
  sort?: 'periodStart_asc' | 'periodStart_desc' | 'dueDate_asc';
}

export async function fetchStudentTuitionRates(params: {
  page?: number;
  limit?: number;
  studentId?: string;
  activeOnly?: boolean;
} = {}): Promise<{ rates: StudentTuitionRateRow[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.studentId) query.set('studentId', params.studentId);
  if (params.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));

  const qs = query.toString();
  const res: ApiResponse<StudentTuitionRateRow[]> = await apiRequest<StudentTuitionRateRow[]>(
    `/admin/tuition-rates${qs ? `?${qs}` : ''}`,
  );

  const rates = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? { total: rates.length, page: 1, limit: rates.length, totalPages: 1 };
  return { rates, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function fetchStudentTuitionRateHistory(studentId: string): Promise<TuitionRateHistoryItem[]> {
  const res: ApiResponse<TuitionRateHistoryItem[]> = await apiRequest<TuitionRateHistoryItem[]>(
    `/admin/tuition-rates?studentId=${studentId}&activeOnly=false`,
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function createTuitionRate(dto: {
  studentId: string;
  rateAmount: string;
  effectiveFrom: string;
  billingCycle?: 'monthly';
}): Promise<{ rate: TuitionRateHistoryItem }> {
  const res = await apiRequest<{ rate: TuitionRateHistoryItem }>('/admin/tuition-rates', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function fetchInvoices(
  params: FetchInvoicesParams = {},
): Promise<{ invoices: StudentInvoiceItem[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.studentId) query.set('studentId', params.studentId);
  if (params.status) query.set('status', params.status);
  if (params.periodFrom) query.set('periodFrom', params.periodFrom);
  if (params.periodTo) query.set('periodTo', params.periodTo);
  if (params.dueBefore) query.set('dueBefore', params.dueBefore);
  if (params.overdue !== undefined) query.set('overdue', String(params.overdue));
  if (params.sort) query.set('sort', params.sort);

  const qs = query.toString();
  const res: ApiResponse<StudentInvoiceItem[]> = await apiRequest<StudentInvoiceItem[]>(
    `/admin/invoices${qs ? `?${qs}` : ''}`,
  );

  const invoices = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? { total: invoices.length, page: 1, limit: invoices.length, totalPages: 1 };
  return { invoices, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function fetchInvoiceSummary(params: FetchInvoicesParams = {}): Promise<InvoiceSummary> {
  const query = new URLSearchParams();
  if (params.studentId) query.set('studentId', params.studentId);
  if (params.status) query.set('status', params.status);
  if (params.periodFrom) query.set('periodFrom', params.periodFrom);
  if (params.periodTo) query.set('periodTo', params.periodTo);
  if (params.dueBefore) query.set('dueBefore', params.dueBefore);
  if (params.overdue !== undefined) query.set('overdue', String(params.overdue));

  const qs = query.toString();
  const res = await apiRequest<{ summary: InvoiceSummary }>(
    `/admin/invoices/summary${qs ? `?${qs}` : ''}`,
  );
  return res.data.summary;
}

export async function fetchInvoiceDetail(id: string): Promise<StudentInvoiceDetail> {
  const res = await apiRequest<{ invoice: StudentInvoiceDetail }>(`/admin/invoices/${id}`);
  return res.data.invoice;
}

export async function createInvoice(dto: {
  studentId: string;
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  totalAmount?: string;
}): Promise<StudentInvoiceItem> {
  const res = await apiRequest<{ invoice: StudentInvoiceItem }>('/admin/invoices', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data.invoice;
}

export async function voidInvoice(id: string, reason: string): Promise<StudentInvoiceItem> {
  const res = await apiRequest<{ invoice: StudentInvoiceItem }>(`/admin/invoices/${id}/void`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
  });
  return res.data.invoice;
}

export async function recordTuitionPayment(
  invoiceId: string,
  dto: {
    amount: string;
    paidAt?: string;
    paymentMethod: string;
    transactionReference?: string;
  },
): Promise<{ payment: TuitionPaymentItem; invoice: StudentInvoiceItem }> {
  const res = await apiRequest<{ payment: TuitionPaymentItem; invoice: StudentInvoiceItem }>(
    `/admin/invoices/${invoiceId}/payments`,
    {
      method: 'POST',
      body: JSON.stringify(dto),
    },
  );
  return res.data;
}

export async function previewBatchInvoices(dto: {
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  studentIds?: string[];
}): Promise<BatchPreviewResult> {
  const res = await apiRequest<BatchPreviewResult>('/admin/invoices/batch/preview', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function executeBatchInvoices(dto: {
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  previewHash?: string;
  studentIds?: string[];
}): Promise<{ generatedCount: number; totalAmount: string; invoices: any[] }> {
  const res = await apiRequest<{ generatedCount: number; totalAmount: string; invoices: any[] }>(
    '/admin/invoices/batch',
    {
      method: 'POST',
      body: JSON.stringify(dto),
    },
  );
  return res.data;
}
