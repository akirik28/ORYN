// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";

/**
 * Component-level coverage for the plan page's two hard constraints (CEO's assignment):
 * no buy button, and no invented capabilities in the comparison table. Same
 * mocked-Server-Action-boundary approach as entity-combobox.test.tsx.
 */

vi.mock("@/app/(app)/settings/actions", () => ({
  registerUltraInterestAction: vi.fn(),
}));

import { registerUltraInterestAction } from "@/app/(app)/settings/actions";
import { PlanTierView } from "@/features/settings/plan-tier-view";

const mockedRegister = vi.mocked(registerUltraInterestAction);

function renderView(tier: "standard" | "ultra") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlanTierView tier={tier} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  mockedRegister.mockReset();
  mockedRegister.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

describe("PlanTierView — no buy button", () => {
  test("a standard-tier student sees an honest interest button, never anything resembling checkout", () => {
    renderView("standard");
    expect(screen.getByText("Interested in Ultra?")).toBeInTheDocument();
    expect(screen.getByText(/Ultra isn't available to buy yet/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "I'm interested" });
    expect(button).toBeInTheDocument();
    // The one interactive control on the whole page must not read like a purchase --
    // checked on actual buttons/links (accessible names), not prose: the honest disclosure
    // above legitimately contains the word "buy" ("isn't available to buy yet"), which a
    // plain page-wide text search would (and, in an earlier draft of this test, did)
    // wrongly flag as if it were a purchase control.
    const interactiveNames = [...screen.queryAllByRole("button"), ...screen.queryAllByRole("link")].map((el) => el.textContent ?? "");
    for (const forbidden of ["Buy", "Upgrade", "Subscribe", "Checkout", "Pay"]) {
      expect(interactiveNames.some((name) => new RegExp(forbidden, "i").test(name))).toBe(false);
    }
  });

  test("clicking the interest button calls the real action once and shows a plain confirmation, not a fake success/receipt state", async () => {
    renderView("standard");
    fireEvent.click(screen.getByRole("button", { name: "I'm interested" }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Thanks — we'll let you know.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I'm interested" })).not.toBeInTheDocument();
  });

  test("an ultra-tier student sees no call to action at all -- they have nothing to register interest in", () => {
    renderView("ultra");
    expect(screen.queryByText("Interested in Ultra?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I'm interested" })).not.toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });
});

describe("PlanTierView — current plan display", () => {
  test("a standard-tier student sees Standard as their current plan, not Ultra", () => {
    renderView("standard");
    expect(screen.getByText("Current plan")).toBeInTheDocument();
    expect(screen.getByText("Standard", { selector: "[class*='text-2xl']" })).toBeInTheDocument();
  });

  test("an ultra-tier student sees Ultra as their current plan, with the badge", () => {
    renderView("ultra");
    expect(screen.getByText("Ultra", { selector: "[class*='text-2xl']" })).toBeInTheDocument();
    expect(screen.getByText("Ultra", { selector: "span" })).toBeInTheDocument(); // the badge
  });
});

describe("PlanTierView — comparison table is data-driven, not hardcoded", () => {
  test("renders exactly the rows TIER_COMPARISON_ROWS declares, each from its own catalog entry", () => {
    renderView("standard");
    // The two "differs" rows.
    expect(screen.getByText("App appearance")).toBeInTheDocument();
    expect(screen.getByText("Standard theme")).toBeInTheDocument();
    expect(screen.getByText("Premium visual theme")).toBeInTheDocument();
    expect(screen.getByText("Advisor replies")).toBeInTheDocument();
    // The honest, specific claim (matches the real degraded-state copy,
    // messages/en.json's own advisor.usage.degraded string), not a vague "more messages" --
    // the actual mechanism a student meets is a reply-quality degrade, not a hard cutoff.
    expect(screen.getByText(/Shorter replies/)).toBeInTheDocument();
    expect(screen.getByText(/Full-length replies/)).toBeInTheDocument();
    // The sameByDesign row: one label, one shared value spanning both columns, never a
    // separate standard/ultra pair for it.
    expect(screen.getByText("Weekly plan focus")).toBeInTheDocument();
    expect(screen.getByText(/Top 3 priorities for everyone/)).toBeInTheDocument();
  });

  test("the honest floor: no fourth capability is claimed anywhere on the page", () => {
    renderView("standard");
    // Guards against a future edit accidentally reintroducing an unresearched claim --
    // these words never appear on this page today because oryn-60's research doesn't
    // support them yet (docs/ultra-tier-value-2026-09-02.md).
    for (const unresearched of ["quota", "unlimited", "priority support", "faster refresh"]) {
      expect(screen.queryByText(new RegExp(unresearched, "i"))).not.toBeInTheDocument();
    }
  });
});
