import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { readOr } from "@/lib/supabase/safe-read";
import { getUpcomingDeadlines, type UpcomingDeadline } from "@/lib/deadlines/upcoming";

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
 * counts as new," not as a zero-width or error window. Capped at OPPORTUNITY_MATCH_LIMIT
 * newest-first — this is a periodic summary, not an exhaustive match list (the student's own
 * Opportunities page already is that).
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
    .limit(OPPORTUNITY_MATCH_LIMIT);
  if (since) query = query.gt("calculated_at", since);

  const matchesRes = await query;
  const matches = readOr("digest.opportunityMatches", matchesRes, [], { userId });
  if (matches.length === 0) return [];

  const opportunityIds = [...new Set(matches.map((m) => m.opportunity_id))];
  const opportunitiesRes = await supabase.from("opportunities").select("id, title, organization, official_url, application_url").in("id", opportunityIds);
  const opportunities = readOr("digest.opportunityMatches.opportunities", opportunitiesRes, [], { userId });
  const byId = new Map(opportunities.map((o) => [o.id, o]));

  // Order preserved from the match query (newest first), not the join result's own order.
  return matches
    .map((m) => byId.get(m.opportunity_id))
    .filter((o): o is NonNullable<typeof o> => o !== undefined)
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
