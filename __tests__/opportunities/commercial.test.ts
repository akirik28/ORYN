import { describe, expect, test } from "vitest";
import { competesInCoreRecommendations, isPayToEnroll, judgePayToEnroll } from "@/lib/opportunities/commercial";
import type { Opportunity } from "@/types/database";

function o(cost: number | null, selectivity_tier: Opportunity["selectivity_tier"]) {
  return { cost, selectivity_tier };
}

describe("isPayToEnroll", () => {
  test("a real fee with no selectivity claim is pay-to-enroll", () => {
    // The live cases this rule exists for: pay-to-publish journals and priced open-enrolment
    // programmes, all currently competing at the same match score as free ones.
    expect(isPayToEnroll(o(350, "open_enrollment"))).toBe(true); // JRHS / IJHSR
    expect(isPayToEnroll(o(496, "open_enrollment"))).toBe(true); // AJSR
    expect(isPayToEnroll(o(4000, "unknown"))).toBe(true); // UNO - United Nations Online
    expect(isPayToEnroll(o(9000, "unknown"))).toBe(true); // Wharton M&TSI
  });

  test("`unknown` selectivity does not earn the benefit of the doubt", () => {
    // "Nobody has classified this yet" is not evidence of selectivity. This asymmetry is the
    // point of the gate: an unclassified priced programme is exactly the trap case.
    expect(isPayToEnroll(o(1400, "unknown"))).toBe(true);
  });

  test("a materially selective programme keeps competing however expensive", () => {
    expect(isPayToEnroll(o(7208, "highly_selective"))).toBe(false); // Ross / Mathcamp / SSP
    expect(isPayToEnroll(o(15192, "selective"))).toBe(false);
    expect(isPayToEnroll(o(500, "extremely_selective"))).toBe(false);
    expect(isPayToEnroll(o(500, "competitive_award"))).toBe(false);
  });

  test("a nominal entry fee is not enrolment — CMIMC must survive", () => {
    // A real Carnegie Mellon mathematics competition charging 5 per competitor. A blanket
    // cost > 0 rule would have demoted it, which is not what pay-to-enroll means.
    expect(isPayToEnroll(o(5, "unknown"))).toBe(false);
  });

  test("free and unpriced opportunities are never gated", () => {
    expect(isPayToEnroll(o(0, "unknown"))).toBe(false);
    expect(isPayToEnroll(o(null, "unknown"))).toBe(false);
    expect(isPayToEnroll(o(null, "open_enrollment"))).toBe(false);
  });

  test("the threshold is not load-bearing across today's gap", () => {
    // Priced non-selective rows sit at 5 and then jump to 350. Every threshold in between
    // produces the same partition, so the chosen constant carries no hidden judgment.
    expect(isPayToEnroll(o(5, "unknown"))).toBe(false);
    expect(isPayToEnroll(o(350, "unknown"))).toBe(true);
  });

  test("competesInCoreRecommendations is the exact inverse", () => {
    for (const c of [null, 0, 5, 350, 9000]) {
      for (const t of ["unknown", "open_enrollment", "selective"] as const) {
        expect(competesInCoreRecommendations(o(c, t))).toBe(!isPayToEnroll(o(c, t)));
      }
    }
  });
});

describe("judgePayToEnroll — the disclosure isPayToEnroll's boolean couldn't carry (2026-09-03)", () => {
  test("a null cost is cost_unverified, distinguishable from a genuinely free/nominal programme", () => {
    expect(judgePayToEnroll(o(null, "unknown"))).toBe("cost_unverified");
    expect(judgePayToEnroll(o(null, "open_enrollment"))).toBe("cost_unverified");
    expect(judgePayToEnroll(o(0, "unknown"))).toBe("not_pay_to_enroll"); // confirmed free -- a real, checked answer, not unverified
  });

  test("every case isPayToEnroll already returns true for is pay_to_enroll here, not merely truthy", () => {
    expect(judgePayToEnroll(o(350, "open_enrollment"))).toBe("pay_to_enroll");
    expect(judgePayToEnroll(o(1400, "unknown"))).toBe("pay_to_enroll");
  });

  test("every case isPayToEnroll already returns false for (and isn't null) is not_pay_to_enroll, not cost_unverified", () => {
    expect(judgePayToEnroll(o(7208, "highly_selective"))).toBe("not_pay_to_enroll");
    expect(judgePayToEnroll(o(5, "unknown"))).toBe("not_pay_to_enroll");
  });

  test("isPayToEnroll is exactly the pay_to_enroll case of judgePayToEnroll, for every input — the boolean's behavior is provably unchanged", () => {
    for (const c of [null, 0, 5, 100, 101, 350, 1400, 7208, 15192]) {
      for (const t of ["unknown", "open_enrollment", "selective", "highly_selective", "extremely_selective", "competitive_award"] as const) {
        expect(isPayToEnroll(o(c, t))).toBe(judgePayToEnroll(o(c, t)) === "pay_to_enroll");
      }
    }
  });

  test("cost_unverified maps to false through isPayToEnroll -- a caller that only wants the boolean sees identical behavior to before this fix existed", () => {
    expect(isPayToEnroll(o(null, "unknown"))).toBe(false);
    expect(competesInCoreRecommendations(o(null, "unknown"))).toBe(true); // still competes -- unchanged
  });
});
