import type { Opportunity } from "@/types/database";

/**
 * Pay-to-enroll gate: a programme whose main entry qualification is the ability to pay must
 * not compete for a slot in Oryn's core recommendations.
 *
 * Founder ruling (2026-08-24): commercial / pay-to-enroll opportunities may remain in Browse,
 * but should not compete in core top recommendations unless materially selective admissions
 * are P1-supported. Browse is deliberately untouched by this module — the catalogue stays
 * complete and a student who searches for one of these still finds it, with its price on the
 * card. What changes is that Oryn stops *proposing* them.
 */

/** Tiers that count as materially selective, i.e. something other than money decides entry.
 * `competitive_award` is included: an award selects on merit by definition. `open_enrollment`
 * and `unknown` are not — and `unknown` deliberately does not get the benefit of the doubt,
 * because "nobody has classified this yet" is not evidence of selectivity. That asymmetry is
 * the whole point of the gate. */
const MATERIALLY_SELECTIVE_TIERS = new Set<Opportunity["selectivity_tier"]>([
  "extremely_selective",
  "highly_selective",
  "selective",
  "competitive_award",
]);

/**
 * Fees at or below this are entry fees, not enrolment fees, and do not trigger the gate.
 *
 * Without it the rule would demote CMIMC — a real Carnegie Mellon mathematics competition
 * charging 5 per competitor — which is plainly not what "pay-to-enroll" means.
 *
 * When this was written the number was not load-bearing: priced, non-selective rows sat at 5
 * and then jumped straight to 350, so every threshold from 6 to 350 partitioned the corpus
 * identically, and 100 was simply the middle of that gap. **That justification expires as the
 * gap fills.** It was empty because prices were missing, not because nothing is priced there,
 * and a price-backfill pass is closing it — the first arrival is UT Austin WiSTEM at 200/350, a
 * public university's high-school access camp, which this constant would demote on exactly the
 * same terms as a 12,000 commercial residential. Whether that is right is a product judgment
 * the founder has to make; it is not a judgment this constant should keep making silently by
 * inheriting a rationale that no longer holds. Re-read the threshold against the real
 * distribution once the backfill lands.
 *
 * Currency-blind by necessity — `opportunities.cost` has no companion currency column (see
 * lib/ai/fee-text.ts). At this magnitude that is tolerable: 5 is nominal and 350 is not, in
 * every currency present. Revisit the moment a currency column exists.
 */
const NOMINAL_FEE_CEILING = 100;

/**
 * The three-way judgment {@link isPayToEnroll} used to collapse to a bare boolean, losing the
 * distinction between "checked, and it isn't pay-to-enroll" and "couldn't check at all"
 * (fixed 2026-09-03, oryn-a7's opportunity-cost-coverage dispatch — same shape as
 * eligibilityMessages.countryEligibilityUnverified in lib/opportunities/matching.ts: a gate
 * that stays permissive on missing data, but says so, rather than looking identical to a
 * genuine pass). `cost === null` is 65% of active opportunities
 * (docs/opportunity-cost-coverage-2026-09-03.md) — treating that as silently "not
 * pay-to-enroll" the same way this file already (correctly) treats a real free programme
 * meant a caller had no way to tell the two apart.
 */
export type PayToEnrollJudgment = "pay_to_enroll" | "not_pay_to_enroll" | "cost_unverified";

/**
 * `cost_unverified` whenever `cost` is null — checked first, before the fee-ceiling/
 * selectivity logic even runs, since there is nothing to compare a null against. Everything
 * below this line is unchanged from before the three-state split: same ceiling, same
 * selectivity exemption, same "unknown selectivity gets no benefit of the doubt" asymmetry.
 *
 * Known limitation, deliberately not papered over: the exemption trusts `selectivity_tier`
 * alone, because the evidence behind it is **not stored**. lib/opportunities/ingest.ts:187
 * requires `selectivity_evidence` before it will accept a tier above `open_enrollment`, but
 * validates it and discards it — there is no `selectivity_evidence` column. So for a row that
 * came through `ingest.ts` the tier is evidence-backed by construction, and for a row written
 * by any other path it is an unverified assertion. That means the founder's "P1-supported"
 * condition is enforced at write time for one pipeline and not checkable at read time at all.
 * Storing the evidence is the fix; until then this gate is sound in the direction that matters
 * (it never demotes something for lacking a fee) and permissive in the other.
 */
export function judgePayToEnroll(opportunity: Pick<Opportunity, "cost" | "selectivity_tier">): PayToEnrollJudgment {
  const cost = opportunity.cost;
  if (cost === null) return "cost_unverified";
  if (cost <= NOMINAL_FEE_CEILING) return "not_pay_to_enroll";
  return MATERIALLY_SELECTIVE_TIERS.has(opportunity.selectivity_tier) ? "not_pay_to_enroll" : "pay_to_enroll";
}

/**
 * True when this opportunity charges a real pre-outcome fee and nothing on file says anything
 * other than money gates entry. Unchanged behavior from before judgePayToEnroll existed —
 * `cost_unverified` maps to `false` here exactly as a bare null already did, so this and
 * {@link competesInCoreRecommendations} keep deciding exactly what they decided before this
 * fix: excluding null-cost records from core recommendations would drop half the catalogue
 * (docs/opportunity-cost-coverage-2026-09-03.md) and trade a disclosure bug for a discovery
 * one, the same call already made for missing age. Use {@link judgePayToEnroll} directly
 * where the distinction matters; this stays the simple predicate for the one caller that
 * only ever needed a boolean.
 */
export function isPayToEnroll(opportunity: Pick<Opportunity, "cost" | "selectivity_tier">): boolean {
  return judgePayToEnroll(opportunity) === "pay_to_enroll";
}

/** Inverse of {@link isPayToEnroll}, named for the question the counselor actually asks. */
export function competesInCoreRecommendations(
  opportunity: Pick<Opportunity, "cost" | "selectivity_tier">
): boolean {
  return !isPayToEnroll(opportunity);
}
