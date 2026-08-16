/**
 * Pure rules for profile views — no `server-only` import (unlike
 * lib/social/profile-views.ts, which re-exports everything here), same split as
 * lib/social/skills.ts vs. its DB-touching callers, so this stays unit-testable.
 */

export interface ProfileViewCounts {
  last7Days: number;
  last30Days: number;
}

/** Self-view exclusion, app-layer half — migration 0036's `profile_views_no_self` check
 * constraint is the real, final backstop; this just skips the round-trip for the common
 * case (viewing your own profile) and is what recordProfileView actually branches on. */
export function shouldRecordProfileView(viewedUserId: string, viewerId: string): boolean {
  return viewedUserId !== viewerId;
}

/** `23505` (unique_violation) on a repeat same-day view is migration 0036's
 * `profile_views_dedup` constraint (viewed_user_id, viewer_id, viewed_on) doing exactly
 * what it's for — expected, not an error worth logging. Any other code is a real failure. */
export function isBenignDuplicateViewError(code: string | null | undefined): boolean {
  return code === "23505";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Owner-only 7d/30d aggregation from a plain list of `viewed_on` dates (already scoped
 * to the owner's own rows by the caller's RLS-backed query — see
 * lib/social/profile-views.ts's getProfileViewCounts). Deliberately takes only date
 * strings, never a viewer id, as its input shape — the "never expose viewer identity"
 * commitment (spec: PROFILE VIEWS) is enforced by this function simply having no way to
 * receive or return one, not by remembering to strip it somewhere.
 */
export function aggregateProfileViewCounts(viewedOnDates: string[], now: Date = new Date()): ProfileViewCounts {
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - 7);
  const since7Str = isoDate(since7);

  return {
    last7Days: viewedOnDates.filter((d) => d >= since7Str).length,
    last30Days: viewedOnDates.length,
  };
}
