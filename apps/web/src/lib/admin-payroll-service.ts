import { apiRequest, type ApiResponse } from './api-client';

export type PayRateType = 'per_session' | 'per_hour';
export type PayrollStatus = 'draft' | 'finalized' | 'paid';

export interface PayRateItem {
  id: string;
  teacherId: string;
  rateType: PayRateType;
  rateAmount: string;
  effectiveFrom: string;
  isCurrent?: boolean;
  createdAt?: string;
}

export interface TeacherPayRateRow {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  current: {
    id: string;
    rateType: PayRateType;
    rateAmount: string;
    effectiveFrom: string;
  } | null;
  changesCount: number;
}

export interface FetchPayRatesParams {
  page?: number;
  limit?: number;
  teacherId?: string;
  activeOnly?: boolean;
}

export interface PayrollPeriodItem {
  id: string;
  code: string;
  teacherId: string;
  teacherName: string;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  totalSessions: number;
  totalAmount: string;
  paidAt: string | null;
  createdAt: string;
}

export interface PayrollSessionBreakdown {
  sessionId: string;
  classId: string;
  className: string;
  scheduledDate: string;
  actualStart: string | null;
  actualEnd: string | null;
  hours: string;
  appliedRateId: string | null;
  appliedRateType: PayRateType | null;
  appliedRateAmount: string | null;
  amount: string;
}

export interface PayrollPeriodDetail extends PayrollPeriodItem {
  sessions: PayrollSessionBreakdown[];
}

export interface FetchPayrollParams {
  page?: number;
  limit?: number;
  teacherId?: string;
  status?: PayrollStatus;
  periodFrom?: string;
  periodTo?: string;
  sort?: 'periodStart_asc' | 'periodStart_desc';
}

export async function fetchTeacherPayRates(
  params: FetchPayRatesParams = {},
): Promise<{ rates: TeacherPayRateRow[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.teacherId) query.set('teacherId', params.teacherId);
  if (params.activeOnly !== undefined) query.set('activeOnly', String(params.activeOnly));

  const qs = query.toString();
  const res: ApiResponse<TeacherPayRateRow[]> = await apiRequest<TeacherPayRateRow[]>(
    `/admin/pay-rates${qs ? `?${qs}` : ''}`,
  );

  const rates = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? {
    total: rates.length,
    page: 1,
    limit: rates.length,
    totalPages: 1,
  };

  return { rates, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function fetchTeacherPayRateHistory(
  teacherId: string,
): Promise<PayRateItem[]> {
  const res: ApiResponse<PayRateItem[]> = await apiRequest<PayRateItem[]>(
    `/admin/pay-rates?teacherId=${teacherId}&activeOnly=false`,
  );
  return Array.isArray(res.data) ? res.data : [];
}

export async function createPayRate(dto: {
  teacherId: string;
  rateType: PayRateType;
  rateAmount: string;
  effectiveFrom: string;
}): Promise<PayRateItem> {
  const res = await apiRequest<PayRateItem>('/admin/pay-rates', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function fetchPayrollPeriods(
  params: FetchPayrollParams = {},
): Promise<{ periods: PayrollPeriodItem[]; total: number; page: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.teacherId) query.set('teacherId', params.teacherId);
  if (params.status) query.set('status', params.status);
  if (params.periodFrom) query.set('periodFrom', params.periodFrom);
  if (params.periodTo) query.set('periodTo', params.periodTo);
  if (params.sort) query.set('sort', params.sort);

  const qs = query.toString();
  const res: ApiResponse<PayrollPeriodItem[]> = await apiRequest<PayrollPeriodItem[]>(
    `/admin/payroll${qs ? `?${qs}` : ''}`,
  );

  const periods = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? {
    total: periods.length,
    page: 1,
    limit: periods.length,
    totalPages: 1,
  };

  return { periods, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function fetchPayrollPeriodDetail(id: string): Promise<PayrollPeriodDetail> {
  const res = await apiRequest<PayrollPeriodDetail>(`/admin/payroll/${id}`);
  return res.data;
}

export async function createPayrollPeriod(dto: {
  teacherId: string;
  periodStart: string;
  periodEnd: string;
}): Promise<PayrollPeriodItem> {
  const res = await apiRequest<PayrollPeriodItem>('/admin/payroll', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return res.data;
}

export async function finalizePayrollPeriod(id: string): Promise<PayrollPeriodItem> {
  const res = await apiRequest<PayrollPeriodItem>(`/admin/payroll/${id}/finalize`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function payPayrollPeriod(id: string): Promise<PayrollPeriodItem> {
  const res = await apiRequest<PayrollPeriodItem>(`/admin/payroll/${id}/pay`, {
    method: 'PATCH',
  });
  return res.data;
}

export async function deletePayrollPeriod(id: string): Promise<{ success: boolean }> {
  const res = await apiRequest<{ success: boolean }>(`/admin/payroll/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}
