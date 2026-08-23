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
 * Why the two ways `isOpportunityActionable` returns false need different wording, and why the
 * split is not cosmetic: a row whose `cycle_status` is still a legitimately-actionable value
 * ("open", "date_not_announced") but whose deadline has quietly passed must never be explained
 * by its cycle status, which would tell the student nothing about why they can't act. Live
 * example (2026-08-23), GENIUS Olympiad: `cycle_status='date_not_announced'` with a deadline
 * five months gone — "next dates not announced" is perfectly true and completely beside the
 * point.
 *
 * One shared implementation on purpose. lib/opportunities/browse.ts and lib/counselor/
 * eligibility.ts each carried a byte-identical private copy of this, and a duplicated
 * lifecycle rule drifting out of sync between those same two files is exactly what #140 had to
 * fix (eligibility.ts kept its own cycle-only `INACTIVE_CYCLE_STATUSES` and never learned the
 * deadline half of the rule).
 */
export function nonActionableOpportunityReason(opportunity: Pick<Opportunity, "cycle_status" | "deadline">): string {
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return `This opportunity's current cycle is ${opportunity.cycle_status.replace(/_/g, " ")}.`;
  }
  return "This opportunity's application deadline has passed.";
}

export interface StoredEligibility {
  eligible: boolean;
  notes: string | null;
}

export interface ResolvedEligibility extends StoredEligibility {
  /**
   * True when `eligible` is false *only* because the opportunity isn't actionable right now.
   * That's a fact about the opportunity's cycle, not about this student, and surfaces need to
   * tell the two apart: rendering a closed cycle as "Not eligible" wrongly informs a student
   * they don't qualify for something nobody can currently apply to.
   */
  notActionable: boolean;
}

/**
 * Re-applies the lifecycle gate to an eligibility verdict that was computed earlier and read
 * back from `opportunity_matches`.
 *
 * A stored match row is a snapshot, and refreshOpportunityMatches deliberately never deletes
 * one when its opportunity later stops being actionable (lib/opportunities/persist-matches.ts
 * documents that choice) — it simply stops computing new ones. So `eligible: true` written
 * before a cycle closed survives indefinitely, and any surface that trusts the column verbatim
 * presents a closed or past-deadline opportunity as a live match. Verified live 2026-08-23: 74
 * distinct opportunities across 259 (student, opportunity) pairs carried exactly that stale
 * flag.
 *
 * Read-time by design, matching this module's whole approach: nothing is written or backfilled,
 * and the gate stops firing on its own the moment ingestion refreshes `deadline` to a genuine
 * next-cycle date. Note this only ever *removes* an eligibility claim — an actionable
 * opportunity's stored verdict, in either direction, is passed through untouched, so a real
 * per-student mismatch is never overwritten with a cheerier answer.
 */
export function resolveStoredEligibility(
  opportunity: Pick<Opportunity, "cycle_status" | "deadline">,
  stored: StoredEligibility,
  referenceDate: Date = new Date()
): ResolvedEligibility {
  if (isOpportunityActionable(opportunity, referenceDate)) {
    return { ...stored, notActionable: false };
  }
  return { eligible: false, notes: nonActionableOpportunityReason(opportunity), notActionable: true };
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
