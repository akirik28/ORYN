import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { Landmark } from "lucide-react";
import { UniversityExplorerHero } from "@/features/universities/university-explorer-hero";
import { UniversityCard } from "@/features/universities/university-card";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export const metadata = { title: "Universities" };

export default async function UniversitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; q?: string }>;
}) {
  const { country, q } = await searchParams;
  const session = await requireUser();
  const supabase = await createClient();

  let query = supabase.from("universities").select("*").order("name", { ascending: true }).limit(48);
  if (country) query = query.eq("country", country);
  if (q) query = query.ilike("name", `%${q}%`);

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
  const universities = universitiesRes.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title="Explore universities" description="A world of programs — start with a region, or search directly." />

      <UniversityExplorerHero countryCounts={countryCounts} selected={country ?? null} />

      <form className="flex gap-2" action="/universities" method="GET">
        {country ? <input type="hidden" name="country" value={country} /> : null}
        <Input name="q" defaultValue={q} placeholder="Search by university name…" className="max-w-sm" />
      </form>

      {universities.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.map((university) => (
            <UniversityCard key={university.id} university={university} isSaved={savedIds.has(university.id)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Landmark}
          title={`No universities found${q ? ` matching "${q}"` : ""}${country ? ` in ${country}` : ""}`}
          description="University data is added over time — check back soon, or try another region."
        />
      )}
    </div>
  );
}
