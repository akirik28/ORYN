import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DataStatus } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Phase 30 Job E — stale data detection.
 *
 * Recomputes `data_status` (Phase 29: fresh | stale | needs_review | unavailable) for
 * `universities`, `university_requirements` and `university_deadlines` from how long it has
 * been since each row was last substantiated, against a per-table refresh interval (Phase
 * 29: "Deadlines and active opportunities need more frequent refreshes than static
 * institution details" — `university_deadlines` carries the shortest threshold of the three
 * for exactly that reason).
 *
 * WHAT THIS JOB IS: a pure, stored-data-only recompute. It reads timestamps already on the
 * row, decides whether the age crosses this table's threshold, and writes `data_status`.
 * No network call, no source re-fetch, no AI call — the same "detection, not re-verification"
 * split Job C (sync-university-data, the RE-FETCH side for US institutions via College
 * Scorecard) already draws against this job (the AUDIT side, for every institution
 * regardless of country).
 *
 * WHAT THIS JOB IS NOT, AND WHY THAT BOUNDARY IS LOAD-BEARING
 *
 * `lib/opportunities/lifecycle.ts` documents a shape no date-only rule can catch: a record
 * that goes stale (closed, changed, withdrawn) with no corresponding edit to any stored
 * timestamp. Its own words: "No date-only rule can catch the shape — it requires either a
 * researcher reading the source page, or a scheduled re-verification job that re-fetches
 * source_url and checks for closure language." This job is exactly a date-only rule. It
 * inherits that blind spot completely, for all three tables in its remit, not just
 * opportunities: a requirement whose institution quietly changed its admissions policy, or
 * a university whose website moved, looks precisely as "fresh" as one that is still
 * accurate, right up until this job's age threshold happens to cross. Age is a proxy for
 * risk, never a measurement of truth — this job can raise "worth re-checking," and nothing
 * this job does can raise or lower confidence that a `fresh`-aged row is actually correct.
 * docs/opportunity-reverification-job-design-2026-08-23.md names the same distinction as
 * "provenance and liveness are orthogonal" and is worth reading in full for how sharp that
 * gap can be (ISSYP: perfect source-quality evidence, zero liveness — dead since 2023 with
 * nothing in any stored field saying so).
 *
 * That design doc is also why `opportunities` is NOT in this job's scope, deliberately, not
 * by oversight: `opportunities` has no `data_status` column at all (a different, evidence-
 * based tracking system lives there instead — `verified_at` / `last_verified_at` /
 * `verification_state`, see lifecycle.ts), and the doc above already fully designs the
 * right job for that table's freshness — `opportunity_reverification`, implementing Phase
 * 30 Job B and Job E together for opportunities specifically. That job needs a live source
 * re-fetch (Tavily) to do anything a stored-data recompute like this one structurally
 * cannot: actually look at the current page. It is designed, unbuilt, and a materially
 * larger effort (row-level leases, a new runs table, retry/backoff tiers) than this one.
 * Building a shortcut version of it here — inferring opportunity liveness from stored dates
 * alone — would silently misrepresent exactly the guarantee that design doc exists to make
 * honestly instead.
 *
 * `university_deadlines` IS in scope (added 2026-09-02) — migration 0074 gives it the
 * identical `data_status`/`last_checked_at` columns as `university_requirements` ("same
 * enum, same meanings... a reader who knows one table now knows the other"), and that
 * migration turned out to already be live (an earlier version of this comment said it
 * wasn't, going by `list_migrations`; that tool is unreliable relative to the live
 * schema — direct-probed and confirmed applied before writing this extension, not trusted
 * on the earlier report). This job's own scope here is narrow on purpose, the same way it's
 * narrow for the other two tables: deciding a deadline record is old enough to need
 * rechecking. It says nothing about whether a specific deadline's VALUE has actually
 * changed since it was last checked — that is a genuinely different question (an ingest-time
 * comparator's job, not an age-based sweep's), answered elsewhere in this codebase, not
 * duplicated here.
 *
 * WHAT THE RECOMPUTE ITSELF DOES AND DOES NOT DO
 *
 * Only ever moves a row between `fresh` and `stale`. `needs_review` and `unavailable` are
 * judgment calls a human or another pipeline made for a reason this job has no visibility
 * into (measured live, 2026-09-01: all 734 `needs_review` universities already carry a
 * `last_checked_at` from the same bulk-creation pass as their `fresh` siblings — the status
 * split is about something other than age, most likely completeness/confidence at creation
 * — so recomputing `needs_review` rows by age alone would overwrite a real signal with a
 * wrong one). A row already `needs_review` or `unavailable` is read (it counts toward
 * `checked`) but never written. `university_deadlines` currently has no rows in either state
 * (measured live, 2026-09-02: all 470 rows are `fresh`) — the protection still applies going
 * forward, it just has nothing to protect yet.
 *
 * The age reference is the best real timestamp available, in order: `last_checked_at` (set
 * by Job C for US universities on every sync, and by the couple of pipelines that stamp it
 * at insert — lib/requirements/discover.ts, the admin add-requirement action); else, for
 * requirements, `retrieved_at` (the research corpus's own "this was verbatim-sourced on
 * this date" field — real provenance, just not this column's usual name for it; the two
 * ingest pipelines behind most of tonight's requirement rows, lib/requirements/ingest.ts and
 * its deadlines sibling, write `retrieved_at` and deliberately do not write
 * `last_checked_at` at all); else `created_at`, which every row has by construction.
 * `university_deadlines` has no `retrieved_at`-equivalent column (migration 0074 added only
 * `last_checked_at`/`data_status`), so its own fallback is the two-level
 * `last_checked_at ?? created_at` chain, same as `universities`. Never invented, never
 * backfilled — this job writes `data_status` only, and only when the
 * recomputed value differs from what is already stored.
 */

// Reasoned starting policy, not a validated one — deliberately shorter than universities'
// threshold (an admissions requirement changes more often than an institution's name,
// country or type). Adjust freely; nothing else in this codebase depends on these exact
// numbers.
export const UNIVERSITY_STALE_AFTER_DAYS = 90;
export const UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS = 60;

// Shorter again than requirements — a deadline is the field that goes stale fastest and
// hurts most when it does (migration 0074's own comment: "Eight UK medicine/dentistry/
// veterinary targets showed students 13 January when the real date was 15 October"). Picked
// deliberately, not backed into: live data (2026-09-02) shows all 470 rows created within
// the last 16 days and zero older than 30, so this number happens to flag nothing on this
// job's very first run — that's confirmation a 30-day cadence is sane for a batch this
// recent, not the reason 30 was chosen. A 7-day threshold would have flagged 438 of 470
// rows simultaneously on day one, which is honest (every one of them genuinely has never
// been checked) but not a useful first signal — nothing new is learned by flagging a batch
// for being exactly as unchecked as it always was the moment it was loaded.
export const UNIVERSITY_DEADLINE_STALE_AFTER_DAYS = 30;

const PAGE_SIZE = 1000;

export interface StaleDataChange {
  table: "universities" | "university_requirements" | "university_deadlines";
  id: string;
  from: DataStatus;
  to: DataStatus;
}

/**
 * The one piece of actual decision logic, kept pure and exported so it can be tested
 * directly against fixed clocks rather than through a live table scan.
 *
 * Returns the status this row should have, or null when no write is needed — either
 * because the row is outside this function's remit (`needs_review` / `unavailable`, see
 * this file's own top comment) or because the recomputed value already matches what is
 * stored.
 */
export function recomputeDataStatus(current: DataStatus, ageReferenceIso: string, thresholdDays: number, now: Date = new Date()): DataStatus | null {
  if (current !== "fresh" && current !== "stale") return null;

  const ageMs = now.getTime() - Date.parse(ageReferenceIso);
  const ageDays = ageMs / 86_400_000;
  const next: DataStatus = ageDays > thresholdDays ? "stale" : "fresh";
  return next === current ? null : next;
}

interface UniversityFreshnessRow {
  id: string;
  data_status: DataStatus;
  last_checked_at: string | null;
  created_at: string;
}

/**
 * Full-table scan, paginated: PostgREST caps an unpaginated read at 1000 rows with a 200
 * status and no error (see lib/acquisition/paginate.ts's own account of the bug this exact
 * silent truncation caused before). `universities` is 1019 rows and `university_requirements`
 * is 1325 as of 2026-09-01 — both already past the cap, so pagination here is a correctness
 * requirement today, not future-proofing.
 */
export async function detectStaleUniversities(supabase: SupabaseClient<Database>, now: Date = new Date()): Promise<{ changes: StaleDataChange[]; checked: number }> {
  const changes: StaleDataChange[] = [];
  let checked = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("universities")
      .select("id, data_status, last_checked_at, created_at")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`detectStaleUniversities: read failed at offset ${from}: ${error.message}`);
    const page = (data ?? []) as UniversityFreshnessRow[];
    checked += page.length;

    for (const row of page) {
      const ageReference = row.last_checked_at ?? row.created_at;
      const next = recomputeDataStatus(row.data_status, ageReference, UNIVERSITY_STALE_AFTER_DAYS, now);
      if (next === null) continue;
      const { error: updateError } = await supabase.from("universities").update({ data_status: next }).eq("id", row.id);
      if (updateError) throw new Error(`detectStaleUniversities: update failed for ${row.id}: ${updateError.message}`);
      changes.push({ table: "universities", id: row.id, from: row.data_status, to: next });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return { changes, checked };
}

interface RequirementFreshnessRow {
  id: string;
  data_status: DataStatus;
  last_checked_at: string | null;
  retrieved_at: string | null;
  created_at: string;
}

export async function detectStaleUniversityRequirements(supabase: SupabaseClient<Database>, now: Date = new Date()): Promise<{ changes: StaleDataChange[]; checked: number }> {
  const changes: StaleDataChange[] = [];
  let checked = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("university_requirements")
      .select("id, data_status, last_checked_at, retrieved_at, created_at")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`detectStaleUniversityRequirements: read failed at offset ${from}: ${error.message}`);
    const page = (data ?? []) as RequirementFreshnessRow[];
    checked += page.length;

    for (const row of page) {
      const ageReference = row.last_checked_at ?? row.retrieved_at ?? row.created_at;
      const next = recomputeDataStatus(row.data_status, ageReference, UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS, now);
      if (next === null) continue;
      const { error: updateError } = await supabase.from("university_requirements").update({ data_status: next }).eq("id", row.id);
      if (updateError) throw new Error(`detectStaleUniversityRequirements: update failed for ${row.id}: ${updateError.message}`);
      changes.push({ table: "university_requirements", id: row.id, from: row.data_status, to: next });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return { changes, checked };
}

interface DeadlineFreshnessRow {
  id: string;
  data_status: DataStatus;
  last_checked_at: string | null;
  created_at: string;
}

/**
 * Same shape as detectStaleUniversities exactly — two-level fallback
 * (`last_checked_at ?? created_at`), no `retrieved_at`-equivalent column exists on this
 * table. 470 rows live as of 2026-09-02, well under the pagination threshold that made
 * pagination load-bearing for the other two scanners — kept paginated anyway for the same
 * reason those two are: consistency with an already-correct pattern costs nothing and this
 * table has already grown once (85 rows added in one batch, 2026-08-31) and will again.
 */
export async function detectStaleUniversityDeadlines(supabase: SupabaseClient<Database>, now: Date = new Date()): Promise<{ changes: StaleDataChange[]; checked: number }> {
  const changes: StaleDataChange[] = [];
  let checked = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("university_deadlines")
      .select("id, data_status, last_checked_at, created_at")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`detectStaleUniversityDeadlines: read failed at offset ${from}: ${error.message}`);
    const page = (data ?? []) as DeadlineFreshnessRow[];
    checked += page.length;

    for (const row of page) {
      const ageReference = row.last_checked_at ?? row.created_at;
      const next = recomputeDataStatus(row.data_status, ageReference, UNIVERSITY_DEADLINE_STALE_AFTER_DAYS, now);
      if (next === null) continue;
      const { error: updateError } = await supabase.from("university_deadlines").update({ data_status: next }).eq("id", row.id);
      if (updateError) throw new Error(`detectStaleUniversityDeadlines: update failed for ${row.id}: ${updateError.message}`);
      changes.push({ table: "university_deadlines", id: row.id, from: row.data_status, to: next });
    }
    if (page.length < PAGE_SIZE) break;
  }
  return { changes, checked };
}

/**
 * Entry point for the job route. Runs all three table scans and returns the shape
 * lib/jobs/run-with-tracking.ts expects: `itemsProcessed` is the count that belongs in
 * `external_sync_jobs.items_processed` (rows actually changed — the meaningful outcome,
 * matching deadline-reminders' own `itemsProcessed: notified` rather than a raw scan count),
 * `result` is the full JSON response body.
 */
export async function detectStaleData(now: Date = new Date()): Promise<{ itemsProcessed: number; result: { changed: number; checked: number; byTable: Record<string, { changed: number; checked: number }> } }> {
  const supabase = createAdminClient();
  const [universities, requirements, deadlines] = await Promise.all([
    detectStaleUniversities(supabase, now),
    detectStaleUniversityRequirements(supabase, now),
    detectStaleUniversityDeadlines(supabase, now),
  ]);

  const changed = universities.changes.length + requirements.changes.length + deadlines.changes.length;
  const checked = universities.checked + requirements.checked + deadlines.checked;

  return {
    itemsProcessed: changed,
    result: {
      changed,
      checked,
      byTable: {
        universities: { changed: universities.changes.length, checked: universities.checked },
        university_requirements: { changed: requirements.changes.length, checked: requirements.checked },
        university_deadlines: { changed: deadlines.changes.length, checked: deadlines.checked },
      },
    },
  };
}
