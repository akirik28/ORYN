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
// Unscoped ("World") view shows only the top N countries as pills — with real global
// coverage (89 countries as of 2026-08-18, was a 12-country allowlist before) showing every
// one at once is the "100 pills" clutter a founder review flagged. A selected region instead
// shows every country IN that region (region country-lists are small enough — under 40 even
// for the biggest, Europe — that a region-scoped list doesn't need the same cap). Either way,
// anything beyond what's shown sits behind a plain `<details>` disclosure: no client JS, no
// search-as-you-type state to wire up, works with the same real `<Link>`-per-country pattern
// as everything else here.
const TOP_N_UNSCOPED = 10;

export function RegionGridExplorer({
  countryCounts,
  selected,
  selectedRegion,
}: {
  countryCounts: CountryCount[];
  selected: string | null;
  selectedRegion: string | null;
}) {
  const countByName = new Map(countryCounts.map((c) => [c.country, c.count]));
  const region = selectedRegion ? MAP_REGIONS.find((r) => r.id === selectedRegion) : undefined;
  const regionCountrySet = region ? new Set(region.countries) : null;

  const withData = countryCounts
    .filter((c) => c.count > 0 && (!regionCountrySet || regionCountrySet.has(c.country)))
    .sort((a, b) => b.count - a.count);
  const visible = regionCountrySet ? withData : withData.slice(0, TOP_N_UNSCOPED);
  const overflow = regionCountrySet ? [] : withData.slice(TOP_N_UNSCOPED);

  function CountryPill({ country, count }: { country: string; count: number }) {
    return (
      <Link href={`/universities?country=${encodeURIComponent(country)}`} className={cn(PILL, selected === country ? PILL_ACTIVE : PILL_INACTIVE)}>
        {country} <span className="opacity-60">· {count}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse universities by region">
        <Link href="/universities" className={cn(PILL, "text-base", !selectedRegion && !selected ? PILL_ACTIVE : PILL_INACTIVE)}>
          World
        </Link>
        {MAP_REGIONS.map((r) => {
          const count = r.countries.reduce((sum, name) => sum + (countByName.get(name) ?? 0), 0);
          return (
            <Link key={r.id} href={`/universities?region=${r.id}`} className={cn(PILL, "text-base", selectedRegion === r.id ? PILL_ACTIVE : PILL_INACTIVE)}>
              {r.name} <span className="opacity-70">· {count}</span>
            </Link>
          );
        })}
      </div>

      {withData.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          {region ? `No ${region.name} universities yet — check back soon.` : "University data is still being added. Check back soon."}
        </p>
      ) : (
        <div role="navigation" aria-label="Browse universities by country">
          <div className="flex flex-wrap gap-2">
            {visible.map(({ country, count }) => (
              <CountryPill key={country} country={country} count={count} />
            ))}
          </div>
          {overflow.length > 0 ? (
            <details className="mt-2 group" open={overflow.some((c) => c.country === selected)}>
              {/* Starts open when the active country filter is one of the overflow ones —
                  otherwise a direct link or a page reload with e.g. ?country=Turkey would
                  show the pill list with the actually-selected country hidden. */}
              <summary className={cn(PILL, PILL_INACTIVE, "inline-flex w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden")}>
                All countries <span className="opacity-60">({overflow.length} more)</span>
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {overflow.map(({ country, count }) => (
                  <CountryPill key={country} country={country} count={count} />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}
