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
});
