import { describe, expect, test } from "vitest";
import { evaluateCandidateEligibility } from "@/lib/counselor/eligibility";
import type { CandidateAction, CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch } from "@/types/database";

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    title: "Test Opportunity",
    organization: null,
    description: null,
    category: "research",
    official_url: null,
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
    source_confidence: "medium",
    // Verified by default, consistent with this fixture's own `verification_state:
    // "verified_current"` below. The two contradicted each other, which is the live data
    // shape lib/opportunities/lifecycle.ts's freshness gate exists to catch (50 rows claim
    // verified_current while last_verified_at is null). Left null, every fixture in this file
    // would sit in the gated shape, and tests about country, citizenship, grade or scoring
    // would be asserting against an exclusion unrelated to their subject.
    last_verified_at: "2026-08-20T00:00:00Z",
    status: "active",
    normalized_title: "test opportunity",
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
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function match(overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: "match-1",
    user_id: "user-1",
    opportunity_id: "opp-1",
    eligible: true,
    eligibility_notes: null,
    relevance_score: 60,
    profile_need_score: 60,
    effort_estimate: null,
    match_confidence: null,
    match_score: 60,
    reason_codes: [],
    calculated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function opportunityCandidate(id = "opp-1"): CandidateAction {
  return {
    source: { kind: "opportunity", opportunityId: id },
    title: "Test Opportunity",
    category: "research",
    addressesDimensions: [],
    verificationState: "verified_current",
    sourceUrl: null,
    deadline: null,
    costOnFile: null,
    applicationRequirements: [],
  };
}

function state(opp: Opportunity, birthYear: number | null = 2009, overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: { student: { birthYear } } as CounselorState["advisor"],
    dimensionScores: [],
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ match: match({ opportunity_id: opp.id }), opportunity: opp }],
    requirementCandidateInputs: [],
    ...overrides,
  };
}

// Grade 12 today, the same computation __tests__/opportunities/matching.test.ts's own
// "unverified country eligibility" block uses — kept local rather than imported since these
// two suites don't otherwise share fixtures.
const RESOLVED_GRADE_YEAR = new Date().getFullYear() + 1;
// Spread into an opportunity() call to resolve age and grade (2026-09-03's own
// eligibility-not-verified safeguard for those two fields), for tests whose actual subject
// is a different dimension entirely and shouldn't see that note as noise.
const AGE_AND_GRADE_RESOLVED = { minimum_age: 0, maximum_age: 120, eligible_grades: ["12"] };

describe("evaluateCandidateEligibility — opportunities", () => {
  test("known_eligible when no restrictions exist and country eligibility is research-confirmed open", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ country_eligibility_confirmed_open: true, ...AGE_AND_GRADE_RESOLVED }), 2009, {
        advisor: { student: { birthYear: 2009, graduationYear: RESOLVED_GRADE_YEAR } } as CounselorState["advisor"],
      })
    );
    expect(result.verdict).toBe("known_eligible");
    expect(result.notes).toEqual([]);
  });

  // The live trust defect (docs/handoffs/opportunities-eligible-countries-gap.md Key
  // Finding 1): ~90% of live rows have an empty eligible_countries because nobody has
  // researched them — not because the program is open. Unknown must never be called
  // eligible (docs/counselor-core-plan.md Assumption A2).
  test("unknown, with a not-verified note, when eligible_countries is empty and NOT research-confirmed open", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ country_eligibility_confirmed_open: false })));
    expect(result.verdict).toBe("unknown");
    expect(result.notes.join(" ")).toMatch(/country eligibility not verified yet/i);
  });

  // The opposite overcorrection is forbidden too: unresearched is not evidence of a
  // restriction — the student must never be told they're ineligible because of it.
  test("an unverified country eligibility is never known_ineligible", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ country_eligibility_confirmed_open: false })));
    expect(result.verdict).not.toBe("known_ineligible");
  });

  // A structured citizenship gate means the row WAS researched and citizenship is the
  // operative check — stacking a "country not verified" note on top would be noise.
  test("no not-verified note when a structured citizenship restriction already covers the row", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_citizenships: ["United States"] }), 2009, {
        advisor: { student: { birthYear: 2009, citizenshipCountries: ["United States"] } } as CounselorState["advisor"],
      })
    );
    expect(result.notes.join(" ")).not.toMatch(/hasn't been verified/i);
  });

  // Restriction prose means the row was researched and a restriction is KNOWN to exist —
  // "not verified yet" would be false for it; the prose note is the honest surface.
  test("prose restrictions surface as their own note, not as a not-verified note", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ residency_restrictions: "Must attend school in Ohio" }))
    );
    expect(result.verdict).toBe("unknown");
    expect(result.notes.join(" ")).toContain("Must attend school in Ohio");
    expect(result.notes.join(" ")).not.toMatch(/hasn't been verified/i);
  });

  // A populated allow-list is the researched-restricted case — the hard check runs and no
  // not-verified note applies in either direction.
  test("no not-verified note when eligible_countries is populated", () => {
    const eligible = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["Turkey"], ...AGE_AND_GRADE_RESOLVED }), 2009, {
        advisor: { student: { birthYear: 2009, country: "Türkiye", graduationYear: RESOLVED_GRADE_YEAR } } as CounselorState["advisor"],
      })
    );
    expect(eligible.verdict).toBe("known_eligible");
    expect(eligible.notes).toEqual([]);
  });

  test("known_ineligible when the current cycle is closed", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_ineligible when the opportunity is discontinued", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "discontinued" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_eligible (not unknown) when an age restriction exists and the student's age is known", () => {
    // confirmed-open, and grade resolved, so this test stays about the age dimension alone.
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ minimum_age: 14, country_eligibility_confirmed_open: true, eligible_grades: ["12"] }), 2009, {
        advisor: { student: { birthYear: 2009, graduationYear: RESOLVED_GRADE_YEAR } } as CounselorState["advisor"],
      })
    );
    expect(result.verdict).toBe("known_eligible");
  });

  test("unknown when an age restriction exists but the student's birth year isn't on file", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ minimum_age: 14 }), null));
    expect(result.verdict).toBe("unknown");
  });

  test("unknown when the opportunity lists eligible countries but the student's country isn't on file", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["United States"] }), 2009, { advisor: { student: { birthYear: 2009, country: null } } as CounselorState["advisor"] })
    );
    expect(result.verdict).toBe("unknown");
  });

  test("known_eligible when the opportunity lists eligible countries and the student's country is on file", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["United States"], ...AGE_AND_GRADE_RESOLVED }), 2009, {
        advisor: { student: { birthYear: 2009, country: "United States", graduationYear: RESOLVED_GRADE_YEAR } } as CounselorState["advisor"],
      })
    );
    expect(result.verdict).toBe("known_eligible");
  });

  test("unknown, with a note, when citizenship restrictions are on file (free text Oryn can't parse)", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ citizenship_restrictions: "US citizens only" })));
    expect(result.verdict).toBe("unknown");
    expect(result.notes.join(" ")).toContain("US citizens only");
  });

  test("unknown when eligible_grades is populated (grade-level not computed by Oryn)", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ eligible_grades: ["11", "12"] })));
    expect(result.verdict).toBe("unknown");
  });

  test("known_ineligible (cycle) wins even if an unknown dimension is also present", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed", citizenship_restrictions: "US only" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  // Defense-in-depth (spec §37 invariant: "unverified opportunities never appear as
  // verified"): state.ts's DB query already filters to verification_state='verified_current'
  // before this point, but that filter is untested DB-boundary code (this repo's own
  // convention — see docs/counselor-core-plan.md §14). This check makes the invariant hold
  // even if a caller ever constructs a CounselorState without going through state.ts.
  test("known_ineligible when the opportunity is not verified_current, even if otherwise eligible", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ verification_state: "unverified" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_eligible when verification_state is verified_current (the normal case)", () => {
    // confirmed-open, and age/grade resolved, so this test stays about the verification_state
    // dimension alone.
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ verification_state: "verified_current", country_eligibility_confirmed_open: true, ...AGE_AND_GRADE_RESOLVED }), 2009, {
        advisor: { student: { birthYear: 2009, graduationYear: RESOLVED_GRADE_YEAR } } as CounselorState["advisor"],
      })
    );
    expect(result.verdict).toBe("known_eligible");
  });
});

describe("evaluateCandidateEligibility — non-opportunity candidates", () => {
  test("a requirement_action candidate is always known_eligible (it's the student's own declared target)", () => {
    const candidate: CandidateAction = {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-1", status: "not_met" },
      title: "Address: SAT score",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const result = evaluateCandidateEligibility(candidate, state(opportunity(), 2009, { eligibleOpportunityMatches: [] }));
    expect(result.verdict).toBe("known_eligible");
  });

  test("a profile_task candidate is always known_eligible (it's the student's own profile)", () => {
    const candidate: CandidateAction = {
      source: { kind: "profile_task", checklistKey: "Add a career goal" },
      title: "Add a career goal",
      category: "profile_completion",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const result = evaluateCandidateEligibility(candidate, state(opportunity(), 2009, { eligibleOpportunityMatches: [] }));
    expect(result.verdict).toBe("known_eligible");
  });
});

describe("evaluateCandidateEligibility — locale: tr", () => {
  test("verdicts are unaffected by locale — only note text changes", () => {
    const en = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed" })), new Date(), "en");
    const tr = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed" })), new Date(), "tr");
    expect(tr.verdict).toBe(en.verdict);
  });

  test("country-eligibility-unverified note is Turkish", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ country_eligibility_confirmed_open: false })),
      new Date(),
      "tr"
    );
    expect(result.notes.join(" ")).toMatch(/ülke uygunluğu henüz doğrulanmadı/i);
  });

  test("age-requirement-unknown note is Turkish", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ minimum_age: 14 }), null), new Date(), "tr");
    expect(result.notes.join(" ")).toMatch(/yaş şartı/i);
  });

  // studentCountry stays untranslated by design (see lib/counselor/copy.ts's file header) —
  // the surrounding Turkish grammar must not require case-marking it.
  test("country-not-eligible note is Turkish around an untranslated stored country name", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["Germany"] }), 2009, { advisor: { student: { birthYear: 2009, country: "France" } } as CounselorState["advisor"] }),
      new Date(),
      "tr"
    );
    expect(result.notes.join(" ") + result.verdict).toContain("France");
  });

  test("closed-cycle known_ineligible reason is Turkish", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed" })), new Date(), "tr");
    expect(result.notes.join(" ")).toMatch(/kapandı/);
  });

  test("not-verified reason is Turkish", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ verification_state: "unverified" })), new Date(), "tr");
    expect(result.notes.join(" ")).toMatch(/doğrulanmış değil/);
  });

  test("omitting locale still produces the exact English notes (default-locale backward compatibility)", () => {
    const withDefault = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ country_eligibility_confirmed_open: false })));
    const withExplicitEn = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ country_eligibility_confirmed_open: false })), new Date(), "en");
    expect(withDefault).toEqual(withExplicitEn);
  });
});
