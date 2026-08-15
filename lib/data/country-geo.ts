/**
 * Display/positioning metadata for the university world-map explorer. `numericId` is the
 * ISO 3166-1 numeric code, matching the `id` field in the world-atlas topojson
 * (node_modules/world-atlas) so map countries can be matched without fuzzy name matching.
 * Centroids are approximate — used only to place a marker/label, never shown to the
 * student as a fact about anything.
 */
export interface CountryGeo {
  /** Matches universities.country in our database. */
  name: string;
  numericId: string;
  centroid: [latitude: number, longitude: number];
  region: "North America" | "Europe" | "Asia" | "Other";
}

export const SUPPORTED_COUNTRIES: CountryGeo[] = [
  { name: "United States", numericId: "840", centroid: [39.8, -98.6], region: "North America" },
  { name: "United Kingdom", numericId: "826", centroid: [54.0, -2.5], region: "Europe" },
  { name: "Turkey", numericId: "792", centroid: [39.0, 35.0], region: "Europe" },
  { name: "France", numericId: "250", centroid: [46.6, 2.5], region: "Europe" },
  { name: "Netherlands", numericId: "528", centroid: [52.2, 5.3], region: "Europe" },
  { name: "Germany", numericId: "276", centroid: [51.2, 10.4], region: "Europe" },
  { name: "Italy", numericId: "380", centroid: [42.8, 12.6], region: "Europe" },
  { name: "Switzerland", numericId: "756", centroid: [46.8, 8.2], region: "Europe" },
  { name: "Canada", numericId: "124", centroid: [56.1, -106.3], region: "North America" },
  { name: "Spain", numericId: "724", centroid: [40.0, -3.7], region: "Europe" },
  { name: "Ireland", numericId: "372", centroid: [53.4, -8.0], region: "Europe" },
  { name: "Sweden", numericId: "752", centroid: [60.1, 18.6], region: "Europe" },
];

export const countryByName = new Map(SUPPORTED_COUNTRIES.map((c) => [c.name, c]));
export const countryByNumericId = new Map(SUPPORTED_COUNTRIES.map((c) => [c.numericId, c]));
