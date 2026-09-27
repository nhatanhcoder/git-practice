import { apiRequest } from '../api-client';

export type TeacherSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed_pending'
  | 'approved'
  | 'rejected';

export interface TeacherSession {
  id: string;
  classId: string;
  className: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  topic: string;
  notes: string | null;
  status: TeacherSessionStatus;
  rejectionReason: string | null;
  payrollPeriodId: string | null;
  attendanceSummary: {
    present: number;
    absentExcused: number;
    absentUnexcused: number;
    total: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeacherSessionInput {
  classId: string;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  topic: string;
  notes?: string;
}

export interface TeacherSessionListQuery {
  from: string;
  to: string;
  classId?: string;
  status?: TeacherSessionStatus;
}

/** The list endpoint is paginated even for a date-window query. Never drop later pages. */
export async function fetchTeacherSessions(
  query: TeacherSessionListQuery,
  signal?: AbortSignal,
): Promise<{ sessions: TeacherSession[]; total: number }> {
  const sessions: TeacherSession[] = [];
  let page = 1;

  for (;;) {
    const params = new URLSearchParams({
      from: query.from,
      to: query.to,
      page: String(page),
      limit: '100',
      sort: 'scheduledDate_asc',
    });
    if (query.classId) params.set('classId', query.classId);
    if (query.status) params.set('status', query.status);

    const response = await apiRequest<TeacherSession[]>(`/teacher/sessions?${params}`, { signal });
    if (!Array.isArray(response.data) || !response.meta) {
      throw new Error('Dữ liệu lịch dạy không hợp lệ.');
    }
    sessions.push(...response.data);
    if (page >= response.meta.totalPages) {
      return { sessions, total: response.meta.total };
    }
    page += 1;
  }
}

export async function createTeacherSession(input: CreateTeacherSessionInput): Promise<void> {
  // The POST returns a raw ClassSession without className; the caller must refetch GET.
  await apiRequest('/teacher/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
