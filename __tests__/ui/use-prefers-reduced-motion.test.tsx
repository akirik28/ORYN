// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { usePrefersReducedMotion } from "@/lib/ui/use-prefers-reduced-motion";

/**
 * The whole point of this hook over the one-shot `window.matchMedia(...).matches` check
 * features/app-shell/ultra-ambient.tsx uses is live reactivity — a student flipping the OS
 * setting mid-session, not just its value at mount. So the test that matters most here is
 * not "returns the right boolean" (any one-shot check does that) but "updates when the
 * underlying media query fires a change event, without a remount" — mirroring the standard
 * __tests__/app-shell/ultra-ambient.test.tsx already holds itself to: assert the mechanism
 * (addEventListener/removeEventListener actually wired, actually cleaned up), not only the
 * outcome.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const addEventListener = vi.fn((event: string, cb: () => void) => {
    if (event === "change") listeners.add(cb);
  });
  const removeEventListener = vi.fn((event: string, cb: () => void) => {
    if (event === "change") listeners.delete(cb);
  });
  // A single object returned for every call, matching how a real MediaQueryList works
  // (window.matchMedia(sameQuery) returns a stable, live-updating list, not a new
  // snapshot each time) — both the hook's `subscribe` and its `getSnapshot` call
  // `window.matchMedia(QUERY)` independently (same shape as useIsDesktop's own two
  // separate calls), so the mock has to stay the same underlying object across both.
  const mql = {
    get matches() {
      return matches;
    },
    media: QUERY,
    addEventListener,
    removeEventListener,
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn((q: string) => {
      expect(q).toBe(QUERY);
      return mql;
    }),
  );
  return {
    fireChange(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
    listenerCount: () => listeners.size,
    addEventListener,
    removeEventListener,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("usePrefersReducedMotion", () => {
  test("returns the current value on mount, both ways", () => {
    mockMatchMedia(false);
    const { result: notReduced } = renderHook(() => usePrefersReducedMotion());
    expect(notReduced.current).toBe(false);

    mockMatchMedia(true);
    const { result: reduced } = renderHook(() => usePrefersReducedMotion());
    expect(reduced.current).toBe(true);
  });

  test("updates live when the OS setting changes mid-session — no remount, no reload", () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      media.fireChange(true);
    });
    expect(result.current).toBe(true);

    // And back — this is exactly the gap docs/reduced-motion-standard-2026-09-02.md named
    // in ultra-ambient.tsx: a mount-only check would never see this second flip either.
    act(() => {
      media.fireChange(false);
    });
    expect(result.current).toBe(false);
  });

  test("subscribes with addEventListener and unsubscribes the same callback on unmount", () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => usePrefersReducedMotion());

    expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(media.listenerCount()).toBe(1);

    unmount();
    expect(media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(media.listenerCount()).toBe(0);
  });

  test("server snapshot defaults to reduced motion — the safe direction before hydration", () => {
    // No window.matchMedia stub here on purpose: renderToString never calls getSnapshot at
    // all (useSyncExternalStore uses getServerSnapshot server-side), so a real SSR render
    // is what actually exercises the function under test, not a jsdom mock standing in for
    // a server that was never really there.
    function Probe() {
      const reduced = usePrefersReducedMotion();
      return <>{reduced ? "reduced" : "motion"}</>;
    }
    expect(renderToString(<Probe />)).toBe("reduced");
  });
});
