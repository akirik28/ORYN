import { describe, expect, test } from "vitest";
import {
  CAO_POINTS_IE,
  classifyFreshness,
  isDueForAnnualRecheck,
  isPublishableAsFact,
  nextAnnualWindowStart,
  requiresCaveat,
  resolveVerificationState,
  type AnnualCalendarWindow,
} from "@/lib/acquisition/verification";

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


describe("nextAnnualWindowStart", () => {
  const window: AnnualCalendarWindow = { label: "test window", month: 8, day: 25 };

  test("before this year's window, returns this year's date", () => {
    expect(nextAnnualWindowStart(window, new Date("2026-03-15T00:00:00.000Z"))).toEqual(new Date("2026-08-25T00:00:00.000Z"));
  });

  test("after this year's window has passed, returns next year's date", () => {
    expect(nextAnnualWindowStart(window, new Date("2026-09-01T00:00:00.000Z"))).toEqual(new Date("2027-08-25T00:00:00.000Z"));
  });

  test("exactly on the window's start date, treats it as already reached — rolls to next year", () => {
    expect(nextAnnualWindowStart(window, new Date("2026-08-25T00:00:00.000Z"))).toEqual(new Date("2027-08-25T00:00:00.000Z"));
  });

  test("the day before the window opens, still returns this year's date", () => {
    expect(nextAnnualWindowStart(window, new Date("2026-08-24T00:00:00.000Z"))).toEqual(new Date("2026-08-25T00:00:00.000Z"));
  });
});

describe("isDueForAnnualRecheck — the drift problem AnnualCalendarWindow exists to fix", () => {
  const window: AnnualCalendarWindow = { label: "test window", month: 8, day: 25 };

  test("a fact retrieved in March is due the moment THIS year's window opens, not 365 days after March", () => {
    // A rolling 365-day cadence from a March check would next fire the following March —
    // this is the exact failure this mechanism replaces.
    expect(isDueForAnnualRecheck(window, "2026-03-15T00:00:00.000Z", new Date("2026-08-24T00:00:00.000Z"))).toBe(false);
    expect(isDueForAnnualRecheck(window, "2026-03-15T00:00:00.000Z", new Date("2026-08-25T00:00:00.000Z"))).toBe(true);
  });

  test("a fact retrieved just after last year's window closed is not due again until this year's window, not 365 days later to the day", () => {
    expect(isDueForAnnualRecheck(window, "2025-08-27T00:00:00.000Z", new Date("2026-08-24T00:00:00.000Z"))).toBe(false);
    expect(isDueForAnnualRecheck(window, "2025-08-27T00:00:00.000Z", new Date("2026-08-25T00:00:00.000Z"))).toBe(true);
  });

  test("a fact retrieved the same day the window opens is fresh until next year's window", () => {
    expect(isDueForAnnualRecheck(window, "2026-08-25T00:00:00.000Z", new Date("2026-12-01T00:00:00.000Z"))).toBe(false);
    expect(isDueForAnnualRecheck(window, "2026-08-25T00:00:00.000Z", new Date("2027-08-25T00:00:00.000Z"))).toBe(true);
  });

  test("an unparseable retrievedAt is treated as due, never as confidently fresh", () => {
    expect(isDueForAnnualRecheck(window, "not-a-date", new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });
});

describe("CAO_POINTS_IE", () => {
  test("the 38 CAO-points requirement rows found in the 2026-08-31 backfill, all retrieved 2026-08-21, are due today (2026-09-01) — this year's window opened 2026-08-25", () => {
    expect(isDueForAnnualRecheck(CAO_POINTS_IE, "2026-08-21T00:00:00.000Z", new Date("2026-09-01T00:00:00.000Z"))).toBe(true);
  });

  test("the same rows were NOT yet due as of their own retrieval date", () => {
    expect(isDueForAnnualRecheck(CAO_POINTS_IE, "2026-08-21T00:00:00.000Z", new Date("2026-08-21T00:00:00.000Z"))).toBe(false);
  });
});
