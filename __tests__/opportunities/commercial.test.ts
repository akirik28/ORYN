import { describe, expect, test } from "vitest";
import { competesInCoreRecommendations, isPayToEnroll } from "@/lib/opportunities/commercial";
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
