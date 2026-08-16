import type { ContactVisibility } from "@/types/database";

/**
 * Every contact_info field (and open_to_visibility) is gated by this one predicate.
 * Deliberately simpler than the messaging/portfolio relationship model: per the product
 * spec, pending/disconnected/blocked all collapse to the same "public only" tier as a
 * genuine stranger — there is no intermediate tier. Enforced here (pure, tested) and
 * wired into lib/social/contact-info.ts's server-only fetch, not left to the UI to hide
 * fields it still technically returned.
 */
export function canViewContactField(visibility: ContactVisibility, isSelf: boolean, hasAcceptedConnection: boolean): boolean {
  if (isSelf) return true;
  if (visibility === "public") return true;
  if (visibility === "connections") return hasAcceptedConnection;
  return false; // private
}

/**
 * Minor-safe phone rule: under 18, `public` is not an offerable choice at all — private
 * and connections remain available. Age is always computed server-side from
 * `profiles.birth_year` (a trusted, self-entered-at-onboarding field this app already
 * treats as authoritative elsewhere, e.g. lib/scoring), never from a client-supplied
 * flag — see lib/social/age.ts. `birthYear: null` (never set) is treated as "can't
 * confirm adulthood" and denied `public`, the safer default, not a permissive one.
 */
export function isPhoneVisibilityAllowed(visibility: ContactVisibility, isAdult: boolean): boolean {
  if (visibility !== "public") return true;
  return isAdult;
}
