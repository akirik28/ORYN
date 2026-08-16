import { describe, expect, test } from "vitest";
import { rankUniversities, type UniversityLike } from "@/lib/universities/alias-search";

const MIT: UniversityLike = {
  id: "uni-mit",
  name: "Massachusetts Institute of Technology",
  aliases: ["MIT"],
  city: "Cambridge, MA",
  country: "United States",
};
const LSE: UniversityLike = {
  id: "uni-lse",
  name: "London School of Economics and Political Science",
  aliases: ["LSE"],
  city: "London",
  country: "United Kingdom",
};
const BOGAZICI: UniversityLike = {
  id: "uni-bogazici",
  name: "Boğaziçi University",
  aliases: [],
  city: "İstanbul",
  country: "Turkey",
};
const ALL = [MIT, LSE, BOGAZICI];

describe("rankUniversities — alias resolution (the gap plain ilike could never close)", () => {
  test("an abbreviation resolves to its one canonical university", () => {
    const results = rankUniversities("MIT", ALL, 8);
    expect(results[0].id).toBe(MIT.id);
  });

  test("abbreviation matching is case-insensitive", () => {
    expect(rankUniversities("mit", ALL, 8)[0].id).toBe(MIT.id);
  });

  test("the full canonical name resolves to the same single university — no duplicate identity", () => {
    const byAlias = rankUniversities("MIT", ALL, 8)[0];
    const byFullName = rankUniversities("Massachusetts Institute of Technology", ALL, 8)[0];
    expect(byAlias.id).toBe(byFullName.id);
  });

  test("another alias in the set resolves independently", () => {
    expect(rankUniversities("LSE", ALL, 8)[0].id).toBe(LSE.id);
  });
});

describe("rankUniversities — accent/Turkish folding (the other ilike gap)", () => {
  test("an ASCII spelling matches an accented canonical name", () => {
    expect(rankUniversities("bogazici", ALL, 8)[0].id).toBe(BOGAZICI.id);
  });

  test("the accented spelling matches too", () => {
    expect(rankUniversities("Boğaziçi", ALL, 8)[0].id).toBe(BOGAZICI.id);
  });
});

describe("rankUniversities — result shape", () => {
  test("a partial name prefix still matches", () => {
    expect(rankUniversities("London School", ALL, 8)[0].id).toBe(LSE.id);
  });

  test("an unrelated query returns nothing rather than an arbitrary nearest row", () => {
    expect(rankUniversities("zzzz qqqq", ALL, 8)).toEqual([]);
  });

  test("respects the caller's limit", () => {
    expect(rankUniversities("University", ALL, 1).length).toBeLessThanOrEqual(1);
  });

  test("returns the caller's own full row objects, not a reduced projection", () => {
    const [top] = rankUniversities("MIT", ALL, 8);
    expect(top).toBe(MIT);
  });
});
