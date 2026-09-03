import "server-only";

import { tavilyProvider, type TavilyExtractFailure } from "@/lib/providers/tavily";
import type { FetchAttempt, FetchRung } from "./types";

/**
 * Design doc §7.3's escalation ladder. Rungs 1-3 only — rung 4 (PDF extraction, "if the URL
 * is a PDF, or step 2/3 returned a PDF content type: extract the PDF text") is a deliberate,
 * documented gap in this pass, not an oversight: the design doc itself sizes the affected
 * set at 6 corpus rows, 2 of which are miscategorized faculty CVs rather than real
 * opportunity pages (§7.0), and adding a PDF-parsing dependency for a ~4-row real benefit is
 * a call worth a founder/next-pass decision rather than bundled into this build silently. A
 * PDF-primary row without rung 4 does not get silently misclassified — it fails
 * ./classify.ts's content-floor guard (a raw PDF byte stream is not readable text) and
 * correctly lands on `p2_unreadable` / `failure_class: "reached_unusable"`, exactly the
 * outcome §7.5's own table defines for "reached but unusable." This is the honest
 * degradation the whole design is built around, not a hack standing in for the real rung.
 *
 * Only three rungs are attempted per §7.3's own escalation logic: rung 3 only runs when
 * rung 2 returned an unfollowed redirect. A domain that 403s at rung 1 and rung 2 stops
 * there — there is no cross-host redirect to chase.
 */

/**
 * Design doc §6.2: "At most one immediate retry, only for transport_error, after a 2s
 * pause... Never retry a 403 or 404 in-request. Those are answers." Applied here, not
 * duplicated per rung — a transport-level failure (no HTTP status at all, i.e. the fetch
 * itself threw or timed out) gets exactly one retry; a real HTTP status of any kind
 * (including 403/404) is an answer and is returned as-is on the first attempt. Not applied
 * to rung 1 (Tavily): tavilyProvider.extract batches by design and returns one
 * ProviderResult for the whole call, with no per-URL retry granularity to hang this off of.
 */
async function withOneTransportRetry(attempt: () => Promise<RungOutcome>): Promise<RungOutcome> {
  const first = await attempt();
  if (first.attempt.httpStatus !== null) return first; // a real status is an answer, never retried
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return attempt();
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

/** Strips script/style blocks then all remaining tags — a rough, dependency-free HTML→text
 * pass sufficient for ./classify.ts's phrase/content matching, not a rendering-quality
 * extraction. Kept deliberately simple, matching this codebase's existing "the discovery
 * pipeline is entirely LLM-free" precedent (lib/opportunities/discover.ts) — no new parsing
 * dependency for what a handful of regexes already do well enough for phrase matching. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export interface RungOutcome {
  attempt: FetchAttempt;
  content: string | null;
  finalUrl: string | null;
}

/** Rung 1: `tavilyProvider.extract` — renders server-side, already in the codebase, handles
 * a share of JS-only and bot-filtered pages with zero special handling on our part. */
export async function fetchRung1Tavily(url: string): Promise<RungOutcome & { tavilyFailedResults: TavilyExtractFailure[] }> {
  const result = await tavilyProvider.extract([url]);

  if (!result.success) {
    return {
      attempt: { rung: 1, method: "tavily_extract", httpStatus: null, bytes: null, error: result.error.message },
      content: null,
      finalUrl: null,
      tavilyFailedResults: [],
    };
  }

  const hit = result.data.results.find((r) => r.url === url);
  if (hit) {
    return {
      attempt: { rung: 1, method: "tavily_extract", httpStatus: 200, bytes: hit.raw_content.length, error: null },
      content: hit.raw_content,
      finalUrl: url,
      tavilyFailedResults: result.data.failedResults,
    };
  }

  const failure = result.data.failedResults.find((f) => f.url === url);
  return {
    attempt: { rung: 1, method: "tavily_extract", httpStatus: null, bytes: null, error: failure?.error ?? "not present in results or failed_results" },
    content: null,
    finalUrl: null,
    tavilyFailedResults: result.data.failedResults,
  };
}

/**
 * Rung 2: a direct fetch with a realistic browser User-Agent — design doc §7.0's single
 * highest-yield rung, measured to be the *only* difference between 403/919B and 200/220KB on
 * research.ku.edu.tr. `redirect: "manual"` deliberately, not "follow": a 3xx here is recorded
 * as its own outcome (not silently absorbed) so rung 3 below can attempt it explicitly and
 * the audit trail shows a redirect was found and chased, not just a final 200 from nowhere —
 * design doc §8.2's own reasoning for storing `final_url` separately from `attempted_url`.
 */
export async function fetchRung2BrowserUA(url: string, timeoutMs = 15000): Promise<RungOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    clearTimeout(timeout);

    // Confirmed empirically (not assumed): Node's fetch (undici) with redirect: "manual"
    // returns `type: "basic"` with the real Location header fully readable -- unlike browser
    // fetch's spec-mandated opaque redirect response, there is no same-origin security
    // boundary to protect for a server-to-server call. The `type === "opaqueredirect"` check
    // is defensive insurance for a runtime that DOES opacify it; the status-range check is
    // what actually fires today and is what ukmt.org.uk's 301 depends on.
    const isRedirect = response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400);
    if (isRedirect) {
      const location = response.headers.get("location");
      return { attempt: { rung: 2, method: "browser_ua_fetch", httpStatus: response.status || 302, bytes: null, error: null }, content: null, finalUrl: location ? new URL(location, url).toString() : null };
    }

    const text = await response.text();
    if (!response.ok) {
      return { attempt: { rung: 2, method: "browser_ua_fetch", httpStatus: response.status, bytes: text.length, error: `HTTP ${response.status}` }, content: null, finalUrl: null };
    }
    const content = htmlToText(text);
    return { attempt: { rung: 2, method: "browser_ua_fetch", httpStatus: response.status, bytes: text.length, error: null }, content, finalUrl: url };
  } catch (error) {
    clearTimeout(timeout);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      attempt: { rung: 2, method: "browser_ua_fetch", httpStatus: null, bytes: null, error: isAbort ? "timeout" : error instanceof Error ? error.message : "Unknown network error" },
      content: null,
      finalUrl: null,
    };
  }
}

/** Rung 3: fetch the final URL a rung-2 redirect pointed at — design doc §7.3, "ukmt.org.uk
 * is 301 → 200. A cross-host redirect that the fetcher declines to follow is not a block."
 * `redirect: "follow"` here (unlike rung 2): once we've deliberately chased the first hop
 * ourselves and logged it, a short further chain at the target is not itself interesting to
 * audit separately. */
export async function fetchRung3FollowRedirect(finalUrl: string, timeoutMs = 15000): Promise<RungOutcome> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(finalUrl, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    clearTimeout(timeout);
    const text = await response.text();
    if (!response.ok) {
      return { attempt: { rung: 3, method: "redirect_follow_fetch", httpStatus: response.status, bytes: text.length, error: `HTTP ${response.status}` }, content: null, finalUrl: null };
    }
    return { attempt: { rung: 3, method: "redirect_follow_fetch", httpStatus: response.status, bytes: text.length, error: null }, content: htmlToText(text), finalUrl: response.url };
  } catch (error) {
    clearTimeout(timeout);
    const isAbort = error instanceof Error && error.name === "AbortError";
    return {
      attempt: { rung: 3, method: "redirect_follow_fetch", httpStatus: null, bytes: null, error: isAbort ? "timeout" : error instanceof Error ? error.message : "Unknown network error" },
      content: null,
      finalUrl: null,
    };
  }
}

export interface LadderResult {
  attempts: FetchAttempt[];
  content: string | null;
  finalUrl: string | null;
  succeededAtRung: FetchRung | null;
  tavilyFailedResults: TavilyExtractFailure[];
}

/** Runs the ladder to exhaustion or first success, whichever comes first — design doc §7.3:
 * "Only when all applicable rungs fail is the outcome p2_unreadable." Rung 3 is skipped
 * (not "applicable") whenever rung 2 didn't produce a redirect to chase. */
export async function runFetchLadder(url: string): Promise<LadderResult> {
  const attempts: FetchAttempt[] = [];

  const rung1 = await fetchRung1Tavily(url);
  attempts.push(rung1.attempt);
  if (rung1.content) return { attempts, content: rung1.content, finalUrl: rung1.finalUrl, succeededAtRung: 1, tavilyFailedResults: rung1.tavilyFailedResults };

  const rung2 = await withOneTransportRetry(() => fetchRung2BrowserUA(url));
  attempts.push(rung2.attempt);
  if (rung2.content) return { attempts, content: rung2.content, finalUrl: rung2.finalUrl, succeededAtRung: 2, tavilyFailedResults: rung1.tavilyFailedResults };

  if (rung2.finalUrl && rung2.finalUrl !== url) {
    const rung3 = await withOneTransportRetry(() => fetchRung3FollowRedirect(rung2.finalUrl!));
    attempts.push(rung3.attempt);
    if (rung3.content) return { attempts, content: rung3.content, finalUrl: rung3.finalUrl, succeededAtRung: 3, tavilyFailedResults: rung1.tavilyFailedResults };
  }

  return { attempts, content: null, finalUrl: null, succeededAtRung: null, tavilyFailedResults: rung1.tavilyFailedResults };
}
