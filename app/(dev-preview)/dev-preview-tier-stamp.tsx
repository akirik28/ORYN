"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Dev-preview-only stand-in for features/app-shell/ultra-ambient.tsx's `data-tier` half —
 * deliberately NOT the ambient glow/ember canvas, which a component harness doesn't want,
 * just the one attribute every `[data-tier="ultra"]` rule in app/globals.css actually reads.
 * Found missing 2026-09-02: the map pin harness's own `?tier=ultra` toggle rendered nothing
 * different, because `app/(dev-preview)/` mounts no layout that stamps `data-tier` at all —
 * `(app)/layout.tsx` does it, but design-preview pages sit in a sibling route group that
 * never reaches that layout.
 *
 * A route-group layout has no `searchParams` prop in the App Router — only a page does, since
 * a layout can be shared across sibling routes carrying different params, so Next.js doesn't
 * pass them down. Reads the URL client-side via `useSearchParams()` instead; the mechanism
 * this mirrors (`UltraAmbient`) is itself a client component doing the identical
 * set/cleanup on `document.documentElement.dataset.tier`, just from a prop instead of a URL.
 *
 * No NODE_ENV gate of its own: this only ever mounts inside `app/(dev-preview)/layout.tsx`,
 * which wraps routes that are each already gated (`if (process.env.NODE_ENV === "production")
 * notFound()` on every design-preview page) — a production build never reaches this
 * component's children in the first place, so a second gate here would be redundant, not
 * defensive.
 */
export function DevPreviewTierStamp() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") === "ultra" ? "ultra" : "standard";

  useEffect(() => {
    // Same convention as UltraAmbient's own effect: only ever a real "ultra" value in the
    // DOM, never a literal "standard" string, since absence is the cleaner signal every
    // [data-tier="ultra"] selector already assumes.
    if (tier === "ultra") {
      document.documentElement.dataset.tier = tier;
    } else {
      delete document.documentElement.dataset.tier;
    }
    return () => {
      delete document.documentElement.dataset.tier;
    };
  }, [tier]);

  return null;
}
