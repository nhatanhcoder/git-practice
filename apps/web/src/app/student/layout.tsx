/**
 * Segment layout for everything under /student.
 *
 * Deliberately does nothing. The guard, the learner shell and student.css all moved down
 * into the `(app)` route group, because they must not apply to every child of this segment:
 * Every /student route is behind the login gate (A02); the prototype landing
 * page that sat outside it was removed (WEB-017, 2026-09-12), and a future
 * public page must live outside this layout on purpose.
 * login and wrap it in the learner sidebar. A child layout cannot escape its parent, so the
 * only way to have both a guarded area and a public sibling under one segment is to keep
 * this level empty and put the guarded routes in a group.
 *
 * `(app)` contributes nothing to the URL, so /student and /student/grammar are unchanged.
 *
 * Do not add a guard, a shell or a stylesheet here. Add it to `(app)/layout.tsx` instead,
 * or the public pages break silently — the page still renders, then redirects.
 */
export default function StudentSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
