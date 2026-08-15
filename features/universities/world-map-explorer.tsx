"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { SUPPORTED_COUNTRIES } from "@/lib/data/country-geo";
import { WORLD_REGION, type MapRegion } from "@/lib/data/regions";

const worldGeo = feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects.countries as GeometryCollection
);

export interface CountryCount {
  country: string;
  count: number;
}

/**
 * Renders either the world map or a region's drill-down map, selected entirely by the
 * `region` prop (itself sourced from the `?region=` URL param one level up in
 * `UniversityExplorerHero`) — a real d3-geo reprojection (`region.projection`), not a CSS
 * zoom applied to the same world SVG. Country selection (`?country=`) works identically
 * in both modes and preserves whichever region is currently active.
 */
export function WorldMapExplorer({ countryCounts, region = WORLD_REGION }: { countryCounts: CountryCount[]; region?: MapRegion }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country");
  const isWorld = region.id === "world";

  const countByName = useMemo(() => new Map(countryCounts.map((c) => [c.country, c.count])), [countryCounts]);
  const maxCount = Math.max(1, ...countryCounts.map((c) => c.count));
  const regionCountrySet = useMemo(() => new Set(region.countries), [region]);
  const visibleCountries = useMemo(() => SUPPORTED_COUNTRIES.filter((c) => regionCountrySet.has(c.name)), [regionCountrySet]);
  const supportedIds = useMemo(() => new Set(visibleCountries.map((c) => c.numericId)), [visibleCountries]);

  function selectCountry(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selected === name) {
      params.delete("country");
    } else {
      params.set("country", name);
    }
    router.push(`/universities${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function backToWorld() {
    // Drop region/country, keep anything else (search text) — "don't unnecessarily lose
    // unrelated filter state" when returning to world view.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("region");
    params.delete("country");
    router.push(`/universities${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  const proj = region.projection ?? WORLD_REGION.projection!;

  return (
    // Founder-locked black-blue system: `bg-card` (theme-aware, not a hardcoded literal).
    // `Geography`/marker colors below are plain CSS strings (react-simple-maps renders raw
    // SVG, not Tailwind-classed DOM) that reference the same `var(--token)` custom
    // properties Tailwind's utility classes resolve to elsewhere in this file, so the map
    // follows the active theme automatically instead of drifting from it.
    <div className="relative overflow-hidden rounded-2xl border bg-card">
      {!isWorld ? (
        <button
          type="button"
          onClick={backToWorld}
          className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-brand-primary-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-brand-primary-subtle"
        >
          <ArrowLeft className="size-3.5" /> Back to world
        </button>
      ) : null}
      <ComposableMap
        projection={proj.projection}
        projectionConfig={{ scale: proj.scale, center: proj.center }}
        width={800}
        height={420}
        style={{ width: "100%", height: "auto" }}
        className="relative"
      >
        <Geographies geography={worldGeo}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const isSupported = supportedIds.has(String(geo.id));
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  style={{
                    // Map-specific mixes, not the bare `--muted`/`--brand-primary-soft`
                    // tokens: those are tuned for large flat surfaces (a whole page
                    // background), and in the dark palette both sit close enough to
                    // `--background` that land barely separated from ocean here — exactly
                    // the "map feels empty/faded" failure mode the founder flagged. Mixed
                    // with more foreground/primary specifically for this component instead.
                    default: {
                      fill: isSupported
                        ? "color-mix(in oklch, var(--brand-primary), var(--background) 55%)"
                        : "color-mix(in oklch, var(--muted), var(--foreground) 10%)",
                      stroke: "var(--card)",
                      strokeWidth: 0.75,
                      outline: "none",
                    },
                    hover: {
                      fill: isSupported
                        ? "color-mix(in oklch, var(--brand-primary), var(--background) 35%)"
                        : "color-mix(in oklch, var(--muted), var(--foreground) 18%)",
                      outline: "none",
                    },
                    pressed: { fill: "color-mix(in oklch, var(--brand-primary), var(--background) 25%)", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
        {visibleCountries.map((c) => {
          const count = countByName.get(c.name) ?? 0;
          const isSelected = selected === c.name;
          const radius = (isWorld ? 3 : 5) + (count / maxCount) * (isWorld ? 6 : 9);
          return (
            <Marker
              key={c.name}
              coordinates={[c.centroid[1], c.centroid[0]]}
              onClick={() => selectCountry(c.name)}
              className="cursor-pointer outline-none"
            >
              {isSelected ? (
                <circle r={radius + 6} className="fill-primary/25 motion-safe:animate-ping" />
              ) : null}
              <circle
                r={radius}
                className={isSelected ? "fill-primary" : "fill-primary/60 hover:fill-primary"}
                stroke="var(--card)"
                strokeWidth={1.5}
              />
              <text
                textAnchor="middle"
                y={-radius - 6}
                className={`pointer-events-none select-none font-medium ${isSelected ? "fill-foreground" : "fill-muted-foreground"}`}
                style={{ fontSize: isWorld ? 10 : 12 }}
              >
                {c.name}
              </text>
            </Marker>
          );
        })}
      </ComposableMap>
      <p className="relative border-t px-4 py-2.5 text-center text-xs text-muted-foreground">
        {!isWorld
          ? `Exploring ${region.name} — tap a country to see its universities.`
          : countryCounts.length > 0
            ? "Tap a region to explore its universities."
            : "University data is still being added for these regions."}
      </p>
    </div>
  );
}
