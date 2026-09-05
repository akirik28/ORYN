// @vitest-environment jsdom
import { describe, test, expect, afterEach } from "vitest";
import { render, cleanup, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { CounselorWeekFallback } from "@/features/dashboard/counselor-week-fallback";
import type { CounselorRecommendation } from "@/lib/counselor";

/**
 * CEO's own live measurement, 2026-09-05: once the unknown-eligibility score ceiling went
 * live, 6 of 8 real students' "do" count fell below RANKING_THRESHOLDS.doSlots (3) -- and this
 * component rendered however many cards it got with nothing acknowledging the shortfall. This
 * file proves the fix directly: dashboard-view.tsx's own `fewerThanThreeNotice` prop, when
 * passed a real string, actually reaches the screen; when null (the default, and every
 * pre-existing caller's behavior), nothing extra renders -- the normal three-card case is
 * unaffected by this change.
 */

afterEach(cleanup);

function action(overrides: Partial<CounselorRecommendation> = {}): CounselorRecommendation {
  return {
    id: "opportunity:opp-1",
    title: "Youth Economics Fellowship",
    recommendationClass: "do",
    why: ["Addresses Research, a critical gap (20/100)."],
    matchedGapDimensions: ["research"],
    impact: "high",
    effort: "medium",
    urgency: "low",
    deadline: null,
    costOnFile: null,
    applicationRequirements: [],
    eligibility: { verdict: "known_eligible", notes: [] },
    confidence: "high",
    evidence: [{ sourceType: "opportunity", sourceId: "opp-1", sourceUrl: null, verificationState: "verified_current" }],
    warnings: [],
    nextAction: { label: "View opportunity", type: "VIEW", href: "/opportunities/opp-1" },
    ...overrides,
  };
}

describe("CounselorWeekFallback — fewer-than-three notice", () => {
  test("RED->GREEN: a real fewerThanThreeNotice string actually renders on the page", () => {
    render(<CounselorWeekFallback actions={[action()]} fewerThanThreeNotice="Proxola only has 1 confident recommendation for you this week." />);
    expect(screen.getByText("Proxola only has 1 confident recommendation for you this week.")).toBeInTheDocument();
  });

  test("no notice prop (the default) renders no extra text -- the normal three-card case is unaffected", () => {
    render(<CounselorWeekFallback actions={[action(), action({ id: "opportunity:opp-2" }), action({ id: "opportunity:opp-3" })]} />);
    // ActionCard itself renders <p> tags for its own content (the reason line), so
    // "no <p> at all" isn't a valid absence check here -- assert specifically that no
    // element carries this notice mechanism's own language.
    expect(screen.queryByText(/confident recommendation/i)).not.toBeInTheDocument();
  });

  test("explicit null notice behaves identically to omitting the prop", () => {
    render(<CounselorWeekFallback actions={[action()]} fewerThanThreeNotice={null} />);
    expect(screen.queryByText(/confident recommendation/i)).not.toBeInTheDocument();
  });

  test("zero actions still renders nothing at all, notice included -- the EmptyState branch owns that case instead", () => {
    const { container } = render(<CounselorWeekFallback actions={[]} fewerThanThreeNotice="this should never show" />);
    expect(container).toBeEmptyDOMElement();
  });
});
