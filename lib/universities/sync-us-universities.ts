import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { collegeScorecardProvider } from "@/lib/providers/college-scorecard";
import { isUndefinedColumnError } from "@/lib/supabase/errors";

export interface SyncResult {
  schoolName: string;
  status: "created" | "updated" | "not_found" | "error";
  detail?: string;
}

/** Escapes `%`/`_`/`\` so a name is matched literally (case-insensitively) rather than
 * as a LIKE pattern — `school.name` comes from an external provider response, not a
 * value this codebase controls, so it shouldn't be trusted to contain no wildcard
 * characters even though nothing in the current `DEFAULT_US_UNIVERSITIES` list does. */
function escapeLikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}

/** The fields this sync actually writes to `universities` (see universityPayload below) —
 * shared type so the comparator and the payload can never silently drift apart. */
interface ComparableUniversityFields {
  name: string;
  city: string | null;
  institution_type: string | null;
  website_url: string | null;
  student_size: number | null;
  external_ids: Record<string, unknown>;
}

/**
 * Whether a fresh College Scorecard read differs from what's already stored, for any field
 * this sync is capable of writing — pure, no I/O, so it's directly testable without a
 * database. Exists because `last_changed_at` is a real signal something downstream reads
 * (lib/universities/data-change-scan.ts, Phase 24's university_data_changed notification):
 * before this function existed, syncOne stamped `last_changed_at: now` on every run
 * unconditionally, insert or update, whether or not any field actually differed — which
 * would have made that column mean "was last synced", not "last changed", and made the
 * notification fire on every scheduled Job C run regardless of whether a student's tracked
 * university had anything new to report. `external_ids` is compared by value (JSON.stringify
 * on both sides, same shape either way since this function only ever receives what
 * `universityPayload` itself builds) rather than by reference, since a fresh object literal
 * is never `===` to a previously-stored one even when their contents are identical.
 */
export function hasUniversityDataChanged(existing: ComparableUniversityFields, incoming: ComparableUniversityFields): boolean {
  return (
    existing.name !== incoming.name ||
    existing.city !== incoming.city ||
    existing.institution_type !== incoming.institution_type ||
    existing.website_url !== incoming.website_url ||
    existing.student_size !== incoming.student_size ||
    JSON.stringify(existing.external_ids) !== JSON.stringify(incoming.external_ids)
  );
}

/** The fields this sync actually writes to `university_statistics` — same "shared type so
 * the comparator and the payload can never silently drift apart" reasoning as
 * ComparableUniversityFields above. */
interface ComparableStatisticsFields {
  admission_rate: number | null;
  sat_range_low: number | null;
  sat_range_high: number | null;
  act_range_low: number | null;
  act_range_high: number | null;
  graduation_rate: number | null;
  cost_of_attendance: number | null;
}

/**
 * Same role as hasUniversityDataChanged, for university_statistics (migration 0080 gives
 * that table its own last_changed_at). `cost_currency`/`source`/`data_confidence` are
 * deliberately not compared: they are this sync's own fixed constants for every US row
 * ("USD"/"College Scorecard"/"high"), never a fact that varies between reads, so including
 * them could only ever produce a spurious "changed" reading against itself.
 */
export function hasStatisticsChanged(existing: ComparableStatisticsFields, incoming: ComparableStatisticsFields): boolean {
  return (
    existing.admission_rate !== incoming.admission_rate ||
    existing.sat_range_low !== incoming.sat_range_low ||
    existing.sat_range_high !== incoming.sat_range_high ||
    existing.act_range_low !== incoming.act_range_low ||
    existing.act_range_high !== incoming.act_range_high ||
    existing.graduation_rate !== incoming.graduation_rate ||
    existing.cost_of_attendance !== incoming.cost_of_attendance
  );
}

/**
 * Upserts one U.S. university from College Scorecard into universities +
 * university_statistics + university_sources (Phase 30 Job C: university data
 * freshness). Matches existing rows by (lower(name), country) per the unique index on
 * universities — a name that doesn't already exist creates a new row.
 */
async function syncOne(schoolName: string): Promise<SyncResult> {
  const result = await collegeScorecardProvider.searchByName(schoolName, 1);
  if (!result.success) {
    return { schoolName, status: "error", detail: result.error.message };
  }
  const school = result.data[0];
  if (!school) {
    return { schoolName, status: "not_found" };
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("universities")
    .select("id, name, city, institution_type, website_url, student_size, external_ids")
    .ilike("name", escapeLikePattern(school.name))
    .eq("country", "United States")
    .maybeSingle();

  // College Scorecard doesn't provide description/logo/selectivity/coordinates at all —
  // these are deliberately absent from the shared payload rather than set to `null`, so
  // an update never wipes a value an admin (or a future richer provider) already set on
  // an existing row. A brand-new row still gets them as `null` implicitly (no explicit
  // value = the column's own default), identical to the previous behavior for inserts.
  const incomingFields = {
    name: school.name,
    city: school.city,
    institution_type: school.institutionType,
    website_url: school.websiteUrl ? normalizeUrl(school.websiteUrl) : null,
    student_size: school.studentSize,
    external_ids: { college_scorecard_id: school.collegeScorecardId },
  };

  // last_checked_at always advances -- a check genuinely happened this run regardless of
  // outcome. last_changed_at only advances when something actually differs from the
  // stored row (hasUniversityDataChanged, above) -- an unconditional stamp here is what
  // this fix removes, since a downstream reader (the university_data_changed notification
  // scan) treats last_changed_at as "this fact became true," not "this row was re-synced."
  const sharedFields = {
    ...incomingFields,
    country: "United States",
    data_confidence: "high" as const,
    data_status: "fresh" as const,
    last_checked_at: now,
  };

  let universityId: string;
  if (existing) {
    universityId = existing.id;
    // last_changed_at is spread in only when something actually differs -- omitting the
    // key entirely (rather than assigning it `undefined`) both satisfies UniversityUpdate's
    // `string | null` typing and, more importantly, is what actually leaves the column
    // untouched: PostgREST only writes columns present in the payload.
    const changed = hasUniversityDataChanged(existing, incomingFields);
    const { error: updateError } = await supabase
      .from("universities")
      .update({ ...sharedFields, ...(changed ? { last_changed_at: now } : {}) })
      .eq("id", universityId);
    if (updateError) return { schoolName, status: "error", detail: updateError.message };
  } else {
    // A brand-new row's own creation is its first "change" -- always stamped, same as
    // scripts/expand-university-spine.ts's own convention for a freshly-created row.
    const { data: inserted, error } = await supabase
      .from("universities")
      .insert({ ...sharedFields, last_changed_at: now })
      .select()
      .single();
    if (error || !inserted) return { schoolName, status: "error", detail: error?.message ?? "insert failed" };
    universityId = inserted.id;
  }

  // Upsert, not insert: migration 0032 added a (university_id, stat_year) unique index
  // specifically because a bare insert here duplicated a new statistics row on every
  // re-sync of the same school in the same year instead of updating it in place.
  const statYear = new Date().getFullYear();
  const incomingStats: ComparableStatisticsFields = {
    admission_rate: school.admissionRate,
    sat_range_low: school.satMathRange && school.satReadingRange ? school.satMathRange[0] + school.satReadingRange[0] : null,
    sat_range_high: school.satMathRange && school.satReadingRange ? school.satMathRange[1] + school.satReadingRange[1] : null,
    act_range_low: school.actRange?.[0] ?? null,
    act_range_high: school.actRange?.[1] ?? null,
    graduation_rate: school.graduationRate,
    cost_of_attendance: school.costOfAttendance,
  };
  const { data: existingStats } = await supabase
    .from("university_statistics")
    .select("admission_rate, sat_range_low, sat_range_high, act_range_low, act_range_high, graduation_rate, cost_of_attendance")
    .eq("university_id", universityId)
    .eq("stat_year", statYear)
    .maybeSingle();
  // Same last_changed_at discipline as universities above: only advance it when a number
  // actually differs from what this exact (university, stat_year) row already holds, not
  // on every scheduled re-sync regardless of outcome.
  const statsChanged = !existingStats || hasStatisticsChanged(existingStats, incomingStats);
  const statsPayload = {
    university_id: universityId,
    stat_year: statYear,
    ...incomingStats,
    cost_currency: "USD",
    source: "College Scorecard",
    data_confidence: "high" as const,
    retrieved_at: now,
  };
  const { error: statsError } = await supabase
    .from("university_statistics")
    .upsert({ ...statsPayload, ...(statsChanged ? { last_changed_at: now } : {}) }, { onConflict: "university_id,stat_year" });
  if (statsError && isUndefinedColumnError(statsError, "last_changed_at")) {
    // Found 2026-09-02 (oryn-3f's unapplied-migration sweep, verified by CEO and independently
    // confirmed live above): this call used to check neither `error` nor `data` at all, so this
    // exact rejection -- Postgres refusing the whole upsert because last_changed_at doesn't
    // exist on university_statistics yet -- was completely invisible, and statsChanged is true
    // for both a real change AND `!existingStats`, i.e. every first-time sync. It would have
    // silently blocked US institution statistics from ever being written the first time Job C
    // runs, with the job still reporting success. Degrading (not throwing) matches
    // lib/plan/persist.ts's rule: losing the change-notification signal is acceptable, losing
    // the statistics themselves is not.
    console.warn("[sync-us-universities] university_statistics.last_changed_at not yet live (migration 0080 unapplied) -- retrying without it", { universityId, statYear });
    const { error: retryError } = await supabase
      .from("university_statistics")
      .upsert(statsPayload, { onConflict: "university_id,stat_year" });
    if (retryError) return { schoolName, status: "error", detail: retryError.message };
  } else if (statsError) {
    return { schoolName, status: "error", detail: statsError.message };
  }

  // Same reasoning: migration 0032 added a (university_id, source_url) unique index so
  // this doesn't accumulate a duplicate source row on every re-sync. Logged, not failed: the
  // university identity and statistics rows above already saved successfully by this point,
  // and a citation write is provenance metadata for those facts, not the fact itself --
  // flipping the whole sync to "error" over a citation failure would misreport a genuinely
  // successful sync in Job C's own error count (app/api/jobs/sync-university-data/route.ts).
  const { error: sourceError } = await supabase
    .from("university_sources")
    .upsert(
      {
        university_id: universityId,
        source_url: "https://collegescorecard.ed.gov/",
        source_domain: "collegescorecard.ed.gov",
        source_type: "government_dataset",
        confidence: "high",
        retrieved_at: now,
        raw_excerpt: null,
      },
      { onConflict: "university_id,source_url" }
    );
  if (sourceError) {
    console.error("[sync-us-universities] failed to write source citation", { universityId, error: sourceError.message });
  }

  return { schoolName, status: existing ? "updated" : "created" };
}

export async function syncUsUniversities(schoolNames: string[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];
  for (const name of schoolNames) {
    results.push(await syncOne(name));
  }
  return results;
}

/** A representative starting list spanning selectivity tiers — not exhaustive, meant to
 * seed real data on the first sync run. Expand freely; there's nothing special about this
 * particular set. */
export const DEFAULT_US_UNIVERSITIES = [
  "Harvard University",
  "Massachusetts Institute of Technology",
  "Stanford University",
  "Yale University",
  "Princeton University",
  "University of Pennsylvania",
  "Columbia University",
  "University of California-Berkeley",
  "University of California-Los Angeles",
  "University of Michigan-Ann Arbor",
  "New York University",
  "Boston University",
  "University of Texas at Austin",
  "University of Washington-Seattle Campus",
  "Ohio State University-Main Campus",
];
