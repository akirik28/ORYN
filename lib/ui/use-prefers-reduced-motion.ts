"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// Unlike features/universities/university-explorer-hero.tsx's useIsDesktop (a layout
// concern, defaults to `false`/mobile on the server), this defaults to `true`. This is an
// accessibility gate, not a layout affordance: the failure worth avoiding is a moment of
// motion shown to a student who told their OS not to show them any, not a moment of
// stillness for a student who didn't ask for it. "We don't know yet, before hydration"
// should resolve toward the safer direction, not the more decorative one.
function getServerSnapshot() {
  return true;
}

/**
 * Live-reactive `prefers-reduced-motion` — built the same way
 * features/universities/university-explorer-hero.tsx's `useIsDesktop` already does
 * (`useSyncExternalStore` + `addEventListener("change", …)`), not invented fresh; that
 * file's own comment explains why this shape exists at all — it avoids the effect+setState
 * cascading-render pattern a plain `useEffect` + `useState` media-query check falls into.
 *
 * Exists because of a real gap docs/reduced-motion-standard-2026-09-02.md named rather than
 * fixed: the codebase's one prior reduced-motion check, the Ultra ember canvas's own
 * `window.matchMedia(...).matches` (features/app-shell/ultra-ambient.tsx), reads the media
 * query once, inside a `useEffect`, at mount. A student who mounts the app with motion
 * allowed and then turns reduced motion on mid-session — OS-level, no reload — never sees
 * that canvas react. This hook is the fix for every animation that needs it going forward,
 * not a patch to that one file; nothing here retrofits an existing component.
 *
 * A component using this for a `requestAnimationFrame` loop needs to do more than read the
 * value once, the way a plain `motion-safe:` class or `<MotionConfig>` would: call this
 * hook in the component body, and include its return value in the effect's dependency
 * array so the effect itself re-runs — starting the loop, or cancelling it and drawing one
 * static frame instead — when the value changes, not only when the component mounts.
 *
 * **Reduced motion is an accessibility floor, not a preference a paid tier overrides.** A
 * component gating decorative motion on both `tier === "ultra"` and this hook must treat
 * them as two independent gates, not one combined check — tier changes what an element
 * looks like; this changes whether it moves, the same way for every tier. "Olabildiğince
 * fazla animasyon" (as much animation as possible, founder direction, 2026-09-02) is the
 * default-path instruction, not license to skip this check for a paying student who has
 * told their operating system they want less motion.
 *
 * Reach for this only when `motion-safe:` and `<MotionConfig reducedMotion="user">` can't
 * reach the animation in question — a canvas/RAF loop, chiefly. Both of those already
 * handle reduced motion on their own; see the standard doc for the full decision tree.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
