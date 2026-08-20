import Link from "next/link";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/oryn/empty-state";
import type { OpportunityCountryCount } from "@/lib/opportunities/browse";

const PILL =
  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors duration-(--duration-fast) outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const PILL_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const PILL_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";

/**
 * Real <Link>s, no JS required — the always-present, keyboard/screen-reader-accessible
 * alternative to the decorative map (same role region-grid-explorer.tsx plays for
 * universities), and the sole country-navigation UI on mobile, where the map never mounts.
 * Reads the identical countryCounts the map does, so the two can never disagree.
 */
export function OpportunityCountryPills({
  countryCounts,
  selected,
  filterParams,
}: {
  countryCounts: OpportunityCountryCount[];
  selected: string | null;
  filterParams: URLSearchParams;
}) {
  function countryHref(country: string | null): string {
    const params = new URLSearchParams(filterParams);
    if (country) params.set("country", country);
    else params.delete("country");
    return `/opportunities?${params.toString()}`;
  }

  if (countryCounts.length === 0) {
    return <EmptyState icon={Globe2} title="No countries match yet" description="Try clearing a filter." className="py-6" />;
  }

  return (
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse opportunities by country">
      <Link href={countryHref(null)} className={cn(PILL, !selected ? PILL_ACTIVE : PILL_INACTIVE)}>
        All countries
      </Link>
      {countryCounts.map(({ country, count }) => (
        <Link key={country} href={countryHref(country)} className={cn(PILL, selected === country ? PILL_ACTIVE : PILL_INACTIVE)}>
          {country} <span className="opacity-60">· {count}</span>
        </Link>
      ))}
    </div>
  );
}
