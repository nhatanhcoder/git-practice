import { apiRequest, type ApiResponse } from './api-client';

export interface AttendanceSummary {
  present: number;
  absentExcused: number;
  absentUnexcused: number;
  marked: number;
  enrolledActive: number;
}

export interface PendingSessionItem {
  id: string;
  classId: string;
  className: string;
  hskLevel: number;
  teacherId: string;
  teacherName: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  topic: string;
  notes: string | null;
  status: 'completed_pending';
  attendanceSummary: AttendanceSummary;
  updatedAt: string;
}

export interface FetchPendingSessionsParams {
  page?: number;
  limit?: number;
  teacherId?: string;
  classId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: 'scheduledDate_asc' | 'scheduledDate_desc';
}

export interface PendingSessionsPage {
  sessions: PendingSessionItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchPendingSessions(
  params: FetchPendingSessionsParams = {},
): Promise<PendingSessionsPage> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.teacherId) query.set('teacherId', params.teacherId);
  if (params.classId) query.set('classId', params.classId);
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.dateTo) query.set('dateTo', params.dateTo);
  if (params.sort) query.set('sort', params.sort);

  const qs = query.toString();
  const res: ApiResponse<PendingSessionItem[]> = await apiRequest<PendingSessionItem[]>(
    `/admin/sessions/pending${qs ? `?${qs}` : ''}`,
  );

  const sessions = Array.isArray(res.data) ? res.data : [];
  const meta = res.meta ?? {
    total: sessions.length,
    page: 1,
    limit: sessions.length,
    totalPages: 1,
  };

  return { sessions, total: meta.total, page: meta.page, totalPages: meta.totalPages };
}

export async function approveSession(id: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest<{ id: string; status: string }>(
    `/admin/sessions/${id}/approve`,
    { method: 'PATCH' },
  );
  return res.data;
}

export async function rejectSession(
  id: string,
  rejectionReason: string,
): Promise<{ id: string; status: string; rejectionReason: string }> {
  const res = await apiRequest<{ id: string; status: string; rejectionReason: string }>(
    `/admin/sessions/${id}/reject`,
    {
      method: 'PATCH',
      body: JSON.stringify({ rejectionReason }),
    },
  );
  return res.data;
}
