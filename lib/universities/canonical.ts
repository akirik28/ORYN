/**
 * Canonical active-university read model.
 *
 * The gap this closes: `merge_canonical_entities()` (Phase 2, University Intelligence Spine)
 * merges the IDENTITY layer only — both sides of a merge end up pointing at the same
 * `canonical_entities` row, but it deliberately never touches `universities` itself, so both
 * `universities` rows keep existing (needed for FK safety: `university_programs` and friends
 * reference `universities(id) on delete cascade`, and some of those rows carry real,
 * irreplaceable data on one side of a pair). Every product surface that reads `universities`
 * filtered by `canonical_entity_id` (search, browse, anything joining through the entity) will
 * therefore surface BOTH rows for one real institution — this is the literal mechanism behind
 * the reported bug ("UCL" search returning both "UCL" and "University College London").
 *
 * The architecturally correct fix is `universities.duplicate_status` / `superseded_by_id`
 * (migration 0043_university_duplicate_supersession.sql). **Status as of 2026-08-22: live and
 * DB-native.** `duplicate_status` ('canonical' | 'superseded') and `superseded_by_id` are
 * populated for all 9 known pairs, re-verified directly against `oryn-qa-scratch` before this
 * module was switched over (canonical=1010, superseded=9, every id matched what used to be
 * this module's static JSON snapshot exactly). This module now queries those live columns —
 * it no longer reads a generated build artifact.
 *
 * What changed from the JSON-snapshot version: the old `isSupersededUniversityId(id)` /
 * `canonicalUniversityId(id)` / `getSupersededUniversityIds()` / `excludeSupersededUniversities(rows)`
 * were plain synchronous functions closing over a module-level constant loaded from
 * `duplicate-supersessions.json` at build time. A DB-native replacement is unavoidably async (it's
 * a network round trip), so this was a genuine call-site-by-call-site refactor, not a drop-in
 * internals swap — every consumer needed its own update, some by loading the map once per
 * request/script and passing it to already-synchronous helpers (`.map()`/`.filter()` callbacks
 * can't trivially become async), others by loading it directly where a single id needed resolving.
 *
 *   1. `loadSupersessionMap(supabase)` — for every call site that already holds a
 *      `SupabaseClient<Database>` (every app/lib call site, most scripts). Issues one
 *      `.eq("duplicate_status", "superseded")` query and returns a `loserId -> { winnerId }` map.
 *   2. `loadSupersessionMapViaRest(target)` — for the university-acquisition scripts, which use
 *      the raw-REST `PostgrestTarget` convention (`lib/acquisition/paginate.ts`) rather than a
 *      supabase-js client for reads, so they never had one to pass to (1).
 *   3. The four query-shaped helpers below (`isSupersededUniversityId`, `canonicalUniversityId`,
 *      `getSupersededUniversityIds`, `excludeSupersededUniversities`) are still pure and
 *      synchronous, unchanged in spirit from the JSON-snapshot version — they just take the
 *      freshly loaded map as their first argument instead of closing over a module constant.
 *      Call (1) or (2) once per request/script/function, then use these exactly like before.
 *
 * There is no longer a generation step to keep in sync — `scripts/resolve-university-duplicates.ts`
 * (whose only job was producing the now-deleted JSON file) was retired along with the file. A new
 * pair merged via `merge_canonical_entities()` just needs `duplicate_status`/`superseded_by_id` set
 * on the losing `universities` row (see `scripts/university-duplicates-audit.ts --supersede` for the
 * existing tool that does this) — every read path here picks it up on the next query, nothing to
 * regenerate.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { PostgrestTarget } from "@/lib/acquisition/paginate";
import { fetchAllRowsVerified } from "@/lib/acquisition/paginate";

export interface SupersessionEntry {
  /** The `universities.id` a student should actually see. */
  winnerId: string;
}

/** `universities.id` (loser) -> its supersession entry. Load fresh via `loadSupersessionMap`
 * or `loadSupersessionMapViaRest` once per request/script/function; the helpers below are pure
 * functions over whatever map you pass them, so a stale map is only ever as stale as your own
 * call site chose to let it be — there is no shared, implicitly-cached copy anywhere in this
 * module. `ReadonlyMap` because nothing downstream should be mutating another call site's map. */
export type SupersessionMap = ReadonlyMap<string, SupersessionEntry>;

function toMap(rows: { id: string; superseded_by_id: string | null }[]): SupersessionMap {
  const map = new Map<string, SupersessionEntry>();
  for (const row of rows) {
    // superseded_by_id is only ever null when duplicate_status='canonical' (the DB's own
    // universities_superseded_consistency check enforces this) — every row here already came
    // from a duplicate_status='superseded' filter, so this guard is defensive, not expected to
    // ever actually trigger. Skipping rather than throwing keeps one malformed row from taking
    // down every other correct one.
    if (row.superseded_by_id) map.set(row.id, { winnerId: row.superseded_by_id });
  }
  return map;
}

/**
 * Loads the current superseded -> canonical mapping via a `SupabaseClient` — the right choice
 * for every app/lib call site and any script that already constructs one. On a query failure,
 * logs and returns an empty map (fails OPEN: "no known supersessions") rather than throwing —
 * consistent with how every existing call site already treats "no exclusion list" as the safe
 * default when this data was simply absent, and matches Rule 8 (external/DB hiccups must not
 * crash the page) more closely than surfacing a hard error over 9 rows on an indexed column
 * would justify. A prolonged outage here degrades to "duplicate cards can reappear," not a
 * broken page — an acceptable, visible, non-corrupting failure mode.
 */
export async function loadSupersessionMap(supabase: SupabaseClient<Database>): Promise<SupersessionMap> {
  const { data, error } = await supabase.from("universities").select("id, superseded_by_id").eq("duplicate_status", "superseded");
  if (error) {
    console.error("[universities] loadSupersessionMap failed — treating as no known supersessions", { code: error.code, message: error.message });
    return new Map();
  }
  return toMap(data ?? []);
}

/**
 * Same contract as `loadSupersessionMap`, for the university-acquisition scripts that read via
 * the raw-REST `PostgrestTarget` convention (`lib/acquisition/paginate.ts`) instead of a
 * supabase-js client. Unlike `loadSupersessionMap` this does NOT fail open on error —
 * `fetchAllRowsVerified` throws on a short/failed read, and an acquisition script's own
 * candidate-pool construction should stop rather than silently proceed as if no university were
 * ever superseded (an ingestion script writing real data is exactly the case Rule 4/34 — never
 * silently manufacture or silently drop a value — argues for failing loud, not open).
 */
export async function loadSupersessionMapViaRest(target: PostgrestTarget): Promise<SupersessionMap> {
  const { rows } = await fetchAllRowsVerified<{ id: string; superseded_by_id: string | null }>(
    target,
    "universities",
    "id,superseded_by_id",
    "duplicate_status=eq.superseded&order=id.asc"
  );
  return toMap(rows);
}

/** True when `id` is a known-duplicate `universities` row that a product surface must not
 * show independently — its data should still be reachable (FKs, history), just not as its
 * own selectable card/result. */
export function isSupersededUniversityId(map: SupersessionMap, id: string): boolean {
  return map.has(id);
}

/** The id a product surface should actually display for `id` — itself, unless `id` is a known
 * loser, in which case the winner's id. Never throws on an unknown id (most ids aren't
 * duplicates at all, which is the common case, not an error). */
export function canonicalUniversityId(map: SupersessionMap, id: string): string {
  return map.get(id)?.winnerId ?? id;
}

/** Every `universities.id` currently superseded by another row. Use with `.not("id", "in", ...)`
 * (or equivalent) on any query that lists/searches universities directly, so a losing row never
 * reaches a result set in the first place — cheaper and more robust than filtering client-side
 * after the fact. */
export function getSupersededUniversityIds(map: SupersessionMap): string[] {
  return [...map.keys()];
}

/** Drops any row in `rows` whose id is a known-superseded duplicate. For call sites that
 * already fetched rows some other way (a join, a batch-fetch-by-id helper) and can't easily
 * add a `.not("id", "in", ...)` clause to the original query — prefer filtering in the query
 * itself (`getSupersededUniversityIds()`) when possible; this is the fallback for when the
 * query is out of the caller's control. */
export function excludeSupersededUniversities<T extends { id: string }>(map: SupersessionMap, rows: T[]): T[] {
  return rows.filter((row) => !map.has(row.id));
}

// ---------------------------------------------------------------------------
// Winner selection (pure — used by scripts/university-duplicates-audit.ts's --supersede path
// and unit-tested directly). Out of scope for the live-column read-side refactor above: this
// is identity/merge-adjacent decision logic (which of two already-confirmed-identical rows a
// product surface should show), not a read helper, and untouched here per that boundary.
// ---------------------------------------------------------------------------

export interface DuplicateCandidate {
  id: string;
  name: string;
  /** Count of rows referencing this university across every FK'd table
   * (university_programs, university_requirements, university_statistics,
   * university_deadlines, university_sources, target_universities, university_rankings,
   * university_profile_metrics) — the strongest available signal for "which row is the one
   * real product data actually accumulated on." */
  totalReferences: number;
  hasWebsiteUrl: boolean;
  createdAt: string;
}

/**
 * Deterministic winner among two or more `universities` rows already confirmed to be the same
 * real institution (same `canonical_entity_id`). Never guesses identity — that decision already
 * happened upstream, via `merge_canonical_entities()` backed by ROR/external-id evidence. This
 * only decides which already-confirmed-identical row is the one a student should see.
 *
 * Order of signals, each only consulted when the previous one ties:
 *   1. Most FK references wins — directly measures which row real product data landed on.
 *      Verified this is NOT predictable from naming alone: KFUPM's parenthetical-suffixed row
 *      ("King Fahd University of Petroleum and Minerals (KFUPM)") is the data-rich winner while
 *      the bare acronym "KFUPM" is the thin one — the opposite of the MIT/UCL cases where the
 *      full descriptive name won. A naming heuristic alone would get real cases wrong.
 *   2. Has a `website_url` — a real signal a row carries more of its own record, not just
 *      passed through least-effort during creation.
 *   3. Name has no parenthetical acronym suffix and no leading "The " — prefers the cleaner,
 *      ROR-convention-matching form when the data signals above are exactly tied (this session's
 *      ROR-derived names never carry either).
 *   4. Earliest `createdAt` — final deterministic tiebreak so the function never needs to guess;
 *      ties this far down mean the two rows are genuinely indistinguishable by any available
 *      signal, so preferring whichever was created first is at least reproducible.
 */
export function pickCanonicalWinner(candidates: DuplicateCandidate[]): DuplicateCandidate {
  if (candidates.length === 0) throw new Error("pickCanonicalWinner: no candidates");
  if (candidates.length === 1) return candidates[0];

  const cleanliness = (name: string): number => {
    const hasParenthetical = /\([^)]*\)\s*$/.test(name);
    const hasLeadingThe = /^the\s+/i.test(name);
    return (hasParenthetical ? 0 : 1) + (hasLeadingThe ? 0 : 1);
  };

  const sorted = [...candidates].sort((a, b) => {
    if (a.totalReferences !== b.totalReferences) return b.totalReferences - a.totalReferences;
    if (a.hasWebsiteUrl !== b.hasWebsiteUrl) return a.hasWebsiteUrl ? -1 : 1;
    const cleanA = cleanliness(a.name);
    const cleanB = cleanliness(b.name);
    if (cleanA !== cleanB) return cleanB - cleanA;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return sorted[0];
}
