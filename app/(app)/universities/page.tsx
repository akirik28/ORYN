import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { Landmark, Search } from "lucide-react";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { UniversityCard } from "@/features/universities/university-card";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { regionById } from "@/lib/data/regions";
import { rankUniversities } from "@/lib/universities/alias-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export const metadata = { title: "Universities" };

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; region?: string; q?: string }>;
}) {
  const { country, region: regionId, q } = await searchParams;
  const region = regionId ? regionById.get(regionId) : undefined;
  const session = await requireUser();
  const supabase = await createClient();

  // A text search fetches a wider candidate set and ranks it alias/accent-aware in TS
  // (lib/universities/alias-search.ts) instead of relying on `ilike`, which could never
  // match "MIT" -> Massachusetts Institute of Technology or "uskudar" -> "Üsküdar ...".
  // Browsing without a query keeps the cheap, ordered, directly-limited path.
  const RESULT_LIMIT = 48;
  const SEARCH_CANDIDATE_LIMIT = 500;
  let query = supabase
    .from("universities")
    .select("*")
    .order("name", { ascending: true })
    .limit(q ? SEARCH_CANDIDATE_LIMIT : RESULT_LIMIT);
  if (country) {
    query = query.eq("country", country);
  } else if (region) {
    // A region with zero countries today (Asia) would make `.in()` receive an empty
    // array — Postgres/PostgREST handle that as "match nothing" correctly, but being
    // explicit here means the query never even runs for a state that can only ever be
    // empty, rather than relying on that edge-case behavior.
    query = region.countries.length > 0 ? query.in("country", region.countries) : query.eq("country", "__no_countries_in_region__");
  }

  const [universitiesRes, allCountriesRes, targetsRes] = await Promise.all([
    query,
    supabase.from("universities").select("country"),
    supabase.from("target_universities").select("university_id").eq("user_id", session.userId!),
  ]);

  const countryCounts = SUPPORTED_COUNTRIES.map((c) => ({
    country: c.name,
    count: (allCountriesRes.data ?? []).filter((u) => u.country === c.name).length,
  }));

  const savedIds = new Set((targetsRes.data ?? []).map((t) => t.university_id));
  const fetchedUniversities = universitiesRes.data ?? [];
  const universities = q ? rankUniversities(q, fetchedUniversities, RESULT_LIMIT) : fetchedUniversities;

  const scopeLabel = country ?? region?.name ?? null;

  return (
    <div className="space-y-8">
      <PageHeader title="Explore universities" description="A world of programs — start with a region, or search directly." />

      <UniversityExplorerHero countryCounts={countryCounts} selected={country ?? null} selectedRegion={region?.id ?? null} />

      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Search universities</p>
          <p className="text-xs text-muted-foreground">{scopeLabel ? `Filtered to ${scopeLabel}` : "Across all supported regions"}</p>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <UniversityCard key={university.id} university={university} isSaved={savedIds.has(university.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Landmark}
          title={`No universities found${q ? ` matching "${q}"` : ""}${scopeLabel ? ` in ${scopeLabel}` : ""}`}
          description="University data is added over time — check back soon, or try another region."
        />
      )}
    </div>
  );
}
