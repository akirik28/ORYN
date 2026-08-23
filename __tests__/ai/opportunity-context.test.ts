import { describe, expect, test, vi } from "vitest";
import { formatOpportunityContext } from "@/lib/ai/opportunity-context";
import type { CounselorRecommendation } from "@/lib/counselor";

function opportunityRec(overrides: Partial<CounselorRecommendation> = {}): CounselorRecommendation {
  return {
    id: "rec-1",
    title: "Yale Young Global Scholars",
    recommendationClass: "consider",
    why: ["Matches your interests in economics."],
    matchedGapDimensions: [],
    impact: "medium",
    effort: "medium",
    urgency: "medium",
    deadline: null,
    costOnFile: null,
    applicationRequirements: [],
    eligibility: { verdict: "known_eligible", notes: [] },
    confidence: "medium",
    evidence: [{ sourceType: "opportunity", sourceId: "opp-1", sourceUrl: "https://example.com", verificationState: "verified_current" }],
    warnings: [],
    nextAction: { label: "View", type: "VIEW", href: "/opportunities/opp-1" },
    ...overrides,
  };
}

function requirementRec(overrides: Partial<CounselorRecommendation> = {}): CounselorRecommendation {
  return {
    ...opportunityRec(),
    id: "rec-req",
    title: "Submit your SAT score",
    evidence: [{ sourceType: "requirement_action", sourceId: "req-1", sourceUrl: null, verificationState: null }],
    ...overrides,
  };
}

describe("formatOpportunityContext", () => {
  test("returns empty string when there are no opportunity-sourced recommendations", () => {
    expect(formatOpportunityContext([])).toBe("");
    expect(formatOpportunityContext([requirementRec()])).toBe("");
  });

  test("includes a known-eligible opportunity with no eligibility caveat", () => {
    const text = formatOpportunityContext([opportunityRec()]);
    expect(text).toContain("Yale Young Global Scholars");
    expect(text).not.toContain("ELIGIBILITY UNKNOWN");
    expect(text).not.toContain("NOT ELIGIBLE");
  });

  test("a fee on file reaches the prompt — the advisor must never recommend a paid programme unaware it costs money", () => {
    const text = formatOpportunityContext([opportunityRec({ title: "Pioneer Research Institute", costOnFile: 7465 })]);
    expect(text).toContain("HAS A FEE");
    expect(text).toContain("7465");
  });

  test("a free or unpriced opportunity adds no fee line", () => {
    expect(formatOpportunityContext([opportunityRec({ costOnFile: 0 })])).not.toContain("HAS A FEE");
    expect(formatOpportunityContext([opportunityRec({ costOnFile: null })])).not.toContain("HAS A FEE");
  });

  test("an application requirement reaches the prompt — the advisor must know a team competition needs teammates before it recommends one", () => {
    const text = formatOpportunityContext([
      opportunityRec({ title: "Wharton Investment Competition", applicationRequirements: ["Team of 4 to 6 students plus a teacher advisor"] }),
    ]);
    expect(text).toContain("ENTRY REQUIRES");
    expect(text).toContain("Team of 4 to 6 students");
  });

  test("no requirements on file adds no ENTRY REQUIRES line", () => {
    expect(formatOpportunityContext([opportunityRec({ applicationRequirements: [] })])).not.toContain("ENTRY REQUIRES");
  });

  test("filters out non-opportunity recommendations (requirement_action, profile_task) — only the catalogue enters this context", () => {
    const text = formatOpportunityContext([opportunityRec(), requirementRec()]);
    expect(text).toContain("Yale Young Global Scholars");
    expect(text).not.toContain("Submit your SAT score");
  });

  test("an unknown-eligibility opportunity is explicitly labeled unknown, never presented as open to everyone", () => {
    const text = formatOpportunityContext([
      opportunityRec({
        title: "TechGirls",
        eligibility: { verdict: "unknown", notes: ["Country eligibility hasn't been verified for this opportunity yet."] },
      }),
    ]);
    expect(text).toContain("TechGirls");
    expect(text).toContain("ELIGIBILITY UNKNOWN");
    expect(text).toContain("Country eligibility hasn't been verified");
  });

  test("defense in depth: a known-ineligible opportunity (should not normally reach this layer) is labeled NOT ELIGIBLE, never silently dropped or shown as fine", () => {
    const text = formatOpportunityContext([
      opportunityRec({
        title: "QuestBridge National College Match",
        eligibility: { verdict: "known_ineligible", notes: ["Not currently open to students in Turkey."] },
      }),
    ]);
    expect(text).toContain("NOT ELIGIBLE");
    expect(text).toContain("Not currently open to students in Turkey.");
  });

  test("caps the list at 8 opportunities even when more are available — this is grounding, not the full catalogue", () => {
    const many = Array.from({ length: 20 }, (_, i) => opportunityRec({ id: `rec-${i}`, title: `Program ${i}` }));
    const text = formatOpportunityContext(many);
    const lineCount = text.split("\n").filter((l) => l.startsWith("- ")).length;
    expect(lineCount).toBe(8);
  });

  test("includes the deadline when the opportunity has one", () => {
    const text = formatOpportunityContext([opportunityRec({ deadline: { date: "2026-11-30", sourceLabel: "Yale Young Global Scholars" } })]);
    expect(text).toContain("2026-11-30");
  });
});

describe("buildOpportunityContextText", () => {
  test("returns empty string and does not throw when the counselor pipeline fails — never blocks an advisor reply", async () => {
    vi.doMock("@/lib/counselor", () => ({
      getCounselorRecommendations: vi.fn().mockRejectedValue(new Error("db unavailable")),
    }));
    vi.resetModules();
    const { buildOpportunityContextText: freshBuild } = await import("@/lib/ai/opportunity-context");
    const result = await freshBuild("user-1");
    expect(result).toBe("");
    vi.doUnmock("@/lib/counselor");
    vi.resetModules();
  });

  test("passes real recommendations through to the formatter", async () => {
    vi.doMock("@/lib/counselor", () => ({
      getCounselorRecommendations: vi.fn().mockResolvedValue({
        recommendations: [opportunityRec({ title: "Cooke College Scholarship Program" })],
        gaps: [],
        profileReadiness: { completenessPercent: 50, sufficientForJudgment: true },
        scoreVersion: "v1",
      }),
    }));
    vi.resetModules();
    const { buildOpportunityContextText: freshBuild } = await import("@/lib/ai/opportunity-context");
    const result = await freshBuild("user-1");
    expect(result).toContain("Cooke College Scholarship Program");
    vi.doUnmock("@/lib/counselor");
    vi.resetModules();
  });
});
