import { describe, expect, test } from "vitest";
import { FIXTURE_SCORES, FIXTURE_PROFILE_SIGNAL, FIXTURE_BIGGEST_GAP } from "@/lib/dev/fixtures";
import { canClaimGap, hasConfidentSignal, isAssessed, toProfileSignal } from "@/lib/scoring/signal";

/**
 * A populated, scored fixture must never render as "Getting started".
 *
 * The dev-preview harness shipped in exactly that state: its signal fixture omitted
 * `reasonCodes`, which the signal layer read as "this dimension found nothing to score",
 * so a student with academics 82 and leadership 91 was shown Home's empty-profile
 * headline — "Tell Oryn what you've done" — above their own scores.
 *
 * Nothing in the type system stopped it and nothing in the test suite noticed, because
 * every test built its own rows correctly. The field is now required, and this file
 * asserts the property at the level the bug actually lived at: the fixture the preview
 * really renders, run through the real signal builder, reaching the real branch condition
 * that Home uses to choose between the two headlines.
 */

describe("dev-preview fixture", () => {
  test("is a scored profile, and Proxola can say so", () => {
    expect(FIXTURE_SCORES.length).toBeGreaterThan(0);
    expect(FIXTURE_SCORES.every((row) => row.score > 0)).toBe(true);
    expect(hasConfidentSignal(FIXTURE_PROFILE_SIGNAL)).toBe(true);
  });

  test("every dimension reads as assessed rather than unrecorded", () => {
    for (const row of FIXTURE_PROFILE_SIGNAL) {
      expect(isAssessed(row.state)).toBe(true);
    }
  });

  // The exact condition Home branches on: `claimableGap` falsy ⇒ "Getting started".
  test("Home renders the real headline, not the empty-profile fallback", () => {
    expect(canClaimGap(FIXTURE_PROFILE_SIGNAL, FIXTURE_BIGGEST_GAP.dimension)).toBe(true);
  });

  test("the fixture rows carry the reason codes a real scored row would", () => {
    for (const row of FIXTURE_SCORES) expect(row.reason_codes.length).toBeGreaterThan(0);
  });
});

describe("toProfileSignal", () => {
  // The adapter exists so callers pass the DB row itself and have no field to forget.
  test("reads reason codes straight off a profile_scores row", () => {
    const signal = toProfileSignal([
      { dimension: "academics", score: 80, confidence: "high", reason_codes: [{ code: "gpa" }] },
      { dimension: "research", score: 0, confidence: "low", reason_codes: [] },
    ]);
    expect(signal.find((s) => s.dimension === "academics")!.state).toBe("strong");
    expect(signal.find((s) => s.dimension === "research")!.state).toBe("not_assessed");
  });

  test("a malformed jsonb value degrades to 'no evidence' rather than throwing", () => {
    const signal = toProfileSignal([
      { dimension: "academics", score: 80, confidence: "high", reason_codes: null },
    ]);
    expect(signal[0].state).toBe("not_assessed");
  });
});
