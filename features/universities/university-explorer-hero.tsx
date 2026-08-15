"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { RegionGridExplorer } from "./region-grid-explorer";
import type { CountryCount } from "./world-map-explorer";

// Code-split: react-simple-maps + the world topology (~110KB) never ship to a mobile
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
 * RegionGridExplorer below provides the same navigation as real, always-present,
 * keyboard- and screen-reader-accessible links. On small screens the map never mounts at
 * all; the region grid alone is a fully sufficient "reinterpreted" mobile interaction.
 */
export function UniversityExplorerHero({
  countryCounts,
  selected,
}: {
  countryCounts: CountryCount[];
  selected: string | null;
}) {
  const showMap = useIsDesktop();

  return (
    <div className="space-y-4">
      {showMap ? (
        <div aria-hidden="true">
          <WorldMapExplorer countryCounts={countryCounts} />
        </div>
      ) : null}
      <RegionGridExplorer countryCounts={countryCounts} selected={selected} />
    </div>
  );
}
