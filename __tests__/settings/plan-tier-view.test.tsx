// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, fireEvent, waitFor, cleanup } from "@testing-library/react";
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
import { formatNumber, formatTokenCount } from "@/lib/i18n/format";

const mockedRegister = vi.mocked(registerUltraInterestAction);

// 2026-09-03, the founder-directed redesign: real current values, not arbitrary test
// numbers — these are what app/(app)/settings/plan/page.tsx actually passes in production
// (lib/ai/token-limits.ts's MONTHLY_AI_TOKEN_LIMIT, lib/ai/advisor-chat.ts's
// ADVISOR_MAX_TOKENS_STANDARD/_ULTRA), so a rendering assertion against these numbers is
// pinned to reality rather than to a fixture that happens to look plausible.
const ULTRA_TOKEN_LIMIT = 472_300;
const STANDARD_TOKEN_LIMIT = 236_150;
const ULTRA_MAX_TOKENS = 8192;
const STANDARD_MAX_TOKENS = 4096;

function renderView(tier: "standard" | "ultra") {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <PlanTierView
        tier={tier}
        ultraTokenLimit={ULTRA_TOKEN_LIMIT}
        standardTokenLimit={STANDARD_TOKEN_LIMIT}
        ultraMaxTokens={ULTRA_MAX_TOKENS}
        standardMaxTokens={STANDARD_MAX_TOKENS}
      />
    </NextIntlClientProvider>,
  );
}

// 2026-09-04: PlanTierView now mounts PlanGroundGlow (features/settings/plan-ground-glow.tsx)
// inside .plan-page-ground, which calls usePrefersReducedMotion() — jsdom has no
// window.matchMedia at all, so any render of this component crashes without a stub. Same
// mock shape as __tests__/app-shell/usage-indicator.test.tsx's own beforeEach (that
// component hits the identical hook+canvas combination), reused rather than re-derived.
function mockCanvasContext() {
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

beforeEach(() => {
  mockedRegister.mockReset();
  mockedRegister.mockResolvedValue(undefined);
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCanvasContext() as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 768,
    height: 1024,
    top: 0,
    left: 0,
    right: 768,
    bottom: 1024,
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
});

describe("PlanTierView — no buy button", () => {
  test("a standard-tier student sees an honest interest button, never anything resembling checkout", () => {
    renderView("standard");
    expect(screen.getByText("Interested in Ultra?")).toBeInTheDocument();
    // 2026-09-03: the exact wording moved ("isn't available to buy yet" -> "isn't open for
    // signups yet") as part of relocating this disclosure out of the page's lead sentence
    // and into this card (see PlanTierView's own header on why) -- the underlying fact this
    // test actually cares about, that the page states plainly it can't be bought, is
    // unchanged, just reworded.
    expect(screen.getByText(/isn't open for signups yet/)).toBeInTheDocument();
    // The price sits next to the same honest disclosure, not in place of it -- a concrete
    // price beside a button that can't take money is the fake-button case unless the page
    // says plainly what the state is (CEO's own framing for this assignment).
    expect(screen.getByText(/399\.99 TL\/month/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "I'm interested" });
    expect(button).toBeInTheDocument();
    // The one interactive control on the whole page must not read like a purchase --
    // checked on actual buttons/links (accessible names), not a page-wide text search: an
    // earlier draft of this test searched all visible text, which wrongly flagged the
    // honest disclosure's own prose the moment it happened to contain one of these words
    // (it did, briefly, in an earlier wording -- "isn't available to buy yet"). Scoping to
    // interactive elements' accessible names is what survives that kind of copy change.
    const interactiveNames = [...screen.queryAllByRole("button"), ...screen.queryAllByRole("link")].map((el) => el.textContent ?? "");
    for (const forbidden of ["Buy", "Upgrade", "Subscribe", "Checkout", "Pay"]) {
      expect(interactiveNames.some((name) => new RegExp(forbidden, "i").test(name))).toBe(false);
    }
  });

  test("clicking the interest button calls the real action once and shows a plain confirmation, not a fake success/receipt state", async () => {
    renderView("standard");
    fireEvent.click(screen.getByRole("button", { name: "I'm interested" }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    // 2026-09-03: "Thanks — we'll let you know." -> "Noted — thanks." -- see the dedicated
    // "no unfulfillable promise" describe block below for why the wording changed; this
    // assertion just needs to track whatever the real confirmation string is.
    expect(await screen.findByText("Noted — thanks.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I'm interested" })).not.toBeInTheDocument();
  });

  test("an ultra-tier student sees no call to action at all -- they have nothing to register interest in", () => {
    renderView("ultra");
    expect(screen.queryByText("Interested in Ultra?")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I'm interested" })).not.toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });
});

// 2026-09-03: registerUltraInterestAction (app/(app)/settings/actions.ts) is, and has
// always been, only logEvent(userId, "ultra_interest_registered") -- a passive analytics
// row an admin can read, never a queue, an email, or anything that proactively reaches a
// student. The page's own copy used to promise otherwise ("we'll tell you the moment it's
// ready" / a post-click "we'll let you know") regardless of that gap -- a promise the
// product could not keep on pure mechanism grounds, before any consent-law question even
// applied (docs/ultra-sales-readiness-scope-2026-09-03.md §C independently reached the same
// read: "an interest signal nobody can act on efficiently is close to the 'worse than no
// button' framing"). oryn-45's own call, not defaulted: keep the interest signal (real,
// low-stakes, worth collecting), drop the specific forward-looking commitment. Pinned here
// so a future copy edit can't quietly reintroduce a promise nothing backs.
describe("PlanTierView — the interest CTA never promises a specific future contact", () => {
  test("neither the pre-click description nor the post-click confirmation claims Proxola will reach out", () => {
    renderView("standard");
    for (const unfulfillable of [/we'll tell you/i, /we'll (let you know|notify|reach out|contact you)/i, /we will (tell|notify|reach out|contact)/i]) {
      expect(screen.queryByText(unfulfillable)).not.toBeInTheDocument();
    }
  });

  test("the post-click confirmation states the interest was recorded, without repeating that claim either", async () => {
    renderView("standard");
    fireEvent.click(screen.getByRole("button", { name: "I'm interested" }));
    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));

    for (const unfulfillable of [/we'll tell you/i, /we'll (let you know|notify|reach out|contact you)/i, /we will (tell|notify|reach out|contact)/i]) {
      expect(screen.queryByText(unfulfillable)).not.toBeInTheDocument();
    }
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
    // The four "differs" rows.
    expect(screen.getByText("Monthly AI allowance")).toBeInTheDocument();
    expect(screen.getByText("Reply length ceiling")).toBeInTheDocument();
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

describe("PlanTierView — the two new rows' numbers are props, not hardcoded strings", () => {
  // 2026-09-03: renders with numbers deliberately different from both the real production
  // values and each other, then asserts the DIFFERENT numbers appear -- the failure mode
  // this guards is a component that quietly ignores its own props and always shows one
  // hand-typed figure regardless of what's actually enforced, which "renders exactly the
  // rows" above (fixed real-looking numbers) could not catch on its own.
  test("the allowance and reply-ceiling rows reflect whatever numbers are actually passed in", () => {
    // Comfortably away from any compact-notation rounding boundary (e.g. 999_000 could
    // legitimately format as "1M" rather than "999K") -- these need to round-trip through
    // formatTokenCount exactly as written below, not just be "close enough".
    const oddUltraLimit = 850_000;
    const oddStandardLimit = 320_000;
    const oddUltraMaxTokens = 12_345;
    const oddStandardMaxTokens = 6_789;

    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <PlanTierView
          tier="standard"
          ultraTokenLimit={oddUltraLimit}
          standardTokenLimit={oddStandardLimit}
          ultraMaxTokens={oddUltraMaxTokens}
          standardMaxTokens={oddStandardMaxTokens}
        />
      </NextIntlClientProvider>,
    );

    // getAllByText, not getByText: each figure legitimately appears in more than one place
    // (the marquee's own stat display, doubled by its seamless-loop copy since jsdom can't
    // apply the real CSS that hides it — see the marquee describe block below — and again,
    // interpolated into a full sentence, in the comparison table). This test cares that the
    // number appears at all, correctly derived from the prop, not how many times.
    expect(screen.getAllByText(new RegExp(formatTokenCount(oddUltraLimit))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(formatTokenCount(oddStandardLimit))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(formatNumber(oddUltraMaxTokens))).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(formatNumber(oddStandardMaxTokens))).length).toBeGreaterThan(0);
    // And the real production values from the standard fixture must NOT leak in from
    // somewhere else (a stray hardcoded fallback, a second unrelated source) -- the only
    // numbers on the page should be the ones actually passed to this render.
    expect(screen.queryByText(new RegExp(formatTokenCount(ULTRA_TOKEN_LIMIT)))).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(formatNumber(ULTRA_MAX_TOKENS)))).not.toBeInTheDocument();
  });
});

describe("PlanTierView — the marquee shows only genuine advantages, never a sameByDesign row", () => {
  // 2026-09-03: the explicit design decision documented in PlanTierView's own header --
  // a row of "here's what's better" cards is the wrong vehicle for "deliberately
  // identical," so the two sameByDesign facts (weekly plan / research idea caps) stay
  // table-only. Pinned here so a future edit that widens the marquee's source list can't
  // silently reintroduce them.
  test("the marquee's region contains the four differs cards and neither sameByDesign fact", () => {
    renderView("standard");
    const marquee = screen.getByRole("region", { name: /what ultra gives you/i });
    // getAllByText, not getByText: the component renders the card list twice (the visible
    // copy plus the seamless-loop duplicate, hidden under real CSS via motion-reduce:hidden
    // — see UltraFeatureMarquee's own header) and jsdom has no CSS engine to actually apply
    // that hiding, so both copies genuinely exist in this test's DOM. Each card's text
    // appearing at least once is what this test cares about; the exact count (1 in a real
    // browser under reduced motion, 2 otherwise) isn't something jsdom can assert honestly.
    expect(within(marquee).getAllByText("AI tokens every month").length).toBeGreaterThan(0);
    expect(within(marquee).getAllByText("Room to finish the answer").length).toBeGreaterThan(0);
    expect(within(marquee).getAllByText("A Thorough reply mode").length).toBeGreaterThan(0);
    expect(within(marquee).getAllByText("A theme of its own").length).toBeGreaterThan(0);
    expect(within(marquee).queryByText(/weekly plan/i)).not.toBeInTheDocument();
    expect(within(marquee).queryByText(/research/i)).not.toBeInTheDocument();
  });

  // WCAG 2.2.2 (Pause, Stop, Hide) — the actual scroll animation can't be exercised in
  // jsdom (no real CSS animation engine), so this asserts the affordance the pause
  // mechanism depends on: a keyboard user must be able to reach the region at all before
  // :focus-within (app/globals.css's .plan-marquee-viewport rule) can pause it for them.
  test("the marquee region is keyboard-focusable and named, not a silent decorative div", () => {
    renderView("standard");
    const marquee = screen.getByRole("region", { name: /what ultra gives you/i });
    expect(marquee).toHaveAttribute("tabindex", "0");
  });
});

describe("PlanTierView — Ultra text stays legible against a warm ground", () => {
  test("no 'Ultra' label anywhere on the page uses gradient-clipped text", () => {
    // Live regression, 2026-09-02: tier-grad-text (transparent glyphs, flame gradient
    // painted through via background-clip) read fine when this page's background was
    // lavender and became unreadable -- amber text on the amber Ultra page ground -- the
    // moment the ground itself turned warm. Reported directly by the founder against the
    // table header specifically ("ultra yazısı gözükmüyor"). Every "Ultra" label on the
    // page is plain text, matching standardName's own already-safe treatment -- checked
    // across all of them (2026-09-04's card redesign turned the table's one Ultra column
    // header into one per comparison card, so a single getByRole("columnheader") query no
    // longer covers the surface this test exists to guard), not merely that the word
    // renders (it always rendered -- in the DOM, just invisible, which a plain
    // toBeInTheDocument check would never have caught).
    renderView("ultra");
    const ultraLabels = screen.getAllByText("Ultra");
    expect(ultraLabels.length).toBeGreaterThan(0);
    for (const label of ultraLabels) {
      expect(label.className).not.toMatch(/tier-grad-text/);
    }
  });

  test("comparison card values wrap long sentences instead of clipping them", () => {
    // Live regression, same report, adapted to the 2026-09-04 card redesign: the table's
    // own shadcn TableCell default was whitespace-nowrap (sized for short data values),
    // and this content is full sentences -- nowrap clipped them at the card's max-w-xl
    // edge instead of wrapping. The card markup never applies a nowrap utility to begin
    // with (a plain <dd> wraps by default), so the failure mode this guards -- a value
    // silently clipped instead of wrapped -- can't recur the same way; asserted directly
    // rather than assumed from the absence of a specific class the new markup never had.
    renderView("standard");
    const longValue = screen.getByText(
      /Up to 8,192 tokens per reply — twice the room, so a demanding question doesn't get cut short/,
    );
    expect(longValue).toBeInTheDocument();
    // Scoped to the comparison cards' own value elements (<dl>/<dd> for differs rows, the
    // shared-value <p> for sameByDesign rows), not the whole document -- the shadcn Button
    // a few sections down legitimately carries whitespace-nowrap on its own label, which
    // has nothing to do with the table-cell-clipping regression this test guards against.
    const valueElements = [...document.querySelectorAll("dl dd"), ...document.querySelectorAll("dl dt")];
    expect(valueElements.length).toBeGreaterThan(0);
    for (const el of valueElements) {
      expect(el.className).not.toMatch(/\bwhitespace-nowrap\b/);
    }
  });
});
