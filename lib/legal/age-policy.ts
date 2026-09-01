/**
 * The minimum age Oryn will let someone register with, and why 14 rather than some
 * other number.
 *
 * This is a product default, not a legal conclusion — engineering picked it, a lawyer
 * has not reviewed it, and it should be treated as provisional. It is recorded here,
 * in one place, specifically so a lawyer's eventual answer is a one-line change instead
 * of a rewrite. See docs/age-gate-design-2026-09-02.md for the full reasoning and
 * docs/research/resit-olmayan-odeme-hukuku-2026-09-02.md (lawyer questions #4, #7, #9)
 * for the underlying research this was argued from.
 *
 * Short version of that argument:
 * - COPPA (US) only reaches "child" strictly under 13 — a flat federal line.
 * - UK GDPR Art. 8(1) currently sets the same line at 13 (movable to 16 by the
 *   Secretary of State without a new Act — not a permanently fixed number).
 * - EU GDPR Art. 8(1) lets each member state pick 13-16; which number applies where
 *   Oryn actually contracts with a consumer was not resolved by that research and
 *   remains open (lawyer question #4).
 * - Turkish KVKK sets no age at all, in the statute or in the two Kurul decisions the
 *   research read directly.
 * - AGENTS.md's own product spec already states the target audience as "14-18" —
 *   this constant enforces that positioning, it doesn't invent a new one.
 *
 * 14 is one year above the one number every regime that has a number agrees on (13),
 * and matches what the product already claims to be for. It is not proven safe against
 * every EU member state's specific choice — nothing short of that per-country research
 * would be — so treat this as the conservative default while that question is still
 * open, not as the answer to it.
 */
export const MINIMUM_SIGNUP_AGE_YEARS = 14;

/**
 * Same year-only approximation as `lib/social/age.ts`'s `isLikelyAdult` — this product
 * never collects a full birth date (a deliberate minimisation choice), so
 * `currentYear - birthYear` can overstate true age by up to ~11 months depending on
 * the birth month this never asks for. That means someone can pass this check up to
 * roughly a year before their real 14th birthday. Accepted deliberately, for the same
 * reason `isLikelyAdult` accepts the equivalent imprecision the other direction: asking
 * for a full date to close an eleven-month gap would undo the minimisation the product
 * spec asks for, for a product-default threshold that isn't the final legal answer
 * either. Revisit together if that changes.
 *
 * Takes a required `birthYear` — every call site here already has one (either an
 * onboarding submission mid-validation, or a value a student just typed into the
 * age-confirmation flow), never a stored `null`. For "is a null value old enough",
 * that's not this question — see `isLikelyAdult`, which is a different check for a
 * different purpose (contact-info visibility, not signup eligibility) and treats
 * unknown as "no" for its own reasons.
 */
export function meetsMinimumSignupAge(birthYear: number, currentYear: number = new Date().getFullYear()): boolean {
  return currentYear - birthYear >= MINIMUM_SIGNUP_AGE_YEARS;
}
