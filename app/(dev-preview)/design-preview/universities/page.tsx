import { notFound } from "next/navigation";
import { Landmark, Search } from "lucide-react";
import { heroGradientStyle } from "@/components/oryn/hero-gradient";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";
import { SortSelect } from "@/features/universities/sort-select";
import { FilterSheet } from "@/features/universities/filter-sheet";
import { CompareBar } from "@/features/universities/compare-bar";
import { UniversitySearchBox } from "@/features/universities/university-search-box";
import { UniversityBrowseGrid } from "@/features/universities/university-browse-grid";
import { Button } from "@/components/ui/button";
import {
  FIXTURE_UNIVERSITY,
  FIXTURE_UNIVERSITY_2,
  FIXTURE_UNIVERSITY_3,
  FIXTURE_UNIVERSITY_CARD_META,
  FIXTURE_PROFILE_SIGNAL,
} from "@/lib/dev/fixtures";
import { PreviewShell } from "../preview-shell";
import type { University } from "@/types/database";

/**
 * Design-preview mirror of app/(app)/universities/page.tsx (2026-09-03) — never had a
 * preview at all; oryn-a7 named Universities as one of the eight surfaces to check for the
 * student-app mobile pass and there was nowhere to look.
 *
 * List view only, not the Map/List toggle the real page carries — that toggle is
 * "desktop-only chrome" by the real page's own comment (below `md` the map never mounts),
 * and both branches route through the same `UniversityBrowseGrid` this renders, so the
 * component actually under mobile scrutiny gets exercised either way. Search, filters and
 * sort render with real markup but aren't wired to a real query — same non-functional-chrome
 * precedent as this file's sibling previews (opportunity-detail, compare): visual shape is
 * the point, not the interaction.
 */
export default async function UniversitiesPreviewPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const { tier: tierParam } = await searchParams;
  const tier = tierParam === "ultra" ? "ultra" : "standard";
  const universities: University[] = [FIXTURE_UNIVERSITY, FIXTURE_UNIVERSITY_2, FIXTURE_UNIVERSITY_3];

  return (
    <PreviewShell signal={FIXTURE_PROFILE_SIGNAL} tier={tier}>
      <div className="dark space-y-8 rounded-[28px] p-4 text-foreground md:p-8" style={heroGradientStyle(tier)}>
        <PageHeader eyebrow="Explore" title="Universities" description="Every university Oryn tracks, filterable by what actually matters to you." />

        <div className="glass-card-fast flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Find a university</p>
            <p className="text-xs text-muted-foreground">Across all regions · 3 universities</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
            <form className="flex w-full min-w-0 gap-2 sm:w-auto">
              <UniversitySearchBox />
              <Button type="submit" variant="outline" size="sm" className="shrink-0">
                <Search className="size-3.5" /> Search
              </Button>
            </form>
            <FilterSheet
              activeCount={0}
              clearHref="/design-preview/universities"
              groups={[
                {
                  label: "Cost of attendance",
                  options: [
                    { value: "under_20k", label: "Under $20k", active: false, href: "#" },
                    { value: "20_40k", label: "$20k–$40k", active: false, href: "#" },
                  ],
                },
                {
                  label: "Institution type",
                  options: [
                    { value: "public", label: "Public", active: false, href: "#" },
                    { value: "private", label: "Private", active: false, href: "#" },
                  ],
                },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">3 universities</p>
          <SortSelect value="ranking" options={[{ value: "ranking", label: "QS ranking", href: "#" }, { value: "name", label: "Name", href: "#" }]} />
        </div>

        <UniversityBrowseGrid
          initialUniversities={universities}
          initialMeta={FIXTURE_UNIVERSITY_CARD_META}
          initialSavedIds={[FIXTURE_UNIVERSITY.id]}
          initialHasMore={false}
          params={{ q: null, scopedCountries: null, type: null, sort: "ranking", cost: [], size: [], rank: null, detailedOnly: false }}
          buildCountryHref={{}}
          planTier={tier}
        />

        <CompareBar />

        {/* The real page's own empty state, shown separately below the populated grid rather
            than as a second route — a plain EmptyState render with no fixture-specific data
            to get wrong. */}
        <div className="rounded-2xl border border-white/40 bg-white/10 p-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">No results state</p>
          <EmptyState icon={Landmark} title="No universities found" description="Try a different search or fewer filters." />
        </div>
      </div>
    </PreviewShell>
  );
}
