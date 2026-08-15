import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { collegeScorecardProvider } from "@/lib/providers/college-scorecard";

export interface SyncResult {
  schoolName: string;
  status: "created" | "updated" | "not_found" | "error";
  detail?: string;
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
    .ilike("name", school.name)
    .eq("country", "United States")
    .maybeSingle();

  const universityPayload = {
    name: school.name,
    country: "United States",
    city: school.city,
    institution_type: school.institutionType,
    website_url: school.websiteUrl ? normalizeUrl(school.websiteUrl) : null,
    description: null,
    logo_url: null,
    selectivity: null,
    student_size: school.studentSize,
    latitude: null,
    longitude: null,
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

  await supabase.from("university_statistics").insert({
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
  });

  await supabase.from("university_sources").insert({
    university_id: universityId,
    source_url: "https://collegescorecard.ed.gov/",
    source_domain: "collegescorecard.ed.gov",
    source_type: "government_dataset",
    confidence: "high",
    retrieved_at: now,
    raw_excerpt: null,
  });

  return { schoolName, status: existing ? "updated" : "created" };
}

function normalizeUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
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
