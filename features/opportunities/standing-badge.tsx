import { StatusBadge } from "@/components/oryn/status-badge";
import { NEEDS_VERIFICATION_LABEL } from "@/lib/opportunities/lifecycle";

/**
 * The one badge that answers "why isn't this presented as a confident match?", shared by
 * Browse's card (features/opportunities/opportunity-card.tsx) and the opportunity detail page.
 *
 * Both surfaces previously open-coded this, already with drifting strings ("Not eligible" vs
 * "Not eligible for you"). Duplicated wording for one shared rule is the same failure mode
 * #140 and #141 had to fix in the rule itself, so it lives in one component here and takes its
 * copy from lib/opportunities/lifecycle.ts.
 *
 * Three states that must never be conflated, in strict precedence order:
 *
 *   notActionable      -> a fact about the OPPORTUNITY. Its cycle is closed or its deadline has
 *                         passed. True of everyone. "Not open right now" — never "Not eligible",
 *                         which would tell a 16-year-old they don't qualify for something
 *                         nobody can currently apply to.
 *   !eligible          -> a fact about the STUDENT. A real structured mismatch (country,
 *                         citizenship, grade, age). "Not eligible for you".
 *   needsVerification  -> a fact about ORYN'S DATA. No deadline on file and no record of ever
 *                         verifying it, so we cannot vouch for it either way. "Needs
 *                         verification" — deliberately not "Closed" (nothing told us it closed)
 *                         and not "Not eligible" (the student is not the problem).
 *
 * A real exclusion outranks the caveat: showing "Not open right now" and "Needs verification"
 * together would read as two unrelated problems with one row, when the first already says
 * everything actionable.
 */
export function OpportunityStandingBadge({
  eligible,
  notActionable,
  needsVerification,
  ineligibleLabel = "Not eligible for you",
}: {
  eligible: boolean;
  notActionable: boolean;
  needsVerification: boolean;
  /** Only the wording for the per-student case is caller-adjustable; the other two are the
   * product's answer to a question about the opportunity and must read identically everywhere. */
  ineligibleLabel?: string;
}) {
  if (!eligible) {
    return <StatusBadge label={notActionable ? "Not open right now" : ineligibleLabel} tone="neutral" />;
  }
  if (needsVerification) {
    return <StatusBadge label={NEEDS_VERIFICATION_LABEL} tone="warning" />;
  }
  return null;
}
