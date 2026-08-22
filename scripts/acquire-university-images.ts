#!/usr/bin/env node
/**
 * University campus image + logo acquisition.
 *
 * Fills `university_profile_metrics` (`primary_image_url`/`primary_image_status`/
 * `primary_image_license`/`primary_image_attribution`/`primary_image_checksum`) and, when a
 * verified logo is found, `universities.logo_url` directly. Deliberately uses NO new database
 * columns or tables — `universities.logo_url` already existed and had no source populating it,
 * and `university_profile_metrics` is this codebase's own established "flexible store" pattern
 * for dated, sourced institution facts (see 0038_canonical_entity_registry.sql's comment on
 * that table). This keeps the whole feature unblocked by the standing "no DDL access this
 * session" constraint (docs/founder-blocked-backlog.md) — per the founder's own instruction not
 * to add schema unless the existing shape genuinely can't represent the fact.
 *
 * Source tiers, in priority order (see lib/acquisition/source-authority.ts's new "image" fact
 * class for the domain policy backing this):
 *   1. Manual override — hand-verified for the highest-visibility pilot universities, same
 *      discipline as AU_TUITION/CA_TUITION in the sibling acquisition scripts. Starts empty;
 *      only populated reactively if the automated tiers below get one of these wrong.
 *   2. Wikidata P18 (image) -> the Commons file it names -> that file's own imageinfo
 *      (url/dimensions/license/attribution). The QID comes from `entity_external_ids`
 *      (id_system='WIKIDATA'), already resolved during the spine's identity work — this script
 *      never guesses a QID by name.
 *   3. The official site's own og:image/twitter:image meta tag, accepted only when its domain
 *      passes sourceAuthority('image', ...) as the institution's own official domain.
 * Logos use the same Wikidata mechanism against P154 (logo image) only — no official-site favicon
 * scraping adapter (a deliberate scope cut: reliable logo extraction from arbitrary sites is a
 * meaningfully bigger, lower-confidence problem than reusing the P18 pipeline for P154).
 *
 * Every candidate is validated against its REAL downloaded bytes (dimensions via sharp, never a
 * URL/filename guess), checksummed and cross-checked against every other university's stored
 * checksum so one real photo can never silently land on two institutions, uploaded to the
 * `university-images` public Supabase Storage bucket (created on demand via the Storage Admin
 * API — no migration needed), and the resulting public URL is confirmed to actually serve
 * (HEAD 200) before anything is written as a fact. A candidate that fails validation, dedup, or
 * the post-upload check is routed to `primary_image_status = 'needs_review'` with the reason in
 * `notes` — never silently dropped, never guessed past.
 *
 * Usage:
 *   npm run acquire:university-images                          # dry run, full spine
 *   npm run acquire:university-images -- --pilot                # 16 flagship universities only
 *   npm run acquire:university-images -- --only "Delft"         # substring filter on name
 *   npm run acquire:university-images -- --limit 50
 *   npm run acquire:university-images -- --apply                # any of the above + write
 *   npm run acquire:university-images -- --apply --force        # re-process already-verified rows too
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

// The official-site sub-page discovery tier (added this session) hits dozens of arbitrary,
// unvetted hosts per run instead of just Wikidata/Commons's own well-behaved endpoints — one of
// them sent a malformed/truncated response that crashed a full ~900-university run partway
// through with a raw Node/undici socket-teardown assertion (`Parser.finish` /
// `TLSSocket.onHttpSocketEnd`), a failure mode below the fetch Promise itself, so no per-call
// try/catch in this file ever saw it. A single bad server should cost one university's
// candidate, not the whole run's already-completed writes' worth of progress. Logging and
// continuing is the correct tradeoff for a batch script that writes incrementally per
// university (unlike a long-lived server, where surviving an uncaughtException is genuinely
// unsafe) — nothing here holds process-wide mutable state a corrupted socket could poison.
process.on("uncaughtException", (error) => {
  console.error(`  [uncaughtException, continuing] ${error instanceof Error ? error.message : error}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`  [unhandledRejection, continuing] ${reason instanceof Error ? reason.message : reason}`);
});

import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { getSupersededUniversityIds, loadSupersessionMapViaRest } from "../lib/universities/canonical";
import { domainOf, sourceAuthority } from "../lib/acquisition/source-authority";
import { fetchWikidataImageClaim, fetchCommonsFileInfo } from "../lib/acquisition/wikimedia";
import { fetchOpenGraphImage } from "../lib/acquisition/opengraph";
import { validateCampusImageCandidate, validateLogoCandidate } from "../lib/acquisition/image-validation";
import { UNIVERSITY_IMAGES_BUCKET, ensureImageBucket, optimizeImage, uploadEntityImage, verifyPublicUrlServes } from "../lib/acquisition/image-storage";

/** `universities.name` (exact) -> hand-verified override. Empty until an automated tier gets a
 * pilot university's image visibly wrong — see the file header. */
interface ManualOverride {
  campusUrl: string;
  sourceUrl: string;
  sourceType: "official_primary" | "wikimedia_commons";
  license: string | null;
  attribution: string | null;
  notes: string;
}
const MANUAL_IMAGE_OVERRIDES: Record<string, ManualOverride> = {
  // Both automated tiers rejected on inspection: Oxford/Cambridge's Wikidata P18 images are
  // extreme panoramas or too small, and neither has a usable og:image on its own homepage (both
  // are collegiate universities spread across a city, not one obvious "campus" building — see
  // the file header). Hand-picked from Commons, same discipline as AU_TUITION/CA_TUITION.
  "University of Oxford": {
    campusUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e2/Aerial_view_of_Oxford_UK_%2830935518073%29.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Oxford_UK_(30935518073).jpg",
    sourceType: "wikimedia_commons",
    license: "CC BY 2.0",
    attribution: "John Fielding",
    notes: "Aerial view of central Oxford — the automated P18 candidate (a 15050x5051 panorama) failed the aspect-ratio check, and ox.ac.uk publishes no og:image.",
  },
  "University of Cambridge": {
    campusUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Kings_College_Chapel%2C_Cambridge%2C_July_2010_%2801%29.JPG/3840px-Kings_College_Chapel%2C_Cambridge%2C_July_2010_%2801%29.JPG",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kings_College_Chapel,_Cambridge,_July_2010_(01).JPG",
    sourceType: "wikimedia_commons",
    license: "CC BY-SA 3.0",
    attribution: "Ardfern",
    notes: "King's College Chapel, Clare College and King's College — the automated P18 candidate was portrait, and cam.ac.uk's og:image is only 590x288.",
  },
};

/** Checked, in order, only when an official site's homepage has no og:image at all — most real
 * institution sites carry a representative photo on at least one of these. Kept short and
 * ordered by how likely each is to have one (an "about"/"campus" page over a "press" page,
 * which is more often just a text feed) since every miss is a full extra page fetch. */
const COMMON_OFFICIAL_SUBPATHS = ["/about", "/about-us", "/campus", "/visit", "/gallery", "/media", "/newsroom", "/press"];

/** Distinctive substrings (case-insensitive) for the 16 first-pilot universities named in the
 * founder's spec. Matched against `universities.name` AFTER superseded rows are already
 * excluded, so a substring like "University College London" can only resolve to the one
 * surviving canonical row even though "UCL" is a known duplicate-loser name elsewhere in the
 * spine (see docs/handoffs/claude-a-university-spine.md's "UCL mistake"). */
const PILOT_PATTERNS = [
  "Massachusetts Institute of Technology",
  "Stanford University",
  "Harvard University",
  "University of Oxford",
  "University of Cambridge",
  "Imperial College London",
  "University College London",
  "London School of Economics",
  "ETH Zurich",
  "EPFL",
  "École Polytechnique Fédérale de Lausanne",
  "University of Toronto",
  "University of British Columbia",
  "University of Sydney",
  "Technical University of Munich",
  "TUM",
  "National University of Singapore",
  "University of Tokyo",
];

interface UniversityRow {
  id: string;
  name: string;
  country: string;
  website_url: string | null;
  canonical_entity_id: string | null;
  logo_url: string | null;
}

interface RawCandidate {
  byteUrl: string;
  sourceUrl: string;
  sourceType: "official_primary" | "wikimedia_commons";
  license: string | null;
  attribution: string | null;
  /** True only for the one candidate built from MANUAL_IMAGE_OVERRIDES — drives the `verified`
   * status label regardless of sourceType. Checked on the actually-accepted candidate, not by
   * re-testing "does this university have an override entry at all" (which could otherwise
   * mislabel a later, non-override candidate that ends up accepted after the override candidate
   * itself failed its own validation). */
  handVerified?: boolean;
}

type Outcome = "verified" | "official" | "wikimedia_verified" | "fallback_logo_only" | "needs_review" | "no_candidate" | "already_done" | "error";

const CONCURRENCY = 5;
const DOWNLOAD_TIMEOUT_MS = 25_000;
// Some genuine Commons originals are large (a 15050x5051 aerial panorama is a real, well over
// 20MB, non-pathological file) — sharp decodes that fine, so the cap only needs to guard
// against something pathological, not against a real high-resolution source photo.
const MAX_DOWNLOAD_BYTES = 40 * 1024 * 1024;

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

/** One retry with a short backoff. Wikidata/Commons/official-site requests occasionally hit a
 * transient timeout or 5xx under this script's concurrency — without this, a real, otherwise-
 * fine candidate can be incorrectly reported as "no candidate" for a network blip rather than
 * an actual data gap. */
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

/**
 * Identifies this pipeline to every request with a descriptive User-Agent (app name, URL, and
 * an optional contact email reused from `OPENALEX_CONTACT_EMAIL` — the same "who to contact
 * about our automated requests" value already used for OpenAlex's polite pool).
 *
 * Not optional for Wikimedia specifically: a real, directly observed failure during this
 * pipeline's own pilot run — `upload.wikimedia.org` returned 429 "Too many requests... instead
 * use thumbnail images" for a request carrying no identifying User-Agent, and the *exact same*
 * request succeeded immediately once a descriptive one was set (see
 * https://meta.wikimedia.org/wiki/User-Agent_policy — unidentified clients share a much
 * stricter pool). Applied to every request this script makes, not just Wikimedia's, since a
 * descriptive UA is good etiquette for the official-site OpenGraph fetches too.
 */
function withUserAgent(fetchFn: typeof fetch, userAgent: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", userAgent);
    return fetchFn(input, { ...init, headers });
  };
}

const THROTTLED_HOSTS = new Set(["upload.wikimedia.org", "commons.wikimedia.org", "www.wikidata.org"]);

/**
 * A real User-Agent (see withUserAgent above) fixes Wikimedia's 429 for an ISOLATED request,
 * but not under this script's sustained volume — directly observed re-running this exact
 * pilot-verified URL after ~20 minutes of full-scale acquisition traffic: still 429, "too many
 * requests... contact noc@wikimedia.org to discuss a less disruptive approach". That message is
 * about request RATE, not identification, and this script is already requesting thumbnails, not
 * full originals (see wikimedia.ts's `iiurlwidth`) — the remaining lever is pacing. A single
 * shared minimum-gap timer across every Wikimedia-host request in this process (not per-worker,
 * so 5-way concurrency can't multiply the effective rate) is a materially "less disruptive
 * approach" without needing per-university retry-storms.
 */
let lastWikimediaRequestAt = 0;
async function throttleWikimediaHosts(url: string, minGapMs = 700): Promise<void> {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return;
  }
  if (!THROTTLED_HOSTS.has(host)) return;
  const wait = lastWikimediaRequestAt + minGapMs - Date.now();
  lastWikimediaRequestAt = Math.max(Date.now(), lastWikimediaRequestAt + minGapMs);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

function withWikimediaThrottle(fetchFn: typeof fetch): typeof fetch {
  return async (input, init) => {
    await throttleWikimediaHosts(typeof input === "string" ? input : input.toString());
    return fetchFn(input, init);
  };
}

async function downloadBuffer(url: string, fetchImpl: typeof fetch, maxBytes = MAX_DOWNLOAD_BYTES): Promise<Buffer | null> {
  const response = await fetchImpl(url).catch(() => null);
  if (!response || !response.ok) return null;
  // A handful of official-site og:image URLs in the full-scale run turned out to be broken
  // links that still answer 200 with an HTML error/placeholder page rather than a real 404 —
  // sharp then threw trying to decode that HTML as image bytes. Reject non-image content types
  // up front instead of letting the optimize step discover it the hard way.
  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.startsWith("image/")) return null;
  const lengthHeader = response.headers.get("content-length");
  if (lengthHeader && Number(lengthHeader) > maxBytes) return null;
  const arrayBuffer = await response.arrayBuffer().catch(() => null);
  if (!arrayBuffer || arrayBuffer.byteLength > maxBytes) return null;
  return Buffer.from(arrayBuffer);
}

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
 * Every tier that produced a candidate URL, in priority order — NOT just the first one found.
 * A university can have a QID whose P18 image is real but unusable (wrong aspect, too small);
 * without a second candidate to fall back to, that university would incorrectly land in
 * needs_review even when a perfectly good official-site image was available too (observed
 * directly: Stanford's Commons panorama is a 4:1 extreme crop, but stanford.edu's own og:image
 * is a fine, ordinary 1200x630 photo). Validation (dimensions, dedup) happens per-candidate in
 * the caller, trying each in order until one actually passes.
 */
async function resolveCampusCandidates(uni: UniversityRow, qid: string | null, fetchImpl: typeof fetch): Promise<RawCandidate[]> {
  const candidates: RawCandidate[] = [];

  const override = MANUAL_IMAGE_OVERRIDES[uni.name];
  if (override) {
    candidates.push({ byteUrl: override.campusUrl, sourceUrl: override.sourceUrl, sourceType: override.sourceType, license: override.license, attribution: override.attribution, handVerified: true });
  }

  if (qid) {
    const filename = await fetchWikidataImageClaim(qid, "P18", fetchImpl);
    if (filename) {
      const info = await fetchCommonsFileInfo(filename, fetchImpl);
      if (info) candidates.push({ byteUrl: info.url, sourceUrl: info.descriptionUrl, sourceType: "wikimedia_commons", license: info.license, attribution: info.attribution });
    }
  }

  if (uni.website_url) {
    // Trust is rooted in the PAGE's domain, not the served image's own domain: an og:image tag
    // is the official site's own declaration of its representative image, commonly served from
    // a CDN/CMS asset host (Storyblok, Cloudinary, a media subdomain) that isn't itself under
    // the institution's domain — real, observed case: Stanford's og:image resolves to
    // a-us.storyblok.com, not stanford.edu. Checking the asset URL's own domain instead would
    // reject exactly the common case this tier exists for. The provenance URL stored is the
    // official page itself (stable, human-checkable), not the CDN asset URL.
    const officialDomains = new Set([domainOf(uni.website_url)]);
    const pageAuthority = sourceAuthority("image", uni.website_url, officialDomains);
    if (pageAuthority) {
      const ogUrl = await fetchOpenGraphImage(uni.website_url, fetchImpl);
      if (ogUrl) {
        candidates.push({ byteUrl: ogUrl, sourceUrl: uni.website_url, sourceType: "official_primary", license: null, attribution: null });
      } else {
        // Homepage often carries no og:image at all (MIT's own web.mit.edu is a real example —
        // see the file header's MIT case). Try a short list of pages an official site is likely
        // to have a real representative photo on, stopping at the first hit. Same downstream
        // validation (dimensions/aspect/dedup) still applies — this only expands where a
        // candidate URL can come from, never what counts as acceptable once found.
        let origin: string | null = null;
        try {
          origin = new URL(uni.website_url).origin;
        } catch {
          origin = null;
        }
        if (origin) {
          for (const path of COMMON_OFFICIAL_SUBPATHS) {
            const subPageUrl = `${origin}${path}`;
            const subOgUrl = await fetchOpenGraphImage(subPageUrl, fetchImpl);
            if (subOgUrl) {
              candidates.push({ byteUrl: subOgUrl, sourceUrl: subPageUrl, sourceType: "official_primary", license: null, attribution: null });
              break;
            }
          }
        }
      }
    }
  }

  return candidates;
}

interface CandidateAttempt {
  ok: boolean;
  reason?: string;
  optimized?: Awaited<ReturnType<typeof optimizeImage>>;
}

/** Downloads, optimizes, and validates ONE candidate — dimensions and dedup, never a URL/
 * filename guess. Used in a loop over resolveCampusCandidates() output so a rejected candidate
 * falls through to the next tier instead of ending the search. */
async function tryCampusCandidate(uni: UniversityRow, candidate: RawCandidate, fetchImpl: typeof fetch, checksumOwner: Map<string, string>): Promise<CandidateAttempt> {
  const bytes = await downloadBuffer(candidate.byteUrl, fetchImpl);
  if (!bytes) return { ok: false, reason: "Candidate found but download failed or exceeded the size cap." };

  const optimized = await optimizeImage(bytes);
  const dimCheck = validateCampusImageCandidate({ width: optimized.width, height: optimized.height });
  if (!dimCheck.ok) return { ok: false, reason: dimCheck.reason };

  const dupOwner = checksumOwner.get(optimized.checksum);
  if (dupOwner && dupOwner !== uni.id) {
    return { ok: false, reason: `Same image already assigned to university_id ${dupOwner} — possible mismatched Wikidata claim, held for manual review rather than auto-assigned to two institutions.` };
  }

  return { ok: true, optimized };
}

async function resolveLogoCandidate(qid: string | null, fetchImpl: typeof fetch): Promise<RawCandidate | null> {
  if (!qid) return null;
  const filename = await fetchWikidataImageClaim(qid, "P154", fetchImpl);
  if (!filename) return null;
  const info = await fetchCommonsFileInfo(filename, fetchImpl);
  if (!info) return null;
  return { byteUrl: info.url, sourceUrl: info.descriptionUrl, sourceType: "wikimedia_commons", license: info.license, attribution: info.attribution };
}

interface MetricWrite {
  metricCode: string;
  valueText: string;
  sourceUrl: string;
  sourceType: string;
  notes: string | null;
}

async function upsertMetric(admin: import("@supabase/supabase-js").SupabaseClient, universityId: string, write: MetricWrite): Promise<void> {
  const payload = {
    university_id: universityId,
    metric_code: write.metricCode,
    value_text: write.valueText,
    unit: "url",
    source_url: write.sourceUrl,
    source_type: write.sourceType,
    verified_at: new Date().toISOString(),
    data_quality_flag: "current",
    notes: write.notes,
  };
  const existing = await admin.from("university_profile_metrics").select("id").eq("university_id", universityId).eq("metric_code", write.metricCode).maybeSingle();
  const { error } = existing.data
    ? await admin.from("university_profile_metrics").update(payload).eq("id", existing.data.id)
    : await admin.from("university_profile_metrics").insert(payload);
  if (error) throw new Error(`write ${write.metricCode} for ${universityId} failed: ${error.message}`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const force = argv.includes("--force");
  const pilotOnly = argv.includes("--pilot");
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
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  if (apply) await ensureImageBucket(admin, UNIVERSITY_IMAGES_BUCKET);

  const { rows: allUniversities } = await fetchAllRowsVerified<UniversityRow>(
    target,
    "universities",
    "id,name,country,website_url,canonical_entity_id,logo_url",
    "order=id.asc"
  );
  const supersessionMap = await loadSupersessionMapViaRest(target);
  const supersededIds = new Set(getSupersededUniversityIds(supersessionMap));
  const liveUniversities = allUniversities.filter((u) => !supersededIds.has(u.id));

  const { rows: wikidataIds } = await fetchAllRowsVerified<{ entity_id: string; external_id: string }>(
    target,
    "entity_external_ids",
    "entity_id,external_id",
    "id_system=eq.WIKIDATA&order=id.asc"
  );
  const qidByEntityId = new Map(wikidataIds.map((r) => [r.entity_id, r.external_id]));
  const qidByUniversityId = new Map<string, string>();
  for (const u of liveUniversities) {
    if (u.canonical_entity_id) {
      const qid = qidByEntityId.get(u.canonical_entity_id);
      if (qid) qidByUniversityId.set(u.id, qid);
    }
  }

  const { rows: existingStatuses } = await fetchAllRowsVerified<{ university_id: string; value_text: string | null }>(
    target,
    "university_profile_metrics",
    "university_id,value_text",
    "metric_code=eq.primary_image_status&order=id.asc"
  );
  const statusByUniversityId = new Map(existingStatuses.map((r) => [r.university_id, r.value_text]));

  const { rows: existingChecksums } = await fetchAllRowsVerified<{ university_id: string; value_text: string | null }>(
    target,
    "university_profile_metrics",
    "university_id,value_text",
    "metric_code=eq.primary_image_checksum&order=id.asc"
  );
  const checksumOwner = new Map<string, string>(); // checksum -> university_id
  for (const r of existingChecksums) if (r.value_text) checksumOwner.set(r.value_text, r.university_id);

  let targetSet = liveUniversities;
  if (only) targetSet = targetSet.filter((u) => u.name.toLowerCase().includes(only.toLowerCase()));
  else if (pilotOnly) targetSet = targetSet.filter((u) => PILOT_PATTERNS.some((p) => u.name.toLowerCase().includes(p.toLowerCase())));
  if (limit && Number.isFinite(limit)) targetSet = targetSet.slice(0, limit);

  console.log(
    `${liveUniversities.length} live universities in the spine, ${qidByUniversityId.size} with a Wikidata QID. ` +
      `Processing ${targetSet.length} this run${apply ? " (--apply, writing)" : " (dry run, nothing written)"}${force ? " [--force: re-checking already-verified rows too]" : ""}.`
  );

  const contactEmail = process.env.OPENALEX_CONTACT_EMAIL;
  const userAgent = `Oryn-ImageAcquisition/1.0 (https://oryn.app${contactEmail ? `; ${contactEmail}` : ""}) node`;
  const fetchImpl = withUserAgent(withRetry(withWikimediaThrottle(timedFetch(DOWNLOAD_TIMEOUT_MS)), 1), userAgent);
  const DONE_STATUSES = new Set(["verified", "official", "wikimedia_verified"]);

  const outcomes = await mapWithConcurrency(targetSet, CONCURRENCY, async (uni): Promise<Outcome> => {
    try {
      const existingStatus = statusByUniversityId.get(uni.id);
      if (!force && existingStatus && DONE_STATUSES.has(existingStatus)) {
        return "already_done";
      }

      const qid = qidByUniversityId.get(uni.id) ?? null;
      let outcome: Outcome = "no_candidate";
      const campusWrites: MetricWrite[] = [];

      const candidates = await resolveCampusCandidates(uni, qid, fetchImpl);
      let accepted: { candidate: RawCandidate; optimized: NonNullable<CandidateAttempt["optimized"]> } | null = null;
      let lastCandidate: RawCandidate | null = null;
      let lastReason: string | null = null;
      for (const candidate of candidates) {
        const attempt = await tryCampusCandidate(uni, candidate, fetchImpl, checksumOwner);
        lastCandidate = candidate;
        if (attempt.ok && attempt.optimized) {
          accepted = { candidate, optimized: attempt.optimized };
          break;
        }
        lastReason = attempt.reason ?? "Failed validation.";
      }

      if (accepted) {
        const { candidate, optimized } = accepted;
        const status = candidate.handVerified ? "verified" : candidate.sourceType === "wikimedia_commons" ? "wikimedia_verified" : "official";
        if (apply) {
          const uploaded = await uploadEntityImage(admin, UNIVERSITY_IMAGES_BUCKET, uni.id, "campus", optimized.buffer);
          const serves = await verifyPublicUrlServes(uploaded.publicUrl, fetchImpl);
          if (!serves) {
            campusWrites.push({
              metricCode: "primary_image_status",
              valueText: "needs_review",
              sourceUrl: candidate.sourceUrl,
              sourceType: candidate.sourceType,
              notes: "Uploaded but the public URL did not verify (HEAD non-200) — not written as primary_image_url.",
            });
            outcome = "needs_review";
          } else {
            campusWrites.push(
              { metricCode: "primary_image_url", valueText: uploaded.publicUrl, sourceUrl: candidate.sourceUrl, sourceType: candidate.sourceType, notes: null },
              { metricCode: "primary_image_status", valueText: status, sourceUrl: candidate.sourceUrl, sourceType: candidate.sourceType, notes: null },
              { metricCode: "primary_image_checksum", valueText: optimized.checksum, sourceUrl: candidate.sourceUrl, sourceType: candidate.sourceType, notes: null }
            );
            if (candidate.license) campusWrites.push({ metricCode: "primary_image_license", valueText: candidate.license, sourceUrl: candidate.sourceUrl, sourceType: candidate.sourceType, notes: null });
            if (candidate.attribution) campusWrites.push({ metricCode: "primary_image_attribution", valueText: candidate.attribution, sourceUrl: candidate.sourceUrl, sourceType: candidate.sourceType, notes: null });
            checksumOwner.set(optimized.checksum, uni.id);
            outcome = status;
          }
        } else {
          console.log(`  would write ${uni.name} <- ${status} (${candidate.sourceType}) ${optimized.width}x${optimized.height} from ${candidate.sourceUrl}`);
          outcome = status;
        }
      } else if (lastCandidate) {
        campusWrites.push({
          metricCode: "primary_image_status",
          valueText: "needs_review",
          sourceUrl: lastCandidate.sourceUrl,
          sourceType: lastCandidate.sourceType,
          notes: candidates.length > 1 ? `${candidates.length} candidates tried, all failed. Last reason: ${lastReason}` : (lastReason ?? "Failed validation."),
        });
        outcome = "needs_review";
      }

      if (candidates.length === 0) {
        console.log(`  no campus candidate for ${uni.name} (qid: ${qid ? "yes" : "no"}, website: ${uni.website_url ? "yes" : "no"})`);
      } else if (outcome === "needs_review") {
        const reason = campusWrites.find((w) => w.metricCode === "primary_image_status")?.notes;
        console.log(`  needs_review ${uni.name}: ${reason ?? "unknown reason"}`);
      }

      // Logo — independent of campus outcome, only when the column is genuinely empty.
      if (!uni.logo_url && qid) {
        const logoCandidate = await resolveLogoCandidate(qid, fetchImpl);
        if (logoCandidate) {
          const bytes = await downloadBuffer(logoCandidate.byteUrl, fetchImpl);
          if (bytes) {
            const optimizedLogo = await optimizeImage(bytes, 800);
            if (validateLogoCandidate({ width: optimizedLogo.width, height: optimizedLogo.height }).ok) {
              if (apply) {
                const uploaded = await uploadEntityImage(admin, UNIVERSITY_IMAGES_BUCKET, uni.id, "logo", optimizedLogo.buffer);
                if (await verifyPublicUrlServes(uploaded.publicUrl, fetchImpl)) {
                  const { error } = await admin.from("universities").update({ logo_url: uploaded.publicUrl }).eq("id", uni.id);
                  if (error) throw new Error(`logo_url write failed: ${error.message}`);
                  if (outcome === "no_candidate") outcome = "fallback_logo_only";
                }
              } else {
                console.log(`  would write logo for ${uni.name} from ${logoCandidate.sourceUrl}`);
                if (outcome === "no_candidate") outcome = "fallback_logo_only";
              }
            }
          }
        }
      }

      if (apply) for (const write of campusWrites) await upsertMetric(admin, uni.id, write);
      return outcome;
    } catch (error) {
      console.error(`  FAILED ${uni.name}: ${error instanceof Error ? error.message : error}`);
      return "error";
    }
  });

  const counts = new Map<Outcome, number>();
  for (const o of outcomes) counts.set(o, (counts.get(o) ?? 0) + 1);

  console.log(`\n${apply ? "Wrote" : "Would write"} results for this run:`);
  for (const key of ["verified", "official", "wikimedia_verified", "fallback_logo_only", "needs_review", "no_candidate", "already_done", "error"] as Outcome[]) {
    if (counts.get(key)) console.log(`  ${key}: ${counts.get(key)}`);
  }

  const totalCoveredThisRun = (counts.get("verified") ?? 0) + (counts.get("official") ?? 0) + (counts.get("wikimedia_verified") ?? 0);
  console.log(`\n${totalCoveredThisRun} real campus image${totalCoveredThisRun === 1 ? "" : "s"} ${apply ? "written" : "ready to write"} this run.`);
  if (!apply) console.log("Dry run — nothing written. Re-run with --apply.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
