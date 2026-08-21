import { describe, expect, test } from "vitest";
import { resolveAdmissionSystem, reviewsNonAcademicEvidence } from "@/lib/admissions/system-shape";

/**
 * Gate 1 (docs/research/counseling-intelligence/18-geography-conditional-scoring-design-spec.md
 * §2), which did not exist anywhere in the codebase before this module — see
 * docs/research/admissions-systems/implementation-gap/README.md's top-line finding. Every
 * assertion below traces to a specific RULE-ADMISSIONS-* rule or country document; none of
 * them assert a number, because Gate 1 answers a categorical question about a mechanism.
 */
describe("resolveAdmissionSystem — the three shapes the research actually found", () => {
  test("Turkey/YKS is rank-competitive with no evidence review, for any profile", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" });
    expect(result.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(result.shape)).toBe(false);
    expect(result.mechanism).toContain("no application file");
  });

  test("Dutch open programmes are threshold-eligibility, NOT the same shape as Turkey", () => {
    const netherlands = resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" });
    const turkey = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" });
    expect(netherlands.shape).toBe("academic_threshold");
    expect(netherlands.shape).not.toBe(turkey.shape);
    // RULE-ADMISSIONS-001: eligible functionally equals admitted. The implementation-gap
    // audit's Gap 1 is precisely that a binary enum collapses this into Turkey's shape.
    expect(reviewsNonAcademicEvidence(netherlands.shape)).toBe(false);
    expect(netherlands.mechanism).not.toEqual(turkey.mechanism);
  });

  test("the USA is holistic — the one system the 9-dimension taxonomy was built from", () => {
    const result = resolveAdmissionSystem({ targetCountry: "United States", studentCountry: "Turkey" });
    expect(result.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(result.shape)).toBe(true);
  });

  test("an unresearched country resolves to unknown, never to a guessed shape", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Japan", studentCountry: "Turkey" });
    expect(result.shape).toBe("unknown");
    expect(result.basis).toBe("no_entry");
    expect(result.mechanism).toBeNull();
    expect(reviewsNonAcademicEvidence(result.shape)).toBeNull();
  });

  test("reviewsNonAcademicEvidence never collapses unknown into false", () => {
    expect(reviewsNonAcademicEvidence("unknown")).toBeNull();
    expect(reviewsNonAcademicEvidence("academic_threshold")).toBe(false);
  });

  test("every resolved entry carries at least one traceable source document", () => {
    for (const country of ["United States", "United Kingdom", "Turkey", "Germany", "Netherlands", "Italy", "France", "Ireland", "Hong Kong", "Singapore", "Switzerland", "Spain", "Australia", "New Zealand", "Canada"]) {
      const result = resolveAdmissionSystem({ targetCountry: country, studentCountry: "Turkey" });
      expect(result.sources.length, country).toBeGreaterThan(0);
      expect(result.mechanism, country).not.toBeNull();
    }
  });
});

describe("resolveAdmissionSystem — country name forms actually present in the data", () => {
  // Live `universities.country` values include "US" alongside "United States", "Türkiye"
  // alongside "Turkey", and "Hong Kong SAR" alongside "Hong Kong". A registry that only
  // matched the canonical form would silently fall through to "unknown" for real rows.
  test.each([
    ["US", "United States"],
    ["USA", "United States"],
    ["Türkiye", "Turkey"],
    ["Hong Kong SAR", "Hong Kong"],
    ["UK", "United Kingdom"],
  ])("%s resolves identically to %s", (alias, canonical) => {
    const aliased = resolveAdmissionSystem({ targetCountry: alias, studentCountry: "Turkey" });
    const canonicalResult = resolveAdmissionSystem({ targetCountry: canonical, studentCountry: "Turkey" });
    expect(aliased.shape).toBe(canonicalResult.shape);
    expect(aliased.mechanism).toBe(canonicalResult.mechanism);
  });
});

describe("resolveAdmissionSystem — applicant pathway (implementation-gap Gap 2)", () => {
  // RULE-ADMISSIONS-014, the sharpest case in the whole package: Ireland runs two
  // structurally OPPOSITE evidence models in one country. Country-only keying gives both
  // students the same answer, and one of them is wrong.
  test("Ireland flips shape between the CAO route and the non-EU direct route", () => {
    const irish = resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: "Ireland" });
    const turkish = resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: "Turkey" });
    expect(irish.shape).toBe("academic_rank_competitive");
    expect(turkish.shape).toBe("holistic_review");
    expect(irish.pathway).toBe("domestic");
    expect(turkish.pathway).toBe("international");
    expect(irish.basis).toBe("country_pathway");
  });

  test("Ireland's CAO route covers EU/EFTA/UK applicants, not only Irish residents", () => {
    const german = resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: "Germany" });
    expect(german.pathway).toBe("domestic");
    expect(german.shape).toBe("academic_rank_competitive");
  });

  // RULE-ADMISSIONS-013: JUPAS has been categorically closed to non-local applicants since
  // the 2020 cycle — not "available but not decisive", unavailable.
  test("Hong Kong flips shape between JUPAS and non-JUPAS", () => {
    const local = resolveAdmissionSystem({ targetCountry: "Hong Kong", studentCountry: "Hong Kong" });
    const turkish = resolveAdmissionSystem({ targetCountry: "Hong Kong", studentCountry: "Turkey" });
    expect(local.shape).toBe("academic_rank_competitive");
    expect(turkish.shape).toBe("holistic_review");
    expect(turkish.mechanism).toContain("non-JUPAS");
  });

  test("France routes a Turkish applicant to DAP, not Parcoursup", () => {
    const french = resolveAdmissionSystem({ targetCountry: "France", studentCountry: "France" });
    const turkish = resolveAdmissionSystem({ targetCountry: "France", studentCountry: "Turkey" });
    expect(french.shape).toBe("holistic_review");
    expect(french.mechanism).toContain("Parcoursup");
    expect(turkish.shape).toBe("academic_threshold");
    expect(turkish.mechanism).toContain("DAP");
  });

  // RULE-ADMISSIONS-017: Turkey's own split runs by schooling location, and both branches
  // land on the same Gate-1 answer — so the shape survives even when the pathway signal is
  // imperfect, while the mechanism text still differs.
  test("Turkey's two pathways differ in mechanism but agree that evidence is not reviewed", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Türkiye", studentCountry: "Türkiye" });
    const foreign = resolveAdmissionSystem({ targetCountry: "Türkiye", studentCountry: "Germany" });
    expect(domestic.shape).toBe(foreign.shape);
    expect(domestic.mechanism).not.toEqual(foreign.mechanism);
    expect(foreign.mechanism).toContain("foreign-national");
  });

  test("an unknown student country never silently picks a side of a split", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: null });
    expect(result.pathway).toBe("unknown");
    expect(result.pathwayBasis).toBe("undetermined");
    expect(result.basis).toBe("pathway_undetermined");
    // Ireland's two sides disagree, so no shape can be claimed — but both are described.
    expect(result.shape).toBe("unknown");
    expect(result.mechanism).toContain("CAO");
    expect(result.mechanism).toContain("statement of purpose");
  });

  test("an unknown student country still resolves a shape when both pathways agree", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: null });
    expect(result.pathway).toBe("unknown");
    expect(result.shape).toBe("academic_rank_competitive");
  });

  // The UK's two branches are literally the same description, so pathway is irrelevant there
  // and the resolution says so rather than implying it made a determination.
  test("a country with one architecture does not pretend to have resolved a pathway", () => {
    const result = resolveAdmissionSystem({ targetCountry: "United Kingdom", studentCountry: "Turkey" });
    expect(result.pathwayBasis).toBe("not_pathway_split");
    expect(result.basis).toBe("country");
  });

  // The US and Germany reach the same Gate-1 answer either way but word the mechanism
  // differently for an international applicant (uni-assist, Anabin recognition), so they are
  // pathway-sensitive even though the shape never flips.
  test("pathway-sensitive wording without a shape flip is still reported as residence-resolved", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Germany" });
    const international = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" });
    expect(domestic.shape).toBe(international.shape);
    expect(domestic.pathwayBasis).toBe("residence");
    expect(international.mechanism).toContain("uni-assist");
  });
});

describe("resolveAdmissionSystem — field overrides (RULE-ADMISSIONS-019)", () => {
  test("German Medicine is rank-competitive even though Germany generally is threshold-based", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" });
    const medicine = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey", targetField: "medicine" });
    expect(general.shape).toBe("academic_threshold");
    expect(medicine.shape).toBe("academic_rank_competitive");
    expect(medicine.basis).toBe("country_field");
    expect(medicine.mechanism).toContain("hochschulstart");
  });

  test("Dutch Medicine is numerus fixus and does review qualitative evidence", () => {
    const medicine = resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey", targetField: "medicine" });
    expect(medicine.shape).toBe("holistic_review");
    expect(medicine.mechanism).toContain("numerus fixus");
  });

  test("a field with no override falls back to the country default rather than erroring", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" });
    const engineering = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey", targetField: "engineering" });
    expect(engineering.shape).toBe(general.shape);
    expect(engineering.basis).toBe("country_pathway");
    expect(engineering.mechanism).toBe(general.mechanism);
  });
});

describe("resolveAdmissionSystem — institution overrides (implementation-gap Gap 3)", () => {
  // RULE-ADMISSIONS-008's starkest evidence: within Canada alone, U of T's general Arts &
  // Science admission does not consider extracurriculars while UBC's mandatory Personal
  // Profile weighs them heavily. A (country, field) key cannot represent this.
  test("UBC and the University of Toronto resolve to different shapes in the same country", () => {
    const ubc = resolveAdmissionSystem({ targetCountry: "Canada", studentCountry: "Turkey", targetUniversityName: "University of British Columbia" });
    const toronto = resolveAdmissionSystem({ targetCountry: "Canada", studentCountry: "Turkey", targetUniversityName: "University of Toronto" });
    expect(ubc.shape).toBe("holistic_review");
    expect(toronto.shape).toBe("academic_rank_competitive");
    expect(ubc.basis).toBe("institution");
  });

  test("an unlisted Canadian institution is honestly unknown, not defaulted to either neighbour", () => {
    const other = resolveAdmissionSystem({ targetCountry: "Canada", studentCountry: "Turkey", targetUniversityName: "McGill University" });
    expect(other.shape).toBe("unknown");
    expect(other.mechanism).toContain("varies by institution");
  });

  test("institution matching is exact after normalization, so a near-miss name does not borrow another university's mechanism", () => {
    const notUbc = resolveAdmissionSystem({ targetCountry: "Canada", studentCountry: "Turkey", targetUniversityName: "British Columbia Institute of Technology" });
    expect(notUbc.basis).not.toBe("institution");
    expect(notUbc.shape).toBe("unknown");
  });
});

describe("resolveAdmissionSystem — totality", () => {
  test("never throws and always returns a resolution, including for empty input", () => {
    expect(() => resolveAdmissionSystem({ targetCountry: null, studentCountry: null })).not.toThrow();
    const empty = resolveAdmissionSystem({ targetCountry: null, studentCountry: null });
    expect(empty.shape).toBe("unknown");
    expect(empty.sources).toEqual([]);
  });

  test("a whitespace-only country is treated as absent, not matched against the registry", () => {
    expect(resolveAdmissionSystem({ targetCountry: "   ", studentCountry: "Turkey" }).basis).toBe("no_entry");
  });
});
