/**
 * Wikidata + Wikimedia Commons — discovery/index for university campus imagery and logos.
 *
 * Wikidata is used only as an INDEX: a university's Wikidata item's P18 (image) / P154 (logo
 * image) claim points at a Wikimedia Commons filename. Wikidata/Wikipedia domains are never a
 * value source for any published fact (see source-authority.ts's EXCLUDED_DOMAINS) — the real
 * value here is the Commons-hosted file plus its own license/attribution metadata, fetched
 * separately via fetchCommonsFileInfo(). Same shape as how ROR is used for identity: a
 * structured registry points at real data, it isn't the data itself.
 *
 * The QID this pipeline calls with is never guessed — it comes from `entity_external_ids`
 * (`id_system = 'WIKIDATA'`), already resolved during the university spine's identity work
 * (see lib/acquisition/ror.ts / scripts/import-university-facts.ts). This module never does its
 * own name-to-entity matching.
 *
 * No `server-only` import and no `lib/env` dependency, deliberately — used from a plain `tsx`
 * acquisition script, the same constraint ror.ts documents.
 */

export interface CommonsFileInfo {
  /** Raw served-bytes URL (upload.wikimedia.org) — what to download. */
  url: string;
  width: number;
  height: number;
  mime: string;
  /** Human-readable license short name (e.g. "CC BY-SA 4.0"), when Commons publishes one. */
  license: string | null;
  /** Best-effort "who to credit" plain-text string, from the Artist field falling back to Credit. */
  attribution: string | null;
  /** The Commons file description page — the provenance URL to store (what a human checks the
   * license against), distinct from `url` (the raw bytes). */
  descriptionUrl: string;
}

export type JsonFetch = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

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
 * The Commons filename (e.g. "MIT Dome night1 Edit.jpg", no "File:" prefix) a university's
 * Wikidata item declares for `property` — "P18" (image) or "P154" (logo image) — or null when
 * the item has no such claim, the QID doesn't resolve, or every claim is a deprecated-rank or
 * "novalue" snak.
 */
export async function fetchWikidataImageClaim(qid: string, property: "P18" | "P154", fetchImpl: JsonFetch = globalThis.fetch): Promise<string | null> {
  const params = new URLSearchParams({ action: "wbgetclaims", entity: qid, property, format: "json" });
  const response = await fetchImpl(`${WIKIDATA_API}?${params}`).catch(() => null);
  if (!response || !response.ok) return null;

  const body = asRecord(await response.json().catch(() => null));
  const claims = asRecord(body.claims);
  const propClaims = asArray(claims[property]);

  for (const claim of propClaims) {
    const rec = asRecord(claim);
    // A deprecated-rank claim is Wikidata's own record of a superseded/incorrect value — never
    // preferred over a normal/preferred-rank one when both exist.
    if (asString(rec.rank) === "deprecated") continue;
    const mainsnak = asRecord(rec.mainsnak);
    if (asString(mainsnak.snaktype) !== "value") continue;
    const filename = asString(asRecord(mainsnak.datavalue).value);
    if (filename) return filename;
  }
  return null;
}

/**
 * Real file metadata for a Commons filename — the actual license/dimensions/served-bytes URL,
 * which is the genuine value (the Wikidata claim above is only the index pointing here). Null
 * when the file doesn't exist, was deleted, or Commons returns no usable imageinfo.
 */
const THUMBNAIL_WIDTH = 2000;

export async function fetchCommonsFileInfo(filename: string, fetchImpl: JsonFetch = globalThis.fetch): Promise<CommonsFileInfo | null> {
  const title = filename.startsWith("File:") ? filename : `File:${filename}`;
  const params = new URLSearchParams({
    action: "query",
    titles: title,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    // Commons' own rate-limit error for this exact pipeline points automated clients at
    // thumbnails instead of full originals ("use thumbnail images in sizes listed on
    // https://w.wiki/GHai") — some Commons originals are 50+ megapixel panoramas, disruptive
    // to pull in full when this app only ever displays a ~1920px-wide derivative anyway (see
    // image-storage.ts's own MAX_WIDTH). Requesting a thumbnail this wide is comfortably above
    // that, so the final optimize step is never upscaling a too-small source.
    iiurlwidth: String(THUMBNAIL_WIDTH),
    format: "json",
  });
  const response = await fetchImpl(`${COMMONS_API}?${params}`).catch(() => null);
  if (!response || !response.ok) return null;

  const body = asRecord(await response.json().catch(() => null));
  const pages = asRecord(asRecord(body.query).pages);
  const page = asRecord(Object.values(pages)[0]);
  if ("missing" in page) return null;

  const info = asRecord(asArray(page.imageinfo)[0]);
  const mime = asString(info.mime);
  if (!mime) return null;

  // Prefer the thumbnail Commons rendered at THUMBNAIL_WIDTH (never upscaled past the
  // original — MediaWiki caps it at the source size) over the full original.
  const thumbUrl = asString(info.thumburl);
  const thumbWidth = asNumber(info.thumbwidth);
  const thumbHeight = asNumber(info.thumbheight);
  const useThumb = Boolean(thumbUrl && thumbWidth && thumbHeight);

  const fileUrl = useThumb ? thumbUrl! : asString(info.url);
  const width = useThumb ? thumbWidth! : asNumber(info.width);
  const height = useThumb ? thumbHeight! : asNumber(info.height);
  if (!fileUrl || !width || !height) return null;

  const meta = asRecord(info.extmetadata);
  const license = asString(asRecord(meta.LicenseShortName).value);
  const attribution = stripHtml(asString(asRecord(meta.Artist).value)) ?? stripHtml(asString(asRecord(meta.Credit).value));

  return { url: fileUrl, width, height, mime, license, attribution, descriptionUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}` };
}

/**
 * Commons' Artist/Credit extmetadata fields are HTML fragments (typically a linked name plus
 * wrapper markup) — strips tags for a plain-text attribution string. This product never renders
 * Commons' raw HTML directly.
 */
function stripHtml(value: string | null): string | null {
  if (!value) return null;
  const text = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}
