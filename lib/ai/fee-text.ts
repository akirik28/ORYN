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
 * Three states, not two (fixed 2026-09-03, oryn-a7's opportunity-cost-coverage dispatch): a
 * zero says "free on file" and stays silent — an unverified zero must not become a promise
 * that it is free, but a *confirmed* zero genuinely has nothing to warn about, so silence is
 * still the honest output there. A positive number produces the fee line, unchanged. A null
 * used to be silent too — the exact bug this fix closes: null and zero rendered identically,
 * so the model was told "nothing to warn about" for a programme nobody has ever priced,
 * exactly as confidently as for one confirmed free. 65% of active opportunities carry a null
 * cost (docs/opportunity-cost-coverage-2026-09-03.md), so this was not an edge case — it was
 * the majority behavior. Unknown now gets its own line, distinct from both: not a fee
 * (nothing to point at), and not a clearance either.
 *
 * Pure and provider-agnostic — no "server-only" tag, for the same reason as
 * lib/ai/eligibility-text.ts: it touches no secret, no network, and no database.
 */
export function formatFeeCaveat(costOnFile: number | null): string | null {
  if (costOnFile === null) {
    return "COST NOT ON FILE: Oryn has not recorded a fee for this — do not assume it is free. If cost matters to the student, say the amount is unconfirmed and point them to the official page.";
  }
  if (costOnFile <= 0) return null;
  return `HAS A FEE: ${costOnFile} on file — Oryn does not record which currency, so treat the amount as unconfirmed and point the student to the official page for the real price.`;
}
