// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Founder asked to open and walk around a premium-account preview; found `/design-preview`
 * had no links to any of the twelve preview routes and no way to compare tiers side by
 * side. `PreviewToolbar` is the persistent control that closes that gap — these pin its
 * one real behavior: flipping the tier updates the URL's `?tier=` param without dropping
 * any other param already there (map's own `?country=`, in particular), and the "back to
 * index" link always carries the current tier forward too, so the loop (index -> a route
 * -> back to index -> a different route) never silently resets to Standard.
 */

const h = vi.hoisted(() => ({
  pathname: "/design-preview/map",
  search: "country=United+Kingdom",
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => h.pathname,
  useSearchParams: () => new URLSearchParams(h.search),
  useRouter: () => ({ replace: h.replace }),
}));

import { PreviewToolbar } from "@/app/(dev-preview)/design-preview/preview-toolbar";

beforeEach(() => {
  h.pathname = "/design-preview/map";
  h.search = "country=United+Kingdom";
  h.replace.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("PreviewToolbar", () => {
  test("starting from Standard, clicking Ultra adds ?tier=ultra without dropping the existing ?country= param", () => {
    render(<PreviewToolbar />);
    fireEvent.click(screen.getByRole("button", { name: "Ultra" }));

    expect(h.replace).toHaveBeenCalledTimes(1);
    const [url] = h.replace.mock.calls[0];
    expect(url).toContain("/design-preview/map?");
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("tier")).toBe("ultra");
    expect(params.get("country")).toBe("United Kingdom");
  });

  test("starting from Ultra, clicking Standard removes ?tier= entirely rather than writing tier=standard", () => {
    h.search = "country=United+Kingdom&tier=ultra";
    render(<PreviewToolbar />);
    fireEvent.click(screen.getByRole("button", { name: "Standard" }));

    const [url] = h.replace.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1] ?? "");
    expect(params.has("tier")).toBe(false);
    expect(params.get("country")).toBe("United Kingdom");
  });

  test("aria-pressed reflects the tier read from the URL, not a default", () => {
    h.search = "tier=ultra";
    render(<PreviewToolbar />);
    expect(screen.getByRole("button", { name: "Ultra" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "false");
  });

  test('the "all previews" link carries the current tier, so navigating back and choosing a different route keeps the same comparison state', () => {
    h.search = "tier=ultra";
    render(<PreviewToolbar />);
    expect(screen.getByRole("link", { name: /All previews/ })).toHaveAttribute("href", "/design-preview?tier=ultra");
  });

  test('on Standard, the "all previews" link has no stray ?tier= param at all', () => {
    h.search = "";
    render(<PreviewToolbar />);
    expect(screen.getByRole("link", { name: /All previews/ })).toHaveAttribute("href", "/design-preview");
  });
});
