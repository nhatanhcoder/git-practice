/**
 * Segment layout for everything under /student.
 *
 * Deliberately does nothing. The guard, the learner shell and student.css all moved down
 * into the `(app)` route group, because they must not apply to every child of this
 * segment. (The prototype landing page was the reason once — it has since been
 * removed entirely, WEB-017.) A child layout cannot escape its parent,
 * so guarded routes live in the group.
 *
 * `(app)` contributes nothing to the URL, so /student and /student/grammar are unchanged.
 *
 * Do not add a guard, a shell or a stylesheet here. Add it to `(app)/layout.tsx` instead.
 */
export default function StudentSegmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
