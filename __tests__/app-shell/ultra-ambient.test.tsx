// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { UltraAmbient } from "@/features/app-shell/ultra-ambient";

/**
 * Coverage for the two hard constraints CEO named for this component specifically:
 * "cap the particle count and stop the RAF loop when data-tier isn't ultra — a background
 * animation running for free users is a battery bug" and "prefers-reduced-motion must
 * hold... not a degraded mode, a static one."
 *
 * A real canvas 2D context doesn't exist in jsdom, so it's mocked to a minimal stand-in
 * that records calls — this file is testing WHETHER the RAF loop runs and WHAT triggers a
 * draw, not the pixel output of any one frame.
 */

let matchMediaMatches = false;
function mockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: "",
  };
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
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.tier;
  document.documentElement.classList.remove("tier-transition-lock");
});

describe("UltraAmbient — sets the single source of truth every [data-tier=\"ultra\"] selector reads", () => {
  test("standard: <html> never carries data-tier", () => {
    render(<UltraAmbient tier="standard" />);
    expect(document.documentElement.dataset.tier).toBeUndefined();
  });

  test("ultra: <html> carries data-tier=\"ultra\"", () => {
    render(<UltraAmbient tier="ultra" />);
    expect(document.documentElement.dataset.tier).toBe("ultra");
  });

  test("unmount removes the attribute rather than leaving it stale", () => {
    const { unmount } = render(<UltraAmbient tier="ultra" />);
    expect(document.documentElement.dataset.tier).toBe("ultra");
    unmount();
    expect(document.documentElement.dataset.tier).toBeUndefined();
  });
});

describe("UltraAmbient — the RAF loop, gated exactly on tier === \"ultra\"", () => {
  test("standard: requestAnimationFrame is never called — no animation runs for a free student", () => {
    render(<UltraAmbient tier="standard" />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("ultra: requestAnimationFrame is called to start the ember loop", () => {
    render(<UltraAmbient tier="ultra" />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  test("switching from ultra back to standard cancels the running loop", () => {
    const { rerender } = render(<UltraAmbient tier="ultra" />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    rerender(<UltraAmbient tier="standard" />);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  test("unmounting while ultra cancels the loop rather than leaking it", () => {
    const { unmount } = render(<UltraAmbient tier="ultra" />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("UltraAmbient — prefers-reduced-motion: a static frame, not a degraded or animated one", () => {
  test("ultra + reduced motion: draws once (clearRect called) but never starts the RAF loop", () => {
    matchMediaMatches = true;
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    render(<UltraAmbient tier="ultra" />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  test("standard + reduced motion: still no RAF, same as standard alone", () => {
    matchMediaMatches = true;
    render(<UltraAmbient tier="standard" />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});

describe("UltraAmbient — tier-transition-lock, so a stuck first-paint transition can't ship silently", () => {
  test("ultra: <html> gains the lock class immediately, synchronously with the attribute", () => {
    render(<UltraAmbient tier="ultra" />);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(true);
  });

  test("the lock class is released shortly after, not left on indefinitely", () => {
    vi.useFakeTimers();
    render(<UltraAmbient tier="ultra" />);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(true);
    vi.advanceTimersByTime(50);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(false);
    vi.useRealTimers();
  });

  test("standard: the lock class is still applied and released around the (no-op) attribute removal", () => {
    // Symmetry, not an oversight: the lock exists to cover whichever direction the
    // transition runs, and flipping ultra -> standard changes computed colors back just as
    // much as the reverse does.
    vi.useFakeTimers();
    render(<UltraAmbient tier="standard" />);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(true);
    vi.advanceTimersByTime(50);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(false);
    vi.useRealTimers();
  });

  test("unmounting before the release timer fires still leaves the lock removed, not stuck on", () => {
    const { unmount } = render(<UltraAmbient tier="ultra" />);
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("tier-transition-lock")).toBe(false);
  });
});
