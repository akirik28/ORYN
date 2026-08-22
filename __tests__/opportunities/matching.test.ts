import { describe, expect, test } from "vitest";
import { computeEligibility, computeOpportunityMatch, isNearStudent } from "@/lib/opportunities/matching";
import type { OpportunityForMatching, StudentMatchProfile } from "@/lib/opportunities/matching";

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

describe("computeEligibility", () => {
  test("is eligible when there are no restrictions", () => {
    expect(computeEligibility(student(), opportunity()).eligible).toBe(true);
  });

  test("is ineligible when the student is younger than the minimum age", () => {
    const result = computeEligibility(student({ age: 14 }), opportunity({ minimumAge: 16 }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/minimum age/i);
  });

  test("is ineligible when the student is older than the maximum age", () => {
    const result = computeEligibility(student({ age: 19 }), opportunity({ maximumAge: 18 }));
    expect(result.eligible).toBe(false);
  });

  test("is ineligible when the opportunity has a country allow-list that excludes the student", () => {
    const result = computeEligibility(student({ country: "Turkey" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/Turkey/);
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
    expect(result.notes).toMatch(/country/i);
  });

  test("surfaces an unknown-eligibility note when an age restriction can't be checked", () => {
    const result = computeEligibility(student({ age: null }), opportunity({ minimumAge: 16 }));
    expect(result.eligible).toBe(true);
    expect(result.notes).toMatch(/age/i);
  });

  test("is ineligible when a citizenship restriction is known to exclude the student", () => {
    const result = computeEligibility(
      student({ citizenshipCountries: ["Canada"] }),
      opportunity({ eligibleCitizenships: ["United States"] })
    );
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/citizenship/i);
  });

  test("is eligible when the student holds one of the eligible citizenships", () => {
    const result = computeEligibility(
      student({ citizenshipCountries: ["Canada", "United States"] }),
      opportunity({ eligibleCitizenships: ["United States"] })
    );
    expect(result.eligible).toBe(true);
    expect(result.notes).toBeNull();
  });

  test("surfaces an unknown-eligibility note when a citizenship restriction can't be checked", () => {
    const result = computeEligibility(student({ citizenshipCountries: [] }), opportunity({ eligibleCitizenships: ["United States"] }));
    expect(result.eligible).toBe(true);
    expect(result.notes).toMatch(/citizenship/i);
  });

  test("is ineligible when a grade restriction is known to exclude the student", () => {
    const nextYear = new Date().getFullYear() + 1;
    const result = computeEligibility(student({ graduationYear: nextYear }), opportunity({ eligibleGrades: ["9", "10"] }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/grade/i);
  });

  test("surfaces an unknown-eligibility note when a grade restriction can't be checked", () => {
    const result = computeEligibility(student({ graduationYear: null }), opportunity({ eligibleGrades: ["9", "10"] }));
    expect(result.eligible).toBe(true);
    expect(result.notes).toMatch(/grade/i);
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
    expect(result.notes).toMatch(/already applied/i);
  });

  test("is ineligible when the student already marked it not interested", () => {
    const result = computeEligibility(student(), opportunity(), "not_interested");
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/not interested/i);
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
    test("surfaces a not-verified note when eligibleCountries is empty and not research-confirmed open", () => {
      const result = computeEligibility(student(), opportunity());
      expect(result.eligible).toBe(true); // never an exclusion — absence of research is not evidence of a restriction
      expect(result.notes).toMatch(/not verified yet/i);
    });

    test("no note when research confirmed the program open worldwide", () => {
      const result = computeEligibility(student(), opportunity({ countryEligibilityConfirmedOpen: true }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toBeNull();
    });

    test("no note when a populated allow-list already covers the row (researched-restricted case)", () => {
      const result = computeEligibility(student({ country: "Canada" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toBeNull();
    });

    test("no note when a structured citizenship gate already covers the row", () => {
      const result = computeEligibility(
        student({ citizenshipCountries: ["United States"] }),
        opportunity({ eligibleCitizenships: ["United States"] })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toBeNull();
    });

    // Package 8: this used to be a boolean-flag test asserting silence ("the prose is
    // surfaced elsewhere") — that was the defect itself, not a real behavior worth pinning.
    // lib/counselor/eligibility.ts's evaluateOpportunityEligibility already surfaced this
    // same prose; this function silently didn't, so the card and the Advisor disagreed
    // about one row's own text (live-confirmed on Garcia Summer Research Program).
    test("surfaces a note quoting citizenship-restriction prose instead of going silent", () => {
      const result = computeEligibility(
        student(),
        opportunity({ citizenshipRestrictions: "Applicants must be U.S. citizens or U.S. permanent residents." })
      );
      expect(result.eligible).toBe(true); // prose alone is never a hard exclusion, only a structured gate is
      expect(result.notes).toContain("Applicants must be U.S. citizens or U.S. permanent residents.");
    });

    test("surfaces a note quoting residency-restriction prose the same way", () => {
      const result = computeEligibility(student(), opportunity({ residencyRestrictions: "Open only to residents of EU member states." }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toContain("Open only to residents of EU member states.");
    });

    // Wording parity with lib/counselor/eligibility.ts's evaluateOpportunityEligibility is
    // deliberate, not incidental — the two surfaces reading one row's prose differently would
    // be a weaker version of the same disagreement this package fixes.
    test("the prose note matches the counselor's exact wording", () => {
      const prose = "Applicants must be U.S. citizens or U.S. permanent residents.";
      const result = computeEligibility(student(), opportunity({ citizenshipRestrictions: prose }));
      expect(result.notes).toBe(`Citizenship restriction on file (not automatically verified): ${prose}`);
    });

    test("no separate 'not verified yet' note when restriction prose already answers the question", () => {
      const result = computeEligibility(student(), opportunity({ citizenshipRestrictions: "Open only to EU citizens." }));
      expect(result.notes).not.toMatch(/not verified yet/i);
    });

    test("citizenship prose stays quiet when a structured citizenship gate already resolved the row", () => {
      const result = computeEligibility(
        student({ citizenshipCountries: ["United States"] }),
        opportunity({ eligibleCitizenships: ["United States"], citizenshipRestrictions: "Applicants must be U.S. citizens." })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toBeNull();
    });

    test("residency prose stays quiet when a structured country allow-list already resolved the row", () => {
      const result = computeEligibility(
        student({ country: "Canada" }),
        opportunity({ eligibleCountries: ["Canada"], residencyRestrictions: "Open only to North American residents." })
      );
      expect(result.eligible).toBe(true);
      expect(result.notes).toBeNull();
    });

    test("the note stacks with other unknown-notes instead of replacing them", () => {
      const result = computeEligibility(student({ age: null }), opportunity({ minimumAge: 16 }));
      expect(result.eligible).toBe(true);
      expect(result.notes).toMatch(/age requirement/i);
      expect(result.notes).toMatch(/not verified yet/i);
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
