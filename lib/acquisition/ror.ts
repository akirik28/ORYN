/**
 * Research Organization Registry (ROR) v2 — the identity layer for university acquisition.
 *
 * Chosen over scraping or a commercial directory for four reasons that matter to this
 * product's data rules: it is CC0 (no licence review needed to store what it publishes), it
 * needs no API key (so the pipeline is not credential-blocked), every record carries an
 * `admin.last_modified.date` (so a fact can be dated rather than assumed current), and it
 * publishes the cross-registry ids — GRID, ISNI, Wikidata, Crossref Funder — that let ORYN
 * link an institution to other datasets later without inventing its own identifier space.
 *
 * Scope discipline: ROR is used only for `identity` and (via OpenAlex) `research_strength`
 * facts. It is not consulted for tuition, admissions policy, or programme data, and
 * source-authority.ts enforces that rather than trusting callers to remember it.
 *
 * No `server-only` import and no `lib/env` dependency, deliberately — this module has to be
 * usable from a plain `tsx` script, the same constraint scripts/enrich-student-counts.ts and
 * scripts/check-integrations.ts already work under.
 */

export interface RorName {
  value: string;
  lang: string | null;
  types: string[];
}

export interface RorRecord {
  /** Full ROR id URL, e.g. "https://ror.org/03z9tma90". */
  id: string;
  status: string;
  established: number | null;
  /** ROR's own display name. */
  displayName: string;
  /** Every published name form, including localised labels, aliases and acronyms. */
  names: RorName[];
  aliases: string[];
  acronyms: string[];
  types: string[];
  websiteUrl: string | null;
  domains: string[];
  countryCode: string | null;
  countryName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  externalIds: Record<string, string>;
  /** ROR's per-record modification date — the date this identity fact is "as of". */
  lastModified: string | null;
}

interface RawRorItem {
  id?: unknown;
  status?: unknown;
  established?: unknown;
  names?: unknown;
  types?: unknown;
  links?: unknown;
  domains?: unknown;
  locations?: unknown;
  external_ids?: unknown;
  admin?: unknown;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

/**
 * Hand-written normalisation rather than a Zod schema, matching how this repo's other
 * keyless script-side pipeline (enrich-student-counts.ts) reads SPARQL: every field is
 * optional in practice, and a strict schema that rejects a whole record because one
 * unrelated field changed shape would lose identity data we can legitimately use. Anything
 * unreadable becomes null, never a guess.
 */
export function normalizeRorRecord(raw: unknown): RorRecord | null {
  const item = asRecord(raw) as RawRorItem;
  const id = asString(item.id);
  if (!id) return null;

  const names: RorName[] = asArray(item.names)
    .map((n) => {
      const rec = asRecord(n);
      const value = asString(rec.value);
      if (!value) return null;
      return { value, lang: asString(rec.lang), types: asArray(rec.types).filter((t): t is string => typeof t === "string") };
    })
    .filter((n): n is RorName => n !== null);

  const displayName = names.find((n) => n.types.includes("ror_display"))?.value ?? names[0]?.value;
  if (!displayName) return null;

  const links = asArray(item.links).map(asRecord);
  const websiteUrl = asString(links.find((l) => asString(l.type) === "website")?.value);

  const firstLocation = asRecord(asArray(item.locations)[0]);
  const geo = asRecord(firstLocation.geonames_details);

  const externalIds: Record<string, string> = {};
  for (const entry of asArray(item.external_ids)) {
    const rec = asRecord(entry);
    const type = asString(rec.type);
    if (!type) continue;
    // `preferred` is the curated id where ROR has one; otherwise the first of `all`.
    const preferred = asString(rec.preferred) ?? asString(asArray(rec.all)[0]);
    if (preferred) externalIds[type] = preferred;
  }

  const admin = asRecord(item.admin);
  const lastModified = asString(asRecord(admin.last_modified).date);

  return {
    id,
    status: asString(item.status) ?? "unknown",
    established: asNumber(item.established),
    displayName,
    names,
    aliases: names.filter((n) => n.types.includes("alias") || n.types.includes("label")).map((n) => n.value),
    acronyms: names.filter((n) => n.types.includes("acronym")).map((n) => n.value),
    types: asArray(item.types).filter((t): t is string => typeof t === "string"),
    websiteUrl,
    domains: asArray(item.domains).filter((d): d is string => typeof d === "string"),
    countryCode: asString(geo.country_code),
    countryName: asString(geo.country_name),
    city: asString(geo.name),
    latitude: asNumber(geo.lat),
    longitude: asNumber(geo.lng),
    externalIds,
    lastModified,
  };
}

export interface RorSearchResult {
  items: RorRecord[];
  /** Total hits ROR reported, so a caller can tell "one obvious match" from "many". */
  total: number;
}

export type RorFetch = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const ROR_API = "https://api.ror.org/v2/organizations";

/**
 * Query ROR by name. Injectable fetch so tests exercise the parsing and the failure
 * branches without network access.
 */
export async function searchRorByName(name: string, fetchImpl: RorFetch = globalThis.fetch): Promise<RorSearchResult | null> {
  const url = `${ROR_API}?query=${encodeURIComponent(name)}`;
  const response = await fetchImpl(url).catch(() => null);
  if (!response || !response.ok) return null;

  const body = asRecord(await response.json().catch(() => null));
  const items = asArray(body.items)
    .map(normalizeRorRecord)
    .filter((r): r is RorRecord => r !== null);

  return { items, total: asNumber(body.number_of_results) ?? items.length };
}
