// @vitest-environment jsdom
import { describe, test, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * A real render test, not a source-pin — unlike world-map-explorer.tsx (a large
 * "use client" component wrapping a third-party map library, where a source-pin test is the
 * honest option available), DevPreviewTierStamp's whole job is a `useSearchParams` read plus
 * a `useEffect` DOM mutation, small enough to genuinely exercise in jsdom rather than only
 * assert the right strings exist. This is the actual mechanism proof the map pin harness bug
 * needed: `document.documentElement.dataset.tier` really does flip based on the URL, in a
 * real (if simulated) DOM, not just "the code that should do this is present."
 */

let currentSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
}));

import { DevPreviewTierStamp } from "@/app/(dev-preview)/dev-preview-tier-stamp";

beforeEach(() => {
  currentSearchParams = new URLSearchParams();
  delete document.documentElement.dataset.tier;
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.tier;
});

describe("DevPreviewTierStamp", () => {
  test("no ?tier param: data-tier is never set", async () => {
    render(<DevPreviewTierStamp />);
    await waitFor(() => expect(document.documentElement.hasAttribute("data-tier")).toBe(false));
  });

  test("?tier=ultra: stamps data-tier=\"ultra\" on <html>", async () => {
    currentSearchParams = new URLSearchParams("tier=ultra");
    render(<DevPreviewTierStamp />);
    await waitFor(() => expect(document.documentElement.getAttribute("data-tier")).toBe("ultra"));
  });

  test("?tier=standard (or any other value): does not set data-tier — absence is the signal, matching UltraAmbient's own convention, not a literal \"standard\" string", async () => {
    currentSearchParams = new URLSearchParams("tier=standard");
    render(<DevPreviewTierStamp />);
    await waitFor(() => expect(document.documentElement.hasAttribute("data-tier")).toBe(false));
    cleanup();

    currentSearchParams = new URLSearchParams("tier=something-else");
    render(<DevPreviewTierStamp />);
    await waitFor(() => expect(document.documentElement.hasAttribute("data-tier")).toBe(false));
  });

  test("unmounting removes data-tier — a harness navigating away must not leave the attribute stuck", async () => {
    currentSearchParams = new URLSearchParams("tier=ultra");
    const { unmount } = render(<DevPreviewTierStamp />);
    await waitFor(() => expect(document.documentElement.getAttribute("data-tier")).toBe("ultra"));
    unmount();
    expect(document.documentElement.hasAttribute("data-tier")).toBe(false);
  });

  test("renders nothing — this is a side-effect-only component, not a visible one", () => {
    const { container } = render(<DevPreviewTierStamp />);
    expect(container).toBeEmptyDOMElement();
  });
});
