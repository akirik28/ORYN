/**
 * Every other design-preview route, for the entry-point nav section on the index page.
 * Founder asked ("bana bir premium hesaba önizleme aç") to open and walk around a premium-
 * account preview; the index page had real preview routes for all twelve app surfaces
 * already, but zero links to any of them (confirmed: the rendered DOM had no anchors to a
 * single one) — the mechanism (`DevPreviewTierStamp` stamping `data-tier` from `?tier=`)
 * already worked, the gap was purely navigational. `href` is a function of the current
 * tier, not a fixed string, so every link carries whichever tier is currently selected
 * forward rather than silently dropping back to Standard the moment the founder clicks
 * anywhere.
 *
 * Split out of page.tsx (2026-09-03): a page file may only export the small fixed set
 * Next's App Router recognizes (default, metadata, generateStaticParams, etc.) — an extra
 * named export like `buildPreviewHref` fails `next build`'s strict typed-routes check
 * (`Property 'buildPreviewHref' is incompatible with index signature`), even though `next
 * dev`/`tsc --noEmit` never catch it. Moved here instead of trimming the export, since it
 * was already being unit-tested directly rather than only through a full page render.
 *
 * `map` alone also needs `?country=United+Kingdom` — its own page has no country selected
 * by default (see that file's own harness note), and an empty map proves nothing about the
 * Ultra pin treatment it exists to preview.
 */
export interface PreviewRoute {
  href: string;
  label: string;
  extraParams?: string;
}

export const OTHER_PREVIEW_ROUTES: readonly PreviewRoute[] = [
  { href: "/design-preview/dashboard", label: "Dashboard" },
  { href: "/design-preview/opportunities", label: "Opportunities" },
  { href: "/design-preview/opportunity-detail", label: "Opportunity detail" },
  { href: "/design-preview/universities", label: "Universities" },
  { href: "/design-preview/map", label: "University map", extraParams: "country=United+Kingdom" },
  { href: "/design-preview/university-detail", label: "University detail" },
  { href: "/design-preview/compare", label: "Compare universities" },
  { href: "/design-preview/counselor", label: "Advisor" },
  { href: "/design-preview/journey", label: "Profile" },
  { href: "/design-preview/portfolio", label: "Portfolio" },
  { href: "/design-preview/plan", label: "Plan" },
  { href: "/design-preview/notifications", label: "Notifications" },
  { href: "/design-preview/onboarding", label: "Onboarding" },
  { href: "/design-preview/features", label: "Features" },
  { href: "/design-preview/admin", label: "Admin" },
  { href: "/design-preview/kumanda", label: "Control centre" },
  { href: "/design-preview/auth", label: "Sign in / sign up" },
  { href: "/design-preview/quick-add", label: "Quick add" },
];

/** Pure, exported for direct testing rather than only through a full page render — the one
 * piece of real logic here: carry the route's own extra params (map's `?country=`) plus the
 * current tier, never dropping either. */
export function buildPreviewHref(route: PreviewRoute, tier: "standard" | "ultra"): string {
  const params = new URLSearchParams(route.extraParams ?? "");
  if (tier === "ultra") params.set("tier", "ultra");
  const query = params.toString();
  return query ? `${route.href}?${query}` : route.href;
}
