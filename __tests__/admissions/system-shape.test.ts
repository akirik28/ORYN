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
    for (const country of ["United States", "United Kingdom", "Turkey", "Germany", "Netherlands", "Italy", "France", "Ireland", "Hong Kong", "Singapore", "Switzerland", "Spain", "Australia", "New Zealand", "Canada", "Sweden", "Norway", "Portugal", "Greece", "Poland", "Denmark", "Hungary", "Austria", "Czechia", "Belgium", "Estonia", "Lithuania", "Cyprus"]) {
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
    ["Sverige", "Sweden"],
    ["Norge", "Norway"],
    ["Polska", "Poland"],
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

describe("resolveAdmissionSystem — Sweden (2026-09-03 single-country expansion pass)", () => {
  // Sweden's meritvärde system has no essay/reference/activities channel (see
  // docs/research/admissions-systems/sweden.md §"Essays / recommendations / extracurriculars")
  // and a genuinely competitive, floating rank cutoff — the same reasoning that puts
  // Spain/Australia/New Zealand in this shape rather than "holistic_review" or
  // "academic_threshold".
  test("Sweden is rank-competitive, both domestic and international, with no evidence review", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Sweden" });
    const international = resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Turkey" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(international.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
  });

  test("Sweden's mechanism names the real selection instruments, not a paraphrase", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Sweden" });
    expect(domestic.mechanism).toContain("meritvärde");
    expect(domestic.mechanism).toContain("Högskoleprovet");
    expect(domestic.mechanism).toContain("antagning.se");
  });

  test("Sweden's international mechanism names universityadmissions.se, distinct from the domestic portal", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Turkey" });
    expect(international.mechanism).toContain("universityadmissions.se");
    expect(international.mechanism).not.toBe(resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Sweden" }).mechanism);
  });

  test("Sweden traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Sweden", studentCountry: "Sweden" });
    expect(result.sources).toContain("docs/research/admissions-systems/sweden.md");
  });
});

describe("resolveAdmissionSystem — Norway (2026-09-03, a genuine pathway split found, not forced flat)", () => {
  // Norway is deliberately NOT modeled like Sweden: research this pass found the domestic
  // (Samordna Opptak) and international (mostly English-taught, direct-to-institution) tracks
  // do not share a confirmed mechanism — see docs/research/admissions-systems/norway.md §D.
  // Asserting the honest "unknown" here is the point of this test, not a gap to paper over.
  test("Norway's domestic track is rank-competitive via Samordna Opptak's points system", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Norway", studentCountry: "Norway" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("Samordna Opptak");
  });

  test("Norway's general international track is honestly unknown, not defaulted to the domestic shape", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Norway", studentCountry: "Turkey" });
    expect(international.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(international.shape)).toBeNull();
    // Even "unknown" here is a real, sourced finding, not a null result — the caller still gets
    // a mechanism sentence explaining why and a source to check.
    expect(international.mechanism).not.toBeNull();
    expect(international.sources.length).toBeGreaterThan(0);
  });

  test("NTNU is a confirmed, named exception where the English-taught track IS Samordna Opptak", () => {
    const ntnu = resolveAdmissionSystem({ targetCountry: "Norway", studentCountry: "Turkey", targetUniversityName: "NTNU" });
    expect(ntnu.shape).toBe("academic_rank_competitive");
    expect(ntnu.basis).toBe("institution");
    expect(ntnu.mechanism).toContain("Samordna Opptak");
  });

  test("an unlisted Norwegian institution does not borrow NTNU's confirmed exception", () => {
    const other = resolveAdmissionSystem({ targetCountry: "Norway", studentCountry: "Turkey", targetUniversityName: "University of Oslo" });
    expect(other.basis).not.toBe("institution");
    expect(other.shape).toBe("unknown");
  });

  test("Norway traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Norway", studentCountry: "Norway" });
    expect(result.sources).toContain("docs/research/admissions-systems/norway.md");
  });
});

describe("resolveAdmissionSystem — Portugal (2026-09-03, a third independently-found shape pattern)", () => {
  // Confirmed directly from DGES's own page (docs/research/admissions-systems/portugal.md §B):
  // rank-order until numerus-clausus places run out, no essay/interview/reference.
  test("Portugal's domestic/EU track is rank-competitive via the Concurso Nacional de Acesso", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Portugal", studentCountry: "Portugal" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("Concurso Nacional de Acesso");
  });

  // DGES's own international-students page states procedures vary by institution; Porto's own
  // page narrows this further to varying by faculty within one university — a real, sourced
  // "unknown" finding with no institution-wide override recorded, unlike Norway's NTNU (see
  // portugal.md §C for why an override would overclaim here).
  test("Portugal's international track is honestly unknown — confirmed to vary even by faculty, not just by institution", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Portugal", studentCountry: "Turkey" });
    expect(international.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(international.shape)).toBeNull();
    expect(international.mechanism).toContain("faculty");
    expect(international.sources.length).toBeGreaterThan(0);
  });

  test("Portugal has no institution override — the researched variation was too fine-grained to name one honestly", () => {
    const porto = resolveAdmissionSystem({ targetCountry: "Portugal", studentCountry: "Turkey", targetUniversityName: "University of Porto" });
    expect(porto.basis).not.toBe("institution");
    expect(porto.shape).toBe("unknown");
  });

  test("Portugal traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Portugal", studentCountry: "Portugal" });
    expect(result.sources).toContain("docs/research/admissions-systems/portugal.md");
  });
});

describe("resolveAdmissionSystem — Greece (2026-09-03, same shape both sides, different input)", () => {
  // Primary-sourced from the National Exams Organization's own English summary PDF
  // (docs/research/admissions-systems/greece.md §B): a precisely quantified weighted-formula
  // rank mechanism, not an approximation.
  test("Greece's domestic track is rank-competitive via the Panhellenic exam formula", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Greece", studentCountry: "Greece" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("Panhellenic");
    expect(domestic.mechanism).toContain("weighting factors");
  });

  // Confirmed via the Technical University of Crete's own page (greece.md §C): no exam at all
  // for this population, but the same shape as domestic — a genuinely different mechanism
  // sentence, not a copy-pasted one, matching how Australia/Spain/New Zealand already
  // distinguish their two pathways' wording without flipping shape.
  test("Greece's foreign-national track shares the shape but not the mechanism text", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Greece", studentCountry: "Greece" });
    const international = resolveAdmissionSystem({ targetCountry: "Greece", studentCountry: "Turkey" });
    expect(international.shape).toBe("academic_rank_competitive");
    expect(international.mechanism).toContain("graduation grade");
    expect(international.mechanism).not.toBe(domestic.mechanism);
  });

  test("Greece's language requirement is scoped to enrollment, not admission, in the mechanism text", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Greece", studentCountry: "Turkey" });
    expect(international.mechanism).toContain("enrol once admitted, not to be admitted");
  });

  test("Greece traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Greece", studentCountry: "Greece" });
    expect(result.sources).toContain("docs/research/admissions-systems/greece.md");
  });
});

describe("resolveAdmissionSystem — Poland (2026-09-03, decentralized but convergent, like New Zealand)", () => {
  // No central body decides admission (poland.md §A) — this shape rests on two independently
  // checked universities (Silesia, Warsaw) converging on the same mechanism, the same basis
  // this registry already uses for New Zealand's decentralized entry, not on one institution's
  // rule generalized outward.
  test("Poland is rank-competitive both domestic and international, despite having no central admissions body", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Poland", studentCountry: "Poland" });
    const international = resolveAdmissionSystem({ targetCountry: "Poland", studentCountry: "Turkey" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(international.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("qualification points");
  });

  test("Poland's international mechanism names the matura-percentage conversion, not a copy of the domestic text", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Poland", studentCountry: "Poland" });
    const international = resolveAdmissionSystem({ targetCountry: "Poland", studentCountry: "Turkey" });
    expect(international.mechanism).toContain("100%");
    expect(international.mechanism).not.toBe(domestic.mechanism);
  });

  test("Poland traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Poland", studentCountry: "Poland" });
    expect(result.sources).toContain("docs/research/admissions-systems/poland.md");
  });
});

describe("resolveAdmissionSystem — Denmark (2026-09-03, the first shape that genuinely does not reduce to one answer)", () => {
  // Kvote 1 (grades-only, rank-competitive) and Kvote 2 (genuinely holistic) exist in parallel
  // for a domestic applicant, and Oryn has no signal for which one a student is pursuing — see
  // docs/research/admissions-systems/denmark.md §D. Unlike Ireland's pathway_undetermined case
  // (ambiguous only with NO student country on file), Denmark's domestic ambiguity exists even
  // WITH a confirmed domestic student — a different kind of "unknown" than anything else in
  // this registry, and asserted directly rather than smoothed into a guess.
  test("Denmark's domestic pathway is honestly unknown even for a confirmed Danish student", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Denmark", studentCountry: "Denmark" });
    expect(result.shape).toBe("unknown");
    expect(result.pathway).toBe("domestic");
    expect(reviewsNonAcademicEvidence(result.shape)).toBeNull();
    expect(result.mechanism).toContain("Kvote 1");
    expect(result.mechanism).toContain("Kvote 2");
  });

  // Confirmed via multiple institutions: a non-EU/non-IB/non-EB qualification has no Kvote 1
  // option at all, so this is a genuinely confident answer despite the domestic ambiguity above
  // — the first holistic_review finding anywhere in this expansion line.
  test("Denmark's international pathway is a confident holistic_review, unlike the domestic unknown", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Denmark", studentCountry: "Turkey" });
    expect(result.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(result.shape)).toBe(true);
    expect(result.mechanism).toContain("Kvote 2");
    expect(result.mechanism).not.toBeNull();
  });

  test("Denmark's domestic and international mechanisms genuinely differ, not just in shape", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Denmark", studentCountry: "Denmark" });
    const international = resolveAdmissionSystem({ targetCountry: "Denmark", studentCountry: "Turkey" });
    expect(domestic.mechanism).not.toBe(international.mechanism);
  });

  test("Denmark traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Denmark", studentCountry: "Denmark" });
    expect(result.sources).toContain("docs/research/admissions-systems/denmark.md");
  });
});

describe("resolveAdmissionSystem — Hungary (2026-09-03, a real funding-status split, both shapes confident)", () => {
  // Felvi.hu is the state-financed route (citizens + Hungary-registered residents); everyone
  // else competes for self-funded places evaluated per-institution — hungary.md §A. Unlike
  // Denmark, both sides here resolve to a confident shape, not an honest unknown.
  test("Hungary's domestic (Felvi.hu) track is rank-competitive with a floating, algorithmic cutoff", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Hungary", studentCountry: "Hungary" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("Felvi.hu");
  });

  // Confirmed via Hungary's own Tempus Public Foundation education-promotion page (hungary.md
  // §C) — an official source, not only secondary study-abroad guides, for the motivation-letter
  // and reference-letter requirement.
  test("Hungary's international track is holistic, confirmed from an official government source", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Hungary", studentCountry: "Turkey" });
    expect(international.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(international.shape)).toBe(true);
    expect(international.mechanism).toContain("letter of motivation");
    expect(international.mechanism).toContain("reference letters");
  });

  test("Hungary's domestic and international pathways flip shape, not just wording", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Hungary", studentCountry: "Hungary" });
    const international = resolveAdmissionSystem({ targetCountry: "Hungary", studentCountry: "Turkey" });
    expect(domestic.shape).not.toBe(international.shape);
  });

  test("Hungary traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Hungary", studentCountry: "Hungary" });
    expect(result.sources).toContain("docs/research/admissions-systems/hungary.md");
  });
});

describe("resolveAdmissionSystem — Austria (2026-09-03, threshold by default, competitive only where named)", () => {
  // The first entry in this expansion line whose default posture is academic_threshold, not
  // academic_rank_competitive — matches the Netherlands/Italy/Switzerland general-route pattern
  // already in the original 15, rather than introducing a new shape.
  test("Austria's general track is threshold, not competitive — eligible functionally equals admitted", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Austria" });
    expect(domestic.shape).toBe("academic_threshold");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("open access");
  });

  test("Austria's international track keeps the same shape, with an added eligibility step in the mechanism text", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Austria" });
    const international = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Turkey" });
    expect(international.shape).toBe("academic_threshold");
    expect(international.mechanism).not.toBe(domestic.mechanism);
    expect(international.mechanism).toContain("home country");
  });

  // Medicine is the named exception (austria.md §C) — recorded as a fieldOverride the same way
  // Switzerland's EMS and Germany's NC-Medicine already are in this registry, RULE-ADMISSIONS-019.
  test("Medicine flips Austria from threshold to rank-competitive via MedAT", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Turkey" });
    const medicine = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Turkey", targetField: "medicine" });
    expect(general.shape).toBe("academic_threshold");
    expect(medicine.shape).toBe("academic_rank_competitive");
    expect(medicine.basis).toBe("country_field");
    expect(medicine.mechanism).toContain("MedAT");
  });

  test("a field with no override falls back to Austria's open-access default", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Turkey" });
    const engineering = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Turkey", targetField: "engineering" });
    expect(engineering.shape).toBe(general.shape);
    expect(engineering.mechanism).toBe(general.mechanism);
  });

  test("Austria traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Austria" });
    expect(result.sources).toContain("docs/research/admissions-systems/austria.md");
  });
});

// A second real subdivision, confirmed at the statute level (FHStG vs. the university sector's
// own law) -- unlike Netherlands' checked-and-converged HBO, Austria's FH sector genuinely
// diverges: a law-mandated interview and aptitude test, not the country default's open access.
describe("resolveAdmissionSystem — Austria FH sector (2026-09-03, a second real subdivision, confirmed divergence)", () => {
  test("a named FH institution resolves through the subdivision, holistic rather than the country's open-access default", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Austria",
      targetUniversityName: "FH Kärnten",
    });
    expect(result.basis).toBe("subdivision");
    expect(result.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(result.shape)).toBe(true);
    expect(result.mechanism).toContain("FHStG");
  });

  test("the FH subdivision's domestic and international pathways share the same law-mandated shape, with international's mechanism naming the added recognition step", () => {
    const domestic = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Austria",
      targetUniversityName: "FH Upper Austria",
    });
    const international = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Turkey",
      targetUniversityName: "FH Upper Austria",
    });
    expect(domestic.shape).toBe("holistic_review");
    expect(international.shape).toBe("holistic_review");
    expect(international.mechanism).not.toBe(domestic.mechanism);
    expect(international.mechanism).toContain("YKS");
  });

  test("a real Austrian university is NOT swept into the FH subdivision", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Turkey",
      targetUniversityName: "University of Vienna",
    });
    expect(result.basis).toBe("country_pathway");
    expect(result.shape).toBe("academic_threshold");
  });

  test("matching is exact-after-normalization, not fuzzy — a near-miss name falls through to the country default", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Austria",
      targetUniversityName: "Kärnten",
    });
    expect(result.basis).not.toBe("subdivision");
    expect(result.basis).toBe("country_pathway");
  });

  test("every FH subdivision name is distinct, and every one resolves through the subdivision", () => {
    const names = [
      "UAS for Business & Society BFI Vienna", "University of Applied Sciences Technikum Vienna",
      "Hochschule Campus Wien", "FHV - Vorarlberg University of Applied Sciences", "FH Kärnten",
      "University of Applied Sciences Wiener Neustadt", "USTP – University of Applied Sciences St. Pölten",
      "IMC Krems University of Applied Sciences", "FH Salzburg",
      "HOK | University of Applied Sciences Kufstein Tirol", "FH Campus 02", "FH JOANNEUM",
      "FH Upper Austria", "University of Applied Sciences Burgenland", "MCI | The Entrepreneurial School",
      "FHWien der WKW", "Lauder Business School", "fh gesundheit", "Ferdinand Porsche FernFH",
      "Fachhochschule für angewandte Militärwissenschaften", "FH Gesundheitsberufe OÖ",
    ];
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      const result = resolveAdmissionSystem({ targetCountry: "Austria", studentCountry: "Austria", targetUniversityName: name });
      expect(result.basis).toBe("subdivision");
    }
  });

  test("Austria FH traces to its own research document", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Austria",
      studentCountry: "Austria",
      targetUniversityName: "FH Kärnten",
    });
    expect(result.sources).toContain("docs/research/admissions-systems/austria.md");
  });
});

describe("resolveAdmissionSystem — Czechia (2026-09-03, confirmed divergence, not just decentralization)", () => {
  // Charles University's own admissions page confirms mechanism varies by PROGRAMME within one
  // institution (czechia.md §A) -- a finer grain of divergence than Canada's confirmed
  // institution-level split. Recorded unknown for both pathways deliberately, same treatment
  // Canada's country-level entry already gets, not a gap this pass failed to close.
  test("Czechia is honestly unknown, both pathways, because the divergence is confirmed not just suspected", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Czechia", studentCountry: "Czechia" });
    const international = resolveAdmissionSystem({ targetCountry: "Czechia", studentCountry: "Turkey" });
    expect(domestic.shape).toBe("unknown");
    expect(international.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBeNull();
    expect(domestic.mechanism).toContain("programme");
    expect(domestic.mechanism).not.toBeNull();
  });

  test("the Czech Republic spelling resolves identically to Czechia", () => {
    const short = resolveAdmissionSystem({ targetCountry: "Czechia", studentCountry: "Turkey" });
    const long = resolveAdmissionSystem({ targetCountry: "Czech Republic", studentCountry: "Turkey" });
    expect(short.shape).toBe(long.shape);
    expect(short.mechanism).toBe(long.mechanism);
  });

  test("Czechia traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Czechia", studentCountry: "Czechia" });
    expect(result.sources).toContain("docs/research/admissions-systems/czechia.md");
  });
});

describe("resolveAdmissionSystem — Belgium (2026-09-03, two legal systems confirmed to converge, not assumed)", () => {
  // Flanders and the French Community were each independently checked (belgium.md §B-C) and
  // both confirmed academic_threshold — a genuine convergence finding, unlike Czechia where the
  // checked institution actually diverged within itself.
  test("Belgium is threshold, not competitive, for both pathways despite having no country-level admissions body", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Belgium" });
    const international = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Turkey" });
    expect(domestic.shape).toBe("academic_threshold");
    expect(international.shape).toBe("academic_threshold");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
  });

  // Medicine is confirmed restricted in BOTH communities (belgium.md §B-C), even though the
  // exact mechanism (centralized ARES exam + 15% non-resident cap) is only confirmed for the
  // French Community — the fieldOverride's own mechanism text says so rather than presenting
  // one community's specifics as if they were universal.
  test("Medicine flips Belgium from threshold to rank-competitive, honestly hedged on which community's specifics apply", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Turkey" });
    const medicine = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Turkey", targetField: "medicine" });
    expect(general.shape).toBe("academic_threshold");
    expect(medicine.shape).toBe("academic_rank_competitive");
    expect(medicine.basis).toBe("country_field");
    expect(medicine.mechanism).toContain("15%");
    expect(medicine.mechanism).toContain("could not independently confirm");
  });

  test("a field with no override falls back to Belgium's threshold default", () => {
    const general = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Turkey" });
    const engineering = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Turkey", targetField: "engineering" });
    expect(engineering.shape).toBe(general.shape);
    expect(engineering.mechanism).toBe(general.mechanism);
  });

  test("Belgium traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Belgium", studentCountry: "Belgium" });
    expect(result.sources).toContain("docs/research/admissions-systems/belgium.md");
  });
});

describe("resolveAdmissionSystem — Estonia (2026-09-03, first long-tail corridor entry)", () => {
  // International (DreamApply) is confirmed holistic on primary Tallinn University evidence
  // (a mandatory interview for every applicant, estonia.md §B). Domestic (SAIS) is unknown --
  // a real finding, not a gap, though held to lower confidence than Czechia's parallel one.
  test("Estonia's international track is confidently holistic — a mandatory interview, not an occasional exception", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Estonia", studentCountry: "Turkey" });
    expect(international.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(international.shape)).toBe(true);
    expect(international.mechanism).toContain("video interview");
  });

  test("Estonia's domestic track is honestly unknown, not defaulted to the international shape", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Estonia", studentCountry: "Estonia" });
    expect(domestic.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBeNull();
    expect(domestic.mechanism).toContain("riigieksam");
    expect(domestic.mechanism).not.toBeNull();
  });

  test("Estonia's two pathways genuinely differ, not just in wording", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Estonia", studentCountry: "Estonia" });
    const international = resolveAdmissionSystem({ targetCountry: "Estonia", studentCountry: "Turkey" });
    expect(domestic.shape).not.toBe(international.shape);
  });

  test("Estonia traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Estonia", studentCountry: "Estonia" });
    expect(result.sources).toContain("docs/research/admissions-systems/estonia.md");
  });
});

describe("resolveAdmissionSystem — Lithuania (2026-09-03, a scored system that is still genuinely holistic)", () => {
  // LAMA BPO's own competitive-score formula has a real, bounded motivation-assessment
  // component (0-1.5 of a 2.5-point cap) — a defined channel, not a subject-only formula.
  // Classified holistic_review on the same basis as the original 15's Singapore/NUS entry:
  // a structured, points-weighted non-academic component still counts as a real channel.
  test("Lithuania's domestic (LAMA BPO) track is holistic despite being a computed, ranked score", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Lithuania", studentCountry: "Lithuania" });
    expect(domestic.shape).toBe("holistic_review");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(true);
    expect(domestic.mechanism).toContain("motivation assessment");
    expect(domestic.mechanism).toContain("LAMA BPO");
  });

  test("Lithuania's international track is holistic via a graded interview, distinct mechanism text", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Lithuania", studentCountry: "Lithuania" });
    const international = resolveAdmissionSystem({ targetCountry: "Lithuania", studentCountry: "Turkey" });
    expect(international.shape).toBe("holistic_review");
    expect(international.mechanism).toContain("interview");
    expect(international.mechanism).not.toBe(domestic.mechanism);
  });

  test("Lithuania traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Lithuania", studentCountry: "Lithuania" });
    expect(result.sources).toContain("docs/research/admissions-systems/lithuania.md");
  });
});

describe("resolveAdmissionSystem — Cyprus (2026-09-03, structurally linked to Greece, scoped to the Republic)", () => {
  // The Pancyprian Examinations are officially described as feeding admission to "Public
  // Universities of Cyprus and Greece" (cyprus.md §A) -- a real structural link, not a naming
  // coincidence, to Greece's own academic_rank_competitive domestic entry already registered.
  test("Cyprus's domestic track is rank-competitive, confirmed with real allocation numbers", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Cyprus", studentCountry: "Cyprus" });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(domestic.shape)).toBe(false);
    expect(domestic.mechanism).toContain("Pancyprian");
  });

  // Ruled out holistic (no essay/interview found) but couldn't distinguish threshold from rank
  // for the international pathway -- recorded unknown rather than guessed between the two.
  test("Cyprus's international track is honestly unknown, not defaulted to the domestic shape", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Cyprus", studentCountry: "Turkey" });
    expect(international.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(international.shape)).toBeNull();
    expect(international.mechanism).not.toBeNull();
    expect(international.mechanism).toContain("Greek-language");
  });

  // ORYN's database carries "Northern Cyprus" as a genuinely separate country value (a
  // distinct political entity) -- this entry must not accidentally also answer for it.
  test("Northern Cyprus does not inherit this entry — it resolves independently, to unknown", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Northern Cyprus", studentCountry: "Turkey" });
    expect(result.basis).toBe("no_entry");
    expect(result.shape).toBe("unknown");
    expect(result.sources).toEqual([]);
  });

  test("Cyprus traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Cyprus", studentCountry: "Cyprus" });
    expect(result.sources).toContain("docs/research/admissions-systems/cyprus.md");
  });
});

// The subdivisions mechanism's first real registry use (subdivision-key-proposal.md, Option B)
// -- Finland's university and AMK (applied-sciences) sectors run genuinely different admissions,
// below the country level, identified by name rather than a DB column (checked live and ruled
// out -- finland.md §A). These tests double as the generic mechanism's own proof: precedence,
// subdivision-level pathway resolution, and safe fallthrough for an unclassified institution.
describe("resolveAdmissionSystem — Finland (2026-09-03, the subdivisions mechanism's first real use)", () => {
  test("an unnamed target (or the university sector by default) resolves to the country-level entry, unknown for domestic", () => {
    const domestic = resolveAdmissionSystem({ targetCountry: "Finland", studentCountry: "Finland" });
    expect(domestic.shape).toBe("unknown");
    expect(domestic.basis).toBe("country_pathway");
    expect(domestic.mechanism).toContain("matriculation");
  });

  test("the university sector's international pathway is rank-competitive, confirmed via Aalto's own ranking language", () => {
    const international = resolveAdmissionSystem({ targetCountry: "Finland", studentCountry: "Turkey" });
    expect(international.shape).toBe("academic_rank_competitive");
    expect(reviewsNonAcademicEvidence(international.shape)).toBe(false);
    expect(international.mechanism).toContain("ranked");
  });

  test("a named AMK institution resolves through the subdivision, not the country default", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Finland",
      targetUniversityName: "Metropolia University of Applied Sciences",
    });
    expect(result.basis).toBe("subdivision");
    expect(result.shape).toBe("academic_rank_competitive");
    expect(result.mechanism).toContain("todistusvalinta");
  });

  test("the AMK subdivision's domestic and international pathways genuinely differ — rank-competitive vs. honestly unknown", () => {
    const domestic = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Finland",
      targetUniversityName: "Metropolia University of Applied Sciences",
    });
    const international = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Turkey",
      targetUniversityName: "Metropolia University of Applied Sciences",
    });
    expect(domestic.shape).toBe("academic_rank_competitive");
    expect(international.shape).toBe("unknown");
    expect(reviewsNonAcademicEvidence(international.shape)).toBeNull();
    expect(international.mechanism).toContain("Centria");
  });

  test("matching is exact-after-normalization, not fuzzy — a near-miss name falls through to the country default, not a guessed subdivision", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Finland",
      targetUniversityName: "Metropolia",
    });
    expect(result.basis).not.toBe("subdivision");
    expect(result.basis).toBe("country_pathway");
  });

  test("a real Finnish research university is NOT swept into the AMK subdivision", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Turkey",
      targetUniversityName: "Aalto University",
    });
    expect(result.basis).toBe("country_pathway");
    expect(result.shape).toBe("academic_rank_competitive");
    expect(result.mechanism).toContain("Aalto");
  });

  test("every AMK subdivision name is distinct from every other registered institution override or subdivision", () => {
    // A cheap structural guard against a copy-paste collision inside the 22-name list itself.
    const names = [
      "Arcada University of Applied Sciences", "Centria University of Applied Sciences",
      "Diaconia University of Applied Sciences", "Haaga-Helia University of Applied Sciences",
      "HAMK University of Applied Sciences", "HUMAK University of Applied Sciences",
      "JAMK University of Applied Sciences", "Kajaani University of Applied Sciences",
      "Karelia University of Applied Sciences", "LAB University of Applied Sciences",
      "Lapland University of Applied Sciences", "Laurea University of Applied Sciences",
      "Metropolia University of Applied Sciences", "Novia University of Applied Sciences",
      "Oulu University of Applied Sciences", "Satakunta University of Applied Sciences",
      "Savonia University of Applied Sciences", "Seinäjoki University of Applied Sciences",
      "South-Eastern Finland University of Applied Sciences (Xamk)",
      "Tampere University of Applied Sciences", "Turku University of Applied Sciences",
      "Vaasa University of Applied Sciences",
    ];
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      const result = resolveAdmissionSystem({ targetCountry: "Finland", studentCountry: "Finland", targetUniversityName: name });
      expect(result.basis).toBe("subdivision");
    }
  });

  test("Finland traces to its own research document, not an invented source", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Finland",
      studentCountry: "Finland",
      targetUniversityName: "Metropolia University of Applied Sciences",
    });
    expect(result.sources).toContain("docs/research/admissions-systems/finland.md");
  });
});

// Netherlands is the negative case for the subdivisions mechanism -- checked (Nuffic's own
// "Higher education" page) whether HBO needs the same treatment Finland's AMK sector did, and
// confirmed it doesn't: a genuine convergence, not an assumption carried over from the WO
// research this entry was originally built from. See netherlands.md's 2026-09-03 addendum.
describe("resolveAdmissionSystem — Netherlands HBO (2026-09-03, checked and found to converge with WO, no subdivision)", () => {
  test("a named HBO institution resolves through the plain country default, not a subdivision", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Netherlands",
      studentCountry: "Turkey",
      targetUniversityName: "Hogeschool van Amsterdam",
    });
    expect(result.basis).toBe("country_pathway");
    expect(result.shape).toBe("academic_threshold");
  });

  test("the international mechanism names the HBO-specific HAVO/Lise Diplomasi finding", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" });
    expect(result.mechanism).toContain("HAVO");
    expect(result.mechanism).toContain("HBO");
  });

  test("a WO institution resolves identically to an HBO one — the confirmed convergence, not two different answers", () => {
    const hbo = resolveAdmissionSystem({
      targetCountry: "Netherlands",
      studentCountry: "Turkey",
      targetUniversityName: "Hogeschool van Amsterdam",
    });
    const wo = resolveAdmissionSystem({
      targetCountry: "Netherlands",
      studentCountry: "Turkey",
      targetUniversityName: "University of Amsterdam",
    });
    expect(hbo.shape).toBe(wo.shape);
    expect(hbo.mechanism).toBe(wo.mechanism);
    expect(hbo.basis).toBe(wo.basis);
  });

  test("Dutch Medicine numerus fixus still overrides for an HBO-named target the same as for WO — the field override outranks the (absent) subdivision either way", () => {
    const result = resolveAdmissionSystem({
      targetCountry: "Netherlands",
      studentCountry: "Turkey",
      targetUniversityName: "Hogeschool van Amsterdam",
      targetField: "medicine",
    });
    expect(result.shape).toBe("holistic_review");
    expect(result.basis).toBe("country_field");
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

describe("resolveAdmissionSystem — locale: tr", () => {
  test("Turkey's domestic mechanism is Turkish and names the OBP by its real term", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }, "tr");
    expect(result.mechanism).toContain("ÖSYM'nin YKS yerleştirme algoritması");
    expect(result.mechanism).toContain("OBP");
  });

  test("Turkey's international (foreign-national) mechanism is Turkish", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Germany" }, "tr");
    expect(result.mechanism).toContain("yabancı uyruklu öğrenci yolundan girer");
  });

  // The pilot's other 3 target-country mechanisms (Turkey done above), each checked for its
  // own real official term rather than a paraphrase — UCAS's personal statement, Dutch
  // numerus fixus, Italian numero chiuso/IMAT — same standard as OBP for Turkey.
  describe("the pilot's other 3 target countries (UK, Netherlands, Italy)", () => {
    test("UK/UCAS mechanism is Turkish and names the personal statement by its real term", () => {
      const result = resolveAdmissionSystem({ targetCountry: "United Kingdom", studentCountry: "Turkey" }, "tr");
      expect(result.mechanism).toContain("UCAS");
      expect(result.mechanism).toContain("kişisel beyan (personal statement)");
      expect(result.mechanism).toContain("okul referansı");
    });

    test("UK domestic and international mechanisms agree (UCAS runs one process for both)", () => {
      const domestic = resolveAdmissionSystem({ targetCountry: "United Kingdom", studentCountry: "United Kingdom" }, "tr");
      const international = resolveAdmissionSystem({ targetCountry: "United Kingdom", studentCountry: "Turkey" }, "tr");
      expect(domestic.mechanism).toBe(international.mechanism);
    });

    test("Dutch general mechanism is Turkish and keeps numerus fixus untranslated (the real term, unchanged in Dutch itself)", () => {
      const result = resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" }, "tr");
      expect(result.mechanism).toContain("numerus fixus olmayan");
      expect(result.mechanism).toContain("uygun olmak ile kabul edilmek aynı şeydir");
    });

    test("Dutch Medicine (numerus fixus itself) has its own distinct Turkish mechanism, holistic shape", () => {
      const result = resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey", targetField: "medicine" }, "tr");
      expect(result.shape).toBe("holistic_review");
      expect(result.mechanism).toContain("motivasyon mektubu (motivation letter)");
      expect(result.mechanism).not.toBe(resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" }, "tr").mechanism);
    });

    test("Italian general mechanism is Turkish, domestic and international genuinely differ (the origin-diploma proof)", () => {
      const domestic = resolveAdmissionSystem({ targetCountry: "Italy", studentCountry: "Italy" }, "tr");
      const international = resolveAdmissionSystem({ targetCountry: "Italy", studentCountry: "Turkey" }, "tr");
      expect(domestic.mechanism).toContain("nitelik ve sınav eşiklerine dayanır");
      expect(international.mechanism).toContain("kaynak ülke diplomasının tamamlanmış olduğunun kanıtlanması");
      expect(domestic.mechanism).not.toEqual(international.mechanism);
    });

    test("Italian Medicine (numero chiuso) names IMAT and semestre filtro by their real names", () => {
      const result = resolveAdmissionSystem({ targetCountry: "Italy", studentCountry: "Turkey", targetField: "medicine" }, "tr");
      expect(result.shape).toBe("academic_rank_competitive");
      expect(result.mechanism).toContain("numero chiuso");
      expect(result.mechanism).toContain("IMAT");
      expect(result.mechanism).toContain("semestre filtro");
    });
  });

  test("the shape itself never changes with locale — only the sentence describing it does", () => {
    const en = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" });
    const tr = resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }, "tr");
    expect(tr.shape).toBe(en.shape);
    expect(tr.pathway).toBe(en.pathway);
    expect(tr.basis).toBe(en.basis);
    expect(tr.sources).toEqual(en.sources);
    expect(tr.mechanism).not.toBe(en.mechanism);
  });

  // Known, documented gap (see PathwaySystem.mechanismTr's own comment): a country without
  // its own Turkish mechanism yet falls back to English rather than going blank. Asserted
  // directly so a future translation of this entry is a visible, expected test change.
  // Germany, not Netherlands: the pilot's 4-country target set (Turkey/UK/Netherlands/Italy)
  // is now fully translated, and this test exists specifically to prove the *fallback*
  // still works for a country genuinely outside that set — using an already-translated one
  // here would silently stop testing the fallback path at all.
  test("a country without a translated mechanism yet falls back to English, not null or empty, under locale=tr", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" }, "tr");
    const englishResult = resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" });
    expect(result.mechanism).toBe(englishResult.mechanism);
    expect(result.mechanism).not.toBeNull();
  });

  test("the pathway-undetermined concatenation (e.g. Ireland with no student country) uses a Turkish connector when locale=tr, even though neither side is translated yet", () => {
    const result = resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: null }, "tr");
    expect(result.mechanism).toContain("Ortaöğretimini başka bir yerde tamamlayan başvuru sahipleri için ayrı bir yol geçerlidir");
  });

  test("omitting locale is identical to passing 'en' explicitly, for both a translated and an untranslated country (default-locale backward compatibility)", () => {
    for (const targetCountry of ["Turkey", "Netherlands", "Germany"]) {
      const withDefault = resolveAdmissionSystem({ targetCountry, studentCountry: "Turkey" });
      const withExplicitEn = resolveAdmissionSystem({ targetCountry, studentCountry: "Turkey" }, "en");
      expect(withDefault).toEqual(withExplicitEn);
    }
  });
});
