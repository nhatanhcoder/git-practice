import type { APIRequestContext } from "@playwright/test";
import type { Screen } from "./routes";

/**
 * Runtime id resolution for the dynamic screens in `routes.ts`.
 *
 * Static constants cannot name these ids: seed-created rows (classes, invoices,
 * payroll periods, users) get generated ids, and attempts only exist once
 * somebody starts them. Inventing an id screenshots a "not found" branch and
 * calls it green — so each resolver logs in, lists the resource and takes the
 * first real id. Anything unresolvable is reported as SKIP with a reason, never
 * silently dropped and never faked.
 *
 * Fixture policy: prefer seed rows (users, invoices, payroll periods, teacher
 * classes, student classes). The attempt fixtures have no seed equivalent, so
 * the sweep creates one timestamped set per worker (class + 2 questions +
 * assignment + attempt, all titled "PW sweep …") through the public API only —
 * no database access, no seed mutation. Rows accumulate in dev; CI runs on a
 * disposable database.
 */

const API_ACCOUNTS = {
  admin: { email: "admin@hsk.local", password: "Password123!" },
  teacher: { email: "teacher@hsk.local", password: "Password123!" },
  student: { email: "student@hsk.local", password: "Password123!" },
} as const;

type Area = keyof typeof API_ACCOUNTS;

async function api(
  request: APIRequestContext,
  apiBase: string,
  method: string,
  path: string,
  token?: string,
  data?: unknown,
) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await request.fetch(`${apiBase}${path}`, { method, headers, data });
  const body = await res.json().catch(() => null);
  return { status: res.status(), body };
}

const tokens: Partial<Record<Area, string>> = {};

async function tokenFor(
  request: APIRequestContext,
  apiBase: string,
  area: Area,
): Promise<string> {
  if (!tokens[area]) {
    const res = await api(request, apiBase, "POST", "/auth/login", undefined, API_ACCOUNTS[area]);
    if (res.status !== 200) throw new Error(`sweep login as ${area} failed: HTTP ${res.status}`);
    tokens[area] = res.body.data.accessToken as string;
  }
  return tokens[area] as string;
}

async function firstId(
  request: APIRequestContext,
  apiBase: string,
  area: Area,
  path: string,
): Promise<string | null> {
  const res = await api(request, apiBase, "GET", path, await tokenFor(request, apiBase, area));
  if (res.status !== 200) throw new Error(`sweep list ${path} failed: HTTP ${res.status}`);
  const rows = Array.isArray(res.body?.data) ? res.body.data : [];
  return (rows[0]?.id as string | undefined) ?? null;
}

export type Skip = { screen: Screen; reason: string };

/**
 * Resolves one dynamic screen to a concrete path, or returns a skip reason.
 * Results are cached per worker process so the fixture set is built once even
 * when several dynamic screens share it.
 */
const attemptFixturesCache = new Map<string, Promise<{ attemptId: string; classId: string; lessonId: string }>>();

async function attemptFixtures(
  request: APIRequestContext,
  apiBase: string,
  cacheKey: string,
): Promise<{ attemptId: string; classId: string; lessonId: string }> {
  let pending = attemptFixturesCache.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const teacherToken = await tokenFor(request, apiBase, "teacher");
      const studentToken = await tokenFor(request, apiBase, "student");
      const stamp = Date.now();

      const cls = await api(request, apiBase, "POST", "/teacher/classes", teacherToken, {
        name: `PW sweep class ${stamp}`,
        hskLevel: 3,
      });
      if (cls.status !== 201) throw new Error(`sweep class failed: HTTP ${cls.status}`);
      const classId = cls.body.data.id as string;
      const code = cls.body.data.enrollmentCode as string;
      await api(request, apiBase, "POST", "/student/classes/join", studentToken, {
        enrollmentCode: code,
      });

      const lesson = await api(request, apiBase, "POST", `/teacher/classes/${classId}/lessons`, teacherToken, {
        title: `PW sweep lesson ${stamp}`,
        contentType: "text",
        description: "Sweep fixture for the screen check.",
      });
      if (lesson.status !== 201) throw new Error(`sweep lesson failed: HTTP ${lesson.status}`);

      const mcq = await api(request, apiBase, "POST", "/teacher/questions", teacherToken, {
        skill: "reading",
        subType: "multiple_choice_multi",
        hskLevel: 3,
        difficulty: "medium",
        content: { prompt: "选择正确的词。" },
        options: [
          { id: "a", text: "认识" },
          { id: "b", text: "知道" },
        ],
        correctAnswer: ["a"],
      });
      const essay = await api(request, apiBase, "POST", "/teacher/questions", teacherToken, {
        skill: "writing",
        subType: "essay",
        hskLevel: 3,
        difficulty: "medium",
        content: { prompt: "请介绍你的家庭。", rubric: "Nội dung, từ vựng, ngữ pháp" },
        correctAnswer: null,
      });
      const asg = await api(request, apiBase, "POST", "/teacher/assignments", teacherToken, {
        classId,
        title: `PW sweep assignment ${stamp}`,
        type: "homework",
        dueDate: "2026-12-31T17:00:00Z",
        questionIds: [mcq.body.data.id, essay.body.data.id],
        status: "published",
      });
      if (asg.status !== 201) throw new Error(`sweep assignment failed: ${JSON.stringify(asg.body)}`);
      const start = await api(
        request,
        apiBase,
        "POST",
        `/student/assignments/${asg.body.data.id}/attempts`,
        studentToken,
      );
      if (start.status !== 201) throw new Error(`sweep attempt failed: ${JSON.stringify(start.body)}`);
      return {
        attemptId: start.body.data.attempt.id as string,
        classId,
        lessonId: lesson.body.data.id as string,
      };
    })();
    attemptFixturesCache.set(cacheKey, pending);
  }
  return pending;
}

export async function resolveOne(
  request: APIRequestContext,
  apiBase: string,
  screen: Screen,
): Promise<{ path: string } | Skip> {
  const fail = (reason: string): Skip => ({ screen, reason });
  switch (screen.resolve) {
    case "adminUser": {
      const id = await firstId(request, apiBase, "admin", "/admin/users?limit=1");
      return id ? { path: `/admin/users/${id}` } : fail("seed has no users");
    }
    case "adminInvoice": {
      const id = await firstId(request, apiBase, "admin", "/admin/invoices?limit=1");
      return id ? { path: `/admin/invoices/${id}` } : fail("seed has no invoices");
    }
    case "adminPayrollPeriod": {
      const id = await firstId(request, apiBase, "admin", "/admin/payroll?limit=1");
      return id ? { path: `/admin/payroll/${id}` } : fail("seed has no payroll periods");
    }
    case "teacherClass":
    case "teacherLessons": {
      const id = await firstId(request, apiBase, "teacher", "/teacher/classes");
      if (!id) return fail("seeded teacher owns no class");
      return { path: screen.resolve === "teacherClass" ? `/teacher/classes/${id}` : `/teacher/classes/${id}/lessons` };
    }
    case "studentClass": {
      const id = await firstId(request, apiBase, "student", "/student/classes");
      return id ? { path: `/student/classes/${id}` } : fail("seeded student joined no class");
    }
    case "studentLesson": {
      // Resolved from the sweep class (seeded teacher owns it, seeded student is
      // enrolled) — never by writing lessons into seed classes.
      const { classId, lessonId } = await attemptFixtures(request, apiBase, "sweep");
      return { path: `/student/classes/${classId}/lessons/${lessonId}` };
    }
    case "studentAttempt":
    case "studentAttemptResult": {
      const { attemptId } = await attemptFixtures(request, apiBase, "sweep");
      return {
        path:
          screen.resolve === "studentAttempt"
            ? `/student/attempts/${attemptId}`
            : `/student/attempts/${attemptId}/result`,
      };
    }
    default:
      return fail(`unknown resolver "${screen.resolve}"`);
  }
}
