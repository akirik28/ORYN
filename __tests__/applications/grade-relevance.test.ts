import { describe, expect, test } from "vitest";
import { computeApplicationsPageGuidance } from "@/lib/applications/grade-relevance";
import type { CoreChecklistFacts } from "@/lib/scoring/completeness";

/**
 * E1 (2026-09-05) — computeApplicationsPageGuidance is the pure decision function behind the
 * applications page's grade-sensitive note (founder: "the applications page isn't very useful
 * for an 11th grader"). Tested directly against plain fixtures, no Supabase mocking, same
 * split this codebase already uses throughout (filterNotableDimensionChanges,
 * isDueForMonthlyCommentary): every real query this function's caller runs is already covered
 * by its own tests (buildDigestContent, assembleScoringFacts) — this file's only job is
 * proving the grade gate and the three-way action priority.
 */

const COMPLETE_FACTS: CoreChecklistFacts = {
  profile: { country: "US", school_name: "Lincoln High", graduation_year: 2029, curriculum: "ap" },
  educationRecords: [{ id: "e1" } as never],
  courses: [],
  testScores: [{ id: "t1" } as never],
  activities: [{ id: "a1" } as never],
  awards: [{ id: "aw1" } as never],
  certifications: [],
  projects: [{ id: "p1" } as never],
  researchExperiences: [{ id: "r1" } as never],
  volunteeringExperiences: [],
  workExperiences: [],
  goals: [{ id: "g1" } as never],
  interests: [{ id: "i1" } as never],
  targetUniversities: [{ id: "tu1" } as never],
};

const EMPTY_FACTS: CoreChecklistFacts = {
  profile: { country: null, school_name: null, graduation_year: null, curriculum: null },
  educationRecords: [],
  courses: [],
  testScores: [],
  activities: [],
  awards: [],
  certifications: [],
  projects: [],
  researchExperiences: [],
  volunteeringExperiences: [],
  workExperiences: [],
  goals: [],
  interests: [],
  targetUniversities: [],
};

// Fixed "now" so grade derivation is deterministic regardless of when the suite runs —
// matches lib/profile/grade-level.ts's own test convention.
const AS_OF = new Date("2026-09-05T00:00:00Z");

describe("computeApplicationsPageGuidance — the grade gate", () => {
  test("a senior (grade 12) gets no guidance at all, regardless of real signal", () => {
    const result = computeApplicationsPageGuidance({
      graduationYear: 2027, // grade 12 as of AS_OF
      deadlines: [{ title: "Oxford — personal statement", date: "2026-10-01", href: "/x" }],
      newMatches: [],
      completenessFacts: EMPTY_FACTS,
      asOf: AS_OF,
    });
    expect(result).toBeNull();
  });

  test("no graduation_year on file (undeterminable grade) gets no guidance, not a guess", () => {
    const result = computeApplicationsPageGuidance({
      graduationYear: null,
      deadlines: [],
      newMatches: [],
      completenessFacts: EMPTY_FACTS,
      asOf: AS_OF,
    });
    expect(result).toBeNull();
  });

  test("an 11th grader gets guidance, one year from senior", () => {
    const result = computeApplicationsPageGuidance({
      graduationYear: 2028, // grade 11 as of AS_OF
      deadlines: [],
      newMatches: [],
      completenessFacts: EMPTY_FACTS,
      asOf: AS_OF,
    });
    expect(result?.grade).toBe(11);
    expect(result?.yearsUntilSenior).toBe(1);
  });

  test("a 9th grader gets guidance, three years from senior", () => {
    const result = computeApplicationsPageGuidance({
      graduationYear: 2030, // grade 9 as of AS_OF
      deadlines: [],
      newMatches: [],
      completenessFacts: EMPTY_FACTS,
      asOf: AS_OF,
    });
    expect(result?.grade).toBe(9);
    expect(result?.yearsUntilSenior).toBe(3);
  });
});

describe("computeApplicationsPageGuidance — the action priority, real data only", () => {
  const base = { graduationYear: 2028, asOf: AS_OF }; // grade 11, always gets guidance

  test("a real deadline wins over everything else", () => {
    const result = computeApplicationsPageGuidance({
      ...base,
      deadlines: [{ title: "Youth Economics Challenge", date: "2026-10-15", href: "/d1" }],
      newMatches: [{ title: "Some Match", organization: "Org", href: "/m1" }],
      completenessFacts: EMPTY_FACTS, // even with real gaps present
    });
    expect(result?.action).toEqual({ kind: "deadline", title: "Youth Economics Challenge", date: "2026-10-15", href: "/d1" });
  });

  test("no deadline, but a real opportunity match — that wins over a profile gap", () => {
    const result = computeApplicationsPageGuidance({
      ...base,
      deadlines: [],
      newMatches: [{ title: "Youth Research Fellowship", organization: "OECD", href: "/m1" }],
      completenessFacts: EMPTY_FACTS,
    });
    expect(result?.action).toEqual({ kind: "opportunity", title: "Youth Research Fellowship", organization: "OECD", href: "/m1" });
  });

  test("no deadline, no match — falls to the first real, incomplete profile-checklist item", () => {
    const result = computeApplicationsPageGuidance({
      ...base,
      deadlines: [],
      newMatches: [],
      completenessFacts: EMPTY_FACTS, // every core item incomplete — school_details is first
    });
    expect(result?.action).toEqual({ kind: "profile_gap", checklistKey: "school_details" });
  });

  test("a profile gap further down the checklist is found when earlier items are already done", () => {
    const result = computeApplicationsPageGuidance({
      ...base,
      deadlines: [],
      newMatches: [],
      completenessFacts: { ...COMPLETE_FACTS, targetUniversities: [] }, // only the last core item incomplete
    });
    expect(result?.action).toEqual({ kind: "profile_gap", checklistKey: "target_university" });
  });

  test("nothing real to point at — 'none', never an invented deadline or opportunity", () => {
    const result = computeApplicationsPageGuidance({
      ...base,
      deadlines: [],
      newMatches: [],
      completenessFacts: COMPLETE_FACTS, // every core item done
    });
    expect(result?.action).toEqual({ kind: "none" });
  });
});
