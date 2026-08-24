import { describe, expect, test } from "vitest";
import { scoreAwardsDistinction } from "@/lib/scoring/dimensions/awards";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Award } from "@/types/database";

function award(overrides: Partial<Award>): Award {
  return {
    id: "aw1",
    user_id: "u1",
    title: "Some award",
    organization: null,
    organization_entity_id: null,
    level: null,
    description: null,
    award_date: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(awards: Award[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards,
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
  };
}

describe("scoreAwardsDistinction", () => {
  test("scores 0 with low confidence when there are no awards", () => {
    const result = scoreAwardsDistinction(facts([]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("an international-level award scores higher than a school-level award", () => {
    const schoolLevel = scoreAwardsDistinction(facts([award({ level: "School" })]));
    const internationalLevel = scoreAwardsDistinction(facts([award({ level: "International" })]));
    expect(internationalLevel.score).toBeGreaterThan(schoolLevel.score);
  });
});

/**
 * Quality must beat quantity.
 *
 * The regression this guards against was live: under the previous aggregation eight
 * school-level awards scored 55, one national award scored 36, and one international
 * award scored 48 — so a student could out-score a national medallist by listing prizes
 * from inside their own school. The existing tests above didn't catch it because they
 * compare one item against one item, and the defect only appears when *counts* differ.
 *
 * These cases fix the shape of the curve, not a set of magic numbers: what is asserted is
 * the ordering between profiles and the rate at which extra low-tier items stop mattering.
 */
const scoreOf = (levels: string[]) =>
  scoreAwardsDistinction(facts(levels.map((level, i) => award({ id: `aw${i}`, level })))).score;

const times = (n: number, level: string) => Array.from({ length: n }, () => level);

describe("awards: quality dominates quantity", () => {
  test("no quantity of school-level awards overtakes a single higher-tier one", () => {
    // Eight is past the point where a student would plausibly keep adding, and it still
    // sits below the smallest step up in tier.
    expect(scoreOf(times(8, "School"))).toBeLessThan(scoreOf(["Regional"]));
    expect(scoreOf(times(8, "School"))).toBeLessThan(scoreOf(["National"]));
    expect(scoreOf(times(8, "School"))).toBeLessThan(scoreOf(["International"]));
  });

  test("one nationally significant result beats many ordinary ones by a wide margin", () => {
    // Not merely "greater than" — a hair's-breadth win would still tell the student that
    // collecting school prizes is a viable route to the same place.
    expect(scoreOf(["National"]) - scoreOf(times(8, "School"))).toBeGreaterThanOrEqual(15);
  });

  test("each additional low-tier award is worth sharply less than the one before it", () => {
    const [one, two, three, four] = [1, 2, 3, 4].map((n) => scoreOf(times(n, "School")));
    const gains = [two - one, three - two, four - three];
    expect(gains[1]).toBeLessThan(gains[0]);
    expect(gains[2]).toBeLessThan(gains[1]);
    // By the fourth item the marginal value is negligible rather than merely reduced.
    expect(gains[2]).toBeLessThanOrEqual(2);
  });

  test("a second genuinely significant award still adds real value", () => {
    // The decay must not be so steep that depth at the top of the scale stops counting;
    // a two-time national medallist is stronger evidence than a one-time one.
    expect(scoreOf(["National", "National"]) - scoreOf(["National"])).toBeGreaterThanOrEqual(20);
  });

  test("tiers stay ordered, and a mixed profile lands between its parts", () => {
    expect(scoreOf(["School"])).toBeLessThan(scoreOf(["Regional"]));
    expect(scoreOf(["Regional"])).toBeLessThan(scoreOf(["National"]));
    expect(scoreOf(["National"])).toBeLessThan(scoreOf(["International"]));
    expect(scoreOf(["National", "Regional"])).toBeGreaterThan(scoreOf(["National"]));
    expect(scoreOf(["National", "Regional"])).toBeLessThan(scoreOf(["International"]));
  });

  test("a single international award is already strong evidence on its own", () => {
    // A student who has won at international level should not be told this area is a gap
    // because they have only one of them.
    expect(scoreOf(["International"])).toBeGreaterThanOrEqual(70);
  });

  test("the top of the scale is reachable", () => {
    expect(scoreOf(times(4, "International"))).toBe(100);
  });

  test("unrecognised wording is not punished as if it were school-level", () => {
    expect(scoreOf(["Gold medal, senior division"])).toBeGreaterThan(scoreOf(["School"]));
    expect(scoreOf(["Gold medal, senior division"])).toBeLessThan(scoreOf(["National"]));
  });
});
