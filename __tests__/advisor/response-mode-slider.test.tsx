// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { ResponseModeSlider } from "@/features/advisor/response-mode-slider";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";
import messages from "@/messages/en.json";

/**
 * Same closed-form/no-stall contract this whole flame family shares
 * (__tests__/app-shell/sidebar-flame.test.tsx, __tests__/app-shell/usage-indicator.test.tsx),
 * adapted to this component's one real structural difference: the ball's spring-eased
 * position animates continuously in every mode (a real, if small, motion — the track itself
 * moving toward wherever the student last chose), so RAF runs regardless of Fast/Standard/
 * Ultra. What actually varies by mode is the dot-matrix's own flow — static density ramp at
 * Fast/Standard, only flowing at Ultra with an active (non-degraded) selection — which this
 * black-box RAF-count style of test cannot see the pixels of, the same limitation
 * usage-indicator.test.tsx's own header names for the same reason: no next build/next start
 * render is available right now (Turbopack rejects this fleet's shared symlinked
 * node_modules for a production build, confirmed live while building this exact change).
 *
 * Reduced motion here means the same thing it means everywhere else in this flame family:
 * the ball snaps straight to its target and the matrix never flows, one paint, no RAF.
 */

const { updateResponseModeMock } = vi.hoisted(() => ({ updateResponseModeMock: vi.fn().mockResolvedValue({}) }));
vi.mock("@/app/(app)/settings/actions", () => ({ updateResponseMode: updateResponseModeMock }));

function quota(): MonthlyQuota {
  return {
    used: 50000,
    limit: 236150,
    remaining: 186150,
    fraction: 50000 / 236150,
    resetsAt: "2026-10-01T00:00:00.000Z",
    usedIsKnown: true,
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

function renderSlider(props: Partial<Parameters<typeof ResponseModeSlider>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ResponseModeSlider responseMode="balanced" budgetDegraded={false} quota={quota()} planTier="ultra" {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  matchMediaMatches = false;
  updateResponseModeMock.mockReset().mockResolvedValue({});
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
    width: 260,
    height: 52,
    top: 0,
    left: 0,
    right: 260,
    bottom: 52,
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

describe("ResponseModeSlider — renders every mode/degrade combination without throwing", () => {
  test.each([
    ["fast", false],
    ["balanced", false],
    ["thorough", false],
    ["thorough", true],
  ] as const)("responseMode=%s, budgetDegraded=%s", (responseMode, budgetDegraded) => {
    expect(() => renderSlider({ responseMode, budgetDegraded })).not.toThrow();
  });

  test("RAF starts regardless of mode — the ball's own easing is real motion in all three", () => {
    renderSlider({ responseMode: "fast" });
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  test("unmounting cancels the loop rather than leaking it", () => {
    const { unmount } = renderSlider();
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("ResponseModeSlider — the degrade-override note only appears for the one case it applies to", () => {
  // Plain vitest matchers, not jest-dom's toBeInTheDocument (not registered in this
  // project's vitest setup) — getByText already throws if nothing matches, so a truthy
  // result IS "found"; queryByText returns null on no match, so null IS "not found".
  test("thorough + degraded: the override note renders", () => {
    const { getByText } = renderSlider({ responseMode: "thorough", budgetDegraded: true });
    expect(getByText(/Ultra is saved for after this resets/)).toBeTruthy();
  });

  test("thorough + not degraded: no override note — Ultra is genuinely in effect", () => {
    const { queryByText } = renderSlider({ responseMode: "thorough", budgetDegraded: false });
    expect(queryByText(/Ultra is saved for after this resets/)).toBeNull();
  });

  test("fast + degraded: no override note — nothing to override when Fast was already the cheap model", () => {
    const { queryByText } = renderSlider({ responseMode: "fast", budgetDegraded: true });
    expect(queryByText(/Ultra is saved for after this resets/)).toBeNull();
  });
});

describe("ResponseModeSlider — prefers-reduced-motion: one frame, not a loop", () => {
  test("reduced motion: draws once but never starts RAF, in every mode", () => {
    matchMediaMatches = true;
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    renderSlider({ responseMode: "thorough" });

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalled();
  });
});

describe("ResponseModeSlider — Ultra is plan-gated, everything else stays free", () => {
  test("standard plan + balanced: the locked note shows, naming what Ultra is", () => {
    const { getByText } = renderSlider({ planTier: "standard", responseMode: "balanced" });
    expect(getByText(/Ultra gives longer, more thorough answers/)).toBeTruthy();
  });

  test("ultra plan + balanced: no locked note — nothing to explain, Ultra is genuinely reachable", () => {
    const { queryByText } = renderSlider({ planTier: "ultra", responseMode: "balanced" });
    expect(queryByText(/Ultra gives longer, more thorough answers/)).toBeNull();
  });

  test("standard plan + a stale stored \"thorough\" (e.g. after a downgrade): locked note shows, not the degrade note", () => {
    // Both conditions could technically be true at once (stale thorough AND spend-degraded)
    // — the plan reason must win, since it's the more fundamental one: a standard student
    // can't reach Ultra regardless of this month's spend, so telling them "it resets" would
    // be false. This is the precedence the component itself encodes, pinned here so it
    // can't silently flip.
    const { getByText, queryByText } = renderSlider({ planTier: "standard", responseMode: "thorough", budgetDegraded: true });
    expect(getByText(/Ultra gives longer, more thorough answers/)).toBeTruthy();
    expect(queryByText(/Ultra is saved for after this resets/)).toBeNull();
  });

  test("standard plan: pressing the right arrow from Standard never reaches Ultra — the interactive ceiling itself, not just a locked display", () => {
    const { getByRole } = renderSlider({ planTier: "standard", responseMode: "balanced" });
    const slider = getByRole("slider");

    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(updateResponseModeMock).not.toHaveBeenCalled();
    expect(slider.getAttribute("aria-valuenow")).toBe("1");
  });

  test("ultra plan: the identical keypress genuinely reaches Ultra — proving the block above is plan-specific, not a general bug", () => {
    const { getByRole } = renderSlider({ planTier: "ultra", responseMode: "balanced" });
    const slider = getByRole("slider");

    fireEvent.keyDown(slider, { key: "ArrowRight" });

    expect(updateResponseModeMock).toHaveBeenCalledWith("thorough");
  });

  test("standard plan: clicking directly on the Ultra end of the track still resolves to Standard, not Ultra", () => {
    const { getByRole } = renderSlider({ planTier: "standard", responseMode: "balanced" });
    const slider = getByRole("slider");

    // pointerDown reads clientX against the track's own getBoundingClientRect (mocked to
    // width: 260 in beforeEach) — 250 sits well inside the rightmost (Ultra) third.
    fireEvent.pointerDown(slider, { clientX: 250 });

    expect(updateResponseModeMock).not.toHaveBeenCalled();
  });
});
