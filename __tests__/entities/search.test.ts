import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { searchEntities } from "@/lib/entities/search";

/**
 * lib/entities/search.ts dispatches every EntityCombobox search to one of two shapes: a
 * generic canonical-registry RPC call (school/employer/NGO/lab/etc — see field-policy.ts),
 * or the university-specific path that resolves canonical registry hits back to
 * `universities` rows. Both take an injected `SupabaseClient` rather than constructing
 * their own, which is what makes this file possible — resolve.test.ts's own header explains
 * why sibling DB-touching modules in this codebase are usually left untested (no local
 * Postgres/Docker here to run the real `search_canonical_entities` RPC or exercise RLS), but
 * that constraint is about *integration* testing, not this file: everything below mocks the
 * Supabase client at the exact boundary search.ts calls it (`.rpc(...)`, `.from("universities")
 * .select().in().not()`, plus — since the migration-0043-live cutover — a second, independent
 * `.from("universities").select("id, superseded_by_id").eq("duplicate_status", "superseded")`
 * query from lib/universities/canonical.ts's loadSupersessionMap()), so what's under test is
 * the real production dispatch/mapping/dedupe logic in search.ts itself, not a reimplementation
 * of it.
 *
 * The university-dedup fixture below (`describe("canonical dedupe...")`) is shaped after the
 * actual founder-reported "UCL" bug — see lib/universities/canonical.ts's header and
 * __tests__/universities/duplicate-regression.test.ts, which tests the same underlying pair at
 * the canonicalUniversityId/excludeSupersededUniversities level but explicitly could not
 * exercise search.ts itself for lack of a database. This file closes that specific gap. The
 * plain alias-resolution fixture ("Har" → "Harvard University") is constructed rather than
 * pulled from real data — this codebase's canonical_entities/entity_aliases tables have no test
 * fixture of their own to import from — representative of the same alias-match shape
 * `search_canonical_entities` (migration 0038) actually returns.
 */

type CanonicalSearchRow = {
  entity_id: string;
  entity_type: string;
  canonical_name: string;
  display_name: string;
  country_code: string | null;
  city: string | null;
  verification_state: string;
  matched_text: string;
  matched_via: string;
  score: number;
};

type UniversityRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  institution_type: string | null;
  canonical_entity_id: string | null;
  /** Defaults applied in the fixture rows below when omitted (every pre-existing fixture row
   * predates migration 0043's columns) — see `withDuplicateDefaults`. */
  duplicate_status?: "canonical" | "superseded";
  superseded_by_id?: string | null;
};

/** A minimal PromiseLike + chainable query-builder stand-in for the exact chains search.ts's
 * searchUniversities() issues against the SAME mocked "universities" table: its own
 * `.from("universities").select(...).in(...)`, optionally `.not(...)` when there's at least one
 * known-superseded id to exclude, AND — since the migration-0043-live cutover —
 * lib/universities/canonical.ts's loadSupersessionMap() independent
 * `.select("id, superseded_by_id").eq("duplicate_status", "superseded")` query. Applies each
 * filter to an in-memory row set (rather than just recording calls and always returning canned
 * data) so the test proves search.ts builds a query that actually *excludes* the loser id, the
 * same way Postgres would, not merely that some `.not()`/`.eq()` call happened. */
function makeUniversitiesQueryBuilder(rows: UniversityRow[]) {
  let filtered = rows;
  const builder = {
    select: vi.fn(() => builder),
    in: vi.fn((column: keyof UniversityRow, values: string[]) => {
      filtered = filtered.filter((row) => values.includes(row[column] as string));
      return builder;
    }),
    not: vi.fn((column: keyof UniversityRow, operator: string, value: string) => {
      if (operator === "in") {
        const excluded = value.slice(1, -1).split(",").filter(Boolean);
        filtered = filtered.filter((row) => !excluded.includes(row[column] as string));
      }
      return builder;
    }),
    eq: vi.fn((column: keyof UniversityRow, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    }),
    // Makes `await builder` resolve to `{ data, error }`, same as a real supabase-js
    // PostgrestFilterBuilder — search.ts (and loadSupersessionMap) await this object
    // directly, never calling `.then()` explicitly themselves.
    then(onFulfilled: (value: { data: UniversityRow[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

/** Every fixture row needs a `duplicate_status` for loadSupersessionMap()'s `.eq()` filter to
 * mean anything — defaults to 'canonical' (not a known duplicate) so existing fixtures that
 * predate migration 0043 don't need touching individually. */
function withDuplicateDefaults(rows: UniversityRow[]): UniversityRow[] {
  return rows.map((row) => ({ duplicate_status: "canonical", superseded_by_id: null, ...row }));
}

function createMockSupabase(opts: { rpcResult: CanonicalSearchRow[]; universitiesRows?: UniversityRow[] }) {
  const rpc = vi.fn(async () => ({ data: opts.rpcResult, error: null }));
  // A fresh builder (and a fresh copy of the underlying rows) per `.from("universities")` call —
  // search.ts's searchUniversities() now calls this twice per search (once via
  // loadSupersessionMap(), once for its own entity-resolution query), and each needs to filter
  // independently rather than share mutated state.
  const from = vi.fn((table: string) => {
    if (table === "universities") return makeUniversitiesQueryBuilder(withDuplicateDefaults(opts.universitiesRows ?? []));
    throw new Error(`search.test.ts mock does not support table "${table}"`);
  });
  return { rpc, from } as unknown as SupabaseClient<Database>;
}

describe("searchEntities — alias-aware resolution (generic canonical registry scopes)", () => {
  test("an abbreviation alias resolves to its canonical full name, as a single result (constructed 'Har → Harvard' fixture)", async () => {
    const supabase = createMockSupabase({
      rpcResult: [
        {
          entity_id: "22222222-2222-4222-8222-222222222222",
          entity_type: "university",
          canonical_name: "Harvard University",
          display_name: "Harvard University",
          country_code: "US",
          city: "Cambridge",
          verification_state: "verified",
          matched_text: "Har",
          matched_via: "alias",
          score: 0.97,
        },
      ],
    });

    // "activity_organization" (not the "university" scope) — its allowedTypes include
    // "university", so a student adding an activity organization can match a university
    // entity straight from the canonical registry without needing a `universities` row.
    const results = await searchEntities(supabase, "activity_organization", "Har", {});

    expect(results).toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        displayName: "Harvard University",
        subtitle: "Cambridge, US · University",
        isCustom: false,
      },
    ]);
  });

  test("the query is passed through to the RPC unmodified — case-folding is the SQL side's job (unaccent/lower in migration 0038), not search.ts's", async () => {
    const supabase = createMockSupabase({ rpcResult: [] });
    await searchEntities(supabase, "school", "HaRvArD", {});
    expect(supabase.rpc).toHaveBeenCalledWith("search_canonical_entities", expect.objectContaining({ q: "HaRvArD" }));
  });

  test("a user-submitted (unverified) row is flagged isCustom — the UI distinguishes it from the curated registry", async () => {
    const supabase = createMockSupabase({
      rpcResult: [
        {
          entity_id: "33333333-3333-4333-8333-333333333333",
          entity_type: "school",
          canonical_name: "Some New School",
          display_name: "Some New School",
          country_code: null,
          city: null,
          verification_state: "user_submitted",
          matched_text: "Some New School",
          matched_via: "canonical",
          score: 1.0,
        },
      ],
    });
    const results = await searchEntities(supabase, "school", "Some New School", {});
    expect(results[0].isCustom).toBe(true);
  });
});

describe("searchEntities — canonical dedupe for universities (real UCL fixture)", () => {
  // The actual founder-reported pair behind the "UCL" search returning both "UCL" and
  // "University College London" — see lib/universities/canonical.ts's header. Hardcoded here
  // (rather than read from canonical.ts, which now queries the live DB and has no static export
  // of "the known pairs" to import) same as __tests__/universities/duplicate-regression.test.ts's
  // own KNOWN_PAIRS fixture — this file exercises search.ts's own use of the live-query helpers,
  // not a live-data-drift guarantee.
  const UCL_LOSER_ID = "cf8adcbd-7164-462e-ba76-f95ef23214ea"; // "UCL"
  const UCL_WINNER_ID = "03c8faf1-4b30-47fe-b09e-8851b96c1f6e"; // "University College London"
  const UCL_WINNER_NAME = "University College London";

  test("searching the alias 'UCL' resolves to exactly one result — the winner row, never the superseded loser", async () => {
    // The shared `canonical_entities.id` both `universities` rows point at. Same relationship
    // search.ts's own `byEntityId` map depends on (both rows keyed by the same
    // canonical_entity_id) — a representative id, not itself a duplicate_status/
    // superseded_by_id column value.
    const sharedCanonicalEntityId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

    const supabase = createMockSupabase({
      rpcResult: [
        {
          entity_id: sharedCanonicalEntityId,
          entity_type: "university",
          canonical_name: UCL_WINNER_NAME,
          display_name: UCL_WINNER_NAME,
          country_code: "GB",
          city: "London",
          verification_state: "verified",
          matched_text: "UCL",
          matched_via: "alias",
          score: 0.995,
        },
      ],
      // Both the winner row AND the known-superseded loser row exist in `universities` —
      // exactly the "both rows for one real institution" state canonical.ts's header
      // describes as the literal mechanism behind the reported bug. duplicate_status/
      // superseded_by_id are what loadSupersessionMap()'s query (inside searchUniversities)
      // actually filters on now, not a JSON snapshot.
      universitiesRows: [
        { id: UCL_WINNER_ID, name: UCL_WINNER_NAME, city: "London", country: "United Kingdom", institution_type: "public", canonical_entity_id: sharedCanonicalEntityId },
        {
          id: UCL_LOSER_ID,
          name: "UCL",
          city: "London",
          country: "United Kingdom",
          institution_type: "public",
          canonical_entity_id: sharedCanonicalEntityId,
          duplicate_status: "superseded",
          superseded_by_id: UCL_WINNER_ID,
        },
      ],
    });

    const results = await searchEntities(supabase, "university", "UCL", {});

    expect(results).toHaveLength(1); // never both rows for the same real institution
    expect(results[0].id).toBe(UCL_WINNER_ID); // the winner, never the superseded loser id
    expect(results[0].displayName).toBe(UCL_WINNER_NAME);
  });

  test("a normal (non-duplicated) university search is unaffected by the exclusion", async () => {
    const supabase = createMockSupabase({
      rpcResult: [
        {
          entity_id: "id-yale",
          entity_type: "university",
          canonical_name: "Yale University",
          display_name: "Yale University",
          country_code: "US",
          city: "New Haven",
          verification_state: "verified",
          matched_text: "Yale University",
          matched_via: "canonical",
          score: 1.0,
        },
      ],
      universitiesRows: [{ id: "univ-yale", name: "Yale University", city: "New Haven", country: "United States", institution_type: "private", canonical_entity_id: "id-yale" }],
    });

    const results = await searchEntities(supabase, "university", "Yale", {});
    expect(results).toEqual([{ id: "univ-yale", displayName: "Yale University", subtitle: "New Haven, United States · private", isCustom: false }]);
  });

  test("a canonical entity with no matching universities row (not yet ingested) drops out rather than producing a broken result", async () => {
    const supabase = createMockSupabase({
      rpcResult: [
        {
          entity_id: "id-unlinked",
          entity_type: "university",
          canonical_name: "Some Unlinked University",
          display_name: "Some Unlinked University",
          country_code: null,
          city: null,
          verification_state: "verified",
          matched_text: "Some Unlinked University",
          matched_via: "canonical",
          score: 1.0,
        },
      ],
      universitiesRows: [], // no `universities` row carries this canonical_entity_id yet
    });

    const results = await searchEntities(supabase, "university", "Some Unlinked", {});
    expect(results).toEqual([]);
  });
});

describe("searchEntities — minimum query length short-circuit", () => {
  test("a query below the minimum length never reaches the database", async () => {
    const supabase = createMockSupabase({ rpcResult: [] });
    const results = await searchEntities(supabase, "school", "a", {});
    expect(results).toEqual([]);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
