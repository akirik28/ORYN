import { describe, expect, test } from "vitest";
import { runCounselorPipeline } from "@/lib/counselor/pipeline";
import { evaluateCandidateEligibility } from "@/lib/counselor/eligibility";
import { generateCandidateActions } from "@/lib/counselor/candidates";
import { toDimensionScoreRows } from "@/lib/counselor/gaps";
import { computeEligibility, computeOpportunityMatch } from "@/lib/opportunities/matching";
import { scoreAcademics } from "@/lib/scoring/dimensions/academics";
import { currentGradeLevel } from "@/lib/profile/grade-level";
import type { CounselorState } from "@/lib/counselor/types";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Course, EducationRecord, Opportunity, OpportunityMatch, ProfileDimension, TestScore } from "@/types/database";

/**
 * Personas B, D, E from the counselor-data-quality-v1 founder prompt's Phase 11 (contract
 * tests 1-3, for personas A and C, already live in contract.test.ts — this file covers the
 * remaining three named personas against the same real, unmocked pipeline).
 */

const DIMENSIONS: ProfileDimension[] = [
  "academics",
  "intellectual_curiosity",
  "leadership",
  "research",
  "entrepreneurship",
  "community_impact",
  "awards_distinction",
  "career_exploration",
  "execution_project_depth",
];

function opportunity(id: string, overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: id,
    organization: "Test Org",
    description: null,
    category: "competition",
    official_url: "https://example.org",
    application_url: null,
    country: null,
    remote_allowed: null,
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    fields: [],
    cost: null,
    funding_available: null,
    deadline: null,
    start_date: null,
    end_date: null,
    source: null,
    source_url: null,
    source_confidence: "high",
    // Verified by default, consistent with this fixture's own `verification_state:
    // "verified_current"` below. The two contradicted each other, which is the live data
    // shape lib/opportunities/lifecycle.ts's freshness gate exists to catch (50 rows claim
    // verified_current while last_verified_at is null). Left null, every fixture in this file
    // would sit in the gated shape, and tests about country, citizenship, grade or scoring
    // would be asserting against an exclusion unrelated to their subject.
    last_verified_at: "2026-08-20T00:00:00Z",
    status: "active",
    normalized_title: id,
    cycle_status: "open",
    selectivity_tier: "unknown",
    verification_state: "verified_current",
    application_open_date: null,
    eligible_grades: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    eligible_citizenships: [],
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    languages_of_instruction: [],
    image_url: null,
    image_source_url: null,
    image_attribution: null,
    current_cycle_label: null,
    verified_at: null,
    source_verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function match(opportunityId: string, overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: `match-${opportunityId}`,
    user_id: "user-1",
    opportunity_id: opportunityId,
    eligible: true,
    eligibility_notes: null,
    relevance_score: 50,
    profile_need_score: 50,
    effort_estimate: null,
    match_confidence: null,
    match_score: 50,
    reason_codes: [],
    calculated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function scoresWith(overrides: Partial<Record<ProfileDimension, number>>, defaultScore = 80) {
  return DIMENSIONS.map((dimension) => ({
    dimension,
    score: overrides[dimension] ?? defaultScore,
    confidence: "high" as const,
    reason_codes: [],
  }));
}

describe("Persona B — CS/AI goal, strong academics, weak execution/project depth", () => {
  const scores = scoresWith({ execution_project_depth: 25 });

  function matchFor(opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(
      { age: 17, country: "United States", interests: ["Computer Science", "Artificial Intelligence"], weakestDimensions: ["execution_project_depth"] },
      { category: opp.category, minimumAge: opp.minimum_age, maximumAge: opp.maximum_age, eligibleCountries: opp.eligible_countries, fields: opp.fields, country: opp.country }
    );
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  const hackathon = opportunity("ai-hackathon", { category: "hackathon", fields: ["Computer Science", "Artificial Intelligence"] });
  const leadershipCamp = opportunity("generic-leadership-camp", { category: "summer_program", fields: ["Leadership"] });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80, interests: ["Computer Science", "Artificial Intelligence"] } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [
      { opportunity: hackathon, match: matchFor(hackathon) },
      { opportunity: leadershipCamp, match: matchFor(leadershipCamp) },
    ],
    requirementCandidateInputs: [],
  };

  const result = runCounselorPipeline(state);
  const ids = result.recommendations.map((r) => r.id);

  test("execution_project_depth surfaces as the weakest-ranked gap", () => {
    expect(result.gaps[0].dimension).toBe("execution_project_depth");
  });

  test("a build/hackathon opportunity (addresses the actual gap) outranks a generic, non-gap-addressing leadership camp", () => {
    const hackathonIndex = ids.indexOf("opportunity:ai-hackathon");
    const campIndex = ids.indexOf("opportunity:generic-leadership-camp");
    expect(hackathonIndex).toBeGreaterThanOrEqual(0);
    if (campIndex >= 0) expect(hackathonIndex).toBeLessThan(campIndex);
  });
});

describe("Persona D — strong across most dimensions, weak volunteering/community impact", () => {
  const scores = scoresWith({ community_impact: 20 });

  function matchFor(opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(
      { age: 17, country: "United States", interests: ["Community Service"], weakestDimensions: ["community_impact"] },
      { category: opp.category, minimumAge: opp.minimum_age, maximumAge: opp.maximum_age, eligibleCountries: opp.eligible_countries, fields: opp.fields, country: opp.country }
    );
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  const verifiedVolunteering = opportunity("local-volunteering-program", { category: "volunteering", fields: ["Community Service"] });
  const unrelatedCompetition = opportunity("unrelated-math-competition", { category: "competition", fields: ["Mathematics"] });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 85, interests: ["Community Service"] } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [
      { opportunity: verifiedVolunteering, match: matchFor(verifiedVolunteering) },
      { opportunity: unrelatedCompetition, match: matchFor(unrelatedCompetition) },
    ],
    requirementCandidateInputs: [],
  };

  const result = runCounselorPipeline(state);
  const ids = result.recommendations.map((r) => r.id);

  test("community_impact surfaces as the weakest-ranked gap", () => {
    expect(result.gaps[0].dimension).toBe("community_impact");
  });

  test("the verified social-impact opportunity outranks an unrelated, non-gap-addressing competition", () => {
    const volunteeringIndex = ids.indexOf("opportunity:local-volunteering-program");
    const competitionIndex = ids.indexOf("opportunity:unrelated-math-competition");
    expect(volunteeringIndex).toBeGreaterThanOrEqual(0);
    if (competitionIndex >= 0) expect(volunteeringIndex).toBeLessThan(competitionIndex);
  });
});

describe("Persona E — opportunity has a hard U.S.-citizen restriction, student is not a U.S. citizen", () => {
  const scores = scoresWith({});

  const usCitizenOnlyInternship = opportunity("us-citizen-only-internship", {
    category: "internship",
    citizenship_restrictions: "Applicants must be U.S. citizens or U.S. permanent residents.",
  });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "Turkey" }, completenessPercent: 80 } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ opportunity: usCitizenOnlyInternship, match: match("us-citizen-only-internship") }],
    requirementCandidateInputs: [],
  };

  const candidate = generateCandidateActions(state).find((c) => c.source.kind === "opportunity" && c.source.opportunityId === "us-citizen-only-internship")!;

  test("a candidate exists for the restricted opportunity (not silently dropped)", () => {
    expect(candidate).toBeDefined();
  });

  test("a non-U.S. student against a citizenship-restricted opportunity is never verdict 'known_eligible'", () => {
    const eligibility = evaluateCandidateEligibility(candidate, state);
    expect(eligibility.verdict).not.toBe("known_eligible");
  });

  test("the eligibility result carries a warning note rather than silently guessing ineligible or eligible", () => {
    const eligibility = evaluateCandidateEligibility(candidate, state);
    expect(eligibility.verdict).toBe("unknown");
    expect(eligibility.notes.length).toBeGreaterThan(0);
  });

  test("if it does surface in the final recommendation set, its eligibility warning reaches the student — never presented as a confirmed match", () => {
    const result = runCounselorPipeline(state);
    const rec = result.recommendations.find((r) => r.id === "opportunity:us-citizen-only-internship");
    if (rec) {
      expect(rec.eligibility.verdict).not.toBe("known_eligible");
      expect(rec.warnings.length).toBeGreaterThan(0);
    }
  });
});

describe("Persona F — Turkish/international student, MEB curriculum diploma layered with AP coursework, Economics goal", () => {
  // Grade 11, derived the same way lib/profile/grade-level.ts's currentGradeLevel derives it
  // from graduation_year — never a hardcoded year, so this fixture doesn't go stale as this
  // suite ages. Searches the small window currentGradeLevel actually resolves (9-12).
  function graduationYearForGrade(grade: number): number {
    const thisYear = new Date().getUTCFullYear();
    for (let year = thisYear; year <= thisYear + 6; year++) {
      if (currentGradeLevel(year) === grade) return year;
    }
    throw new Error(`No graduation year within range produced grade ${grade} as of ${new Date().toISOString()}`);
  }
  const grade11GraduationYear = graduationYearForGrade(11);

  // Primary diploma: Turkish/MEB curriculum, native 100-point scale — never coerced toward
  // a US /4.0 assumption (spec §7/§58, lib/scoring/dimensions/academics.ts's own comment).
  const turkishDiploma: EducationRecord = {
    id: "edu-1",
    user_id: "user-1",
    school_name: "Robert College (Turkish/international curriculum)",
    school_entity_id: null,
    country_entity_id: null,
    country: "Turkiye",
    stage: "high_school",
    curriculum: "turkish_curriculum",
    start_date: "2023-09-01",
    end_date: null,
    is_current: true,
    overall_gpa: 92.5,
    gpa_scale: 100,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
  // No `class_rank` field exists anywhere on EducationRecord (types/database.ts) or in the
  // schema — this literal is the exhaustive real shape, not an abbreviated one. Nothing is
  // omitted here; there is nothing to omit.

  // AP courses recorded independent of the diploma's own curriculum classification —
  // courses.level is never coupled to education_records.curriculum (no FK, no shared
  // vocabulary between the two columns), which is exactly what lets a Turkish/MEB diploma
  // and AP coursework coexist on one profile without contradiction.
  const apCourses: Course[] = [
    { id: "course-1", user_id: "user-1", education_record_id: null, course_name: "AP Computer Science A", subject: "Computer Science", level: "ap", academic_year: "2025-2026", grade_value: null, grade_scale: null, credit_hours: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    { id: "course-2", user_id: "user-1", education_record_id: null, course_name: "AP Microeconomics", subject: "Economics", level: "ap", academic_year: "2025-2026", grade_value: null, grade_scale: null, credit_hours: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    { id: "course-3", user_id: "user-1", education_record_id: null, course_name: "AP Macroeconomics", subject: "Economics", level: "ap", academic_year: "2025-2026", grade_value: null, grade_scale: null, credit_hours: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  ];

  // No SAT/ACT (or any standardized test) on file — proves nothing downstream treats a
  // standardized test as mandatory.
  const noTestScores: TestScore[] = [];

  const academicsFacts: ScoringFacts = {
    educationRecords: [turkishDiploma],
    courses: apCourses,
    testScores: noTestScores,
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
  };

  const academicsResult = scoreAcademics(academicsFacts);

  test("the academics score is computed from the 92.5/100 GPA on its own scale, never coerced toward a /4.0 assumption", () => {
    // The "gpa" reason code's own detail string is the score engine's account of what scale
    // it actually used.
    const gpaReason = academicsResult.reasonCodes.find((r) => r.code === "gpa");
    expect(gpaReason?.detail).toBe("GPA 92.5/100");

    // The sharp version of the assertion: isolate the GPA-only contribution (no courses, no
    // tests) and pin it to the exact value 92.5/100 produces (ratio 0.925 * 45 points =
    // 41.625, rounds to 42) — NOT the value a hardcoded-/4.0 coercion bug would produce. A
    // /4.0 bug would compute ratio = min(1, 92.5/4.0) = 1 (92.5 far exceeds 4.0), clamping to
    // a perfect-score ceiling of 45. 42 vs. 45 is exactly the gap that bug would leave behind.
    const gpaOnly = scoreAcademics({ ...academicsFacts, courses: [], testScores: [] });
    expect(gpaOnly.score).toBe(42);
  });

  test("nothing in academics scoring requires, reads, or crashes on a class rank — the concept doesn't exist in this schema", () => {
    expect(Object.keys(turkishDiploma)).not.toContain("class_rank");
    expect(() => scoreAcademics(academicsFacts)).not.toThrow();
  });

  test("AP coursework on a Turkish-curriculum diploma is credited at full rigor weight — no cross-curriculum penalty", () => {
    // RIGOR_WEIGHT["ap"] === 1 for all three courses regardless of the diploma's own
    // curriculum value — course rigor is keyed by course.level only. Proven by actually
    // varying the diploma's curriculum and confirming the score doesn't move at all: if a
    // "curriculum mismatch" penalty ever got added, this is the assertion that would catch it.
    const asIbDiploma = scoreAcademics({ ...academicsFacts, educationRecords: [{ ...turkishDiploma, curriculum: "ib" }] });
    const asApDiploma = scoreAcademics({ ...academicsFacts, educationRecords: [{ ...turkishDiploma, curriculum: "ap" }] });
    expect(asIbDiploma.score).toBe(academicsResult.score);
    expect(asApDiploma.score).toBe(academicsResult.score);

    const rigorReason = academicsResult.reasonCodes.find((r) => r.code === "course_rigor");
    expect(rigorReason?.detail).toBe("3 rigor-weighted advanced course(s)");
  });

  test("no SAT/ACT on file: testing contributes 0 while GPA and course rigor still contribute normally, keeping the score meaningfully above 0", () => {
    expect(academicsFacts.testScores).toHaveLength(0);
    expect(academicsResult.reasonCodes.find((r) => r.code === "testing_presence")).toBeUndefined();
    expect(academicsResult.reasonCodes.find((r) => r.code === "gpa")).toBeDefined();
    expect(academicsResult.reasonCodes.find((r) => r.code === "course_rigor")).toBeDefined();

    // Course rigor's contribution is real and additive on top of GPA alone (not silently
    // absorbed/capped) — removing the AP courses measurably lowers the score.
    const gpaOnly = scoreAcademics({ ...academicsFacts, courses: [] });
    expect(academicsResult.score).toBeGreaterThan(gpaOnly.score);

    // A standardized test genuinely would add on top of today's score — confirming today's
    // testing contribution really is 0, not a hidden ceiling this persona happens to hit.
    const withSat = scoreAcademics({
      ...academicsFacts,
      testScores: [{ id: "t1", user_id: "user-1", test_name: "SAT", score: "1400", max_score: "1600", subscores: {}, test_date: "2026-03-01", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }],
    });
    expect(withSat.score).toBeGreaterThan(academicsResult.score);

    // Absence of a mandatory test never blocks a meaningful score, and is scored honestly
    // (medium, not a fabricated "high") rather than either zeroed out or falsely certain.
    expect(academicsResult.score).toBeGreaterThanOrEqual(40);
    expect(academicsResult.confidence).toBe("medium");
  });

  const eligibleCitizenshipFellowship = opportunity("turkiye-eligible-economics-fellowship", {
    category: "fellowship",
    fields: ["Economics"],
    eligible_citizenships: ["Turkey"], // confirms the Türkiye/Turkey alias (isSameCountry) resolves against this student's citizenship_countries = ["Turkiye"]
  });
  const gradeRestrictedProgram = opportunity("underclassmen-only-economics-program", {
    category: "academic_program",
    fields: ["Economics"],
    eligible_grades: ["9", "10"], // excludes this grade-11 student
  });

  const grade11Student = {
    age: 16,
    country: "Turkiye",
    interests: ["Economics"],
    weakestDimensions: ["academics" as ProfileDimension],
    citizenshipCountries: ["Turkiye"],
    graduationYear: grade11GraduationYear,
  };

  function toMatchProfile(opp: Opportunity) {
    return {
      category: opp.category,
      minimumAge: opp.minimum_age,
      maximumAge: opp.maximum_age,
      eligibleCountries: opp.eligible_countries,
      eligibleCitizenships: opp.eligible_citizenships,
      eligibleGrades: opp.eligible_grades,
      // Mirrors lib/opportunities/persist-matches.ts's real construction (Package 8) — this
      // local converter must not silently drift from what the actual match-refresh path
      // passes, or a persona test could pass while the real data flow diverges from it.
      citizenshipRestrictions: opp.citizenship_restrictions,
      residencyRestrictions: opp.residency_restrictions,
      fields: opp.fields,
      country: opp.country,
    };
  }

  function matchFor(opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(grade11Student, toMatchProfile(opp));
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  test("citizenship_countries=['Turkiye'] correctly resolves against an opportunity restricted to eligible_citizenships including 'Turkey' (the confirmed alias case)", () => {
    const result = computeEligibility(grade11Student, toMatchProfile(eligibleCitizenshipFellowship));
    expect(result.eligible).toBe(true);
  });

  test("the same grade-11 student is correctly excluded by an opportunity restricted to grades 9-10", () => {
    const result = computeEligibility(grade11Student, toMatchProfile(gradeRestrictedProgram));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/grade/i);
  });

  const state: CounselorState = {
    userId: "user-1",
    advisor: {
      student: {
        birthYear: 2010,
        country: "Turkiye",
        citizenshipCountries: ["Turkiye"],
        graduationYear: grade11GraduationYear,
      },
      completenessPercent: 80,
      interests: ["Economics"],
    } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scoresWith({ academics: academicsResult.score })),
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ opportunity: eligibleCitizenshipFellowship, match: matchFor(eligibleCitizenshipFellowship) }],
    requirementCandidateInputs: [],
  };

  test("Counselor Core still produces real, non-empty recommendations for this persona — candidate generation and ranking don't silently exclude it", () => {
    const result = runCounselorPipeline(state);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.map((r) => r.id)).toContain("opportunity:turkiye-eligible-economics-fellowship");
  });

  test("academics — being the one below-default dimension for this persona — surfaces as the weakest-ranked gap, and every dimension is actually scored (never insufficient_data purely for lacking a class rank or SAT score)", () => {
    const result = runCounselorPipeline(state);
    expect(result.gaps[0].dimension).toBe("academics");
    expect(result.gaps.every((g) => g.severity !== "insufficient_data")).toBe(true);
  });
});
