import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { humanizeCategory } from "@/lib/opportunities/category-visuals";
import type { Opportunity } from "@/types/database";
import type { OpportunityFacets } from "@/lib/opportunities/browse";

const PILL =
  "rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-(--duration-fast) outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const PILL_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const PILL_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";
const SELECT_CLASS = "h-9 w-full rounded-lg border bg-background px-2.5 text-sm";

const CYCLE_STATUS_OPTIONS: { value: Opportunity["cycle_status"]; label: string }[] = [
  { value: "open", label: "Open now" },
  { value: "upcoming", label: "Opens soon" },
  { value: "closed", label: "Closed for this cycle" },
  { value: "date_not_announced", label: "Next dates not announced" },
];

export interface OpportunityFilterParams {
  q?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  freeOnly?: boolean;
  savedOnly?: boolean;
  cycleStatus?: string;
}

/**
 * Compact left rail — real ORYN dimensions only (category, search, country, cycle status,
 * remote/online, free, saved), each backed by an actual column (see browse.ts). No
 * field/subject, duration, or eligibility filter yet: the founder's brief lists those as
 * candidates "where supported," and today they'd either have too few real values to be
 * useful (fields is a free-form text[] with no controlled vocabulary yet) or are already
 * surfaced per-card (eligibility) rather than filterable. One GET form, not five separate
 * <Link> combinations — the same reasoning the previous horizontal filter bar used, just
 * laid out vertically. `country` stays out of this form (the map/country-pills own that
 * one param) so a country selected on the map is never silently cleared by submitting a
 * search.
 */
export function OpportunityFilterRail({ facets, current }: { facets: OpportunityFacets; current: OpportunityFilterParams }) {
  const totalActive = facets.categoryCounts.reduce((sum, c) => sum + c.count, 0);
  const hasAnyFilter = Boolean(
    current.q || current.category || current.remoteOnly || current.freeOnly || current.savedOnly || current.cycleStatus
  );

  function categoryHref(category: string | undefined): string {
    const params = new URLSearchParams();
    params.set("view", "browse");
    if (current.q) params.set("q", current.q);
    if (category) params.set("category", category);
    if (current.country) params.set("country", current.country);
    if (current.remoteOnly) params.set("remote", "1");
    if (current.freeOnly) params.set("free", "1");
    if (current.savedOnly) params.set("saved", "1");
    if (current.cycleStatus) params.set("cycle", current.cycleStatus);
    return `/opportunities?${params.toString()}`;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Category</p>
        <div className="flex flex-wrap gap-1.5">
          <Link href={categoryHref(undefined)} className={cn(PILL, !current.category ? PILL_ACTIVE : PILL_INACTIVE)}>
            All <span className="opacity-70">· {totalActive}</span>
          </Link>
          {facets.categoryCounts.map(({ category, count }) => (
            <Link
              key={category}
              href={categoryHref(category)}
              className={cn(PILL, current.category === category ? PILL_ACTIVE : PILL_INACTIVE, count === 0 && current.category !== category && "opacity-50")}
            >
              {humanizeCategory(category)} <span className="opacity-70">· {count}</span>
            </Link>
          ))}
        </div>
      </div>

      <form action="/opportunities" method="GET" className="space-y-4 rounded-2xl border bg-card p-4">
        <input type="hidden" name="view" value="browse" />
        {current.category ? <input type="hidden" name="category" value={current.category} /> : null}
        {current.country ? <input type="hidden" name="country" value={current.country} /> : null}

        <div className="space-y-1.5">
          <label htmlFor="opp-q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="opp-q" name="q" defaultValue={current.q} placeholder="Title or organization…" className="pl-7" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="opp-cycle" className="text-xs font-medium text-muted-foreground">
            Cycle status
          </label>
          <select id="opp-cycle" name="cycle" defaultValue={current.cycleStatus ?? ""} className={SELECT_CLASS}>
            <option value="">Any</option>
            {CYCLE_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 border-t pt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="remote" value="1" defaultChecked={current.remoteOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
            Remote / online
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="free" value="1" defaultChecked={current.freeOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
            Free only
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="saved" value="1" defaultChecked={current.savedOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
            Saved only
          </label>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" size="sm" className="flex-1">
            Apply
          </Button>
          {hasAnyFilter ? (
            <Button type="button" variant="ghost" size="sm" render={<Link href="/opportunities?view=browse" />} nativeButton={false}>
              Reset
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
