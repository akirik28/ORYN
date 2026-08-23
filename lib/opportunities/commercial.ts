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
 * charging 5 per competitor — which is plainly not what "pay-to-enroll" means. The exact
 * number is not load-bearing: today's priced, non-selective rows sit at 5 and then jump
 * straight to 350, a 70x gap, so every threshold from 6 to 350 produces an identical result.
 * 100 sits in the middle of that gap and reads as nominal in any currency the corpus holds.
 *
 * Currency-blind by necessity — `opportunities.cost` has no companion currency column (see
 * lib/ai/fee-text.ts). At this magnitude that is tolerable: 5 is nominal and 350 is not, in
 * every currency present. Revisit the moment a currency column exists.
 */
const NOMINAL_FEE_CEILING = 100;

/**
 * True when this opportunity charges a real pre-outcome fee and nothing on file says anything
 * other than money gates entry.
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
export function isPayToEnroll(opportunity: Pick<Opportunity, "cost" | "selectivity_tier">): boolean {
  const cost = opportunity.cost;
  if (cost === null || cost <= NOMINAL_FEE_CEILING) return false;
  return !MATERIALLY_SELECTIVE_TIERS.has(opportunity.selectivity_tier);
}

/** Inverse of {@link isPayToEnroll}, named for the question the counselor actually asks. */
export function competesInCoreRecommendations(
  opportunity: Pick<Opportunity, "cost" | "selectivity_tier">
): boolean {
  return !isPayToEnroll(opportunity);
}
