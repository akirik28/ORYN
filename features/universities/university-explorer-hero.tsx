"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionGridExplorer } from "./region-grid-explorer";
import { WORLD_REGION, regionById } from "@/lib/data/regions";
import type { CountryCount } from "./world-map-explorer";
import type { UniversityMapPin } from "@/lib/universities/map-pins";

// Code-split: @vnedyalk0v/react19-simple-maps + the world topology (~110KB) never ship to a mobile
// visitor, since the map is never mounted below the md breakpoint (see useIsDesktop below).
const WorldMapExplorer = dynamic(() => import("./world-map-explorer").then((m) => m.WorldMapExplorer), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[800/420] w-full rounded-2xl" />,
});

const DESKTOP_QUERY = "(min-width: 768px)";

function subscribe(callback: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}
function getServerSnapshot() {
  return false;
}

/** SSR-safe media query subscription — avoids the effect+setState cascading-render pattern. */
function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The map is a decorative, mouse/touch-driven visualization — aria-hidden, because
 * RegionGridExplorer below provides the same navigation (including the world/region/
 * country hierarchy) as real, always-present, keyboard- and screen-reader-accessible
 * links. On small screens the map never mounts at all; the region+country pill list
 * alone is a fully sufficient "reinterpreted" mobile interaction — World -> Europe ->
 * country still works there, just without an SVG map, rather than the concept
 * disappearing outright.
 */
export function UniversityExplorerHero({
  countryCounts,
  mapPins = [],
  selected,
  selectedRegion,
}: {
  countryCounts: CountryCount[];
  /** Individual universities to plot, already scoped to the selected country server-side.
   *  Empty in world/region view, where the map plots country dots instead. */
  mapPins?: UniversityMapPin[];
  selected: string | null;
  selectedRegion: string | null;
}) {
  const showMap = useIsDesktop();
  // A region with no drill-down `projection` (North America, Asia today) narrows the
  // result list but leaves the map in world view — only a region that defines one
  // (Europe) actually changes what the map renders.
  const mapRegion = (selectedRegion ? regionById.get(selectedRegion) : undefined)?.projection
    ? regionById.get(selectedRegion!)!
    : WORLD_REGION;

  return (
    <div className="space-y-4">
      {showMap ? (
        <div aria-hidden="true">
          <WorldMapExplorer countryCounts={countryCounts} region={mapRegion} pins={mapPins} />
        </div>
      ) : null}
      <RegionGridExplorer countryCounts={countryCounts} selected={selected} selectedRegion={selectedRegion} />
    </div>
  );
}
