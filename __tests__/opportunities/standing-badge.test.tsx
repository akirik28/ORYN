// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { OpportunityStandingBadge } from "@/features/opportunities/standing-badge";

/**
 * Coverage requirement 5 — Browse and the opportunity detail page must describe an
 * insufficiently-verified opportunity truthfully.
 *
 * One component, deliberately, rendered by BOTH surfaces. Browse's card
 * (features/opportunities/opportunity-card.tsx) and the detail page
 * (app/(app)/opportunities/[id]/page.tsx) previously each open-coded their own eligibility
 * badge with slightly different strings ("Not eligible" vs "Not eligible for you"), which is
 * how the wording of a shared rule drifts — the same failure mode #140 and #141 had to fix in
 * the rule itself. Collapsing them onto this component means these assertions cover both
 * surfaces rather than one, and a future third surface inherits the wording for free.
 *
 * The three states this must never conflate:
 *   - the opportunity's cycle isn't open   -> a fact about the opportunity  ("Not open right now")
 *   - the student doesn't qualify          -> a fact about the student      ("Not eligible for you")
 *   - Oryn has no evidence either way      -> a fact about OUR data         ("Needs verification")
 */

afterEach(cleanup);

describe("OpportunityStandingBadge — insufficiently verified", () => {
  test('renders "Needs verification"', () => {
    render(<OpportunityStandingBadge eligible notActionable={false} needsVerification />);
    expect(screen.getByText("Needs verification")).toBeInTheDocument();
  });

  test('never says "Not eligible" — that is a claim about the student', () => {
    render(<OpportunityStandingBadge eligible notActionable={false} needsVerification />);
    expect(screen.queryByText(/not eligible/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ineligible/i)).not.toBeInTheDocument();
  });

  test('never says "Closed" — nothing has told us this opportunity closed', () => {
    render(<OpportunityStandingBadge eligible notActionable={false} needsVerification />);
    expect(screen.queryByText(/closed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no longer/i)).not.toBeInTheDocument();
  });
});

describe("OpportunityStandingBadge — the states it must keep apart", () => {
  test("a non-actionable opportunity still reads as not open, not as ineligible (#141, unregressed)", () => {
    render(<OpportunityStandingBadge eligible={false} notActionable needsVerification={false} />);
    expect(screen.getByText("Not open right now")).toBeInTheDocument();
    expect(screen.queryByText(/not eligible/i)).not.toBeInTheDocument();
  });

  test("a genuine per-student mismatch still says the student doesn't qualify", () => {
    render(<OpportunityStandingBadge eligible={false} notActionable={false} needsVerification={false} />);
    expect(screen.getByText("Not eligible for you")).toBeInTheDocument();
  });

  test("a confident, eligible opportunity renders no standing badge at all", () => {
    const { container } = render(<OpportunityStandingBadge eligible notActionable={false} needsVerification={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  test("a real exclusion outranks the verification caveat — never both at once", () => {
    // A closed cycle is a stronger, more specific fact than 'we haven't checked'; showing both
    // would read as two unrelated problems with the same row.
    render(<OpportunityStandingBadge eligible={false} notActionable needsVerification />);
    expect(screen.getByText("Not open right now")).toBeInTheDocument();
    expect(screen.queryByText("Needs verification")).not.toBeInTheDocument();
  });
});
