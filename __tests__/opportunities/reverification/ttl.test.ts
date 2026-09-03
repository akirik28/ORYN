import { describe, expect, test } from "vitest";
import { effectiveTtlDays, TTL_DAYS } from "@/lib/opportunities/reverification/ttl";

const REFERENCE_DATE = new Date("2026-08-23T00:00:00Z");

describe("effectiveTtlDays -- design doc §3.1's table, state TTLs only (§3.2's type dimension is not implemented)", () => {
  test("open, no deadline: 7 days -- the highest-risk shape", () => {
    expect(effectiveTtlDays({ cycleStatus: "open", deadline: null }, REFERENCE_DATE)).toBe(TTL_DAYS.OPEN_NO_DEADLINE);
    expect(TTL_DAYS.OPEN_NO_DEADLINE).toBe(7);
  });

  test("upcoming, no deadline: 7 days -- the Stanford Anesthesia shape", () => {
    expect(effectiveTtlDays({ cycleStatus: "upcoming", deadline: null }, REFERENCE_DATE)).toBe(7);
  });

  test("date_not_announced: 21 days", () => {
    expect(effectiveTtlDays({ cycleStatus: "date_not_announced", deadline: null }, REFERENCE_DATE)).toBe(21);
  });

  test("unverified: 30 days -- largest bucket, lowest urgency", () => {
    expect(effectiveTtlDays({ cycleStatus: "unverified", deadline: null }, REFERENCE_DATE)).toBe(30);
  });

  test("closed and historical: 45 days", () => {
    expect(effectiveTtlDays({ cycleStatus: "closed", deadline: null }, REFERENCE_DATE)).toBe(45);
    expect(effectiveTtlDays({ cycleStatus: "historical", deadline: null }, REFERENCE_DATE)).toBe(45);
  });

  test("discontinued: 180 days -- governed even though the bucket is empty today", () => {
    expect(effectiveTtlDays({ cycleStatus: "discontinued", deadline: null }, REFERENCE_DATE)).toBe(180);
  });

  describe("open with a deadline -- the T-14 tightening", () => {
    test("far in the future (>14 days out): baseline 7 days, not tightened", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "2026-09-20" }, REFERENCE_DATE)).toBe(7); // ~28 days out
    });

    test("comfortably inside the 14-day window (10 days out): tightened to 3 days", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "2026-09-02" }, REFERENCE_DATE)).toBe(3);
    });

    test("comfortably outside the 14-day window (20 days out): baseline 7, not tightened", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "2026-09-12" }, REFERENCE_DATE)).toBe(7);
    });

    test("just inside the window, a few days out: tightened to 3 days", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "2026-08-25" }, REFERENCE_DATE)).toBe(3);
    });

    test("a deadline already in the past: baseline 7 days, not tightened -- lifecycle.ts already excludes it from recommendation, so there's no active outbound push to protect", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "2026-08-01" }, REFERENCE_DATE)).toBe(7);
    });

    test("a malformed deadline string degrades to the baseline, never crashes or tightens on bad data", () => {
      expect(effectiveTtlDays({ cycleStatus: "open", deadline: "not-a-date" }, REFERENCE_DATE)).toBe(7);
    });
  });

  describe("upcoming with a deadline: always 14 days, no T-14 tightening (design doc only tightens the `open` bucket)", () => {
    test("far in the future", () => {
      expect(effectiveTtlDays({ cycleStatus: "upcoming", deadline: "2026-12-01" }, REFERENCE_DATE)).toBe(14);
    });

    test("close to the deadline -- still 14, not tightened like `open` is", () => {
      expect(effectiveTtlDays({ cycleStatus: "upcoming", deadline: "2026-08-25" }, REFERENCE_DATE)).toBe(14);
    });
  });
});
