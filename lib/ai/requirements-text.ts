/**
 * The single place ORYN tells an AI surface how an opportunity is actually entered.
 *
 * `opportunities.application_requirements` is a structured, already-populated array —
 * unlike free-text `description`, it is short, per-item, and exists specifically to hold
 * facts like "requires a team of 4-6 and a teacher advisor" or "team leader must be 16 by
 * a stated date." Until this helper, it reached only the opportunity detail page
 * (app/(app)/opportunities/[id]/page.tsx) and no AI surface ever read it — the advisor and
 * weekly plan could recommend a team competition with 19 days left without knowing the
 * student needs to first recruit 3-5 classmates and a teacher.
 *
 * This is deliberately narrow: it renders `application_requirements`, a bounded array of
 * short structured strings, not the free-text `description` column. Description was
 * considered and rejected for this — it is expensive and unreliable to push into a prompt
 * (lengths and quality vary wildly across the catalogue, including rows whose stored
 * `description` is itself a marketing sentence). This field exists for exactly this purpose
 * and nothing else reads it yet.
 *
 * Same rendering contract as lib/ai/eligibility-text.ts and lib/ai/fee-text.ts: extracted so
 * every AI surface answers "what does entering this actually require?" the same way.
 */
export function formatRequirementsCaveat(applicationRequirements: readonly string[]): string | null {
  if (applicationRequirements.length === 0) return null;
  return `ENTRY REQUIRES: ${applicationRequirements.join("; ")}.`;
}
