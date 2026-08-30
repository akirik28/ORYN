// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NotConfiguredNotice } from "@/features/system/not-configured-notice";

/**
 * Regression coverage for the 2026-08-29 mobile sweep: this is the single component every
 * (auth)/(onboarding)/(app) layout renders when Supabase isn't configured (all three call
 * it with no props, i.e. the default title/description below), so it's the one thing every
 * route in the app actually shows in this sandbox. Its default description names env vars
 * like NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — a single 36-character token with no natural
 * break point. As a flex child with no explicit width, the card's default min-width is
 * content-based (`auto`), so that one word held the card open past the viewport at every
 * width up to ~380px — confirmed live via scrollWidth > clientWidth (visually subtle enough
 * at phone width to miss by eye, which is exactly how it shipped unnoticed).
 *
 * jsdom doesn't lay out text the way a real browser does, so this can't re-prove the pixel
 * overflow itself (that's proven live, see the mobile-sweep report) — what it CAN and does
 * prove is the actual CSS mechanism of the fix: `break-words` is present on the element
 * that holds the long token, and the card has an explicit `w-full` to shrink from.
 */
afterEach(cleanup);

describe("NotConfiguredNotice", () => {
  test("renders the default Supabase message", () => {
    render(<NotConfiguredNotice />);
    expect(screen.getByText("Supabase isn't configured yet")).toBeInTheDocument();
    expect(screen.getByText(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)).toBeInTheDocument();
  });

  test("the description can wrap a long unbroken token — break-words is applied", () => {
    render(<NotConfiguredNotice />);
    const description = screen.getByText(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
    expect(description.className).toMatch(/break-words/);
  });

  test("the card has an explicit width basis to shrink from as a flex child", () => {
    render(<NotConfiguredNotice />);
    const card = screen.getByText("Supabase isn't configured yet").closest("div");
    expect(card?.className).toMatch(/\bw-full\b/);
  });

  test("supports a custom title/description without losing the wrap behavior", () => {
    render(<NotConfiguredNotice title="Anthropic isn't configured yet" description="Set ANTHROPIC_API_KEY_WITH_AN_UNUSUALLY_LONG_UNBROKEN_NAME in .env.local." />);
    expect(screen.getByText("Anthropic isn't configured yet")).toBeInTheDocument();
    const description = screen.getByText(/ANTHROPIC_API_KEY_WITH_AN_UNUSUALLY_LONG_UNBROKEN_NAME/);
    expect(description.className).toMatch(/break-words/);
  });
});
