import { describe, expect, test } from "vitest";
import { isDemotionEligible, volumeGuardBlocksRun, canAutoApplyPromotion, DEMOTION_VOLUME_GUARD_MIN_COUNT, DEMOTION_VOLUME_GUARD_RATIO } from "@/lib/opportunities/reverification/demotion";

describe("isDemotionEligible -- design doc §9(1)'s three preconditions, all required", () => {
  test("all three hold: eligible", () => {
    expect(isDemotionEligible({ evidenceClass: "P1", explicitClosurePhraseMatched: true, futureDatedApplicationSignalFound: false })).toEqual({ eligible: true });
  });

  test("not P1 (e.g. P4 contradicted, or P2/P3): never eligible, regardless of anything else", () => {
    expect(isDemotionEligible({ evidenceClass: "P4", explicitClosurePhraseMatched: true, futureDatedApplicationSignalFound: false })).toEqual({ eligible: false, reason: "not_p1" });
    expect(isDemotionEligible({ evidenceClass: null, explicitClosurePhraseMatched: true, futureDatedApplicationSignalFound: false })).toEqual({ eligible: false, reason: "not_p1" });
  });

  test("P1 but no explicit closure phrase matched: not eligible -- absence of opening language is not evidence of closure", () => {
    expect(isDemotionEligible({ evidenceClass: "P1", explicitClosurePhraseMatched: false, futureDatedApplicationSignalFound: false })).toEqual({ eligible: false, reason: "no_explicit_closure_phrase" });
  });

  test("a future-dated application signal on the same page blocks demotion -- the '2026 closed / 2027 announced' ambiguity", () => {
    expect(isDemotionEligible({ evidenceClass: "P1", explicitClosurePhraseMatched: true, futureDatedApplicationSignalFound: true })).toEqual({ eligible: false, reason: "future_dated_signal_present" });
  });

  test("checked in order: not_p1 wins over the other two even when they'd also fail", () => {
    expect(isDemotionEligible({ evidenceClass: "P2", explicitClosurePhraseMatched: false, futureDatedApplicationSignalFound: true }).reason).toBe("not_p1");
  });
});

describe("volumeGuardBlocksRun -- design doc §9(5), '>10% of batch (>=3 of 25) applies none'", () => {
  test("the literal worked example: 3 of 25 blocks (3/25 = 12% > 10%)", () => {
    expect(volumeGuardBlocksRun(3, 25)).toBe(true);
  });

  test("2 of 25 does not block -- under the floor of 3, even though nothing about the ratio itself is small", () => {
    expect(volumeGuardBlocksRun(2, 25)).toBe(false);
  });

  test("zero proposed demotions never blocks anything", () => {
    expect(volumeGuardBlocksRun(0, 25)).toBe(false);
  });

  test("a tiny batch (e.g. max_rows: 8) is not tripped by 1-2 ordinary closures -- the floor exists specifically for this", () => {
    expect(volumeGuardBlocksRun(1, 8)).toBe(false);
    expect(volumeGuardBlocksRun(2, 8)).toBe(false);
  });

  test("a tiny batch CAN still trip once the count reaches the floor and the ratio is also over 10%", () => {
    expect(volumeGuardBlocksRun(3, 8)).toBe(true); // 3/8 = 37.5%
  });

  test("a large batch needs proportionally more than 3 to trip -- the ratio dominates once the floor stops binding", () => {
    expect(volumeGuardBlocksRun(3, 100)).toBe(false); // 3/100 = 3%, under 10%, floor alone isn't enough here
    expect(volumeGuardBlocksRun(11, 100)).toBe(true); // 11/100 = 11%
  });

  test("exactly at the 10% boundary does not block -- strictly greater than, matching '>10%'", () => {
    // 10 of 100 is exactly 10%, not more than 10%.
    expect(volumeGuardBlocksRun(10, 100)).toBe(false);
  });

  test("an empty or invalid batch size never blocks", () => {
    expect(volumeGuardBlocksRun(5, 0)).toBe(false);
  });

  test("constants match the design doc's own numbers", () => {
    expect(DEMOTION_VOLUME_GUARD_MIN_COUNT).toBe(3);
    expect(DEMOTION_VOLUME_GUARD_RATIO).toBe(0.1);
  });
});

describe("canAutoApplyPromotion -- design doc §9(2), unconditionally never automatic", () => {
  test("always false, with no parameters to make it otherwise", () => {
    expect(canAutoApplyPromotion()).toBe(false);
  });
});
