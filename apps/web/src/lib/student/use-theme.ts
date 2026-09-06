"use client";

import { useEffect, useState } from "react";
import { useStudentStore } from "./store";

/**
 * The one place the Hán Lộ light/dark choice is read from.
 *
 * It existed in two places before, under two different localStorage keys: the learner shell
 * kept it in the zustand store (`hanlu-student`), and the landing page kept its own useState
 * mirrored to `hanlu-theme`. Switching to light on the landing page and then signing in put
 * you back in dark, because the two never saw each other's value. The auth screens made it
 * three, by hardcoding `data-theme="dark"` and ignoring the question entirely.
 *
 * The store wins as the source of truth — it is already persisted, already drives the shell,
 * and already survives a reload. This hook is the shared read/write surface on top of it.
 *
 * `skipHydration` on the store means the persisted value is not available on the first render.
 * Returning `dark` until `hydrated` is deliberate and matches the shell: rendering the stored
 * light theme before hydration would flash the wrong colours, and rendering nothing would
 * flash an empty page.
 */
export function useHanluTheme() {
  const theme = useStudentStore((s) => s.theme);
  const toggleTheme = useStudentStore((s) => s.toggleTheme);
  const hydrated = useStudentStore((s) => s.hydrated);
  const setHydrated = useStudentStore((s) => s.setHydrated);

  // Pages outside the learner shell (auth, landing) have no other rehydration trigger, so
  // this hook has to do it or the stored choice is never read on those routes.
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (started || hydrated) return;
    setStarted(true);
    void Promise.resolve(useStudentStore.persist?.rehydrate?.()).finally(() => setHydrated(true));
  }, [started, hydrated, setHydrated]);

  return {
    /** What to put on `data-theme`. Always a real value, never undefined. */
    theme: hydrated ? theme : ("dark" as const),
    toggleTheme,
    hydrated,
  };
}
