import { describe, expect, test } from "vitest";
import { normalizeRorRecord, searchRorByName, type RorFetch } from "@/lib/acquisition/ror";

/** Shape trimmed from a real api.ror.org/v2 response for Boğaziçi University. */
const RAW_ROR = {
  id: "https://ror.org/03z9tma90",
  status: "active",
  established: 1863,
  domains: ["boun.edu.tr"],
  names: [
    { lang: "en", types: ["ror_display", "label"], value: "Boğaziçi University" },
    { lang: "tr", types: ["label"], value: "Boğaziçi Üniversitesi" },
    { lang: null, types: ["acronym"], value: "BOUN" },
  ],
  links: [
    { type: "website", value: "https://bogazici.edu.tr" },
    { type: "wikipedia", value: "http://en.wikipedia.org/wiki/Bogazici_University" },
  ],
  locations: [
    { geonames_id: 745044, geonames_details: { country_code: "TR", country_name: "Türkiye", name: "Istanbul", lat: 41.01384, lng: 28.94966 } },
  ],
  external_ids: [
    { type: "grid", all: ["grid.11220.30"], preferred: "grid.11220.30" },
    { type: "wikidata", all: ["Q896267"], preferred: null },
  ],
  types: ["education", "funder"],
  admin: { last_modified: { date: "2024-12-11", schema_version: "2.1" } },
};

describe("normalizeRorRecord", () => {
  test("extracts identity, location, website and cross-registry ids", () => {
    const record = normalizeRorRecord(RAW_ROR)!;
    expect(record.id).toBe("https://ror.org/03z9tma90");
    expect(record.displayName).toBe("Boğaziçi University");
    expect(record.websiteUrl).toBe("https://bogazici.edu.tr");
    expect(record.countryCode).toBe("TR");
    expect(record.city).toBe("Istanbul");
    expect(record.latitude).toBeCloseTo(41.01384);
    expect(record.acronyms).toEqual(["BOUN"]);
    expect(record.types).toEqual(["education", "funder"]);
    expect(record.lastModified).toBe("2024-12-11");
  });

  test("prefers a curated external id but falls back to the first of `all`", () => {
    const record = normalizeRorRecord(RAW_ROR)!;
    expect(record.externalIds.grid).toBe("grid.11220.30");
    expect(record.externalIds.wikidata).toBe("Q896267");
  });

  test("keeps every localised name form so alias matching can use them", () => {
    const record = normalizeRorRecord(RAW_ROR)!;
    expect(record.names.map((n) => n.value)).toContain("Boğaziçi Üniversitesi");
  });

  test("returns null when there is no id or no usable name", () => {
    expect(normalizeRorRecord({ names: [{ value: "X", types: [] }] })).toBeNull();
    expect(normalizeRorRecord({ id: "https://ror.org/x", names: [] })).toBeNull();
    expect(normalizeRorRecord(null)).toBeNull();
    expect(normalizeRorRecord("nope")).toBeNull();
  });

  test("missing optional blocks become null rather than throwing", () => {
    const record = normalizeRorRecord({ id: "https://ror.org/x", names: [{ value: "Y", types: ["ror_display"] }] })!;
    expect(record.websiteUrl).toBeNull();
    expect(record.city).toBeNull();
    expect(record.countryCode).toBeNull();
    expect(record.lastModified).toBeNull();
    expect(record.established).toBeNull();
    expect(record.externalIds).toEqual({});
  });

  test("falls back to the first name when no ror_display type is present", () => {
    const record = normalizeRorRecord({ id: "https://ror.org/x", names: [{ value: "Only Name", types: ["label"] }] })!;
    expect(record.displayName).toBe("Only Name");
  });
});

describe("searchRorByName", () => {
  const okFetch: RorFetch = async () => ({ ok: true, status: 200, json: async () => ({ number_of_results: 1, items: [RAW_ROR] }) });

  test("returns normalised records and the reported total", async () => {
    const result = await searchRorByName("Bogazici", okFetch);
    expect(result?.total).toBe(1);
    expect(result?.items[0].displayName).toBe("Boğaziçi University");
  });

  test("returns null on a non-OK response rather than throwing", async () => {
    const result = await searchRorByName("x", async () => ({ ok: false, status: 503, json: async () => ({}) }));
    expect(result).toBeNull();
  });

  test("returns null when the network call rejects", async () => {
    const result = await searchRorByName("x", async () => {
      throw new Error("ECONNRESET");
    });
    expect(result).toBeNull();
  });

  test("survives malformed JSON with an empty item list instead of crashing", async () => {
    const result = await searchRorByName("x", async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("bad json");
      },
    }));
    expect(result).toEqual({ items: [], total: 0 });
  });

  test("drops unparseable items but keeps the good ones", async () => {
    const result = await searchRorByName("x", async () => ({
      ok: true,
      status: 200,
      json: async () => ({ number_of_results: 2, items: [{ garbage: true }, RAW_ROR] }),
    }));
    expect(result?.items).toHaveLength(1);
  });
});
