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
 * One field's own transition, in the vocabulary this whole fix is built on: `null`/`undefined`
 * on the "before" side is a fact becoming known for the first time, never a correction to a
 * fact that was already there. Shared by both classifiers below.
 */
type FieldTransition = "same" | "added" | "changed";

function fieldTransition(existingValue: unknown, incomingValue: unknown): FieldTransition {
  if (existingValue === incomingValue) return "same";
  return existingValue === null || existingValue === undefined ? "added" : "changed";
}

/**
 * 2026-09-05, the university-notification first-fill fix (CEO's own dispatch:
 * "Oxford hiçbir şey yapmadı, biz ilk kez baktık" — a stub row's core facts being written for
 * the first time and a genuine later correction were both simply "changed", so a student
 * tracking a university before it was ever fully researched got told the university itself
 * had updated its own information).
 *
 * Was `hasUniversityDataChanged` — a plain boolean. Renamed because a boolean can no longer
 * describe what this function decides: whether a fresh College Scorecard read differs from
 * what's stored (pure, no I/O, directly testable), AND, if so, whether that difference is
 * something becoming known for the first time or an existing fact changing. `null` means "no
 * relevant field differs at all" — the caller's existing "don't stamp anything" branch,
 * unchanged. A field going from a stub's unset value to a real one is `"added"`; ANY field
 * that already held a real, different value is `"changed"` — and one genuinely-changed field
 * makes the whole event `"changed"`, even alongside other fields becoming known for the first
 * time in the same sync, since a real correction is the stronger, more specific claim (same
 * precedence rule OpportunityStandingBadge already uses: a real exclusion outranks a caveat).
 * `external_ids` (an object, not a scalar) is compared by JSON value like before; an empty
 * object is treated as "no value yet", matching every other field's own null-as-unset
 * convention, since this sync never writes a genuinely empty-but-meaningful external_ids.
 */
export function classifyUniversityDataChange(existing: ComparableUniversityFields, incoming: ComparableUniversityFields): "added" | "changed" | null {
  const hasExistingExternalIds = Object.keys(existing.external_ids ?? {}).length > 0;
  const transitions: FieldTransition[] = [
    fieldTransition(existing.name, incoming.name),
    fieldTransition(existing.city, incoming.city),
    fieldTransition(existing.institution_type, incoming.institution_type),
    fieldTransition(existing.website_url, incoming.website_url),
    fieldTransition(existing.student_size, incoming.student_size),
    fieldTransition(hasExistingExternalIds ? JSON.stringify(existing.external_ids) : null, JSON.stringify(incoming.external_ids)),
  ];
  if (transitions.includes("changed")) return "changed";
  if (transitions.includes("added")) return "added";
  return null;
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
 * Same role as classifyUniversityDataChange, for university_statistics (migration 0080 gives
 * that table its own last_changed_at; migration 0143 gives it last_change_kind alongside it).
 * `cost_currency`/`source`/`data_confidence` are deliberately not compared: they are this
 * sync's own fixed constants for every US row ("USD"/"College Scorecard"/"high"), never a
 * fact that varies between reads, so including them could only ever produce a spurious
 * "changed" reading against itself.
 *
 * `existing: null` (2026-09-05, folded in from the call site's own former `!existingStats ||`
 * check) means no statistics row has ever existed for this (university, stat_year) at all —
 * the whole row is new, so the answer is unconditionally `"added"`, the same claim a single
 * field going from unset to real would make. This was already effectively true before this
 * fix, just written as "changed" by a call-site special case rather than as part of the
 * classification itself — CEO's own instruction named this exact branch as "bilerek yazılmış,
 * bilerek düzeltilecek" (written on purpose, to be fixed on purpose).
 */
export function classifyStatisticsDataChange(existing: ComparableStatisticsFields | null, incoming: ComparableStatisticsFields): "added" | "changed" | null {
  if (!existing) return "added";
  const transitions: FieldTransition[] = [
    fieldTransition(existing.admission_rate, incoming.admission_rate),
    fieldTransition(existing.sat_range_low, incoming.sat_range_low),
    fieldTransition(existing.sat_range_high, incoming.sat_range_high),
    fieldTransition(existing.act_range_low, incoming.act_range_low),
    fieldTransition(existing.act_range_high, incoming.act_range_high),
    fieldTransition(existing.graduation_rate, incoming.graduation_rate),
    fieldTransition(existing.cost_of_attendance, incoming.cost_of_attendance),
  ];
  if (transitions.includes("changed")) return "changed";
  if (transitions.includes("added")) return "added";
  return null;
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
    // last_changed_at/last_change_kind are spread in only when something actually differs --
    // omitting the keys entirely (rather than assigning `undefined`) both satisfies
    // UniversityUpdate's typing and, more importantly, is what actually leaves the columns
    // untouched: PostgREST only writes columns present in the payload.
    const changeKind = classifyUniversityDataChange(existing, incomingFields);
    const { error: updateError } = await supabase
      .from("universities")
      .update({ ...sharedFields, ...(changeKind ? { last_changed_at: now, last_change_kind: changeKind } : {}) })
      .eq("id", universityId);
    if (updateError && isUndefinedColumnError(updateError, "last_change_kind")) {
      // Same degrade-not-throw shape as the university_statistics.last_changed_at fallback
      // below (migration 0080's own history) -- migration 0143 (last_change_kind) may not be
      // live yet wherever this runs. Losing the added/changed distinction for this one sync is
      // acceptable; losing the university data itself is not.
      console.warn("[sync-us-universities] universities.last_change_kind not yet live (migration 0143 unapplied) -- retrying without it", { universityId });
      const { error: retryError } = await supabase
        .from("universities")
        .update({ ...sharedFields, ...(changeKind ? { last_changed_at: now } : {}) })
        .eq("id", universityId);
      if (retryError) return { schoolName, status: "error", detail: retryError.message };
    } else if (updateError) {
      return { schoolName, status: "error", detail: updateError.message };
    }
  } else {
    // A brand-new row's own creation is its first "change", and unambiguously an addition --
    // always stamped, same as scripts/expand-university-spine.ts's own convention for a
    // freshly-created row.
    const { data: inserted, error } = await supabase
      .from("universities")
      .insert({ ...sharedFields, last_changed_at: now, last_change_kind: "added" })
      .select()
      .single();
    if (error && isUndefinedColumnError(error, "last_change_kind")) {
      console.warn("[sync-us-universities] universities.last_change_kind not yet live (migration 0143 unapplied) -- retrying without it", { schoolName });
      const { data: retryInserted, error: retryError } = await supabase
        .from("universities")
        .insert({ ...sharedFields, last_changed_at: now })
        .select()
        .single();
      if (retryError || !retryInserted) return { schoolName, status: "error", detail: retryError?.message ?? "insert failed" };
      universityId = retryInserted.id;
    } else if (error || !inserted) {
      return { schoolName, status: "error", detail: error?.message ?? "insert failed" };
    } else {
      universityId = inserted.id;
    }
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
  // Same last_change_kind discipline as universities above: only advance it (and
  // last_changed_at) when a number actually differs from what this exact (university,
  // stat_year) row already holds, not on every scheduled re-sync regardless of outcome.
  // `existingStats ?? null` folds the former `!existingStats ||` special case into the
  // classifier itself -- see classifyStatisticsDataChange's own header for why.
  const statsChangeKind = classifyStatisticsDataChange(existingStats ?? null, incomingStats);
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
    .upsert({ ...statsPayload, ...(statsChangeKind ? { last_changed_at: now, last_change_kind: statsChangeKind } : {}) }, { onConflict: "university_id,stat_year" });
  if (statsError && isUndefinedColumnError(statsError, "last_change_kind")) {
    // Migration 0143 (last_change_kind) may not be live yet wherever this runs -- same
    // degrade-not-throw shape as the last_changed_at fallback just below, one column newer.
    console.warn("[sync-us-universities] university_statistics.last_change_kind not yet live (migration 0143 unapplied) -- retrying without it", { universityId, statYear });
    const { error: retryError } = await supabase
      .from("university_statistics")
      .upsert({ ...statsPayload, ...(statsChangeKind ? { last_changed_at: now } : {}) }, { onConflict: "university_id,stat_year" });
    if (retryError && isUndefinedColumnError(retryError, "last_changed_at")) {
      console.warn("[sync-us-universities] university_statistics.last_changed_at not yet live (migration 0080 unapplied) -- retrying without it either", { universityId, statYear });
      const { error: secondRetryError } = await supabase
        .from("university_statistics")
        .upsert(statsPayload, { onConflict: "university_id,stat_year" });
      if (secondRetryError) return { schoolName, status: "error", detail: secondRetryError.message };
    } else if (retryError) {
      return { schoolName, status: "error", detail: retryError.message };
    }
  } else if (statsError && isUndefinedColumnError(statsError, "last_changed_at")) {
    // Found 2026-09-02 (oryn-3f's unapplied-migration sweep, verified by CEO and independently
    // confirmed live above): this call used to check neither `error` nor `data` at all, so this
    // exact rejection -- Postgres refusing the whole upsert because last_changed_at doesn't
    // exist on university_statistics yet -- was completely invisible, and statsChangeKind is
    // non-null for both a real change AND a first-ever row, i.e. every first-time sync. It
    // would have silently blocked US institution statistics from ever being written the first
    // time Job C runs, with the job still reporting success. Degrading (not throwing) matches
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
