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
    for (const country of ["United States", "United Kingdom", "Turkey", "Germany", "Netherlands", "Italy", "France", "Ireland", "Hong Kong", "Singapore", "Switzerland", "Spain", "Australia", "New Zealand", "Canada", "Sweden", "Norway", "Portugal", "Greece"]) {
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
