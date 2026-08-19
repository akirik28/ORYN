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
 * The architecturally correct fix is `universities.superseded_by_id` (migration
 * 0043_university_duplicate_supersession.sql, already written, never applied — this
 * environment has no DDL access, only PostgREST reads/writes and existing RPCs; see
 * founder-blocked-backlog.md item 25). Until that migration can be applied, this module is
 * the same fix implemented at the application layer instead of the schema layer:
 *
 *   1. `scripts/resolve-university-duplicates.ts` finds every `canonical_entity_id` shared by
 *      more than one live `universities` row (this can ONLY happen for entities a human/session
 *      has already verified are the same institution via `merge_canonical_entities()` — this
 *      module never decides identity, only which of two already-confirmed-identical rows a
 *      product surface should show), scores each row with `pickCanonicalWinner`, and writes
 *      the losing → winning id mapping to `duplicate-supersessions.json` below.
 *   2. This module reads that generated file and exposes the primitives every read path needs:
 *      is this id superseded, what's its canonical id, filter a row list down to canonical-only.
 *
 * Upgrade path once DDL access exists: apply migration 0043, run a one-time script that writes
 * this same mapping into `superseded_by_id`/`duplicate_status`, then delete this file and
 * switch read paths to a `.is("duplicate_status", null)` (or equivalent) filter instead. Until
 * then, re-run the generation script whenever a new pair is merged via
 * `merge_canonical_entities()` — this file is a build artifact, not hand-maintained.
 */

import supersessionsData from "./duplicate-supersessions.json";

export interface SupersessionEntry {
  /** The `universities.id` a student should actually see. */
  winnerId: string;
  winnerName: string;
  loserName: string;
  /** Why this side won — kept for auditability, not read by the app. */
  reason: string;
}

const SUPERSESSIONS: Record<string, SupersessionEntry> = supersessionsData;

/** True when `id` is a known-duplicate `universities` row that a product surface must not
 * show independently — its data should still be reachable (FKs, history), just not as its
 * own selectable card/result. */
export function isSupersededUniversityId(id: string): boolean {
  return id in SUPERSESSIONS;
}

/** The id a product surface should actually display for `id` — itself, unless `id` is a known
 * loser, in which case the winner's id. Never throws on an unknown id (most ids aren't
 * duplicates at all, which is the common case, not an error). */
export function canonicalUniversityId(id: string): string {
  return SUPERSESSIONS[id]?.winnerId ?? id;
}

/** Every `universities.id` currently superseded by another row. Use with `.not("id", "in", ...)`
 * (or equivalent) on any query that lists/searches universities directly, so a losing row never
 * reaches a result set in the first place — cheaper and more robust than filtering client-side
 * after the fact. */
export function getSupersededUniversityIds(): string[] {
  return Object.keys(SUPERSESSIONS);
}

/** Drops any row in `rows` whose id is a known-superseded duplicate. For call sites that
 * already fetched rows some other way (a join, a batch-fetch-by-id helper) and can't easily
 * add a `.not("id", "in", ...)` clause to the original query — prefer filtering in the query
 * itself (`getSupersededUniversityIds()`) when possible; this is the fallback for when the
 * query is out of the caller's control. */
export function excludeSupersededUniversities<T extends { id: string }>(rows: T[]): T[] {
  return rows.filter((row) => !isSupersededUniversityId(row.id));
}

/** All current supersession entries — used by regression tests and the admin/audit surface,
 * not by ordinary product read paths (those want the functions above, not the raw map). */
export function allSupersessions(): Record<string, SupersessionEntry> {
  return SUPERSESSIONS;
}

// ---------------------------------------------------------------------------
// Winner selection (pure — used by the generation script, unit-tested directly)
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
