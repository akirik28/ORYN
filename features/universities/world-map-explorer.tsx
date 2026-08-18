"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker, createCoordinates } from "@vnedyalk0v/react19-simple-maps";
import type { PreparedFeature, GeographyEventData } from "@vnedyalk0v/react19-simple-maps";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { SUPPORTED_COUNTRIES, countryByName } from "@/lib/data/country-geo";
import { WORLD_REGION, type MapRegion } from "@/lib/data/regions";
import { pickLabelPriorityCountries, resolveCountryFillStyle } from "@/lib/data/map-visuals";

const worldGeo = feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects.countries as GeometryCollection
);

export interface CountryCount {
  country: string;
  count: number;
}

// How many persistent text labels render at once, before hover/selection. Everything beyond
// this is still fully reachable — every supported country still gets a clickable shape and a
// marker dot — just not a permanently-visible name, which is what turned into "text chaos"
// once SUPPORTED_COUNTRIES grew from 12 countries to 89 (see country-geo.ts's header). World
// scope gets the tightest cap (the founder's own "very few labels" ask); a region view's cap
// only actually bites for the two large regions (Europe 37 countries, Asia 32) — every other
// region has under 10, so `.slice(0, REGION_LABEL_CAP)` is a no-op there and every country
// keeps its label. The selected country's label is always shown regardless of rank — a
// student who taps a small-by-count country must still see its name, not a silent blue dot.
const WORLD_LABEL_CAP = 8;
const REGION_LABEL_CAP = 15;

interface HoverState {
  name: string;
  clientX: number;
  clientY: number;
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
  const [hover, setHover] = useState<HoverState | null>(null);

  const countByName = useMemo(() => new Map(countryCounts.map((c) => [c.country, c.count])), [countryCounts]);
  const maxCount = Math.max(1, ...countryCounts.map((c) => c.count));
  const regionCountrySet = useMemo(() => new Set(region.countries), [region]);
  const visibleCountries = useMemo(() => SUPPORTED_COUNTRIES.filter((c) => regionCountrySet.has(c.name)), [regionCountrySet]);
  const supportedIds = useMemo(() => new Set(visibleCountries.map((c) => c.numericId)), [visibleCountries]);
  // Land-shape clicks/hovers only know the topojson numeric id (geo.id) — this is the one
  // place that id gets resolved back to a country name, so both the click handler and the
  // hover handler share a single lookup instead of two independently-maintained ones.
  const nameByNumericId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of visibleCountries) if (c.numericId) map.set(c.numericId, c.name);
    return map;
  }, [visibleCountries]);
  const selectedGeoNumericId = selected ? (countryByName.get(selected)?.numericId ?? null) : null;

  // Persistent labels: the top N countries by university count, plus whichever one is
  // currently selected (however far down the list it ranks) — see the constants above for
  // why N differs between world and region scope. Hover never adds to this set; hover gets
  // its own floating tooltip instead (built below), which is the "on-demand" info layer the
  // founder asked to lean on rather than more permanent map text.
  const labelPriorityNames = useMemo(
    () => pickLabelPriorityCountries(visibleCountries, countByName, isWorld ? WORLD_LABEL_CAP : REGION_LABEL_CAP, selected),
    [visibleCountries, countByName, isWorld, selected]
  );

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

  function handleGeographyClick(_event: unknown, data?: GeographyEventData) {
    if (!data) return;
    const name = nameByNumericId.get(String(data.geography.id));
    if (name) selectCountry(name);
  }

  function handleGeographyEnter(event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) {
    if (!data) return;
    const name = nameByNumericId.get(String(data.geography.id));
    if (name) setHover({ name, clientX: event.clientX, clientY: event.clientY });
  }

  const proj = region.projection ?? WORLD_REGION.projection!;
  const hoveredCount = hover ? (countByName.get(hover.name) ?? 0) : 0;
  const hoveredRegion = hover ? countryByName.get(hover.name)?.region : undefined;

  return (
    // Founder-locked black-blue system: theme-aware tokens throughout, never a hardcoded
    // literal. A very light brand-tinted radial wash (not flat `bg-card`) stands in for
    // "ocean" — subtle enough to stay light/airy, but enough tonal separation from the
    // page background that the map reads as its own surface rather than a flat cutout.
    <div
      className="relative overflow-hidden rounded-2xl border bg-card"
      style={{ backgroundImage: "radial-gradient(ellipse 100% 100% at 50% 20%, color-mix(in oklch, var(--brand-primary), var(--card) 94%), var(--card))" }}
    >
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
        projectionConfig={{ scale: proj.scale, center: createCoordinates(proj.center[0], proj.center[1]) }}
        width={800}
        height={420}
        style={{ width: "100%", height: "auto" }}
        className="relative"
      >
        <Geographies geography={worldGeo}>
          {({ geographies }) =>
            // The library's own runtime type (GeographyData.geographies: PreparedFeature[])
            // is more specific than what the Geographies render-prop's public type exposes
            // (Feature<Geometry>[], missing rsmKey) — every geography passed through here
            // genuinely is a PreparedFeature at runtime, so this narrows a real fact the
            // type doesn't state, not an unsafe guess.
            (geographies as PreparedFeature[]).map((geo) => {
              const isSupported = supportedIds.has(String(geo.id));
              const isThisSelected = selectedGeoNumericId !== null && String(geo.id) === selectedGeoNumericId;
              const isThisHovered = isSupported && hover?.name === nameByNumericId.get(String(geo.id));
              // Color math lives in lib/data/map-visuals.ts's resolveCountryFillStyle (unit-
              // tested there) — see that file for the full ladder rationale and the "selected
              // country turning black" incident it was tuned to fix.
              const resolvedStyle: React.CSSProperties = {
                ...resolveCountryFillStyle({ isSupported, isSelected: isThisSelected, isHovered: isThisHovered }),
                outline: "none",
                cursor: isSupported ? "pointer" : "default",
                transition: "fill 150ms ease, stroke 150ms ease",
              };
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  onClick={isSupported ? handleGeographyClick : undefined}
                  onMouseEnter={isSupported ? handleGeographyEnter : undefined}
                  onMouseLeave={isSupported ? () => setHover(null) : undefined}
                  // A real bug reproduced live while building this: the library's own
                  // hover/pressed state machine (its `default`/`hover`/`pressed`/`focused`
                  // style-variant object) can drop the fill entirely right after a click —
                  // verified directly: a computed-style check on the just-clicked country's
                  // path showed an EMPTY inline `style` attribute (not a wrong color, no
                  // style at all), which is exactly what makes an SVG `<path>` fall back to
                  // the spec's own default fill — black. A fresh page load with the same
                  // country pre-selected via the URL (no click involved) rendered the
                  // correct blue every time, isolating the trigger to the click/press
                  // transition specifically, not the color logic. Rather than depend on
                  // that transition being fixed upstream, every one of the four style-
                  // variant keys the library can select between now holds this exact same,
                  // already-resolved object — hover is driven by this component's own
                  // `hover` state (already needed for the tooltip below), not the
                  // library's internal `h`/`p`/`g` flags. Whichever key its internal state
                  // machine lands on after a click, the result is identical and correct.
                  style={{ default: resolvedStyle, hover: resolvedStyle, pressed: resolvedStyle, focused: resolvedStyle }}
                />
              );
            })
          }
        </Geographies>
        {visibleCountries.map((c) => {
          const count = countByName.get(c.name) ?? 0;
          const isSelected = selected === c.name;
          const showLabel = labelPriorityNames.has(c.name);
          const radius = (isWorld ? 3 : 5) + (count / maxCount) * (isWorld ? 6 : 9);
          return (
            <Marker
              key={c.name}
              coordinates={createCoordinates(c.centroid[1], c.centroid[0])}
              onClick={() => selectCountry(c.name)}
              onMouseEnter={(event) => setHover({ name: c.name, clientX: event.clientX, clientY: event.clientY })}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer outline-none"
            >
              {isSelected ? (
                <>
                  <circle r={radius + 9} className="fill-primary/10" />
                  <circle r={radius + 6} className="fill-primary/25 motion-safe:animate-ping" />
                </>
              ) : null}
              <circle
                r={radius}
                className={isSelected ? "fill-primary" : "fill-primary/60 hover:fill-primary"}
                stroke="var(--card)"
                strokeWidth={1.5}
              />
              {showLabel ? (
                <text
                  textAnchor="middle"
                  y={-radius - 6}
                  className={`pointer-events-none select-none font-medium ${isSelected ? "fill-foreground" : "fill-muted-foreground"}`}
                  style={{ fontSize: isWorld ? 10 : 12 }}
                >
                  {c.name}
                </text>
              ) : null}
            </Marker>
          );
        })}
      </ComposableMap>
      {hover ? (
        // Positioned in viewport space (`fixed`, not `absolute`) so it's never clipped by
        // this container's own `overflow-hidden` — a card anchored `absolute` near the map's
        // edge would otherwise get cut off exactly when a student hovers the countries most
        // worth showing a tooltip for (the ones at the visible boundary).
        <div
          className="pointer-events-none fixed z-20 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.clientX + 14, top: hover.clientY + 14 }}
        >
          <p className="font-medium text-popover-foreground">{hover.name}</p>
          <p className="text-muted-foreground">
            {hoveredCount > 0 ? `${hoveredCount.toLocaleString("en-US")} ${hoveredCount === 1 ? "university" : "universities"}` : "No universities yet"}
            {hoveredRegion ? ` · ${hoveredRegion}` : ""}
          </p>
        </div>
      ) : null}
      <p className="relative border-t px-4 py-2.5 text-center text-xs text-muted-foreground">
        {!isWorld
          ? `Exploring ${region.name} — tap a country to see its universities.`
          : countryCounts.length > 0
            ? "Tap a country to explore its universities."
            : "University data is still being added for these regions."}
      </p>
    </div>
  );
}
