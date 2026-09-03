import { describe, expect, test } from "vitest";
import {
  computeExposureNorm,
  computeOverdueNorm,
  computeSavedNorm,
  riskWeightForCycleStatus,
  computePriorityBreakdown,
  rankCandidate,
  sortByPriorityDescending,
  EXPOSURE_WEIGHT,
  RISK_WEIGHT_WEIGHT,
  OVERDUE_WEIGHT,
  SAVED_WEIGHT,
} from "@/lib/opportunities/reverification/priority";
import type { ReverificationCandidate } from "@/lib/opportunities/reverification/types";

const REFERENCE_DATE = new Date("2026-08-23T00:00:00Z");

function candidate(overrides: Partial<ReverificationCandidate> = {}): ReverificationCandidate {
  return {
    id: "opp-1",
    title: "Test Opportunity",
    organization: "Test Org",
    officialUrl: "https://example.com",
    sourceUrl: null,
    deadline: null,
    cycleStatus: "unverified",
    maxMatchScore: null,
    matchedUserCount: 0,
    savedCount: 0,
    sourceVerifiedAt: null,
    ...overrides,
  };
}

describe("the four weights sum to 1.0", () => {
  test("design doc §4.1's additive formula", () => {
    expect(EXPOSURE_WEIGHT + RISK_WEIGHT_WEIGHT + OVERDUE_WEIGHT + SAVED_WEIGHT).toBeCloseTo(1.0, 10);
  });
});

describe("computeExposureNorm", () => {
  test("(max_match_score / 100) x (matched / total) -- the JA Company Programme worked example, §4.2", () => {
    // "7/7 users, score 91" -> 0.91
    expect(computeExposureNorm(91, 7, 7)).toBeCloseTo(0.91, 10);
  });

  test("a row matched to fewer of the corpus's matched users scores lower than a full-overlap row at the same match score", () => {
    expect(computeExposureNorm(91, 3, 7)).toBeLessThan(computeExposureNorm(91, 7, 7));
  });

  test("zero matched users is zero exposure, not NaN -- the 'hypothetical zero-exposure row' from §4.2", () => {
    expect(computeExposureNorm(null, 0, 7)).toBe(0);
    expect(computeExposureNorm(50, 0, 7)).toBe(0);
  });

  test("an empty corpus (nobody matched to anything yet) is zero exposure for every row, not a division by zero", () => {
    expect(computeExposureNorm(91, 0, 0)).toBe(0);
  });
});

describe("riskWeightForCycleStatus -- design doc §4.1's table", () => {
  test("open/upcoming with no deadline is the highest risk, 1.0", () => {
    expect(riskWeightForCycleStatus("open", false)).toBe(1.0);
    expect(riskWeightForCycleStatus("upcoming", false)).toBe(1.0);
  });

  test("open with a deadline is 0.8", () => {
    expect(riskWeightForCycleStatus("open", true)).toBe(0.8);
  });

  test("upcoming with a deadline, and date_not_announced, are both 0.5", () => {
    expect(riskWeightForCycleStatus("upcoming", true)).toBe(0.5);
    expect(riskWeightForCycleStatus("date_not_announced", false)).toBe(0.5);
  });

  test("unverified is 0.3", () => {
    expect(riskWeightForCycleStatus("unverified", false)).toBe(0.3);
  });

  test("closed and historical are both 0.2", () => {
    expect(riskWeightForCycleStatus("closed", false)).toBe(0.2);
    expect(riskWeightForCycleStatus("historical", false)).toBe(0.2);
  });

  test("discontinued -- not in the design doc's own table, filled in here at the same weight as closed/historical", () => {
    expect(riskWeightForCycleStatus("discontinued", false)).toBe(0.2);
  });
});

describe("computeOverdueNorm", () => {
  test("never checked (null source_verified_at) saturates at 1.0 regardless of TTL -- §4.2: 'every row is maximally overdue' on day one", () => {
    expect(computeOverdueNorm(null, 7, REFERENCE_DATE)).toBe(1.0);
    expect(computeOverdueNorm(null, 180, REFERENCE_DATE)).toBe(1.0);
  });

  test("checked exactly one TTL period ago is at the midpoint, 0.5 (ratio 1.0, clamped to [0,2], halved)", () => {
    const oneTtlAgo = new Date(REFERENCE_DATE.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeOverdueNorm(oneTtlAgo, 7, REFERENCE_DATE)).toBeCloseTo(0.5, 10);
  });

  test("saturates at 2x TTL and beyond -- an ancient row never outranks by age alone past that point", () => {
    const threeTtlAgo = new Date(REFERENCE_DATE.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
    const tenTtlAgo = new Date(REFERENCE_DATE.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeOverdueNorm(threeTtlAgo, 7, REFERENCE_DATE)).toBe(1.0);
    expect(computeOverdueNorm(tenTtlAgo, 7, REFERENCE_DATE)).toBe(1.0);
  });

  test("checked moments ago is near zero", () => {
    expect(computeOverdueNorm(REFERENCE_DATE.toISOString(), 7, REFERENCE_DATE)).toBeCloseTo(0, 5);
  });

  test("an unparseable timestamp degrades to saturated (1.0), never a silent NaN", () => {
    expect(computeOverdueNorm("not-a-date", 7, REFERENCE_DATE)).toBe(1.0);
  });
});

describe("computeSavedNorm", () => {
  test("min(n_saved, 3) / 3", () => {
    expect(computeSavedNorm(0)).toBe(0);
    expect(computeSavedNorm(1)).toBeCloseTo(1 / 3, 10);
    expect(computeSavedNorm(3)).toBe(1);
    expect(computeSavedNorm(10)).toBe(1); // caps at 3, never keeps growing
  });
});

describe("computePriorityBreakdown -- the full worked table from §4.2", () => {
  test("JA Company Programme: exposure 0.91, risk 1.0, overdue 1.0 (never checked) -> priority 0.864", () => {
    const breakdown = computePriorityBreakdown({ exposureNorm: 0.91, riskWeight: 1.0, overdueNorm: 1.0, savedNorm: 0 });
    expect(breakdown.priority).toBeCloseTo(0.864, 3);
  });

  test("a hypothetical zero-exposure row in the 42: exposure 0, risk 1.0, overdue 1.0 -> priority 0.5", () => {
    const breakdown = computePriorityBreakdown({ exposureNorm: 0, riskWeight: 1.0, overdueNorm: 1.0, savedNorm: 0 });
    expect(breakdown.priority).toBeCloseTo(0.5, 10);
  });
});

describe("rankCandidate -- end to end", () => {
  test("the JA Company Programme shape, computed from a full candidate object", () => {
    const c = candidate({ cycleStatus: "upcoming", deadline: null, maxMatchScore: 91, matchedUserCount: 7 });
    const { breakdown } = rankCandidate(c, { totalDistinctMatchedUsers: 7, effectiveTtlDays: 7, referenceDate: REFERENCE_DATE });
    expect(breakdown.priority).toBeCloseTo(0.864, 3);
  });
});

describe("sortByPriorityDescending", () => {
  test("higher priority first", () => {
    const high = { candidate: candidate({ id: "high" }), breakdown: { exposureNorm: 0, riskWeight: 0, overdueNorm: 0, savedNorm: 0, priority: 0.9 } };
    const low = { candidate: candidate({ id: "low" }), breakdown: { exposureNorm: 0, riskWeight: 0, overdueNorm: 0, savedNorm: 0, priority: 0.1 } };
    expect(sortByPriorityDescending([low, high]).map((r) => r.candidate.id)).toEqual(["high", "low"]);
  });

  test("tie-break: deadline ascending, nulls last, then id -- design doc §4.1", () => {
    const tie = (id: string, deadline: string | null) => ({ candidate: candidate({ id, deadline }), breakdown: { exposureNorm: 0, riskWeight: 0, overdueNorm: 0, savedNorm: 0, priority: 0.5 } });
    const sorted = sortByPriorityDescending([tie("z-no-deadline", null), tie("a-later", "2026-12-01"), tie("b-earlier", "2026-09-01")]);
    expect(sorted.map((r) => r.candidate.id)).toEqual(["b-earlier", "a-later", "z-no-deadline"]);
  });

  test("a genuine tie (same priority, same null deadline) falls through to id ordering, deterministically", () => {
    const tie = (id: string) => ({ candidate: candidate({ id, deadline: null }), breakdown: { exposureNorm: 0, riskWeight: 0, overdueNorm: 0, savedNorm: 0, priority: 0.5 } });
    const sorted = sortByPriorityDescending([tie("c"), tie("a"), tie("b")]);
    expect(sorted.map((r) => r.candidate.id)).toEqual(["a", "b", "c"]);
  });
});
