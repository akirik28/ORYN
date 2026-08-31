/**
 * Which of the eight media-placeholder tints an item gets (see the `[data-tint]` block in
 * app/globals.css for the colours themselves).
 *
 * Every card without an acquired image used to render the same wash, so a grid of them read
 * as one repeated non-thing instead of a list of distinct items (founder, 2026-08-31). The
 * fix is per-item colour — but it has to be *derived*, not stored and not random:
 *
 * - Not random. `Math.random()` in a component re-rolls on every render and, worse, gives
 *   the server and the client different answers, which React reports as a hydration
 *   mismatch. A card would also change colour as you paged back and forth, which reads as a
 *   bug rather than as identity.
 * - Not stored. A `tint` column would be one more field to backfill, migrate and keep in
 *   sync for something with no meaning outside presentation.
 *
 * A hash of the row's id is stable forever, costs nothing, and needs no schema. The specific
 * function is FNV-1a: tiny, no dependencies, and well-distributed on the short ASCII strings
 * we feed it (UUIDs, slugs, titles) — which matters, because a weak hash on inputs sharing a
 * prefix is exactly how you end up with a page where every card is somehow tint 3.
 */

/** How many tints `[data-tint="N"]` defines in app/globals.css. Keep the two in step. */
export const PLACEHOLDER_TINT_COUNT = 8;

/**
 * Pass the most stable identifier the caller has — a row id for anything persisted. Title is
 * an acceptable fallback for items with no id, with the caveat that a renamed item changes
 * colour.
 *
 * Empty/nullish keys return tint 0 rather than throwing: a missing id is a reason to look
 * ordinary, never a reason for a card not to render.
 */
export function placeholderTint(key: string | null | undefined): number {
  if (!key) return 0;

  // FNV-1a, 32-bit. `Math.imul` keeps the multiply in 32-bit space (a plain `*` would
  // silently exceed Number's exact-integer range and lose the low bits that carry the
  // avalanche); `>>> 0` coerces back to unsigned before the modulo.
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % PLACEHOLDER_TINT_COUNT;
}
