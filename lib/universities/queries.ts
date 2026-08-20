import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TargetUniversity, University } from "@/types/database";
import { canonicalUniversityId } from "@/lib/universities/canonical";

const PAGE_SIZE = 1000;

/**
 * Every `universities.country` value, verified complete against PostgREST's own exact
 * count — a plain `.select("country")` with no range silently truncates at PostgREST's
 * 1000-row cap (the exact bug class `lib/acquisition/paginate.ts` exists to prevent for the
 * script side of this codebase; this is the supabase-js-client equivalent for a server
 * component). With 1019 live universities, an unpaginated read here would have quietly
 * dropped the last 19 — small enough to not obviously break anything, which is exactly how
 * this class of bug hides. Superseded (post-merge loser) rows are excluded so a duplicate
 * identity never inflates a country's count — same rule the browse query itself applies.
 *
 * Kept separate from `SUPPORTED_COUNTRIES` (lib/data/country-geo.ts) deliberately: this
 * returns the live, authoritative counts for whatever countries actually exist in the data
 * right now; `SUPPORTED_COUNTRIES` is the region/map-display taxonomy layered on top. A
 * country appearing here that `SUPPORTED_COUNTRIES` doesn't yet know about is a real,
 * detectable gap (see `getUniversityCountByCountry`'s caller in `app/(app)/universities/
 * page.tsx` for how that reconciliation surfaces), not a silent drop like before.
 */
export async function getUniversityCountByCountry(supabase: SupabaseClient<Database>, excludeIds: string[] = []): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  let offset = 0;
  let expectedTotal: number | null = null;
  let seen = 0;

  for (;;) {
    let query = supabase
      .from("universities")
      .select("country", { count: "exact" })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (excludeIds.length > 0) query = query.not("id", "in", `(${excludeIds.join(",")})`);

    const { data, count, error } = await query;
    if (error) throw new Error(`getUniversityCountByCountry: ${error.message}`);
    if (expectedTotal === null) expectedTotal = count ?? 0;

    for (const row of data ?? []) {
      if (!row.country) continue;
      counts.set(row.country, (counts.get(row.country) ?? 0) + 1);
    }
    seen += (data ?? []).length;
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (seen !== expectedTotal) {
    throw new Error(`getUniversityCountByCountry: assembled ${seen} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
  }
  return counts;
}

/**
 * Every university with a recorded cost_of_attendance, paginated + exact-count-verified —
 * same discipline as getUniversityCountByCountry, for the same reason: university_statistics
 * is one row per university (no fan-out), so as the tuition-acquisition roadmap (UK, Canada,
 * Australia, ...) fills it in, an unpaginated `.select()` here would silently start dropping
 * universities from the cost filter with no error once the table crosses 1000 rows — exactly
 * the bug class this file exists to prevent. Currently 128 rows (US only), well under the
 * cap, but built paginated from the start rather than waiting to hit it.
 */
export async function getAllCostOfAttendance(supabase: SupabaseClient<Database>): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  let offset = 0;
  let expectedTotal: number | null = null;
  let seen = 0;
  for (;;) {
    const { data, count, error } = await supabase
      .from("university_statistics")
      .select("university_id, cost_of_attendance", { count: "exact" })
      .not("cost_of_attendance", "is", null)
      .order("university_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`getAllCostOfAttendance: ${error.message}`);
    if (expectedTotal === null) expectedTotal = count ?? 0;
    for (const row of data ?? []) {
      if (row.cost_of_attendance != null) result.set(row.university_id, row.cost_of_attendance);
    }
    seen += (data ?? []).length;
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (seen !== expectedTotal) {
    throw new Error(`getAllCostOfAttendance: assembled ${seen} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
  }
  return result;
}

/**
 * Every QS-ranked university's sort position, paginated + exact-count-verified. Same
 * rationale as getAllCostOfAttendance — university_rankings is already at 1009 rows for QS
 * alone, i.e. already effectively at PostgREST's 1000-row cap today, not just "will get there
 * eventually."
 *
 * Sourced from `list_position` (QS's own row order in the published table), not
 * `rank_numeric` — 300 of 1009 QS rows are band-ranked ("951-1000", not a single number) and
 * `rank_numeric` is correctly NULL for every one of them (migration 0038's own constraint;
 * `check:university-spine-health` guards the inverse). Filtering on `rank_numeric` excluded
 * all 300 from every Ranking-sorted view and the "Top N" filter entirely — found live
 * 2026-08-20: a country whose only university happened to be band-ranked (e.g. Ethiopia's
 * Addis Ababa University, "951-1000") showed a truthful "· 1" count chip but then "No
 * universities found" under the default Ranking sort. `list_position` is populated for all
 * 1009 rows (verified), and is never displayed to a student directly — only `rank_display`
 * is (see the separate `qsRankByUniId` fetch in app/(app)/universities/page.tsx) — so using
 * it purely as an internal sort/threshold key adds no false precision.
 */
export async function getAllQsListPositions(supabase: SupabaseClient<Database>): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  let offset = 0;
  let expectedTotal: number | null = null;
  let seen = 0;
  for (;;) {
    const { data, count, error } = await supabase
      .from("university_rankings")
      .select("university_id, list_position", { count: "exact" })
      .eq("ranking_provider", "QS")
      .not("list_position", "is", null)
      .order("university_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`getAllQsListPositions: ${error.message}`);
    if (expectedTotal === null) expectedTotal = count ?? 0;
    for (const row of data ?? []) {
      if (row.list_position != null) result.set(row.university_id, row.list_position);
    }
    seen += (data ?? []).length;
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (seen !== expectedTotal) {
    throw new Error(`getAllQsListPositions: assembled ${seen} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
  }
  return result;
}

export interface TargetUniversityWithDetails extends TargetUniversity {
  university: University | null;
}

/**
 * Joins target_universities to universities with two plain queries instead of a nested
 * PostgREST `.select("*, universities(*)")` — our hand-authored Database type doesn't
 * model FK Relationships (see the Identity<T> comment in types/database.ts), so nested
 * embedding can't be typed reliably. This pattern (fetch rows, batch-fetch the referenced
 * table by id, zip them back together) is the convention used everywhere in this codebase
 * that would otherwise need a join.
 */
export async function getTargetUniversitiesWithDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 100
): Promise<TargetUniversityWithDetails[]> {
  const { data: targets } = await supabase
    .from("target_universities")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!targets || targets.length === 0) return [];

  // Resolved through the canonical winner — self-heals a target that references a known-
  // duplicate loser row (from before the write-path fix existed) at read time instead of
  // permanently showing the dashboard a stale duplicate. See lib/universities/canonical.ts.
  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(t.university_id)))];
  const { data: universities } = await supabase.from("universities").select("*").in("id", universityIds);
  const universityById = new Map((universities ?? []).map((u) => [u.id, u]));

  return targets.map((target) => ({ ...target, university: universityById.get(canonicalUniversityId(target.university_id)) ?? null }));
}
