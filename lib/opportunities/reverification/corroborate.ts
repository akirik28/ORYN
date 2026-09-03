import "server-only";

import { z } from "zod";
import { fetchProviderJson } from "@/lib/providers/fetch-json";
import type { TavilyExtractFailure } from "@/lib/providers/tavily";

/**
 * Design doc §7.3's corroboration rule: exhausting our own fetch ladder (./fetch-ladder.ts)
 * is necessary but not sufficient to call a source `p2_unreadable`, because every rung
 * shares our network egress, our IP reputation and our TLS stack — a bot filter blocking
 * "us" specifically is indistinguishable, from our own vantage point alone, from a page that
 * is genuinely gone. §7.3 requires evidence a fetcher we do NOT control also failed.
 *
 * This is the direct answer to the concern raised before this job was built (6e's manual
 * verification passes, perimeterinstitute.ca 403ing two independent ways): a job that
 * treats "couldn't fetch, from here, right now" as "unreadable, forever" would slowly mark a
 * growing share of a real catalogue unverifiable. Corroboration is what stops that — and
 * critically, per §7.2a, corroborating a P2 does NOT unlock anything; a corroborated
 * `p2_unreadable` still never writes `opportunities.source_verified_at`, still never demotes,
 * still just means "we tried, and a second observer agrees it's currently unreadable." The
 * one thing corroboration DOES change in this implementation is catching the *opposite*
 * mistake: if the Internet Archive has a recent, successfully-captured snapshot, that is
 * direct proof the page IS machine-readable by someone — treated as a transport failure
 * worth retrying (§6.3's backoff), never finalized as p2_unreadable at all.
 */

const WaybackSnapshotSchema = z.object({
  status: z.string().optional(),
  available: z.boolean().optional(),
  timestamp: z.string().optional(),
});
const WaybackAvailabilityResponseSchema = z.object({
  archived_snapshots: z.object({ closest: WaybackSnapshotSchema.optional() }).optional(),
});

export type WaybackSignal = "corroborates_unreadable" | "falsifies_unreadable" | "inconclusive";

/**
 * The Wayback Machine's free, keyless Availability API — no account, no rate-limit
 * documentation to violate, purpose-built for exactly this "does an archive exist and is it
 * healthy" question (as opposed to fetching a full archived page, which this does not need).
 * A response with an empty `archived_snapshots` object (no `closest` key at all) means IA
 * has never successfully captured this URL — itself a real, if weaker, signal, folded into
 * `corroborates_unreadable` alongside an explicit `available: false`.
 */
export async function checkWaybackAvailability(url: string): Promise<WaybackSignal> {
  const result = await fetchProviderJson(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`, { method: "GET" }, { provider: "internet_archive", timeoutMs: 10000 });
  if (!result.success) return "inconclusive";

  const parsed = WaybackAvailabilityResponseSchema.safeParse(result.data);
  if (!parsed.success) return "inconclusive";

  const closest = parsed.data.archived_snapshots?.closest;
  if (!closest || closest.available !== true) return "corroborates_unreadable";

  // A capture exists. Its own recorded status matters: IA can archive a 404/500 just as
  // faithfully as a 200, and archiving an error page is not evidence the real page is
  // readable now. Only a successful (2xx) or redirect (3xx, which IA already followed to
  // capture) status falsifies our own unreadable finding.
  const statusCode = closest.status ? Number(closest.status) : null;
  if (statusCode !== null && statusCode >= 200 && statusCode < 400) return "falsifies_unreadable";
  return "corroborates_unreadable";
}

/** Design doc §7.3's second signal: "Tavily's failed_results reports the same status for the
 * URL" — independent commercial infrastructure, already in the codebase (lib/providers/
 * tavily.ts's TavilyExtractResponse.failedResults, fixed to actually surface this alongside
 * this package). */
export function tavilyCorroborates(url: string, tavilyFailedResults: TavilyExtractFailure[]): boolean {
  return tavilyFailedResults.some((failure) => failure.url === url);
}

export interface CorroborationResult {
  /** True when at least one independent fetcher also failed, and neither falsified the
   * finding — safe to record `p2_unreadable`. */
  corroborated: boolean;
  /** True when the Internet Archive has direct evidence the page IS readable — the run
   * should NOT record p2_unreadable; treat this attempt as a transport failure and let the
   * normal backoff (§6.3) retry it instead. */
  falsified: boolean;
  waybackSignal: WaybackSignal;
  tavilyCorroborated: boolean;
}

/**
 * The combined corroboration check for one URL our own ladder (./fetch-ladder.ts) already
 * exhausted. Wayback's signal takes precedence when it falsifies — direct evidence beats an
 * absence of evidence from Tavily. When Wayback is inconclusive (unavailable, or no capture
 * either way to judge), Tavily's own failed_results is the fallback signal — design doc
 * assumption A11: "if coverage is thin, P2 degrades to 'ladder exhausted, uncorroborated' —
 * a distinct, weaker outcome, never a silent P1." This implementation folds that weaker case
 * into `corroborated: false` rather than a third caller-visible state: §7.2a's rule that P2
 * never writes source_verified_at holds regardless of corroboration strength, so the only
 * place "uncorroborated" needs to read differently from "corroborated" is in what a human
 * reviewing the queue sees — carried in the run record's own fetch_attempts/error fields by
 * the caller, not by this function returning a third boolean nobody downstream would act on
 * differently.
 */
export async function corroborateUnreadable(url: string, tavilyFailedResults: TavilyExtractFailure[]): Promise<CorroborationResult> {
  const waybackSignal = await checkWaybackAvailability(url);
  const tavilyCorroborated = tavilyCorroborates(url, tavilyFailedResults);

  if (waybackSignal === "falsifies_unreadable") {
    return { corroborated: false, falsified: true, waybackSignal, tavilyCorroborated };
  }

  const corroborated = tavilyCorroborated || waybackSignal === "corroborates_unreadable";
  return { corroborated, falsified: false, waybackSignal, tavilyCorroborated };
}
