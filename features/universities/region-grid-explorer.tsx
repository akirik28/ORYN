import Link from "next/link";
import { cn } from "@/lib/utils";
import { MAP_REGIONS } from "@/lib/data/regions";
import type { CountryCount } from "./world-map-explorer";

const PILL = "rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-(--duration-fast)";
const PILL_ACTIVE = "border-brand-primary bg-brand-primary text-primary-foreground";
const PILL_INACTIVE = "border-border hover:border-brand-primary-border hover:bg-brand-primary-subtle";

/**
 * Accessible, always-rendered navigation for exploring universities by region and
 * country — real <Link>s, no JS required. This is both the primary mobile experience
 * (the map is desktop-only, see university-explorer-hero.tsx) and the keyboard/
 * screen-reader-friendly alternative to the decorative map on larger screens. World ->
 * region -> country is expressed here purely through query params (`?region=`,
 * `?country=`), the same state the map drill-down reads — one source of truth, not a
 * UI-only navigation mode the map and this list could fall out of sync on.
 */
export function RegionGridExplorer({
  countryCounts,
  selected,
  selectedRegion,
}: {
  countryCounts: CountryCount[];
  selected: string | null;
  selectedRegion: string | null;
}) {
  const withData = countryCounts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const countByName = new Map(countryCounts.map((c) => [c.country, c.count]));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse universities by region">
        <Link href="/universities" className={cn(PILL, "text-base", !selectedRegion && !selected ? PILL_ACTIVE : PILL_INACTIVE)}>
          World
        </Link>
        {MAP_REGIONS.map((region) => {
          const count = region.countries.reduce((sum, name) => sum + (countByName.get(name) ?? 0), 0);
          return (
            <Link
              key={region.id}
              href={`/universities?region=${region.id}`}
              className={cn(PILL, "text-base", selectedRegion === region.id ? PILL_ACTIVE : PILL_INACTIVE)}
            >
              {region.name} <span className="opacity-70">· {count}</span>
            </Link>
          );
        })}
      </div>

      {withData.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          University data is still being added. Check back soon.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse universities by country">
          {withData.map(({ country, count }) => (
            <Link
              key={country}
              href={`/universities?country=${encodeURIComponent(country)}`}
              className={cn(PILL, selected === country ? PILL_ACTIVE : PILL_INACTIVE)}
            >
              {country} <span className="opacity-60">· {count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
