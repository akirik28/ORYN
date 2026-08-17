import { describe, expect, test } from "vitest";
import { compareLocation, resolveIdentity, type ExternalIdentity, type LocalUniversity } from "@/lib/acquisition/identity";

const edinburgh: LocalUniversity = {
  id: "uni-edi",
  name: "The University of Edinburgh",
  country: "United Kingdom",
  externalIds: { wikidata: "Q160302" },
};
const bogazici: LocalUniversity = { id: "uni-bou", name: "Boğaziçi Üniversitesi", country: "Turkey", aliases: ["Bogazici University", "BOUN"] };
const melbourne: LocalUniversity = { id: "uni-mel", name: "The University of Melbourne", country: "Australia" };

function external(overrides: Partial<ExternalIdentity> = {}): ExternalIdentity {
  return { displayName: "University of Edinburgh", names: ["University of Edinburgh"], countryName: "United Kingdom", ...overrides };
}

describe("resolveIdentity", () => {
  test("an external id already stored on our side is decisive", () => {
    const result = resolveIdentity(external({ externalIds: { wikidata: "Q160302" } }), [edinburgh, bogazici]);
    expect(result).toEqual({ status: "matched", match: { universityId: "uni-edi", method: "external_id", matchedOn: "wikidata=Q160302" } });
  });

  test("matches on name once the leading article is normalised away", () => {
    const result = resolveIdentity(external(), [edinburgh, melbourne]);
    expect(result.status).toBe("matched");
    if (result.status === "matched") expect(result.match.universityId).toBe("uni-edi");
  });

  test("matches a localised registry name against a stored alias", () => {
    const result = resolveIdentity(
      external({ displayName: "Bogazici University", names: ["Bogazici University"], countryName: "Turkey" }),
      [bogazici, edinburgh]
    );
    expect(result.status).toBe("matched");
    if (result.status === "matched") expect(result.match.universityId).toBe("uni-bou");
  });

  test("accepts a country alias (Türkiye / Turkey) as the same country", () => {
    const result = resolveIdentity(external({ displayName: "Boğaziçi Üniversitesi", names: ["Boğaziçi Üniversitesi"], countryName: "Türkiye" }), [bogazici]);
    expect(result.status).toBe("matched");
  });

  test("refuses to match when the registry record has no resolvable country", () => {
    const result = resolveIdentity(external({ countryName: null }), [edinburgh]);
    expect(result.status).toBe("unresolved");
    if (result.status === "unresolved") expect(result.reason).toContain("no resolvable country");
  });

  test("a name match in the wrong country is not a match", () => {
    const result = resolveIdentity(external({ displayName: "University of Edinburgh", names: ["University of Edinburgh"], countryName: "Australia" }), [edinburgh]);
    expect(result.status).toBe("unresolved");
  });

  test("two local rows with the same name in the same country is unresolved, not a coin flip", () => {
    const dupeA: LocalUniversity = { id: "a", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
    const dupeB: LocalUniversity = { id: "b", name: "King Fahd University of Petroleum and Minerals", country: "Saudi Arabia" };
    const result = resolveIdentity(
      external({ displayName: "King Fahd University of Petroleum and Minerals", names: ["King Fahd University of Petroleum and Minerals"], countryName: "Saudi Arabia" }),
      [dupeA, dupeB]
    );
    expect(result.status).toBe("unresolved");
    if (result.status === "unresolved") expect(result.reason).toContain("merged");
  });

  test("one external id claimed by two local rows is unresolved", () => {
    const a: LocalUniversity = { id: "a", name: "X", country: "Turkey", externalIds: { grid: "grid.1" } };
    const b: LocalUniversity = { id: "b", name: "Y", country: "Turkey", externalIds: { grid: "grid.1" } };
    const result = resolveIdentity(external({ externalIds: { grid: "grid.1" }, countryName: "Turkey" }), [a, b]);
    expect(result.status).toBe("unresolved");
    if (result.status === "unresolved") expect(result.reason).toContain("merge");
  });

  test("no name overlap at all is unresolved", () => {
    const result = resolveIdentity(external({ displayName: "Some Polytechnic", names: ["Some Polytechnic"] }), [edinburgh]);
    expect(result.status).toBe("unresolved");
  });

  test("an empty candidate set is unresolved rather than an exception", () => {
    expect(resolveIdentity(external(), []).status).toBe("unresolved");
  });
});

describe("compareLocation", () => {
  test("reports a city disagreement instead of correcting it", () => {
    // ROR's geonames locality for UCT is the suburb "Rondebosch"; ours says "Cape Town".
    // The pipeline must surface this, never overwrite the student-facing value.
    const result = compareLocation({ city: "Cape Town", country: "South Africa" }, { city: "Rondebosch", countryName: "South Africa" });
    expect(result.countryAgrees).toBe(true);
    expect(result.cityAgrees).toBe(false);
  });

  test("accent differences do not count as a city disagreement", () => {
    expect(compareLocation({ city: "São Paulo", country: "Brazil" }, { city: "Sao Paulo", countryName: "Brazil" }).cityAgrees).toBe(true);
  });

  test("returns null rather than false when there is nothing to compare", () => {
    expect(compareLocation({ city: null, country: "Japan" }, { city: "Tokyo", countryName: null })).toEqual({ countryAgrees: null, cityAgrees: null });
  });
});
