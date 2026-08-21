import { describe, expect, test } from "vitest";
import { computeAdmissionOutlook } from "@/lib/admissions/outlook";

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
  });
});
