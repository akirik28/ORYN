/**
 * The single place ORYN tells an AI surface that an opportunity costs money.
 *
 * The product rule this implements already existed and had no code behind it: a programme
 * charging a fee *before* any outcome must have that fee stated before Oryn recommends it
 * with confidence. Until this helper, `cost` reached no recommendation surface at all —
 * neither lib/ai/opportunity-context.ts, nor lib/ai/weekly-plan.ts, nor anything under
 * lib/counselor. The advisor could tell a 16-year-old to apply to a programme with a
 * four-figure fee on file while having no idea a fee existed. Extracted as a shared helper
 * for the same reason as lib/ai/eligibility-text.ts: two AI surfaces must not answer "what
 * does this cost?" differently.
 *
 * Deliberately silent on currency. `opportunities.cost` is a bare numeric with no companion
 * currency column — unlike `university_statistics.cost_of_attendance`, which has
 * `cost_currency` beside it — so the number genuinely does not carry a unit. Naming a
 * currency here would manufacture a fact the database does not hold, which is the same
 * failure already found in the student-facing renderer, where `formatCurrency` defaults to
 * USD and prints a British programme's £365 as "$365". The magnitude is still worth passing
 * through: "this is not free, and it is roughly this big" is the decision-relevant part, and
 * it is true regardless of unit.
 *
 * Only a positive cost produces a line. A zero says "free on file", and a null says nothing
 * is recorded — neither is a fee, and asserting "this one is free" from an unverified zero
 * would invent a reassurance in the direction that hurts. Silence keeps this helper strictly
 * additive: it can only ever warn, never advertise.
 *
 * Pure and provider-agnostic — no "server-only" tag, for the same reason as
 * lib/ai/eligibility-text.ts: it touches no secret, no network, and no database.
 */
export function formatFeeCaveat(costOnFile: number | null): string | null {
  if (costOnFile === null || costOnFile <= 0) return null;
  return `HAS A FEE: ${costOnFile} on file — Oryn does not record which currency, so treat the amount as unconfirmed and point the student to the official page for the real price.`;
}
