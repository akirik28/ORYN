import { describe, expect, test } from "vitest";
import { computeAdmissionOutlook, dataConfidenceForCompleteness, outlookLabel } from "@/lib/admissions/outlook";
import { checkUndergraduateFieldAvailability } from "@/lib/admissions/field-availability";
import { resolveAdmissionSystem } from "@/lib/admissions/system-shape";

describe("dataConfidenceForCompleteness", () => {
  // Fresh-install audit, 2026-09-01: this was a two-way ternary with no "low" branch —
  // `completeness_percent >= 60 ? "high" : "medium"` — so a genuinely empty profile
  // (0% complete) earned the identical "medium" as one at 59%. The gate in
  // lib/admissions/persist.ts now stops a zero-signal profile from reaching this function
  // at all, but a real, low-but-nonzero profile still needs an honest third band.
  test("below the low threshold is low, not medium", () => {
    expect(dataConfidenceForCompleteness(10)).toBe("low");
  });

  test("at the low/medium boundary is medium", () => {
    expect(dataConfidenceForCompleteness(30)).toBe("medium");
  });

  test("just below the high threshold is medium, not high", () => {
    expect(dataConfidenceForCompleteness(59)).toBe("medium");
  });

  test("at the high threshold is high", () => {
    expect(dataConfidenceForCompleteness(60)).toBe("high");
  });

  test("a fully complete profile is high", () => {
    expect(dataConfidenceForCompleteness(100)).toBe("high");
  });

  test("zero is low, not medium — the exact case that used to be misclassified", () => {
    expect(dataConfidenceForCompleteness(0)).toBe("low");
  });
});

describe("computeAdmissionOutlook", () => {
  test("classifies a strong profile against a non-selective school as likely", () => {
    const result = computeAdmissionOutlook({ profileStrength: 80, admissionRate: 0.8, dataConfidence: "high" });
    expect(result.outlook).toBe("likely");
  });

  test("classifies a strong profile against an extremely selective school as at best a reach", () => {
    const result = computeAdmissionOutlook({ profileStrength: 80, admissionRate: 0.04, dataConfidence: "high" });
    expect(["reach", "extreme_reach"]).toContain(result.outlook);
  });

  test("classifies a weak profile against an extremely selective school as extreme reach", () => {
    const result = computeAdmissionOutlook({ profileStrength: 35, admissionRate: 0.04, dataConfidence: "high" });
    expect(result.outlook).toBe("extreme_reach");
  });

  test("never returns a numeric estimate range when admission rate data is unavailable", () => {
    const result = computeAdmissionOutlook({ profileStrength: 70, admissionRate: null, dataConfidence: "low" });
    expect(result.estimateRangeLow).toBeNull();
    expect(result.estimateRangeHigh).toBeNull();
  });

  test("estimate range, when present, is always whole-number percentages and never a single-point value", () => {
    const result = computeAdmissionOutlook({ profileStrength: 60, admissionRate: 0.3, dataConfidence: "high" });
    expect(result.estimateRangeLow).not.toBeNull();
    expect(Number.isInteger(result.estimateRangeLow)).toBe(true);
    expect(Number.isInteger(result.estimateRangeHigh)).toBe(true);
    expect(result.estimateRangeHigh!).toBeGreaterThan(result.estimateRangeLow!);
  });

  test("estimate confidence is never high — this is always an approximation", () => {
    const result = computeAdmissionOutlook({ profileStrength: 60, admissionRate: 0.3, dataConfidence: "high" });
    expect(result.estimateConfidence).not.toBe("high");
  });

  test("a higher profile strength never produces a worse (more reach-y) outlook than a lower one against the same school", () => {
    const weaker = computeAdmissionOutlook({ profileStrength: 40, admissionRate: 0.3, dataConfidence: "high" });
    const stronger = computeAdmissionOutlook({ profileStrength: 90, admissionRate: 0.3, dataConfidence: "high" });
    const order: Record<string, number> = { extreme_reach: 0, reach: 1, competitive: 2, strong: 3, likely: 4 };
    expect(order[stronger.outlook]).toBeGreaterThanOrEqual(order[weaker.outlook]);
  });

  // Regression: counselor-loop QA defect #1 (docs/handoffs/counselor-loop-qa-report.md) — a
  // 92/100-GPA Turkey/YKS-track persona got `extreme_reach` against every selectivity tier,
  // because this function had no way to know the target doesn't review non-academic evidence
  // at all. Fails before this fix existed (admissionSystemType didn't exist, no way to signal
  // this) and passes after.
  describe("admissionSystemType: credential_gate (geography-conditional fix)", () => {
    test("omitting admissionSystemType is byte-identical to the pre-fix behavior", () => {
      const withoutField = computeAdmissionOutlook({ profileStrength: 60, admissionRate: 0.3, dataConfidence: "high" });
      const explicitHolistic = computeAdmissionOutlook({ profileStrength: 60, admissionRate: 0.3, dataConfidence: "high", admissionSystemType: "holistic" });
      expect(withoutField).toEqual(explicitHolistic);
    });

    test("flags a non-null notApplicableReason only for credential_gate targets", () => {
      const holistic = computeAdmissionOutlook({ profileStrength: 53, admissionRate: null, dataConfidence: "medium" });
      const credentialGate = computeAdmissionOutlook({ profileStrength: 53, admissionRate: null, dataConfidence: "medium", admissionSystemType: "credential_gate" });
      expect(holistic.notApplicableReason).toBeNull();
      expect(credentialGate.notApplicableReason).not.toBeNull();
    });

    // The one part of this result the shipped non-negotiables most directly prohibit for a
    // system this formula doesn't model (AGENTS.md #5: "never presented with false precision")
    // — this must never leak through even when an admission rate happens to be on file.
    test("never returns a numeric estimate range for a credential_gate target, even with a known admission rate", () => {
      const result = computeAdmissionOutlook({ profileStrength: 80, admissionRate: 0.3, dataConfidence: "high", admissionSystemType: "credential_gate" });
      expect(result.estimateRangeLow).toBeNull();
      expect(result.estimateRangeHigh).toBeNull();
      expect(result.estimateConfidence).toBeNull();
    });

    test("still returns a numeric compositeScore for credential_gate (a real, if not admissions-relevant, profile-strength-vs-selectivity read a caller may persist/display)", () => {
      const result = computeAdmissionOutlook({ profileStrength: 92, admissionRate: 0.2, dataConfidence: "high", admissionSystemType: "credential_gate" });
      expect(typeof result.compositeScore).toBe("number");
    });

    // Regression: migration 0049 added outlook_label's not_applicable member specifically so
    // this never contradicts notApplicableReason again (previously outlook still claimed a
    // confident reach/likely-style classification here — see the QA report's original
    // reproduction). A 92/100-GPA Turkey/YKS persona must get this exact label, not "any of
    // the 5" holistic labels.
    test("outlook is exactly 'not_applicable' for every credential_gate input, regardless of profile strength or selectivity", () => {
      for (const profileStrength of [1, 40, 60, 92, 100]) {
        for (const admissionRate of [null, 0.05, 0.3, 0.9]) {
          const result = computeAdmissionOutlook({ profileStrength, admissionRate, dataConfidence: "high", admissionSystemType: "credential_gate" });
          expect(result.outlook).toBe("not_applicable");
        }
      }
    });

    test("outlook is never 'not_applicable' for a holistic (or omitted) admissionSystemType", () => {
      const result = computeAdmissionOutlook({ profileStrength: 5, admissionRate: 0.02, dataConfidence: "low" });
      expect(result.outlook).not.toBe("not_applicable");
    });

    test("the deprecated flag still works but cannot say which non-holistic mechanism applies", () => {
      const result = computeAdmissionOutlook({ profileStrength: 60, admissionRate: 0.3, dataConfidence: "high", admissionSystemType: "credential_gate" });
      expect(result.notApplicableKind).toBe("credential_gate_unspecified");
      expect(result.admissionSystemShape).toBeNull();
    });
  });

  /**
   * The defect docs/research/admissions-systems/implementation-gap/README.md ranked first:
   * `admissionSystemType` shipped and was unit-tested, but no production caller ever passed
   * it, so this function's credential-gate branch had zero live effect. These exercise the
   * resolved Gate-1 input that both callers now supply.
   */
  describe("admissionSystem: resolved Gate 1 (the wiring the audit found missing)", () => {
    const base = { profileStrength: 72, admissionRate: 0.3, dataConfidence: "high" } as const;

    test("a holistic target leaves every field identical to omitting Gate 1 entirely", () => {
      const withoutGate = computeAdmissionOutlook({ ...base });
      const withGate = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "United States", studentCountry: "Turkey" }),
      });
      expect(withGate.outlook).toBe(withoutGate.outlook);
      expect(withGate.estimateRangeLow).toBe(withoutGate.estimateRangeLow);
      expect(withGate.estimateRangeHigh).toBe(withoutGate.estimateRangeHigh);
      expect(withGate.notApplicableReason).toBeNull();
    });

    test("an unresearched country changes nothing — Oryn never acts on a guessed mechanism", () => {
      const withoutGate = computeAdmissionOutlook({ ...base });
      const unknown = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Japan", studentCountry: "Turkey" }),
      });
      expect(unknown.outlook).toBe(withoutGate.outlook);
      expect(unknown.notApplicableKind).toBeNull();
      expect(unknown.admissionSystemShape).toBe("unknown");
    });

    // The exact persona the QA report reproduced: a strong Turkish student targeting a
    // Turkish university. Before this wiring existed, every real caller produced a
    // reach/competitive/likely label here.
    test("a Turkey/YKS target is not_applicable regardless of how strong the profile is", () => {
      const admissionSystem = resolveAdmissionSystem({ targetCountry: "Türkiye", studentCountry: "Türkiye" });
      for (const profileStrength of [10, 55, 92]) {
        const result = computeAdmissionOutlook({ profileStrength, admissionRate: 0.15, dataConfidence: "high", admissionSystem });
        expect(result.outlook).toBe("not_applicable");
        expect(result.notApplicableKind).toBe("no_evidence_review_rank_competitive");
        expect(result.estimateRangeLow).toBeNull();
        expect(result.estimateRangeHigh).toBeNull();
        expect(result.estimateConfidence).toBeNull();
      }
    });

    // implementation-gap Gap 1: the shipped binary enum's single `notApplicableReason` was
    // worded around exam-gating, which reads as nonsense for a Dutch open programme. Both
    // suppress the label; they must not share a message.
    test("a Dutch open programme and a Turkish target suppress for visibly different reasons", () => {
      const dutch = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" }),
      });
      const turkish = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }),
      });
      expect(dutch.outlook).toBe("not_applicable");
      expect(turkish.outlook).toBe("not_applicable");
      expect(dutch.notApplicableKind).toBe("no_evidence_review_threshold");
      expect(turkish.notApplicableKind).toBe("no_evidence_review_rank_competitive");
      expect(dutch.notApplicableReason).not.toEqual(turkish.notApplicableReason);
      expect(dutch.notApplicableReason).not.toContain("exam-gated");
    });

    test("the reason leads with the target's own sourced mechanism, not a generic disclaimer", () => {
      const result = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }),
      });
      expect(result.notApplicableReason).toContain("ÖSYM");
      expect(result.admissionSystemMechanism).not.toBeNull();
      expect(result.sources.length).toBeGreaterThan(0);
    });

    test("the same Irish university is rated for one student and not for another, by pathway", () => {
      const turkish = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: "Turkey" }),
      });
      const irish = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Ireland", studentCountry: "Ireland" }),
      });
      expect(turkish.outlook).not.toBe("not_applicable");
      expect(irish.outlook).toBe("not_applicable");
    });

    test("Gate 1 takes precedence over the deprecated flag when both are supplied", () => {
      const result = computeAdmissionOutlook({
        ...base,
        admissionSystemType: "credential_gate",
        admissionSystem: resolveAdmissionSystem({ targetCountry: "United States", studentCountry: "Turkey" }),
      });
      expect(result.outlook).not.toBe("not_applicable");
      expect(result.notApplicableKind).toBeNull();
    });
  });

  /**
   * RULE-ADMISSIONS-021 / implementation-gap Gap 4. Before this, `computeAdmissionOutlook`
   * took no field parameter at all, so an undergraduate Medicine target in the US produced a
   * normal, confident classification for a degree path that does not exist there.
   */
  describe("fieldAvailability: the target has to exist before it can be rated", () => {
    const base = { profileStrength: 88, admissionRate: 0.05, dataConfidence: "high" } as const;

    test("undergraduate Medicine in the US is not_applicable, not a reach", () => {
      const result = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "United States", studentCountry: "Turkey" }),
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }),
      });
      expect(result.outlook).toBe("not_applicable");
      expect(result.notApplicableKind).toBe("field_not_offered_at_undergraduate");
      expect(result.estimateRangeLow).toBeNull();
      expect(result.estimateRangeHigh).toBeNull();
    });

    test("the student is told the real route, and the named exception, rather than a disclaimer", () => {
      const result = computeAdmissionOutlook({
        ...base,
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "Canada", field: "law" }),
      });
      expect(result.notApplicableReason).toContain("postgraduate");
      expect(result.notApplicableReason).toContain("Quebec");
    });

    // The audit warned that folding this into the Gate-1 value would recreate the same
    // over-coarse-enum problem the three shapes exist to avoid.
    test("its reason is distinct from every Gate-1 suppression reason", () => {
      const field = computeAdmissionOutlook({
        ...base,
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }),
      });
      const gate = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }),
      });
      expect(field.notApplicableKind).not.toBe(gate.notApplicableKind);
      expect(field.notApplicableReason).not.toEqual(gate.notApplicableReason);
    });

    test("field non-existence outranks Gate 1 — a nonexistent path has no mechanism worth describing", () => {
      const result = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "Canada", studentCountry: "Turkey", targetUniversityName: "University of British Columbia" }),
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "Canada", field: "medicine" }),
      });
      expect(result.notApplicableKind).toBe("field_not_offered_at_undergraduate");
      expect(result.admissionSystemMechanism).toBeNull();
    });

    test("Medicine in the UK, where it IS an undergraduate degree, is rated normally", () => {
      const result = computeAdmissionOutlook({
        ...base,
        admissionSystem: resolveAdmissionSystem({ targetCountry: "United Kingdom", studentCountry: "Turkey" }),
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "United Kingdom", field: "medicine" }),
      });
      expect(result.outlook).not.toBe("not_applicable");
      expect(result.notApplicableKind).toBeNull();
    });

    test("an unknown availability suppresses nothing", () => {
      const result = computeAdmissionOutlook({
        ...base,
        fieldAvailability: checkUndergraduateFieldAvailability({ country: "Japan", field: "medicine" }),
      });
      expect(result.outlook).not.toBe("not_applicable");
    });
  });
});

describe("computeAdmissionOutlook — locale: tr", () => {
  const base = { profileStrength: 72, admissionRate: 0.3, dataConfidence: "high" } as const;

  // Turkey specifically: both the outlook.ts hedge AND system-shape.ts's mechanism are
  // translated for this country, so the full sentence should read as one coherent Turkish
  // paragraph, not a translated tail glued onto an English head.
  test("a Turkey/YKS target's full reason is Turkish end to end, including the mechanism", () => {
    const result = computeAdmissionOutlook(
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }, "tr") },
      "tr"
    );
    expect(result.notApplicableReason).toContain("ÖSYM'nin YKS yerleştirme algoritması");
    expect(result.notApplicableReason).toContain("burada bir değerlendirici yok");
    // No leftover English hedge phrasing from the untranslated source strings — Turkish
    // itself shares the Latin alphabet, so this checks specific known English fragments
    // rather than a generic "no lowercase Latin word" pattern, which would flag Turkish too.
    expect(result.notApplicableReason).not.toContain("placement algorithm");
    expect(result.notApplicableReason).not.toContain("no reviewer");
  });

  // The honesty check specifically requested for this slice: the hedge must still admit the
  // same limit the English does, not read as more certain.
  test("the rank-competitive hedge still says Oryn won't guess the cutoff, not just that it can't see it", () => {
    const result = computeAdmissionOutlook(
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }, "tr") },
      "tr"
    );
    expect(result.notApplicableReason).toContain("tahmin yürütmez");
  });

  test("the threshold hedge (e.g. a Dutch open programme) is Turkish", () => {
    const result = computeAdmissionOutlook(
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" }, "tr") },
      "tr"
    );
    expect(result.notApplicableKind).toBe("no_evidence_review_threshold");
    expect(result.notApplicableReason).toContain("yarışarak değil yayımlanmış koşulları karşılayarak");
  });

  // Known, documented gap: countries outside the pilot's 4-country target set (Turkey, UK,
  // Netherlands, Italy — all translated now) still mix an English mechanism with a Turkish
  // hedge. Germany, not Netherlands: Netherlands is translated as of this slice, so testing
  // the fallback against it would silently stop testing the fallback at all. Asserting the
  // mix directly so a future translation of Germany's entry is a visible, expected test
  // change, not a silent behavior shift.
  test("a country outside the pilot set (e.g. Germany) mixes English mechanism + Turkish hedge — documented, not hidden", () => {
    const result = computeAdmissionOutlook(
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Germany", studentCountry: "Turkey" }, "tr") },
      "tr"
    );
    expect(result.notApplicableReason).toContain("German admission is credential-gated");
    expect(result.notApplicableReason).toContain("yarışarak değil yayımlanmış koşulları karşılayarak");
  });

  test("field-not-offered-at-undergraduate reason is Turkish", () => {
    const result = computeAdmissionOutlook(
      { ...base, fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }, "tr") },
      "tr"
    );
    expect(result.notApplicableReason).toContain("Amerika Birleşik Devletleri'nde Tıp bir lisans derecesi değildir");
  });

  test("field-not-offered reason includes the Turkish caveat when one exists (Canada/law)", () => {
    const result = computeAdmissionOutlook(
      { ...base, fieldAvailability: checkUndergraduateFieldAvailability({ country: "Canada", field: "law" }, "tr") },
      "tr"
    );
    expect(result.notApplicableReason).toContain("Kanada'da Hukuk fiilen bir lisans derecesi değildir");
    expect(result.notApplicableReason).toContain("Quebec");
  });

  test("the deprecated credential_gate_unspecified path is Turkish too", () => {
    const result = computeAdmissionOutlook({ ...base, admissionSystemType: "credential_gate" }, "tr");
    expect(result.notApplicableReason).toContain("kimlik/sınav temelli");
  });

  test("omitting locale is identical to passing 'en' explicitly, across every not-applicable kind (default-locale backward compatibility)", () => {
    const cases = [
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Turkey", studentCountry: "Turkey" }) },
      { ...base, admissionSystem: resolveAdmissionSystem({ targetCountry: "Netherlands", studentCountry: "Turkey" }) },
      { ...base, fieldAvailability: checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }) },
      { ...base, admissionSystemType: "credential_gate" as const },
    ];
    for (const input of cases) {
      expect(computeAdmissionOutlook(input)).toEqual(computeAdmissionOutlook(input, "en"));
    }
  });
});

/**
 * 2026-09-01: OUTLOOK_LABELS had no Turkish counterpart until features/universities/
 * outlook-badge.tsx's i18n pass — this is the shared accessor both the badge and
 * lib/ai/student-context.ts's prompt-builder now call instead of indexing the map raw.
 */
describe("outlookLabel", () => {
  test("every real outlook class has a distinct Turkish label", () => {
    const outlooks = ["extreme_reach", "reach", "competitive", "strong", "likely"] as const;
    const labels = outlooks.map((o) => outlookLabel(o, "tr"));
    expect(new Set(labels).size).toBe(outlooks.length);
    expect(labels).toEqual(["Aşırı Zorlu", "Zorlu", "Rekabetçi", "Güçlü", "Olası"]);
  });

  test("not_applicable translates too", () => {
    expect(outlookLabel("not_applicable", "tr")).toBe("Bu ölçekte değerlendirilmiyor");
  });

  test("English is unchanged from the original OUTLOOK_LABELS map", () => {
    expect(outlookLabel("extreme_reach", "en")).toBe("Extreme Reach");
    expect(outlookLabel("not_applicable", "en")).toBe("Not rated on this scale");
  });
});
