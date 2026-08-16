import { describe, expect, test } from "vitest";
import { rankEntityCandidates, findPossibleDuplicates, levenshteinDistance, normalizedSimilarity, MATCH_TIER, type EntityCandidate } from "@/lib/entities/rank";

const UAA: EntityCandidate = {
  id: "school-1",
  canonicalName: "Üsküdar American Academy",
  aliases: ["UAA", "Üsküdar Amerikan", "Üsküdar Amerikan Lisesi", "Uskudar American Academy"],
  country: "Turkey",
  city: "Istanbul",
};

const USKUDAR_UNIVERSITY: EntityCandidate = {
  id: "school-2",
  canonicalName: "Üsküdar University",
  aliases: [],
  country: "Turkey",
  city: "Istanbul",
};

const SAINT_JOSEPH_ISTANBUL: EntityCandidate = {
  id: "school-3",
  canonicalName: "Saint Joseph High School",
  // Deliberately no alias that exact-matches "Saint Joseph" on its own — this fixture is
  // reused for the same-name-different-city disambiguation tests below, which need both
  // schools to land in the *same* match tier (both via a plain prefix match on the
  // canonical name) so the country/city context boost is what actually decides ordering.
  aliases: ["Sen Jozef"],
  country: "Turkey",
  city: "Istanbul",
};

const SAINT_JOSEPH_IZMIR: EntityCandidate = {
  id: "school-4",
  canonicalName: "Saint Joseph High School",
  aliases: [],
  country: "Turkey",
  city: "Izmir",
};

const ROBERT_COLLEGE: EntityCandidate = {
  id: "school-5",
  canonicalName: "Robert College",
  aliases: [],
  country: "Turkey",
  city: "Istanbul",
};

describe("rankEntityCandidates — canonical match", () => {
  test("an exact canonical-name query matches at the top tier", () => {
    const results = rankEntityCandidates("Üsküdar American Academy", [UAA, ROBERT_COLLEGE]);
    expect(results[0].candidate.id).toBe(UAA.id);
    expect(results[0].tier).toBe(MATCH_TIER.exactCanonical);
  });

  test("an accent/case-different but otherwise exact query still matches at the top tier", () => {
    const results = rankEntityCandidates("uskudar american academy", [UAA]);
    expect(results[0].tier).toBe(MATCH_TIER.exactCanonical);
  });
});

describe("rankEntityCandidates — alias match", () => {
  test("an exact alias query matches, ranked below an exact canonical match but above everything else", () => {
    const results = rankEntityCandidates("UAA", [UAA, ROBERT_COLLEGE]);
    expect(results[0].candidate.id).toBe(UAA.id);
    expect(results[0].tier).toBe(MATCH_TIER.exactAlias);
  });

  test("a Turkish-script alias also matches by its own exact text", () => {
    const results = rankEntityCandidates("Üsküdar Amerikan Lisesi", [UAA]);
    expect(results[0].tier).toBe(MATCH_TIER.exactAlias);
  });
});

describe("rankEntityCandidates — abbreviation match", () => {
  test("a short abbreviation query resolves via the alias list, not a fuzzy guess", () => {
    const results = rankEntityCandidates("uaa", [UAA, ROBERT_COLLEGE, USKUDAR_UNIVERSITY]);
    expect(results[0].candidate.id).toBe(UAA.id);
    expect(results[0].tier).toBeLessThanOrEqual(MATCH_TIER.prefixAlias);
  });
});

describe("rankEntityCandidates — exact beats fuzzy", () => {
  test("an exact match always outranks a closer-looking fuzzy candidate", () => {
    // "Robert College" is an exact match; a fuzzy near-miss of a different school must
    // never outrank it just by score coincidence.
    const results = rankEntityCandidates("Robert College", [ROBERT_COLLEGE, SAINT_JOSEPH_ISTANBUL]);
    expect(results[0].candidate.id).toBe(ROBERT_COLLEGE.id);
    expect(results[0].tier).toBe(MATCH_TIER.exactCanonical);
  });

  test("tier strictly dominates fuzzy score — a prefix match beats a fuzzy match even with a high similarity score", () => {
    const results = rankEntityCandidates("Rober", [ROBERT_COLLEGE]); // prefix, not exact
    expect(results[0].tier).toBe(MATCH_TIER.prefixCanonical);
  });
});

describe("rankEntityCandidates — same-name different-city disambiguation", () => {
  test("two schools sharing a name in different cities both appear as separate results", () => {
    const results = rankEntityCandidates("Saint Joseph", [SAINT_JOSEPH_ISTANBUL, SAINT_JOSEPH_IZMIR]);
    const ids = results.map((r) => r.candidate.id).sort();
    expect(ids).toEqual([SAINT_JOSEPH_ISTANBUL.id, SAINT_JOSEPH_IZMIR.id].sort());
  });

  test("country/city context nudges ranking but never excludes the other city's result", () => {
    const results = rankEntityCandidates("Saint Joseph", [SAINT_JOSEPH_ISTANBUL, SAINT_JOSEPH_IZMIR], { country: "Turkey", city: "Izmir" });
    expect(results).toHaveLength(2);
    expect(results[0].candidate.id).toBe(SAINT_JOSEPH_IZMIR.id); // context-boosted to the top...
    expect(results.map((r) => r.candidate.id)).toContain(SAINT_JOSEPH_ISTANBUL.id); // ...but Istanbul is still present, not filtered out
  });
});

describe("rankEntityCandidates — fuzzy (typo-tolerant) matching", () => {
  test("a small typo still resolves via fuzzy matching, ranked below exact/prefix/token matches", () => {
    const results = rankEntityCandidates("Robrt College", [ROBERT_COLLEGE]);
    expect(results).toHaveLength(1);
    expect(results[0].tier).toBe(MATCH_TIER.fuzzy);
  });

  test("an unrelated query does not fuzzy-match a completely different name", () => {
    const results = rankEntityCandidates("xyzzy quux", [ROBERT_COLLEGE, UAA]);
    expect(results).toEqual([]);
  });

  test("empty query returns no results", () => {
    expect(rankEntityCandidates("", [ROBERT_COLLEGE])).toEqual([]);
  });
});

describe("levenshteinDistance / normalizedSimilarity", () => {
  test("identical strings: distance 0, similarity 1", () => {
    expect(levenshteinDistance("robert", "robert")).toBe(0);
    expect(normalizedSimilarity("robert", "robert")).toBe(1);
  });

  test("one substitution: distance 1", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
  });

  test("one insertion: distance 1", () => {
    expect(levenshteinDistance("robert", "roberts")).toBe(1);
  });

  test("completely different strings of equal length: similarity approaches 0", () => {
    expect(normalizedSimilarity("aaaa", "zzzz")).toBe(0);
  });
});

describe("findPossibleDuplicates — custom duplicate prevented when canonical exists", () => {
  test("a near-exact spelling of an existing canonical entity is flagged as a possible duplicate", () => {
    const duplicates = findPossibleDuplicates("Uskudar American Academy", [UAA, ROBERT_COLLEGE]);
    expect(duplicates.map((d) => d.id)).toContain(UAA.id);
  });

  test("a genuinely different entity is not flagged", () => {
    const duplicates = findPossibleDuplicates("Robert College", [UAA]);
    expect(duplicates).toEqual([]);
  });

  test("a merely similar-sounding but different real entity (below the high duplicate bar) is not auto-flagged as a duplicate — never auto-merge ambiguous entities", () => {
    // "Uskudar University" is a different real institution from "Uskudar American
    // Academy" — share a city and a first word, but must not be flagged as "the same
    // place, just misspelled."
    const duplicates = findPossibleDuplicates("Uskudar University", [UAA]);
    expect(duplicates.map((d) => d.id)).not.toContain(UAA.id);
  });
});
