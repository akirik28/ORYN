import { describe, expect, test } from "vitest";
import { computeEligibility, computeOpportunityMatch, computeAvoidSignals, isNearStudent, renderEligibilityNotes } from "@/lib/opportunities/matching";
import type { OpportunityForMatching, StudentMatchProfile, DismissedOpportunitySignal } from "@/lib/opportunities/matching";

function opportunity(overrides: Partial<OpportunityForMatching> = {}): OpportunityForMatching {
  return {
    category: "research",
    minimumAge: null,
    maximumAge: null,
    eligibleCountries: [],
    fields: [],
    country: null,
    ...overrides,
  };
}

function student(overrides: Partial<StudentMatchProfile> = {}): StudentMatchProfile {
  return {
    age: 16,
    country: "United States",
    interests: [],
    weakestDimensions: [],
    ...overrides,
  };
}

// 2026-09-03 (eligibility_notes -> codes): every assertion below checks a stored code/params
// pair, not rendered prose -- computeEligibility itself no longer renders anything (that's
// renderEligibilityNotes' job, exercised separately below). Checking the code is a stronger
// pin than the old regex-on-prose ever was: it breaks if the WRONG finding fires, not only if
// the wording changes, and it can't accidentally pass on a coincidental substring match.
describe("computeEligibility", () => {
  test("is eligible when there are no restrictions", () => {
    expect(computeEligibility(student(), opportunity()).eligible).toBe(true);
  });

  test("is ineligible when the student is younger than the minimum age", () => {
    const result = computeEligibility(student({ age: 14 }), opportunity({ minimumAge: 16 }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toEqual([{ code: "age_below_minimum", params: { minimumAge: 16 } }]);
  });

  test("is ineligible when the student is older than the maximum age", () => {
    const result = computeEligibility(student({ age: 19 }), opportunity({ maximumAge: 18 }));
    expect(result.eligible).toBe(false);
  });

  test("is ineligible when the opportunity has a country allow-list that excludes the student", () => {
    const result = computeEligibility(student({ country: "Turkey" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toEqual([{ code: "country_not_eligible", params: { studentCountry: "Turkey" } }]);
  });

  test("is eligible when the student's country is on the allow-list", () => {
    const result = computeEligibility(student({ country: "Canada" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
    expect(result.eligible).toBe(true);
  });

  test("does not evaluate country eligibility when the student's country is unknown", () => {
    const result = computeEligibility(student({ country: null }), opportunity({ eligibleCountries: ["United States"] }));
    expect(result.eligible).toBe(true);
  });

  // Unknown must never read the same as confirmed — eligible stays true (a restriction
  // absent evidence doesn't hard-exclude), but notes must say so, so a caller can't badge
  // an unverified match identically to a confirmed one.
  test("surfaces an unknown-eligibility note when a country restriction can't be checked", () => {
    const result = computeEligibility(student({ country: null }), opportunity({ eligibleCountries: ["United States"] }));
    expect(result.eligible).toBe(true);
    expect(result.notes.map((n) => n.code)).toContain("country_unknown");
  });

  test("surfaces an unknown-eligibility note when an age restriction can't be checked", () => {
    const result = computeEligibility(student({ age: null }), opportunity({ minimumAge: 16 }));
    expect(result.eligible).toBe(true);
    expect(result.notes.map((n) => n.code)).toContain("age_unknown");
  });

  // 2026-09-03: absence of a recorded age bound is not evidence every age is welcome — it's
  // just never having been researched (~67% of live rows at the time this was found). Same
  // principle, and same test shape, as the "unverified country eligibility" block below;
  // kept here rather than folded into that block since it's a different field, not a
  // sub-case of the country check.
  test("surfaces a not-verified note when the opportunity records no age bound at all", () => {
    const result = computeEligibility(student(), opportunity());
    expect(result.eligible).toBe(true); // never an exclusion — no bound is not a known mismatch
    expect(result.notes.map((n) => n.code)).toContain("age_eligibility_unverified");
  });

  test("no age-unverified note when a real bound is on file, regardless of match outcome", () => {
    const result = computeEligibility(student({ age: 16 }), opportunity({ minimumAge: 14, maximumAge: 18 }));
    expect(result.notes.some((n) => n.code === "age_eligibility_unverified")).toBe(false);
  });

  test("is ineligible when a citizenship restriction is known to exclude the student", () => {
    const result = computeEligibility(
      student({ citizenshipCountries: ["Canada"] }),
      opportunity({ eligibleCitizenships: ["United States"] })
    );
    expect(result.eligible).toBe(false);
    expect(result.notes).toEqual([{ code: "citizenship_not_eligible", params: { eligible: "United States", onFile: "Canada" } }]);
  });

  test("is eligible when the student holds one of the eligible citizenships", () => {
    const result = computeEligibility(
      student({ citizenshipCountries: ["Canada", "United States"], graduationYear: new Date().getFullYear() + 1 }),
      opportunity({ eligibleCitizenships: ["United States"], minimumAge: 0, maximumAge: 120, eligibleGrades: ["12"] })
    );
    expect(result.eligible).toBe(true);
    expect(result.notes).toEqual([]);
  });

  test("surfaces an unknown-eligibility note when a citizenship restriction can't be checked", () => {
    const result = computeEligibility(student({ citizenshipCountries: [] }), opportunity({ eligibleCitizenships: ["United States"] }));
    expect(result.eligible).toBe(true);
    expect(result.notes.map((n) => n.code)).toContain("citizenship_unknown");
  });

  test("is ineligible when a grade restriction is known to exclude the student", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = computeEligibility(student({ graduationYear: nextYear }), opportunity({ eligibleGrades: ["9", "10"] }));
    expect(result.eligible).toBe(false);
    expect(result.notes[0]?.code).toBe("grade_not_eligible");
  });

  test("surfaces an unknown-eligibility note when a grade restriction can't be checked", () => {
    const result = computeEligibility(student({ graduationYear: null }), opportunity({ eligibleGrades: ["9", "10"] }));
    expect(result.eligible).toBe(true);
    expect(result.notes.map((n) => n.code)).toContain("grade_unknown");
  });

  // Same principle as the age-unverified test above, for the field that had the identical
  // gap: eligibleGrades empty means never researched, not "every grade welcome."
  test("surfaces a not-verified note when the opportunity records no eligible grades at all", () => {
    const result = computeEligibility(student(), opportunity());
    expect(result.eligible).toBe(true);
    expect(result.notes.map((n) => n.code)).toContain("grade_eligibility_unverified");
  });

  test("no grade-unverified note when a real grade list is on file, regardless of match outcome", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = computeEligibility(student({ graduationYear: nextYear }), opportunity({ eligibleGrades: ["9", "10", "11", "12"] }));
    expect(result.notes.some((n) => n.code === "grade_eligibility_unverified")).toBe(false);
  });

  // Confirmed live against a real profile this session: a student's own stored country
  // can be "Türkiye" (native spelling) while opportunity data says "Turkey" — a plain
  // .includes() (what this function used before) treats those as two different countries.
  test("resolves the confirmed Türkiye/Turkey alias case", () => {
    const result = computeEligibility(student({ country: "Türkiye" }), opportunity({ eligibleCountries: ["Turkey"] }));
    expect(result.eligible).toBe(true);
  });

  // Counselor Core fix: previously this function had no idea whether the student had
  // already acted on the opportunity at all — an `applied` or `not_interested` opportunity
  // could resurface at the top of ranked matches indefinitely (confirmed live bug).
  test("is ineligible when the student already applied", () => {
    const result = computeEligibility(student(), opportunity(), "applied");
    expect(result.eligible).toBe(false);
    expect(result.notes).toEqual([{ code: "already_applied" }]);
  });

  test("is ineligible when the student already marked it not interested", () => {
    const result = computeEligibility(student(), opportunity(), "not_interested");
    expect(result.eligible).toBe(false);
    expect(result.notes).toEqual([{ code: "already_not_interested" }]);
  });

  test("remains eligible when the student only bookmarked it (saved, not applied/dismissed)", () => {
    const result = computeEligibility(student(), opportunity(), "saved");
    expect(result.eligible).toBe(true);
  });

  test("remains eligible when there is no saved-opportunity record at all", () => {
    const result = computeEligibility(student(), opportunity(), null);
    expect(result.eligible).toBe(true);
  });

  // The live trust defect (docs/handoffs/opportunities-eligible-countries-gap.md Key
  // Finding 1): an empty eligibleCountries has two live meanings — research-confirmed
  // open (deliberately stored empty) and never-researched (~90% of live rows) — and
  // before this rule both rendered identically: eligible, no warning. Only the first
  // has earned silence.
  describe("unverified country eligibility", () => {
    // This block isolates the country/citizenship dimension on purpose — age and grade need
    // their own resolved values here so the 2026-09-03 age/grade-unverified notes (added
    // alongside this exact country safeguard, same principle) don't show up as noise in
    // assertions that are specifically about what country/citizenship data does. A student
    // whose graduation year actually resolves to a listed grade, on an opportunity with a
    // real (trivially wide) age band and a matching eligibleGrades entry, is fully resolved
    // on both dimensions — only country/citizenship notes can appear below.
    const resolvedGradeYear = new Date().getFullYear() + 1;
    function resolvedOpportunity(overrides: Partial<OpportunityForMatching> = {}): OpportunityForMatching {
      return opportunity({ minimumAge: 0, maximumAge: 120, eligibleGrades: ["12"], ...overrides });
    }
    function resolvedStudent(overrides: Partial<StudentMatchProfile> = {}): StudentMatchProfile {
      return student({ graduationYear: resolvedGradeYear, ...overrides });
    }

    test("surfaces a not-verified note when eligibleCountries is empty and not research-confirmed open", () => {
      const result = computeEligibility(resolvedStudent(), resolvedOpportunity());
      expect(result.eligible).toBe(true); // never an exclusion — absence of research is not evidence of a restriction
      expect(result.notes).toEqual([{ code: "country_eligibility_unverified" }]);
    });

    test("no note when research confirmed the program open worldwide", () => {
      const result = computeEligibility(resolvedStudent(), resolvedOpportunity({ countryEligibilityConfirmedOpen: true }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([]);
    });

    test("no note when a populated allow-list already covers the row (researched-restricted case)", () => {
      const result = computeEligibility(resolvedStudent({ country: "Canada" }), resolvedOpportunity({ eligibleCountries: ["United States", "Canada"] }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([]);
    });

    test("no note when a structured citizenship gate already covers the row", () => {
      const result = computeEligibility(
        resolvedStudent({ citizenshipCountries: ["United States"] }),
        resolvedOpportunity({ eligibleCitizenships: ["United States"] })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([]);
    });

    // Package 8: this used to be a boolean-flag test asserting silence ("the prose is
    // surfaced elsewhere") — that was the defect itself, not a real behavior worth pinning.
    // lib/counselor/eligibility.ts's evaluateOpportunityEligibility already surfaced this
    // same prose; this function silently didn't, so the card and the Advisor disagreed
    // about one row's own text (live-confirmed on Garcia Summer Research Program).
    test("surfaces a note quoting citizenship-restriction prose instead of going silent", () => {
      const result = computeEligibility(
        resolvedStudent(),
        resolvedOpportunity({ citizenshipRestrictions: "Applicants must be U.S. citizens or U.S. permanent residents." })
      );
      expect(result.eligible).toBe(true); // prose alone is never a hard exclusion, only a structured gate is
      expect(result.notes).toEqual([
        { code: "citizenship_restriction_on_file", params: { restriction: "Applicants must be U.S. citizens or U.S. permanent residents." } },
      ]);
    });

    test("surfaces a note quoting residency-restriction prose the same way", () => {
      const result = computeEligibility(resolvedStudent(), resolvedOpportunity({ residencyRestrictions: "Open only to residents of EU member states." }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([{ code: "residency_restriction_on_file", params: { restriction: "Open only to residents of EU member states." } }]);
    });

    // Wording parity with lib/counselor/eligibility.ts's evaluateOpportunityEligibility is
    // deliberate, not incidental — the two surfaces reading one row's prose differently would
    // be a weaker version of the same disagreement this package fixes. Rendered via
    // renderEligibilityNotes here (2026-09-03) since computeEligibility itself no longer
    // produces prose directly — the wording parity claim is about the rendered text, so that's
    // what this checks.
    test("the prose note renders to the counselor's exact wording", () => {
      const prose = "Applicants must be U.S. citizens or U.S. permanent residents.";
      const result = computeEligibility(resolvedStudent(), resolvedOpportunity({ citizenshipRestrictions: prose }));
      expect(renderEligibilityNotes(result.notes)).toBe(`Citizenship restriction on file (not automatically verified): ${prose}`);
    });

    test("no separate 'not verified yet' note when restriction prose already answers the question", () => {
      const result = computeEligibility(resolvedStudent(), resolvedOpportunity({ citizenshipRestrictions: "Open only to EU citizens." }));
      expect(result.notes.some((n) => n.code === "country_eligibility_unverified")).toBe(false);
    });

    test("citizenship prose stays quiet when a structured citizenship gate already resolved the row", () => {
      const result = computeEligibility(
        resolvedStudent({ citizenshipCountries: ["United States"] }),
        resolvedOpportunity({ eligibleCitizenships: ["United States"], citizenshipRestrictions: "Applicants must be U.S. citizens." })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([]);
    });

    test("residency prose stays quiet when a structured country allow-list already resolved the row", () => {
      const result = computeEligibility(
        resolvedStudent({ country: "Canada" }),
        resolvedOpportunity({ eligibleCountries: ["Canada"], residencyRestrictions: "Open only to North American residents." })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toEqual([]);
    });

    test("the note stacks with other unknown-notes instead of replacing them", () => {
      const result = computeEligibility(student({ age: null }), opportunity({ minimumAge: 16 }));
      expect(result.eligible).toBe(true);
      const codes = result.notes.map((n) => n.code);
      expect(codes).toContain("age_unknown");
      expect(codes).toContain("country_eligibility_unverified");
      expect(codes).toContain("grade_eligibility_unverified");
    });
  });
});

describe("computeOpportunityMatch", () => {
  test("scores 0 for an ineligible student regardless of relevance", () => {
    const match = computeOpportunityMatch(
      student({ age: 12, interests: ["Economics"] }),
      opportunity({ minimumAge: 16, fields: ["Economics"] })
    );
    expect(match.eligible).toBe(false);
    expect(match.matchScore).toBe(0);
  });

  test("scores higher when the opportunity targets the student's weakest dimension", () => {
    const weakInResearch = computeOpportunityMatch(
      student({ weakestDimensions: ["research"] }),
      opportunity({ category: "research" })
    );
    const strongInResearch = computeOpportunityMatch(
      student({ weakestDimensions: ["leadership"] }),
      opportunity({ category: "research" })
    );
    expect(weakInResearch.profileNeedScore).toBeGreaterThan(strongInResearch.profileNeedScore);
    expect(weakInResearch.matchScore).toBeGreaterThan(strongInResearch.matchScore);
  });

  test("scores higher when the student's interests overlap the opportunity's fields", () => {
    const overlapping = computeOpportunityMatch(student({ interests: ["Economics"] }), opportunity({ fields: ["Economics", "Public Policy"] }));
    const unrelated = computeOpportunityMatch(student({ interests: ["Chemistry"] }), opportunity({ fields: ["Economics", "Public Policy"] }));
    expect(overlapping.relevanceScore).toBeGreaterThan(unrelated.relevanceScore);
  });

  test("scores higher when the opportunity is based in the student's own country", () => {
    const near = computeOpportunityMatch(student({ country: "United States" }), opportunity({ country: "United States" }));
    const far = computeOpportunityMatch(student({ country: "United States" }), opportunity({ country: "France" }));
    expect(near.relevanceScore).toBeGreaterThan(far.relevanceScore);
  });

  test("proximity boost never overrides eligibility", () => {
    const match = computeOpportunityMatch(student({ age: 12, country: "United States" }), opportunity({ minimumAge: 16, country: "United States" }));
    expect(match.eligible).toBe(false);
    expect(match.matchScore).toBe(0);
  });

  test("scores 0 for an opportunity the student already applied to, even if otherwise a perfect match", () => {
    const match = computeOpportunityMatch(student({ interests: ["Economics"], weakestDimensions: ["research"] }), opportunity({ fields: ["Economics"], category: "research" }), "applied");
    expect(match.eligible).toBe(false);
    expect(match.matchScore).toBe(0);
  });

  // Regression: counselor-loop QA defect #3 (docs/handoffs/counselor-loop-qa-report.md) —
  // reproduced live: a Computer-Science-interested student got relevanceScore=100 against a
  // Chemistry Olympiad tagged only ["chemistry", "science"], because "computer science"
  // contains "science" as a substring. Fails before this fix, passes after.
  test("does not treat 'Computer Science' as matching a field merely called 'Science' (substring false positive)", () => {
    const match = computeOpportunityMatch(student({ interests: ["Computer Science"] }), opportunity({ fields: ["chemistry", "science"] }));
    expect(match.relevanceScore).toBe(0);
  });

  test("still matches an exact field name after case/whitespace normalization", () => {
    const match = computeOpportunityMatch(student({ interests: ["  Physics  "] }), opportunity({ fields: ["PHYSICS"] }));
    expect(match.relevanceScore).toBeGreaterThan(0);
  });

  // `opportunities.fields` is uncontrolled free text and does not share a vocabulary with
  // onboarding's INTEREST_SUGGESTIONS. Live 2026-08-23: `computer_science` on 6 actionable rows
  // and `computer science` on 5, plus `environmental_science` against onboarding's
  // "Environmental Science". Under bare toLowerCase() a student who picked Computer Science
  // scored zero against more than half the CS catalogue.
  test("matches the same field stored with an underscore separator", () => {
    const match = computeOpportunityMatch(student({ interests: ["Computer Science"] }), opportunity({ fields: ["computer_science"] }));
    expect(match.relevanceScore).toBeGreaterThan(0);
  });

  test("matches a hyphenated field spelling too", () => {
    const match = computeOpportunityMatch(student({ interests: ["Environmental Science"] }), opportunity({ fields: ["environmental-science"] }));
    expect(match.relevanceScore).toBeGreaterThan(0);
  });

  test("separator normalization does not reopen the substring false positive", () => {
    // The whole point: separators are normalized, tokens are not.
    const match = computeOpportunityMatch(student({ interests: ["Computer Science"] }), opportunity({ fields: ["science", "data_science"] }));
    expect(match.relevanceScore).toBe(0);
  });

  test("does not cross-match two different 'X Science' interests/fields via the shared word 'science'", () => {
    const match = computeOpportunityMatch(student({ interests: ["Environmental Science"] }), opportunity({ fields: ["Political Science"] }));
    expect(match.relevanceScore).toBe(0);
  });
});

describe("isNearStudent", () => {
  test("true for a case/accent/whitespace-insensitive match", () => {
    expect(isNearStudent(student({ country: "united   states" }), opportunity({ country: "United States" }))).toBe(true);
  });

  test("false when either side has no country on file", () => {
    expect(isNearStudent(student({ country: null }), opportunity({ country: "United States" }))).toBe(false);
    expect(isNearStudent(student({ country: "United States" }), opportunity({ country: null }))).toBe(false);
  });

  test("false for genuinely different countries", () => {
    expect(isNearStudent(student({ country: "United States" }), opportunity({ country: "France" }))).toBe(false);
  });

  test("resolves the confirmed Türkiye/Turkey alias case", () => {
    expect(isNearStudent(student({ country: "Türkiye" }), opportunity({ country: "Turkey" }))).toBe(true);
  });
});

describe("computeOpportunityMatch — relevanceBasis and matched detail", () => {
  test("opportunity_fields_missing when the opportunity has no fields recorded", () => {
    const match = computeOpportunityMatch(student({ interests: ["Economics"] }), opportunity({ fields: [] }));
    expect(match.relevanceBasis).toBe("opportunity_fields_missing");
    expect(match.matchedInterests).toEqual([]);
  });

  test("student_interests_missing when the student has no interests recorded, even if the opportunity has fields", () => {
    const match = computeOpportunityMatch(student({ interests: [] }), opportunity({ fields: ["Economics"] }));
    expect(match.relevanceBasis).toBe("student_interests_missing");
    expect(match.matchedInterests).toEqual([]);
  });

  test("no_overlap when both sides have real data and none of it overlaps", () => {
    const match = computeOpportunityMatch(student({ interests: ["Chemistry"] }), opportunity({ fields: ["Economics"] }));
    expect(match.relevanceBasis).toBe("no_overlap");
    expect(match.matchedInterests).toEqual([]);
  });

  test("some_overlap names the specific interest that matched, in the student's own casing", () => {
    const match = computeOpportunityMatch(student({ interests: ["Economics", "Chemistry"] }), opportunity({ fields: ["Economics", "Public Policy"] }));
    expect(match.relevanceBasis).toBe("some_overlap");
    expect(match.matchedInterests).toEqual(["Economics"]);
  });

  test("matchedGapDimensions lists only the weak dimensions this opportunity's category actually targets", () => {
    const match = computeOpportunityMatch(
      student({ weakestDimensions: ["research", "leadership"] }),
      opportunity({ category: "research" })
    );
    expect(match.matchedGapDimensions).toEqual(["research"]);
  });

  test("matchedGapDimensions is empty when the category targets none of the student's weak dimensions", () => {
    const match = computeOpportunityMatch(student({ weakestDimensions: ["leadership"] }), opportunity({ category: "research" }));
    expect(match.matchedGapDimensions).toEqual([]);
  });
});

function dismissal(overrides: Partial<DismissedOpportunitySignal> = {}): DismissedOpportunitySignal {
  return { reason: null, fields: [], cost: null, isDistantInPerson: false, ...overrides };
}

describe("computeAvoidSignals", () => {
  test("no signal from a single dismissal, of any reason — the pattern bar is 2", () => {
    const signals = computeAvoidSignals([dismissal({ reason: "not_interested_topic", fields: ["Economics"] })]);
    expect(signals).toEqual({ avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: false });
  });

  test("empty dismissal history produces no signal at all", () => {
    expect(computeAvoidSignals([])).toEqual({ avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: false });
  });

  test("two not_interested_topic dismissals sharing a field flag that field", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "not_interested_topic", fields: ["Economics"] }),
      dismissal({ reason: "not_interested_topic", fields: ["Economics", "Public Policy"] }),
    ]);
    expect(signals.avoidFields).toEqual(["economics"]);
  });

  test("two not_interested_topic dismissals in DIFFERENT fields flag neither — counted per field, not per dismissal", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "not_interested_topic", fields: ["Economics"] }),
      dismissal({ reason: "not_interested_topic", fields: ["Chemistry"] }),
    ]);
    expect(signals.avoidFields).toEqual([]);
  });

  test("field labels are normalized the same way computeRelevance normalizes them (underscores, casing)", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "not_interested_topic", fields: ["computer_science"] }),
      dismissal({ reason: "not_interested_topic", fields: ["Computer Science"] }),
    ]);
    expect(signals.avoidFields).toEqual(["computer science"]);
  });

  test("two too_expensive dismissals set the floor to the CHEAPER of the two, not the average or the more recent", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "too_expensive", cost: 500 }),
      dismissal({ reason: "too_expensive", cost: 200 }),
    ]);
    expect(signals.avoidCostFloor).toBe(200);
  });

  test("a too_expensive dismissal with no cost on file doesn't count toward the pattern", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "too_expensive", cost: 200 }),
      dismissal({ reason: "too_expensive", cost: null }),
    ]);
    expect(signals.avoidCostFloor).toBeNull();
  });

  test("two location dismissals that were both distant in-person set avoidsDistantInPerson", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "location", isDistantInPerson: true }),
      dismissal({ reason: "location", isDistantInPerson: true }),
    ]);
    expect(signals.avoidsDistantInPerson).toBe(true);
  });

  test("a location dismissal that wasn't actually distant (online, or already near) doesn't count", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "location", isDistantInPerson: true }),
      dismissal({ reason: "location", isDistantInPerson: false }),
    ]);
    expect(signals.avoidsDistantInPerson).toBe(false);
  });

  test("the four reasons this pass deliberately doesn't act on never contribute to any signal, even repeated", () => {
    const signals = computeAvoidSignals([
      dismissal({ reason: "too_competitive", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "too_competitive", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "no_time", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "no_time", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "already_applied", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "already_applied", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "other", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
      dismissal({ reason: "other", fields: ["Economics"], cost: 200, isDistantInPerson: true }),
    ]);
    expect(signals).toEqual({ avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: false });
  });
});

describe("computeOpportunityMatch — avoid signals never exclude, only lower relevance", () => {
  test("a student with no dismissedSignals at all behaves identically to today — no penalty, empty avoidReasons", () => {
    const match = computeOpportunityMatch(student({ interests: ["Economics"] }), opportunity({ fields: ["Economics"], cost: 5000 }));
    expect(match.avoidReasons).toEqual([]);
  });

  test("a topic avoid-signal lowers relevanceScore for a matching field and is named in avoidReasons", () => {
    const withSignal = computeOpportunityMatch(
      student({ interests: ["Economics"], dismissedSignals: { avoidFields: ["economics"], avoidCostFloor: null, avoidsDistantInPerson: false } }),
      opportunity({ fields: ["Economics"] })
    );
    const withoutSignal = computeOpportunityMatch(student({ interests: ["Economics"] }), opportunity({ fields: ["Economics"] }));
    expect(withSignal.relevanceScore).toBeLessThan(withoutSignal.relevanceScore);
    expect(withSignal.avoidReasons).toEqual(["topic"]);
  });

  test("a topic avoid-signal does nothing when the opportunity is in an unrelated field", () => {
    const match = computeOpportunityMatch(
      student({ interests: ["Chemistry"], dismissedSignals: { avoidFields: ["economics"], avoidCostFloor: null, avoidsDistantInPerson: false } }),
      opportunity({ fields: ["Chemistry"] })
    );
    expect(match.avoidReasons).toEqual([]);
  });

  test("a cost avoid-signal penalizes an opportunity at or above the floor", () => {
    const match = computeOpportunityMatch(
      student({ dismissedSignals: { avoidFields: [], avoidCostFloor: 200, avoidsDistantInPerson: false } }),
      opportunity({ cost: 200 })
    );
    expect(match.avoidReasons).toEqual(["cost"]);
  });

  test("a cost avoid-signal does not penalize an opportunity below the floor", () => {
    const match = computeOpportunityMatch(
      student({ dismissedSignals: { avoidFields: [], avoidCostFloor: 200, avoidsDistantInPerson: false } }),
      opportunity({ cost: 50 })
    );
    expect(match.avoidReasons).toEqual([]);
  });

  test("a cost avoid-signal does not penalize an opportunity with no price on file", () => {
    const match = computeOpportunityMatch(
      student({ dismissedSignals: { avoidFields: [], avoidCostFloor: 200, avoidsDistantInPerson: false } }),
      opportunity({ cost: null })
    );
    expect(match.avoidReasons).toEqual([]);
  });

  test("a location avoid-signal penalizes a distant in-person opportunity", () => {
    const match = computeOpportunityMatch(
      student({ country: "Turkey", dismissedSignals: { avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: true } }),
      opportunity({ locationMode: "in_person", country: "United States" })
    );
    expect(match.avoidReasons).toEqual(["location"]);
  });

  test("a location avoid-signal does not penalize an online opportunity, even far away", () => {
    const match = computeOpportunityMatch(
      student({ country: "Turkey", dismissedSignals: { avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: true } }),
      opportunity({ locationMode: "online", country: "United States" })
    );
    expect(match.avoidReasons).toEqual([]);
  });

  test("a location avoid-signal does not penalize an in-person opportunity that's actually near the student", () => {
    const match = computeOpportunityMatch(
      student({ country: "Turkey", dismissedSignals: { avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: true } }),
      opportunity({ locationMode: "in_person", country: "Turkey" })
    );
    expect(match.avoidReasons).toEqual([]);
  });

  test("multiple avoid-signals can stack on the same opportunity, each named", () => {
    const match = computeOpportunityMatch(
      student({
        interests: ["Economics"],
        dismissedSignals: { avoidFields: ["economics"], avoidCostFloor: 200, avoidsDistantInPerson: false },
      }),
      opportunity({ fields: ["Economics"], cost: 300 })
    );
    expect(match.avoidReasons).toEqual(expect.arrayContaining(["topic", "cost"]));
    expect(match.avoidReasons).toHaveLength(2);
  });

  test("an avoid-signal never makes an otherwise-eligible opportunity ineligible — it only lowers relevance", () => {
    const match = computeOpportunityMatch(
      student({ interests: ["Economics"], dismissedSignals: { avoidFields: ["economics"], avoidCostFloor: 0, avoidsDistantInPerson: false } }),
      opportunity({ fields: ["Economics"], cost: 100000 })
    );
    expect(match.eligible).toBe(true);
  });

  test("a direct dismissal of THIS opportunity still hard-excludes regardless of avoid signals — the two mechanisms are independent", () => {
    const match = computeOpportunityMatch(
      student({ dismissedSignals: { avoidFields: [], avoidCostFloor: null, avoidsDistantInPerson: false } }),
      opportunity({}),
      "not_interested"
    );
    expect(match.eligible).toBe(false);
  });
});
