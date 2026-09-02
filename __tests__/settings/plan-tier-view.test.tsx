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
    expect(screen.getByText(/isn't available to buy yet/)).toBeInTheDocument();
    // The price sits next to the same honest disclosure, not in place of it -- a concrete
    // price beside a button that can't take money is the fake-button case unless the page
    // says plainly what the state is (CEO's own framing for this assignment).
    expect(screen.getByText(/399\.99 TL\/month/)).toBeInTheDocument();
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
    expect(screen.getByText(/animated flame theme/)).toBeInTheDocument();
    expect(screen.getByText("Reply depth")).toBeInTheDocument();
    // The honest, specific claim: a genuinely shipped, server-enforced difference
    // (features/advisor/response-mode-slider.tsx's Ultra-only "thorough" mode), not the
    // token-pool/degrade-timing split the assignment asked for -- neither of those shipped
    // (the founder closed that discussion the same night), so this row states what's real
    // instead of what was merely proposed. See lib/tier/comparison.ts's own note.
    expect(screen.getByText(/Fast or Standard replies/)).toBeInTheDocument();
    expect(screen.getByText(/Longer, more detailed replies/)).toBeInTheDocument();
    // The two sameByDesign rows: one label each, one shared value spanning both columns,
    // never a separate standard/ultra pair.
    expect(screen.getByText("Weekly plan focus")).toBeInTheDocument();
    expect(screen.getByText(/Top 3 priorities for everyone/)).toBeInTheDocument();
    expect(screen.getByText("Research project ideas")).toBeInTheDocument();
    expect(screen.getByText(/Up to 3 per generation for everyone/)).toBeInTheDocument();
  });

  test("the honest floor: no fifth capability, and no urgency language on the trial, anywhere on the page", () => {
    renderView("standard");
    // Guards against a future edit accidentally reintroducing an unresearched claim --
    // these words never appear on this page today because they're not backed by shipped
    // code (docs/ultra-tier-value-2026-09-02.md, docs/ultra-feature-recommendation-2026-09-02.md).
    for (const unresearched of ["quota", "unlimited", "priority support", "faster refresh"]) {
      expect(screen.queryByText(new RegExp(unresearched, "i"))).not.toBeInTheDocument();
    }
    // The free-trial fact must read as a stated term, never a pressure device -- CEO's
    // explicit constraint on this assignment: no countdown, no "limited time", no urgency.
    for (const forbiddenUrgency of ["limited time", "hurry", "act now", "today only", "don't miss", "expires"]) {
      expect(screen.queryByText(new RegExp(forbiddenUrgency, "i"))).not.toBeInTheDocument();
    }
  });
});

describe("PlanTierView — Ultra text stays legible against a warm ground", () => {
  test("neither the current-plan title nor the comparison table's Ultra header uses gradient-clipped text", () => {
    // Live regression, 2026-09-02: tier-grad-text (transparent glyphs, flame gradient
    // painted through via background-clip) read fine when this page's background was
    // lavender and became unreadable -- amber text on the amber Ultra page ground -- the
    // moment the ground itself turned warm. Reported directly by the founder against the
    // table header specifically ("ultra yazısı gözükmüyor"). Both labels are now plain
    // text, matching standardName's own already-safe treatment, so this asserts the fix
    // holds rather than merely that the word renders (it always rendered -- in the DOM,
    // just invisible, which a plain toBeInTheDocument check would never have caught).
    renderView("ultra");
    const cardTitle = screen.getByText("Ultra", { selector: "[class*='text-2xl']" });
    expect(cardTitle.className).not.toMatch(/tier-grad-text/);
    const columnHeader = screen.getByRole("columnheader", { name: "Ultra" });
    expect(columnHeader.className).not.toMatch(/tier-grad-text/);
  });

  test("comparison table cells wrap long values instead of clipping them", () => {
    // Live regression, same report: Table's own shadcn default is whitespace-nowrap, sized
    // for short data values -- this table's standard/ultra columns hold full sentences,
    // and nowrap clipped them at the card's max-w-xl edge instead of wrapping. Every cell
    // must override it, not just the ones that happened to overflow first.
    renderView("standard");
    for (const cell of [...screen.getAllByRole("cell"), ...screen.getAllByRole("columnheader")]) {
      expect(cell.className).toMatch(/whitespace-normal/);
      expect(cell.className).not.toMatch(/whitespace-nowrap/);
    }
  });
});
