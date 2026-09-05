import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TargetUniversity, University } from "@/types/database";
import { canonicalUniversityId, loadSupersessionMap } from "@/lib/universities/canonical";
import { deriveTuitionContext, type CounselingTuitionFigure } from "@/lib/universities/counseling-adapter";
import { refreshAdmissionOutlook } from "@/lib/admissions/persist";
import { isOutlookStale } from "@/lib/admissions/staleness";

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
 * Every university with a resolvable annual tuition figure from either source
 * deriveTuitionContext prioritizes — cost_of_attendance (university_statistics) first, then
 * university_profile_metrics' tuition_international_annual/tuition_domestic_annual — merged
 * through that exact same priority function, so a university that resolves to a number here is
 * guaranteed to be the same figure (or absence) its browse card and the compare page already
 * show it. Built for the cost-bucket filter (lib/universities/filters.ts's COST_BUCKETS /
 * applyRangeFilters), which until 2026-09-03 read getAllCostOfAttendance alone and so silently
 * classified every university whose only tuition figure lives in university_profile_metrics —
 * live-verified at 166 of 1010 non-superseded universities, zero overlap with the
 * cost_of_attendance set — as "cost unknown," alongside the ones that genuinely have no cost
 * data at all.
 *
 * getAllCostOfAttendance itself is left unchanged and untouched: it still answers "what is this
 * university's recorded cost_of_attendance," a narrower and still-correct question its own
 * (unrelated) callers keep asking directly, without paying for a three-source resolution they
 * don't need.
 *
 * Paginated + exact-count-verified the same way — 296 tuition_domestic_annual/
 * tuition_international_annual rows today (a university can have both, e.g. a domestic and an
 * international figure on the same UK-style institution), comfortably under PostgREST's 1000-row
 * cap for now but built paginated from the start rather than waiting to hit it, same rationale
 * as every other function in this file.
 */
export async function getAllResolvedTuitionAmounts(supabase: SupabaseClient<Database>): Promise<Map<string, number>> {
  const costOfAttendanceById = await getAllCostOfAttendance(supabase);

  const internationalById = new Map<string, CounselingTuitionFigure>();
  const domesticById = new Map<string, CounselingTuitionFigure>();
  let offset = 0;
  let expectedTotal: number | null = null;
  let seen = 0;
  for (;;) {
    const { data, count, error } = await supabase
      .from("university_profile_metrics")
      .select("university_id, metric_code, value_numeric, unit, precision_state", { count: "exact" })
      .in("metric_code", ["tuition_domestic_annual", "tuition_international_annual"])
      .not("value_numeric", "is", null)
      .order("university_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`getAllResolvedTuitionAmounts: ${error.message}`);
    if (expectedTotal === null) expectedTotal = count ?? 0;
    for (const row of data ?? []) {
      if (row.value_numeric == null) continue;
      const figure: CounselingTuitionFigure = { amount: row.value_numeric, unit: row.unit, precisionState: row.precision_state };
      if (row.metric_code === "tuition_international_annual") internationalById.set(row.university_id, figure);
      else domesticById.set(row.university_id, figure);
    }
    seen += (data ?? []).length;
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (seen !== expectedTotal) {
    throw new Error(`getAllResolvedTuitionAmounts: assembled ${seen} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
  }

  const result = new Map<string, number>();
  const allIds = new Set([...costOfAttendanceById.keys(), ...internationalById.keys(), ...domesticById.keys()]);
  for (const id of allIds) {
    const rawAmount = deriveTuitionContext({
      costOfAttendance: costOfAttendanceById.get(id) ?? null,
      internationalTuition: internationalById.get(id) ?? null,
      domesticTuition: domesticById.get(id) ?? null,
    }).rawAmount;
    if (rawAmount != null) result.set(id, rawAmount);
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

type DepthTable = "university_programs" | "university_requirements" | "university_sources" | "university_statistics";

/** Shared by getAllResearchDepthUniversityIds and getAllSubstantiveContentUniversityIds below
 * — both are "every university_id with at least one row in table X", differing only in which
 * tables they union. Paginated + exact-count-verified so neither silently truncates once a
 * table crosses PostgREST's 1000-row cap. */
async function allUniversityIdsForTable(supabase: SupabaseClient<Database>, table: DepthTable, callerName: string): Promise<Set<string>> {
  const result = new Set<string>();
  let offset = 0;
  let expectedTotal: number | null = null;
  let seen = 0;
  for (;;) {
    const { data, count, error } = await supabase
      .from(table)
      .select("university_id", { count: "exact" })
      .order("university_id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`${callerName}/${table}: ${error.message}`);
    if (expectedTotal === null) expectedTotal = count ?? 0;
    for (const row of data ?? []) result.add(row.university_id);
    seen += (data ?? []).length;
    if (!data || data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  if (seen !== expectedTotal) {
    throw new Error(`${callerName}/${table}: assembled ${seen} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
  }
  return result;
}

/**
 * University ids with real research depth — at least one row in programs, requirements,
 * sources, or statistics. See lib/universities/data-depth.ts's lacksResearchDepth, which
 * this is the bulk-list counterpart of: that function answers the question for one
 * university on its own detail page, this answers it for every university at once so the
 * browse page can badge by it without an N-query loop.
 *
 * Deliberately the minority (this returns the ~285 well-researched ids, not the ~734
 * without) — CEO's own framing: a marker true for 72% of rows is noise, not information.
 *
 * **Badge signal only as of 2026-09-05 — no longer what the "Detailed profiles only" filter
 * checks.** A card badge is a label ("some research exists on this one"), not a promise, so
 * the loose four-table union is the right bar for it. The filter is a request ("show me
 * profiles worth reading"), which CEO ruled needs a stricter bar: measured live, 315
 * universities passed this check, and 160 of those (50.8%) — Universidade de Sao Paulo, UC
 * Santa Cruz, Iowa State, and 157 more — had zero programs and zero requirements, nothing but
 * a bare source citation or an empty statistics row. See getAllSubstantiveContentUniversityIds
 * below, which the filter uses instead.
 */
export async function getAllResearchDepthUniversityIds(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const [programs, requirements, sources, statistics] = await Promise.all([
    allUniversityIdsForTable(supabase, "university_programs", "getAllResearchDepthUniversityIds"),
    allUniversityIdsForTable(supabase, "university_requirements", "getAllResearchDepthUniversityIds"),
    allUniversityIdsForTable(supabase, "university_sources", "getAllResearchDepthUniversityIds"),
    allUniversityIdsForTable(supabase, "university_statistics", "getAllResearchDepthUniversityIds"),
  ]);

  const union = new Set<string>();
  for (const perTable of [programs, requirements, sources, statistics]) {
    for (const id of perTable) union.add(id);
  }
  return union;
}

/**
 * University ids with actual admission content on file — at least one row in
 * `university_programs` OR `university_requirements`. This is what the "Detailed profiles
 * only" browse filter (`detailedOnly`, lib/universities/filters.ts) checks against, not
 * `getAllResearchDepthUniversityIds` above — deliberately narrower, and deliberately excludes
 * a bare `university_sources` citation or a `university_statistics` row on its own from
 * counting, since neither gives a student anything to actually read about admission. CEO,
 * 2026-09-05: "the filter is an action, not a label — the student's problem isn't the name,
 * it's the result."
 */
export async function getAllSubstantiveContentUniversityIds(supabase: SupabaseClient<Database>): Promise<Set<string>> {
  const [programs, requirements] = await Promise.all([
    allUniversityIdsForTable(supabase, "university_programs", "getAllSubstantiveContentUniversityIds"),
    allUniversityIdsForTable(supabase, "university_requirements", "getAllSubstantiveContentUniversityIds"),
  ]);

  const union = new Set<string>();
  for (const perTable of [programs, requirements]) {
    for (const id of perTable) union.add(id);
  }
  return union;
}

export interface TargetUniversityWithDetails extends TargetUniversity {
  university: University | null;
}

/**
 * Refreshes any outlook that predates the student's current profile score, so this function's
 * two callers (the dashboard, the Saved list) never render a verdict computed against an old
 * profile. Same "self-heal at read time" idiom as the supersession resolution below — the
 * alternative, a background sweep alone, would still leave a window between a profile change
 * and the student next seeing it reflected. See docs/handoffs/admission-outlook-refresh-
 * 2026-09-01.md for the fuller design (a weekly sweep exists too, as a backstop for a student
 * who never revisits either surface).
 *
 * Compares against `profiles.updated_at` rather than a fixed age: the signal that matters is
 * "has the input changed," not "how long has it been," so this stays correct whether a student
 * edits daily or once a year. `profiles.updated_at` bumps on any profile column, not only the
 * scoring ones (migration 0002's generic trigger), so an edit like changing
 * `preferred_language` can trigger an unnecessary-but-harmless refresh — accepted rather than
 * solved with a new dedicated column: `refreshAdmissionOutlook` is deterministic and cheap, so
 * re-running it on an unchanged profile just writes back the same numbers.
 *
 * `refreshAdmissionOutlook` returning `null` means the honesty gate currently refuses this
 * profile, and it deliberately leaves the stored row untouched (see that function's own doc
 * comment) — so a stale-but-now-refused target is patched to a cleared outlook here in memory
 * rather than re-read from the database, which would show the untouched stale value on exactly
 * the case this whole function exists to prevent. A successful refresh IS re-read, deliberately:
 * cheaper than threading every persisted field back out of `AdmissionOutlookResult` by hand, and
 * the database is the correct source of truth once the write has actually happened.
 */
async function refreshStaleOutlooks(supabase: SupabaseClient<Database>, userId: string, targets: readonly TargetUniversity[]): Promise<Map<string, TargetUniversity>> {
  const { data: profile } = await supabase.from("profiles").select("updated_at").eq("id", userId).single();
  if (!profile?.updated_at) return new Map();
  const profileUpdatedAt = new Date(profile.updated_at).getTime();

  const stale = targets.filter((t) => isOutlookStale(t, profileUpdatedAt));
  if (stale.length === 0) return new Map();

  const results = await Promise.all(stale.map(async (t) => [t.id, await refreshAdmissionOutlook(t.id, userId)] as const));
  const refusedIds = new Set(results.filter(([, result]) => result === null).map(([id]) => id));
  const refreshedIds = stale.map((t) => t.id).filter((id) => !refusedIds.has(id));

  const patches = new Map<string, TargetUniversity>();
  if (refreshedIds.length > 0) {
    const { data: fresh } = await supabase.from("target_universities").select("*").in("id", refreshedIds);
    for (const row of fresh ?? []) patches.set(row.id, row);
  }
  for (const id of refusedIds) {
    const original = stale.find((t) => t.id === id)!;
    patches.set(id, { ...original, outlook: null, estimate_range_low: null, estimate_range_high: null, outlook_confidence: null });
  }
  return patches;
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

  const outlookPatches = await refreshStaleOutlooks(supabase, userId, targets);
  const freshTargets = outlookPatches.size === 0 ? targets : targets.map((t) => outlookPatches.get(t.id) ?? t);

  // Resolved through the canonical winner — self-heals a target that references a known-
  // duplicate loser row (from before the write-path fix existed) at read time instead of
  // permanently showing the dashboard a stale duplicate. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  const universityIds = [...new Set(freshTargets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const { data: universities } = await supabase.from("universities").select("*").in("id", universityIds);
  const universityById = new Map((universities ?? []).map((u) => [u.id, u]));

  return freshTargets.map((target) => ({ ...target, university: universityById.get(canonicalUniversityId(supersessionMap, target.university_id)) ?? null }));
}
