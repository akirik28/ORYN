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
] as const;

/** Tables keyed by a participant pair rather than a plain user_id — each needs its own
 * filter shape in the route, so this list exists for coverage testing, not for driving
 * the fetch itself. */
export const EXPORT_PARTICIPANT_TABLES = ["messages", "connections", "blocked_users", "message_reports"] as const;
