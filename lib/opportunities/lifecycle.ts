import type { Opportunity } from "@/types/database";

/**
 * `cycle_status` already carries the truth about whether an opportunity's current cycle is
 * actually open — see its own column comment in types/database.ts: "deliberately separate
 * from `status` (an admin/moderation flag). A 'closed' opportunity here still exists and is
 * worth showing; it just isn't accepting applications right now." What was missing was
 * anything actually reading it that way: a live verification pass (2026-08-22,
 * docs/research/verification/opportunities-verification-2026-08-22.md) found 61 `active`
 * rows already correctly labeled `closed`/`historical` by research, surfacing in
 * `opportunity_matches` and every recommendation/dashboard surface as if they were open,
 * because nothing filtered on this field.
 *
 * Mirrors `NON_ACTIONABLE_VERIFICATION_STATES` (lib/deadlines/ingest.ts) deliberately: a
 * cycle_status in this set describes a real, correctly-sourced fact about a programme that
 * will very likely run again — not a bad record. `status` stays `active`, `disabled` still
 * means "we chose to hide this," `under_review` still means "not yet vetted." A closed-cycle
 * opportunity remains directly reachable by id (the detail page never filtered on status or
 * cycle_status) and in Browse (which already has a `cycleStatus` filter a student can pick) —
 * only matches, recommendations, and anything urgency-shaped must exclude it.
 */
export const NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES = new Set<Opportunity["cycle_status"]>([
  "closed",
  "historical",
  "discontinued",
]);

/**
 * Read-time gate, defense in depth: even if `cycle_status` hasn't been (re)computed yet for
 * a row — or a stale `opportunity_matches` row was upserted before this cycle closed and
 * never deleted — a deadline that has already passed with no newer one on file is on its own
 * enough to exclude an opportunity from matches/recommendations/urgency surfaces. This is
 * the "demotes active when its deadline has passed" rule, expressed as a read-time check
 * rather than a write that mutates `status`: it self-heals the moment ingestion refreshes
 * `deadline` to a genuine next-cycle date, with no separate "reactivate" step needed.
 *
 * What this function cannot do: an opportunity can be closed with a *null* deadline. Confirmed
 * live: Stanford Anesthesia Summer Institute is `active`, `cycle_status='upcoming'`,
 * `deadline` null, while its own page says all three 2026 tracks are "APPLICATIONS NOW
 * CLOSED." No date-only rule can catch that — it requires either a researcher reading the
 * source page, or a scheduled re-verification job that re-fetches `source_url` and checks for
 * closure language (AGENTS.md Phase 30's "Job B: Upcoming deadline validation" / "Job E: Stale
 * data detection" describe exactly this; neither is built yet). The same live pass found 100
 * `active` rows with a null deadline and `cycle_status='unverified'` — genuinely undetectable
 * from stored data alone, not a gap this function can close.
 */
export function isOpportunityActionable(
  opportunity: Pick<Opportunity, "cycle_status" | "deadline">,
  referenceDate: Date = new Date()
): boolean {
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return false;
  }
  if (opportunity.deadline) {
    const deadlineEnd = new Date(`${opportunity.deadline}T23:59:59`);
    if (deadlineEnd.getTime() < referenceDate.getTime()) {
      return false;
    }
  }
  return true;
}

/**
 * Write-time derivation for a backfill/maintenance pass (scripts/derive-opportunity-cycle-
 * status.ts) — never called from a request path. Returns the `cycle_status` a row should have
 * once its deadline has passed with no newer one on file, or `null` when no change is
 * warranted (already correctly labeled non-actionable, or there's no deadline to reason from).
 * Never invents `historical`/`discontinued` — those are judgment calls for a human researcher
 * (how long closed, whether the programme still runs at all), not something a passed date
 * alone can support. A live measurement (2026-08-22) found zero rows today where this would
 * actually change anything — every already-past deadline already carries a correct
 * `closed`/`historical` cycle_status — so this exists for the gap this creates going forward
 * as today's deadlines pass, not to fix anything currently live.
 */
export function deriveCycleStatusForPassedDeadline(
  opportunity: Pick<Opportunity, "cycle_status" | "deadline">,
  referenceDate: Date = new Date()
): Opportunity["cycle_status"] | null {
  if (!opportunity.deadline) return null;
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) return null;

  const deadlineEnd = new Date(`${opportunity.deadline}T23:59:59`);
  if (deadlineEnd.getTime() < referenceDate.getTime()) {
    return "closed";
  }
  return null;
}

/**
 * Shared filter for every matching/recommendation/urgency read path — see the module comment
 * above for why this excludes on cycle_status and deadline but leaves `status` and direct-by-
 * id access untouched. Used by persist-matches.ts (stop computing fresh matches for a closed
 * cycle) and, defensively, by every surface that later joins opportunity_matches back against
 * opportunities (a match row upserted before a cycle closed must not keep reading as live just
 * because nothing has re-run refreshOpportunityMatches since).
 */
export function filterActionableOpportunities<T extends Pick<Opportunity, "cycle_status" | "deadline">>(
  opportunities: T[],
  referenceDate: Date = new Date()
): T[] {
  return opportunities.filter((o) => isOpportunityActionable(o, referenceDate));
}
