// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { OpportunityCard } from "@/features/opportunities/opportunity-card";
import { FIXTURE_OPPORTUNITIES } from "@/lib/dev/fixtures";
import type { EvidenceState } from "@/lib/scoring/signal";

/**
 * Phase 12 (AGENTS.md) follow-up, 2026-09-05: opportunity_matches.match_confidence has been
 * computed and persisted on every refresh since migration 0086 and was never read by any
 * surface (docs/dead-column-audit-2026-09-05.md's first headline finding). This proves the
 * new render path: ConfidenceIndicator (an already-shipped component, not a new one) renders
 * when a real evidence state is present, distinguishes high from low the way CEO's own
 * instruction required ("low confidence and high confidence shouldn't look the same"), and
 * stays silent — not a placeholder — for the two states that mean "nothing to claim":
 * `not_assessed` and `null`. Uses the real fixture opportunity object (25+ required fields on
 * the Opportunity type) rather than hand-constructing one, same reasoning
 * opportunity-actions.test.tsx's own precedent set for this component family.
 */

afterEach(() => cleanup());

const opportunity = FIXTURE_OPPORTUNITIES[0].opportunity;
const reasonCodes = ["matches_your_interests"];

function renderCard(matchConfidence: EvidenceState | null | undefined) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <OpportunityCard
        opportunity={opportunity}
        matchScore={91}
        reasonCodes={reasonCodes}
        matchConfidence={matchConfidence}
        initialStatus={null}
      />
    </NextIntlClientProvider>,
  );
}

describe("OpportunityCard — match_confidence (Phase 12)", () => {
  test("strong evidence renders as High confidence, not the raw evidence-state word", () => {
    const { getByText, queryByText } = renderCard("strong");
    expect(getByText("High confidence")).toBeInTheDocument();
    expect(queryByText("strong", { exact: false })).not.toBeInTheDocument();
  });

  test("developing evidence renders as Medium confidence", () => {
    const { getByText } = renderCard("developing");
    expect(getByText("Medium confidence")).toBeInTheDocument();
  });

  test("emerging evidence renders as Low confidence — collapsed onto the same 3-level meter as limited_evidence", () => {
    const { getByText } = renderCard("emerging");
    expect(getByText("Low confidence")).toBeInTheDocument();
  });

  test("limited_evidence also renders as Low confidence", () => {
    const { getByText } = renderCard("limited_evidence");
    expect(getByText("Low confidence")).toBeInTheDocument();
  });

  test("high and low confidence are visibly distinguishable, not the same indicator — the badge lesson", () => {
    const { container: highContainer } = renderCard("strong");
    const highBars = highContainer.querySelectorAll(".bg-brand-primary").length;
    cleanup();
    const { container: lowContainer } = renderCard("emerging");
    const lowBars = lowContainer.querySelectorAll(".bg-brand-primary").length;
    expect(highBars).toBeGreaterThan(lowBars);
  });

  test("not_assessed renders nothing — Oryn never evaluated this dimension, not a low-confidence claim", () => {
    const { queryByText } = renderCard("not_assessed");
    expect(queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  test("null (the common case today — most matches have no assessed dimension) renders nothing, no placeholder", () => {
    const { queryByText } = renderCard(null);
    expect(queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  test("omitted entirely (prop default) behaves identically to null — no regression for existing callers", () => {
    const { queryByText } = renderCard(undefined);
    expect(queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  test("suppressed when the card can't claim a match at all, even with a real confidence value on file", () => {
    const { queryByText } = render(
      <NextIntlClientProvider locale="en" messages={en}>
        <OpportunityCard
          opportunity={opportunity}
          matchScore={91}
          reasonCodes={reasonCodes}
          matchConfidence="strong"
          needsVerification={true}
          initialStatus={null}
        />
      </NextIntlClientProvider>,
    );
    expect(queryByText(/confidence/i)).not.toBeInTheDocument();
  });
});
