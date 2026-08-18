import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Opportunity } from "@/types/database";
import type { OpportunityFacets } from "@/lib/opportunities/browse";

const PILL = "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast)";
const PILL_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const PILL_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";
const SELECT_CLASS = "h-9 rounded-lg border bg-background px-2.5 text-sm";

const CYCLE_STATUS_OPTIONS: { value: Opportunity["cycle_status"]; label: string }[] = [
  { value: "open", label: "Open now" },
  { value: "upcoming", label: "Opens soon" },
  { value: "closed", label: "Closed for this cycle" },
  { value: "date_not_announced", label: "Next dates not announced" },
];

export interface OpportunityBrowseParams {
  q?: string;
  category?: string;
  country?: string;
  remoteOnly?: boolean;
  freeOnly?: boolean;
  cycleStatus?: string;
}

function humanizeCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function categoryHref(current: OpportunityBrowseParams, category: string | undefined): string {
  const params = new URLSearchParams();
  params.set("view", "browse");
  if (current.q) params.set("q", current.q);
  if (category) params.set("category", category);
  if (current.country) params.set("country", current.country);
  if (current.remoteOnly) params.set("remote", "1");
  if (current.freeOnly) params.set("free", "1");
  if (current.cycleStatus) params.set("cycle", current.cycleStatus);
  return `/opportunities?${params.toString()}`;
}

/**
 * Category is expressed as real <Link>s (query params, no JS needed — same pattern as
 * RegionGridExplorer for universities), so switching category is a single click/tap and
 * shareable as a URL. The remaining facets (text, country, remote, free, cycle status)
 * combine as an AND and go through one plain GET form instead: five independent link
 * combinations would be 2^5 URLs to reason about, where a form is just... a form.
 * Category-specific structured filters from the founder's spec (residential, team size,
 * paid/stipend, ...) aren't built here because the columns don't exist yet — adding UI
 * for data the ingestion pipeline doesn't populate would be exactly the "manufactured
 * value" AGENTS.md rules out. Real today: category, subject-adjacent search, country,
 * remote/online, free/paid, and cycle status, all backed by actual columns.
 */
export function OpportunityFilterBar({ facets, current }: { facets: OpportunityFacets; current: OpportunityBrowseParams }) {
  const totalActive = facets.categoryCounts.reduce((sum, c) => sum + c.count, 0);
  const hasAnyFilter = Boolean(
    current.q || current.category || current.country || current.remoteOnly || current.freeOnly || current.cycleStatus
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse opportunities by category">
        <Link href={categoryHref(current, undefined)} className={cn(PILL, !current.category ? PILL_ACTIVE : PILL_INACTIVE)}>
          All <span className="opacity-70">· {totalActive}</span>
        </Link>
        {facets.categoryCounts.map(({ category, count }) => (
          <Link
            key={category}
            href={categoryHref(current, category)}
            className={cn(PILL, current.category === category ? PILL_ACTIVE : PILL_INACTIVE, count === 0 && current.category !== category && "opacity-50")}
          >
            {humanizeCategory(category)} <span className="opacity-70">· {count}</span>
          </Link>
        ))}
      </div>

      <form action="/opportunities" method="GET" className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4">
        <input type="hidden" name="view" value="browse" />
        {current.category ? <input type="hidden" name="category" value={current.category} /> : null}

        <div className="min-w-48 flex-1 space-y-1.5">
          <label htmlFor="opp-q" className="text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input id="opp-q" name="q" defaultValue={current.q} placeholder="Title or organization…" className="pl-7" />
          </div>
        </div>

        {facets.countries.length > 0 ? (
          <div className="space-y-1.5">
            <label htmlFor="opp-country" className="text-xs font-medium text-muted-foreground">
              Country
            </label>
            <select id="opp-country" name="country" defaultValue={current.country ?? ""} className={SELECT_CLASS}>
              <option value="">Any</option>
              {facets.countries.map(({ country, count }) => (
                <option key={country} value={country}>
                  {country} ({count})
                </option>
              ))}
            </select>
          </div>
        ) : null}

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

        <label className="flex h-9 items-center gap-1.5 text-sm">
          <input type="checkbox" name="remote" value="1" defaultChecked={current.remoteOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
          Remote/online
        </label>
        <label className="flex h-9 items-center gap-1.5 text-sm">
          <input type="checkbox" name="free" value="1" defaultChecked={current.freeOnly} className="size-4 rounded border-input accent-(--brand-primary)" />
          Free only
        </label>

        <Button type="submit" size="sm">
          Apply
        </Button>
        {hasAnyFilter ? (
          <Button type="button" variant="ghost" size="sm" render={<Link href="/opportunities?view=browse" />} nativeButton={false}>
            Reset
          </Button>
        ) : null}
      </form>
    </div>
  );
}
