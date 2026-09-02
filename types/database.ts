/**
 * Hand-authored types mirroring supabase/migrations/*.sql exactly.
 *
 * Assumption: there is no live-linked Supabase project in this environment to run
 * `supabase gen types typescript --linked` against, so these are maintained by hand
 * instead of generated. Once a project is linked, run `npm run db:types` (see
 * package.json / API_SETUP.md) to replace this file with the real generated types —
 * the shape (Database.public.Tables.<table>.Row/Insert/Update) is identical either way,
 * so nothing else in the codebase needs to change.
 */

type Insertable<Row, Optional extends keyof Row> = Omit<Row, Optional> & Partial<Pick<Row, Optional>>;
type Updatable<Row, Immutable extends keyof Row> = Partial<Omit<Row, Immutable>>;

// `interface`-declared types (all our Row/Insert/Update shapes below) don't structurally
// satisfy `Record<string, unknown>` in a conditional-type `extends` check — only object
// *type aliases* do, because interfaces don't get TypeScript's implicit index-signature
// inference the way mapped types do. @supabase/postgrest-js's GenericTable constraint
// requires `Record<string, unknown>` for Row/Insert/Update, so every table would silently
// resolve to `never` without this. `Identity<T>` re-expresses an interface as a mapped
// type (same members, same values) purely to pick up that inference — see the Insert/
// Update "never" postmortem in PHASE_STATUS.md if this ever needs re-deriving.
type Identity<T> = { [K in keyof T]: T[K] };

// ---------- Enums ----------

export type CurriculumType = "ap" | "ib" | "a_level" | "turkish_curriculum" | "national_curriculum" | "other";
export type TimeBudget = "under_2h" | "2_5h" | "5_10h" | "10h_plus";
/** Migration 0089. A visual-skin label, not a subscription — see that migration's own
 * header for the full reasoning and Profile.plan_tier's comment for how a missing/unreadable
 * value degrades. */
export type PlanTier = "standard" | "ultra";
/** Migration 0091. Which model/prompt style answers advisor chat, absent an active spend
 * degrade — deliberately not "standard"/"ultra" despite those being the exact founder-
 * approved UI labels for two of the three positions; see that migration's own header for
 * why the stored values and the display labels are kept apart on purpose. */
export type ResponseMode = "fast" | "balanced" | "thorough";
export type TargetGeography = "usa" | "uk" | "europe" | "canada" | "turkey" | "not_sure";
export type EducationStage = "middle_school" | "high_school" | "pre_university" | "undergraduate" | "other";
export type CourseLevel = "regular" | "honors" | "ap" | "ib_hl" | "ib_sl" | "a_level" | "dual_enrollment" | "other";
export type EvidenceStatus = "self_reported" | "evidence_added" | "verified" | "verification_rejected";
export type ActivityCategory = "club" | "sports" | "student_government" | "community_org" | "summer_program" | "academic_program" | "competition_team" | "other";
export type ResearchOutputType = "none" | "presentation" | "poster" | "school_journal" | "preprint" | "peer_reviewed_publication" | "other";
export type EmploymentType = "internship" | "part_time_job" | "full_time_job" | "apprenticeship" | "freelance" | "other";
export type SkillCategory = "technical" | "creative" | "analytical" | "communication" | "leadership" | "other";
export type GoalStatus = "active" | "achieved" | "abandoned";
export type DataConfidence = "high" | "medium" | "low";
export type DataStatus = "fresh" | "stale" | "needs_review" | "unavailable";
export type TargetStatus = "exploring" | "target" | "applying" | "applied" | "accepted" | "waitlisted" | "rejected" | "withdrawn";
/** "not_applicable" (migration 0049): the target's admissions system is credential/exam-
 * gated (lib/admissions/outlook.ts's admissionSystemType: "credential_gate") -- the reach/
 * competitive/likely scale describes profile-strength-vs-selectivity, which doesn't apply to
 * a system with no holistic review step at all. Distinct from `null` ("not yet assessed"). */
export type OutlookLabel = "extreme_reach" | "reach" | "competitive" | "strong" | "likely" | "not_applicable";
export type ApplicationType = "early_decision" | "early_action" | "regular_decision" | "rolling" | "other";
export type ApplicationStatus = "not_started" | "in_progress" | "submitted" | "under_review" | "accepted" | "waitlisted" | "rejected" | "withdrawn";
export type RequirementStatus = "not_started" | "in_progress" | "completed" | "not_applicable";
export type RequirementCategory =
  | "curriculum"
  | "required_subject"
  | "minimum_grade"
  | "standardized_test"
  | "english_proficiency"
  | "language_proficiency"
  | "essay"
  | "recommendation"
  | "interview"
  | "portfolio"
  | "entrance_exam"
  | "prerequisite_coursework"
  | "application_deadline"
  | "supplemental_requirement"
  | "international_requirement";
export type RequirementEvaluationStatus = "met" | "likely_met" | "not_met" | "unknown" | "needs_manual_review";
/** A row's contribution to its requirement_groups verdict (migration 0052) — see
 * lib/requirements/evaluate.ts evaluateRequirementGroup(). */
export type RequirementGroupRole = "inclusion" | "exclusion" | "qualifier";
export type OpportunityCategory = "competition" | "research" | "internship" | "summer_program" | "fellowship" | "scholarship" | "volunteering" | "entrepreneurship" | "hackathon" | "academic_program" | "online_program" | "conference" | "student_program";
export type OpportunityStatus = "active" | "expired" | "under_review" | "disabled";
export type SavedOpportunityStatus = "saved" | "applied" | "not_interested";
export type ProfileDimension = "academics" | "intellectual_curiosity" | "leadership" | "research" | "entrepreneurship" | "community_impact" | "awards_distinction" | "career_exploration" | "execution_project_depth";
export type PlanStatus = "active" | "completed" | "superseded";
export type ActionStatus = "not_started" | "in_progress" | "completed" | "skipped" | "expired";
export type ImpactLevel = "low" | "medium" | "high" | "very_high";
export type ReflectionOutcome = "completed_successfully" | "partially_completed" | "did_not_work" | "opportunity_no_longer_available";
export type RecommendationClass = "do" | "consider" | "deprioritize" | "avoid_for_now";
export type MessageRole = "user" | "assistant";
// 'system' existed here from migration 0012 to 0085 with no writer, ever, and no basis in
// Phase 24's spec list -- removed rather than kept "just in case" (migration 0085's own
// comment has the full reasoning: two concrete uses considered and ruled out, not just an
// abstract catch-all left unexamined). If a real need for a system-authored notification
// shows up later, add it back deliberately, for that need, not as a name already sitting here.
export type NotificationCategory =
  | "deadline"
  | "new_opportunity"
  | "weekly_plan"
  | "profile_update"
  | "university_data_changed"
  | "connection"
  | "message";
export type ProviderStatus = "healthy" | "degraded" | "down" | "unknown";
export type SyncJobStatus = "running" | "succeeded" | "failed";

// ---------- Row shapes ----------

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  birth_year: number | null;
  /** Denormalized from auth.users.raw_user_meta_data at signup (migration 0072) so it's
   * queryable without the admin client. Read-only from application code — set once by
   * handle_new_user(), never updated after. See birth_year_changes for why this exists:
   * comparing this against a later birth_year edit is how a consent/age mismatch becomes
   * detectable. */
  terms_accepted_at: string | null;
  country: string | null;
  /** Distinct from `country` (residence/school location) — citizenship (migration 0047),
   * never inferred from country. Multi-valued for dual/multiple citizenship. Empty = not
   * stated; onboarding/settings never forces a value. */
  citizenship_countries: string[];
  city: string | null;
  school_name: string | null;
  /** Canonical Entity Autocomplete System — preferred over school_name once set; kept in
   * sync with the linked institution's canonical name at selection time. */
  school_entity_id: string | null;
  /** Migration 0038 (canonical_entity_registry) — live (confirmed by direct
   * information_schema query, not the migration ledger, which has no record of 0038/0039
   * despite the columns genuinely existing; same "applied outside the ledger" shape as
   * migrations 0061-0065) but never added to this interface until the 2026-09-02
   * types/database.ts audit found it missing. Same canonical-identity pattern as
   * school_entity_id above, for country instead of institution. */
  country_entity_id: string | null;
  /** Migration 0038, same provenance note as country_entity_id above — city's canonical
   * geography identity. */
  city_entity_id: string | null;
  graduation_year: number | null;
  curriculum: CurriculumType | null;
  preferred_language: string;
  timezone: string;
  /** Migration 0089 — which visual skin this student sees. A label, not a subscription
   * (no payment/billing logic anywhere reads or writes it). Live as of 2026-09-02 (the
   * founder applied it by hand); every read still defaults an absent/unreadable value to
   * "standard" regardless, so this stays correct on any environment where it isn't. */
  plan_tier: PlanTier;
  /** Migration 0091 — student preference for advisor chat's model/prompt style, overridden
   * by spend-based degrade whenever that's active (lib/ai/limits/budget.ts). Live as of
   * 2026-09-02; every read still defaults an absent/unreadable value to "balanced" — see
   * lib/tier/response-mode.ts's resolveResponseMode, the one place this fallback happens. */
  response_mode: ResponseMode;
  /** Migration 0092, written not applied — when this student was shown the one-time
   * "welcome to Ultra" moment (Phase 57), or null if never. See lib/tier/ultra-welcome.ts:
   * an absent/unreadable value is deliberately NOT treated the same as null here (unlike
   * plan_tier/response_mode above) — see that file's own comment for why the welcome must
   * not show until this column can durably record having shown it. */
  ultra_welcome_seen_at: string | null;
  target_geographies: TargetGeography[];
  weekly_time_budget: TimeBudget | null;
  busy_mode: boolean;
  busy_mode_until: string | null;
  onboarding_completed: boolean;
  onboarding_step: string | null;
  completeness_percent: number;
  profile_strength_score: number | null;
  is_admin: boolean;
  is_public: boolean;
  looking_for: string | null;
  /** Professional Profile pack (migration 0033). Plain text only — never rendered as
   * markdown/HTML, so there is no injection surface. Max 220 chars (DB-enforced). */
  headline: string | null;
  /** Plain text only, same rule as headline. Max 2600 chars (DB-enforced). */
  about: string | null;
  /** Structured multi-select from OPEN_TO_OPTIONS (lib/social/open-to.ts) — distinct
   * from the free-text `looking_for` above. Visibility lives on contact_info, not here
   * (shares one visibility model with the rest of the optional contact surface). */
  open_to: string[];
  /** Opt-in: education_records.overall_gpa/gpa_scale and courses.grade_value are only
   * ever shown on the public profile when this is true. */
  show_gpa: boolean;
  /** Migration 0090, one column per NotificationCategory (all seven), default true so
   * migration day changes nobody's behavior. Read by lib/notifications/create.ts before
   * every write; false suppresses future notifications for that category only -- never
   * retroactive. Absent on a database where 0090 hasn't applied yet, which
   * createNotification() degrades from (isUndefinedColumnError) to "enabled". */
  notify_deadline: boolean;
  notify_new_opportunity: boolean;
  notify_weekly_plan: boolean;
  notify_profile_update: boolean;
  notify_university_data_changed: boolean;
  notify_connection: boolean;
  notify_message: boolean;
  /** Migration 0093 -- upgrade-prompt dismissal state, one student-triggered write path
   * (lib/advisor/upgrade-prompt.ts), not the notify_* pattern above. See that migration's
   * own comments for the three-tier semantics (soft/explicit/permanent). Absent on a
   * database where 0093 hasn't applied yet, which the read path degrades from
   * (isUndefinedColumnError) to "not yet dismissed" -- never an error, never blocks
   * rendering the rest of the advisor page. */
  upgrade_prompt_soft_dismissed_until: string | null;
  upgrade_prompt_not_now_at: string | null;
  upgrade_prompt_not_now_count: number;
  upgrade_prompt_dismissed_forever: boolean;
  created_at: string;
  updated_at: string;
}
export type ProfileUpdate = Updatable<Profile, "id" | "created_at" | "updated_at" | "terms_accepted_at">;

export type ContactVisibility = "private" | "connections" | "public";

export interface ContactInfo {
  user_id: string;
  phone: string | null;
  phone_visibility: ContactVisibility;
  email: string | null;
  email_visibility: ContactVisibility;
  linkedin_url: string | null;
  linkedin_visibility: ContactVisibility;
  instagram_handle: string | null;
  instagram_visibility: ContactVisibility;
  github_url: string | null;
  github_visibility: ContactVisibility;
  website_url: string | null;
  website_visibility: ContactVisibility;
  twitter_handle: string | null;
  twitter_visibility: ContactVisibility;
  discord_handle: string | null;
  discord_visibility: ContactVisibility;
  open_to_visibility: ContactVisibility;
  updated_at: string;
}
export type ContactInfoUpsert = Insertable<
  ContactInfo,
  | "phone_visibility"
  | "email_visibility"
  | "linkedin_visibility"
  | "instagram_visibility"
  | "github_visibility"
  | "website_visibility"
  | "twitter_visibility"
  | "discord_visibility"
  | "open_to_visibility"
  | "updated_at"
>;

export type FeaturedItemType =
  | "project"
  | "research_experience"
  | "award"
  | "activity"
  | "work_experience"
  | "volunteering_experience"
  | "sports_experience"
  | "external_link";

export interface FeaturedItem {
  id: string;
  user_id: string;
  item_type: FeaturedItemType;
  item_id: string | null;
  external_title: string | null;
  external_url: string | null;
  display_order: number;
  created_at: string;
}
export type FeaturedItemInsert = Insertable<FeaturedItem, "id" | "created_at" | "display_order">;

export interface SkillEndorsement {
  id: string;
  skill_id: string;
  endorser_id: string;
  created_at: string;
}
export type SkillEndorsementInsert = Insertable<SkillEndorsement, "id" | "created_at">;

export type RecommendationRelationship = "teacher" | "mentor" | "teammate" | "project_collaborator" | "colleague" | "other";
export type RecommendationStatus = "visible" | "hidden";

export interface Recommendation {
  id: string;
  author_id: string;
  recipient_id: string;
  relationship: RecommendationRelationship;
  body: string;
  status: RecommendationStatus;
  created_at: string;
}
export type RecommendationInsert = Insertable<Recommendation, "id" | "created_at" | "status">;

export interface ProfileView {
  id: string;
  viewed_user_id: string;
  viewer_id: string;
  viewed_on: string;
  created_at: string;
}
export type ProfileViewInsert = Insertable<ProfileView, "id" | "created_at" | "viewed_on">;

// ---------- Social posts / likes / reposts (migration 0058, NOT YET APPLIED) ----------
// The whole feature ships switched off — no route, no nav entry, and a server-side kill
// switch (lib/social/posts-feature-flag.ts). These types exist so the data layer and its
// tests can be written and reviewed now; nothing in `app/` references them.

export type PostVisibility = "private" | "connections" | "oryn_public";
export type PostKind = "original" | "repost";
export type PostAttachmentKind = "image" | "document";

export interface Post {
  id: string;
  author_id: string;
  kind: PostKind;
  /** Never optional on insert — the Insert type below deliberately does NOT list
   * `visibility` as omittable, mirroring the column's `not null` with no DB default. A
   * minor's audience must always be a decision someone made. */
  visibility: PostVisibility;
  body: string | null;
  reposted_post_id: string | null;
  attachment_path: string | null;
  attachment_kind: PostAttachmentKind | null;
  like_count: number;
  repost_count: number;
  edit_count: number;
  edited_at: string | null;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  created_at: string;
  updated_at: string;
}
/** `visibility` and `kind` are intentionally absent from the omittable list. Every other
 * field here is either DB-defaulted or trigger-maintained; `like_count`/`repost_count`/
 * `edit_count`/`edited_at`/`removed_*` are additionally guarded against client writes by
 * posts_guard_system_columns, so listing them as omittable is a convenience, not a
 * permission. */
export type PostInsert = Insertable<
  Post,
  | "id"
  | "created_at"
  | "updated_at"
  | "body"
  | "reposted_post_id"
  | "attachment_path"
  | "attachment_kind"
  | "like_count"
  | "repost_count"
  | "edit_count"
  | "edited_at"
  | "removed_at"
  | "removed_by"
  | "removal_reason"
>;
/** Only body/visibility/attachment are author-editable. The remaining columns are either
 * immutable or restored by the guard trigger; typing them out of the Update shape keeps
 * a Server Action from sending them by accident in the first place. */
export type PostUpdate = Partial<Pick<Post, "body" | "visibility" | "attachment_path" | "attachment_kind">>;
/** Moderator-only update, applied through the admin (service-role) client — the one role
 * the guard trigger lets through. */
export type PostModerationUpdate = Partial<Pick<Post, "removed_at" | "removed_by" | "removal_reason">>;

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}
export type PostLikeInsert = Insertable<PostLike, "created_at">;

export interface PostRevision {
  id: string;
  post_id: string;
  /** The post's edit_count at the moment this version was replaced; revision 0 is the
   * text the post was created with. */
  revision: number;
  body: string | null;
  visibility: PostVisibility;
  attachment_path: string | null;
  attachment_kind: PostAttachmentKind | null;
  replaced_at: string;
}
/** No Insert type on purpose: the posts_10_record_revision trigger is the only writer and
 * the table has no INSERT policy for any role. */

// Narrow, explicit column subset exposed by the `public_profiles` view (migration
// 0023) — never the raw `Profile` row. See that migration for why.
export interface PublicProfileRow {
  id: string;
  display_name: string | null;
  headline: string | null;
  about: string | null;
  country: string | null;
  curriculum: CurriculumType | null;
  graduation_year: number | null;
  looking_for: string | null;
  created_at: string;
}

export type ConnectionStatus = "pending" | "accepted" | "declined";

export interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: ConnectionStatus;
  low_id: string;
  high_id: string;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}
export type ConnectionInsert = Insertable<Connection, "id" | "created_at" | "updated_at" | "low_id" | "high_id" | "responded_at" | "status">;
export type ConnectionUpdate = Updatable<Connection, "id" | "requester_id" | "created_at" | "updated_at" | "low_id" | "high_id">;

// Messaging (migration 0027) — accepted-connection-only, enforced by RLS (see that
// migration's comments), not by these types. sender_id/recipient_id are denormalized
// directly onto each row rather than referencing a conversation/connection id, so history
// survives a later disconnect or block — see the migration for why that matters here.
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
export type MessageInsert = Insertable<Message, "id" | "created_at" | "read_at">;
export type MessageUpdate = Updatable<Message, "id" | "sender_id" | "recipient_id" | "body" | "created_at">;

export interface BlockedUser {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}
export type BlockedUserInsert = Insertable<BlockedUser, "id" | "created_at">;

export type MessageReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface MessageReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  message_id: string | null;
  /** Professional Profile pack (migration 0035) — reuses this same moderation system
   * for recommendation reports rather than a parallel one. A report references at most
   * one of message_id/recommendation_id (not enforced by a DB constraint, since a
   * general "report this user" with neither is also valid, matching message_id's own
   * pre-existing nullability). */
  recommendation_id: string | null;
  /** Social layer (migration 0058) — the third content type routed through this same
   * queue, extended exactly the way `recommendation_id` was. Nullable for the same
   * reason: a report references at most one piece of content, and a bare "report this
   * user" with none is still valid. */
  post_id: string | null;
  reason: string;
  status: MessageReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
}
export type MessageReportInsert = Insertable<
  MessageReport,
  "id" | "created_at" | "status" | "reviewed_by" | "reviewed_at" | "resolution_note" | "message_id" | "recommendation_id" | "post_id"
>;
export type MessageReportUpdate = Updatable<
  MessageReport,
  "id" | "reporter_id" | "reported_user_id" | "message_id" | "recommendation_id" | "post_id" | "reason" | "created_at"
>;

interface AchievementCommon {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  /** Canonical Entity Autocomplete System — preferred source of truth over `organization`
   * once set; `organization` is kept in sync with the linked institution's canonical name
   * at selection time (see lib/entities/resolve.ts) so every existing read path keeps
   * working unchanged. Null means unlinked/legacy free text only. */
  organization_entity_id: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  ongoing: boolean;
  hours_per_week: number | null;
  location: string | null;
  /** Essay Story Bank (founder-confirmed MVP scope, see docs/known-issues.md): why started,
   * hardest moment, what changed, what learned, measurable outcome, who worked with — free
   * text, not CV-facing. Surfaced as candidate material when generating essay outlines,
   * never invented. */
  story_notes: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}

export interface EducationRecord {
  id: string;
  user_id: string;
  school_name: string;
  school_entity_id: string | null;
  /** Migration 0038 (canonical_entity_registry) — same provenance note as
   * Profile.country_entity_id: live (confirmed by direct information_schema query), never
   * added to this interface until the 2026-09-02 audit found it missing. Unlike `profiles`,
   * this table's own migration only added school_entity_id and country_entity_id, not a
   * city variant — confirmed against the migration's own `alter table` statements, not
   * assumed symmetric with `profiles`. */
  country_entity_id: string | null;
  country: string | null;
  stage: EducationStage;
  curriculum: CurriculumType | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  overall_gpa: number | null;
  gpa_scale: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type EducationRecordInsert = Insertable<
  EducationRecord,
  "id" | "created_at" | "updated_at" | "stage" | "is_current" | "school_entity_id" | "country_entity_id"
>;
export type EducationRecordUpdate = Updatable<EducationRecord, "id" | "user_id" | "created_at" | "updated_at">;

export interface Course {
  id: string;
  user_id: string;
  education_record_id: string | null;
  course_name: string;
  subject: string | null;
  level: CourseLevel;
  academic_year: string | null;
  grade_value: string | null;
  grade_scale: string | null;
  credit_hours: number | null;
  created_at: string;
  updated_at: string;
}
export type CourseInsert = Insertable<Course, "id" | "created_at" | "updated_at" | "level">;
export type CourseUpdate = Updatable<Course, "id" | "user_id" | "created_at" | "updated_at">;

export interface TestScore {
  id: string;
  user_id: string;
  test_name: string;
  score: string;
  max_score: string | null;
  subscores: Record<string, unknown>;
  test_date: string | null;
  created_at: string;
  updated_at: string;
}
export type TestScoreInsert = Insertable<TestScore, "id" | "created_at" | "updated_at" | "subscores">;
export type TestScoreUpdate = Updatable<TestScore, "id" | "user_id" | "created_at" | "updated_at">;

export interface Activity extends AchievementCommon {
  category: ActivityCategory;
  is_leadership_role: boolean;
  people_led: number | null;
  organization_scope: string | null;
  weeks_per_year: number | null;
  /** Links a summer/academic-program-category activity back to the canonical
   * opportunities registry (e.g. "YYGS" -> Yale Young Global Scholars) — new linkage,
   * not a replacement for anything (no prior column recorded this). */
  opportunity_id: string | null;
}
export type ActivityInsert = Insertable<
  Activity,
  "id" | "created_at" | "updated_at" | "category" | "is_leadership_role" | "ongoing" | "source" | "evidence_status" | "organization_entity_id" | "opportunity_id"
>;
export type ActivityUpdate = Updatable<Activity, "id" | "user_id" | "created_at" | "updated_at">;

export interface Award {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  organization_entity_id: string | null;
  level: string | null;
  description: string | null;
  award_date: string | null;
  location: string | null;
  story_notes: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}
export type AwardInsert = Insertable<Award, "id" | "created_at" | "updated_at" | "source" | "evidence_status" | "organization_entity_id">;
export type AwardUpdate = Updatable<Award, "id" | "user_id" | "created_at" | "updated_at">;

export interface Certification {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  organization_entity_id: string | null;
  description: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}
export type CertificationInsert = Insertable<Certification, "id" | "created_at" | "updated_at" | "source" | "evidence_status" | "organization_entity_id">;
export type CertificationUpdate = Updatable<Certification, "id" | "user_id" | "created_at" | "updated_at">;

export interface Project extends AchievementCommon {
  role: string | null;
  outcome_summary: string | null;
  users_reached: number | null;
  revenue_amount: number | null;
  repo_url: string | null;
  live_url: string | null;
}
export type ProjectInsert = Insertable<Project, "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "organization_entity_id">;
export type ProjectUpdate = Updatable<Project, "id" | "user_id" | "created_at" | "updated_at">;

export interface ResearchExperience extends AchievementCommon {
  mentor_name: string | null;
  field: string | null;
  methodology: string | null;
  independence_level: string | null;
  output_type: ResearchOutputType;
  output_url: string | null;
}
export type ResearchExperienceInsert = Insertable<
  ResearchExperience,
  "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "output_type" | "organization_entity_id"
>;
export type ResearchExperienceUpdate = Updatable<ResearchExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface VolunteeringExperience extends AchievementCommon {
  cause_area: string | null;
  weeks_per_year: number | null;
}
export type VolunteeringExperienceInsert = Insertable<VolunteeringExperience, "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "organization_entity_id">;
export type VolunteeringExperienceUpdate = Updatable<VolunteeringExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface WorkExperience {
  id: string;
  user_id: string;
  title: string;
  organization: string;
  organization_entity_id: string | null;
  employment_type: EmploymentType;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  ongoing: boolean;
  hours_per_week: number | null;
  paid: boolean | null;
  location: string | null;
  story_notes: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}
export type WorkExperienceInsert = Insertable<WorkExperience, "id" | "created_at" | "updated_at" | "employment_type" | "ongoing" | "source" | "evidence_status" | "organization_entity_id">;
export type WorkExperienceUpdate = Updatable<WorkExperience, "id" | "user_id" | "created_at" | "updated_at">;

// Sports (migration 0026) — a dedicated table, not folded into `activities`: real
// structure (discipline, team/position, competitive level, captaincy, achievements) that
// table has no fields for. `level` is a deliberately global ontology, not US-specific
// varsity/JV — see the migration's own comment.
export type SportLevel = "recreational" | "school" | "club" | "regional" | "national" | "international";

export interface SportsExperience {
  id: string;
  user_id: string;
  sport: string;
  discipline: string | null;
  team_name: string | null;
  team_entity_id: string | null;
  position: string | null;
  level: SportLevel | null;
  us_specific_label: string | null;
  is_captain: boolean;
  achievements: string | null;
  start_date: string | null;
  end_date: string | null;
  ongoing: boolean;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  location: string | null;
  description: string | null;
  story_notes: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}
export type SportsExperienceInsert = Insertable<SportsExperience, "id" | "created_at" | "updated_at" | "is_captain" | "ongoing" | "source" | "evidence_status" | "team_entity_id">;
export type SportsExperienceUpdate = Updatable<SportsExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: SkillCategory;
  proficiency: string | null;
  /** Migration 0084, not yet applied — 'cv_import' vs 'manual' (the DB default). Typed as
   * required (matching weekly_actions.carried_forward / external_sync_jobs.errors_encountered's
   * own precedent for an unapplied migration's column): the type describes the intended final
   * shape, and the code that writes it (lib/profile/cv-import.ts) is responsible for tolerating
   * the column's current absence at runtime, the same way those two already do. */
  source: string;
  created_at: string;
  updated_at: string;
}
export type SkillInsert = Insertable<Skill, "id" | "created_at" | "updated_at" | "category" | "source">;
export type SkillUpdate = Updatable<Skill, "id" | "user_id" | "created_at" | "updated_at">;

export interface Language {
  id: string;
  user_id: string;
  name: string;
  proficiency: string | null;
  /** Migration 0084, not yet applied — see Skill.source above. */
  source: string;
  created_at: string;
  updated_at: string;
}
export type LanguageInsert = Insertable<Language, "id" | "created_at" | "updated_at" | "source">;
export type LanguageUpdate = Updatable<Language, "id" | "user_id" | "created_at" | "updated_at">;

export interface EvidenceFile {
  id: string;
  user_id: string;
  linked_table: string;
  linked_id: string;
  evidence_type: string;
  file_path: string | null;
  external_url: string | null;
  verification_status: EvidenceStatus;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}
export type EvidenceFileInsert = Insertable<EvidenceFile, "id" | "created_at" | "updated_at" | "uploaded_at" | "verification_status">;
export type EvidenceFileUpdate = Updatable<EvidenceFile, "id" | "user_id" | "created_at" | "updated_at">;

export interface StudentInterest {
  id: string;
  user_id: string;
  label: string;
  is_custom: boolean;
  created_at: string;
}
export type StudentInterestInsert = Insertable<StudentInterest, "id" | "created_at" | "is_custom">;

export interface CareerGoal {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  target_date: string | null;
  priority: number;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}
export type CareerGoalInsert = Insertable<CareerGoal, "id" | "created_at" | "updated_at" | "priority" | "status">;
export type CareerGoalUpdate = Updatable<CareerGoal, "id" | "user_id" | "created_at" | "updated_at">;

// ---------- Canonical entity registry (migration 0038) ----------

/** Every entity type `canonical_entities.entity_type` accepts. The source of truth for
 * which of these a given profile field may link is lib/entities/field-policy.ts, which
 * mirrors the database's own per-column triggers. */
export type CanonicalEntityType =
  | "school"
  | "university"
  | "employer"
  | "organization"
  | "research_institution"
  | "lab"
  | "ngo"
  | "club"
  | "opportunity_provider"
  | "program"
  | "competition"
  | "scholarship"
  | "sports_team"
  | "country"
  | "city";

/** `user_submitted` is what the student-facing custom fallback produces — it is NOT a
 * claim that anything was checked. `merged` is a tombstone pointing at a replacement via
 * metadata.merged_into; nothing should ever link to one. */
export type EntityVerificationState = "unverified" | "user_submitted" | "source_verified" | "official_verified" | "conflict" | "merged" | "inactive";

export interface CanonicalEntity {
  id: string;
  entity_type: CanonicalEntityType;
  /** The legal/registry name. */
  canonical_name: string;
  /** What the UI shows — differs from canonical_name when the legal name is unwieldy. */
  display_name: string;
  /** Identity key, never displayed. */
  normalized_name: string;
  country_code: string | null;
  city: string | null;
  official_url: string | null;
  parent_entity_id: string | null;
  canonicality_rule: "required" | "preferred_custom_fallback" | "free_text_not_entity";
  verification_state: EntityVerificationState;
  data_status: DataStatus;
  source_priority: number;
  metadata: Record<string, unknown>;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
  /** Trigram-indexed search form, maintained by a trigger — never written by the app. */
  search_key: string | null;
}

export interface EntityAlias {
  id: string;
  entity_id: string;
  alias: string;
  normalized_alias: string;
  language_code: string | null;
  alias_type: "official" | "common" | "abbreviation" | "legacy" | "translation" | "user_submitted";
  source_url: string | null;
  verified: boolean;
  created_at: string;
  alias_search_key: string | null;
}

/** One row of `search_canonical_entities`. `matched_text` is the alias that matched when
 * `matched_via` is 'alias', otherwise the display name. */
export interface CanonicalEntitySearchRow {
  entity_id: string;
  entity_type: CanonicalEntityType;
  canonical_name: string;
  display_name: string;
  country_code: string | null;
  city: string | null;
  verification_state: EntityVerificationState;
  matched_text: string;
  matched_via: "canonical" | "alias";
  score: number;
}

/** `entity_external_ids` (migration 0038) — one row per (id_system, external_id) pair
 * recorded for a canonical entity (e.g. its ROR or Wikidata id). Added to types/database.ts
 * 2026-09-02 (schema-type-drift audit) — live and queried through the typed client
 * (scripts/expand-university-spine.ts) with zero column checking before this. Read/insert
 * only in the codebase today; nothing updates a row after it's written. */
export interface EntityExternalId {
  id: string;
  entity_id: string;
  /** No DB-level allowlist (plain text, migration 0038) — e.g. "ror", "wikidata" — so not
   * narrowed to a union here either, unlike verification_state below. */
  id_system: string;
  external_id: string;
  source_url: string | null;
  verification_state: "unverified" | "source_verified" | "official_verified" | "conflict" | "inactive";
  verified_at: string | null;
  created_at: string;
}
export type EntityExternalIdInsert = Insertable<EntityExternalId, "id" | "created_at" | "verification_state" | "verified_at">;

/** `entity_relationships` (migration 0038) — a directed edge between two canonical entities
 * (e.g. a campus `campus_of` its parent institution). Same provenance/discovery note as
 * EntityExternalId above. `verification_state`'s allowed values are a narrower set than
 * EntityExternalId's (no `inactive`) and than `EntityVerificationState` (no `user_submitted`/
 * `merged` either) — checked against migration 0038's own CHECK constraint, not assumed to
 * match a sibling table. */
export interface EntityRelationship {
  id: string;
  subject_entity_id: string;
  relationship_type:
    | "part_of"
    | "operated_by"
    | "campus_of"
    | "school_of"
    | "provider_for"
    | "member_of"
    | "successor_of"
    | "predecessor_of"
    | "related_brand";
  object_entity_id: string;
  source_url: string | null;
  verification_state: "unverified" | "source_verified" | "official_verified" | "conflict";
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type EntityRelationshipInsert = Insertable<EntityRelationship, "id" | "created_at" | "updated_at" | "verification_state" | "notes">;

// ---------- Universities (global reference data) ----------

export interface University {
  id: string;
  name: string;
  country: string;
  city: string | null;
  institution_type: string | null;
  /** Identity link into canonical_entities (entity_type='university'). Alternate names
   * live there as entity_aliases rows, not as a column here — see
   * lib/universities/alias-search.ts. */
  canonical_entity_id: string | null;
  /** Identity links into canonical_entities for this university's country/city, in
   * addition to the denormalized `country`/`city` text columns above (migration 0038). */
  country_entity_id: string | null;
  city_entity_id: string | null;
  website_url: string | null;
  /** Official admissions entry point (migration 0042). Must be on the institution's own
   * domain — see lib/acquisition/source-authority.ts. */
  admissions_url: string | null;
  /** The application route students actually use (UCAS, Common App, Studielink,
   * Parcoursup, ÖSYM/YKS, uni-assist, direct). Null means unknown, never "direct". */
  application_system: string | null;
  logo_url: string | null;
  description: string | null;
  selectivity: string | null;
  student_size: number | null;
  latitude: number | null;
  longitude: number | null;
  external_ids: Record<string, unknown>;
  data_confidence: DataConfidence;
  data_status: DataStatus;
  last_checked_at: string | null;
  last_changed_at: string | null;
  /** 'canonical' (default) or 'superseded' — migration 0043. A 'superseded' row is a
   * confirmed duplicate of superseded_by_id (same real-world institution, kept rather than
   * deleted so nothing that references it silently loses data) and must be excluded from
   * listing/search surfaces. See lib/universities/canonical.ts, the sole read path for this
   * pair of columns. */
  duplicate_status: "canonical" | "superseded";
  /** Set only when duplicate_status='superseded' — the surviving canonical row's id. */
  superseded_by_id: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityInsert = Insertable<
  University,
  | "id"
  | "created_at"
  | "updated_at"
  | "external_ids"
  | "data_confidence"
  | "data_status"
  // Nullable columns with no data source populating them at insert time today
  // (lib/universities/sync-us-universities.ts) — genuinely optional, not just
  // omitted; the DB leaves them null with no explicit value required.
  | "description"
  | "logo_url"
  | "selectivity"
  | "latitude"
  | "longitude"
  | "canonical_entity_id"
  | "country_entity_id"
  | "city_entity_id"
  | "admissions_url"
  | "application_system"
  // duplicate_status defaults to 'canonical' on the DB side (migration 0043); superseded_by_id
  // is nullable and only ever set by the dedup audit tooling (scripts/university-duplicates-
  // audit.ts --supersede), never at ordinary insert time.
  | "duplicate_status"
  | "superseded_by_id"
>;
export type UniversityUpdate = Updatable<University, "id" | "created_at" | "updated_at">;

/** See lib/programs/subject-taxonomy.ts SUBJECT_TAXONOMY — must stay in sync with the
 * university_programs.subject_taxonomy CHECK constraint (migration 0042). */
export type ProgramSubjectTaxonomy =
  | "economics"
  | "business"
  | "finance"
  | "computer_science"
  | "artificial_intelligence"
  | "engineering"
  | "medicine"
  | "law"
  | "psychology"
  | "political_science"
  | "international_relations"
  | "mathematics"
  | "physics"
  | "architecture"
  | "design"
  | "entrepreneurship"
  | "other";

export type ProgramVerificationState = "verified_current" | "verified_historical" | "discontinued" | "unverified" | "conflicting";
export type ProgramDeliveryMode = "online" | "in_person" | "hybrid";
export type ProgramSourceType = "official_primary" | "official_secondary" | "third_party_structured" | "unverified_secondary";

export interface UniversityProgram {
  id: string;
  university_id: string;
  name: string;
  normalized_name: string;
  degree_level: string | null;
  degree_type: string | null;
  faculty_or_school: string | null;
  field: string | null;
  subject_taxonomy: ProgramSubjectTaxonomy | null;
  secondary_subject_tags: string[];
  duration_years: number | null;
  tuition_amount: number | null;
  tuition_currency: string | null;
  language_of_instruction: string | null;
  campus: string | null;
  delivery_mode: ProgramDeliveryMode | null;
  full_time_part_time: "full_time" | "part_time" | "both" | null;
  international_eligible: boolean | null;
  official_program_url: string | null;
  admissions_url: string | null;
  source_url: string | null;
  source_type: ProgramSourceType;
  verification_state: ProgramVerificationState;
  verified_at: string;
  notes: string | null;
  data_confidence: DataConfidence;
  created_at: string;
  updated_at: string;
  /** YOK Atlas's own per-programme identifier. Not backfilled for existing rows -- see migration 0056. */
  kilavuz_kodu: string | null;
  /** Migration 0059 (unapplied) — UCAS's own course code, stored verbatim for traceability.
   * Same posture as kilavuz_kodu: plain column, nullable, NOT backed by a uniqueness
   * constraint, NOT part of university_programs_dedup_idx. Confirmed NOT a safe dedup-key
   * candidate as-is — Southampton shows one code (F303) shared identically across three
   * genuinely distinct MPhys Physics titles, and QMUL shows a single row can carry a
   * space-separated list of several codes (full-time/foundation-year/study-abroad variants),
   * not always one code per row. See docs/handoffs/schema-gaps-design-2026-08-22.md §B3. */
  ucas_code: string | null;
}
export type UniversityProgramInsert = Insertable<
  UniversityProgram,
  | "id"
  | "created_at"
  | "updated_at"
  | "data_confidence"
  | "secondary_subject_tags"
  | "source_type"
  | "verification_state"
  | "verified_at"
  // Optional descriptive fields not every ingestion source populates
  | "degree_type"
  | "faculty_or_school"
  | "field"
  | "subject_taxonomy"
  | "duration_years"
  | "tuition_amount"
  | "tuition_currency"
  | "language_of_instruction"
  | "campus"
  | "delivery_mode"
  | "full_time_part_time"
  | "international_eligible"
  | "official_program_url"
  | "admissions_url"
  | "source_url"
  | "notes"
  | "kilavuz_kodu"
  | "ucas_code"
>;
export type UniversityProgramUpdate = Updatable<UniversityProgram, "id" | "university_id" | "created_at" | "updated_at">;

/** Audit trail for every university_programs ingestion attempt — see
 * docs/research-handoff-university-programs.md. Internal tooling only, not read by the
 * product UI (no RLS policy grants the authenticated-user client access). */
export type ProgramIngestOutcome = "accepted" | "duplicate" | "unresolved_university" | "insufficient_evidence" | "malformed_source" | "conflicting" | "rejected";

export interface ProgramResearchQueue {
  id: string;
  batch_id: string;
  research_program_id: string | null;
  university_id: string | null;
  university_name_input: string;
  university_country_input: string | null;
  program_name_input: string;
  degree_level_input: string | null;
  official_program_url_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_status_input: string | null;
  raw_payload: Record<string, unknown>;
  outcome: ProgramIngestOutcome;
  outcome_detail: string | null;
  promoted_program_id: string | null;
  created_at: string;
}
export type ProgramResearchQueueInsert = Insertable<
  ProgramResearchQueue,
  "id" | "created_at" | "research_program_id" | "university_id" | "university_country_input" | "official_program_url_input" | "source_url_input" | "source_type_input" | "verification_status_input" | "raw_payload" | "outcome_detail" | "promoted_program_id"
>;

/** A set of university_requirements rows evaluated together rather than independently
 * (migration 0052) — see lib/requirements/evaluate.ts evaluateRequirementGroup(). Deliberately
 * has no university_id/program_id/scope of its own; every member row already states those and
 * is trusted at ingestion time to agree, the same trust boundary this schema already uses for
 * program_id-vs-university_id consistency elsewhere. */
export interface RequirementGroup {
  id: string;
  title: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type RequirementGroupInsert = Insertable<RequirementGroup, "id" | "notes" | "created_at" | "updated_at">;

export interface UniversityRequirement {
  id: string;
  university_id: string;
  program_id: string | null;
  requirement_type: RequirementCategory;
  title: string | null;
  requirement_detail: string | null;
  is_required: boolean;
  /** Machine-evaluable rule (see lib/requirements/types.ts StructuredRule), or null for
   * categories that can't be evaluated against stored profile facts. */
  structured_rule: Record<string, unknown> | null;
  data_confidence: DataConfidence;
  data_status: DataStatus;
  /** Applicant group this requirement applies to (e.g. "international_undergraduate"),
   * migration 0042. Null means it applies to all applicants. */
  scope: string | null;
  /** Same vocabulary as Opportunity.verification_state (migration 0042's own comment: "one
   * vocabulary covers both"), plus one value Opportunity does not carry. `staleness_suspected`
   * (migration 0059, unapplied) is a ONE-source state — a single live reading whose own
   * currency is in doubt (an undated page whose silence is the only evidence, alongside a
   * decades-old PDF found elsewhere presented as current) — distinct from `conflicting`, which
   * requires two or more competing readings linked via requirement_source_conflicts. Not added
   * to Opportunity's vocabulary: the motivating case (Heidelberg's uni-assist question) is
   * specific to the single-authoritative-page shape requirements/deadlines research keeps
   * finding, not yet observed on the opportunities side. */
  verification_state: "verified_current" | "verified_historical" | "verified_derived" | "unverified" | "conflicting" | "staleness_suspected";
  verified_at: string | null;
  /** Set only when this row must be evaluated together with sibling rows in the same
   * requirement_groups row rather than independently (migration 0052) — see that table's
   * comment and lib/requirements/evaluate.ts evaluateRequirementGroup(). */
  requirement_group_id: string | null;
  /** This row's contribution to its group's combined verdict. Null iff requirement_group_id
   * is null. */
  group_role: RequirementGroupRole | null;
  /** True for any row stating a negative/carve-out fact (who is NOT eligible), grouped or
   * not. Never auto-resolved — lib/requirements/evaluate.ts always returns
   * needs_manual_review for these, deliberately never derived from an inclusion set by
   * negation. See migration 0052's comment for why this is kept separate from
   * group_role = 'exclusion' rather than folded entirely into it. */
  is_exclusion: boolean;
  /** The source document's own clause numbering (e.g. "B-a-1"), stored verbatim and never
   * parsed — see migration 0052's comment. */
  clause_ref: string | null;
  /** Migration 0056's qualifier columns — everything that governs whether the comparison in
   * `structured_rule` is legitimate at all, as opposed to what the comparison is. Read off the
   * row by `RequirementQualifiersSchema` (lib/validation/requirements.ts) and populated by
   * lib/requirements/ingest.ts. 0056 is APPLIED; these are live columns.
   *
   * Scale/version the threshold is expressed against (e.g. `TOEFL_IBT_1_6`). Null means
   * UNKNOWN, never "the default scale" — an unqualified numeric threshold is not safely
   * comparable. */
  test_scale: string | null;
  /** Whether the scale could be pinned down: none | resolved_unambiguous |
   * undated_scale_assumption | partially_unsatisfiable | possibly_discontinued_instrument.
   * Anything outside the first two blocks automatic evaluation. */
  scale_ambiguity: string | null;
  /** Validity window INCLUDING its direction (see lib/requirements/types.ts `RecencyRule`).
   * jsonb because the anchor varies and is load-bearing. Written in the camelCase shape
   * `RecencyRuleSchema` parses — note that 0056 §2's header sketches snake_case, and Zod
   * strips unknown keys rather than failing, so the two are not interchangeable. */
  recency_rule: Record<string, unknown> | null;
  /** Provenances this institution refuses despite a qualifying number — see
   * lib/requirements/types.ts `ScoreProvenance`. Per-institution, never a global property of
   * the test. */
  excluded_provenances: string[] | null;
  /** Non-null means lib/requirements/evaluate.ts MUST return needs_manual_review for this row
   * regardless of `structured_rule` — see lib/requirements/types.ts `EvaluationGate`. */
  evaluation_gate: string | null;
  /** Migration 0056 §8 — links two or more competing official readings of the same fact. */
  conflict_group_id: string | null;
  /** Migration 0056 §9 — the research record this row came from
   * (`requirement_research_queue.research_requirement_id`). Without it a live requirement can
   * be traced back only by matching text against raw_payload. */
  research_record_id: string | null;
  /** Migration 0059 (unapplied) — what actually happens if this requirement evaluates
   * `not_met`, independent of the threshold comparison itself. Null means `blocks_admission`
   * (the universal implicit assumption every existing row already makes) — NEVER treat null as
   * "unknown, don't warn the student," it is the safe default this product has always used.
   * `triggers_remediation`: not meeting this does not block admission, it creates a downstream
   * obligation (Italy's OFA — the same CISIA test is a hard gate at one programme and a
   * remediation trigger at another, at the same university). `advisory_only`: informational,
   * no admission consequence either way. See docs/handoffs/schema-gaps-design-2026-08-22.md §C2. */
  unmet_consequence: "blocks_admission" | "triggers_remediation" | "advisory_only" | null;
  /** Migration 0071 (2026-08-31). Null for an ordinary row. Set only for a fact whose
   * validity is tied to a known external annual publication event — see
   * lib/acquisition/verification.ts's AnnualCalendarWindow and CAO_POINTS_IE, the only
   * concrete instance today. Read exclusively by lib/requirements/calendar-bound.ts's
   * display path, which is structurally incapable of a Met/Not-met verdict — never by
   * evaluateRequirement() or anything that could present a dated competitive-outcome
   * figure as a threshold a student can clear. */
  calendar_bound_fact_class: "cao_points_ie" | null;
  source_url: string | null;
  retrieved_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityRequirementInsert = Insertable<
  UniversityRequirement,
  | "id"
  | "created_at"
  | "updated_at"
  | "title"
  | "is_required"
  | "structured_rule"
  | "data_confidence"
  | "data_status"
  | "last_checked_at"
  | "scope"
  | "verification_state"
  | "verified_at"
  | "requirement_group_id"
  | "group_role"
  | "is_exclusion"
  | "clause_ref"
  | "test_scale"
  | "scale_ambiguity"
  | "recency_rule"
  | "excluded_provenances"
  | "evaluation_gate"
  | "conflict_group_id"
  | "research_record_id"
  | "unmet_consequence"
  | "calendar_bound_fact_class"
>;

export interface UniversityStatistic {
  id: string;
  university_id: string;
  stat_year: number | null;
  admission_rate: number | null;
  sat_range_low: number | null;
  sat_range_high: number | null;
  act_range_low: number | null;
  act_range_high: number | null;
  graduation_rate: number | null;
  cost_of_attendance: number | null;
  cost_currency: string | null;
  source: string | null;
  data_confidence: DataConfidence;
  retrieved_at: string | null;
  /** Migration 0080. Same role as universities.last_changed_at (migration 0006) and the
   * same discipline lib/universities/sync-us-universities.ts's hasStatisticsChanged
   * applies: only advances when a number genuinely differs from what this exact
   * (university_id, stat_year) row already held, never on every scheduled re-sync
   * regardless of outcome. Null until the first change is observed after this column
   * existed — see migration 0080's own comment for why it is not backfilled. */
  last_changed_at: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityStatisticInsert = Insertable<UniversityStatistic, "id" | "created_at" | "updated_at" | "data_confidence" | "last_changed_at">;

/** One row per (programme, admission cycle, scholarship/fee tier, faculty) — migration 0055,
 * revised against the live YOK Atlas API before first application. Never overwritten by the
 * next cycle's ingestion, so year-over-year trend stays queryable — see that migration's
 * comment for why this isn't columns on UniversityProgram. Column names match the source's
 * own field names verbatim (kontenjan, puanTuru, minPuan, basariSirasi, kilavuzKodu,
 * bursOraniAdi, fymkId/fymkAdi — snake_cased, not translated), confirmed directly against the
 * live API response rather than inferred from research prose. `placement_status` is only
 * "filled" | "unfilled"; a cycle Oryn hasn't researched yet is the absence of a row, not a
 * third status value. `burs_orani_adi` and `fymk_id` are part of the table's own unique key
 * (see migration 0055's comment) — a scholarship-tier or faculty variant of the same
 * programme is a genuinely distinct admission track, not a duplicate. */
export interface UniversityProgramPlacementCycle {
  id: string;
  program_id: string;
  cycle_year: number;
  cycle_label: string;
  kilavuz_kodu: string | null;
  fymk_id: string | null;
  fymk_adi: string | null;
  puan_turu: string | null;
  burs_orani_adi: string | null;
  kontenjan: number | null;
  placement_status: "filled" | "unfilled";
  basari_sirasi: number | null;
  min_puan: number | null;
  source_url: string | null;
  data_confidence: DataConfidence;
  retrieved_at: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityProgramPlacementCycleInsert = Insertable<
  UniversityProgramPlacementCycle,
  | "id"
  | "created_at"
  | "updated_at"
  | "kilavuz_kodu"
  | "fymk_id"
  | "fymk_adi"
  | "puan_turu"
  | "burs_orani_adi"
  | "kontenjan"
  | "basari_sirasi"
  | "min_puan"
  | "source_url"
  | "data_confidence"
  | "retrieved_at"
>;

export interface UniversityDeadline {
  id: string;
  university_id: string;
  program_id: string | null;
  deadline_type: string;
  deadline_date: string | null;
  application_cycle: string | null;
  source_url: string | null;
  retrieved_at: string | null;
  created_at: string;
  updated_at: string;
  // Migration 0056 (requirement/deadline shape representability). recurrence/verification_state
  // carry a DB default (`dated_specific` / `unverified`), same convention as id/created_at/
  // updated_at below — everything else here is nullable-with-no-default, matching program_id/
  // deadline_date/source_url/retrieved_at above rather than being made an optional key.
  recurrence: string;
  recurrence_month: number | null;
  recurrence_day: number | null;
  cycle_year: number | null;
  cycle_label: string | null;
  verification_state: string;
  deadline_text_verbatim: string | null;
  source_type: string | null;
  binding_policy: string | null;
  conflict_group_id: string | null;
  research_record_id: string | null;
  /** Migration 0059 (unapplied) — applicant group this DEADLINE applies to (e.g. "EU/EEA
   * citizens", "non-EU citizens"), mirroring university_requirements.scope (migration 0042)
   * exactly. Null means it applies to all applicants, NOT "unknown". Two deadline rows for the
   * same university_id+program_id with different, non-null scopes are two real dates for two
   * real populations — not a conflict (see conflict_group_id for that shape). */
  scope: string | null;
  /** Migration 0074 — identical column, same enum, same meaning as
   * university_requirements.data_status above. Added to the live schema 2026-08-31 but never
   * added here until 2026-09-02 (lib/jobs/detect-stale-data.ts's Job E extension needed it to
   * compile) — this file is hand-authored, not generated from the live schema, so a migration
   * landing does not automatically update it; caught by a real typecheck failure, not a
   * proactive audit. */
  data_status: DataStatus;
  /** Migration 0074 — NULL means never checked since ingestion, not a failure. Deliberately
   * left unbackfilled for existing rows (a timestamp would assert a verification that never
   * happened) — see that migration's own comment. */
  last_checked_at: string | null;
}
export type UniversityDeadlineInsert = Insertable<
  UniversityDeadline,
  "id" | "created_at" | "updated_at" | "recurrence" | "verification_state" | "data_status" | "last_checked_at"
>;

/** `requirement_research_queue` (migration 0051) — audit trail for the requirements research
 * handoff: every decided record lands here with its outcome, promoted or not, so an
 * excluded record is auditable rather than silently dropped (see that migration's own
 * comment). Added to types/database.ts 2026-09-02 (schema-type-drift audit) — live,
 * insert-only (no `.update()` anywhere in the codebase), and previously queried through the
 * typed client (the `scripts/apply-*`/`ingest-requirements-deadlines.ts` family) with zero
 * column checking. `_input` fields are the raw research-batch payload, un-narrowed on
 * purpose (no DB-level allowlist on any of them, migration 0051's own CREATE TABLE) — only
 * `outcome` has a CHECK constraint. RLS is disabled table-wide ("internal ingestion/admin
 * tooling only" per that migration), matching its admin-client-only access in every real
 * call site. */
export interface RequirementResearchQueue {
  id: string;
  batch_id: string;
  research_requirement_id: string;
  university_id: string | null;
  university_name_input: string | null;
  university_country_input: string | null;
  program_name_input: string | null;
  requirement_type_input: string | null;
  scope_input: string | null;
  requirement_text_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_state_input: string | null;
  raw_payload: Record<string, unknown>;
  /** `superseded` exists here but not on DeadlineResearchQueue.outcome below — checked
   * against migration 0051's own two separate CHECK constraints, not assumed symmetric. */
  outcome: "accepted" | "duplicate" | "unresolved_university" | "superseded" | "not_ingestible" | "malformed_source" | "rejected";
  outcome_detail: string | null;
  promoted_requirement_id: string | null;
  created_at: string;
}
export type RequirementResearchQueueInsert = Insertable<RequirementResearchQueue, "id" | "created_at" | "raw_payload">;

/** `deadline_research_queue` (migration 0051) — the deadline-side sibling of
 * RequirementResearchQueue above; same provenance, same access pattern, same reasoning.
 * `outcome` has no `superseded` value here — this table's own CHECK constraint is one
 * value narrower than the requirement queue's. */
export interface DeadlineResearchQueue {
  id: string;
  batch_id: string;
  research_deadline_id: string;
  university_id: string | null;
  university_name_input: string | null;
  university_country_input: string | null;
  program_name_input: string | null;
  deadline_type_input: string | null;
  deadline_date_input: string | null;
  recurrence_input: string | null;
  source_url_input: string | null;
  source_type_input: string | null;
  verification_state_input: string | null;
  raw_payload: Record<string, unknown>;
  outcome: "accepted" | "duplicate" | "unresolved_university" | "not_ingestible" | "malformed_source" | "rejected";
  outcome_detail: string | null;
  promoted_deadline_id: string | null;
  created_at: string;
}
export type DeadlineResearchQueueInsert = Insertable<DeadlineResearchQueue, "id" | "created_at" | "raw_payload">;

export interface UniversitySource {
  id: string;
  university_id: string;
  source_url: string;
  source_domain: string | null;
  source_type: string | null;
  retrieved_at: string;
  confidence: DataConfidence;
  raw_excerpt: string | null;
  created_at: string;
}
export type UniversitySourceInsert = Insertable<UniversitySource, "id" | "created_at" | "retrieved_at" | "confidence">;

/** One ranking-list placement for a university (migration 0038). A university can have
 * multiple rows across providers/editions (e.g. QS 2027, QS 2026) — always filter by
 * `ranking_provider` (and `ranking_edition` if you need a specific year) rather than
 * assuming one row per university. */
export interface UniversityRanking {
  id: string;
  university_id: string;
  ranking_provider: string;
  ranking_edition: string;
  /** Human-readable rank as published, e.g. "1", "=2", "601-610" — not always a plain integer. */
  rank_display: string;
  rank_numeric: number | null;
  list_position: number | null;
  overall_score: number | null;
  source_url: string;
  source_published_at: string | null;
  verified_at: string;
  correction_checked_at: string | null;
  data_quality_flag: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityRankingInsert = Insertable<
  UniversityRanking,
  "id" | "created_at" | "updated_at" | "verified_at" | "data_quality_flag" | "list_position" | "overall_score" | "source_published_at" | "correction_checked_at" | "notes"
>;

/** Generic key-value metric store for facts a fixed-schema table doesn't fit (migration
 * 0038) — e.g. `total_students`, `undergraduate_students`, `international_students`,
 * `student_faculty_ratio`. Unlike `university_statistics` (a narrow, fixed-column table
 * for US College-Scorecard-shaped admissions stats), this table is schema-flexible and
 * global: any `metric_code`, any country, any source. A university can have several rows
 * per `metric_code` over time (different years/scopes) — always order by `stats_as_of`
 * or filter by `scope` when you need "the" current value for a metric. */
export interface UniversityProfileMetric {
  id: string;
  university_id: string;
  metric_code: string;
  value_numeric: number | null;
  value_text: string | null;
  unit: string;
  /** Often a year ("2024"), but can be a free-text scope note ("undated (see source)",
   * an academic-year string, a page-capture marker) when the source doesn't state a clean year. */
  stats_as_of: string | null;
  /** What population the number covers, e.g. "institution" (whole university),
   * "undergraduate_plus_graduate", "full_time_students" — never assume "institution" scope
   * without checking; a system total misread as one campus's total is a real failure mode. */
  scope: string;
  precision_state: "exact" | "approximate" | "lower_bound" | "upper_bound" | "range" | "category_only" | "unknown";
  source_url: string;
  source_type: string;
  verified_at: string;
  data_quality_flag: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityProfileMetricInsert = Insertable<UniversityProfileMetric, "id" | "created_at" | "updated_at" | "verified_at" | "value_text" | "notes">;

// ---------- Target universities / applications ----------

export interface TargetUniversity {
  id: string;
  user_id: string;
  university_id: string;
  program_id: string | null;
  status: TargetStatus;
  notes: string | null;
  academic_fit_score: number | null;
  profile_fit_score: number | null;
  outlook: OutlookLabel | null;
  estimate_range_low: number | null;
  estimate_range_high: number | null;
  outlook_confidence: DataConfidence | null;
  outlook_model_version: string | null;
  outlook_calculated_at: string | null;
  created_at: string;
  updated_at: string;
}
export type TargetUniversityInsert = Insertable<TargetUniversity, "id" | "created_at" | "updated_at" | "status" | "academic_fit_score" | "profile_fit_score" | "outlook" | "estimate_range_low" | "estimate_range_high" | "outlook_confidence" | "outlook_model_version" | "outlook_calculated_at">;
export type TargetUniversityUpdate = Updatable<TargetUniversity, "id" | "user_id" | "created_at" | "updated_at">;

export interface Application {
  id: string;
  user_id: string;
  target_university_id: string;
  application_type: ApplicationType;
  deadline: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type ApplicationInsert = Insertable<Application, "id" | "created_at" | "updated_at" | "application_type" | "status">;
export type ApplicationUpdate = Updatable<Application, "id" | "user_id" | "created_at" | "updated_at">;

export interface ApplicationRequirement {
  id: string;
  application_id: string;
  user_id: string;
  requirement_type: string;
  title: string | null;
  status: RequirementStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type ApplicationRequirementInsert = Insertable<ApplicationRequirement, "id" | "created_at" | "updated_at" | "status">;
export type ApplicationRequirementUpdate = Updatable<ApplicationRequirement, "id" | "user_id" | "application_id" | "created_at" | "updated_at">;

/** Phase 69 — one student's evaluation of one university_requirements row, recomputed
 * deterministically by lib/requirements/persist.ts whenever the student views that
 * university/program (same "recompute on read" convention as admission outlook). */
export interface StudentRequirementEvaluation {
  id: string;
  user_id: string;
  requirement_id: string;
  status: RequirementEvaluationStatus;
  reasoning: string;
  evaluated_at: string;
  created_at: string;
  updated_at: string;
}
export type StudentRequirementEvaluationInsert = Insertable<StudentRequirementEvaluation, "id" | "created_at" | "updated_at" | "status" | "reasoning" | "evaluated_at">;
export type StudentRequirementEvaluationUpdate = Updatable<StudentRequirementEvaluation, "id" | "user_id" | "requirement_id" | "created_at" | "updated_at">;

// ---------- Opportunities ----------

export interface Opportunity {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  category: OpportunityCategory;
  official_url: string | null;
  application_url: string | null;
  country: string | null;
  /** Nullable since migration 0032 — null means the source didn't state it, distinct
   * from a confirmed false. Never defaulted to false by the AI extraction step
   * (lib/ai/opportunity-extraction.ts) or the DB (no column default either). */
  remote_allowed: boolean | null;
  minimum_age: number | null;
  maximum_age: number | null;
  eligible_countries: string[];
  fields: string[];
  cost: number | null;
  /** Nullable since migration 0032 — same reasoning as remote_allowed. */
  funding_available: boolean | null;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  source: string | null;
  source_url: string | null;
  source_confidence: DataConfidence;
  last_verified_at: string | null;
  status: OpportunityStatus;
  normalized_title: string;
  /** Whether the *current* application cycle is actually open — deliberately separate
   * from `status` (an admin/moderation flag). A "closed" opportunity here still exists
   * and is worth showing; it just isn't accepting applications right now. Never copy a
   * past cycle's dates forward to make this look "open" — use `date_not_announced`
   * instead when the official source hasn't published the next cycle yet. */
  cycle_status: "open" | "upcoming" | "closed" | "date_not_announced" | "historical" | "discontinued" | "unverified";
  /** Factual, evidence-based selectivity — never inferred from brand reputation alone. */
  selectivity_tier: "extremely_selective" | "highly_selective" | "selective" | "competitive_award" | "open_enrollment" | "unknown";
  verification_state: "verified_current" | "verified_historical" | "verified_derived" | "unverified" | "conflicting";
  application_open_date: string | null;
  eligible_grades: string[];
  citizenship_restrictions: string | null;
  residency_restrictions: string | null;
  /** Structured citizenship restriction (migration 0047), populated only from an unambiguous
   * official statement — distinct from the free-text citizenship_restrictions above, which
   * stays the fallback for anything too complex to safely reduce to a flat list. Empty means
   * "no structured rule known," never "open to all citizenships." Residency has no separate
   * structured column — `eligible_countries` already fills that role against the student's
   * one country-like profile field; see migration 0047's own comment. */
  eligible_citizenships: string[];
  location_mode: "online" | "in_person" | "hybrid" | null;
  financial_aid_available: boolean | null;
  application_requirements: string[];
  /** e.g. "2026-2027", "Summer 2026" — which cycle `cycle_status`/`deadline` describe. */
  current_cycle_label: string | null;
  /** Migration 0066. Languages the programme is actually taught/run in — plural because
   * bilingual programmes are common in Oryn's target markets. Empty means "not known",
   * never "no language"; the card stays silent rather than guessing. */
  languages_of_instruction: string[];
  /** Migration 0066. Oryn-hosted image of the programme, mirroring the universities
   * pipeline's storage convention. Null means no verified image yet — the card renders a
   * neutral placeholder, never a stock photo standing in for a real one. */
  image_url: string | null;
  image_source_url: string | null;
  image_attribution: string | null;
  verified_at: string | null;
  /** Identity links into canonical_entities (migration 0038) — resolved organizer/country,
   * separate from the denormalized `organization`/`country` text columns above. */
  organization_entity_id: string | null;
  country_entity_id: string | null;
  /** Migration 0059 (unapplied) — how a student actually applies. `direct`: the student
   * applies themselves. `institution_mediated`: the application channel runs through the
   * student's own school/institution independently choosing to participate (e.g. THIMUN
   * registers through a school's own MUN programme — "Only students from participating
   * schools can apply for an individual student position," `data/research/opportunities/
   * leadership_batch4_2026-08-21.jsonl`). A student can be personally eligible on every other
   * column and still have no path to apply if their institution does not participate. Null =
   * not researched — NEVER assume `direct`, that's an unverified claim, not an absence of a
   * restriction. See docs/handoffs/schema-gaps-design-2026-08-22.md §A5. */
  access_channel: "direct" | "institution_mediated" | null;
  /** Migration 0060 (unapplied) — research-confirmed "no country/citizenship gate,
   * genuinely open worldwide." Completes `eligible_countries`' tri-state: array non-empty
   * = restricted; empty + true = confirmed open (wave 1's "confirmed open stays empty"
   * convention finally has a structured home); empty + false = NOT researched — the read
   * paths surface an advisory "not verified yet" note for that case instead of silently
   * treating it as open (docs/handoffs/opportunities-eligible-countries-gap.md Key
   * Finding 1). Read defensively (`?? false`) until 0060 is applied everywhere — same
   * pattern as eligible_citizenships/0047. Never set without an official-source
   * statement; false is the honest default, not a claim of restriction. */
  country_eligibility_confirmed_open: boolean;
  created_at: string;
  updated_at: string;
}
export type OpportunityInsert = Insertable<
  Opportunity,
  | "id"
  | "created_at"
  | "updated_at"
  | "remote_allowed"
  | "eligible_countries"
  | "fields"
  | "funding_available"
  | "source_confidence"
  | "status"
  | "cycle_status"
  | "selectivity_tier"
  | "verification_state"
  | "application_open_date"
  | "eligible_grades"
  | "citizenship_restrictions"
  | "residency_restrictions"
  | "eligible_citizenships"
  | "location_mode"
  | "financial_aid_available"
  | "application_requirements"
  | "current_cycle_label"
  | "verified_at"
  | "organization_entity_id"
  | "country_entity_id"
  | "access_channel"
  | "country_eligibility_confirmed_open"
  // Migration 0066 — array has a DB default of '{}', the three image columns are nullable.
  | "languages_of_instruction"
  | "image_url"
  | "image_source_url"
  | "image_attribution"
>;
export type OpportunityUpdate = Updatable<Opportunity, "id" | "created_at" | "updated_at">;

export interface OpportunitySource {
  id: string;
  opportunity_id: string;
  source_url: string;
  source_domain: string | null;
  retrieved_at: string;
  source_type: string | null;
  confidence: DataConfidence;
  raw_excerpt: string | null;
  created_at: string;
}
export type OpportunitySourceInsert = Insertable<OpportunitySource, "id" | "created_at" | "retrieved_at" | "confidence">;

export interface OpportunityMatch {
  id: string;
  user_id: string;
  opportunity_id: string;
  eligible: boolean;
  eligibility_notes: string | null;
  relevance_score: number;
  profile_need_score: number;
  effort_estimate: string | null;
  match_score: number;
  reason_codes: unknown[];
  calculated_at: string;
  /** One of lib/scoring/signal.ts'''s own EvidenceState values (reused verbatim via that
   * file'''s evidenceStateFor(), never a second confidence vocabulary), or null when the
   * match isn'''t built on a specific profile-dimension claim (relevance/interest/proximity
   * only — see lib/opportunities/persist-matches.ts'''s own comment on this column). */
  match_confidence: "not_assessed" | "limited_evidence" | "emerging" | "developing" | "strong" | null;
}
export type OpportunityMatchInsert = Insertable<OpportunityMatch, "id" | "calculated_at" | "eligible" | "reason_codes" | "match_confidence">;

export interface SavedOpportunity {
  id: string;
  user_id: string;
  opportunity_id: string;
  status: SavedOpportunityStatus;
  not_interested_reason: string | null;
  created_at: string;
  updated_at: string;
}
export type SavedOpportunityInsert = Insertable<SavedOpportunity, "id" | "created_at" | "updated_at" | "status">;
export type SavedOpportunityUpdate = Updatable<SavedOpportunity, "id" | "user_id" | "opportunity_id" | "created_at" | "updated_at">;

// ---------- Scoring ----------

export interface ProfileScore {
  id: string;
  user_id: string;
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  calculation_version: string;
  reason_codes: unknown[];
  calculated_at: string;
}
export type ProfileScoreInsert = Insertable<ProfileScore, "id" | "calculated_at" | "confidence" | "calculation_version" | "reason_codes">;

export interface ProfileScoreSnapshot {
  id: string;
  user_id: string;
  score_version: string;
  overall_score: number;
  dimension_scores: Record<string, number>;
  snapshot_reason: string;
  created_at: string;
}
export type ProfileScoreSnapshotInsert = Insertable<ProfileScoreSnapshot, "id" | "created_at" | "score_version">;

// ---------- Planning ----------

export interface WeeklyPlan {
  id: string;
  user_id: string;
  week_start_date: string;
  summary: string | null;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}
export type WeeklyPlanInsert = Insertable<WeeklyPlan, "id" | "created_at" | "updated_at" | "status">;
export type WeeklyPlanUpdate = Updatable<WeeklyPlan, "id" | "user_id" | "created_at" | "updated_at">;

export interface WeeklyAction {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  description: string | null;
  reason: string | null;
  category: string | null;
  priority: number;
  estimated_minutes: number | null;
  impact_level: ImpactLevel;
  deadline: string | null;
  status: ActionStatus;
  source_type: string | null;
  source_id: string | null;
  reflection_outcome: ReflectionOutcome | null;
  reflection_note: string | null;
  completed_at: string | null;
  /** True once this row has survived a "Regenerate" click — see migration 0077 and
   *  lib/plan/persist.ts for why this can't be inferred from `status` alone. */
  carried_forward: boolean;
  created_at: string;
  updated_at: string;
}
export type WeeklyActionInsert = Insertable<WeeklyAction, "id" | "created_at" | "updated_at" | "priority" | "impact_level" | "status" | "carried_forward">;
export type WeeklyActionUpdate = Updatable<WeeklyAction, "id" | "user_id" | "plan_id" | "created_at" | "updated_at">;

export interface AiRecommendation {
  id: string;
  user_id: string;
  title: string;
  reason: string;
  recommendation_class: RecommendationClass;
  category: string | null;
  related_dimension: ProfileDimension | null;
  shown_at: string;
  user_response: string | null;
  completed_at: string | null;
  feedback: string | null;
  created_at: string;
}
export type AiRecommendationInsert = Insertable<AiRecommendation, "id" | "created_at" | "shown_at" | "user_response" | "completed_at" | "feedback">;
export type AiRecommendationUpdate = Updatable<AiRecommendation, "id" | "user_id" | "created_at">;

// ---------- Advisor ----------

export interface AdvisorConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}
export type AdvisorConversationInsert = Insertable<AdvisorConversation, "id" | "created_at" | "updated_at" | "title">;

export type AdvisorMessageStatus = "complete" | "failed";

export interface AdvisorMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  /** Nullable since migration 0046 — a failed assistant turn has no real content to store. */
  content: string | null;
  status: AdvisorMessageStatus;
  /** Safe, user-facing text only (see lib/ai/advisor-failure.ts) — never the raw caught error. */
  error_message: string | null;
  created_at: string;
  /** Migration 0088 — live as of 2026-09-02 (renumbered from 0087 during merge, a real
   * collision with oryn-d0's own 0087; see that migration file for the full story). Written
   * via isUndefinedColumnError's degrade-and-retry, so this is optional on every Insert/Update
   * shape below regardless of live schema state. */
  degraded: boolean;
}
export type AdvisorMessageInsert = Insertable<AdvisorMessage, "id" | "created_at" | "status" | "error_message" | "degraded">;

// ---------- Notifications ----------

export interface Notification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}
export type NotificationInsert = Insertable<Notification, "id" | "created_at" | "read_at">;

// ---------- Ops ----------

export interface ProviderHealth {
  id: string;
  provider: string;
  status: ProviderStatus;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  updated_at: string;
}

/** Migration 0094, singleton row at ADMIN_FINANCE_SETTINGS_ID (lib/admin/queries.ts) --
 *  see that migration's own header comment for why this is a typed table, not a KV store. */
export interface AdminFinanceSettings {
  id: string;
  usd_try_rate: number | null;
  usd_try_rate_updated_at: string | null;
  ultra_price_try: number;
  ultra_price_try_updated_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface ExternalSyncJob {
  id: string;
  job_name: string;
  status: SyncJobStatus;
  started_at: string;
  finished_at: string | null;
  items_processed: number;
  /** Migration 0083, not applied — see that file and lib/jobs/run-with-tracking.ts's own
   * comment. Count of per-item failures a run caught internally without the whole job
   * throwing, distinct from `error` below (the message when the entire job itself threw). */
  errors_encountered: number;
  error: string | null;
  created_at: string;
}

/** Migration 0095. Per-job "disable future runs" flag — see that migration's own comment
 *  for why this is a separate config table rather than a column on `external_sync_jobs`
 *  (a run-history log, not job configuration), and for the fail-open convention when this
 *  table itself is unapplied. */
export interface JobControl {
  job_name: string;
  disabled: boolean;
  disabled_at: string | null;
  disabled_by: string | null;
  updated_at: string;
}
export type JobControlInsert = Insertable<JobControl, "disabled_at" | "disabled_by" | "updated_at">;

export interface AiUsage {
  id: string;
  user_id: string | null;
  feature: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number | null;
  /** Migration 0076. `not null default false` — never null itself, but false both for a
   * genuinely non-degraded call and for any row predating this column (that default is the
   * honest value for "never subject to a budget decision" — see the migration's own
   * comment). */
  degraded: boolean;
  /** Migration 0076. lib/ai/limits/budget.ts's ModelSelectionReason, verbatim, only when
   * degraded is true — plain text, not a DB enum (see the migration for why). */
  degrade_reason: string | null;
  created_at: string;
}
export type AiUsageInsert = Insertable<
  AiUsage,
  "id" | "created_at" | "input_tokens" | "output_tokens" | "estimated_cost" | "degraded" | "degrade_reason"
>;

export interface RateLimitEvent {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
}
export type RateLimitEventInsert = Insertable<RateLimitEvent, "id" | "created_at">;

export interface ProductEvent {
  id: string;
  user_id: string;
  event_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
export type ProductEventInsert = Insertable<ProductEvent, "id" | "created_at" | "metadata">;

/** "application" | "opportunity" | "university_deadline" — matches lib/deadlines/scan.ts's
 * DeadlineHit["source"] exactly. Kept as a plain string in the DB (migration 0075's own
 * comment explains why), so this union exists only here and in scan.ts — not a DB enum. */
export type DeadlineNotificationSource = "application" | "opportunity" | "university_deadline";

export interface DeadlineNotificationLog {
  id: string;
  user_id: string;
  source: DeadlineNotificationSource;
  /** applications.id | opportunities.id | university_deadlines.id, per `source`. */
  source_id: string;
  /** Which REMINDER_THRESHOLDS bucket (30/14/7/3/1) this row fired for — part of the
   * dedupe key, not metadata: see migration 0075 for why a nearer bucket re-notifies. */
  threshold_days: number;
  notified_at: string;
}
export type DeadlineNotificationLogInsert = Insertable<DeadlineNotificationLog, "id" | "notified_at">;

/** 'university' (universities.last_changed_at, a core fact differed) | 'requirement'
 * (university_requirements.created_at, a brand-new row appeared) | 'deadline'
 * (university_deadlines.created_at, a brand-new deadline row appeared -- NOT an existing
 * one changing, see lib/universities/data-change-scan.ts's own top comment for the
 * architectural reason that half is deliberately unbuilt) | 'statistics'
 * (university_statistics.last_changed_at, an admission number genuinely differed) — see
 * migration 0078's own comment for 'university'/'requirement', migration 0080's for the
 * two added there, and why an existing requirement's wording changing is deliberately NOT
 * a value at all. */
export type UniversityNotificationSource = "university" | "requirement" | "deadline" | "statistics";

/** Dedupe log for the university_data_changed notification (migration 0078) — mirrors
 * DeadlineNotificationLog's role and shape; see lib/universities/data-change-scan.ts. */
export interface UniversityNotificationLog {
  id: string;
  user_id: string;
  university_id: string;
  source: UniversityNotificationSource;
  /** The source's own "this changed" timestamp this row fired for (university.last_changed_at
   * or the new requirement's created_at, per `source`) — part of the dedupe key, not
   * metadata: a later value is a new fact and re-notifies, same reasoning
   * DeadlineNotificationLog.threshold_days's own comment gives for a nearer bucket. */
  last_changed_at: string;
  notified_at: string;
}
export type UniversityNotificationLogInsert = Insertable<UniversityNotificationLog, "id" | "notified_at">;

export interface BirthYearChange {
  id: string;
  user_id: string;
  /** Null on the first-ever row for a user_id — see the table comment (migration 0072)
   * for why that's the "became known" vs. "changed" signal, deliberately not a separate
   * source column. */
  previous_value: number | null;
  new_value: number | null;
  /** Consent time as of the moment of THIS change, not looked up after the fact. */
  terms_accepted_at: string | null;
  changed_at: string;
}
/** No Insert type on purpose: profiles_log_birth_year_change is the only writer (migration
 * 0072) and the table has no INSERT policy for any role, same posture as PostRevision. */

/** Migration 0097 — append-only record of operational admin actions. See that migration's
 * own comment for why admin_id/target_user_id are nullable with a denormalized label
 * alongside each (deletion of either account must never be blocked by this table). */
export interface AdminActionLog {
  id: string;
  admin_id: string | null;
  admin_label: string;
  action: string;
  target_user_id: string | null;
  target_label: string | null;
  detail: Record<string, unknown>;
  created_at: string;
}
/** admin_id/admin_label/action are always provided by the writer (requireAdmin() guarantees
 * a real acting profile) — only the DB-defaulted and genuinely-optional-per-action fields
 * are Insertable-optional. No Update type: same insert-only posture as
 * DeadlineNotificationLog/UniversityNotificationLog above — a log entry is never edited. */
export type AdminActionLogInsert = Insertable<AdminActionLog, "id" | "target_user_id" | "target_label" | "detail" | "created_at">;

// ---------- Database aggregate (Supabase client generic shape) ----------

// `Relationships` is required by @supabase/postgrest-js's GenericTable constraint for the
// client's generic type inference to resolve at all — without it, every query on every
// table silently collapses to `never` instead of erroring, which is much harder to debug.
// We don't model foreign-key relationships (no nested `.select()` embedding is used
// anywhere in this codebase — each domain module queries its own tables directly), so
// this is always an empty tuple.
type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Identity<Row>;
  Insert: Identity<Insert>;
  Update: Identity<Update>;
  Relationships: [];
};

export interface Database {
  public: {
    Views: {
      // Same `Relationships` requirement as Table<> above (see its comment) — a view
      // entry missing it collapsed every *table* query in the whole client to `never`
      // too, not just this view, when this was first added. Keep it even though this
      // view has no Insert/Update.
      public_profiles: { Row: Identity<PublicProfileRow>; Relationships: [] };
    };
    Functions: {
      is_blocked_between: { Args: { user_a: string; user_b: string }; Returns: boolean };
      /** SECURITY DEFINER, boolean-only (migration 0058) — same rationale as
       * is_blocked_between: `profiles` RLS is owner-only, so the posts SELECT policy
       * cannot read another author's `is_public` flag as the caller. */
      is_profile_public: { Args: { p_user: string }; Returns: boolean };
      search_canonical_entities: {
        Args: { q: string; p_entity_types: string[] | null; p_limit: number };
        Returns: CanonicalEntitySearchRow[];
      };
      /** SECURITY DEFINER (migration 0039) — the only path by which a student session can
       * write to the registry, and it can only ever produce a `user_submitted` row. */
      create_or_resolve_user_submitted_entity: {
        Args: { p_entity_type: string; p_display_name: string; p_country_code: string | null; p_city: string | null };
        Returns: { entity_id: string; created_new: boolean; verification_state: EntityVerificationState }[];
      };
    };
    Tables: {
      profiles: Table<Profile, Partial<Profile>, ProfileUpdate>;
      connections: Table<Connection, ConnectionInsert, ConnectionUpdate>;
      messages: Table<Message, MessageInsert, MessageUpdate>;
      blocked_users: Table<BlockedUser, BlockedUserInsert, Partial<BlockedUserInsert>>;
      message_reports: Table<MessageReport, MessageReportInsert, MessageReportUpdate>;
      contact_info: Table<ContactInfo, ContactInfoUpsert, Partial<ContactInfoUpsert>>;
      featured_items: Table<FeaturedItem, FeaturedItemInsert, Partial<FeaturedItemInsert>>;
      skill_endorsements: Table<SkillEndorsement, SkillEndorsementInsert, Partial<SkillEndorsementInsert>>;
      recommendations: Table<Recommendation, RecommendationInsert, Partial<RecommendationInsert>>;
      profile_views: Table<ProfileView, ProfileViewInsert, Partial<ProfileViewInsert>>;
      // Social layer (migration 0058, NOT YET APPLIED — feature is switched off).
      posts: Table<Post, PostInsert, PostUpdate & PostModerationUpdate>;
      post_likes: Table<PostLike, PostLikeInsert, never>;
      post_revisions: Table<PostRevision, never, never>;
      education_records: Table<EducationRecord, EducationRecordInsert, EducationRecordUpdate>;
      courses: Table<Course, CourseInsert, CourseUpdate>;
      test_scores: Table<TestScore, TestScoreInsert, TestScoreUpdate>;
      activities: Table<Activity, ActivityInsert, ActivityUpdate>;
      awards: Table<Award, AwardInsert, AwardUpdate>;
      certifications: Table<Certification, CertificationInsert, CertificationUpdate>;
      projects: Table<Project, ProjectInsert, ProjectUpdate>;
      research_experiences: Table<ResearchExperience, ResearchExperienceInsert, ResearchExperienceUpdate>;
      volunteering_experiences: Table<VolunteeringExperience, VolunteeringExperienceInsert, VolunteeringExperienceUpdate>;
      work_experiences: Table<WorkExperience, WorkExperienceInsert, WorkExperienceUpdate>;
      sports_experiences: Table<SportsExperience, SportsExperienceInsert, SportsExperienceUpdate>;
      skills: Table<Skill, SkillInsert, SkillUpdate>;
      languages: Table<Language, LanguageInsert, LanguageUpdate>;
      evidence_files: Table<EvidenceFile, EvidenceFileInsert, EvidenceFileUpdate>;
      student_interests: Table<StudentInterest, StudentInterestInsert, StudentInterestInsert>;
      career_goals: Table<CareerGoal, CareerGoalInsert, CareerGoalUpdate>;
      canonical_entities: Table<CanonicalEntity, never, never>;
      entity_aliases: Table<EntityAlias, never, never>;
      entity_external_ids: Table<EntityExternalId, EntityExternalIdInsert, never>;
      entity_relationships: Table<EntityRelationship, EntityRelationshipInsert, never>;
      universities: Table<University, UniversityInsert, UniversityUpdate>;
      university_rankings: Table<UniversityRanking, UniversityRankingInsert, Partial<UniversityRankingInsert>>;
      university_profile_metrics: Table<UniversityProfileMetric, UniversityProfileMetricInsert, Partial<UniversityProfileMetricInsert>>;
      university_programs: Table<UniversityProgram, UniversityProgramInsert, UniversityProgramUpdate>;
      program_research_queue: Table<ProgramResearchQueue, ProgramResearchQueueInsert, Partial<ProgramResearchQueueInsert>>;
      requirement_groups: Table<RequirementGroup, RequirementGroupInsert, Partial<RequirementGroupInsert>>;
      university_requirements: Table<UniversityRequirement, UniversityRequirementInsert, Partial<UniversityRequirementInsert>>;
      university_statistics: Table<UniversityStatistic, UniversityStatisticInsert, Partial<UniversityStatisticInsert>>;
      university_program_placement_cycles: Table<UniversityProgramPlacementCycle, UniversityProgramPlacementCycleInsert, Partial<UniversityProgramPlacementCycleInsert>>;
      university_deadlines: Table<UniversityDeadline, UniversityDeadlineInsert, Partial<UniversityDeadlineInsert>>;
      requirement_research_queue: Table<RequirementResearchQueue, RequirementResearchQueueInsert, never>;
      deadline_research_queue: Table<DeadlineResearchQueue, DeadlineResearchQueueInsert, never>;
      university_sources: Table<UniversitySource, UniversitySourceInsert, Partial<UniversitySourceInsert>>;
      target_universities: Table<TargetUniversity, TargetUniversityInsert, TargetUniversityUpdate>;
      applications: Table<Application, ApplicationInsert, ApplicationUpdate>;
      application_requirements: Table<ApplicationRequirement, ApplicationRequirementInsert, ApplicationRequirementUpdate>;
      student_requirement_evaluations: Table<StudentRequirementEvaluation, StudentRequirementEvaluationInsert, StudentRequirementEvaluationUpdate>;
      opportunities: Table<Opportunity, OpportunityInsert, OpportunityUpdate>;
      opportunity_sources: Table<OpportunitySource, OpportunitySourceInsert, Partial<OpportunitySourceInsert>>;
      opportunity_matches: Table<OpportunityMatch, OpportunityMatchInsert, Partial<OpportunityMatchInsert>>;
      saved_opportunities: Table<SavedOpportunity, SavedOpportunityInsert, SavedOpportunityUpdate>;
      profile_scores: Table<ProfileScore, ProfileScoreInsert, Partial<ProfileScoreInsert>>;
      profile_score_snapshots: Table<ProfileScoreSnapshot, ProfileScoreSnapshotInsert, Partial<ProfileScoreSnapshotInsert>>;
      weekly_plans: Table<WeeklyPlan, WeeklyPlanInsert, WeeklyPlanUpdate>;
      weekly_actions: Table<WeeklyAction, WeeklyActionInsert, WeeklyActionUpdate>;
      ai_recommendations: Table<AiRecommendation, AiRecommendationInsert, AiRecommendationUpdate>;
      advisor_conversations: Table<AdvisorConversation, AdvisorConversationInsert, Partial<AdvisorConversationInsert>>;
      advisor_messages: Table<AdvisorMessage, AdvisorMessageInsert, Partial<AdvisorMessageInsert>>;
      notifications: Table<Notification, NotificationInsert, Partial<Pick<Notification, "read_at">>>;
      provider_health: Table<ProviderHealth, Partial<ProviderHealth>, Partial<ProviderHealth>>;
      external_sync_jobs: Table<ExternalSyncJob, Partial<ExternalSyncJob>, Partial<ExternalSyncJob>>;
      job_controls: Table<JobControl, JobControlInsert, Partial<JobControlInsert>>;
      ai_usage: Table<AiUsage, AiUsageInsert, Partial<AiUsageInsert>>;
      admin_finance_settings: Table<AdminFinanceSettings, Partial<AdminFinanceSettings>, Partial<AdminFinanceSettings>>;
      rate_limit_events: Table<RateLimitEvent, RateLimitEventInsert, Partial<RateLimitEventInsert>>;
      product_events: Table<ProductEvent, ProductEventInsert, Partial<ProductEventInsert>>;
      birth_year_changes: Table<BirthYearChange, never, never>;
      deadline_notification_log: Table<DeadlineNotificationLog, DeadlineNotificationLogInsert, never>;
      university_notification_log: Table<UniversityNotificationLog, UniversityNotificationLogInsert, never>;
      admin_action_log: Table<AdminActionLog, AdminActionLogInsert, never>;
    };
  };
}
