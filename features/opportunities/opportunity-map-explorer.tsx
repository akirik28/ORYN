"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup, createCoordinates, createZoomPanConfig } from "@vnedyalk0v/react19-simple-maps";
import type { PreparedFeature, GeographyEventData, Coordinates } from "@vnedyalk0v/react19-simple-maps";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import worldTopology from "world-atlas/countries-110m.json";
import { SUPPORTED_COUNTRIES, countryByName } from "@/lib/data/country-geo";
import { pickLabelPriorityCountries } from "@/lib/data/map-visuals";
import type { OpportunityCountryCount } from "@/lib/opportunities/browse";

// A distinct fill ladder from the university map's resolveCountryFillStyle (lib/data/
// map-visuals.ts) rather than reusing it directly — that function is shared, regression-
// tested, and tuned for a map where most of the 89 supported countries carry real data. This
// map's "has an opportunity" set is much smaller (the live catalog is ~11 opportunities
// total), so the same near-white "unsupported" tone there reads as an almost entirely blank
// map here — confirmed directly against a live render, not a guess. Land without data uses a
// warm sand/parchment tone (`--warning` heavily diluted into `--card`, both existing tokens)
// rather than green: a uniformly saturated green world reads as a single flat biome, which is
// both wrong-looking and louder than the data it's supposed to sit behind. Warm land against
// the cool `--info` ocean is the standard cartographic contrast pair, and it leaves green
// unspent so terrain shading can use it later if a real biome dataset ever lands. Land with
// data keeps the brand-blue ladder so "the data" is still the thing that pops hardest. Same
// anti-black-fill technique as the university map either way: every one of the library's four
// style-variant keys gets this identical, already-resolved object.
//
// Selected state deliberately does NOT push the fill any darker than the existing 22/30%
// dilution — this is the same near-black-at-scale zone the shared map-visuals.ts ladder was
// built to avoid (a founder-reported "selected country turned black" regression from an
// earlier, too-close-to-undiluted attempt). "More pronounced" selected state instead comes
// from a wider stroke and a brand-colored glow (`filter: drop-shadow`) — visually louder
// without going anywhere near that zone again.
function resolveOpportunityCountryFillStyle({ hasResults, isSelected, isHovered }: { hasResults: boolean; isSelected: boolean; isHovered: boolean }) {
  const fill = isSelected
    ? `color-mix(in oklch, var(--brand-primary), var(--background) ${isHovered ? 22 : 30}%)`
    : hasResults
      ? `color-mix(in oklch, var(--brand-primary), var(--background) ${isHovered ? 42 : 58}%)`
      : `color-mix(in oklch, var(--warning), var(--card) ${isHovered ? 66 : 76}%)`;
  return {
    fill,
    stroke: isSelected ? "var(--brand-primary)" : "var(--card)",
    strokeWidth: isSelected ? 2.25 : 0.75,
    filter: isSelected ? "drop-shadow(0 0 5px color-mix(in oklch, var(--brand-primary), transparent 45%))" : undefined,
  };
}

const worldGeo = feature(
  worldTopology as unknown as Topology,
  (worldTopology as unknown as Topology).objects.countries as GeometryCollection
);

// The library's typings expose two incompatible ZoomableGroup shapes: a bare
// {zoom, minZoom, maxZoom} form, and this branded {enableZoom, scaleExtent, enablePan,
// translateExtent} form built by createZoomPanConfig. The bare form typechecks but its
// zoom behavior isn't wired up correctly — updating `zoom` from outside a drag/wheel
// gesture (e.g. a zoom button) throws "selection.interrupt is not a function" from inside
// the library's internal d3-zoom sync. Module-scope constant since it never changes and
// the branded fields should stay referentially stable across renders.
const ZOOM_PAN_CONFIG = createZoomPanConfig(1, 8, [createCoordinates(-179, -85), createCoordinates(179, 85)]);

// World scope only, deliberately — unlike the university explorer's world/region drill-down,
// the live opportunity catalog is small (see browse.ts's own "11 active opportunities live
// today" comment). A region-level breakdown of a handful of countries would be complexity
// with nothing behind it; this can grow the same drill-down world-map-explorer.tsx already
// proves out once the catalog does. Every marker/count here comes from the SAME filtered
// query the result list below renders — see browse.ts's countryCounts, computed pre-
// pagination from the identical filtered set. This is the specific fix for a real bug found
// auditing the university map: its country counts are a separate, unfiltered query, so
// applying a filter narrows the list but never the map. That can't happen here — there is
// only one query.
const WORLD_LABEL_CAP = 8;

const ZOOM_BUTTON =
  "flex size-8 items-center justify-center rounded-lg border bg-card text-foreground shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40";

interface HoverState {
  name: string;
  clientX: number;
  clientY: number;
}

export function OpportunityMapExplorer({
  countryCounts,
  filterParams,
  decorative = false,
}: {
  countryCounts: OpportunityCountryCount[];
  /** Every currently-active filter/search param except `country` itself — preserved on
   * every map interaction so selecting a country never silently drops a search or category
   * filter the student already applied. */
  filterParams: URLSearchParams;
  /** True when the caller wraps this map in `aria-hidden` because an equivalent accessible
   * control exists alongside it (OpportunityCountryPills on desktop). Focusable controls
   * inside an aria-hidden subtree are a WCAG violation — keyboard focus lands somewhere a
   * screen reader has been told does not exist — so the zoom buttons drop out of the tab
   * order in that mode. Mouse and touch still work; keyboard users navigate by the pills. */
  decorative?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country");
  const [hover, setHover] = useState<HoverState | null>(null);
  // Pan/zoom is a transient view preference, not a filter — local state only, same
  // convention the mobile List/Map toggle already uses for the same reason (not
  // URL-persisted; a reload or a shared link shouldn't have to reproduce a scroll position).
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Coordinates>(createCoordinates(0, 0));
  const groupRef = useRef<SVGGElement>(null);
  const MIN_ZOOM = ZOOM_PAN_CONFIG.minZoom;
  const MAX_ZOOM = ZOOM_PAN_CONFIG.maxZoom;

  const countByName = useMemo(() => new Map(countryCounts.map((c) => [c.country, c.count])), [countryCounts]);
  const maxCount = Math.max(1, ...countryCounts.map((c) => c.count));
  // Only countries the map/geo data actually recognizes AND that currently have at least one
  // matching opportunity get a marker — an empty dot for every one of 89 supported countries
  // when only a handful have real data would be exactly the "misrepresents results" clutter
  // the founder's brief warns against. The underlying geography (every country's clickable
  // shape) still renders regardless, so a country with zero results is still visible on the
  // map, just without a marker competing for attention.
  const countriesWithData = useMemo(() => SUPPORTED_COUNTRIES.filter((c) => (countByName.get(c.name) ?? 0) > 0), [countByName]);
  const supportedIds = useMemo(() => new Set(SUPPORTED_COUNTRIES.map((c) => c.numericId)), []);
  const nameByNumericId = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of SUPPORTED_COUNTRIES) if (c.numericId) map.set(c.numericId, c.name);
    return map;
  }, []);
  const selectedGeoNumericId = selected ? (countryByName.get(selected)?.numericId ?? null) : null;

  const labelPriorityNames = useMemo(
    () => pickLabelPriorityCountries(countriesWithData, countByName, WORLD_LABEL_CAP, selected),
    [countriesWithData, countByName, selected]
  );

  function selectCountry(name: string) {
    const params = new URLSearchParams(filterParams);
    if (selected === name) {
      params.delete("country");
    } else {
      params.set("country", name);
    }
    router.push(`/opportunities?${params.toString()}`, { scroll: false });
  }

  function handleGeographyClick(_event: unknown, data?: GeographyEventData) {
    if (!data) return;
    const name = nameByNumericId.get(String(data.geography.id));
    if (name && (countByName.get(name) ?? 0) > 0) selectCountry(name);
  }

  function handleGeographyEnter(event: React.MouseEvent<SVGPathElement>, data?: GeographyEventData) {
    if (!data) return;
    const name = nameByNumericId.get(String(data.geography.id));
    if (name && (countByName.get(name) ?? 0) > 0) setHover({ name, clientX: event.clientX, clientY: event.clientY });
  }

  const hoveredCount = hover ? (countByName.get(hover.name) ?? 0) : 0;
  const hoveredRegion = hover ? countryByName.get(hover.name)?.region : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border bg-card"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 100% 100% at 50% 20%, color-mix(in oklch, var(--info), var(--background) 48%), color-mix(in oklch, var(--info), var(--background) 74%))",
        // Two thin inset lines, not a heavy vignette — reads as "map sits in a recessed
        // premium panel" without darkening the map itself or implying it's a different theme.
        boxShadow:
          "inset 0 1px 3px color-mix(in oklch, var(--foreground), transparent 92%), inset 0 -1px 0 color-mix(in oklch, var(--foreground), transparent 94%)",
      }}
    >
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{ scale: 155, center: createCoordinates(0, 0) }}
        width={800}
        height={340}
        style={{ width: "100%", height: "auto" }}
        className="relative"
      >
        <ZoomableGroup
          ref={groupRef}
          center={center}
          zoom={zoom}
          {...ZOOM_PAN_CONFIG}
          onMoveEnd={(position) => {
            setZoom(position.zoom);
            setCenter(position.coordinates);
          }}
        >
        <Geographies geography={worldGeo}>
          {({ geographies }) =>
            (geographies as PreparedFeature[]).map((geo) => {
              const name = nameByNumericId.get(String(geo.id));
              const isSupported = supportedIds.has(String(geo.id));
              const hasResults = isSupported && name ? (countByName.get(name) ?? 0) > 0 : false;
              const isThisSelected = selectedGeoNumericId !== null && String(geo.id) === selectedGeoNumericId;
              const isThisHovered = hasResults && hover?.name === name;
              // Own fill ladder (resolveOpportunityCountryFillStyle above), not the university
              // map's shared one — see that function's comment for why. Same all-four-style-
              // variant-keys fix for the library's post-click state bug either way (see
              // world-map-explorer.tsx's comment for the full incident writeup). `hasResults`
              // is "has a matching opportunity," not merely "is a real country" — a country
              // with zero current results gets the land tone, same as a country the map
              // doesn't recognize at all, since neither is currently clickable.
              const resolvedStyle: React.CSSProperties = {
                ...resolveOpportunityCountryFillStyle({ hasResults, isSelected: isThisSelected, isHovered: isThisHovered }),
                outline: "none",
                cursor: hasResults ? "pointer" : "default",
                transition: "fill 150ms ease, stroke 150ms ease",
              };
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  tabIndex={-1}
                  onClick={hasResults ? handleGeographyClick : undefined}
                  onMouseEnter={hasResults ? handleGeographyEnter : undefined}
                  onMouseLeave={hasResults ? () => setHover(null) : undefined}
                  style={{ default: resolvedStyle, hover: resolvedStyle, pressed: resolvedStyle, focused: resolvedStyle }}
                />
              );
            })
          }
        </Geographies>
        {countriesWithData.map((c) => {
          const count = countByName.get(c.name) ?? 0;
          const isSelected = selected === c.name;
          const showLabel = labelPriorityNames.has(c.name);
          const radius = 4 + (count / maxCount) * 7;
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
                  <circle r={radius + 9} className="fill-primary/14" />
                  <circle r={radius + 6} className="fill-primary/30 motion-safe:animate-ping" />
                </>
              ) : null}
              <circle
                r={radius}
                className={isSelected ? "fill-primary" : "fill-primary/60 hover:fill-primary"}
                stroke="var(--card)"
                strokeWidth={1.5}
                style={{
                  filter: isSelected
                    ? "drop-shadow(0 2px 5px color-mix(in oklch, var(--brand-primary), transparent 40%))"
                    : "drop-shadow(0 1px 2px color-mix(in oklch, var(--foreground), transparent 78%))",
                }}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none select-none fill-primary-foreground font-semibold"
                style={{ fontSize: radius < 7 ? 8 : 10 }}
              >
                {count}
              </text>
              {showLabel ? (
                <text
                  textAnchor="middle"
                  y={-radius - 6}
                  className={`pointer-events-none select-none font-medium ${isSelected ? "fill-foreground" : "fill-muted-foreground"}`}
                  style={{ fontSize: 10 }}
                >
                  {c.name}
                </text>
              ) : null}
            </Marker>
          );
        })}
        </ZoomableGroup>
      </ComposableMap>
      <div className="absolute right-3 bottom-14 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))}
          disabled={zoom >= MAX_ZOOM}
          tabIndex={decorative ? -1 : undefined}
          aria-label="Zoom in"
          className={ZOOM_BUTTON}
        >
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5))}
          disabled={zoom <= MIN_ZOOM}
          tabIndex={decorative ? -1 : undefined}
          aria-label="Zoom out"
          className={ZOOM_BUTTON}
        >
          <Minus className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setCenter(createCoordinates(0, 0));
          }}
          disabled={zoom === 1 && center[0] === 0 && center[1] === 0}
          tabIndex={decorative ? -1 : undefined}
          aria-label="Reset map view"
          className={ZOOM_BUTTON}
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>
      {hover ? (
        <div
          className="pointer-events-none fixed z-20 rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.clientX + 14, top: hover.clientY + 14 }}
        >
          <p className="font-medium text-popover-foreground">{hover.name}</p>
          <p className="text-muted-foreground">
            {hoveredCount} {hoveredCount === 1 ? "opportunity" : "opportunities"}
            {hoveredRegion ? ` · ${hoveredRegion}` : ""}
          </p>
        </div>
      ) : null}
      <p className="relative border-t px-4 py-2.5 text-center text-xs text-muted-foreground">
        {countriesWithData.length > 0
          ? "Tap a country to see its opportunities."
          : "No opportunities match these filters yet — try clearing one."}
      </p>
    </div>
  );
}
