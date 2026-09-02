import type { SupabaseClient } from "@supabase/supabase-js";
import { searchUniversityRows } from "@/lib/universities/alias-search";
import {
  applyRangeFilters,
  matchesInstitutionType,
  type CostBucketValue,
  type SizeBucketValue,
  type InstitutionTypeFilter,
  type RankTierValue,
} from "@/lib/universities/filters";
import type { Database, University } from "@/types/database";

export const UNIVERSITY_PAGE_SIZE = 48;

export type UniversitySort = "name" | "students" | "ranking";

export interface UniversityBrowseParams {
  /** Free-text query. Present means the alias-registry search path, which is unpaginated. */
  q: string | null;
  /** Already resolved from `?country=`/`?region=` — a country list, or null for world scope. */
  scopedCountries: string[] | null;
  type: InstitutionTypeFilter | null;
  sort: UniversitySort;
  cost: CostBucketValue[];
  size: SizeBucketValue[];
  rank: RankTierValue | null;
  /** See lib/universities/data-depth.ts / lib/universities/filters.ts's RangeFilters.detailedOnly. */
  detailedOnly: boolean;
  page: number;
}

export interface UniversityBrowseResult {
  universities: University[];
  total: number;
  sizeUnknownCount?: number;
  costUnknownCount?: number;
}

/**
 * One page of the Universities explorer, across all three fetch paths it has.
 *
 * Extracted verbatim from app/(app)/universities/page.tsx so the page and the
 * `loadMoreUniversities` Server Action behind infinite scroll resolve results through the
 * exact same code — a second implementation would be free to drift from this one's rules
 * about superseded rows, unranked universities and the `.in()` size limit, and any drift
 * would show up as results changing under the student mid-scroll.
 *
 * The three paths, and why they exist (all pre-existing, none introduced by the
 * extraction):
 *
 *  1. `q` set -> the canonical alias registry, so "MIT" and "uskudar" resolve. Returns at
 *     most one page and never paginates.
 *  2. Ranking sort, or any cost/size/rank filter -> `fetchViaIdIntersection`. These can't be
 *     expressed as one PostgREST filter chain (rank lives in another table; the rest are
 *     bucket predicates over nullable columns), and `.in("id", [...])` has a verified
 *     server-side size limit well under a world-scope result, so the narrowing happens in
 *     memory and only the 48 ids of the current page go back to the database.
 *  3. Otherwise -> a single ordered, `.range()`-paginated query.
 */
export async function loadUniversityBrowsePage(
  supabase: SupabaseClient<Database>,
  params: UniversityBrowseParams,
  supersededIds: readonly string[],
  rangeData: { costMap?: Map<string, number>; qsRankMap?: Map<string, number>; depthIds?: Set<string> }
): Promise<UniversityBrowseResult> {
  const { q, scopedCountries, type, sort, cost, size, rank, detailedOnly, page } = params;
  const rangeFilters = { size, cost, rank, detailedOnly };

  // ---- Path 1: text search -------------------------------------------------
  if (q) {
    const raw = await searchUniversityRows(supabase, q, { limit: UNIVERSITY_PAGE_SIZE, countries: scopedCountries });
    const typeFiltered = raw.filter((u) => matchesInstitutionType(u.institution_type, type));
    const { matched, sizeUnknown, costUnknown } = applyRangeFilters(typeFiltered, rangeFilters, rangeData);
    return { universities: matched, total: matched.length, sizeUnknownCount: sizeUnknown, costUnknownCount: costUnknown };
  }

  const useIdIntersectionPath = sort === "ranking" || cost.length > 0 || size.length > 0 || rank !== null || detailedOnly;

  // ---- Path 2: in-memory id intersection -----------------------------------
  if (useIdIntersectionPath) {
    // Scoped rows, paginated past PostgREST's 1000-row cap and count-verified: a world scope
    // alone already exceeds that cap, and a short read here would silently shrink the result
    // set rather than fail.
    const scopedRows: { id: string; name: string; student_size: number | null }[] = [];
    let offset = 0;
    let expectedTotal: number | null = null;
    for (;;) {
      let q2 = supabase
        .from("universities")
        .select("id, name, student_size", { count: "exact" })
        .order("id", { ascending: true })
        .range(offset, offset + 999);
      if (scopedCountries) q2 = q2.in("country", scopedCountries);
      if (supersededIds.length > 0) q2 = q2.not("id", "in", `(${supersededIds.join(",")})`);
      if (type) q2 = q2.ilike("institution_type", `%${type}%`);
      const { data, count, error } = await q2;
      if (error) throw new Error(`loadUniversityBrowsePage/scopedRows: ${error.message}`);
      if (expectedTotal === null) expectedTotal = count ?? 0;
      scopedRows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
    if (scopedRows.length !== expectedTotal) {
      throw new Error(
        `loadUniversityBrowsePage/scopedRows: assembled ${scopedRows.length} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`
      );
    }

    const { matched, sizeUnknown, costUnknown } = applyRangeFilters(scopedRows, rangeFilters, rangeData);
    const qsRankMap = rangeData.qsRankMap;

    let ordered: typeof matched;
    if (sort === "ranking") {
      // The ~10 universities QS doesn't rank at all are appended after the ranked ones
      // rather than dropped — they are genuinely absent from the ranking, not missing data,
      // and a student must still be able to find them.
      const ranked = matched.filter((r) => qsRankMap!.has(r.id)).sort((a, b) => qsRankMap!.get(a.id)! - qsRankMap!.get(b.id)!);
      const unranked = matched.filter((r) => !qsRankMap!.has(r.id)).sort((a, b) => a.name.localeCompare(b.name));
      ordered = [...ranked, ...unranked];
    } else if (sort === "students") {
      ordered = matched.filter((r) => r.student_size != null).sort((a, b) => (b.student_size ?? 0) - (a.student_size ?? 0));
    } else {
      ordered = matched.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    const total = ordered.length;
    const pageIds = ordered.slice((page - 1) * UNIVERSITY_PAGE_SIZE, page * UNIVERSITY_PAGE_SIZE).map((r) => r.id);
    if (pageIds.length === 0) return { universities: [], total, sizeUnknownCount: sizeUnknown, costUnknownCount: costUnknown };

    // At most PAGE_SIZE ids — well under the `.in()` limit that forced the intersection above.
    const { data: rows } = await supabase.from("universities").select("*").in("id", pageIds);
    const byId = new Map((rows ?? []).map((u) => [u.id, u]));
    const universities = pageIds.map((id) => byId.get(id)).filter((u): u is University => u != null);
    return { universities, total, sizeUnknownCount: sizeUnknown, costUnknownCount: costUnknown };
  }

  // ---- Path 3: plain paginated browse --------------------------------------
  let browseQuery = supabase
    .from("universities")
    .select("*", { count: "exact" })
    .range((page - 1) * UNIVERSITY_PAGE_SIZE, page * UNIVERSITY_PAGE_SIZE - 1);
  if (sort === "students") browseQuery = browseQuery.order("student_size", { ascending: false, nullsFirst: false });
  else browseQuery = browseQuery.order("name", { ascending: true });
  if (scopedCountries) browseQuery = browseQuery.in("country", scopedCountries);
  if (supersededIds.length > 0) browseQuery = browseQuery.not("id", "in", `(${supersededIds.join(",")})`);
  if (type) browseQuery = browseQuery.ilike("institution_type", `%${type}%`);

  const { data, count } = await browseQuery;
  return { universities: data ?? [], total: count ?? 0 };
}

/** Per-card metadata for a page of universities — QS rank, cost, research topics, image. */
export interface UniversityCardMeta {
  qsRank?: string;
  cost?: { amount: number; currency: string | null };
  researchTopics?: string[];
  imageUrl?: string;
  /** True only for the minority with real program/requirement/source/statistics depth —
   *  see lib/universities/queries.ts's getAllResearchDepthUniversityIds. Never explicitly
   *  false: the majority simply omits this field, the same "silence is the default state"
   *  convention as researchTopics/imageUrl above, so a card doesn't carry a negative badge. */
  hasResearchDepth?: boolean;
}

/**
 * Batch-fetched separately rather than joined into the main query (the hand-authored
 * Database type can't model FK embedding reliably), so a card can show "QS #N" without
 * slowing the primary browse path.
 *
 * `depthIds` is the caller's already-fetched global set (getAllResearchDepthUniversityIds),
 * not re-fetched here — it's the same one-page-worth-of-universities-at-a-time function
 * that gets called on every infinite-scroll batch, and that global set doesn't change
 * page to page the way qsRank/cost do.
 */
export async function getUniversityCardMeta(
  supabase: SupabaseClient<Database>,
  universities: University[],
  categorizeTopics: (raw: string[]) => string[],
  depthIds: Set<string>
): Promise<Record<string, UniversityCardMeta>> {
  if (universities.length === 0) return {};
  const ids = universities.map((u) => u.id);
  const [{ data: rankings }, { data: stats }, { data: metrics }] = await Promise.all([
    supabase.from("university_rankings").select("university_id, rank_display").eq("ranking_provider", "QS").in("university_id", ids),
    supabase.from("university_statistics").select("university_id, cost_of_attendance, cost_currency").in("university_id", ids).not("cost_of_attendance", "is", null),
    supabase
      .from("university_profile_metrics")
      .select("university_id, metric_code, value_text")
      .in("metric_code", ["research_topics_top5", "primary_image_url"])
      .in("university_id", ids),
  ]);

  const meta: Record<string, UniversityCardMeta> = {};
  const entry = (id: string) => (meta[id] ??= {});
  for (const r of rankings ?? []) entry(r.university_id).qsRank = r.rank_display;
  for (const s of stats ?? []) {
    if (s.cost_of_attendance != null) entry(s.university_id).cost = { amount: s.cost_of_attendance, currency: s.cost_currency };
  }
  for (const m of metrics ?? []) {
    if (!m.value_text) continue;
    if (m.metric_code === "research_topics_top5") {
      const categories = categorizeTopics(m.value_text.split(" | ").filter(Boolean));
      if (categories.length > 0) entry(m.university_id).researchTopics = categories;
    } else if (m.metric_code === "primary_image_url") {
      entry(m.university_id).imageUrl = m.value_text;
    }
  }
  for (const u of universities) {
    if (depthIds.has(u.id)) entry(u.id).hasResearchDepth = true;
  }
  return meta;
}
