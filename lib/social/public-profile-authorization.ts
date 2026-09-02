import type { ConnectionStatus } from "@/types/database";

/**
 * Pure authorization rules for /u/[id] (app/(app)/u/[id]/page.tsx) — the single highest-
 * consequence privacy surface in this app (migration 0024 fixed a real leak here once
 * already). Two different roles, not a parallel model of the same thing:
 *
 *   - canViewPortfolio / canShowMessageButton are real code paths this module is wired
 *     into, mirroring exactly what lib/social/public-profile.ts and the page itself
 *     evaluate at runtime.
 *   - canViewBasicProfile has no live caller anywhere in app/ or features/ (checked
 *     2026-09-02) — it exists purely to document the public_profiles VIEW's own WHERE
 *     clause for readability and as a regression signal if the two ever drift, since a
 *     Postgres view can't be unit-tested without a live database. Treat this one as
 *     "what the view is supposed to do," not "what guarantees it" — and treat "no live
 *     caller" as a reason to check it against the real view occasionally, not a reason
 *     to trust it by default: it was found describing migration 0023's pre-fix behavior
 *     rather than migration 0024's, for however long between those two migrations and
 *     this correction. See canViewBasicProfile's own comment for what was wrong and how
 *     it was verified.
 *
 * Blocking a user is deliberately NOT an input to either gate: blocked_users only ever
 * gates messaging (is_blocked_between, checked in sendMessage) — a public profile stays
 * exactly as visible to a blocked party as to anyone else. That's the actual, intended
 * behavior (this app's block feature scopes to messaging, not content visibility), not a
 * gap this module is failing to check.
 */

export interface BasicProfileVisibilityInput {
  isSelf: boolean;
  /** The target's current profiles.is_public flag. */
  isPublic: boolean;
  /** True if an ACCEPTED connection exists between viewer and target, in either
   * direction — migration 0024's first carve-out clause. */
  hasAcceptedConnection: boolean;
  /** True only if the TARGET sent the VIEWER a still-pending request (viewer is the
   * recipient) — migration 0024's second carve-out clause, and deliberately one-
   * directional. The reverse (viewer sent target a pending request) does NOT grant
   * visibility: that direction is exactly the privacy leak migration 0024 fixed — a
   * requester using their own outgoing (or a stale, since-gone-private) request to see
   * a recipient who never consented to anything. A DECLINED request also does not
   * qualify, in either direction; the row still exists (connections_unique_pair), but
   * the view stops matching it the moment status leaves 'pending'/'accepted'. False
   * once a connection is removed (hard-deleted on disconnect) either way — there is no
   * "history-only" carve-out for profile visibility the way there is for message
   * history; the two systems are intentionally independent. */
  hasPendingRequestFromTarget: boolean;
}

/** public_profiles view predicate (migration 0024, current live definition — confirmed
 * against pg_get_viewdef during tonight's audit, not assumed from the migration file
 * alone): `is_public = true OR (accepted, either direction) OR (pending, viewer is
 * recipient only)`. Grants only the view's own narrow column set (see
 * PUBLIC_PROFILE_SAFE_COLUMNS below) — never the full `profiles` row, and never the
 * portfolio. `headline`/`about` (migration 0037) sit in this same tier deliberately:
 * identity/header text, not achievement data, so they follow canViewBasicProfile rather
 * than the stricter canViewPortfolio below.
 *
 * This function itself was found to still describe migration 0023's ORIGINAL, more
 * permissive carve-out (any connection, any status, either direction) rather than 0024's
 * fix — the exact bug 0024's own header describes as "a single unsolicited connection
 * request... permanently unlocked their basic profile." Corrected 2026-09-02, verified
 * against the live view definition directly. This function has no live caller, so the
 * stale version was never a live security gap — but it was a false "what the view is
 * supposed to do" for anyone who read or extended it, in an app whose spec explicitly
 * calls this its highest-consequence privacy surface. */
export function canViewBasicProfile(input: BasicProfileVisibilityInput): boolean {
  return input.isSelf || input.isPublic || input.hasAcceptedConnection || input.hasPendingRequestFromTarget;
}

/**
 * Deliberately narrower than canViewBasicProfile — a connection (even accepted) does
 * NOT unlock portfolio/skills (which includes achievements, sports, projects, awards,
 * research, volunteering, work — everything lib/portfolio/build.ts returns except
 * education). Only a currently-public profile, or the owner previewing their own,
 * does. Wired into lib/social/public-profile.ts's getPublicPortfolio/getPublicSkills.
 */
export function canViewPortfolio(input: { isSelf: boolean; isPublic: boolean }): boolean {
  return input.isSelf || input.isPublic;
}

/** Wired into app/(app)/u/[id]/page.tsx — the Message button only ever appears for a
 * currently accepted connection, matching sendMessage's own re-checked authorization. */
export function canShowMessageButton(connectionStatus: ConnectionStatus | null): boolean {
  return connectionStatus === "accepted";
}

/**
 * The public_profiles view's exact column whitelist (migration 0023, widened by 0037 to
 * add headline/about) — never
 * `first_name`/`last_name`/`birth_year`/`city`/`school_name`/`is_admin`/
 * `profile_strength_score`/`busy_mode*`/`onboarding_*`/`completeness_percent`/
 * `preferred_language`/`timezone`/`target_geographies`/`weekly_time_budget`/
 * `updated_at` — every one of those stays on the private `profiles` row only. This list
 * documents the view's SELECT (SQL-enforced, not by this constant) and exists so a test
 * can assert the whitelist itself never silently grows to include a private field.
 */
export const PUBLIC_PROFILE_SAFE_COLUMNS = [
  "id",
  "display_name",
  "headline",
  "about",
  "country",
  "curriculum",
  "graduation_year",
  "looking_for",
  "created_at",
] as const;
