#!/usr/bin/env node
/**
 * Measurement-only: does crawling deeper than scripts/acquire-opportunity-eligibility.ts
 * currently goes actually find eligibility content it's missing, or is the remaining gap a
 * genuine absence? No database writes. No model calls — this exists specifically so it can run
 * while the Anthropic account is out of credits.
 *
 * WHY THIS EXISTS. The acquisition script's own resolvePages() follows at most one hop from the
 * official_url homepage: the primary page, plus up to two links FROM THAT PAGE whose text looks
 * eligibility-shaped. A live, verified case (2026-08-31, checked with a rendered browser, not
 * assumed) — imo-official.org and ibo-info.org's homepages are genuinely thin marketing pages
 * with no eligibility content at either that depth or a JS-rendered version of it, but both
 * organizations plainly publish real regulations elsewhere on their sites (an IMO "Regulations"
 * PDF/page, IBO's rules) that a one-hop crawl from the homepage never reaches, because the
 * homepage itself doesn't link there directly — it's two hops out, or reachable only from a
 * "Regulations"/"About" page the homepage does link to.
 *
 * WHAT THIS SCRIPT DOES: for every currently-unresolved active opportunity, crawls up to 2 hops
 * from official_url along links whose anchor text/path looks eligibility-shaped, and reports,
 * per row, whether a page BEYOND what the production script already tries contains eligibility
 * language — split into two tiers, because a bare keyword hit is not the same as a real fact:
 *
 *   TIER A (keyword hit): the page's text matches an eligibility-adjacent keyword at all —
 *   "eligib", "citizen", "resident", "must be", an age/grade number, etc. Cheap, and cheaply
 *   gamed: "Open to students from 50+ countries!" is a Tier A hit and states nothing.
 *
 *   TIER B (looks stateable): the page contains a NUMBER co-located with an age/grade word
 *   (a real age or grade claim needs a number), OR a citizenship/residency word co-located with
 *   a requirement-shaped word ("must be", "required", "only", "restricted to", "eligible",
 *   "not eligible", "at least", "no more than") — i.e., a topic word AND a rule-shaped word
 *   together, not either alone. This is the same discipline the acquisition script's own
 *   extraction prompt already applies to a proposed fact (memory: "placement decides weight,
 *   not wording" — a bare "worldwide" is not evidence, a modal verb attached to a real number
 *   or a real restriction is closer to being one). Tier B is still a heuristic, not a substitute
 *   for a human or model actually reading the page — it is a lower bound on "the acquisition
 *   pass would likely find something real here if it could reach this page," not a claim that it
 *   would.
 *
 * Usage:
 *   npx tsx scripts/measure-eligibility-link-depth.ts                 # full unresolved set
 *   npx tsx scripts/measure-eligibility-link-depth.ts --limit 30
 *   npx tsx scripts/measure-eligibility-link-depth.ts --only "IMO"
 *   npx tsx scripts/measure-eligibility-link-depth.ts --verbose        # + per-row detail
 */

export {};

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local — fine, maybe using real environment variables.
}

process.on("uncaughtException", (error) => {
  console.error(`  [uncaughtException, continuing] ${error instanceof Error ? error.message : error}`);
});
process.on("unhandledRejection", (reason) => {
  console.error(`  [unhandledRejection, continuing] ${reason instanceof Error ? reason.message : reason}`);
});

import { fetchAllRowsVerified, type PostgrestTarget } from "../lib/acquisition/paginate";
import { domainOf, sourceAuthority } from "../lib/acquisition/source-authority";

const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;
const MAX_PAGE_CHARS = 12_000;
/** Per row, across the whole crawl — bounds worst-case runtime on a site with a huge sitemap. */
const MAX_PAGES_PER_ROW = 14;
/** Hops beyond the official_url page itself. Depth 1 = links found ON the homepage (roughly
 * what the production script already tries); depth 2 = links found on THOSE pages — the reach
 * the production script never has. Reported separately so "does depth 2 help" has a real answer
 * rather than being folded into an undifferentiated total. */
const MAX_DEPTH = 2;

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
function withUserAgent(fetchFn: typeof fetch, userAgent: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("User-Agent", userAgent);
    if (!headers.has("Accept")) headers.set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    return fetchFn(input, { ...init, headers });
  };
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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&(?:amp|AMP);/g, "&")
    .replace(/&(?:quot|QUOT);/g, '"')
    .replace(/&(?:apos|#39);/g, "'")
    .replace(/&(?:lt|LT);/g, "<")
    .replace(/&(?:gt|GT);/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}
function htmlToText(html: string, maxChars: number): string {
  let body = html.replace(/<head[\s\S]*?<\/head>/gi, "");
  body = body.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ");
  body = body.replace(/<[^>]+>/g, " ");
  body = decodeHtmlEntities(body).replace(/\s+/g, " ").trim();
  return body.slice(0, maxChars);
}
function extractLinks(html: string, baseUrl: string): { url: string; text: string }[] {
  const links: { url: string; text: string }[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const text = decodeHtmlEntities(match[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    try {
      links.push({ url: new URL(match[1], baseUrl).toString().split("#")[0], text });
    } catch {
      // Unparseable href — skip.
    }
  }
  return links;
}

// Deliberately narrower than an earlier version, after this exact pattern's own false-positive
// rate became the headline finding of a live run: "terms"/"conditions" was meant to catch
// "terms of eligibility" phrasing but instead routed the crawler into generic Terms-of-Service
// pages en masse (confirmed: UCSB's ToS matched via a NAV-MENU "International Students" link,
// unrelated to any stated eligibility text; Stanford's matched on "as is demanded of good
// citizens" — a conduct-code idiom, not a nationality claim) — of ~87 depth-1 hits in that run,
// a clear majority were /terms or /about paths. "about" had the same problem from the other
// direction (Nuffield's unrelated "family justice observatory," a Cambridge college's library
// page, three different universities' institutional-history pages — "About Us" is reliably an
// organizational-mission page, not an eligibility page). Both removed; SKIP_LINK_PATTERN below
// now explicitly excludes the worst offender (/terms) as a second line of defense even if a
// stray page happens to also carry "eligib" somewhere in unrelated boilerplate.
const ELIGIBILITY_LINK_PATTERN = /eligib|who.?can.?apply|requirement|admission|regulat|rules?\b|criteria|participat|entry.?rules|faq|how.?to.?apply|application.?process/i;
/** Non-content link shapes worth skipping outright — social/share/login/asset links, and (see
 * the note above) generic legal boilerplate that reliably produces false Tier A/B matches
 * without ever stating a program's own eligibility rule. */
const SKIP_LINK_PATTERN = /\.(pdf|jpg|jpeg|png|gif|svg|zip|docx?|xlsx?)(\?|$)|mailto:|tel:|javascript:|facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|\/login|\/signin|\/cart|\/terms|\/privacy|\/cookie|\/accessibility|\/sitemap/i;

// Tier A / Tier B scoring — see the file header for the reasoning.
const TIER_A_PATTERN = /eligib|citizen|resident|residency|nationality|visa|must be|required to|age\s*\d|\d{1,2}\s*(years?\s*old)|grade\s*\d/i;
const NUMBER_NEAR_AGE_GRADE = /\b(age[sd]?|years?\s*old|yaş)\b[^.]{0,25}\b\d{1,2}\b|\b\d{1,2}\b[^.]{0,25}\b(age[sd]?|years?\s*old|yaş)\b|\bgrade[sd]?\b[^.]{0,15}\b\d{1,2}\b|\b\d{1,2}(th|st|nd|rd)?\b[^.]{0,15}\bgrade\b/i;
// residen(?!tial): "Residential" (a program TYPE — vs. "commuter"/"online") substring-matched
// the bare "residen\w*" this used, a confirmed real bug in the sibling acquisition script (see
// its own ELIGIBILITY_KEYWORD_DENSITY_PATTERN comment) — fixed here too for consistency, though
// this script's own runs so far weren't traced to the same specific failure.
const CITIZENSHIP_WORD = /citizen|citizenship|nationality|passport|visa|residen(?!tial)|domestic|international|\bcountr(y|ies)\b/i;
const REQUIREMENT_WORD = /\b(must be|required to|only|eligible|not eligible|restricted to|at least|no more than|no older than|no younger than|open only to)\b/i;
function scorePage(text: string): { tierA: boolean; tierB: boolean } {
  const tierA = TIER_A_PATTERN.test(text);
  const tierB = NUMBER_NEAR_AGE_GRADE.test(text) || (CITIZENSHIP_WORD.test(text) && REQUIREMENT_WORD.test(text));
  return { tierA, tierB };
}

/** Caught spot-checking the very first Tier B hit before trusting the heuristic at scale: a
 * "Tech and Engineering Swiss Summer Camp" row's crawl reached heia-fr.ch's general Bachelor's
 * degree admission page (real "After the age of 25, admission is judged..." text — genuinely
 * grounded, genuinely a stated rule) — for the WRONG program. Same organization, unrelated
 * academic track. Tier B's own text-shape checks can't catch this; it's a same-organization,
 * different-program error, not a keyword-vs-marketing one, and it means Tier B alone can
 * overstate "found something real" the same way Tier A alone overstates "found something at
 * all". A cheap, generic check: does the candidate page's own URL or text contain at least one
 * distinctive word from the row's own title? Not proof of relevance (a page can legitimately be
 * relevant without repeating the program's exact name, and this can't distinguish "SciCamp for
 * Teens" from "SciCamp for Adults" if the shared word is the only distinctive one) — but its
 * absence is a real, cheap signal that the page found is more likely to be a different program
 * at the same institution than the one this opportunity actually represents.
 */
const TITLE_STOPWORDS = new Set([
  "the", "and", "for", "of", "in", "on", "at", "to", "a", "an",
  "summer", "program", "programme", "school", "camp", "course", "courses", "session", "week",
  "university", "college", "institute", "academy", "international", "national", "global",
  "students", "student", "high", "young", "youth", "world", "annual",
]);
function distinctiveTitleWords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !TITLE_STOPWORDS.has(w));
}
function pageMatchesRowTitle(titleWords: string[], pageUrl: string, pageText: string): boolean {
  if (titleWords.length === 0) return true; // Nothing distinctive to check against — don't penalize.
  const haystack = (pageUrl + " " + pageText).toLowerCase();
  return titleWords.some((w) => haystack.includes(w));
}

interface OpportunityRow {
  id: string;
  title: string;
  official_url: string | null;
  application_url: string | null;
  status: string;
  eligible_countries: string[];
  eligible_citizenships: string[] | null;
  citizenship_restrictions: string | null;
  residency_restrictions: string | null;
  country_eligibility_confirmed_open: boolean;
  minimum_age: number | null;
  maximum_age: number | null;
  eligible_grades: string[];
}
function countryResolved(o: OpportunityRow): boolean {
  return (
    o.eligible_countries.length > 0 ||
    (o.eligible_citizenships ?? []).length > 0 ||
    Boolean(o.citizenship_restrictions) ||
    Boolean(o.residency_restrictions) ||
    (o.country_eligibility_confirmed_open ?? false)
  );
}
function ageOrGradeResolved(o: OpportunityRow): boolean {
  return o.minimum_age !== null || o.maximum_age !== null || o.eligible_grades.length > 0;
}

interface CrawlResult {
  depth1TierA: boolean;
  depth1TierB: boolean;
  depth1TierBPageUrl: string | null;
  depth1TierBTitleRelevant: boolean;
  /** True only when depth-2 found a hit that NO depth-1 page already had — this is the number
   * that answers "does going deeper help", isolated from what a depth-1 crawl already covers. */
  newAtDepth2TierA: boolean;
  newAtDepth2TierB: boolean;
  /** Tier B AND the page shares a distinctive word with the row's own title — the number that
   * discounts for the heia-fr.ch shape (same organization, different, unrelated program). */
  newAtDepth2TierBTitleRelevant: boolean;
  pagesFetched: number;
  bestNewPageUrl: string | null;
  bestNewPageUrlTitleRelevant: string | null;
}

async function crawlRow(officialUrl: string, applicationUrl: string | null, titleWords: string[], fetchImpl: typeof fetch): Promise<CrawlResult | null> {
  const organizerDomain = domainOf(officialUrl);
  if (!organizerDomain) return null;
  const officialDomains = new Set([organizerDomain]);
  const isAuthorized = (url: string) => Boolean(sourceAuthority("opportunities", url, officialDomains));

  const visited = new Set<string>();
  const frontier: { url: string; depth: number }[] = [{ url: officialUrl, depth: 0 }];
  if (applicationUrl && applicationUrl !== officialUrl) frontier.push({ url: applicationUrl, depth: 0 });

  let depth1TierA = false;
  let depth1TierB = false;
  let depth1TierBPageUrl: string | null = null;
  let depth1TierBTitleRelevant = false;
  let newAtDepth2TierA = false;
  let newAtDepth2TierB = false;
  let newAtDepth2TierBTitleRelevant = false;
  let pagesFetched = 0;
  let bestNewPageUrl: string | null = null;
  let bestNewPageUrlTitleRelevant: string | null = null;
  let anyReachable = false;

  while (frontier.length > 0 && pagesFetched < MAX_PAGES_PER_ROW) {
    const current = frontier.shift()!;
    if (visited.has(current.url) || !isAuthorized(current.url)) continue;
    visited.add(current.url);

    const response = await fetchImpl(current.url).catch(() => null);
    if (!response || !response.ok) continue;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("html") && !contentType.includes("text")) continue;
    const html = await response.text().catch(() => "");
    if (!html) continue;
    anyReachable = true;
    pagesFetched++;

    const text = htmlToText(html, MAX_PAGE_CHARS);
    const score = scorePage(text);
    // "depth 0" (official_url/application_url themselves) counts as part of "depth 1" for this
    // report's purposes — it's exactly what the production script already reads today, so a hit
    // there is not a NEW finding, it's confirmation of what's already known (and already
    // resolved, or the row wouldn't be in this unresolved set to begin with).
    const isNewGround = current.depth >= 1;
    if (current.depth === 0) {
      // Nothing to record distinctly — this is the baseline the production script already has.
    } else if (current.depth === 1) {
      if (score.tierA) depth1TierA = true;
      if (score.tierB) {
        depth1TierB = true;
        if (!depth1TierBPageUrl || pageMatchesRowTitle(titleWords, current.url, text)) depth1TierBPageUrl = current.url;
        if (pageMatchesRowTitle(titleWords, current.url, text)) depth1TierBTitleRelevant = true;
      }
    } else {
      if (score.tierA && !depth1TierA) {
        newAtDepth2TierA = true;
        if (!bestNewPageUrl || score.tierB) bestNewPageUrl = current.url;
      }
      if (score.tierB && !depth1TierB) {
        newAtDepth2TierB = true;
        bestNewPageUrl = current.url;
        if (pageMatchesRowTitle(titleWords, current.url, text)) {
          newAtDepth2TierBTitleRelevant = true;
          bestNewPageUrlTitleRelevant = current.url;
        }
      }
    }
    void isNewGround;

    if (current.depth >= MAX_DEPTH) continue;
    const links = extractLinks(html, current.url)
      .filter((l) => !SKIP_LINK_PATTERN.test(l.url) && isAuthorized(l.url) && !visited.has(l.url))
      .filter((l) => ELIGIBILITY_LINK_PATTERN.test(l.text) || ELIGIBILITY_LINK_PATTERN.test(l.url));
    // De-duped, capped — a large site can offer dozens of "About"-shaped links.
    const seen = new Set<string>();
    for (const link of links) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      frontier.push({ url: link.url, depth: current.depth + 1 });
      if (seen.size >= 6) break;
    }
  }

  if (!anyReachable) return null;
  return {
    depth1TierA,
    depth1TierB,
    depth1TierBPageUrl,
    depth1TierBTitleRelevant,
    newAtDepth2TierA,
    newAtDepth2TierB,
    newAtDepth2TierBTitleRelevant,
    pagesFetched,
    bestNewPageUrl,
    bestNewPageUrlTitleRelevant,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const verbose = argv.includes("--verbose");
  const onlyIndex = argv.indexOf("--only");
  const only = onlyIndex >= 0 ? argv[onlyIndex + 1] : null;
  const limitIndex = argv.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(argv[limitIndex + 1]) : null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — see API_SETUP.md.");
    process.exitCode = 1;
    return;
  }
  const target: PostgrestTarget = { url, key: secretKey };
  const { rows: allRows } = await fetchAllRowsVerified<OpportunityRow>(
    target,
    "opportunities",
    "id,title,official_url,application_url,status,eligible_countries,eligible_citizenships,citizenship_restrictions,residency_restrictions,country_eligibility_confirmed_open,minimum_age,maximum_age,eligible_grades",
    "status=eq.active&order=id.asc"
  );

  let targetSet = allRows.filter((r) => (!countryResolved(r) || !ageOrGradeResolved(r)) && r.official_url);
  if (only) targetSet = targetSet.filter((r) => r.title.toLowerCase().includes(only.toLowerCase()));
  if (limit && Number.isFinite(limit)) targetSet = targetSet.slice(0, limit);

  console.log(`${allRows.length} active rows. ${targetSet.length} currently unresolved (country and/or age/grade) with an official_url — measuring crawl depth on all of them. No writes, no model calls.\n`);

  const contactEmail = process.env.OPENALEX_CONTACT_EMAIL;
  const userAgent = `Oryn-EligibilityLinkDepthMeasurement/1.0 (https://oryn.app${contactEmail ? `; ${contactEmail}` : ""}) node`;
  const fetchImpl = withUserAgent(withRetry(timedFetch(FETCH_TIMEOUT_MS), 1), userAgent);

  let unreachableCount = 0;
  const depth1TierACount: { title: string }[] = [];
  const depth1TierBCount: { title: string; url: string; titleRelevant: boolean }[] = [];
  const depth2HelpsTierA: { title: string; url: string }[] = [];
  const depth2HelpsTierB: { title: string; url: string }[] = [];
  const depth2HelpsTierBTitleRelevant: { title: string; url: string }[] = [];
  let totalPagesFetched = 0;

  await mapWithConcurrency(targetSet, CONCURRENCY, async (row) => {
    try {
      const titleWords = distinctiveTitleWords(row.title);
      const result = await crawlRow(row.official_url!, row.application_url, titleWords, fetchImpl);
      if (!result) {
        unreachableCount++;
        if (verbose) console.log(`  unreachable  ${row.title.slice(0, 60)}`);
        return;
      }
      totalPagesFetched += result.pagesFetched;
      // Depth 1 is what a ONE-LINE keyword-list widening on the EXISTING production script
      // would already reach — no new crawl infrastructure needed. Tracked separately from
      // depth-2 because it's the cheaper, more immediately actionable number (confirmed via
      // manual case study: IMO's real citizenship/age content sits one hop out, behind a link
      // whose text — "Regulations" — the production script's own link pattern doesn't match).
      if (result.depth1TierA) depth1TierACount.push({ title: row.title });
      if (result.depth1TierB) depth1TierBCount.push({ title: row.title, url: result.depth1TierBPageUrl ?? row.official_url!, titleRelevant: result.depth1TierBTitleRelevant });
      if (result.newAtDepth2TierA) depth2HelpsTierA.push({ title: row.title, url: result.bestNewPageUrl ?? row.official_url! });
      if (result.newAtDepth2TierB) depth2HelpsTierB.push({ title: row.title, url: result.bestNewPageUrl ?? row.official_url! });
      if (result.newAtDepth2TierBTitleRelevant) depth2HelpsTierBTitleRelevant.push({ title: row.title, url: result.bestNewPageUrlTitleRelevant ?? result.bestNewPageUrl ?? row.official_url! });
      if (verbose && (result.depth1TierB || result.newAtDepth2TierA || result.newAtDepth2TierB)) {
        console.log(
          `  hit  ${row.title.slice(0, 40).padEnd(40)} depth1TierB=${result.depth1TierB} newDepth2TierA=${result.newAtDepth2TierA} newDepth2TierB=${result.newAtDepth2TierB} titleRelevant=${result.newAtDepth2TierBTitleRelevant}  <- ${result.bestNewPageUrl ?? "(depth1)"}`
        );
      }
    } catch (error) {
      console.error(`  FAILED ${row.title}: ${error instanceof Error ? error.message : error}`);
    }
  });

  console.log(`\n${"=".repeat(78)}`);
  console.log(`Measured ${targetSet.length} unresolved rows, ${totalPagesFetched} pages fetched total, avg ${(totalPagesFetched / targetSet.length).toFixed(1)} pages/row.`);
  console.log(`Could not reach the site at all: ${unreachableCount}`);
  console.log(`\n--- DEPTH 1 (reachable via ONE hop from official_url — a keyword-list widening on the EXISTING production script gets these, no new crawl infrastructure) ---`);
  console.log(`Depth-1 Tier A (keyword hit): ${depth1TierACount.length} / ${targetSet.length}`);
  console.log(`Depth-1 Tier B (looks stateable): ${depth1TierBCount.length} / ${targetSet.length}, of which title-relevant: ${depth1TierBCount.filter((r) => r.titleRelevant).length}`);
  for (const r of depth1TierBCount) console.log(`  ${r.titleRelevant ? "[title-relevant]  " : "[generic org page]"} ${r.title.slice(0, 55).padEnd(55)} ${r.url}`);
  console.log(`\n--- DEPTH 2 (needs an actual second hop — genuinely new crawl reach) ---`);
  console.log(`TIER A (keyword hit) found ONLY beyond depth 1 (what the production script already tries): ${depth2HelpsTierA.length} / ${targetSet.length}`);
  console.log(`TIER B (looks like a stateable rule — number-near-age/grade, or citizenship-word-near-requirement-word) found ONLY beyond depth 1: ${depth2HelpsTierB.length} / ${targetSet.length}`);
  console.log(`TIER B AND shares a distinctive word with the row's own title (discounts for "right org, wrong program"): ${depth2HelpsTierBTitleRelevant.length} / ${targetSet.length}`);
  console.log(`\nThe number worth betting on — Tier B AND title-relevant:`);
  for (const r of depth2HelpsTierBTitleRelevant) console.log(`  ${r.title.slice(0, 60).padEnd(60)} ${r.url}`);
  console.log(`\nTier B but NOT title-relevant (real rule-shaped text, but no evidence it's about the SAME program as this row — inspect before trusting):`);
  const titleRelevantUrls = new Set(depth2HelpsTierBTitleRelevant.map((r) => r.url));
  for (const r of depth2HelpsTierB.filter((r) => !titleRelevantUrls.has(r.url))) console.log(`  ${r.title.slice(0, 60).padEnd(60)} ${r.url}`);
  console.log(`\nTier A minus Tier B (keyword-only, likely marketing/navigation noise — the gap between "matches a word" and "states a fact"):`);
  const tierBUrls = new Set(depth2HelpsTierB.map((r) => r.url));
  for (const r of depth2HelpsTierA.filter((r) => !tierBUrls.has(r.url))) console.log(`  ${r.title.slice(0, 60).padEnd(60)} ${r.url}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
