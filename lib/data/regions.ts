import type { Locale } from "@/lib/i18n/config";
import { SUPPORTED_COUNTRIES } from "./country-geo";

/**
 * Region taxonomy layered on top of `SUPPORTED_COUNTRIES` (single source of truth for
 * which countries exist at all — this file never lists a country name directly, only
 * derives from that list's own `region` field, so the two can't drift apart).
 *
 * Two kinds of region:
 *  - `projection` set: has a dedicated drill-down map (world -> region -> country).
 *    Only Europe today, deliberately (see the founder brief this was built against) —
 *    adding North America/Asia drill-down later means adding one more `MapRegion` entry
 *    with its own projection tuning, not restructuring this file or its consumers.
 *  - `projection` absent: a filter-only region chip (narrows the country list/results,
 *    the map stays in world view). North America and Asia today.
 */
export interface MapRegion {
  id: string;
  name: string;
  countries: string[];
  projection?: {
    projection: string;
    scale: number;
    center: [longitude: number, latitude: number];
  };
}

export const WORLD_REGION: MapRegion = {
  id: "world",
  name: "World",
  countries: SUPPORTED_COUNTRIES.map((c) => c.name),
  projection: { projection: "geoNaturalEarth1", scale: 155, center: [0, 0] },
};

export const MAP_REGIONS: MapRegion[] = [
  {
    id: "europe",
    name: "Europe",
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "Europe").map((c) => c.name),
    // geoAzimuthalEqualArea centered on central Europe reads far better at this scale
    // than magnifying the world projection (flatter distortion for a compact, mid-latitude
    // region) — a real reprojection, not a CSS zoom on the same SVG.
    projection: { projection: "geoAzimuthalEqualArea", scale: 900, center: [15, 52] },
  },
  {
    id: "north_america",
    name: "North America",
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "North America").map((c) => c.name),
    // No drill-down map yet (deliberately, see file comment) — filters results only.
  },
  {
    id: "asia",
    name: "Asia",
    // Was genuinely empty here until 2026-08-18 — not because the data didn't exist (China
    // alone has always had dozens of universities), but because SUPPORTED_COUNTRIES never
    // listed a single Asian country. See lib/data/country-geo.ts's header for the full
    // root-cause writeup; this comment used to (wrongly) explain away the symptom as an
    // honest "not yet", which is exactly the kind of self-fulfilling assumption that let a
    // real bug sit undetected — worth a caveat here so it isn't mistaken for a design
    // choice again.
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "Asia").map((c) => c.name),
  },
  {
    id: "oceania",
    name: "Oceania",
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "Oceania").map((c) => c.name),
  },
  {
    id: "south_america",
    name: "South America",
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "South America").map((c) => c.name),
  },
  {
    id: "africa",
    name: "Africa",
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "Africa").map((c) => c.name),
  },
];

export const regionById = new Map(MAP_REGIONS.map((r) => [r.id, r]));

/** `MapRegion.name` (used above and in country-geo.ts's own `region` field) stays English —
 * it's also a grouping key compared against `SUPPORTED_COUNTRIES`' `region` column, so
 * changing it would need a data migration, not a UI fix. This is the small, separate,
 * closed set of continent display names a student actually sees (7 values: the 6 regions
 * above plus "World"), keyed by `MapRegion.id` instead so it can't drift from that key. */
const REGION_LABEL_TR: Record<string, string> = {
  world: "Dünya",
  europe: "Avrupa",
  north_america: "Kuzey Amerika",
  asia: "Asya",
  oceania: "Okyanusya",
  south_america: "Güney Amerika",
  africa: "Afrika",
};

export function regionLabel(region: Pick<MapRegion, "id" | "name">, locale: Locale): string {
  return locale === "tr" ? (REGION_LABEL_TR[region.id] ?? region.name) : region.name;
}
