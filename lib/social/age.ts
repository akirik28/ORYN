/**
 * This product only ever collects birth *year* (AGENTS.md's own minor-safe
 * minimization principle — never a full birthdate), so age is necessarily
 * approximate: `currentYear - birthYear` can overstate age by up to ~11 months
 * depending on the actual birth month, which this app never asks for. `null` (never
 * set) is treated as "cannot confirm adulthood" — the safer default wherever this
 * feeds an age-gated decision (e.g. lib/social/contact-visibility.ts's public-phone
 * rule), not a permissive one.
 */
export function isLikelyAdult(birthYear: number | null, currentYear: number = new Date().getFullYear()): boolean {
  if (birthYear === null) return false;
  return currentYear - birthYear >= 18;
}
