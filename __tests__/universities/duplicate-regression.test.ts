import { describe, expect, test } from "vitest";
import { canonicalUniversityId, excludeSupersededUniversities, isSupersededUniversityId, type SupersessionMap } from "@/lib/universities/canonical";
import { rankUniversities, type UniversityLike } from "@/lib/universities/alias-search";

/**
 * Product-facing regression tests for the founder-reported duplicate-university bug (Phase F).
 * Named pairs required at minimum: UCL, MIT, LSE, Warwick, HKUST, KFUPM, UTS, Newcastle
 * Australia, Al-Farabi — every one of them, not just the reported UCL case.
 *
 * lib/universities/canonical.ts used to read a static, generated duplicate-supersessions.json
 * snapshot; it now queries the live `universities.duplicate_status`/`superseded_by_id` columns
 * (migration 0043, confirmed live 2026-08-22) via an async loader. What's under test below is
 * therefore the pure map-consuming logic (canonicalUniversityId / excludeSupersededUniversities
 * / isSupersededUniversityId), fed a hand-built map shaped exactly like the real 9 known pairs —
 * not a live-data regression test anymore, since there is no longer a committed snapshot to
 * diff against and this environment has no database connection to hit instead (see below). The
 * real ids/names are kept as fixture data anyway so this stays a representative example rather
 * than opaque "id-1"/"id-2" placeholders, and so a reviewer can still recognize the real pairs.
 * Live-state correctness (are these still the right 9 pairs, right now) is a DB-level property
 * now, not a unit-testable one — see scripts/university-duplicates-audit.ts (the tool that sets
 * duplicate_status/superseded_by_id) and __tests__/programs/ingest.test.ts's own MIT-ambiguity
 * regression for the adjacent coverage that does still exercise real ids end-to-end.
 *
 * What these do NOT do: hit a live Supabase RPC. `searchUniversityRows` (lib/universities/
 * alias-search.ts) and the EntityCombobox university-scope backend (lib/entities/search.ts)
 * both need a real database connection (the search_canonical_entities RPC, live table state) —
 * this environment has no local Postgres/Docker available for integration testing (a standing,
 * documented constraint, not skipped unexamined). Instead, these tests exercise the exact same
 * downstream logic (canonicalUniversityId / excludeSupersededUniversities) against realistic
 * mock row sets shaped exactly like the real duplicate pairs, which is what those live functions
 * delegate to after their DB round trip — the same style already established in
 * __tests__/universities/alias-search.test.ts for the in-memory ranker.
 */

const KNOWN_PAIRS: { name: string; loserId: string; winnerId: string; loserName: string; winnerName: string }[] = [
  { name: "UCL", loserId: "cf8adcbd-7164-462e-ba76-f95ef23214ea", winnerId: "03c8faf1-4b30-47fe-b09e-8851b96c1f6e", loserName: "UCL", winnerName: "University College London" },
  { name: "MIT", loserId: "ba3a30b2-c6e2-4a0f-ba32-6da028175d35", winnerId: "03167d0c-2315-49e3-a37e-f9c9c7d2d27c", loserName: "Massachusetts Institute of Technology (MIT)", winnerName: "Massachusetts Institute of Technology" },
  { name: "LSE", loserId: "cc117524-044e-49b9-8ddd-a628d021d3e1", winnerId: "cfd5cd77-5a6b-46b6-b5fe-1b58c0f8632d", loserName: "The London School of Economics and Political Science (LSE)", winnerName: "London School of Economics and Political Science" },
  { name: "Warwick", loserId: "ad3ef0a4-1502-4bca-bc2c-69c71e40e2d5", winnerId: "0b204add-2507-45b0-85f4-917e725b16c2", loserName: "The University of Warwick", winnerName: "University of Warwick" },
  { name: "HKUST", loserId: "29e16fe0-3f8f-46d3-8d34-f5fa48370a14", winnerId: "75761b06-781d-4e7a-8e05-9d6a116771c9", loserName: "The Hong Kong University of Science and Technology (HKUST)", winnerName: "The Hong Kong University of Science and Technology" },
  { name: "KFUPM", loserId: "0e01bc5d-0e1e-4e35-a629-2befec4e3cb3", winnerId: "62929169-4cb9-4ef2-b1f4-bfd1b34cf164", loserName: "KFUPM", winnerName: "King Fahd University of Petroleum and Minerals (KFUPM)" },
  { name: "UTS", loserId: "f1d7d625-4c39-4132-a54e-e567e1390185", winnerId: "6c88ddfe-1b49-411f-a4e8-bb82436ae1ed", loserName: "The University of Technology Sydney (UTS)", winnerName: "University of Technology Sydney" },
  { name: "Newcastle Australia", loserId: "6bdd71e9-9ab3-4f64-bf9b-b6a821784115", winnerId: "54d29f0d-ce64-4342-ba0f-0d0895e36797", loserName: "The University of Newcastle, Australia (UON)", winnerName: "The University of Newcastle, Australia" },
  { name: "Al-Farabi", loserId: "6f0df596-4ee5-49da-82ad-8057bfaa890d", winnerId: "37f12391-462d-4aba-8947-d9cf159627cb", loserName: "Farabi University (former Al - Farabi Kazakh National University)", winnerName: "Al-Farabi Kazakh National University" },
];

/** Built once, reused by every describe block below — mirrors what `loadSupersessionMap`
 * would return for exactly these 9 pairs, without a live DB connection. */
const KNOWN_PAIRS_MAP: SupersessionMap = new Map(KNOWN_PAIRS.map((p) => [p.loserId, { winnerId: p.winnerId }]));

describe("the 9 known pairs, individually", () => {
  test.each(KNOWN_PAIRS)("$name: loser resolves to the correct winner", ({ loserId, winnerId }) => {
    expect(isSupersededUniversityId(KNOWN_PAIRS_MAP, loserId)).toBe(true);
    expect(canonicalUniversityId(KNOWN_PAIRS_MAP, loserId)).toBe(winnerId);
  });

  test.each(KNOWN_PAIRS)("$name: winner is never itself marked superseded", ({ winnerId }) => {
    expect(isSupersededUniversityId(KNOWN_PAIRS_MAP, winnerId)).toBe(false);
    expect(canonicalUniversityId(KNOWN_PAIRS_MAP, winnerId)).toBe(winnerId);
  });
});

describe("canonical university list — a mixed winner+loser row set collapses to one row per real institution", () => {
  test("all 9 pairs at once: 18 rows in, 9 rows out, every survivor is a winner", () => {
    const rows = KNOWN_PAIRS.flatMap((p) => [
      { id: p.loserId, name: p.loserName },
      { id: p.winnerId, name: p.winnerName },
    ]);
    expect(rows).toHaveLength(18);

    const visible = excludeSupersededUniversities(KNOWN_PAIRS_MAP, rows);
    expect(visible).toHaveLength(9);
    expect(visible.map((r) => r.id).sort()).toEqual(KNOWN_PAIRS.map((p) => p.winnerId).sort());
    // Every kept name is the winner's, never the loser's.
    for (const pair of KNOWN_PAIRS) {
      expect(visible.map((r) => r.name)).toContain(pair.winnerName);
      expect(visible.map((r) => r.name)).not.toContain(pair.loserName);
    }
  });

  test("row order within the input is preserved (a stable filter, not a re-sort)", () => {
    const rows = [{ id: "z-unrelated", name: "Zzz University" }, ...KNOWN_PAIRS.slice(0, 2).flatMap((p) => [{ id: p.loserId, name: p.loserName }, { id: p.winnerId, name: p.winnerName }])];
    const visible = excludeSupersededUniversities(KNOWN_PAIRS_MAP, rows);
    expect(visible[0].id).toBe("z-unrelated");
  });

  test("a university with no known duplicate is never touched", () => {
    const rows = [{ id: "genuinely-unique-id", name: "Some University With No Duplicate" }];
    expect(excludeSupersededUniversities(KNOWN_PAIRS_MAP, rows)).toEqual(rows);
  });
});

describe("alias search — the exact reported bug (\"UCL\" search surfacing both rows)", () => {
  // rankUniversities is the pure in-memory ranker searchUniversityRows delegates to after its
  // RPC round trip (see lib/universities/alias-search.ts) — this is the same style
  // __tests__/universities/alias-search.test.ts already uses to test ranking without a live DB.
  // The scenario below is what the RPC + a canonical_entity_id join would produce BEFORE this
  // session's fix: both rows of a pair present as candidates, aliases attached to whichever
  // row the data happens to be on.
  function asUniversityLike(id: string, name: string, aliases: string[] = []): UniversityLike {
    return { id, name, aliases, city: "London", country: "United Kingdom" };
  }

  test("search(\"UCL\") — after excluding the known loser, ranking returns exactly one selectable University College London result", () => {
    const ucl = KNOWN_PAIRS.find((p) => p.name === "UCL")!;
    const allCandidates = [asUniversityLike(ucl.loserId, ucl.loserName, ["UCL"]), asUniversityLike(ucl.winnerId, ucl.winnerName, ["UCL"])];

    // The fix: exclude superseded rows BEFORE ranking (what searchUniversityRows now does at
    // the query level), not after — proves the candidate set itself never contains the loser.
    const filteredCandidates = excludeSupersededUniversities(KNOWN_PAIRS_MAP, allCandidates);
    expect(filteredCandidates).toHaveLength(1);

    const results = rankUniversities("UCL", filteredCandidates, 8);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(ucl.winnerId);
    expect(results[0].name).toBe("University College London");
  });

  test("the full canonical name also resolves to the same single winner, not the loser", () => {
    const ucl = KNOWN_PAIRS.find((p) => p.name === "UCL")!;
    const filteredCandidates = excludeSupersededUniversities(KNOWN_PAIRS_MAP, [asUniversityLike(ucl.loserId, ucl.loserName, ["UCL"]), asUniversityLike(ucl.winnerId, ucl.winnerName, ["UCL"])]);
    const results = rankUniversities("University College London", filteredCandidates, 8);
    expect(results[0]?.id).toBe(ucl.winnerId);
  });

  test.each(KNOWN_PAIRS)("$name: filtering before ranking never leaves the loser searchable", ({ loserId, winnerId, loserName, winnerName }) => {
    const filtered = excludeSupersededUniversities(KNOWN_PAIRS_MAP, [asUniversityLike(loserId, loserName), asUniversityLike(winnerId, winnerName)]);
    expect(filtered.map((r) => r.id)).toEqual([winnerId]);
  });

  test("genuinely different institutions that merely resemble the query stay separate and selectable (never fuzzy-auto-merged)", () => {
    // Real live case this session verified: "UCL" also legitimately matches UCLA, Université
    // catholique de Louvain (UCLouvain), Universidad Católica del Uruguay (UCU), University of
    // Cyprus (UCY) — all real, distinct institutions, correctly NOT collapsed into one result.
    const ucl = KNOWN_PAIRS.find((p) => p.name === "UCL")!;
    const distinctInstitutions = [
      asUniversityLike(ucl.winnerId, ucl.winnerName, ["UCL"]),
      asUniversityLike("ucla-id", "University of California, Los Angeles (UCLA)", ["UCLA"]),
      asUniversityLike("uclouvain-id", "Université catholique de Louvain (UCLouvain)", ["UCLouvain"]),
    ];
    const results = rankUniversities("UCL", distinctInstitutions, 8);
    // UCL's exact alias match must outrank the others, but they still appear as real, separate,
    // selectable results — never silently dropped or merged into the top match.
    expect(results[0].id).toBe(ucl.winnerId);
    expect(results.map((r) => r.id)).toContain("ucla-id");
    expect(results.map((r) => r.id)).toContain("uclouvain-id");
  });
});

// Not independently re-tested here: PostgREST's 1000-row truncation and exact-count pagination
// (fetchAllRowsVerified, lib/acquisition/paginate.ts, already covered by that module's own
// tests) guard unbounded "fetch everything" reads. searchUniversityRows caps at 50 (RPC) then
// slices to the caller's limit (8-48 across every real call site); the Explorer browse query is
// `.limit(48)`. Neither is the failure mode that guard exists for — a test asserting it here
// would have no real way to fail and wouldn't be real coverage.
