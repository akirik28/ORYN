/** Case/whitespace-normalized form used for exact university-name matching. Not accent- or
 * alias-aware by design — that's what MANUAL_ALIAS_OVERRIDES and university_official_domain
 * matching are for (see resolveUniversity in ingest.ts). A normalizer clever enough to bridge
 * more cases here is a normalizer clever enough to silently mismatch two different
 * institutions, which this product's own entity-linking rule forbids. */
export function normalizeName(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const COUNTRY_ALIASES: Record<string, string> = {
  türkiye: "turkey",
  turkiye: "turkey",
};

export function normalizeCountry(country: string | null | undefined): string {
  const key = normalizeName(country);
  return COUNTRY_ALIASES[key] ?? key;
}

/** Strips punctuation (kept for dedup matching, where "Economics, Management & CS" and
 * "Economics Management and CS" should collide but casing/whitespace-only normalization
 * would miss it). Not used for university names — punctuation can be identity-bearing
 * there (e.g. "St. Gallen" vs a hypothetical "St Gallen"). */
export function normalizeProgramName(s: string | null | undefined): string {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
