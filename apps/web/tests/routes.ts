/**
 * Every route the screen check knows how to visit, with a *valid* id filled in
 * for the dynamic ones — a dynamic route visited with a bogus id renders the
 * "not found" branch and proves nothing about the real screen.
 *
 * Ids come from the mock fixtures in `src/lib/student/*` and `src/lib/teacher-data.ts`.
 * When a fixture id changes, this list changes with it.
 */

export type Area = "student" | "teacher" | "admin";

export type Screen = {
  /** URL to visit. */
  path: string;
  /** Slug used for the screenshot filename. */
  name: string;
  area: Area;
};

const student: Screen[] = [
  { path: "/student", name: "dashboard", area: "student" },
  // Public marketing page: bypasses StudentShell via StudentChrome, so it is the one
  // Student route whose chrome is not covered by any other entry here.
  { path: "/student/landing", name: "landing", area: "student" },
  { path: "/student/learning-path", name: "learning-path", area: "student" },
  { path: "/student/learning-path/std-1-l1", name: "learning-path-node", area: "student" },
  // Deliberately not all from level 1 of one curriculum: the id parser used to
  // fall back to "HSK Standard Course, level 1" for everything else, so a level-1
  // fixture alone passed while every other lesson rendered "not found".
  { path: "/student/learning-path/std-3-l2", name: "learning-path-node-l3", area: "student" },
  { path: "/student/learning-path/hy-1-l1", name: "learning-path-node-hanyu", area: "student" },
  { path: "/student/grammar", name: "grammar", area: "student" },
  { path: "/student/foundation", name: "foundation", area: "student" },
  { path: "/student/flashcards", name: "flashcards", area: "student" },
  { path: "/student/writing", name: "writing", area: "student" },
  { path: "/student/exams", name: "exams", area: "student" },
  { path: "/student/mistakes", name: "mistakes", area: "student" },
  { path: "/student/mistakes/review", name: "mistakes-review", area: "student" },
  { path: "/student/lego", name: "lego", area: "student" },
  { path: "/student/workplace", name: "workplace", area: "student" },
  { path: "/student/placement", name: "placement", area: "student" },
  { path: "/student/progress", name: "progress", area: "student" },
  { path: "/student/leaderboard", name: "leaderboard", area: "student" },
  { path: "/student/badges", name: "badges", area: "student" },
];

const teacher: Screen[] = [
  { path: "/teacher", name: "dashboard", area: "teacher" },
  { path: "/teacher/classes", name: "classes", area: "teacher" },
  { path: "/teacher/questions", name: "questions", area: "teacher" },
  { path: "/teacher/assignments", name: "assignments", area: "teacher" },
  { path: "/teacher/grading", name: "grading", area: "teacher" },
  { path: "/teacher/sessions", name: "sessions", area: "teacher" },
  { path: "/teacher/income", name: "income", area: "teacher" },
];

const admin: Screen[] = [
  { path: "/admin", name: "dashboard", area: "admin" },
  { path: "/admin/users", name: "users", area: "admin" },
  { path: "/admin/invoices", name: "invoices", area: "admin" },
  { path: "/admin/invoices/generate", name: "invoices-generate", area: "admin" },
  { path: "/admin/payroll", name: "payroll", area: "admin" },
  { path: "/admin/payroll/sessions", name: "payroll-sessions", area: "admin" },
  { path: "/admin/pay-rates", name: "pay-rates", area: "admin" },
  { path: "/admin/tuition-rates", name: "tuition-rates", area: "admin" },
  { path: "/admin/monitoring", name: "monitoring", area: "admin" },
  { path: "/admin/profile", name: "profile", area: "admin" },
];

export const ALL_SCREENS: Screen[] = [...student, ...teacher, ...admin];

/**
 * The rule is "screenshot the routes this commit actually touched", so the
 * default is *nothing* unless the caller says what to check:
 *
 *   PW_ROUTES=/student,/student/grammar   exact paths
 *   PW_AREA=student                       one whole area
 *   PW_ALL=1                              everything
 *
 * Selecting nothing is an error rather than a silent pass — a check that
 * quietly verifies zero screens is worse than no check at all.
 */
export function selectScreens(env: NodeJS.ProcessEnv = process.env): Screen[] {
  if (env.PW_ALL) return ALL_SCREENS;

  const routes = (env.PW_ROUTES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (routes.length) {
    const picked = routes.map((path) => {
      const known = ALL_SCREENS.find((s) => s.path === path);
      if (known) return known;
      throw new Error(
        `PW_ROUTES contains "${path}", which is not in tests/routes.ts. ` +
          `Add it there (with a valid id if it is a dynamic route) rather than skipping it.`,
      );
    });
    return picked;
  }

  const area = env.PW_AREA?.trim() as Area | undefined;
  if (area) {
    const picked = ALL_SCREENS.filter((s) => s.area === area);
    if (!picked.length) throw new Error(`PW_AREA="${area}" matches no screens.`);
    return picked;
  }

  throw new Error(
    "No screens selected. Set PW_ROUTES=<comma-separated paths>, PW_AREA=<student|teacher|admin>, or PW_ALL=1.",
  );
}
