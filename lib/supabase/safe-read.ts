/**
 * Central decision: docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md (oryn-a7, 2026-09-03)
 * — a failed read must never produce the same output as "there is no data," but 73 call
 * sites across the product don't get a new `Result<T,E>` type in one pass. That kind of
 * sweeping rewrite is exactly what this same night's rebase incidents warned against: a
 * clean rebase can silently drop whole functions with zero conflicts reported (see
 * lib/scoring/assemble-facts.ts's own header for the live-verified version of that trap),
 * and touching every call site of a shared type at once maximizes the surface for it.
 *
 * Instead: this function slots in wherever `x.data ?? fallback` already stands, unchanged
 * signature at the call site beyond naming what's being read. On success it behaves
 * identically to the code it replaces. On failure it still returns `fallback` -- the
 * caller's shape never changes -- but the failure is no longer silent: logged by category
 * name, the same visibility lib/scoring/assemble-facts.ts already shipped for its own 13
 * reads (found and fixed 2026-09-03, before this helper existed to share). Tier 1 of the
 * decision above (any read that produces a claim to a student -- a score, a
 * recommendation, an eligibility badge, or anything entering AI context) is the first
 * required adopter; tiers 2-3 can ignore this and keep `?? fallback` as-is.
 */
export function readOr<T>(category: string, result: { data: T | null; error?: { message?: string } | null }, fallback: T, context: Record<string, unknown> = {}): T {
  if (result.error) {
    console.error(`[data-read] ${category}: read failed, returning the fallback -- this is NOT confirmed absence, a claim built from it must not present the fallback as a verified answer`, {
      ...context,
      error: result.error.message,
    });
  }
  return result.data ?? fallback;
}

/**
 * Same contract as readOr, for a `{ count: "exact", head: true }` query instead of a
 * `.data` one (lib/counselor/state.ts's skillCount/featuredCount completeness signals are
 * the first consumer -- both currently `x.count ?? 0`, indistinguishable between "confirmed
 * zero rows" and "the count query itself failed"). A separate function rather than widening
 * readOr's own signature to a union: the two query shapes return genuinely different
 * fields (`count`, not `data`), and a caller reading either should see one obvious function
 * per shape rather than guess which branch of a wider type applies to their result.
 */
export function countOr(category: string, result: { count: number | null; error?: { message?: string } | null }, fallback: number, context: Record<string, unknown> = {}): number {
  if (result.error) {
    console.error(`[data-read] ${category}: count read failed, returning the fallback -- this is NOT a confirmed zero`, {
      ...context,
      error: result.error.message,
    });
  }
  return result.count ?? fallback;
}
