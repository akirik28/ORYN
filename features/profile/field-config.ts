import type { EntityScope } from "@/lib/entities/field-policy";
import { INTEREST_SUGGESTIONS } from "@/lib/validation/onboarding";

// Essay Story Bank (founder-confirmed MVP scope) reads this field as candidate material —
// never CV-facing, never auto-summarized. One shared field, one shared prompt list, reused
// across every achievement-shaped form below rather than seven separate structured columns.
export const STORY_NOTES_FIELD = {
  type: "textarea" as const,
  name: "story_notes",
  label: "Story notes (optional)",
  placeholder: "Why did you start? What was the hardest moment? What changed? What did you learn? Who did you work with? What was the measurable outcome? Anything you don't want to forget.",
};

export type FieldConfig =
  | { type: "text"; name: string; label: string; placeholder?: string; span?: "full" | "half" }
  | { type: "textarea"; name: string; label: string; placeholder?: string }
  | { type: "date"; name: string; label: string; span?: "full" | "half" }
  | { type: "number"; name: string; label: string; span?: "full" | "half" }
  | { type: "checkbox"; name: string; label: string }
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[]; span?: "full" | "half" }
  // Canonical Entity Autocomplete System. `name` is the existing legacy free-text column
  // (kept in sync with the linked entity's display name at selection time);
  // `entityIdField` is the nullable `*_entity_id` column that links to the canonical
  // registry. `scope` must match the entity types the database's own trigger allows for
  // that exact column — see lib/entities/field-policy.ts. `allowCustom` exposes the
  // "can't find it?" fallback; it has no effect on scopes the policy gives no custom
  // fallback type (universities/opportunities stay fully curated registries).
  | {
      type: "entity";
      name: string;
      entityIdField: string;
      label: string;
      scope: EntityScope;
      allowCustom?: boolean;
      customLabel?: string;
      placeholder?: string;
      span?: "full" | "half";
    }
  // Canonical-suggestion text field (features/entities/suggest-input.tsx) — for a small,
  // mostly-closed vocabulary (test names, course subjects) that doesn't warrant the full
  // registry `"entity"` uses. Unlike "select", never rejects or forces a value to be one of
  // `suggestions` — a genuinely custom entry is always valid and stored as typed.
  | { type: "suggest"; name: string; label: string; suggestions: string[]; placeholder?: string; span?: "full" | "half" };

/** Real, defensible test names an ORYN student plausibly reports — not the founder brief's
 * example list copied blindly (the brief explicitly warned against that): checked against
 * this app's own stated geographic focus (US/UK/Europe/Turkey — AGENTS.md) and against the
 * `test_scores` schema, which has no existing test-type enum to draw from (test_name is plain
 * text with no prior canonical list anywhere in the codebase). YKS included alongside the
 * international standard tests since Turkey is an explicit focus market and this session
 * already established YKS as a real, distinct national exam (lib/acquisition/admissions.ts's
 * application-system taxonomy). A student whose real test isn't here can still type it —
 * this is a suggestion list, not a closed set. */
export const TEST_NAME_SUGGESTIONS = [
  "SAT",
  "ACT",
  "PSAT/NMSQT",
  "AP",
  "IB Predicted",
  "IB Final",
  "A-Level",
  "IELTS Academic",
  "IELTS General Training",
  "TOEFL iBT",
  "Duolingo English Test",
  "Cambridge English (C1 Advanced)",
  "Cambridge English (C2 Proficiency)",
  "YKS",
];

export const ACTIVITY_CATEGORY_OPTIONS = [
  { value: "club", label: "Club" },
  { value: "sports", label: "Sports" },
  { value: "student_government", label: "Student government" },
  { value: "community_org", label: "Community organization" },
  { value: "summer_program", label: "Summer program" },
  { value: "academic_program", label: "Academic program" },
  { value: "competition_team", label: "Competition team" },
  { value: "other", label: "Other" },
];

export const RESEARCH_OUTPUT_OPTIONS = [
  { value: "none", label: "None yet" },
  { value: "presentation", label: "Presentation" },
  { value: "poster", label: "Poster" },
  { value: "school_journal", label: "School journal" },
  { value: "preprint", label: "Preprint" },
  { value: "peer_reviewed_publication", label: "Peer-reviewed publication" },
  { value: "other", label: "Other" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "internship", label: "Internship" },
  { value: "part_time_job", label: "Part-time job" },
  { value: "full_time_job", label: "Full-time job" },
  { value: "apprenticeship", label: "Apprenticeship" },
  { value: "freelance", label: "Freelance" },
  { value: "other", label: "Other" },
];

export const EDUCATION_STAGE_OPTIONS = [
  { value: "middle_school", label: "Middle school" },
  { value: "high_school", label: "High school" },
  { value: "pre_university", label: "Pre-university" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "other", label: "Other" },
];

export const CURRICULUM_FIELD_OPTIONS = [
  { value: "ap", label: "AP" },
  { value: "ib", label: "IB" },
  { value: "a_level", label: "A-Level" },
  { value: "turkish_curriculum", label: "Turkish curriculum" },
  { value: "national_curriculum", label: "National curriculum" },
  { value: "other", label: "Other" },
];

// Global competitive-level ontology, deliberately not US-specific varsity/JV terms —
// see supabase/migrations/0026_sports.sql.
export const SPORT_LEVEL_OPTIONS = [
  { value: "recreational", label: "Recreational" },
  { value: "school", label: "School" },
  { value: "club", label: "Club" },
  { value: "regional", label: "Regional" },
  { value: "national", label: "National" },
  { value: "international", label: "International" },
];

export const ACTIVITY_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title", placeholder: "e.g. Robotics Club Captain" },
  { type: "entity", name: "organization", entityIdField: "organization_entity_id", scope: "activity_organization", label: "Organization", allowCustom: true, customLabel: "organization", span: "half" },
  { type: "select", name: "category", label: "Category", options: ACTIVITY_CATEGORY_OPTIONS, span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "checkbox", name: "is_leadership_role", label: "This is a leadership role" },
  { type: "number", name: "people_led", label: "People led", span: "half" },
  { type: "text", name: "organization_scope", label: "Scope (e.g. school-wide, regional)", span: "half" },
  // Optional link to the canonical opportunity/program catalog — e.g. an activity that
  // IS Yale Young Global Scholars resolves via the "YYGS" alias. `opportunity_title` is
  // a display-only field (resolved at read time by lib/profile/activity-opportunities.ts,
  // stripped by ActivitySchema on save); `opportunity_id` is what persists. No custom
  // fallback: the opportunity catalog is curated, not student-extendable.
  {
    type: "entity",
    name: "opportunity_title",
    entityIdField: "opportunity_id",
    scope: "opportunity",
    label: "Oryn program/opportunity this matches (optional)",
    placeholder: "e.g. YYGS",
  },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "number", name: "weeks_per_year", label: "Weeks per year", span: "half" },
  { type: "text", name: "location", label: "Location" },
  STORY_NOTES_FIELD,
];

export const PROJECT_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "project_organization",
    label: "Organization (optional)",
    allowCustom: true,
    customLabel: "organization",
    span: "half",
  },
  { type: "text", name: "role", label: "Your role", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "textarea", name: "outcome_summary", label: "Outcome / measurable result" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "number", name: "users_reached", label: "Users reached", span: "half" },
  { type: "number", name: "revenue_amount", label: "Revenue (if any)", span: "half" },
  { type: "text", name: "repo_url", label: "Repository URL", span: "half" },
  { type: "text", name: "live_url", label: "Live URL", span: "half" },
  { type: "text", name: "location", label: "Location" },
  STORY_NOTES_FIELD,
];

export const AWARD_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "award_organization",
    label: "Awarding organization",
    allowCustom: true,
    customLabel: "organization",
    span: "half",
  },
  { type: "text", name: "level", label: "Level (school, national, international...)", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "award_date", label: "Date", span: "half" },
  { type: "text", name: "location", label: "Location", span: "half" },
  STORY_NOTES_FIELD,
];

export const RESEARCH_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "research_organization",
    label: "Organization / institution",
    allowCustom: true,
    customLabel: "institution",
    span: "half",
  },
  { type: "text", name: "mentor_name", label: "Mentor", span: "half" },
  { type: "text", name: "field", label: "Field", span: "half" },
  { type: "select", name: "output_type", label: "Output", options: RESEARCH_OUTPUT_OPTIONS, span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "textarea", name: "methodology", label: "Methodology" },
  { type: "text", name: "independence_level", label: "Your independence (e.g. led data collection)" },
  { type: "text", name: "output_url", label: "Output URL" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "text", name: "location", label: "Location" },
  STORY_NOTES_FIELD,
];

export const VOLUNTEERING_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "volunteering_organization",
    label: "Organization",
    allowCustom: true,
    customLabel: "organization",
    span: "half",
  },
  { type: "text", name: "cause_area", label: "Cause area", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "number", name: "weeks_per_year", label: "Weeks per year", span: "half" },
  { type: "text", name: "location", label: "Location" },
];

export const WORK_EXPERIENCE_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  { type: "entity", name: "organization", entityIdField: "organization_entity_id", scope: "work_organization", label: "Organization", allowCustom: true, customLabel: "employer" },
  { type: "select", name: "employment_type", label: "Type", options: EMPLOYMENT_TYPE_OPTIONS, span: "half" },
  { type: "checkbox", name: "paid", label: "Paid" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "text", name: "location", label: "Location" },
  STORY_NOTES_FIELD,
];

export const EDUCATION_FIELDS: FieldConfig[] = [
  { type: "entity", name: "school_name", entityIdField: "school_entity_id", scope: "school", label: "School name", allowCustom: true, customLabel: "school" },
  { type: "text", name: "country", label: "Country", span: "half" },
  { type: "select", name: "stage", label: "Stage", options: EDUCATION_STAGE_OPTIONS, span: "half" },
  { type: "select", name: "curriculum", label: "Curriculum", options: CURRICULUM_FIELD_OPTIONS, span: "half" },
  { type: "checkbox", name: "is_current", label: "Currently attending" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "number", name: "overall_gpa", label: "Overall GPA", span: "half" },
  { type: "number", name: "gpa_scale", label: "GPA scale (e.g. 4.0)", span: "half" },
  { type: "textarea", name: "notes", label: "Notes" },
];

/** Mirrors migration 0003's `course_level` enum exactly — the one rigor ontology, not a
 * second parallel one. */
export const COURSE_LEVEL_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "honors", label: "Honors" },
  { value: "ap", label: "AP" },
  { value: "ib_hl", label: "IB Higher Level (HL)" },
  { value: "ib_sl", label: "IB Standard Level (SL)" },
  { value: "a_level", label: "A-Level" },
  { value: "dual_enrollment", label: "Dual enrollment" },
  { value: "other", label: "Other" },
];

export const COURSE_LEVEL_LABELS: Record<string, string> = Object.fromEntries(COURSE_LEVEL_OPTIONS.map((o) => [o.value, o.label]));

export const COURSE_FIELDS: FieldConfig[] = [
  { type: "text", name: "course_name", label: "Course", placeholder: "e.g. AP Microeconomics" },
  { type: "select", name: "level", label: "Level", options: COURSE_LEVEL_OPTIONS, span: "half" },
  { type: "suggest", name: "subject", label: "Subject", suggestions: INTEREST_SUGGESTIONS, placeholder: "e.g. Economics", span: "half" },
  { type: "text", name: "academic_year", label: "Academic year", placeholder: "e.g. 2026-27", span: "half" },
  { type: "text", name: "grade_value", label: "Grade (optional)", placeholder: "e.g. A, 5, 7", span: "half" },
  { type: "text", name: "grade_scale", label: "Grade scale (optional)", placeholder: "e.g. A-F, 1-5, 1-7", span: "half" },
  { type: "number", name: "credit_hours", label: "Credit hours (optional)", span: "half" },
];

export const TEST_SCORE_FIELDS: FieldConfig[] = [
  { type: "suggest", name: "test_name", label: "Test name", suggestions: TEST_NAME_SUGGESTIONS, placeholder: "e.g. SAT, IB Predicted" },
  { type: "text", name: "score", label: "Score", span: "half" },
  { type: "text", name: "max_score", label: "Max score", span: "half" },
  { type: "date", name: "test_date", label: "Date" },
];

export const CERTIFICATION_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "certification_organization",
    label: "Issuing organization",
    allowCustom: true,
    customLabel: "organization",
  },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "issue_date", label: "Issue date", span: "half" },
  { type: "date", name: "expiry_date", label: "Expiry date", span: "half" },
  { type: "text", name: "credential_url", label: "Credential URL" },
];

export const GOAL_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "abandoned", label: "Abandoned" },
];

export const GOAL_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Goal", placeholder: "e.g. Study Economics in the UK" },
  { type: "text", name: "category", label: "Category (optional)", placeholder: "e.g. Academics, Career", span: "half" },
  { type: "date", name: "target_date", label: "Target date", span: "half" },
  { type: "select", name: "status", label: "Status", options: GOAL_STATUS_OPTIONS },
];

export const SPORTS_FIELDS: FieldConfig[] = [
  { type: "text", name: "sport", label: "Sport", placeholder: "e.g. Swimming", span: "half" },
  { type: "text", name: "discipline", label: "Discipline / event", placeholder: "e.g. 200m Freestyle", span: "half" },
  {
    type: "entity",
    name: "team_name",
    entityIdField: "team_entity_id",
    scope: "sports_team",
    label: "Team / club / school",
    allowCustom: true,
    customLabel: "team, club, or school",
    span: "half",
  },
  { type: "text", name: "position", label: "Position / role", span: "half" },
  { type: "select", name: "level", label: "Competitive level", options: SPORT_LEVEL_OPTIONS, span: "half" },
  { type: "text", name: "us_specific_label", label: "Other label (optional, e.g. Varsity)", span: "half" },
  { type: "checkbox", name: "is_captain", label: "Captain / team leader" },
  { type: "textarea", name: "achievements", label: "Achievements / rankings / results" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "number", name: "weeks_per_year", label: "Weeks per year", span: "half" },
  { type: "text", name: "location", label: "Location" },
];

export const SKILL_CATEGORY_OPTIONS = [
  { value: "technical", label: "Technical" },
  { value: "creative", label: "Creative" },
  { value: "analytical", label: "Analytical" },
  { value: "communication", label: "Communication" },
  { value: "leadership", label: "Leadership" },
  { value: "other", label: "Other" },
];

/** Max 15, no obvious duplicates (spec) — enforced server-side in
 * app/(app)/profile/skills-actions.ts, not just by leaving this list short. Self-declared,
 * so a weak Digital Twin signal on its own (spec: Digital Twin rules) — endorsements from
 * accepted connections add real context on top, but neither becomes a quantitative score. */
export const SKILL_FIELDS: FieldConfig[] = [
  { type: "text", name: "name", label: "Skill", placeholder: "e.g. Python, Public speaking", span: "half" },
  { type: "select", name: "category", label: "Category", options: SKILL_CATEGORY_OPTIONS, span: "half" },
  { type: "text", name: "proficiency", label: "Proficiency (optional)", placeholder: "e.g. Intermediate" },
];
