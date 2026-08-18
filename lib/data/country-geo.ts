/**
 * Canonical country -> region source of truth for the university explorer (map, region
 * tabs, country counts, filters, search scoping) — every one of those consumers derives
 * from this list rather than keeping its own mapping, so they can't drift apart.
 *
 * Was a 12-country hand-picked subset (US/UK/Turkey/France/Netherlands/Germany/Italy/
 * Switzerland/Canada/Spain/Ireland/Sweden) until 2026-08-18 — real bug, not a display
 * choice: the live `universities` table has 89 distinct countries across 1019 rows, so the
 * old list silently dropped 77 of them from every aggregate count, region tab, and map
 * pin. That's the entire root cause of "Asia: 0" (zero Asian countries were even in the
 * list, despite China alone having 64 universities) and the "~400 total" the explorer
 * appeared capped at (the old 12 countries summed to 435/1019). Rebuilt from a live,
 * paginated count of `universities.country` (`fetchAllRowsVerified` — a plain `.select()`
 * silently truncates at PostgREST's 1000-row cap, which would have UNDER-counted this
 * exact list by rediscovering the same bug class one level up), not assumed or copied from
 * a stale prior list.
 *
 * `region` here is the continental bucket for the explorer's top-level region tabs (World/
 * Europe/North America/Asia/Oceania/South America/Africa) — broadly UN M49 continental
 * groupings, with two deliberate departures from the strict UN scheme, both existing
 * product decisions kept for continuity rather than "corrected" unprompted here:
 *   - Turkey -> Europe (UN M49 puts it in Western Asia; this codebase already classified
 *     it as Europe before this pass, matching the product spec's own "US/UK/Europe/Turkey"
 *     framing and how QS/most ranking bodies group it for higher-ed purposes).
 *   - Cyprus / Northern Cyprus -> Europe (UN M49 puts Cyprus in Western Asia too; kept as
 *     Europe here since Cyprus is an EU member state, which matters more for a higher-ed
 *     fee-status context than strict physical geography). Northern Cyprus is not a
 *     UN-recognised state; grouped with Cyprus for regional-bucket purposes only, not a
 *     claim about its status.
 *   - Russia -> Europe, matching UN M49's own "Eastern Europe" classification (not a
 *     departure, just noting it since Russia is often miscategorised as Asian by
 *     assumption).
 * Every other country follows the country's actual continent.
 *
 * `numericId` (ISO 3166-1 numeric) is used ONLY for matching a country to its polygon in
 * the world-atlas topojson (`countries-110m.json`) so the map can tint it — a visual
 * nice-to-have. Region/count/filter/search correctness never depends on it: those all key
 * off `name` (matching `universities.country` exactly) or `region`. A handful of
 * territories (Hong Kong SAR, Macao SAR, Taiwan, Northern Cyprus) may not have their own
 * separate polygon in a 110m-resolution atlas — their marker (name + count, clickable) still
 * renders correctly either way, only the underlying map tint might not.
 * Centroids are approximate (capital-city-ish) — a marker placement, never shown to the
 * student as a fact about anything.
 */
export interface CountryGeo {
  /** Matches universities.country in our database. */
  name: string;
  numericId: string | null;
  centroid: [latitude: number, longitude: number];
  region: "North America" | "South America" | "Europe" | "Asia" | "Oceania" | "Africa";
}

export const SUPPORTED_COUNTRIES: CountryGeo[] = [
  // ---- North America ----
  { name: "United States", numericId: "840", centroid: [39.8, -98.6], region: "North America" },
  { name: "Canada", numericId: "124", centroid: [56.1, -106.3], region: "North America" },
  { name: "Mexico", numericId: "484", centroid: [23.6, -102.6], region: "North America" },
  { name: "Costa Rica", numericId: "188", centroid: [9.7, -83.8], region: "North America" },
  { name: "Cuba", numericId: "192", centroid: [21.5, -79.5], region: "North America" },

  // ---- South America ----
  { name: "Brazil", numericId: "076", centroid: [-14.2, -51.9], region: "South America" },
  { name: "Chile", numericId: "152", centroid: [-35.7, -71.5], region: "South America" },
  { name: "Argentina", numericId: "032", centroid: [-38.4, -63.6], region: "South America" },
  { name: "Colombia", numericId: "170", centroid: [4.6, -74.1], region: "South America" },
  { name: "Peru", numericId: "604", centroid: [-9.2, -75.0], region: "South America" },
  { name: "Uruguay", numericId: "858", centroid: [-32.5, -55.8], region: "South America" },
  { name: "Ecuador", numericId: "218", centroid: [-1.8, -78.2], region: "South America" },
  { name: "Venezuela", numericId: "862", centroid: [6.4, -66.6], region: "South America" },

  // ---- Europe ----
  { name: "United Kingdom", numericId: "826", centroid: [54.0, -2.5], region: "Europe" },
  { name: "Germany", numericId: "276", centroid: [51.2, 10.4], region: "Europe" },
  { name: "Italy", numericId: "380", centroid: [42.8, 12.6], region: "Europe" },
  { name: "France", numericId: "250", centroid: [46.6, 2.5], region: "Europe" },
  { name: "Spain", numericId: "724", centroid: [40.0, -3.7], region: "Europe" },
  { name: "Netherlands", numericId: "528", centroid: [52.2, 5.3], region: "Europe" },
  { name: "Switzerland", numericId: "756", centroid: [46.8, 8.2], region: "Europe" },
  { name: "Russia", numericId: "643", centroid: [61.5, 105.3], region: "Europe" },
  { name: "Turkey", numericId: "792", centroid: [39.0, 35.0], region: "Europe" },
  { name: "Belgium", numericId: "056", centroid: [50.5, 4.5], region: "Europe" },
  { name: "Austria", numericId: "040", centroid: [47.5, 14.6], region: "Europe" },
  { name: "Portugal", numericId: "620", centroid: [39.4, -8.2], region: "Europe" },
  { name: "Finland", numericId: "246", centroid: [61.9, 25.7], region: "Europe" },
  { name: "Poland", numericId: "616", centroid: [51.9, 19.1], region: "Europe" },
  { name: "Sweden", numericId: "752", centroid: [60.1, 18.6], region: "Europe" },
  { name: "Czechia", numericId: "203", centroid: [49.8, 15.5], region: "Europe" },
  { name: "Ireland", numericId: "372", centroid: [53.4, -8.0], region: "Europe" },
  { name: "Norway", numericId: "578", centroid: [60.5, 8.5], region: "Europe" },
  { name: "Hungary", numericId: "348", centroid: [47.2, 19.5], region: "Europe" },
  { name: "Greece", numericId: "300", centroid: [39.1, 21.8], region: "Europe" },
  { name: "Denmark", numericId: "208", centroid: [56.3, 9.5], region: "Europe" },
  { name: "Lithuania", numericId: "440", centroid: [55.2, 23.9], region: "Europe" },
  { name: "Cyprus", numericId: "196", centroid: [35.1, 33.4], region: "Europe" },
  { name: "Northern Cyprus", numericId: null, centroid: [35.3, 33.3], region: "Europe" },
  { name: "Ukraine", numericId: "804", centroid: [48.4, 31.2], region: "Europe" },
  { name: "Slovenia", numericId: "705", centroid: [46.1, 14.8], region: "Europe" },
  { name: "Romania", numericId: "642", centroid: [45.9, 24.9], region: "Europe" },
  { name: "Belarus", numericId: "112", centroid: [53.7, 27.9], region: "Europe" },
  { name: "Slovakia", numericId: "703", centroid: [48.7, 19.7], region: "Europe" },
  { name: "Latvia", numericId: "428", centroid: [56.9, 24.6], region: "Europe" },
  { name: "Iceland", numericId: "352", centroid: [64.9, -19.0], region: "Europe" },
  { name: "Malta", numericId: "470", centroid: [35.9, 14.4], region: "Europe" },
  { name: "Luxembourg", numericId: "442", centroid: [49.8, 6.1], region: "Europe" },
  { name: "Bulgaria", numericId: "100", centroid: [42.7, 25.5], region: "Europe" },
  { name: "Croatia", numericId: "191", centroid: [45.1, 15.2], region: "Europe" },
  { name: "Serbia", numericId: "688", centroid: [44.0, 21.0], region: "Europe" },
  { name: "Estonia", numericId: "233", centroid: [58.6, 25.0], region: "Europe" },

  // ---- Asia ----
  { name: "China", numericId: "156", centroid: [35.9, 104.2], region: "Asia" },
  { name: "India", numericId: "356", centroid: [20.6, 79.0], region: "Asia" },
  { name: "South Korea", numericId: "410", centroid: [36.0, 127.8], region: "Asia" },
  { name: "Japan", numericId: "392", centroid: [36.2, 138.3], region: "Asia" },
  { name: "Malaysia", numericId: "458", centroid: [4.2, 101.9], region: "Asia" },
  { name: "Saudi Arabia", numericId: "682", centroid: [23.9, 45.1], region: "Asia" },
  { name: "Taiwan", numericId: "158", centroid: [23.7, 121.0], region: "Asia" },
  { name: "United Arab Emirates", numericId: "784", centroid: [23.4, 53.8], region: "Asia" },
  { name: "Indonesia", numericId: "360", centroid: [-0.8, 113.9], region: "Asia" },
  { name: "Pakistan", numericId: "586", centroid: [30.4, 69.3], region: "Asia" },
  { name: "Hong Kong SAR", numericId: "344", centroid: [22.3, 114.2], region: "Asia" },
  { name: "Kazakhstan", numericId: "398", centroid: [48.0, 66.9], region: "Asia" },
  { name: "Iran", numericId: "364", centroid: [32.4, 53.7], region: "Asia" },
  { name: "Azerbaijan", numericId: "031", centroid: [40.1, 47.6], region: "Asia" },
  { name: "Jordan", numericId: "400", centroid: [30.6, 36.2], region: "Asia" },
  { name: "Thailand", numericId: "764", centroid: [15.9, 100.9], region: "Asia" },
  { name: "Lebanon", numericId: "422", centroid: [33.9, 35.9], region: "Asia" },
  { name: "Israel", numericId: "376", centroid: [31.0, 34.8], region: "Asia" },
  { name: "Oman", numericId: "512", centroid: [21.5, 55.9], region: "Asia" },
  { name: "Singapore", numericId: "702", centroid: [1.35, 103.8], region: "Asia" },
  { name: "Philippines", numericId: "608", centroid: [12.9, 121.8], region: "Asia" },
  { name: "Vietnam", numericId: "704", centroid: [14.1, 108.3], region: "Asia" },
  { name: "Kuwait", numericId: "414", centroid: [29.3, 47.5], region: "Asia" },
  { name: "Bangladesh", numericId: "050", centroid: [23.7, 90.4], region: "Asia" },
  { name: "Macao SAR", numericId: "446", centroid: [22.2, 113.5], region: "Asia" },
  { name: "Qatar", numericId: "634", centroid: [25.3, 51.2], region: "Asia" },
  { name: "Kyrgyzstan", numericId: "417", centroid: [41.2, 74.8], region: "Asia" },
  { name: "Brunei Darussalam", numericId: "096", centroid: [4.5, 114.7], region: "Asia" },
  { name: "Uzbekistan", numericId: "860", centroid: [41.4, 64.6], region: "Asia" },
  { name: "Iraq", numericId: "368", centroid: [33.2, 43.7], region: "Asia" },
  { name: "Palestine", numericId: "275", centroid: [31.9, 35.2], region: "Asia" },
  { name: "Bahrain", numericId: "048", centroid: [26.0, 50.5], region: "Asia" },

  // ---- Oceania ----
  { name: "Australia", numericId: "036", centroid: [-25.3, 133.8], region: "Oceania" },
  { name: "New Zealand", numericId: "554", centroid: [-41.0, 174.9], region: "Oceania" },

  // ---- Africa ----
  { name: "South Africa", numericId: "710", centroid: [-30.6, 22.9], region: "Africa" },
  { name: "Egypt", numericId: "818", centroid: [26.8, 30.8], region: "Africa" },
  { name: "Ethiopia", numericId: "231", centroid: [9.1, 40.5], region: "Africa" },
  { name: "Tunisia", numericId: "788", centroid: [33.9, 9.5], region: "Africa" },
  { name: "Ghana", numericId: "288", centroid: [7.9, -1.0], region: "Africa" },
];

export const countryByName = new Map(SUPPORTED_COUNTRIES.map((c) => [c.name, c]));
export const countryByNumericId = new Map(SUPPORTED_COUNTRIES.filter((c) => c.numericId !== null).map((c) => [c.numericId as string, c]));
