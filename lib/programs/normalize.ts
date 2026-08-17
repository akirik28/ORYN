/** University-name/country normalization (nameKey, sameCountry, nameVariants) is shared
 * platform-wide via lib/acquisition/identity.ts's resolveIdentity(), which this module's
 * resolveUniversity() calls directly — see lib/programs/ingest.ts. Nothing here duplicates
 * it; only program-name-specific normalization (the dedup key) lives in this file. */

/** Strips punctuation (kept for dedup matching, where "Economics, Management & CS" and
 * "Economics Management and CS" should collide but casing/whitespace-only normalization
 * would miss it). Not used for university names — punctuation can be identity-bearing
 * there (e.g. "St. Gallen" vs a hypothetical "St Gallen"), which is exactly why university
 * matching uses lib/acquisition/normalize.ts's nameKey (accent/article-aware, not
 * punctuation-stripping) instead. */
export function normalizeProgramName(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
