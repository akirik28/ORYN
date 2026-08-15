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
    // Genuinely empty today — no Asian country has university data or map placement
    // yet. Shown anyway (the founder brief wants it visible now, as a discoverable,
    // honest "not yet" entry point) rather than hidden until data exists.
    countries: SUPPORTED_COUNTRIES.filter((c) => c.region === "Asia").map((c) => c.name),
  },
];

export const regionById = new Map(MAP_REGIONS.map((r) => [r.id, r]));
