import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CountryCount } from "./world-map-explorer";

/**
 * Accessible, always-rendered navigation for exploring universities by country — real
 * <Link>s, no JS required. This is both the primary mobile experience (the map is
 * desktop-only, see university-explorer.tsx) and the keyboard/screen-reader-friendly
 * alternative to the decorative map on larger screens.
 */
export function RegionGridExplorer({
  countryCounts,
  selected,
}: {
  countryCounts: CountryCount[];
  selected: string | null;
}) {
  const withData = countryCounts.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);

  if (withData.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        University data is still being added. Check back soon.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" role="navigation" aria-label="Browse universities by country">
      <Link
        href="/universities"
        className={cn(
          "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          !selected ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
        )}
      >
        All regions
      </Link>
      {withData.map(({ country, count }) => (
        <Link
          key={country}
          href={`/universities?country=${encodeURIComponent(country)}`}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
            selected === country ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          {country} <span className="opacity-60">· {count}</span>
        </Link>
      ))}
    </div>
  );
}
