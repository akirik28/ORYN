import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { Landmark, Search } from "lucide-react";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { UniversityCard } from "@/features/universities/university-card";
import { categorizeAndDedupeResearchTopics } from "@/lib/universities/research-taxonomy";
import { UniversitySearchBox } from "@/features/universities/university-search-box";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { regionById } from "@/lib/data/regions";
import { searchUniversityRows } from "@/lib/universities/alias-search";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";
import { getUniversityCountByCountry, getAllCostOfAttendance, getAllQsListPositions } from "@/lib/universities/queries";
import {
  COST_BUCKETS,
  SIZE_BUCKETS,
  TYPE_OPTIONS,
  RANK_TIERS,
  RANK_OPTIONS,
  applyRangeFilters,
  matchesInstitutionType,
  type CostBucketValue,
  type SizeBucketValue,
} from "@/lib/universities/filters";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { Pagination } from "@/components/oryn/pagination";
import { SortSelect } from "@/features/universities/sort-select";
import { FilterSheet, type FilterOption } from "@/features/universities/filter-sheet";
import { CompareBar } from "@/features/universities/compare-bar";
import type { University } from "@/types/database";

export const metadata = { title: "Universities" };

const PAGE_SIZE = 48;

type SortOption = "ranking" | "name" | "students";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "ranking", label: "QS Ranking" },
  { value: "students", label: "Student population" },
  { value: "name", label: "Name" },
];

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{
    country?: string;
    region?: string;
    q?: string;
    page?: string;
    sort?: string;
    cost?: string;
    type?: string;
    size?: string;
    rank?: string;
  }>;
}) {
  const {
    country,
    region: regionId,
    q,
    page: pageParam,
    sort: sortParam,
    cost: costParam,
    type: typeParam,
    size: sizeParam,
    rank: rankParam,
  } = await searchParams;
  const region = regionId ? regionById.get(regionId) : undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  // "Recommended" isn't offered: there's no real personalization engine behind this browse
  // view yet, and a fake relevance score would be exactly the "sahte scoring" a founder
  // review explicitly ruled out. Ranking is the closest honest default.
  const sort: SortOption = sortParam === "students" || sortParam === "name" ? sortParam : "ranking";
  // Comma-separated, not a single value: cost and student-population are multi-select (see
  // lib/universities/filters.ts's RangeFilters) so a student can span adjacent buckets rather
  // than being stuck with whatever single preset boundary happens to be drawn.
  const cost = (costParam?.split(",") ?? []).filter((v): v is CostBucketValue => COST_BUCKETS.some((b) => b.value === v));
  const type = TYPE_OPTIONS.find((t) => t.value === typeParam)?.value ?? null;
  const size = (sizeParam?.split(",") ?? []).filter((v): v is SizeBucketValue => SIZE_BUCKETS.some((b) => b.value === v));
  const rank = (RANK_TIERS as readonly string[]).includes(rankParam ?? "") ? (rankParam as (typeof RANK_TIERS)[number]) : null;
  const session = await requireUser();
  const supabase = await createClient();

  // A text search goes through the canonical registry so aliases and accents resolve
  // ("MIT" -> Massachusetts Institute of Technology, "uskudar" -> "Üsküdar ..."), which
  // `ilike` could never do. Browsing without a query keeps the cheap, ordered path over
  // `universities` itself, paginated the same way (`page`/`PAGE_SIZE`) rather than a single
  // unpaginated cap — see the 2026-08-18 fix note below for why that mattered.
  const scopedCountries = country ? [country] : region ? (region.countries.length > 0 ? region.countries : ["__no_countries_in_region__"]) : null;

  // A known-duplicate row (both sides of an already-merged canonical identity, e.g. "UCL" and
  // "University College London") must never independently surface as its own card — see
  // lib/universities/canonical.ts. Applied to the browse query, the country-count query, and
  // search, so none of the three shows a duplicate card or an inflated per-country count.
  const supersessionMap = await loadSupersessionMap(supabase);
  const supersededIds = getSupersededUniversityIds(supersessionMap);

  // cost/size/rank are checked via an in-memory intersection (see fetchViaIdIntersection)
  // rather than a `.in("id", [...])` filter, because that filter has a real, verified server-
  // side size limit: a live test against this project during this build showed `.in()` starting
  // to fail (Bad Request / connection reset) somewhere around 400-700 uuids, well under the
  // ~1019 universities a "World" scope can produce. A rank filter alone ("Top 500") can already
  // exceed that on its own. Fetching the full column once (paginated, see getAllCostOfAttendance/
  // getAllQsListPositions) and intersecting client-side avoids the limit entirely, at the cost
  // of one extra small query when these filters (or Ranking sort) are actually in use.
  const needsQsRankMap = !q && (sort === "ranking" || rank !== null);
  const [costMap, qsRankMap] = await Promise.all([
    cost ? getAllCostOfAttendance(supabase) : Promise.resolve(null),
    needsQsRankMap ? getAllQsListPositions(supabase) : Promise.resolve(null),
  ]);

  const rangeFilters = { size, cost, rank };
  const rangeData = { costMap: costMap ?? undefined, qsRankMap: qsRankMap ?? undefined };

  /**
   * Country/region scope + the (high-coverage, 1002/1019) institution_type filter, applied
   * as real Postgres filters — paginated + exact-count-verified against PostgREST's 1000-row
   * cap (the same bug class fixed in getUniversityCountByCountry: a "World" scope alone is
   * 1019 rows, already past it). student_size travels along unfiltered here (size bucketing
   * happens in applyRangeFilters, not as a DB filter) specifically so an unknown-size
   * university can still be counted as "excluded because unavailable" instead of just
   * vanishing from an unfiltered `.gte()` the way a NULL comparison silently would.
   */
  async function getScopedRows(): Promise<{ id: string; name: string; student_size: number | null }[]> {
    const rows: { id: string; name: string; student_size: number | null }[] = [];
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
      if (error) throw new Error(`getScopedRows: ${error.message}`);
      if (expectedTotal === null) expectedTotal = count ?? 0;
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
      offset += 1000;
    }
    if (rows.length !== expectedTotal) {
      throw new Error(`getScopedRows: assembled ${rows.length} rows but the server counts ${expectedTotal}. Refusing to return a partial result.`);
    }
    return rows;
  }

  /**
   * Used whenever a query can't be expressed as one direct Postgrest filter chain: Ranking
   * sort (rank lives in `university_rankings`, a separate table — see the historical note
   * below) or any of the cost/size/rank filters (see applyRangeFilters above for why those
   * are TS-side, not `.in()`-based). Every other case (no filters, or type-only) stays on the
   * cheaper single-query `browseQuery` path below.
   *
   * 10/1019 universities have no QS World University Ranking row at all (several are
   * specialist business schools QS ranks separately, not in the World Ranking this product
   * currently ingests — ESSEC, ESCP, LUISS, Bocconi, St. Gallen among them; genuinely absent
   * data, not a bug). They used to be silently dropped from Ranking-sorted views and the
   * rank-tier filter entirely — found live 2026-08-20 alongside the band-ranking gap fixed in
   * getAllQsListPositions(). Now appended after every ranked result (alphabetically, since
   * there's no rank to order them by) rather than vanishing — a student can still find and
   * open them, their card just correctly shows no QS badge instead of a fabricated one.
   */
  async function fetchViaIdIntersection(): Promise<{ data: University[]; count: number; sizeUnknownCount?: number; costUnknownCount?: number }> {
    const scopedRows = await getScopedRows();
    const { matched, sizeUnknown, costUnknown } = applyRangeFilters(scopedRows, rangeFilters, rangeData);

    let ordered: typeof matched;
    if (sort === "ranking") {
      const ranked = matched.filter((r) => qsRankMap!.has(r.id)).sort((a, b) => qsRankMap!.get(a.id)! - qsRankMap!.get(b.id)!);
      const unranked = matched.filter((r) => !qsRankMap!.has(r.id)).sort((a, b) => a.name.localeCompare(b.name));
      ordered = [...ranked, ...unranked];
    } else if (sort === "students") {
      ordered = matched.filter((r) => r.student_size != null).sort((a, b) => (b.student_size ?? 0) - (a.student_size ?? 0));
    } else {
      ordered = matched.slice().sort((a, b) => a.name.localeCompare(b.name));
    }

    const count = ordered.length;
    const pageIds = ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => r.id);
    if (pageIds.length === 0) return { data: [], count, sizeUnknownCount: sizeUnknown, costUnknownCount: costUnknown };

    // pageIds.length is always <= PAGE_SIZE (48) here — always well under the `.in()` size
    // limit documented above, unlike the ids this function narrows FROM.
    const { data: rows } = await supabase.from("universities").select("*").in("id", pageIds);
    const byId = new Map((rows ?? []).map((u) => [u.id, u]));
    const finalRows = pageIds.map((id) => byId.get(id)).filter((u): u is University => u != null);
    return { data: finalRows, count, sizeUnknownCount: sizeUnknown, costUnknownCount: costUnknown };
  }

  const useIdIntersectionPath = sort === "ranking" || cost.length > 0 || size.length > 0 || rank !== null;

  let browseQuery = supabase
    .from("universities")
    .select("*", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sort === "students") browseQuery = browseQuery.order("student_size", { ascending: false, nullsFirst: false });
  else browseQuery = browseQuery.order("name", { ascending: true });
  if (scopedCountries) browseQuery = browseQuery.in("country", scopedCountries);
  if (supersededIds.length > 0) browseQuery = browseQuery.not("id", "in", `(${supersededIds.join(",")})`);
  if (type) browseQuery = browseQuery.ilike("institution_type", `%${type}%`);

  const [universitiesRes, liveCountryCounts, targetsRes] = await Promise.all([
    q ? Promise.resolve(null) : useIdIntersectionPath ? fetchViaIdIntersection() : browseQuery,
    // 2026-08-18 fix: this used to be a single unpaginated `.select("country")` filtered
    // client-side against a 12-country hardcoded allowlist (SUPPORTED_COUNTRIES) — the
    // combination silently dropped 77 of the 89 real countries in the data from every
    // region tab and country count (that's the whole "Asia: 0" / "~400 total" bug — see
    // lib/data/country-geo.ts's header for the full writeup). Now sourced from the live,
    // paginated, exact-count-verified DB read, so a country's count can never silently
    // undercount or vanish again, and a country the DB has that SUPPORTED_COUNTRIES
    // doesn't yet know about is now a *detectable* gap (see the reconciliation below)
    // instead of a silent drop.
    getUniversityCountByCountry(supabase, supersededIds),
    supabase.from("target_universities").select("university_id").eq("user_id", session.userId!),
  ]);

  const countryCounts = SUPPORTED_COUNTRIES.map((c) => ({
    country: c.name,
    count: liveCountryCounts.get(c.name) ?? 0,
  }));
  // Reconciliation, not just a display list: a country present in the live data but absent
  // from SUPPORTED_COUNTRIES would previously vanish with no trace. Surfaced to the page
  // (rendered as a quiet footnote, not hidden) so a future new country shows up as an
  // honest gap instead of silently zeroing out again.
  const uncoveredCountries = [...liveCountryCounts.keys()].filter((name) => !SUPPORTED_COUNTRIES.some((c) => c.name === name));
  const totalUniversities = [...liveCountryCounts.values()].reduce((sum, n) => sum + n, 0);

  const savedIds = new Set((targetsRes.data ?? []).map((t) => t.university_id));
  const rawSearchResult = q ? await searchUniversityRows(supabase, q, { limit: PAGE_SIZE, countries: scopedCountries }) : null;
  let sizeUnknownCount: number | undefined;
  let costUnknownCount: number | undefined;
  let universities: University[];
  let totalResults: number;
  if (rawSearchResult) {
    const typeFiltered = rawSearchResult.filter((u) => matchesInstitutionType(u.institution_type, type));
    const { matched, sizeUnknown, costUnknown } = applyRangeFilters(typeFiltered, rangeFilters, rangeData);
    universities = matched;
    totalResults = matched.length;
    sizeUnknownCount = sizeUnknown;
    costUnknownCount = costUnknown;
  } else if (useIdIntersectionPath) {
    const result = universitiesRes as Awaited<ReturnType<typeof fetchViaIdIntersection>>;
    universities = result.data;
    totalResults = result.count;
    sizeUnknownCount = result.sizeUnknownCount;
    costUnknownCount = result.costUnknownCount;
  } else {
    const result = universitiesRes as Awaited<typeof browseQuery>;
    universities = result.data ?? [];
    totalResults = result.count ?? 0;
  }
  const totalPages = q ? 1 : Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // Batch-fetched separately (see getTargetUniversitiesWithDetails for why: our hand
  // -authored Database type can't model FK embedding reliably) rather than joined in the
  // main query, so cards can show "QS #N" without slowing down the primary browse path.
  const qsRankByUniId = new Map<string, string>();
  const costByUniId = new Map<string, { amount: number; currency: string | null }>();
  const researchTopicsByUniId = new Map<string, string[]>();
  const imageUrlByUniId = new Map<string, string>();
  if (universities.length > 0) {
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
    for (const r of rankings ?? []) qsRankByUniId.set(r.university_id, r.rank_display);
    for (const s of stats ?? []) {
      if (s.cost_of_attendance != null) costByUniId.set(s.university_id, { amount: s.cost_of_attendance, currency: s.cost_currency });
    }
    for (const m of metrics ?? []) {
      if (!m.value_text) continue;
      if (m.metric_code === "research_topics_top5") {
        const categories = categorizeAndDedupeResearchTopics(m.value_text.split(" | ").filter(Boolean));
        if (categories.length > 0) researchTopicsByUniId.set(m.university_id, categories);
      } else if (m.metric_code === "primary_image_url") {
        imageUrlByUniId.set(m.university_id, m.value_text);
      }
    }
  }

  const scopeLabel = country ?? region?.name ?? null;

  function buildHref(overrides: { page?: number; sort?: SortOption; cost?: string[]; type?: string | null; size?: string[]; rank?: string | null }): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    const nextSort = overrides.sort ?? sort;
    if (nextSort !== "ranking") params.set("sort", nextSort);
    const nextCost = overrides.cost ?? cost;
    const nextType = "type" in overrides ? overrides.type : type;
    const nextSize = overrides.size ?? size;
    const nextRank = "rank" in overrides ? overrides.rank : rank;
    if (nextCost.length > 0) params.set("cost", nextCost.join(","));
    if (nextType) params.set("type", nextType);
    if (nextSize.length > 0) params.set("size", nextSize.join(","));
    if (nextRank) params.set("rank", nextRank);
    // Any filter or sort change resets to page 1 (the result set just changed size); explicit
    // pagination passes its own target page.
    const nextPage = overrides.page ?? 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/universities?${qs}` : "/universities";
  }

  const buildPageHref = (targetPage: number) => buildHref({ page: targetPage });
  const buildSortHref = (nextSort: SortOption) => buildHref({ sort: nextSort });
  const buildFilterHref = (overrides: { cost?: string[]; type?: string | null; size?: string[]; rank?: string | null }) => buildHref(overrides);

  /** Single-select: type and rank. Clicking the active option clears it, clicking another
   * replaces it — QS rank tiers are already cumulative ("Top 50" ⊇ "Top 10"), so more than one
   * active at once couldn't express anything a single, wider tier doesn't already cover. */
  function toOptions<V extends string>(defs: { value: V; label: string }[], current: V | null, key: "type" | "rank"): FilterOption[] {
    return defs.map((d) => ({
      value: d.value,
      label: d.label,
      active: current === d.value,
      href: buildFilterHref({ [key]: current === d.value ? null : d.value }),
    }));
  }

  /** Multi-select: cost and student population. Clicking a chip toggles it in/out of the
   * active set instead of replacing whatever was selected — this is what lets a student span
   * adjacent buckets ("$10k-$25k" + "$25k-$50k" for an effective "$10k-$50k") instead of being
   * stuck picking exactly one preset boundary. See lib/universities/filters.ts's RangeFilters. */
  function toMultiOptions<V extends string>(defs: { value: V; label: string }[], currentArr: V[], key: "cost" | "size"): FilterOption[] {
    return defs.map((d) => ({
      value: d.value,
      label: d.label,
      active: currentArr.includes(d.value),
      href: buildFilterHref({ [key]: currentArr.includes(d.value) ? currentArr.filter((v) => v !== d.value) : [...currentArr, d.value] }),
    }));
  }

  const activeFilterCount = cost.length + size.length + (type ? 1 : 0) + (rank ? 1 : 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Explore universities" description="A world of programs — start with a region, or search directly." />

      <UniversityExplorerHero countryCounts={countryCounts} selected={country ?? null} selectedRegion={region?.id ?? null} />

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Search universities</p>
          <p className="text-xs text-muted-foreground">
            {scopeLabel ? `Filtered to ${scopeLabel}` : "Across all supported regions"} · {totalUniversities.toLocaleString("en-US")} universities total
          </p>
        </div>
        <div className="flex gap-2">
          <form className="flex gap-2" action="/universities" method="GET">
            {country ? <input type="hidden" name="country" value={country} /> : null}
            {region ? <input type="hidden" name="region" value={region.id} /> : null}
            <UniversitySearchBox defaultValue={q} country={country ?? null} />
            <Button type="submit" variant="outline" size="sm">
              <Search className="size-3.5" /> Search
            </Button>
          </form>
          <FilterSheet
            activeCount={activeFilterCount}
            clearHref={buildFilterHref({ cost: [], type: null, size: [], rank: null })}
            groups={[
              { label: "Cost of attendance", description: "Select as many as you need to span a wider range.", options: toMultiOptions(COST_BUCKETS, cost, "cost") },
              { label: "Institution type", options: toOptions(TYPE_OPTIONS, type, "type") },
              { label: "Student population", description: "Select as many as you need to span a wider range.", options: toMultiOptions(SIZE_BUCKETS, size, "size") },
              { label: "QS ranking", options: toOptions(RANK_OPTIONS, rank, "rank") },
            ]}
          />
        </div>
      </div>

      {universities.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {q
                ? `${universities.length} result${universities.length === 1 ? "" : "s"} for "${q}"`
                : `Showing ${(page - 1) * PAGE_SIZE + 1}–${(page - 1) * PAGE_SIZE + universities.length} of ${totalResults.toLocaleString("en-US")}${scopeLabel ? ` in ${scopeLabel}` : ""}`}
            </p>
            {!q ? <SortSelect value={sort} options={SORT_OPTIONS.map((o) => ({ ...o, href: buildSortHref(o.value) }))} /> : null}
          </div>
          {costUnknownCount || sizeUnknownCount ? (
            <p className="text-xs text-muted-foreground/80">
              {costUnknownCount ? `${costUnknownCount.toLocaleString("en-US")} additional ${costUnknownCount === 1 ? "university is" : "universities are"} excluded because cost data is unavailable. ` : ""}
              {sizeUnknownCount ? `${sizeUnknownCount.toLocaleString("en-US")} additional ${sizeUnknownCount === 1 ? "university is" : "universities are"} excluded because student population data is unavailable.` : ""}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universities.map((university) => (
              <UniversityCard
                key={university.id}
                university={university}
                isSaved={savedIds.has(university.id)}
                qsRank={qsRankByUniId.get(university.id)}
                cost={costByUniId.get(university.id)}
                researchTopics={researchTopicsByUniId.get(university.id)}
                imageUrl={imageUrlByUniId.get(university.id)}
              />
            ))}
          </div>
          <CompareBar />
          {!q ? <Pagination currentPage={page} totalPages={totalPages} buildHref={buildPageHref} /> : null}
        </>
      ) : (
        <EmptyState
          icon={Landmark}
          title={`No universities found${q ? ` matching "${q}"` : ""}${scopeLabel ? ` in ${scopeLabel}` : ""}`}
          description={
            activeFilterCount > 0
              ? "No universities match the current filters — try widening the cost, size, or ranking range."
              : "University data is added over time — check back soon, or try another region."
          }
        />
      )}

      {uncoveredCountries.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Note: {uncoveredCountries.length} check-in-progress {uncoveredCountries.length === 1 ? "country isn't" : "countries aren't"} yet mapped to a
          region ({uncoveredCountries.join(", ")}) — included in the total above, not yet in any region tab.
        </p>
      ) : null}
    </div>
  );
}
