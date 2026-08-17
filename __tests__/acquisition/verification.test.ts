import { describe, expect, test } from "vitest";
import { classifyFreshness, isPublishableAsFact, requiresCaveat, resolveVerificationState } from "@/lib/acquisition/verification";

describe("classifyFreshness", () => {
  test.each([
    ["2026", "CURRENT"],
    ["2025", "CURRENT"],
    ["2024", "CURRENT"],
    ["2023", "ACCEPTABLE_BUT_AGING"],
    ["2022", "ACCEPTABLE_BUT_AGING"],
    ["2019", "STALE"],
    ["2006/07", "STALE"],
    [null, "DATE_UNKNOWN"],
    ["undated (see source)", "DATE_UNKNOWN"],
  ])("%s in 2026 -> %s", (input, expected) => {
    expect(classifyFreshness(input, 2026)).toBe(expected);
  });

  test("an academic-year range classifies on its later end", () => {
    expect(classifyFreshness("2023/2024", 2026)).toBe("CURRENT");
  });

  test("ignores an implausible future year rather than trusting it", () => {
    expect(classifyFreshness("2099", 2026)).toBe("DATE_UNKNOWN");
  });
});

describe("resolveVerificationState", () => {
  const now = new Date("2026-08-17T00:00:00.000Z");

  test("a refused source can never be verified", () => {
    expect(
      resolveVerificationState({ authority: null, sourceYear: 2026, retrievedAt: "2026-08-17T00:00:00.000Z", cadenceDays: 90, now })
    ).toBe("unverified");
  });

  test("a fresh read from an accepted source is verified_current", () => {
    expect(
      resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: 2026, retrievedAt: "2026-08-16T00:00:00.000Z", cadenceDays: 90, now })
    ).toBe("verified_current");
  });

  test("a source stating an old year is historical however recently we fetched it", () => {
    expect(
      resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: 2019, retrievedAt: "2026-08-17T00:00:00.000Z", cadenceDays: 90, now })
    ).toBe("verified_historical");
  });

  test("past its cadence window the fact is stale", () => {
    expect(
      resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: 2026, retrievedAt: "2026-01-01T00:00:00.000Z", cadenceDays: 90, now })
    ).toBe("stale");
  });

  test("a same-tier disagreement outranks freshness", () => {
    expect(
      resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: 2026, retrievedAt: "2026-08-16T00:00:00.000Z", cadenceDays: 90, conflicting: true, now })
    ).toBe("conflicting");
  });

  test("a derived value is verified_derived and does not go stale on its own age", () => {
    expect(
      resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: null, retrievedAt: "2020-01-01T00:00:00.000Z", cadenceDays: 90, derived: true, now })
    ).toBe("verified_derived");
  });

  test("an unparseable retrieval timestamp is unverified rather than assumed fresh", () => {
    expect(resolveVerificationState({ authority: { tier: "HIGH" }, sourceYear: 2026, retrievedAt: "not-a-date", cadenceDays: 90, now })).toBe("unverified");
  });
});

describe("publication gating", () => {
  test("only current and derived states may be asserted as plain fact", () => {
    expect(isPublishableAsFact("verified_current")).toBe(true);
    expect(isPublishableAsFact("verified_derived")).toBe(true);
    for (const state of ["verified_historical", "stale", "conflicting", "unverified", "unresolved"] as const) {
      expect(isPublishableAsFact(state)).toBe(false);
    }
  });

  test("historical, stale and conflicting states must carry a caveat", () => {
    expect(requiresCaveat("verified_historical")).toBe(true);
    expect(requiresCaveat("stale")).toBe(true);
    expect(requiresCaveat("conflicting")).toBe(true);
    expect(requiresCaveat("verified_current")).toBe(false);
  });
});
