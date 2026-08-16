import type { ConnectionStatus } from "@/types/database";

/**
 * Pure authorization rules for /u/[id] (app/(app)/u/[id]/page.tsx) — the single highest-
 * consequence privacy surface in this app (migration 0024 fixed a real leak here once
 * already). Two independent, deliberately asymmetric gates exist, both real code paths
 * this module is wired into (not a parallel model):
 *
 *   - canViewPortfolio / canShowMessageButton mirror exactly what
 *     lib/social/public-profile.ts and the page itself evaluate at runtime.
 *   - canViewBasicProfile documents the public_profiles VIEW's own WHERE clause
 *     (migration 0023/0024) for readability and as a regression signal if the two ever
 *     drift — the real enforcement is the SQL view + RLS, not this function, since a
 *     Postgres view can't be unit-tested without a live database. Treat this one as
 *     "what the view is supposed to do," not "what guarantees it."
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
  /** True if ANY connections row exists between viewer and target, in EITHER direction,
   * regardless of status — the view's carve-out reads "requester_id or recipient_id",
   * with no `status = 'accepted'` filter, so a still-pending request also qualifies.
   * False once a connection is removed (hard-deleted on disconnect) — there is no
   * "history-only" carve-out for profile visibility the way there is for message
   * history; the two systems are intentionally independent. */
  hasAnyConnection: boolean;
}

/** public_profiles view predicate: `is_public = true OR id in (select ... from
 * connections where auth.uid() in (requester_id, recipient_id))`. Grants only the
 * view's own narrow column set (see PUBLIC_PROFILE_SAFE_COLUMNS below) — never the full
 * `profiles` row, and never the portfolio. `headline`/`about` (migration 0037) sit in
 * this same tier deliberately: identity/header text, not achievement data, so they
 * follow canViewBasicProfile rather than the stricter canViewPortfolio below. */
export function canViewBasicProfile(input: BasicProfileVisibilityInput): boolean {
  return input.isSelf || input.isPublic || input.hasAnyConnection;
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
 * The public_profiles view's exact column whitelist (migration 0023) — never
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
