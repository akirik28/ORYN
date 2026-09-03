import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { readOr } from "@/lib/supabase/safe-read";
import { getUpcomingDeadlines, type UpcomingDeadline } from "@/lib/deadlines/upcoming";
import { isOpportunityRecommendable } from "@/lib/opportunities/lifecycle";
import { competesInCoreRecommendations } from "@/lib/opportunities/commercial";

/**
 * Content assembly for the periodic email digest — see docs/digest-email-design-2026-09-03.md
 * for the classification/tier/frequency decisions this builds. Same shape and logic for every
 * plan tier by design (§2 of that doc) — this file reads no `plan_tier` at all, deliberately.
 *
 * No email-sending call anywhere in this file, and none belongs here — this is a pure content
 * assembler, reused identically whether the eventual delivery mechanism is a real email
 * provider, an in-app preview, or a test fixture. See lib/digest/run.ts for the batch runner
 * that calls this per student, and its own header for why nothing downstream sends anything.
 */

const OPPORTUNITY_MATCH_LIMIT = 5;
/**
 * Same reasoning and value as app/(app)/dashboard/page.tsx's OPPORTUNITY_PREVIEW_CANDIDATE_POOL:
 * fetch a wider pool before the lifecycle/commercial gate runs, not the final display count.
 * Filtering after `.limit(OPPORTUNITY_MATCH_LIMIT)` would apply the gate to whichever 5 rows
 * happened to be newest, which can yield fewer than 5 (or zero) even when 5 good candidates
 * exist further down the list — measured live (CEO, 2026-09-03): 21.1% of eligible match rows
 * fail the gate, so filtering-then-limiting is the only order that reliably fills the digest.
 */
const OPPORTUNITY_MATCH_CANDIDATE_POOL = 20;
const DEADLINE_LIMIT = 5;

export interface DigestDeadlineItem {
  title: string;
  date: string;
  href: string;
}

export interface DigestOpportunityMatchItem {
  title: string;
  organization: string | null;
  href: string | null;
}

export interface DigestContent {
  deadlines: DigestDeadlineItem[];
  newMatches: DigestOpportunityMatchItem[];
}

/**
 * `since`: the student's `profiles.last_digest_sent_at` — null (every real account today,
 * since nothing arms the job yet) is read as "no prior digest, everything currently eligible
 * counts as new," not as a zero-width or error window. Capped at OPPORTUNITY_MATCH_LIMIT after
 * the gate below runs, not before — this is a periodic summary, not an exhaustive match list
 * (the student's own Opportunities page already is that).
 *
 * Two gates applied, both a defense-in-depth re-check of state that can go stale between
 * refreshOpportunityMatches runs — see lib/opportunities/lifecycle.ts's own header ("Disabling
 * a record has to actually remove it, or moderation is decoration") and
 * app/(app)/dashboard/page.tsx's identical shape, which this mirrors:
 *
 * - `isOpportunityRecommendable` (lifecycle.ts): this file had NEITHER half of the gate before
 *   this fix — no status/cycle_status/deadline check and no verification check at all, unlike
 *   every other opportunity_matches reader (dashboard, Counselor Core). Measured live
 *   (CEO, 2026-09-03): 382 of 1,809 eligible match rows (21.1%) point at an opportunity that
 *   fails this gate — closed cycle, past deadline, or no-longer-active — across all 8
 *   onboarded accounts, meaning roughly one digest slot in five was a dead record with no
 *   caveat the student could see before clicking a passed deadline.
 * - `competesInCoreRecommendations` (commercial.ts): applied here — this is a push surface
 *   (arrives unprompted, framed as "new matches for you"), at least as assertive as the
 *   homepage card dashboard already excludes pay-to-enroll programmes from. Unlike Counselor
 *   Core's state assembler (lib/counselor/state.ts, deliberately NOT gated on this — a
 *   pay-to-enroll programme the student already asked about is legitimate for the advisor to
 *   reason about, it just shouldn't be proposed unprompted), a digest email has no "the
 *   student asked" context at all; every item in it is Oryn proposing.
 */
async function loadNewOpportunityMatches(
  supabase: SupabaseClient<Database>,
  userId: string,
  since: string | null
): Promise<DigestOpportunityMatchItem[]> {
  let query = supabase
    .from("opportunity_matches")
    .select("opportunity_id, calculated_at")
    .eq("user_id", userId)
    .eq("eligible", true)
    .order("calculated_at", { ascending: false })
    .limit(OPPORTUNITY_MATCH_CANDIDATE_POOL);
  if (since) query = query.gt("calculated_at", since);

  const matchesRes = await query;
  const matches = readOr("digest.opportunityMatches", matchesRes, [], { userId });
  if (matches.length === 0) return [];

  const opportunityIds = [...new Set(matches.map((m) => m.opportunity_id))];
  const opportunitiesRes = await supabase
    .from("opportunities")
    .select("id, title, organization, official_url, application_url, status, cycle_status, deadline, last_verified_at, verified_at, source_verified_at, cost, selectivity_tier")
    .in("id", opportunityIds);
  const opportunities = readOr("digest.opportunityMatches.opportunities", opportunitiesRes, [], { userId });
  const byId = new Map(
    opportunities.filter((o) => isOpportunityRecommendable(o) && competesInCoreRecommendations(o)).map((o) => [o.id, o])
  );

  // Order preserved from the match query (newest first), not the join result's own order.
  // Sliced to the real display limit only after the gate above has already removed the dead
  // records — filtering a pre-truncated top-5 would silently under-fill the digest instead.
  return matches
    .map((m) => byId.get(m.opportunity_id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined)
    .slice(0, OPPORTUNITY_MATCH_LIMIT)
    .map((o) => ({ title: o.title, organization: o.organization, href: o.official_url ?? o.application_url }));
}

/**
 * Returns `null` when there is nothing worth sending — zero deadlines and zero new matches.
 * An empty digest is worse than no digest; the batch runner (lib/digest/run.ts) treats a null
 * return as "skip this student this cycle," not as an error.
 */
export async function buildDigestContent(supabase: SupabaseClient<Database>, userId: string, lastDigestSentAt: string | null): Promise<DigestContent | null> {
  const [deadlines, newMatches] = await Promise.all([
    getUpcomingDeadlines(supabase, userId, DEADLINE_LIMIT),
    loadNewOpportunityMatches(supabase, userId, lastDigestSentAt),
  ]);

  if (deadlines.length === 0 && newMatches.length === 0) return null;

  return {
    deadlines: deadlines.map((d: UpcomingDeadline) => ({ title: d.title, date: d.date, href: d.href })),
    newMatches,
  };
}
