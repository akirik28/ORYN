/**
 * Search-only text normalization for the Canonical Entity Autocomplete System. Never
 * used to produce a stored or displayed name -- only to compare a typed query against a
 * canonical name/alias.
 *
 * Pipeline, in order:
 *   1. Dotless Turkish "i-without-dot" -> "i" -- the one case-fold Unicode's generic
 *      algorithm doesn't do on its own. Must run before NFKD, since it has no
 *      decomposition for NFKD to act on.
 *   2. Unicode NFKD -- decomposes every other accented Latin letter this product's
 *      alphabets use (U-umlaut, O-umlaut, C-cedilla, S-cedilla, G-breve, and dotted
 *      Turkish capital I) into a base letter plus a combining mark. This also handles
 *      the dotted capital I correctly for free: its own canonical decomposition is
 *      "I" + combining-dot-above, which the next step strips, leaving plain "I" for
 *      step 4 to lowercase -- no special-case needed for it.
 *   3. Strip combining diacritical marks (Unicode block U+0300-U+036F) left over from
 *      step 2.
 *   4. Lowercase (locale-independent -- deliberately not toLocaleLowerCase("tr"), which
 *      would map "I" to dotless "i" and defeat step 1's own mapping).
 *   5. Punctuation/symbols -> single space, collapse whitespace, trim.
 */
export function normalizeEntitySearchText(input: string): string {
  return input
    .replace(/\u0131/g, "i") // Turkish dotless small i (u+0131) -> plain i
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Splits an already-normalized string into its whitespace-separated tokens. */
export function tokenizeNormalized(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(" ");
}
