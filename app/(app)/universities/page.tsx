import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { Landmark, Search } from "lucide-react";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { UniversityCard } from "@/features/universities/university-card";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { regionById } from "@/lib/data/regions";
import { searchUniversityRows } from "@/lib/universities/alias-search";
import { getSupersededUniversityIds } from "@/lib/universities/canonical";
import { getUniversityCountByCountry } from "@/lib/universities/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { Pagination } from "@/components/oryn/pagination";
import { SortSelect } from "@/features/universities/sort-select";
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
  searchParams: Promise<{ country?: string; region?: string; q?: string; page?: string; sort?: string }>;
}) {
  const { country, region: regionId, q, page: pageParam, sort: sortParam } = await searchParams;
  const region = regionId ? regionById.get(regionId) : undefined;
  const page = Math.max(1, Number(pageParam) || 1);
  // "Recommended" isn't offered: there's no real personalization engine behind this browse
  // view yet, and a fake relevance score would be exactly the "sahte scoring" a founder
  // review explicitly ruled out. Ranking is the closest honest default.
  const sort: SortOption = sortParam === "students" || sortParam === "name" ? sortParam : "ranking";
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
  const supersededIds = getSupersededUniversityIds();

  /**
   * `sort === "ranking"` needs a different PRIMARY table: `universities` has no ranking
   * column of its own (rankings live in `university_rankings`, a separate table — this
   * codebase's hand-authored Database type can't reliably embed a foreign-table order-by,
   * per the same constraint `getTargetUniversitiesWithDetails` documents), so a true
   * database-level ranking sort has to start FROM `university_rankings` and fetch the
   * matching `universities` rows after, not the other way around.
   *
   * Known, honest limitation: only 1009/1019 universities have a QS rank at all. The 10
   * without one simply don't appear under Ranking sort — not hidden on purpose, just not
   * produced by a query that starts from the rankings table. Name or Student population
   * sort show them fine. A real fix needs either a denormalized sort column on
   * `universities` or a Postgres view/RPC joining the two — neither buildable without
   * migration/DDL access this session; noted for the founder backlog rather than blocked on.
   */
  async function fetchRankingSortedPage(): Promise<{ data: University[]; count: number }> {
    let idsQuery = supabase.from("universities").select("id").order("id", { ascending: true });
    if (scopedCountries) idsQuery = idsQuery.in("country", scopedCountries);
    if (supersededIds.length > 0) idsQuery = idsQuery.not("id", "in", `(${supersededIds.join(",")})`);
    const { data: scopedIdRows } = await idsQuery;
    const scopedIds = (scopedIdRows ?? []).map((r) => r.id);
    if (scopedIds.length === 0) return { data: [], count: 0 };

    const { data: rankRows, count } = await supabase
      .from("university_rankings")
      .select("university_id", { count: "exact" })
      .eq("ranking_provider", "QS")
      .in("university_id", scopedIds)
      .order("rank_numeric", { ascending: true, nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const orderedIds = (rankRows ?? []).map((r) => r.university_id);
    if (orderedIds.length === 0) return { data: [], count: count ?? 0 };

    const { data: rows } = await supabase.from("universities").select("*").in("id", orderedIds);
    const byId = new Map((rows ?? []).map((u) => [u.id, u]));
    const ordered = orderedIds.map((id) => byId.get(id)).filter((u): u is University => u != null);
    return { data: ordered, count: count ?? 0 };
  }

  let browseQuery = supabase
    .from("universities")
    .select("*", { count: "exact" })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sort === "students") browseQuery = browseQuery.order("student_size", { ascending: false, nullsFirst: false });
  else browseQuery = browseQuery.order("name", { ascending: true });
  if (scopedCountries) browseQuery = browseQuery.in("country", scopedCountries);
  if (supersededIds.length > 0) browseQuery = browseQuery.not("id", "in", `(${supersededIds.join(",")})`);

  const [universitiesRes, liveCountryCounts, targetsRes] = await Promise.all([
    q ? Promise.resolve(null) : sort === "ranking" ? fetchRankingSortedPage() : browseQuery,
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
  const searchResult = q ? await searchUniversityRows(supabase, q, { limit: PAGE_SIZE, countries: scopedCountries }) : null;
  const universities = searchResult ?? universitiesRes?.data ?? [];
  const totalResults = q ? universities.length : (universitiesRes?.count ?? 0);
  const totalPages = q ? 1 : Math.max(1, Math.ceil(totalResults / PAGE_SIZE));

  // Batch-fetched separately (see getTargetUniversitiesWithDetails for why: our hand
  // -authored Database type can't model FK embedding reliably) rather than joined in the
  // main query, so cards can show "QS #N" without slowing down the primary browse path.
  const qsRankByUniId = new Map<string, string>();
  const costByUniId = new Map<string, { amount: number; currency: string | null }>();
  const researchTopicsByUniId = new Map<string, string[]>();
  if (universities.length > 0) {
    const ids = universities.map((u) => u.id);
    const [{ data: rankings }, { data: stats }, { data: metrics }] = await Promise.all([
      supabase.from("university_rankings").select("university_id, rank_display").eq("ranking_provider", "QS").in("university_id", ids),
      supabase.from("university_statistics").select("university_id, cost_of_attendance, cost_currency").in("university_id", ids).not("cost_of_attendance", "is", null),
      supabase.from("university_profile_metrics").select("university_id, value_text").eq("metric_code", "research_topics_top5").in("university_id", ids),
    ]);
    for (const r of rankings ?? []) qsRankByUniId.set(r.university_id, r.rank_display);
    for (const s of stats ?? []) {
      if (s.cost_of_attendance != null) costByUniId.set(s.university_id, { amount: s.cost_of_attendance, currency: s.cost_currency });
    }
    for (const m of metrics ?? []) {
      if (m.value_text) researchTopicsByUniId.set(m.university_id, m.value_text.split(" | ").filter(Boolean).slice(0, 3));
    }
  }

  const scopeLabel = country ?? region?.name ?? null;

  function buildPageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    if (sort !== "ranking") params.set("sort", sort);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/universities?${qs}` : "/universities";
  }

  function buildSortHref(nextSort: SortOption): string {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (region) params.set("region", region.id);
    if (q) params.set("q", q);
    if (nextSort !== "ranking") params.set("sort", nextSort);
    const qs = params.toString();
    return qs ? `/universities?${qs}` : "/universities";
  }

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
        <form className="flex gap-2" action="/universities" method="GET">
          {country ? <input type="hidden" name="country" value={country} /> : null}
          {region ? <input type="hidden" name="region" value={region.id} /> : null}
          <Input name="q" defaultValue={q} placeholder="Search by university name…" className="sm:w-72" />
          <Button type="submit" variant="outline" size="sm">
            <Search className="size-3.5" /> Search
          </Button>
        </form>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {universities.map((university) => (
              <UniversityCard
                key={university.id}
                university={university}
                isSaved={savedIds.has(university.id)}
                qsRank={qsRankByUniId.get(university.id)}
                cost={costByUniId.get(university.id)}
                researchTopics={researchTopicsByUniId.get(university.id)}
              />
            ))}
          </div>
          {!q ? <Pagination currentPage={page} totalPages={totalPages} buildHref={buildPageHref} /> : null}
        </>
      ) : (
        <EmptyState
          icon={Landmark}
          title={`No universities found${q ? ` matching "${q}"` : ""}${scopeLabel ? ` in ${scopeLabel}` : ""}`}
          description="University data is added over time — check back soon, or try another region."
        />
      )}

      {uncoveredCountries.length > 0 ? (
        <p className="text-xs text-muted-foreground/70">
          Note: {uncoveredCountries.length} check-in-progress {uncoveredCountries.length === 1 ? "country isn't" : "countries aren't"} yet mapped to a
          region ({uncoveredCountries.join(", ")}) — included in the total above, not yet in any region tab.
        </p>
      ) : null}
    </div>
  );
}
