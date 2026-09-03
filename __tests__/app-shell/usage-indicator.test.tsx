// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { UsageIndicator } from "@/features/app-shell/usage-indicator";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import messages from "@/messages/en.json";

/**
 * Same battery-safety and reduced-motion contract __tests__/app-shell/sidebar-flame.test.tsx
 * already holds this flame family to, applied to the two things specific to this component:
 * the flame only ever renders (and its RAF loop only ever starts) when BOTH tier === "ultra"
 * AND the usage state is "normal" — every other combination, including Standard tier
 * entirely, must render the plain fill bar with no canvas RAF loop at all. This is the
 * mechanism docs/reduced-motion-standard-2026-09-02.md and this file's own header comment
 * both describe; this is what actually pins it.
 *
 * Not covered here: the pixel output of drawUsageFlame itself, or a next build/next start
 * render — the shared symlinked node_modules this fleet's disk-pressure fix introduced
 * rejects a Turbopack production build outright ("Symlink [project]/node_modules is invalid,
 * it points out of the filesystem root"), confirmed live while building this exact change,
 * not assumed. This suite is the closest available substitute: it cannot see a stalled or
 * miscoloured flame, but it can catch a crash, and it can prove the RAF/reduced-motion
 * contract holds regardless of what the pixels look like.
 */

function quota(overrides: Partial<MonthlyQuota> = {}): MonthlyQuota {
  return {
    used: 50000,
    limit: 236150,
    remaining: 186150,
    fraction: 50000 / 236150,
    resetsAt: "2026-10-01T00:00:00.000Z",
    usedIsKnown: true,
    ...overrides,
  };
}

function mockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: "",
    globalCompositeOperation: "source-over",
  };
}

let matchMediaMatches = false;

function renderIndicator(props: Partial<Parameters<typeof UsageIndicator>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <UsageIndicator quota={quota()} budgetDegraded={false} tier="standard" {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  matchMediaMatches = false;
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: matchMediaMatches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockContext() as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 96,
    height: 44,
    top: 0,
    left: 0,
    right: 96,
    bottom: 44,
    x: 0,
    y: 0,
    toJSON() {},
  });
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("UsageIndicator — the flame is gated on tier AND state together, not tier alone", () => {
  test("standard tier, healthy quota: no RAF — Standard never gets the flame regardless of state", () => {
    renderIndicator({ tier: "standard", quota: quota() });
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("ultra tier, normal state: RAF starts — the one case that gets the flame", () => {
    renderIndicator({ tier: "ultra", quota: quota() });
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  test("ultra tier, exhausted: no RAF — the plain rose fill, not a flame, once the allowance is gone", () => {
    renderIndicator({ tier: "ultra", quota: quota({ remaining: 0 }) });
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("ultra tier, degraded: no RAF — degrade takes the plain amber treatment, same as low", () => {
    renderIndicator({ tier: "ultra", quota: quota(), budgetDegraded: true });
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("ultra tier, unknown: no RAF — a burning bar must never be what an unreadable count looks like", () => {
    renderIndicator({ tier: "ultra", quota: quota({ usedIsKnown: false }) });
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("unmounting the flame state cancels the loop rather than leaking it", () => {
    const { unmount } = renderIndicator({ tier: "ultra", quota: quota() });
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("UsageIndicator — prefers-reduced-motion: one frame, not a loop, live-reactive", () => {
  test("ultra + normal + reduced motion: draws once but never starts RAF", () => {
    matchMediaMatches = true;
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    renderIndicator({ tier: "ultra", quota: quota() });

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalled();
  });
});

describe("UsageIndicator — the animated path paints before its first RAF frame lands", () => {
  // 2026-09-04, live bug: `beforeEach` above mocks `requestAnimationFrame` to `() => 1` --
  // it schedules nothing and never invokes its callback, which is exactly what a browser
  // does to a backgrounded tab (throttled or suspended entirely) and exactly what this
  // Browser-pane tool did when the founder reported a solid black box where the flame
  // should be. Before this fix, `paint()` was only ever called from inside the RAF
  // callback (or once, synchronously, on the reduced-motion path above) -- so with RAF
  // mocked this way, the canvas was cleared/drawn to zero times, the same as it would be
  // on a real backgrounded tab whose first frame hasn't landed yet. This test asserts the
  // fix: a synchronous paint happens before `requestAnimationFrame` is even called, so the
  // canvas already has real content regardless of whether or when the browser ever honors
  // the scheduled frame.
  test("ultra + normal, motion allowed: the canvas is painted even though the mocked RAF never invokes its callback", () => {
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    renderIndicator({ tier: "ultra", quota: quota() });

    // The loop is still scheduled (unchanged behavior)...
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    // ...but painting must not depend on that scheduled callback ever actually running --
    // the mock never invokes it, so any call recorded here happened synchronously, in the
    // same tick as mount.
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
  });
});
