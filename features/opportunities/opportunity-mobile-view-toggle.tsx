"use client";

import { useState } from "react";
import { Compass, Map as MapIcon, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/oryn/empty-state";
import { OpportunityCard } from "./opportunity-card";
import { OpportunityCountryPills } from "./opportunity-country-pills";
import { OpportunityMapMobile } from "./opportunity-map-hero";
import type { Opportunity, SavedOpportunityStatus } from "@/types/database";
import type { OpportunityCountryCount } from "@/lib/opportunities/browse";

const TAB = "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)";
const TAB_ACTIVE = "bg-card text-foreground shadow-sm";
const TAB_INACTIVE = "text-muted-foreground";

export interface OpportunityMobileRow {
  opportunity: Opportunity;
  matchScore: number;
  eligible: boolean;
  eligibilityNotes: string | null;
  reasonCodes: string[];
  savedStatus: SavedOpportunityStatus | null;
}

/**
 * Mobile-only: a real map and a full result list stacked on one 375px screen is the "desktop
 * layout squeezed onto mobile" the founder's brief explicitly rules out — map and list both
 * stay full functionality, just one visible at a time. Local UI state only (not
 * URL-persisted): this is a view preference, not a filter, so it doesn't need to survive a
 * link share or a page reload the way `?country=`/`?selected=` do.
 *
 * Takes plain, serializable data (not a render-prop function) and renders both tabs itself —
 * a function prop can't cross the Server->Client boundary at all ("Functions cannot be passed
 * directly to Client Components" — hit this for real building it, same trap
 * achievement-section.tsx's own comment documents), so the parent Server Component hands over
 * data, and this component owns turning it into markup for whichever tab is active.
 */
export function OpportunityMobileViewToggle({
  countryCounts,
  filterParamsString,
  selectedCountry,
  rows,
  selectedId,
}: {
  countryCounts: OpportunityCountryCount[];
  filterParamsString: string;
  selectedCountry: string | null;
  rows: OpportunityMobileRow[];
  selectedId: string | null;
}) {
  const [view, setView] = useState<"map" | "list">("list");
  const filterParams = new URLSearchParams(filterParamsString);

  // Mirrors page.tsx's own selectedHref exactly (toggle `?selected=` on/off) — built here
  // from plain, already-serialized data (filterParamsString) rather than received as a
  // function prop, which can't cross the Server->Client boundary at all.
  function selectedHref(opportunityId: string): string {
    const p = new URLSearchParams(filterParamsString);
    if (selectedId === opportunityId) p.delete("selected");
    else p.set("selected", opportunityId);
    return `/opportunities?${p.toString()}`;
  }

  return (
    <div className="space-y-4 md:hidden">
      <div className="flex gap-1 rounded-xl border bg-muted/50 p-1">
        <button type="button" onClick={() => setView("list")} className={cn(TAB, view === "list" ? TAB_ACTIVE : TAB_INACTIVE)} aria-pressed={view === "list"}>
          <List className="size-4" /> List
        </button>
        <button type="button" onClick={() => setView("map")} className={cn(TAB, view === "map" ? TAB_ACTIVE : TAB_INACTIVE)} aria-pressed={view === "map"}>
          <MapIcon className="size-4" /> Map
        </button>
      </div>

      {view === "map" ? (
        <div className="space-y-4">
          <OpportunityMapMobile countryCounts={countryCounts} filterParams={filterParams} />
          <OpportunityCountryPills countryCounts={countryCounts} selected={selectedCountry} filterParams={filterParams} />
        </div>
      ) : rows.length > 0 ? (
        <div className="grid gap-4">
          {rows.map((row) => (
            <OpportunityCard
              key={row.opportunity.id}
              opportunity={row.opportunity}
              matchScore={row.matchScore}
              reasonCodes={row.reasonCodes}
              eligible={row.eligible}
              eligibilityNotes={row.eligibilityNotes}
              initialStatus={row.savedStatus}
              detailHref={selectedHref(row.opportunity.id)}
              selected={selectedId === row.opportunity.id}
            />
          ))}
        </div>
      ) : (
        // Mirrors page.tsx's own desktop empty state (same icon/copy, minus the search-term
        // interpolation — this component only receives resolved rows, not the raw query
        // string) so a zero-result filter combination doesn't silently render a blank grid
        // on mobile, which had no fallback here before.
        <EmptyState
          icon={Compass}
          title="No opportunities found"
          description="Try a different search, or clear a filter — Oryn's opportunity catalog grows over time."
        />
      )}
    </div>
  );
}
