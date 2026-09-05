import { apiRequest } from './api-client';

export interface DashboardStats {
  pendingUsers: number;
  activeTeachers: number;
  activeStudents: number;
  suspendedUsers: number;
  sessionsPendingReview: number;
  unpaidInvoices: number;
  outstandingAmount: string;
  revenueThisMonth: string;
  payrollThisMonth: string;
  generatedAt: string;
}

export interface GeminiMonitoringData {
  status: 'healthy' | 'degraded' | 'down';
  latency: string;
  model: string;
  quota: {
    used: number;
    limit: number;
    unit: string;
  };
  keyType: string;
  lastChecked: string;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: string;
  metric1: string;
  metric2: string;
}

export interface HealthProbesData {
  services: ServiceHealthItem[];
  system: {
    memory: string;
    uptime: string;
    nodeVersion: string;
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiRequest<DashboardStats>('/admin/dashboard/stats');
  return res.data;
}

export async function fetchGeminiMonitoring(): Promise<GeminiMonitoringData> {
  const res = await apiRequest<GeminiMonitoringData>('/admin/monitoring/gemini');
  return res.data;
}

export async function fetchHealthProbes(): Promise<HealthProbesData> {
  const res = await apiRequest<HealthProbesData>('/admin/monitoring/health');
  return res.data;
}
