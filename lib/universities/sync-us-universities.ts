import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { collegeScorecardProvider } from "@/lib/providers/college-scorecard";

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
    .select("id")
    .ilike("name", escapeLikePattern(school.name))
    .eq("country", "United States")
    .maybeSingle();

  // College Scorecard doesn't provide description/logo/selectivity/coordinates at all —
  // these are deliberately absent from the shared payload rather than set to `null`, so
  // an update never wipes a value an admin (or a future richer provider) already set on
  // an existing row. A brand-new row still gets them as `null` implicitly (no explicit
  // value = the column's own default), identical to the previous behavior for inserts.
  const universityPayload = {
    name: school.name,
    country: "United States",
    city: school.city,
    institution_type: school.institutionType,
    website_url: school.websiteUrl ? normalizeUrl(school.websiteUrl) : null,
    student_size: school.studentSize,
    external_ids: { college_scorecard_id: school.collegeScorecardId },
    data_confidence: "high" as const,
    data_status: "fresh" as const,
    last_checked_at: now,
    last_changed_at: now,
  };

  let universityId: string;
  if (existing) {
    universityId = existing.id;
    await supabase.from("universities").update(universityPayload).eq("id", universityId);
  } else {
    const { data: inserted, error } = await supabase.from("universities").insert(universityPayload).select().single();
    if (error || !inserted) return { schoolName, status: "error", detail: error?.message ?? "insert failed" };
    universityId = inserted.id;
  }

  // Upsert, not insert: migration 0032 added a (university_id, stat_year) unique index
  // specifically because a bare insert here duplicated a new statistics row on every
  // re-sync of the same school in the same year instead of updating it in place.
  await supabase
    .from("university_statistics")
    .upsert(
      {
        university_id: universityId,
        stat_year: new Date().getFullYear(),
        admission_rate: school.admissionRate,
        sat_range_low: school.satMathRange && school.satReadingRange ? school.satMathRange[0] + school.satReadingRange[0] : null,
        sat_range_high: school.satMathRange && school.satReadingRange ? school.satMathRange[1] + school.satReadingRange[1] : null,
        act_range_low: school.actRange?.[0] ?? null,
        act_range_high: school.actRange?.[1] ?? null,
        graduation_rate: school.graduationRate,
        cost_of_attendance: school.costOfAttendance,
        cost_currency: "USD",
        source: "College Scorecard",
        data_confidence: "high",
        retrieved_at: now,
      },
      { onConflict: "university_id,stat_year" }
    );

  // Same reasoning: migration 0032 added a (university_id, source_url) unique index so
  // this doesn't accumulate a duplicate source row on every re-sync.
  await supabase
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
