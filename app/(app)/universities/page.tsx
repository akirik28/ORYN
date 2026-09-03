import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { requireUser, requireProfile } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { resolveLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { Landmark, Search } from "lucide-react";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { getUniversityMapPins } from "@/lib/universities/map-pins";
import { loadUniversityBrowsePage, getUniversityCardMeta, UNIVERSITY_PAGE_SIZE } from "@/lib/universities/browse-page";
import { UniversityBrowseGrid } from "@/features/universities/university-browse-grid";
import { categorizeAndDedupeResearchTopics } from "@/lib/universities/research-taxonomy";
import { UniversitySearchBox } from "@/features/universities/university-search-box";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { regionById, regionLabel } from "@/lib/data/regions";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";
import { getUniversityCountByCountry, getAllCostOfAttendance, getAllQsListPositions, getAllResearchDepthUniversityIds } from "@/lib/universities/queries";
import { formatNumber } from "@/lib/i18n/format";
import {
  COST_BUCKETS,
  SIZE_BUCKETS,
  TYPE_OPTIONS,
  RANK_TIERS,
  costBucketLabel,
  sizeBucketLabel,
  typeOptionLabel,
  rankOptionLabel,
  type CostBucketValue,
  type SizeBucketValue,
} from "@/lib/universities/filters";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { SortSelect } from "@/features/universities/sort-select";
import { FilterSheet, type FilterOption } from "@/features/universities/filter-sheet";
import { CompareBar } from "@/features/universities/compare-bar";

export async function generateMetadata(): Promise<Metadata> {
  const tMeta = await getTranslations("nav");
  return { title: tMeta("universities") };
}

const VIEW_TAB =
  "border-b-2 pb-2 text-sm transition-colors duration-(--duration-fast) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
const VIEW_TAB_ACTIVE = "border-brand-primary font-medium text-ink-1";
const VIEW_TAB_INACTIVE = "border-transparent text-ink-3 hover:text-ink-1";

type SortOption = "ranking" | "name" | "students";

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
    view?: string;
    detailed?: string;
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
    view: viewParam,
    detailed: detailedParam,
  } = await searchParams;
  const locale = await resolveLocale();
  const t = await getTranslations("universities.browsePage");
  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "ranking", label: t("qsRanking") },
    { value: "students", label: t("studentPopulation") },
    { value: "name", label: t("sortByName") },
  ];
  // Map is the default exploration mode (UI-V3 § 21 makes the map a core feature, not an
  // optional extra); List is the conventional catalogue for when a student already knows
  // what they're looking for. Below `md` the map never mounts at all — see
  // UniversityExplorerHero — so the toggle is desktop-only chrome and List is what a phone
  // always gets, without needing a separate param.
  const isListView = viewParam === "list";
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
  // "1" only, not any truthy string — a bare boolean-shaped flag, same convention as
  // isListView's view === "list" just above. See lib/universities/data-depth.ts /
  // docs/handoffs/university-data-depth-honesty-2026-09-02.md for what this narrows to.
  const detailedOnly = detailedParam === "1";
  const session = await requireUser();
  const supabase = await createClient();
  // cache()-wrapped (lib/security/dal.ts) — app/(app)/layout.tsx already calls this for the
  // same request, so this is a memoized hit, not a second query. See that file's own header
  // comment for why the memoization is real inside a Server Component render specifically.
  const planTier = resolvePlanTier(await requireProfile());

  // A text search goes through the canonical registry so aliases and accents resolve
  // ("MIT" -> Massachusetts Institute of Technology, "uskudar" -> "Üsküdar ..."), which
  // `ilike` could never do. Browsing without a query keeps the cheap, ordered path over
  // `universities` itself, paginated the same way (`page`/`UNIVERSITY_PAGE_SIZE`) rather than a single
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
  // depthIds is fetched unconditionally, unlike costMap/qsRankMap: it feeds the "Detailed
  // profile" card badge on every page regardless of whether the filter itself is active,
  // not just the filtered-narrowing path.
  const [costMap, qsRankMap, depthIds] = await Promise.all([
    cost ? getAllCostOfAttendance(supabase) : Promise.resolve(null),
    needsQsRankMap ? getAllQsListPositions(supabase) : Promise.resolve(null),
    getAllResearchDepthUniversityIds(supabase),
  ]);

  const rangeData = { costMap: costMap ?? undefined, qsRankMap: qsRankMap ?? undefined, depthIds };

  const [browseResult, liveCountryCounts, targetsRes] = await Promise.all([
    loadUniversityBrowsePage(
      supabase,
      { q: q ?? null, scopedCountries, type, sort, cost, size, rank, detailedOnly, page },
      supersededIds,
      rangeData
    ),
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

  // Pins are per-country, so this only runs once a country is actually selected — the
  // world/region view plots country dots, not individual universities.
  const mapPins = country ? await getUniversityMapPins(supabase, country, supersededIds) : [];

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
  // All three fetch paths (search / id-intersection / plain browse) now resolve inside
  // loadUniversityBrowsePage, which the infinite-scroll Server Action calls too — so a
  // scrolled-in page can never be assembled by different rules than the first one.
  const universities = browseResult.universities;
  const totalResults = browseResult.total;
  const sizeUnknownCount = browseResult.sizeUnknownCount;
  const costUnknownCount = browseResult.costUnknownCount;
  // A text search returns a single unpaginated page, so there is nothing further to load.
  const hasMore = !q && page * UNIVERSITY_PAGE_SIZE < totalResults;

  // Same batched per-card metadata the infinite-scroll action uses, so an appended page's
  // cards carry exactly the fields the first page's do.
  const cardMeta = await getUniversityCardMeta(supabase, universities, categorizeAndDedupeResearchTopics, depthIds, locale);

  const scopeLabel = country ?? (region ? regionLabel(region, locale) : null);

  // Handed to the infinite-scroll grid, and to the Server Action behind it, so an appended
  // page is resolved with exactly the filters the first page used.
  const browseParams = { q: q ?? null, scopedCountries, type, sort, cost, size, rank, detailedOnly };
  // Remount key: changing any filter or the sort produces a different result set, so the
  // grid must reset its accumulated pages. Keying it is how React is told that — cheaper
  // and less error-prone than syncing props into state inside the component.
  const browseGridKey = JSON.stringify(browseParams);
  // Country hrefs are pre-resolved here because building one needs this page's full param
  // state, which the client grid deliberately doesn't carry. Only the countries actually on
  // this page, and never the currently-scoped one (its own chip would be a no-op link).
  const countryHrefByName: Record<string, string> = {};
  for (const u of universities) {
    if (u.country && u.country !== country && !(u.country in countryHrefByName)) {
      countryHrefByName[u.country] = buildCountryHref(u.country);
    }
  }

  function buildHref(overrides: {
    page?: number;
    sort?: SortOption;
    cost?: string[];
    type?: string | null;
    size?: string[];
    rank?: string | null;
    detailedOnly?: boolean;
  }): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    if (isListView) params.set("view", "list");
    const nextSort = overrides.sort ?? sort;
    if (nextSort !== "ranking") params.set("sort", nextSort);
    const nextCost = overrides.cost ?? cost;
    const nextType = "type" in overrides ? overrides.type : type;
    const nextSize = overrides.size ?? size;
    const nextRank = "rank" in overrides ? overrides.rank : rank;
    const nextDetailedOnly = overrides.detailedOnly ?? detailedOnly;
    if (nextCost.length > 0) params.set("cost", nextCost.join(","));
    if (nextType) params.set("type", nextType);
    if (nextSize.length > 0) params.set("size", nextSize.join(","));
    if (nextRank) params.set("rank", nextRank);
    if (nextDetailedOnly) params.set("detailed", "1");
    // Any filter or sort change resets to page 1 (the result set just changed size); explicit
    // pagination passes its own target page.
    const nextPage = overrides.page ?? 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/universities?${qs}` : "/universities";
  }

  /** Switches view while preserving every other filter — a student who found their way to
   *  "Germany, under $20k, large" shouldn't lose it by looking at a list. */
  function buildViewHref(list: boolean): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    if (sort !== "ranking") params.set("sort", sort);
    if (cost.length > 0) params.set("cost", cost.join(","));
    if (type) params.set("type", type);
    if (size.length > 0) params.set("size", size.join(","));
    if (rank) params.set("rank", rank);
    if (detailedOnly) params.set("detailed", "1");
    if (list) params.set("view", "list");
    const qs = params.toString();
    return qs ? `/universities?${qs}` : "/universities";
  }

  /**
   * Selects a country on the map from a result row.
   *
   * Preserves every other filter, matching what `WorldMapExplorer.selectCountry` already
   * does when the same selection is made by clicking the map itself (it rebuilds from the
   * existing search params). An earlier version rebuilt the URL from scratch and silently
   * dropped region, sort, cost, type, size and rank — so a student who had narrowed to
   * "under $20k, large" lost all of it by clicking a country in the results, while doing
   * the identical thing on the map kept it. Two paths to one action must not disagree.
   * Page is deliberately not carried over: the result set just changed.
   */
  function buildCountryHref(name: string): string {
    const params = new URLSearchParams();
    params.set("country", name);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    if (sort !== "ranking") params.set("sort", sort);
    if (cost.length > 0) params.set("cost", cost.join(","));
    if (type) params.set("type", type);
    if (size.length > 0) params.set("size", size.join(","));
    if (rank) params.set("rank", rank);
    if (detailedOnly) params.set("detailed", "1");
    if (isListView) params.set("view", "list");
    return `/universities?${params.toString()}`;
  }

  const buildSortHref = (nextSort: SortOption) => buildHref({ sort: nextSort });
  const buildFilterHref = (overrides: { cost?: string[]; type?: string | null; size?: string[]; rank?: string | null; detailedOnly?: boolean }) => buildHref(overrides);

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

  const activeFilterCount = cost.length + size.length + (type ? 1 : 0) + (rank ? 1 : 0) + (detailedOnly ? 1 : 0);

  return (
    // Figma source marks Universities as one of its dark "isFull" screens (App.tsx
    // `App()`'s `isFull` check) — confirmed live against the actual Figma Make prototype
    // (2026-08-30), not guessed from the static export alone. `.dark` scopes every
    // token-based className already on this page — this component tree, down to
    // WorldMapExplorer's country-fill colors (lib/data/map-visuals.ts's
    // resolveCountryFillStyle, unit-tested, built entirely from color-mix(in oklch,
    // var(--brand-primary)/var(--background)/var(--muted)...)) — checked specifically
    // because breaking that map was the real risk here, not assumed. Nothing hardcoded
    // light hex anywhere in this feature; only the background below is a literal new
    // value. Contained (rounded card within the normal content column), not edge-to-edge
    // — same choice already made for the dashboard hero and Applications, since the
    // shared layout's padding is asymmetric (pt-8 pb-24 vs md:pt-12 lg:pb-12) and doesn't
    // cleanly cancel with a uniform negative margin.
    <div
      className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8"
      style={heroGradientStyle(planTier)}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        {/* Desktop-only: below md the map is never mounted, so a Map/List choice there would
            offer a view that can't render. */}
        <div className="hidden gap-6 border-b border-border lg:flex">
          <Link
            href={buildViewHref(false)}
            aria-current={!isListView ? "page" : undefined}
            className={cn(VIEW_TAB, !isListView ? VIEW_TAB_ACTIVE : VIEW_TAB_INACTIVE)}
          >
            {t("map")}
          </Link>
          <Link
            href={buildViewHref(true)}
            aria-current={isListView ? "page" : undefined}
            className={cn(VIEW_TAB, isListView ? VIEW_TAB_ACTIVE : VIEW_TAB_INACTIVE)}
          >
            {t("list")}
          </Link>
        </div>
      </div>


      <div className="glass-card-fast flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("searchHeading")}</p>
          <p className="text-xs text-muted-foreground">
            {scopeLabel ? t("filteredTo", { scope: scopeLabel }) : t("acrossAllRegions")} · {t("totalCount", { count: totalUniversities, formatted: formatNumber(totalUniversities) })}
          </p>
        </div>
        {/* At 375px all three controls fitted on one row *exactly*, so nothing wrapped and
            the field was squeezed to 134px — "Search by un…". Giving the form the full row
            on mobile pushes Filters onto its own line and leaves the input ~220px. */}
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
          <form className="flex w-full min-w-0 gap-2 sm:w-auto" action="/universities" method="GET">
            {country ? <input type="hidden" name="country" value={country} /> : null}
            {region ? <input type="hidden" name="region" value={region.id} /> : null}
            <UniversitySearchBox defaultValue={q} country={country ?? null} />
            <Button type="submit" variant="outline" size="sm" className="shrink-0">
              <Search className="size-3.5" /> {t("search")}
            </Button>
          </form>
          <FilterSheet
            activeCount={activeFilterCount}
            clearHref={buildFilterHref({ cost: [], type: null, size: [], rank: null, detailedOnly: false })}
            groups={[
              {
                label: t("costOfAttendance"),
                description: t("costSpanHint"),
                options: toMultiOptions(COST_BUCKETS.map((b) => ({ value: b.value, label: costBucketLabel(b.value, locale) })), cost, "cost"),
              },
              { label: t("institutionType"), options: toOptions(TYPE_OPTIONS.map((o) => ({ value: o.value, label: typeOptionLabel(o.value, locale) })), type, "type") },
              {
                label: t("studentPopulation"),
                description: t("costSpanHint"),
                options: toMultiOptions(SIZE_BUCKETS.map((b) => ({ value: b.value, label: sizeBucketLabel(b.value, locale) })), size, "size"),
              },
              { label: t("qsRanking"), options: toOptions(RANK_TIERS.map((v) => ({ value: v, label: rankOptionLabel(v, locale) })), rank, "rank") },
              {
                // A single on/off option, not a toOptions/toMultiOptions list — there's only
                // one real value here ("show only the researched ones"), not a set of
                // presets to pick among. Off by default, student-toggled, never applied for
                // them: lib/universities/browse-page.ts's QS-unranked-appended-not-dropped
                // precedent is the house rule this follows (CEO, 2026-09-02).
                label: t("researchDepth"),
                description: t("researchDepthHint"),
                options: [
                  {
                    value: "detailed",
                    label: t("detailedProfilesOnly"),
                    active: detailedOnly,
                    href: buildFilterHref({ detailedOnly: !detailedOnly }),
                  },
                ],
              },
            ]}
          />
        </div>
      </div>

      {universities.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {/* A range ("Showing 1–48 of 1,010") described a numbered page and would go
                  stale the moment the grid below appends the next batch — this server
                  render can't know how far the student has scrolled. The total is the part
                  that stays true; how many are currently on screen is announced by the
                  grid's own live region instead. */}
              {q
                ? t("resultsForQuery", { count: universities.length, formatted: formatNumber(universities.length), query: q })
                : `${t("totalInScope", { count: totalResults, formatted: formatNumber(totalResults) })}${scopeLabel ? t("inScopeSuffix", { scope: scopeLabel }) : ""}`}
            </p>
            {!q ? <SortSelect value={sort} options={SORT_OPTIONS.map((o) => ({ ...o, href: buildSortHref(o.value) }))} /> : null}
          </div>
          {costUnknownCount || sizeUnknownCount ? (
            <p className="text-xs text-muted-foreground/80">
              {costUnknownCount ? t("costUnknownExcluded", { count: costUnknownCount, formatted: formatNumber(costUnknownCount) }) : ""}
              {sizeUnknownCount ? t("sizeUnknownExcluded", { count: sizeUnknownCount, formatted: formatNumber(sizeUnknownCount) }) : ""}
            </p>
          ) : null}
          {isListView ? (
            <UniversityBrowseGrid
              key={browseGridKey}
              initialUniversities={universities}
              initialMeta={cardMeta}
              initialSavedIds={[...savedIds]}
              initialHasMore={hasMore}
              params={browseParams}
              buildCountryHref={countryHrefByName}
              planTier={planTier}
            />
          ) : (
            // UI-V3 § 22: roughly 58/42. The map is sticky so it stays in view while the
            // results column scrolls — the whole point of pairing them is being able to read
            // a result and glance at where it is without losing either.
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <UniversityExplorerHero
                  countryCounts={countryCounts}
                  mapPins={mapPins}
                  selected={country ?? null}
                  selectedRegion={region?.id ?? null}
                  tier={planTier}
                />
              </div>
              {/* Cards beside the map, not a text list (founder request): a university is
                  a place, and a row of names next to a map of places gives the eye nothing
                  to connect. Two columns of compact cards fit the ~42% panel; the cards
                  carry the same campus imagery the full grid does. */}
              {/* One column, not two. The results panel is ~42% of a 1200px measure, so a
                  two-up grid gave each card 223px — the action row overflowed and the
                  cost line wrapped to three lines. A container query rather than a
                  viewport one, because this panel's width is set by the split, not the
                  screen: it goes two-up only if the panel itself ever gets wide enough. */}
              <div className="@container min-w-0">
                <UniversityBrowseGrid
                  key={browseGridKey}
                  initialUniversities={universities}
                  initialMeta={cardMeta}
                  initialSavedIds={[...savedIds]}
                  initialHasMore={hasMore}
                  params={browseParams}
                  compact
                  buildCountryHref={countryHrefByName}
                  planTier={planTier}
                />
              </div>
            </div>
          )}
          <CompareBar />
        </>
      ) : (
        <EmptyState
          icon={Landmark}
          title={`${t("noUniversitiesFound")}${q ? t("matchingQuerySuffix", { query: q }) : ""}${scopeLabel ? t("inScopeSuffix", { scope: scopeLabel }) : ""}`}
          description={activeFilterCount > 0 ? t("noMatchFilters") : t("dataAddedOverTime")}
        />
      )}

      {uncoveredCountries.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("uncoveredNote", { count: uncoveredCountries.length, formatted: formatNumber(uncoveredCountries.length), names: uncoveredCountries.join(", ") })}
        </p>
      ) : null}
    </div>
  );
}
