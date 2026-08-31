"use client";

import { useMemo, useState } from "react";
import { clusterUniversityPins, fanOutOffsets } from "@/lib/universities/cluster-pins";
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
import type { UniversityMapPin } from "@/lib/universities/map-pins";

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

// Zoom applied when a country is selected. One value for every country rather than one
// derived from land area: the pins themselves are what the student is looking at once
// zoomed, and those are always clustered around cities, so a Russia-sized frame would push
// them into an unreadable clump while a Netherlands-sized frame reads fine everywhere.
const COUNTRY_ZOOM = 7;

interface HoverState {
  name: string;
  clientX: number;
  clientY: number;
}

interface PinHoverState {
  pin: UniversityMapPin;
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
export function WorldMapExplorer({
  countryCounts,
  region = WORLD_REGION,
  pins = [],
}: {
  countryCounts: CountryCount[];
  region?: MapRegion;
  /** Individual universities for the selected country, already coordinate-filtered
   *  server-side (lib/universities/map-pins.ts). Empty unless a country is selected. */
  pins?: UniversityMapPin[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("country");
  const isWorld = region.id === "world";
  const [hover, setHover] = useState<HoverState | null>(null);
  const [pinHover, setPinHover] = useState<PinHoverState | null>(null);
  // Which dense cluster the student has opened, if any. Opening one fans its members out
  // so each becomes individually reachable; only one is open at a time, so the map never
  // ends up with several exploded clusters overlapping each other.
  const [openCluster, setOpenCluster] = useState<string | null>(null);

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
  // Selecting a country re-projects the map onto it, the same mechanism regions already use
  // (lib/data/regions.ts) rather than a CSS zoom over the world SVG. Driven entirely by the
  // `?country=` URL param, so a shared or reloaded link opens on the same view.
  //
  // ZoomableGroup would have given a continuous animated fly-in and was tried first, but it
  // throws "selection.interrupt is not a function" on first render: its d3-zoom calls
  // selection.interrupt(), which only exists once d3-transition has patched d3-selection's
  // prototype, and the library bundles its own d3-selection copy — so importing
  // d3-transition here cannot reach it. Re-projection is the mechanism this codebase already
  // proves works; the entrance animation below supplies the motion instead.
  const selectedCentroid = selected ? countryByName.get(selected)?.centroid : undefined;
  const zoomedToCountry = Boolean(selectedCentroid && pins.length > 0);
  // Universities in one metro area sit within a fraction of a degree, which at country
  // zoom is a few pixels: drawn individually they stack into a blob where only the last
  // one painted is actually hoverable. Clustering keeps every university reachable.
  const clusters = useMemo(() => clusterUniversityPins(pins), [pins]);
  const activeProjection = zoomedToCountry
    ? { projection: proj.projection, scale: proj.scale * COUNTRY_ZOOM, center: [selectedCentroid![1], selectedCentroid![0]] as [number, number] }
    : { projection: proj.projection, scale: proj.scale, center: proj.center };
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
        projection={activeProjection.projection}
        projectionConfig={{ scale: activeProjection.scale, center: createCoordinates(activeProjection.center[0], activeProjection.center[1]) }}
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
                transition: "fill 150ms ease, stroke 150ms ease, opacity 300ms ease",
                // Zoomed into a country, its neighbours are context, not targets. Opacity
                // rather than a flat grey fill so the existing tested fill ladder
                // (map-visuals.ts) keeps producing the colors, just quieter.
                ...(zoomedToCountry && !isThisSelected ? { opacity: 0.35 } : null),
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
        {/* Country dots are the world/region-scale affordance. Once zoomed into a country
            they are replaced by the university pins below rather than drawn alongside them —
            keeping both puts a large count-sized dot directly on top of the pins it is
            supposed to summarise. */}
        {(zoomedToCountry ? [] : visibleCountries).map((c) => {
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

        {/* University pins — only once zoomed into a country, otherwise dozens of pins would
            sit on top of the country dots at world scale and read as noise. Every pin is a
            real stored coordinate; universities without one are absent rather than
            approximated (see lib/universities/map-pins.ts). */}
        {zoomedToCountry
          ? clusters.map((cluster, index) => {
              const isOpen = openCluster === cluster.id;
              // A cluster of one is an ordinary pin: same size, same behaviour. Only a
              // genuinely overlapping group gets the count treatment.
              if (cluster.members.length > 1 && !isOpen) {
                const count = cluster.members.length;
                return (
                  <Marker
                    key={cluster.id}
                    coordinates={createCoordinates(cluster.longitude, cluster.latitude)}
                    onClick={() => setOpenCluster(cluster.id)}
                    onMouseEnter={() => setPinHover(null)}
                    className="cursor-pointer outline-none"
                  >
                    <g className="pin-drop" style={{ animationDelay: `${Math.min(index, 20) * 22}ms` }}>
                      <circle r={11} className="fill-primary/25" />
                      <circle r={8.5} className="fill-primary" stroke="var(--card)" strokeWidth={1.4} />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="pointer-events-none fill-primary-foreground"
                        style={{ fontSize: 8, fontWeight: 600 }}
                      >
                        {count > 99 ? "99+" : count}
                      </text>
                    </g>
                  </Marker>
                );
              }

              const offsets = fanOutOffsets(isOpen ? cluster.members.length : 1);
              return (
                <Marker
                  key={cluster.id}
                  coordinates={createCoordinates(cluster.longitude, cluster.latitude)}
                  className="outline-none"
                >
                  {isOpen ? (
                    // Faint tether so an opened cluster still reads as one place rather
                    // than a scatter of unrelated pins. Doubles as the way back: clicking
                    // the centre collapses the group again, so opening one is not a
                    // one-way trip that leaves the map permanently exploded.
                    <g className="cursor-pointer" onClick={() => setOpenCluster(null)}>
                      <circle
                        r={-fanOutOffsets(cluster.members.length)[0].y}
                        className="fill-none stroke-primary/25"
                        strokeWidth={0.7}
                      />
                      <circle r={5} className="fill-card stroke-primary/40" strokeWidth={0.8} />
                    </g>
                  ) : null}
                  {cluster.members.map((pin, memberIndex) => {
                    const isPinHovered = pinHover?.pin.id === pin.id;
                    const offset = offsets[memberIndex] ?? { x: 0, y: 0 };
                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${offset.x}, ${offset.y})`}
                        className="cursor-pointer outline-none"
                        onClick={() => router.push(`/universities/${pin.id}`)}
                        onMouseEnter={(event) => setPinHover({ pin, clientX: event.clientX, clientY: event.clientY })}
                        onMouseLeave={() => setPinHover(null)}
                      >
                  {/* The entrance animation sits on an inner <g>, not on Marker: Marker's
                      `style` prop is the library's variant object (default/hover/pressed),
                      not plain CSS, so an animationDelay there is a type error. Staggered
                      per pin, and capped — past ~20 the tail would still be arriving after
                      the map itself has settled. */}
                  <g className="pin-drop" style={{ animationDelay: `${Math.min(index, 20) * 22}ms` }}>
                  {/* Halo only on hover — a permanent glow on every pin turns a dense city
                      into a smear. */}
                  {isPinHovered ? (
                    <circle r={9} className="fill-primary/20" />
                  ) : null}
                  {/* Invisible hit target. The visible dot is ~3.5 SVG units, which lands
                      around 3px on screen once the 800-wide viewBox is scaled into its
                      container — far under any reasonable pointer target, and unhittable on
                      a trackpad. Pointer events ride on this circle instead; the visible dot
                      stays small so a dense city doesn't turn into one blob. */}
                  <circle r={11} fill="transparent" />
                  <circle
                    r={isPinHovered ? 5 : 3.5}
                    className={isPinHovered ? "fill-primary" : "fill-primary/85"}
                    stroke="var(--card)"
                    strokeWidth={1.2}
                    style={{ transition: "r 140ms ease" }}
                  />
                      </g>
                      </g>
                    );
                  })}
                </Marker>
              );
            })
          : null}
      </ComposableMap>
      {hover && !pinHover ? (
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
      {pinHover ? (
        // Same viewport-space positioning as the country tooltip above, and for the same
        // reason: an absolutely-positioned card would be clipped by this container's
        // overflow-hidden exactly at the edges where pins are most likely to sit.
        <div
          className="pointer-events-none fixed z-20 w-56 overflow-hidden rounded-xl border bg-popover shadow-xl"
          style={{ left: pinHover.clientX + 16, top: pinHover.clientY + 16 }}
        >
          {pinHover.pin.imageUrl ? (
            // Plain <img>, not next/image: the src is an arbitrary remote URL from the
            // acquisition pipeline, and next/image would need every one of those hosts
            // allow-listed in next.config to render at all.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pinHover.pin.imageUrl}
              alt=""
              aria-hidden="true"
              className="h-24 w-full object-cover"
            />
          ) : null}
          <div className="space-y-1 px-3 py-2.5">
            <p className="text-sm leading-snug font-medium text-popover-foreground">{pinHover.pin.name}</p>
            <p className="text-xs text-muted-foreground">
              {[pinHover.pin.city, pinHover.pin.qsRank ? `QS #${pinHover.pin.qsRank}` : null]
                .filter(Boolean)
                .join(" · ") || "Open to see details"}
            </p>
          </div>
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
