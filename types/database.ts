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
export type OutlookLabel = "extreme_reach" | "reach" | "competitive" | "strong" | "likely";
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
export type OpportunityCategory = "competition" | "research" | "internship" | "summer_program" | "fellowship" | "scholarship" | "volunteering" | "entrepreneurship" | "hackathon" | "academic_program" | "conference" | "student_program";
export type OpportunityStatus = "active" | "expired" | "under_review" | "disabled";
export type SavedOpportunityStatus = "saved" | "applied" | "not_interested";
export type ProfileDimension = "academics" | "intellectual_curiosity" | "leadership" | "research" | "entrepreneurship" | "community_impact" | "awards_distinction" | "career_exploration" | "execution_project_depth";
export type PlanStatus = "active" | "completed" | "superseded";
export type ActionStatus = "not_started" | "in_progress" | "completed" | "skipped" | "expired";
export type ImpactLevel = "low" | "medium" | "high" | "very_high";
export type ReflectionOutcome = "completed_successfully" | "partially_completed" | "did_not_work" | "opportunity_no_longer_available";
export type RecommendationClass = "do" | "consider" | "deprioritize" | "avoid_for_now";
export type MessageRole = "user" | "assistant";
export type NotificationCategory =
  | "deadline"
  | "new_opportunity"
  | "weekly_plan"
  | "profile_update"
  | "university_data_changed"
  | "system"
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
  country: string | null;
  city: string | null;
  school_name: string | null;
  /** Canonical Entity Autocomplete System — preferred over school_name once set; kept in
   * sync with the linked institution's canonical name at selection time. */
  school_id: string | null;
  graduation_year: number | null;
  curriculum: CurriculumType | null;
  preferred_language: string;
  timezone: string;
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
  created_at: string;
  updated_at: string;
}
export type ProfileUpdate = Updatable<Profile, "id" | "created_at" | "updated_at">;

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
  reason: string;
  status: MessageReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
  created_at: string;
}
export type MessageReportInsert = Insertable<
  MessageReport,
  "id" | "created_at" | "status" | "reviewed_by" | "reviewed_at" | "resolution_note" | "message_id" | "recommendation_id"
>;
export type MessageReportUpdate = Updatable<
  MessageReport,
  "id" | "reporter_id" | "reported_user_id" | "message_id" | "recommendation_id" | "reason" | "created_at"
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
  organization_id: string | null;
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
  school_id: string | null;
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
export type EducationRecordInsert = Insertable<EducationRecord, "id" | "created_at" | "updated_at" | "stage" | "is_current" | "school_id">;
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
  "id" | "created_at" | "updated_at" | "category" | "is_leadership_role" | "ongoing" | "source" | "evidence_status" | "organization_id" | "opportunity_id"
>;
export type ActivityUpdate = Updatable<Activity, "id" | "user_id" | "created_at" | "updated_at">;

export interface Award {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  organization_id: string | null;
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
export type AwardInsert = Insertable<Award, "id" | "created_at" | "updated_at" | "source" | "evidence_status" | "organization_id">;
export type AwardUpdate = Updatable<Award, "id" | "user_id" | "created_at" | "updated_at">;

export interface Certification {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  organization_id: string | null;
  description: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  credential_url: string | null;
  source: string;
  evidence_status: EvidenceStatus;
  created_at: string;
  updated_at: string;
}
export type CertificationInsert = Insertable<Certification, "id" | "created_at" | "updated_at" | "source" | "evidence_status" | "organization_id">;
export type CertificationUpdate = Updatable<Certification, "id" | "user_id" | "created_at" | "updated_at">;

export interface Project extends AchievementCommon {
  role: string | null;
  outcome_summary: string | null;
  users_reached: number | null;
  revenue_amount: number | null;
  repo_url: string | null;
  live_url: string | null;
}
export type ProjectInsert = Insertable<Project, "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "organization_id">;
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
  "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "output_type" | "organization_id"
>;
export type ResearchExperienceUpdate = Updatable<ResearchExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface VolunteeringExperience extends AchievementCommon {
  cause_area: string | null;
  weeks_per_year: number | null;
}
export type VolunteeringExperienceInsert = Insertable<VolunteeringExperience, "id" | "created_at" | "updated_at" | "ongoing" | "source" | "evidence_status" | "organization_id">;
export type VolunteeringExperienceUpdate = Updatable<VolunteeringExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface WorkExperience {
  id: string;
  user_id: string;
  title: string;
  organization: string;
  organization_id: string | null;
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
export type WorkExperienceInsert = Insertable<WorkExperience, "id" | "created_at" | "updated_at" | "employment_type" | "ongoing" | "source" | "evidence_status" | "organization_id">;
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
  team_organization_id: string | null;
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
export type SportsExperienceInsert = Insertable<SportsExperience, "id" | "created_at" | "updated_at" | "is_captain" | "ongoing" | "source" | "evidence_status" | "team_organization_id">;
export type SportsExperienceUpdate = Updatable<SportsExperience, "id" | "user_id" | "created_at" | "updated_at">;

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: SkillCategory;
  proficiency: string | null;
  created_at: string;
  updated_at: string;
}
export type SkillInsert = Insertable<Skill, "id" | "created_at" | "updated_at" | "category">;
export type SkillUpdate = Updatable<Skill, "id" | "user_id" | "created_at" | "updated_at">;

export interface Language {
  id: string;
  user_id: string;
  name: string;
  proficiency: string | null;
  created_at: string;
  updated_at: string;
}
export type LanguageInsert = Insertable<Language, "id" | "created_at" | "updated_at">;
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

// ---------- Institutions (Canonical Entity Autocomplete System, migration 0038) ----------

export type InstitutionCategory = "school" | "organization";
export type InstitutionStatus = "verified" | "unverified";

export interface Institution {
  id: string;
  category: InstitutionCategory;
  canonical_name: string;
  institution_type: string | null;
  country: string | null;
  city: string | null;
  website_url: string | null;
  domain: string | null;
  local_language_name: string | null;
  english_name: string | null;
  aliases: string[];
  status: InstitutionStatus;
  created_by: string | null;
  source: string | null;
  data_confidence: DataConfidence | null;
  created_at: string;
  updated_at: string;
}
export type InstitutionInsert = Insertable<
  Institution,
  | "id"
  | "created_at"
  | "updated_at"
  | "institution_type"
  | "country"
  | "city"
  | "website_url"
  | "domain"
  | "local_language_name"
  | "english_name"
  | "aliases"
  | "status"
  | "created_by"
  | "source"
  | "data_confidence"
>;
export type InstitutionUpdate = Updatable<Institution, "id" | "category" | "created_at" | "updated_at" | "created_by">;

// ---------- Universities (global reference data) ----------

export interface University {
  id: string;
  name: string;
  country: string;
  city: string | null;
  institution_type: string | null;
  /** Search-only alternate names/abbreviations (e.g. "MIT") — never the display name
   * (Canonical Entity Autocomplete System, migration 0038). */
  aliases: string[];
  website_url: string | null;
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
  | "aliases"
>;
export type UniversityUpdate = Updatable<University, "id" | "created_at" | "updated_at">;

export interface UniversityProgram {
  id: string;
  university_id: string;
  name: string;
  degree_level: string | null;
  field: string | null;
  duration_years: number | null;
  tuition_amount: number | null;
  tuition_currency: string | null;
  language_of_instruction: string | null;
  data_confidence: DataConfidence;
  created_at: string;
  updated_at: string;
}
export type UniversityProgramInsert = Insertable<UniversityProgram, "id" | "created_at" | "updated_at" | "data_confidence">;

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
  source_url: string | null;
  retrieved_at: string | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}
export type UniversityRequirementInsert = Insertable<
  UniversityRequirement,
  "id" | "created_at" | "updated_at" | "title" | "is_required" | "structured_rule" | "data_confidence" | "data_status" | "last_checked_at"
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
  created_at: string;
  updated_at: string;
}
export type UniversityStatisticInsert = Insertable<UniversityStatistic, "id" | "created_at" | "updated_at" | "data_confidence">;

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
}
export type UniversityDeadlineInsert = Insertable<UniversityDeadline, "id" | "created_at" | "updated_at">;

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
  /** Search-only alternate names/abbreviations (e.g. "YYGS") — never the display name
   * (Canonical Entity Autocomplete System, migration 0038). */
  aliases: string[];
  created_at: string;
  updated_at: string;
}
export type OpportunityInsert = Insertable<
  Opportunity,
  "id" | "created_at" | "updated_at" | "remote_allowed" | "eligible_countries" | "fields" | "funding_available" | "source_confidence" | "status" | "aliases"
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
}
export type OpportunityMatchInsert = Insertable<OpportunityMatch, "id" | "calculated_at" | "eligible" | "reason_codes">;

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
  created_at: string;
  updated_at: string;
}
export type WeeklyActionInsert = Insertable<WeeklyAction, "id" | "created_at" | "updated_at" | "priority" | "impact_level" | "status">;
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

export interface AdvisorMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}
export type AdvisorMessageInsert = Insertable<AdvisorMessage, "id" | "created_at">;

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

export interface ExternalSyncJob {
  id: string;
  job_name: string;
  status: SyncJobStatus;
  started_at: string;
  finished_at: string | null;
  items_processed: number;
  error: string | null;
  created_at: string;
}

export interface AiUsage {
  id: string;
  user_id: string | null;
  feature: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost: number | null;
  created_at: string;
}
export type AiUsageInsert = Insertable<AiUsage, "id" | "created_at" | "input_tokens" | "output_tokens" | "estimated_cost">;

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
      institutions: Table<Institution, InstitutionInsert, InstitutionUpdate>;
      universities: Table<University, UniversityInsert, UniversityUpdate>;
      university_programs: Table<UniversityProgram, UniversityProgramInsert, Partial<UniversityProgramInsert>>;
      university_requirements: Table<UniversityRequirement, UniversityRequirementInsert, Partial<UniversityRequirementInsert>>;
      university_statistics: Table<UniversityStatistic, UniversityStatisticInsert, Partial<UniversityStatisticInsert>>;
      university_deadlines: Table<UniversityDeadline, UniversityDeadlineInsert, Partial<UniversityDeadlineInsert>>;
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
      ai_usage: Table<AiUsage, AiUsageInsert, Partial<AiUsageInsert>>;
      rate_limit_events: Table<RateLimitEvent, RateLimitEventInsert, Partial<RateLimitEventInsert>>;
      product_events: Table<ProductEvent, ProductEventInsert, Partial<ProductEventInsert>>;
    };
  };
}
