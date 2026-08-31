#!/usr/bin/env node
/**
 * Opportunity image acquisition.
 *
 * Fills `opportunities.image_url` / `image_source_url` / `image_attribution` — the three
 * columns migration 0066 added and nothing has ever populated, which is why all 276 active
 * opportunities render OpportunityCard's "No image yet" band.
 *
 * Deliberately the same pipeline as scripts/acquire-university-images.ts, not a second one:
 * lib/acquisition/image-storage.ts was written entity-agnostic on purpose (its own header says
 * "written to be reused as-is for any future entity type (opportunities/programmes/...)"), and
 * lib/acquisition/opengraph.ts already does the tag extraction. Nothing in lib/ is modified by
 * this script — it is a new caller of existing, unchanged modules.
 *
 * SOURCE — exactly one tier, by founder instruction (2026-08-31): the organizer's own official
 * site's `og:image`. No Wikimedia tier (unlike universities): a Commons photo of a *building*
 * is not a picture of a *competition*, and putting one on the card would be the product's own
 * banned "a photo standing in for evidence" move. No stock photography at any tier — see
 * STOCK_PHOTO_HOSTS.
 *
 * WHAT THE STORED IMAGE ACTUALLY CLAIMS. Not "a photograph of this programme" — Oryn cannot
 * verify that. It claims exactly: *the organizer published this image on this page as that
 * page's own preview image*. That is a real, checkable, re-verifiable fact about the organizer,
 * and it is what `image_attribution` is written to say in full, per row. The card treats it as
 * identity/decoration, never as evidence (features/opportunities/opportunity-card.tsx).
 *
 * WHICH PAGE IS "THE ORGANIZER'S OFFICIAL SITE". Same self-referential rule the opportunity
 * ingest pipeline already established and documented (lib/opportunities/ingest.ts, "Self-
 * referential officialDomains hint"): arbitrary organizers — foundations, non-profits,
 * olympiad committees — have no registry of known-official domains the way universities have
 * ROR, so the row's own already-verified `official_url` domain IS the organizer's domain.
 * `sourceAuthority("image", ...)` still refuses EXCLUDED_DOMAINS (content farms, Wikipedia,
 * competitor sites) regardless, and a page on any other host is never fetched.
 *
 * Every candidate is judged on its REAL downloaded bytes — never a filename, a content-type, or
 * a source's reputation. It is checksummed and cross-checked against every other opportunity's
 * stored image so one asset can never land on two cards, uploaded to the `opportunity-images`
 * public Supabase Storage bucket (created on demand through the Storage Admin API — no
 * migration needed, same as the universities bucket), and the resulting public URL is confirmed
 * to actually serve (HEAD 200) before any column is written. A row that fails any gate keeps
 * `image_url = null` and keeps showing the honest placeholder; the reason is counted and named
 * in the run report rather than silently dropped.
 *
 * There is no per-row status column to write a "needs_review" state into (0066 added three
 * columns, and this lane's write region is those three) — so the rejection reasons live in this
 * script's report output, which is the deliverable. `--report` re-derives coverage from the
 * database alone, without fetching anything.
 *
 * Usage:
 *   npx tsx scripts/acquire-opportunity-images.ts                # dry run, all active rows
 *   npx tsx scripts/acquire-opportunity-images.ts --limit 40
 *   npx tsx scripts/acquire-opportunity-images.ts --only "PROMYS"
 *   npx tsx scripts/acquire-opportunity-images.ts --verbose      # + one line per rejection
 *   npx tsx scripts/acquire-opportunity-images.ts --apply        # any of the above + write
 *   npx tsx scripts/acquire-opportunity-images.ts --apply --force # re-check rows already done
 *   npx tsx scripts/acquire-opportunity-images.ts --report       # DB-only coverage report
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

// Same reasoning as the university image script's identical guard: this pipeline hits ~250
// arbitrary, unvetted organizer hosts per run, and a single malformed/truncated TLS response
// throws below the fetch Promise (undici's `Parser.finish` / `TLSSocket.onHttpSocketEnd`) where
// no per-call try/catch can see it. One bad server should cost one opportunity's candidate, not
// the run's already-written progress. Safe here specifically because writes are per-row and
// this process holds no shared mutable state a torn socket could corrupt.
process.on("uncaughtException", (error) => {
  console.error(`  [uncaughtException, continuing] ${error instanceof Error ? error.message : error}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`  [unhandledRejection, continuing] ${reason instanceof Error ? reason.message : reason}`);
});

import sharp, { type Metadata as SharpMetadata, type Stats as SharpStats } from "sharp";
import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { domainOf, sourceAuthority } from "../lib/acquisition/source-authority";
import { fetchOpenGraphImage } from "../lib/acquisition/opengraph";
import { ensureImageBucket, optimizeImage, uploadEntityImage, verifyPublicUrlServes } from "../lib/acquisition/image-storage";

const OPPORTUNITY_IMAGES_BUCKET = "opportunity-images";
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Stock-photo libraries and their CDNs. A hit here is a hard reject, never a downgrade: the
 * founder's rule is that a photo may not stand in as evidence, and a purchased/free stock shot
 * of "students in a lab" attached to a named competition is exactly that substitution. Real,
 * observed shape — organizers do point `og:image` straight at these hosts.
 *
 * This catches hotlinked stock only. An organizer who bought a stock photo and re-hosted it on
 * their own CDN is indistinguishable from their own photography at the byte level, and this
 * script does not claim to catch that case — see the report's own wording.
 */
const STOCK_PHOTO_HOSTS = new Set([
  "unsplash.com",
  "images.unsplash.com",
  "plus.unsplash.com",
  "pexels.com",
  "images.pexels.com",
  "pixabay.com",
  "cdn.pixabay.com",
  "shutterstock.com",
  "image.shutterstock.com",
  "gettyimages.com",
  "media.gettyimages.com",
  "istockphoto.com",
  "media.istockphoto.com",
  "stock.adobe.com",
  "t3.ftcdn.net",
  "t4.ftcdn.net",
  "freepik.com",
  "img.freepik.com",
  "dreamstime.com",
  "alamy.com",
  "123rf.com",
  "depositphotos.com",
  "st.depositphotos.com",
  "canva.com",
]);

/**
 * Filename shapes that are a logo/icon asset rather than an image of anything. Anchored on a
 * word boundary so "logo" only matches as its own token — `og-logo.png`, `plone-logo.svg`,
 * `InvestIN_Logo.jpg` — and never inside an unrelated word. Real cases from this corpus's own
 * dry run: kuleuven.be's `og:image` is Plone's shipped CMS default logo, cee.org's is the site
 * header logo, both of which would render as a cropped strip of a wordmark on a 16:7 card.
 *
 * A logo is not dishonest the way a stock photo is — it is genuinely the organizer's own mark —
 * so this gate is about the card looking broken, not about truth. Counted separately in the
 * report for exactly that reason.
 */
const LOGO_FILENAME_PATTERN = /(^|[^a-z])(logo|logos|icon|favicon|wordmark|brandmark|placeholder|default[-_]?(og|image|thumb))([^a-z]|$)/i;

/** The card's media band is `aspect-[16/7]` (2.29) and `aspect-[21/8]` (2.63) when featured, so
 * the served bytes get centre-cropped to a wide strip. Anything near-square or portrait loses
 * its subject to that crop; anything past 4:1 was already a banner strip and crops to a sliver. */
const MIN_WIDTH = 600;
const MIN_HEIGHT = 315;
const MIN_ASPECT = 1.2;
const MAX_ASPECT = 4.0;
/** Mean alpha, 0-255. Below this the asset is a transparent-background logo/badge export, which
 * composites onto the card's tint as a floating mark rather than an image. */
const MIN_MEAN_ALPHA = 200;
/** sharp's Shannon entropy over the image. Effectively zero only for a blank/solid-colour
 * asset — a tracking pixel, a spacer, a flat brand swatch. Set low deliberately: this is a
 * "there is no picture here at all" floor, not a taste judgement about busy vs. minimal design. */
const MIN_ENTROPY = 1.0;

/**
 * A refusal aimed at *us*, not a missing page. Directly measured on this corpus: cty.jhu.edu,
 * ku.edu.tr, ashoka.org and summerschoolsineurope.eu all return 403 to this script's identified
 * User-Agent, and all four still return 403 with a full browser-style header set (Accept,
 * Accept-Language, Accept-Encoding, Upgrade-Insecure-Requests) — so the block is on the
 * identified-bot UA itself, not on missing content negotiation.
 *
 * The fix is deliberately NOT to send a browser's User-Agent. Misrepresenting what is making
 * the request to get past a host's own stated refusal is the wrong trade for a product whose
 * entire data posture is honest provenance, and it is not a trade worth making for a decorative
 * card image. These rows keep the honest placeholder and are counted here under their own
 * reason, so the report never conflates "this organizer publishes no image" with "this
 * organizer's WAF turned us away".
 */
const BLOCKING_STATUSES = new Set([401, 403, 429]);

type Reason =
  | "no_official_url"
  | "page_not_authoritative"
  | "page_blocked_by_host"
  | "page_unreachable"
  | "no_og_tag"
  | "stock_photo_host"
  | "logo_or_icon_asset"
  | "vector_or_unsupported_format"
  | "download_failed"
  | "too_small"
  | "wrong_aspect"
  | "mostly_transparent"
  | "blank_image"
  | "duplicate_of_another_row"
  | "upload_url_did_not_serve"
  | "error";

const REASON_LABEL: Record<Reason, string> = {
  no_official_url: "row has no official_url to fetch",
  page_not_authoritative: "official_url's domain is not an accepted image source (excluded/content-farm domain)",
  page_blocked_by_host: "organizer's host refused our identified crawler (401/403/429) — not a missing image",
  page_unreachable: "organizer's page did not respond (timeout, DNS, 404, 5xx)",
  no_og_tag: "page declares no og:image / twitter:image at all",
  stock_photo_host: "og:image points at a stock-photo library — banned outright",
  logo_or_icon_asset: "og:image is a logo/icon/CMS-default asset, not an image",
  vector_or_unsupported_format: "og:image is an SVG or a non-raster format",
  download_failed: "og:image URL did not download as real image bytes",
  too_small: `below the ${MIN_WIDTH}x${MIN_HEIGHT} minimum for the card band`,
  wrong_aspect: `outside the ${MIN_ASPECT}:1-${MAX_ASPECT}:1 band — portrait, square, or a sliver`,
  mostly_transparent: "transparent-background logo export, not a picture",
  blank_image: "solid colour / blank — a spacer or tracking pixel, not a picture",
  duplicate_of_another_row: "byte-identical to an image already assigned to another opportunity",
  upload_url_did_not_serve: "uploaded, but the public URL failed its HEAD check — nothing written",
  error: "unexpected failure (see the log line above)",
};

interface OpportunityRow {
  id: string;
  title: string;
  organization: string | null;
  category: string;
  official_url: string | null;
  application_url: string | null;
  status: string;
  image_url: string | null;
  image_source_url: string | null;
}

type Outcome = { kind: "acquired" } | { kind: "already_done" } | { kind: "rejected"; reason: Reason };

function timedFetch(ms: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };
}

/** One retry with a short backoff — without it a transient blip on an organizer's own host is
 * indistinguishable in the report from "this organizer publishes no image", which is the exact
 * distinction the report exists to make. */
function withRetry(fetchFn: typeof fetch, retries = 1): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetchFn(input, init);
        if (response.ok || attempt >= retries) return response;
      } catch (error) {
        if (attempt >= retries) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  };
}

/** Identifies the pipeline on every request, same policy as the university script — a
 * descriptive User-Agent is basic etiquette when fetching a few hundred organizers' pages, and
 * several of them (Cloudflare-fronted .org sites) refuse an unidentified client outright. */
function withUserAgent(fetchFn: typeof fetch, userAgent: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", userAgent);
    if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,image/*,*/*;q=0.8");
    return fetchFn(input, { ...init, headers });
  };
}

/**
 * A `content="…"` attribute is HTML, so its value arrives entity-encoded: a real, observed case
 * in this corpus is Girl Up's `og:image`, whose query string comes back as
 * `?fm=pjpg&amp;q=85&amp;s=cf4ba3e…`. Fetched literally, the `&amp;` becomes part of the
 * parameter name and the CDN answers with an error page instead of the image — which this
 * script would otherwise report as `download_failed`, i.e. as the organizer's problem rather
 * than ours. Decoded here rather than in lib/acquisition/opengraph.ts (this lane's write region
 * is scripts/ plus the three image columns); the consumer is a correct place for it either way,
 * since the extractor's job is to return what the tag says.
 */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&(?:amp|AMP);/g, "&")
    .replace(/&(?:quot|QUOT);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:lt|LT);/g, "<")
    .replace(/&(?:gt|GT);/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isStockPhotoHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (STOCK_PHOTO_HOSTS.has(host)) return true;
  for (const entry of STOCK_PHOTO_HOSTS) {
    if (host.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/** Last path segment only — a `/logos/` directory in a CMS path says nothing about the asset,
 * but `…/plone-logo.svg` does. Query string stripped first so `?v=1631624274` can't hide it. */
function looksLikeLogoAsset(url: string): boolean {
  let filename: string;
  try {
    const parsed = new URL(url);
    filename = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "");
  } catch {
    return false;
  }
  return LOGO_FILENAME_PATTERN.test(filename);
}

interface DownloadedImage {
  bytes: Buffer;
  contentType: string | null;
}

async function downloadImage(url: string, fetchImpl: typeof fetch): Promise<DownloadedImage | null> {
  const response = await fetchImpl(url).catch(() => null);
  if (!response || !response.ok) return null;
  const contentType = response.headers.get("content-type");
  // A broken og:image link commonly still answers 200 with an HTML error page; decoding that as
  // image bytes is how sharp ends up throwing on a "successful" fetch.
  if (contentType && !contentType.toLowerCase().startsWith("image/")) return null;
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > MAX_DOWNLOAD_BYTES) return null;
  const arrayBuffer = await response.arrayBuffer().catch(() => null);
  if (!arrayBuffer || arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) return null;
  return { bytes: Buffer.from(arrayBuffer), contentType };
}

/** Formats sharp can decode that are nonetheless never a photograph of anything. SVG is the one
 * that actually turns up (CMS logos ship as SVG); the rest are listed so a future odd case
 * fails on the allow-list rather than silently rendering. */
const RASTER_FORMATS = new Set(["jpeg", "jpg", "png", "webp", "avif", "gif", "tiff", "heif"]);

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * The pages this script is allowed to read an `og:image` from, in order. Only ever the
 * organizer's own official page(s) — `official_url` first because that is the row's verified
 * identity, then `application_url` when it is a *different page on the same organizer domain*
 * (frequently the richer page: an org's "/apply" page carries a programme photo where its
 * landing page carries a wordmark). An `application_url` on a third-party form host — Typeform,
 * Google Forms, a shared portal — fails the same authority check and is never fetched.
 */
function candidatePages(row: OpportunityRow): string[] {
  if (!row.official_url) return [];
  const organizerDomain = domainOf(row.official_url);
  if (!organizerDomain) return [];
  const officialDomains = new Set([organizerDomain]);

  const pages: string[] = [];
  for (const url of [row.official_url, row.application_url]) {
    if (!url) continue;
    if (pages.includes(url)) continue;
    if (!sourceAuthority("image", url, officialDomains)) continue;
    pages.push(url);
  }
  return pages;
}

interface Candidate {
  imageUrl: string;
  /** The organizer page that declared it — this, not the asset's CDN URL, is what gets stored as
   * `image_source_url`: it is stable, human-checkable, and it is the thing whose claim we are
   * actually recording. (An og:image legitimately lives on a CMS/CDN host off the organizer's
   * own domain — `cdn.prod.website-files.com`, `s3.amazonaws.com` — so trust is rooted in the
   * declaring page's domain, never the asset's.) */
  pageUrl: string;
}

async function findCandidate(
  row: OpportunityRow,
  fetchImpl: typeof fetch,
  onUnreachable?: (pageUrl: string, detail: string) => void
): Promise<{ candidate: Candidate | null; reason: Reason | null }> {
  const pages = candidatePages(row);
  if (!row.official_url) return { candidate: null, reason: "no_official_url" };
  if (pages.length === 0) return { candidate: null, reason: "page_not_authoritative" };

  let anyPageResponded = false;
  let blocked = false;
  for (const pageUrl of pages) {
    // fetchOpenGraphImage returns null both for "page unreachable" and for "page fine, declares
    // no tag" — two very different findings for this report, and the whole point of the report
    // is to keep them apart. Recording the outcome through the fetch it already performs keeps
    // that distinction without fetching each page twice (which doubled the timeout surface and
    // showed up directly as an inflated `page_unreachable` count on the first dry run).
    let detail = "no response";
    const recordingFetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      try {
        const response = await fetchImpl(input, init);
        if (response.ok) anyPageResponded = true;
        else {
          detail = `HTTP ${response.status}`;
          if (BLOCKING_STATUSES.has(response.status)) blocked = true;
        }
        return response;
      } catch (error) {
        detail = error instanceof Error ? (error.name === "AbortError" ? `timeout after ${FETCH_TIMEOUT_MS / 1000}s` : error.message) : String(error);
        throw error;
      }
    }) as typeof fetch;

    const imageUrl = await fetchOpenGraphImage(pageUrl, recordingFetch);
    if (imageUrl) return { candidate: { imageUrl: decodeHtmlEntities(imageUrl), pageUrl }, reason: null };
    if (!anyPageResponded) onUnreachable?.(pageUrl, detail);
  }
  if (anyPageResponded) return { candidate: null, reason: "no_og_tag" };
  return { candidate: null, reason: blocked ? "page_blocked_by_host" : "page_unreachable" };
}

/** Where an organizer's `og:image` is judged. Every gate reads the real downloaded bytes except
 * the two URL-shape gates, which run first precisely so a known-bad asset is never downloaded. */
async function judgeCandidate(
  candidate: Candidate,
  fetchImpl: typeof fetch
): Promise<{ ok: true; optimized: Awaited<ReturnType<typeof optimizeImage>> } | { ok: false; reason: Reason }> {
  if (isStockPhotoHost(candidate.imageUrl)) return { ok: false, reason: "stock_photo_host" };
  if (looksLikeLogoAsset(candidate.imageUrl)) return { ok: false, reason: "logo_or_icon_asset" };

  const downloaded = await downloadImage(candidate.imageUrl, fetchImpl);
  if (!downloaded) return { ok: false, reason: "download_failed" };

  let metadata: SharpMetadata;
  let stats: SharpStats;
  try {
    metadata = await sharp(downloaded.bytes).metadata();
    stats = await sharp(downloaded.bytes).stats();
  } catch {
    return { ok: false, reason: "download_failed" };
  }
  if (!metadata.format || !RASTER_FORMATS.has(metadata.format)) return { ok: false, reason: "vector_or_unsupported_format" };

  if (!stats.isOpaque) {
    const alpha = stats.channels[stats.channels.length - 1];
    if (alpha && alpha.mean < MIN_MEAN_ALPHA) return { ok: false, reason: "mostly_transparent" };
  }
  if (typeof stats.entropy === "number" && stats.entropy < MIN_ENTROPY) return { ok: false, reason: "blank_image" };

  let optimized: Awaited<ReturnType<typeof optimizeImage>>;
  try {
    optimized = await optimizeImage(downloaded.bytes);
  } catch {
    return { ok: false, reason: "download_failed" };
  }

  // Judged on the bytes that will actually be served, not on the source's own dimensions.
  if (optimized.width < MIN_WIDTH || optimized.height < MIN_HEIGHT) return { ok: false, reason: "too_small" };
  const ratio = optimized.width / optimized.height;
  if (ratio < MIN_ASPECT || ratio > MAX_ASPECT) return { ok: false, reason: "wrong_aspect" };

  return { ok: true, optimized };
}

/**
 * The credit line stored in `image_attribution`, written to say exactly what is and is not
 * being claimed. An `og:image` carries no licence declaration, so claiming one would be
 * inventing it — the honest statement is who published it, where, when we took it, and that
 * neither the licence nor the depiction is independently verified. This string is the row's
 * whole audit trail: `image_source_url` says where to re-check, this says what to re-check for.
 */
function attributionFor(row: OpportunityRow, pageUrl: string, retrievedAt: string): string {
  const publisher = row.organization?.trim() || hostOf(pageUrl) || "the organizer";
  return (
    `Published by ${publisher} at ${hostOf(pageUrl)} as that page's own preview image (og:image); retrieved ${retrievedAt}. ` +
    `Licence not stated by the source. Not independently verified as a depiction of this programme.`
  );
}

async function loadRows(target: PostgrestTarget, includeInactive: boolean): Promise<OpportunityRow[]> {
  const filter = includeInactive ? "order=id.asc" : "status=eq.active&order=id.asc";
  const { rows } = await fetchAllRowsVerified<OpportunityRow>(
    target,
    "opportunities",
    "id,title,organization,category,official_url,application_url,status,image_url,image_source_url",
    filter
  );
  return rows;
}

/** DB-only view: what is actually on the cards right now. Fetches nothing external, so it is
 * the number to quote — it reflects the database, not this run's optimism. */
async function reportOnly(target: PostgrestTarget): Promise<void> {
  const rows = await loadRows(target, true);
  const active = rows.filter((r) => r.status === "active");
  const withImage = active.filter((r) => r.image_url);
  const byCategory = new Map<string, { total: number; withImage: number }>();
  for (const row of active) {
    const bucket = byCategory.get(row.category) ?? { total: 0, withImage: 0 };
    bucket.total++;
    if (row.image_url) bucket.withImage++;
    byCategory.set(row.category, bucket);
  }

  console.log(`Opportunity image coverage — ${rows.length} rows total, ${active.length} active.\n`);
  const pct = active.length ? ((withImage.length / active.length) * 100).toFixed(1) : "0.0";
  console.log(`  Active rows WITH a real image: ${withImage.length} / ${active.length} (${pct}%)`);
  console.log(`  Active rows showing "No image yet": ${active.length - withImage.length}\n`);
  console.log("  By category:");
  for (const [category, bucket] of [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`    ${category.padEnd(20)} ${String(bucket.withImage).padStart(3)} / ${String(bucket.total).padStart(3)}`);
  }
  const orphanedProvenance = active.filter((r) => r.image_url && !r.image_source_url);
  if (orphanedProvenance.length > 0) {
    console.log(`\n  WARNING: ${orphanedProvenance.length} row(s) have an image_url with no image_source_url — unattributable, should be cleared.`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const reportMode = argv.includes("--report");
  // Per-row rejection lines. Off by default because 200+ of them bury the summary, but the
  // summary alone can't be audited — `--verbose` is how a reviewer checks that a reason is
  // really the reason (e.g. confirming a `no_og_tag` page genuinely declares no tag).
  const verbose = argv.includes("--verbose");
  const onlyIndex = argv.indexOf("--only");
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1] : null;
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md. Nothing was read or written.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };

  if (reportMode) {
    await reportOnly(target);
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  if (apply) await ensureImageBucket(admin, OPPORTUNITY_IMAGES_BUCKET);

  const allRows = await loadRows(target, false);

  // Two layers of "one image, one card", because neither alone covers both cases.
  //
  // Byte dedup, WITHIN a run: keyed on the checksum of the original downloaded bytes
  // (lib/acquisition/image-storage.ts's OptimizedImage.checksum), so two rows fetching the same
  // asset from different URLs still collide. This map cannot persist between runs — the three
  // columns this lane may write hold no checksum, and re-deriving one would mean re-downloading
  // every stored image on every run.
  //
  // Source-page dedup, ACROSS runs: seeded from the `image_source_url` already stored on every
  // row. Weaker than a checksum (it only catches rows that resolved to the same page), but it
  // costs nothing — those rows are already loaded — and the same page yields the same og:image,
  // which is by far the most likely way a second run would hand one image to a second card.
  // What this pair does NOT catch: two different organizer pages serving byte-identical images,
  // acquired in two separate runs. Nothing currently rules that out; the post-run audit query in
  // the handoff notes is how it would be caught.
  const checksumOwner = new Map<string, string>();
  const sourcePageOwner = new Map<string, string>();
  for (const row of allRows) {
    if (row.image_url && row.image_source_url) sourcePageOwner.set(row.image_source_url, row.id);
  }

  let targetSet = allRows;
  if (only) targetSet = targetSet.filter((r) => r.title.toLowerCase().includes(only.toLowerCase()) || (r.organization ?? "").toLowerCase().includes(only.toLowerCase()));
  if (limit && Number.isFinite(limit)) targetSet = targetSet.slice(0, limit);

  console.log(
    `${allRows.length} active opportunities, ${allRows.filter((r) => r.image_url).length} already have an image. ` +
      `Processing ${targetSet.length} this run${apply ? " (--apply, writing)" : " (dry run, nothing written)"}${force ? " [--force: re-checking rows that already have one]" : ""}.\n`
  );

  const contactEmail = process.env.OPENALEX_CONTACT_EMAIL;
  const userAgent = `Oryn-ImageAcquisition/1.0 (https://oryn.app${contactEmail ? `; ${contactEmail}` : ""}) node`;
  const fetchImpl = withUserAgent(withRetry(timedFetch(FETCH_TIMEOUT_MS), 1), userAgent);
  const retrievedAt = new Date().toISOString().slice(0, 10);

  const outcomes = await mapWithConcurrency(targetSet, CONCURRENCY, async (row): Promise<Outcome> => {
    try {
      if (row.image_url && !force) return { kind: "already_done" };

      const { candidate, reason } = await findCandidate(row, fetchImpl, (pageUrl, detail) => {
        console.log(`  unreachable ${hostOf(pageUrl).padEnd(38)} ${detail}`);
      });
      if (!candidate) {
        if (verbose) console.log(`  reject     ${(reason ?? "error").padEnd(24)} ${row.title.slice(0, 44).padEnd(44)} ${row.official_url ?? "-"}`);
        return { kind: "rejected", reason: reason ?? "error" };
      }

      const pageOwner = sourcePageOwner.get(candidate.pageUrl);
      if (pageOwner && pageOwner !== row.id) {
        if (verbose) console.log(`  reject     duplicate_of_another_row  ${row.title.slice(0, 44).padEnd(44)} page already used by ${pageOwner}`);
        return { kind: "rejected", reason: "duplicate_of_another_row" };
      }

      const judgement = await judgeCandidate(candidate, fetchImpl);
      if (!judgement.ok) {
        if (verbose) console.log(`  reject     ${judgement.reason.padEnd(24)} ${row.title.slice(0, 44).padEnd(44)} ${candidate.imageUrl.slice(0, 110)}`);
        return { kind: "rejected", reason: judgement.reason };
      }

      const { optimized } = judgement;
      const existingOwner = checksumOwner.get(optimized.checksum);
      if (existingOwner && existingOwner !== row.id) {
        console.log(`  duplicate  ${row.title.slice(0, 60)} — same bytes as opportunity ${existingOwner}`);
        return { kind: "rejected", reason: "duplicate_of_another_row" };
      }
      // Claimed before the upload so two concurrent workers can't both pass the checks above.
      checksumOwner.set(optimized.checksum, row.id);
      sourcePageOwner.set(candidate.pageUrl, row.id);

      if (!apply) {
        console.log(`  would set  ${row.title.slice(0, 55).padEnd(55)} ${optimized.width}x${optimized.height}  <- ${candidate.pageUrl}`);
        return { kind: "acquired" };
      }

      const uploaded = await uploadEntityImage(admin, OPPORTUNITY_IMAGES_BUCKET, row.id, "cover", optimized.buffer);
      if (!(await verifyPublicUrlServes(uploaded.publicUrl, fetchImpl))) {
        checksumOwner.delete(optimized.checksum);
        sourcePageOwner.delete(candidate.pageUrl);
        return { kind: "rejected", reason: "upload_url_did_not_serve" };
      }

      const { error } = await admin
        .from("opportunities")
        .update({
          image_url: uploaded.publicUrl,
          image_source_url: candidate.pageUrl,
          image_attribution: attributionFor(row, candidate.pageUrl, retrievedAt),
        })
        .eq("id", row.id);
      if (error) throw new Error(`write failed: ${error.message}`);

      console.log(`  wrote      ${row.title.slice(0, 55).padEnd(55)} ${optimized.width}x${optimized.height}`);
      return { kind: "acquired" };
    } catch (error) {
      console.error(`  FAILED ${row.title}: ${error instanceof Error ? error.message : error}`);
      return { kind: "rejected", reason: "error" };
    }
  });

  const acquired = outcomes.filter((o) => o.kind === "acquired").length;
  const alreadyDone = outcomes.filter((o) => o.kind === "already_done").length;
  const rejections = new Map<Reason, number>();
  for (const outcome of outcomes) {
    if (outcome.kind === "rejected") rejections.set(outcome.reason, (rejections.get(outcome.reason) ?? 0) + 1);
  }
  const rejected = [...rejections.values()].reduce((a, b) => a + b, 0);

  console.log(`\n${"=".repeat(78)}`);
  console.log(`${apply ? "Wrote" : "Would write"} ${acquired} image${acquired === 1 ? "" : "s"} across ${targetSet.length} opportunit${targetSet.length === 1 ? "y" : "ies"} this run.`);
  if (alreadyDone) console.log(`${alreadyDone} already had one (skipped; --force re-checks them).`);
  console.log(`${rejected} got no image. Why, exactly:\n`);
  for (const [reason, count] of [...rejections.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${reason.padEnd(30)} ${REASON_LABEL[reason]}`);
  }
  console.log(
    `\nNote: this pipeline rejects stock photography hotlinked from a stock library. An organizer` +
      `\nwho licensed a stock photo and re-hosted it on their own domain is indistinguishable from` +
      `\ntheir own photography at the byte level; no gate here claims to catch that case.`
  );
  if (!apply) console.log("\nDry run — nothing written. Re-run with --apply.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
