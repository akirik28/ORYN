"use client";

import { usePathname } from "next/navigation";
import { AmbientBlobs, blobConfigForPath } from "./ambient-blobs";

/**
 * Picks the ambient blob config from the current route, so each section of the app gets
 * its own background weighting rather than every page sharing one identical wash (founder
 * direction, 2026-08-30).
 *
 * A thin client wrapper purely because the config depends on the pathname: the layout that
 * renders it stays a Server Component, and `AmbientBlobs` itself stays presentational.
 */
export function RouteAmbientBlobs() {
  const pathname = usePathname();
  // The dev-only preview harness mounts real pages under /design-preview/<name>. Strip that
  // prefix so a preview shows the same background its production counterpart will, instead
  // of silently falling through to `home` and making the harness unrepresentative — which
  // is the one thing the harness must never be. No-op on every real route.
  const effective = pathname.startsWith("/design-preview/")
    ? `/${pathname.slice("/design-preview/".length)}`
    : pathname;
  return <AmbientBlobs blobs={blobConfigForPath(effective)} />;
}
