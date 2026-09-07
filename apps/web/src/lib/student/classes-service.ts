import { apiRequest } from "../api-client";
import type { EnrolledClass } from "./classes-rules";

export * from "./classes-rules";

/**
 * Fetches all classes the authenticated student is currently enrolled in (F2.6).
 * Endpoint: GET /student/classes
 */
export async function fetchMyEnrolledClasses(): Promise<EnrolledClass[]> {
  const response = await apiRequest<EnrolledClass[]>("/student/classes");
  return response.data;
}