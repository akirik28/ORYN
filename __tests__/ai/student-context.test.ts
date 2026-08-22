import { describe, expect, test } from "vitest";
import { formatContextForPrompt, type StudentAdvisorContext } from "@/lib/ai/student-context";
import type { EvidenceStatus } from "@/types/database";

function baseContext(overrides: Partial<StudentAdvisorContext> = {}): StudentAdvisorContext {
  return {
    student: {
      displayName: "Test Student",
      country: null,
      schoolName: null,
      graduationYear: null,
      curriculum: null,
      weeklyTimeBudget: null,
      busyMode: false,
      busyModeUntil: null,
      birthYear: null,
      citizenshipCountries: [],
    },
    profileScores: [],
    overallScore: 50,
    completenessPercent: 50,
    activities: [],
    projects: [],
    research: [],
    awards: [],
    sports: [],
    goals: [],
    interests: [],
    targetUniversities: [],
    upcomingDeadlines: [],
    recentRecommendationTitles: [],
    recentActionOutcomes: [],
    pendingApplicationRequirements: [],
    ...overrides,
  };
}

/**
 * Package 4, docs/handoffs/feat1-territory-audit-2026-08-22.md Finding 1: before this fix,
 * only `self_reported` rendered a tag — `evidence_added` and `verification_rejected` both
 * fell through to the same silence as `verified`, so a claim someone actively disbelieved
 * reached the advisor with full, unflagged certainty.
 */
describe("formatContextForPrompt — evidence status tags", () => {
  function activityWith(evidenceStatus: EvidenceStatus): StudentAdvisorContext {
    return baseContext({ activities: [{ title: "Regional Science Fair", category: "competition", isLeadership: false, ongoing: false, evidenceStatus }] });
  }

  test("self_reported renders [self-reported]", () => {
    expect(formatContextForPrompt(activityWith("self_reported"))).toContain("Regional Science Fair [self-reported]");
  });

  test("evidence_added renders its own distinct tag, not [self-reported] and not silence", () => {
    const text = formatContextForPrompt(activityWith("evidence_added"));
    expect(text).toContain("Regional Science Fair [evidence added, not independently verified]");
    expect(text).not.toContain("Regional Science Fair [self-reported]");
  });

  test("verification_rejected renders its own explicit tag — the core regression this package fixes", () => {
    const text = formatContextForPrompt(activityWith("verification_rejected"));
    expect(text).toContain("Regional Science Fair [verification rejected]");
    // Must not be silently indistinguishable from a verified item (no tag at all).
    expect(text).not.toBe(formatContextForPrompt(activityWith("verified")));
  });

  test("verified renders no evidence tag at all — the one silent, default state", () => {
    const text = formatContextForPrompt(activityWith("verified"));
    expect(text).toContain("Activities (1): Regional Science Fair");
    expect(text).not.toContain("[self-reported]");
    expect(text).not.toContain("[evidence added");
    expect(text).not.toContain("[verification rejected]");
  });

  test("all four states produce visibly different text for the same item — no two collapse together", () => {
    const statuses: EvidenceStatus[] = ["self_reported", "evidence_added", "verified", "verification_rejected"];
    const rendered = statuses.map((s) => formatContextForPrompt(activityWith(s)));
    expect(new Set(rendered).size).toBe(statuses.length);
  });

  test("the tag applies identically across activities, projects, research, and awards", () => {
    const context = baseContext({
      projects: [{ title: "Community App", outcomeSummary: null, ongoing: false, evidenceStatus: "verification_rejected" }],
      research: [{ title: "Youth Unemployment Study", field: "Economics", outputType: "preprint", ongoing: false, evidenceStatus: "verification_rejected" }],
      awards: [{ title: "Debate Trophy", level: "national", evidenceStatus: "verification_rejected" }],
    });
    const text = formatContextForPrompt(context);
    expect(text).toContain("Community App [verification rejected]");
    expect(text).toContain("Youth Unemployment Study [verification rejected]");
    expect(text).toContain("Debate Trophy [verification rejected]");
  });

  test("ongoing and evidence tags compose without clobbering each other", () => {
    const context = baseContext({
      activities: [{ title: "Ongoing Club", category: "club", isLeadership: false, ongoing: true, evidenceStatus: "verification_rejected" }],
    });
    expect(formatContextForPrompt(context)).toContain("Ongoing Club [ongoing] [verification rejected]");
  });
});
