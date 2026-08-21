"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { OpportunityCountryCount } from "@/lib/opportunities/browse";

// Same code-split rationale as UniversityExplorerHero: @vnedyalk0v/react19-simple-maps + the
// world topology (~110KB) never ship to a mobile visitor, since the map never mounts below
// the md breakpoint.
const OpportunityMapExplorer = dynamic(() => import("./opportunity-map-explorer").then((m) => m.OpportunityMapExplorer), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[800/340] w-full rounded-2xl" />,
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

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Decorative, mouse/touch-driven — aria-hidden, since OpportunityCountryPills (rendered by
 * the caller alongside this) is the real, always-present, accessible country navigation.
 * Never mounts below md; the caller's map/list toggle handles the mobile composition, this
 * component just declines to render the SVG map at all on small screens.
 */
export function OpportunityMapHero({ countryCounts, filterParams }: { countryCounts: OpportunityCountryCount[]; filterParams: URLSearchParams }) {
  const showMap = useIsDesktop();
  if (!showMap) return null;
  return (
    <div aria-hidden="true">
      <OpportunityMapExplorer countryCounts={countryCounts} filterParams={filterParams} decorative />
    </div>
  );
}

/**
 * The mobile "Map" tab's content (features/opportunities/opportunity-mobile-view-toggle.tsx)
 * — unlike OpportunityMapHero, this is a real navigation surface on mobile (the founder's
 * brief asks for the map to stay usable there, not drop to decorative-only the way the
 * university explorer's map does), so it's never aria-hidden and never gated by
 * useIsDesktop. Still the same code-split dynamic import — this component only mounts, and
 * therefore only loads the map bundle, when the toggle's "Map" tab is actually selected.
 */
export function OpportunityMapMobile({ countryCounts, filterParams }: { countryCounts: OpportunityCountryCount[]; filterParams: URLSearchParams }) {
  return <OpportunityMapExplorer countryCounts={countryCounts} filterParams={filterParams} />;
}
