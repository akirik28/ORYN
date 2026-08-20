/**
 * Pure logic behind the explorer world map's label and fill rendering (P0N/P0P) — factored out
 * of features/universities/world-map-explorer.tsx so it's unit-testable the way the rest of
 * this codebase tests DB-adjacent/render-adjacent logic (see lib/universities/filters.ts):
 * plain functions, every dependency passed in, no React, no DOM.
 */

export interface LabelableCountry {
  name: string;
}

/**
 * Which countries get a persistent `<text>` label under their marker, as opposed to only
 * being reachable via hover tooltip or click. Everything beyond the cap is still fully
 * interactive (clickable shape, marker dot) — it just doesn't carry permanent map text,
 * which is what turned into "text chaos" once SUPPORTED_COUNTRIES grew from a 12-country
 * allowlist to all 89 real countries in the data (see country-geo.ts's header). The
 * currently-selected country always keeps its label regardless of rank — a student who taps
 * a small-by-count country must still see its name, not a silent, unlabeled blue dot.
 */
export function pickLabelPriorityCountries(countries: LabelableCountry[], countByName: Map<string, number>, cap: number, selected: string | null): Set<string> {
  const ranked = [...countries].sort((a, b) => (countByName.get(b.name) ?? 0) - (countByName.get(a.name) ?? 0));
  const set = new Set(ranked.slice(0, cap).map((c) => c.name));
  if (selected) set.add(selected);
  return set;
}

export interface CountryFillState {
  isSupported: boolean;
  isSelected: boolean;
  isHovered: boolean;
}

export interface CountryFillStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/**
 * The map-fill color-mix ladder — four steps, lightest to strongest: unselected (55% diluted
 * brand-primary) < unselected+hover (40%) < selected (30%) < selected+hover (22%). Selected
 * deliberately stops well short of the undiluted `--brand-primary` token (L≈0.46): that exact
 * token reads as a clean, vivid blue everywhere else it's used (buttons, text, small icons),
 * but as the dominant fill of a large map region next to the much lighter "unselected" tint it
 * read as near-black — reproduced live 2026-08-18 from a founder report of the selected
 * country "turning black" before this ladder existed. Kept as a pure function (not inline in
 * the component) specifically so a regression test can assert every branch resolves to a real,
 * non-empty color string — the actual black-fill bug this session hit was NOT in this color
 * math (it was a third-party map library dropping the style attribute entirely on click; see
 * the component's own comment for that half of the story), but this is the half a unit test
 * actually can guard.
 */
export function resolveCountryFillStyle({ isSupported, isSelected, isHovered }: CountryFillState): CountryFillStyle {
  const fill = isSelected
    ? `color-mix(in oklch, var(--brand-primary), var(--background) ${isHovered ? 22 : 30}%)`
    : isSupported
      ? `color-mix(in oklch, var(--brand-primary), var(--background) ${isHovered ? 40 : 55}%)`
      : "color-mix(in oklch, var(--muted), var(--foreground) 8%)";
  return {
    fill,
    stroke: isSelected ? "var(--brand-primary)" : "var(--card)",
    strokeWidth: isSelected ? 1.5 : 0.75,
  };
}
