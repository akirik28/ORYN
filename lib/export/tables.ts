/**
 * Table lists for the full-account data export (app/api/export-data/route.ts). Kept in
 * a plain module (no `server-only`) so the export surface itself — which tables are
 * covered — is unit-testable without pulling in the route's Supabase/next-navigation
 * dependency chain.
 */

/** Tables where "my data" is a plain `user_id = me` match. */
export const EXPORT_TABLES = [
  "education_records",
  "courses",
  "test_scores",
  "activities",
  "awards",
  "certifications",
  "projects",
  "research_experiences",
  "volunteering_experiences",
  "work_experiences",
  "sports_experiences",
  "skills",
  "languages",
  "evidence_files",
  "student_interests",
  "career_goals",
  "target_universities",
  "applications",
  "application_requirements",
  "saved_opportunities",
  "profile_scores",
  "profile_score_snapshots",
  "weekly_plans",
  "weekly_actions",
  "advisor_conversations",
  "advisor_messages",
  "notifications",
  // Professional Profile pack (migrations 0033-0036).
  "contact_info",
  "featured_items",
] as const;

/** Tables keyed by a participant pair rather than a plain user_id — each needs its own
 * filter shape in the route, so this list exists for coverage testing, not for driving
 * the fetch itself. */
export const EXPORT_PARTICIPANT_TABLES = [
  "messages",
  "connections",
  "blocked_users",
  "message_reports",
  "recommendations",
  "skill_endorsements",
  "profile_views",
] as const;

/**
 * Explicit column allowlist for message_reports, because `*` is unsafe here: RLS on that
 * table is necessarily row-level (a reporter can read back a report they filed — see
 * migration 0030's "select own filed reports" policy), so `select("*")` would also hand
 * back reviewed_by (an admin's id) and resolution_note — both meant as admin-internal,
 * per the moderation UI's own "internal only" copy. This is the one export table that
 * cannot reuse the generic `select("*")` pattern the others use.
 */
export const MESSAGE_REPORTS_EXPORT_COLUMNS = [
  "id",
  "reporter_id",
  "reported_user_id",
  "message_id",
  // Professional Profile pack (migration 0035) — a report about a recommendation
  // instead of a message. Omitting this was a real gap: a reporter exporting their own
  // filed report about a recommendation would see everything except which
  // recommendation they'd actually reported.
  "recommendation_id",
  // Social layer (migration 0058) — same gap, same fix: a reporter exporting a report
  // they filed about a post would otherwise see everything except which post it was
  // about. Harmless while 0058 is unapplied, for the same reason recommendation_id above
  // is: the column simply returns nothing.
  "post_id",
  "reason",
  "status",
  "reviewed_at",
  "created_at",
] as const;

/**
 * Named, tested query fragments for the participant-pair export tables — wired into
 * app/api/export-data/route.ts rather than left as inline template strings, so "which
 * column(s) scope this to the current user" stays a single, regression-tested source of
 * truth instead of something that could silently drift if this route is edited later.
 * Even a wrong filter here would still be caught by RLS underneath (messages/connections
 * select policies already scope to participant; blocked_users to blocker) — this is
 * defense in depth on the export's *content correctness*, not the only thing preventing
 * cross-user leakage.
 */
export function messagesExportFilter(userId: string): string {
  return `sender_id.eq.${userId},recipient_id.eq.${userId}`;
}

export function connectionsExportFilter(userId: string): string {
  return `requester_id.eq.${userId},recipient_id.eq.${userId}`;
}

/** blocked_users must only ever export rows where the current user is the *blocker* —
 * never the blocked party. Exporting the other direction would leak "who blocked me",
 * the exact disclosure lib/messaging/authorization.ts's block-direction fix (and
 * is_blocked_between's own security-definer design) deliberately withholds. */
export const BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN = "blocker_id" as const;

export function recommendationsExportFilter(userId: string): string {
  return `author_id.eq.${userId},recipient_id.eq.${userId}`;
}

/**
 * skill_endorsements has no plain `user_id` column — `endorser_id` names who gave the
 * endorsement; the skill's owner is only reachable indirectly via `skill_id ->
 * skills.user_id`, which doesn't fit this file's other filter shapes. Exported as
 * "endorsements I gave" only (the unambiguous authorship half, same posture as a
 * recommendation's author side) — endorsements ON my own skills are already visible via
 * my own profile UI and the `skills` export, not duplicated here as a second table.
 */
export const SKILL_ENDORSEMENTS_EXPORT_OWN_COLUMN = "endorser_id" as const;

/**
 * profile_views' entire product commitment is "never expose viewer identity" (spec) —
 * that holds even in the owner's own data export, so this is an explicit column
 * allowlist (like MESSAGE_REPORTS_EXPORT_COLUMNS above) that omits `viewer_id` entirely,
 * rather than reusing the generic `select("*")` path every plain-`user_id` export table
 * uses.
 */
export const PROFILE_VIEWS_EXPORT_COLUMNS = ["id", "viewed_on", "created_at"] as const;

/**
 * ---------------------------------------------------------------------------
 * Social layer (migration 0058) — DEFINED, DELIBERATELY NOT WIRED INTO THE ROUTE YET.
 * ---------------------------------------------------------------------------
 *
 * AGENTS.md Phase 12 requires data export for a minor-audience product, so the export
 * surface for posts and likes is decided here rather than left to whoever switches the
 * feature on. It is not added to EXPORT_TABLES / EXPORT_PARTICIPANT_TABLES while the
 * feature is off: those two lists drive live queries on a route every student can already
 * reach, and the tables do not exist in any applied migration. Adding them now would make
 * every export request issue two failing queries for a feature nobody can use.
 *
 * Switch-on checklist for this file: move "posts" into EXPORT_PARTICIPANT_TABLES (it is
 * keyed by `author_id`, not `user_id`, so it needs its own filter shape) and "post_likes"
 * into EXPORT_TABLES (it has a plain `user_id` and fits the generic path), then add the
 * two queries to app/api/export-data/route.ts.
 *
 * `post_revisions` is deliberately NOT in the export. Its rows are superseded versions of
 * the student's own content, retained so an edit cannot silently rewrite what others
 * already saw and so a moderator can see what was reported; the CURRENT version of every
 * post is already exported. Whether a portability or erasure request has to include
 * superseded versions is a legal question, not an engineering one — recorded in
 * docs/founder-blocked-backlog.md rather than answered here.
 */
export const POSTS_EXPORT_OWN_COLUMN = "author_id" as const;
export const POST_LIKES_EXPORT_OWN_COLUMN = "user_id" as const;

/** The tables the social layer adds to the export at switch-on, in the order they should
 * be wired. Exported as a constant so a test can assert the decision above stays true in
 * both directions: these are defined, and they are not yet live. */
export const SOCIAL_POSTS_EXPORT_TABLES = ["posts", "post_likes"] as const;
