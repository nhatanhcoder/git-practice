import { fetchMyEnrolledClasses, type EnrolledClass } from "./classes-service";
import { fetchSrsStats, type SrsStats } from "./flashcards-service";

/**
 * Live figures for the /student dashboard (Task A).
 *
 * Only what the API actually serves: enrolled classes
 * (GET /student/classes) and SRS stats (GET /student/flashcards/stats).
 * What the numbers mean lives in `dashboard-rules.ts`; figures with no
 * endpoint are named under MISSING_FIGURES there (WEB-011).
 */

export type SectionResult<T> =
  | { status: "ok"; data: T }
  | { status: "failed"; error: unknown };

export interface DashboardLive {
  classes: SectionResult<EnrolledClass[]>;
  stats: SectionResult<SrsStats>;
}

/**
 * Fetches both live sources independently (allSettled): a classes outage must
 * not blank the SRS tiles and vice versa. Each panel renders its own
 * loading / error / empty / ready state from its section result.
 */
export async function fetchDashboardLive(): Promise<DashboardLive> {
  const [classes, stats] = await Promise.allSettled([
    fetchMyEnrolledClasses(),
    fetchSrsStats(),
  ]);
  return {
    classes:
      classes.status === "fulfilled"
        ? { status: "ok", data: classes.value }
        : { status: "failed", error: classes.reason },
    stats:
      stats.status === "fulfilled"
        ? { status: "ok", data: stats.value }
        : { status: "failed", error: stats.reason },
  };
}
