// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { SidebarFlame } from "@/features/app-shell/sidebar-flame";

/**
 * Same battery-safety and reduced-motion contract as ultra-ambient.test.tsx, applied to the
 * flame canvas: RAF only ever runs for tier === "ultra", is cancelled on unmount and on a
 * tier flip back to standard, and reduced-motion draws one frame instead of animating.
 *
 * Not covered here: the pixel output of drawFlame itself (the ported dot-matrix math) — that
 * function is already a founder-approved, previously-verified-non-stalling reference; this
 * file tests the React lifecycle wrapped around it, the part actually written for this
 * codebase.
 */

let matchMediaMatches = false;
function mockContext() {
  return {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    setTransform: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    fillStyle: "",
    globalCompositeOperation: "source-over",
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
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 214,
    height: 900,
    top: 0,
    left: 0,
    right: 214,
    bottom: 900,
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

describe("SidebarFlame — RAF gated exactly on tier === \"ultra\"", () => {
  test("standard: requestAnimationFrame is never called", () => {
    render(<SidebarFlame tier="standard" />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  test("ultra: requestAnimationFrame is called to start the loop", () => {
    render(<SidebarFlame tier="ultra" />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  test("switching from ultra back to standard cancels the running loop", () => {
    const { rerender } = render(<SidebarFlame tier="ultra" />);
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    rerender(<SidebarFlame tier="standard" />);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  test("unmounting while ultra cancels the loop rather than leaking it", () => {
    const { unmount } = render(<SidebarFlame tier="ultra" />);
    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});

describe("SidebarFlame — prefers-reduced-motion: one frame, not a loop", () => {
  test("ultra + reduced motion: draws once (clearRect called) but never starts RAF", () => {
    matchMediaMatches = true;
    const ctx = mockContext();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    render(<SidebarFlame tier="ultra" />);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(ctx.clearRect).toHaveBeenCalled();
  });

  test("standard + reduced motion: still no RAF, same as standard alone", () => {
    matchMediaMatches = true;
    render(<SidebarFlame tier="standard" />);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
