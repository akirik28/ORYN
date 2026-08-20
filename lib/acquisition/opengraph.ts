/**
 * OpenGraph/Twitter Card image discovery from an official university page.
 *
 * A Tier-1 candidate source per the image-acquisition spec: an institution's own `og:image` /
 * `twitter:image` meta tag is often a real campus photo (set for link-preview cards), but is
 * NOT auto-trusted here — plenty of sites point it at a logo, a generic branding graphic, or a
 * news banner instead. This module only extracts the raw candidate URL; quality (aspect ratio,
 * resolution, "does this actually look like a campus") is validated downstream against the real
 * downloaded bytes (see image-validation.ts), never guessed from the tag alone.
 *
 * Regex-based rather than a DOM parser, deliberately: meta tags are self-contained single
 * elements with no nesting, and this avoids pulling a full HTML parser into a script-only
 * acquisition path for one narrow extraction.
 *
 * No `server-only` import — used from a plain `tsx` acquisition script, same constraint as
 * ror.ts/wikimedia.ts.
 */

export type TextFetch = (url: string) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

/** Checked in order — `og:image` is the most widely and deliberately set by institutions for
 * link previews; the rest are only consulted when the ones above are absent. */
const META_PATTERNS: { attr: string; value: string }[] = [
  { attr: "property", value: "og:image:secure_url" },
  { attr: "property", value: "og:image" },
  { attr: "name", value: "twitter:image" },
  { attr: "itemprop", value: "image" },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMetaContent(html: string, attr: string, value: string): string | null {
  const tagRegex = new RegExp(`<meta\\b[^>]*\\b${attr}\\s*=\\s*["']${escapeRegex(value)}["'][^>]*>`, "i");
  const tag = html.match(tagRegex)?.[0];
  if (!tag) return null;
  const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
  return content && content.trim() !== "" ? content.trim() : null;
}

function toAbsoluteUrl(candidate: string, baseUrl: string): string | null {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * The first usable OpenGraph/Twitter/schema.org image URL declared by `pageUrl`, resolved to an
 * absolute URL, or null when the page is unreachable or declares none. Only scans `<head>` when
 * present — these tags never legitimately appear in `<body>`, and a full-page scan on a large
 * page risks matching an unrelated `itemprop="image"` from embedded content further down.
 */
export async function fetchOpenGraphImage(pageUrl: string, fetchImpl: TextFetch = globalThis.fetch): Promise<string | null> {
  const response = await fetchImpl(pageUrl).catch(() => null);
  if (!response || !response.ok) return null;
  const html = await response.text().catch(() => null);
  if (!html) return null;

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const scanTarget = headMatch ? headMatch[1] : html;

  for (const { attr, value } of META_PATTERNS) {
    const raw = extractMetaContent(scanTarget, attr, value);
    if (!raw) continue;
    const absolute = toAbsoluteUrl(raw, pageUrl);
    if (absolute) return absolute;
  }
  return null;
}
