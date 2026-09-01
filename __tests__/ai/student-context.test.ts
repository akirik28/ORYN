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

/**
 * The prompt is read by a model that then writes prose the student sees, so anything in it
 * that looks like a name will come back out as one. A raw `career_exploration` reached the
 * dashboard's "One thing not to do" card that way on 2026-09-01 — "your career_exploration
 * gap is better addressed by…" — and no test or type could have caught it, because the
 * value was correct at every step except the one that reformats its input freely.
 */
describe("formatContextForPrompt — dimension names are human labels, not column values", () => {
  const withScores: StudentAdvisorContext = {
    ...baseContext(),
    profileScores: [
      { dimension: "career_exploration", score: 12, confidence: "low" },
      { dimension: "execution_project_depth", score: 40, confidence: "medium" },
      { dimension: "intellectual_curiosity", score: 55, confidence: "high" },
    ],
  };

  test("renders the display label", () => {
    const text = formatContextForPrompt(withScores);
    expect(text).toContain("Career Exploration: 12/100");
  });

  test("no snake_case identifier survives anywhere in the prompt", () => {
    // Broader than the three above on purpose: this is the class of bug, not the instance.
    const snakeCase = formatContextForPrompt(withScores).match(/\b[a-z]+(?:_[a-z]+)+\b/g) ?? [];
    const allowed = new Set(["self_reported", "evidence_added", "verification_rejected"]);
    expect(snakeCase.filter((w) => !allowed.has(w))).toEqual([]);
  });

  test("locale is additive — Turkish labels when asked, English by default", () => {
    expect(formatContextForPrompt(withScores, "tr")).toContain("Kariyer Keşfi: 12/100");
    expect(formatContextForPrompt(withScores)).toContain("Career Exploration: 12/100");
  });
});
