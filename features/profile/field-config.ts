import type { EntityScope } from "@/lib/entities/field-policy";
import type { Locale } from "@/lib/i18n/config";
import { INTEREST_SUGGESTIONS } from "@/lib/validation/onboarding";
import { COURSE_NAME_SUGGESTIONS } from "@/lib/vocabularies/subjects";
import { TEST_NAME_SUGGESTIONS } from "@/lib/vocabularies/tests";
import { COUNTRY_SUGGESTIONS } from "@/lib/vocabularies/countries";
import { AWARD_LEVEL_SUGGESTIONS, CAUSE_AREA_SUGGESTIONS, PROFICIENCY_SUGGESTIONS } from "@/lib/vocabularies/profile-fields";
import { SKILL_NAME_SUGGESTIONS } from "@/lib/vocabularies/skills";
import { LANGUAGE_NAME_SUGGESTIONS, LANGUAGE_PROFICIENCY_OPTIONS } from "@/lib/vocabularies/languages";
import { SPORT_NAME_SUGGESTIONS } from "@/lib/vocabularies/sports";

// Essay Story Bank (founder-confirmed MVP scope) reads this field as candidate material —
// never CV-facing, never auto-summarized. One shared field, one shared prompt list, reused
// across every achievement-shaped form below rather than seven separate structured columns.
export const STORY_NOTES_FIELD = {
  type: "textarea" as const,
  name: "story_notes",
  label: "Story notes (optional)",
  placeholder: "Why did you start? What was the hardest moment? What changed? What did you learn? Who did you work with? What was the measurable outcome? Anything you don't want to forget.",
};

// `quickAdd: true` marks a field as part of an entity's *meaningful initial record* — the
// minimum that makes the record true and useful (a test score without a score isn't a test
// score record). Everything else is *accessible enrichment*: reachable via Edit on the same
// entity, never removed, just not asked for up front. QuickAddEntry (quick-add-entry.tsx)
// renders exactly `fields.filter(f => f.quickAdd)` per entity — same FieldConfig objects the
// full Edit dialog already uses, so a label/placeholder/option list never has two copies to
// drift apart. See that file's header comment for the full basic/advanced rationale.
// `showWhen`, added 2026-09-03 for curriculum_other_text (migration 0109, proposed and not
// yet applied): a general mechanism on FieldConfig/DynamicFormFields rather than a one-off
// conditional hand-written into achievement-section.tsx/quick-add-entry.tsx. Chosen over the
// special-case alternative because both of those are generic components shared by every
// achievement type, not education-specific — special-casing "if this is education_records
// and curriculum is other" into each of them would mean duplicating that logic twice, in
// files that have no other reason to know about curriculum at all. A single optional
// predicate, checked once in DynamicFormFields's own render loop, costs every OTHER field
// nothing (unset = always render, today's exact behavior) and gives any future
// value-dependent field the same mechanism for free. The trade a one-off would have avoided
// — a second, more general-purpose primitive to maintain — is worth naming: this is the
// bigger piece of infrastructure of the two options, not the smaller one.
export type FieldConfig =
  | { type: "text"; name: string; label: string; placeholder?: string; span?: "full" | "half"; quickAdd?: boolean; showWhen?: (values: Record<string, string | number | boolean | null>) => boolean }
  | { type: "textarea"; name: string; label: string; placeholder?: string; quickAdd?: boolean; showWhen?: (values: Record<string, string | number | boolean | null>) => boolean }
  | { type: "date"; name: string; label: string; span?: "full" | "half"; quickAdd?: boolean; showWhen?: (values: Record<string, string | number | boolean | null>) => boolean }
  | { type: "number"; name: string; label: string; span?: "full" | "half"; quickAdd?: boolean; showWhen?: (values: Record<string, string | number | boolean | null>) => boolean }
  | { type: "checkbox"; name: string; label: string; quickAdd?: boolean; showWhen?: (values: Record<string, string | number | boolean | null>) => boolean }
  | {
      type: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      placeholder?: string;
      span?: "full" | "half";
      quickAdd?: boolean;
      showWhen?: (values: Record<string, string | number | boolean | null>) => boolean;
    }
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
      quickAdd?: boolean;
      showWhen?: (values: Record<string, string | number | boolean | null>) => boolean;
    }
  // Canonical-suggestion text field (features/entities/suggest-input.tsx) — for a small,
  // mostly-closed vocabulary (test names, course subjects) that doesn't warrant the full
  // registry `"entity"` uses. Unlike "select", never rejects or forces a value to be one of
  // `suggestions` — a genuinely custom entry is always valid and stored as typed.
  | {
      type: "suggest";
      name: string;
      label: string;
      suggestions: string[];
      placeholder?: string;
      span?: "full" | "half";
      quickAdd?: boolean;
      showWhen?: (values: Record<string, string | number | boolean | null>) => boolean;
    };


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

// Plain suggestion lists, not `select` options like SPORT_LEVEL_OPTIONS above: every one
// of these three fields is explicitly optional (nullable, no default), and DynamicFormFields'
// `type: "select"` always resolves to a concrete value (`field.options[0]?.value` when
// unset — see that component) — forcing one of these into a `select` would silently turn
// "unset" into "Academics"/"Beginner"/"School" the moment the form re-renders. `suggest`
// preserves genuine optionality (an empty SuggestInput stays empty) while still cutting
// fragmentation for the common cases.
export const GOAL_CATEGORY_SUGGESTIONS = ["Academics", "Career", "Personal", "Financial", "Community/Leadership"];

export const ACTIVITY_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title", placeholder: "e.g. Robotics Club Captain", quickAdd: true },
  { type: "entity", name: "organization", entityIdField: "organization_entity_id", scope: "activity_organization", label: "Organization", allowCustom: true, customLabel: "organization", span: "half", quickAdd: true },
  { type: "select", name: "category", label: "Category", options: ACTIVITY_CATEGORY_OPTIONS, span: "half", quickAdd: true },
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
  { type: "text", name: "title", label: "Title", quickAdd: true },
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
  { type: "text", name: "title", label: "Title", quickAdd: true },
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
  { type: "suggest", name: "level", label: "Level", suggestions: AWARD_LEVEL_SUGGESTIONS, placeholder: "e.g. School, National, International", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "award_date", label: "Date", span: "half" },
  { type: "text", name: "location", label: "Location", span: "half" },
  STORY_NOTES_FIELD,
];

export const RESEARCH_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title", quickAdd: true },
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
  { type: "suggest", name: "field", label: "Field", suggestions: INTEREST_SUGGESTIONS, placeholder: "e.g. Economics", span: "half", quickAdd: true },
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
  { type: "text", name: "title", label: "Title", quickAdd: true },
  {
    type: "entity",
    name: "organization",
    entityIdField: "organization_entity_id",
    scope: "volunteering_organization",
    label: "Organization",
    allowCustom: true,
    customLabel: "organization",
    span: "half",
    quickAdd: true,
  },
  { type: "suggest", name: "cause_area", label: "Cause area", suggestions: CAUSE_AREA_SUGGESTIONS, placeholder: "e.g. Education", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "checkbox", name: "ongoing", label: "Ongoing" },
  { type: "number", name: "hours_per_week", label: "Hours per week", span: "half" },
  { type: "number", name: "weeks_per_year", label: "Weeks per year", span: "half" },
  { type: "text", name: "location", label: "Location" },
];

export const WORK_EXPERIENCE_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title", quickAdd: true },
  { type: "entity", name: "organization", entityIdField: "organization_entity_id", scope: "work_organization", label: "Organization", allowCustom: true, customLabel: "employer", quickAdd: true },
  { type: "select", name: "employment_type", label: "Type", options: EMPLOYMENT_TYPE_OPTIONS, span: "half", quickAdd: true },
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
  { type: "entity", name: "school_name", entityIdField: "school_entity_id", scope: "school", label: "School name", allowCustom: true, customLabel: "school", quickAdd: true },
  { type: "suggest", name: "country", label: "Country", suggestions: COUNTRY_SUGGESTIONS, placeholder: "e.g. United States", span: "half" },
  { type: "select", name: "stage", label: "Stage", options: EDUCATION_STAGE_OPTIONS, span: "half", quickAdd: true },
  { type: "select", name: "curriculum", label: "Curriculum", options: CURRICULUM_FIELD_OPTIONS, span: "half" },
  // CURRICULUM_OTHER_TEXT_FIELD (below) is deliberately NOT spliced in here — see its own
  // comment. app/(app)/profile/page.tsx inserts it into a copy of this array only once the
  // migration 0109 column is confirmed live.
  { type: "checkbox", name: "is_current", label: "Currently attending" },
  { type: "date", name: "start_date", label: "Start date", span: "half" },
  { type: "date", name: "end_date", label: "End date", span: "half" },
  { type: "number", name: "overall_gpa", label: "Overall GPA", span: "half" },
  { type: "number", name: "gpa_scale", label: "GPA scale (e.g. 4.0)", span: "half" },
  { type: "textarea", name: "notes", label: "Notes" },
];

/**
 * Migration 0109, proposed and not yet applied — free text for when `curriculum` is
 * "other", since that value otherwise captures nothing (see that migration's own header).
 * Exported separately from EDUCATION_FIELDS rather than included in it directly: this field
 * must not exist in the array at all when the column isn't live yet (app/(app)/profile/
 * page.tsx splices it in only after confirming that), which a static array entry can't
 * express — showWhen alone only controls curriculum-value-dependent visibility, not
 * column-existence-dependent visibility. `span: "full"` rather than pairing it with another
 * half-width field in the grid, since a qualification name reads better on its own line than
 * squeezed next to an unrelated field.
 */
export const CURRICULUM_OTHER_TEXT_FIELD: FieldConfig = {
  type: "text",
  name: "curriculum_other_text",
  label: "Which qualification?",
  placeholder: "e.g. German Abitur, Italian Maturità",
  span: "full",
  showWhen: (values) => values.curriculum === "other",
};

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
  { type: "suggest", name: "course_name", label: "Course", suggestions: COURSE_NAME_SUGGESTIONS, placeholder: "e.g. AP Microeconomics", quickAdd: true },
  { type: "select", name: "level", label: "Level", options: COURSE_LEVEL_OPTIONS, span: "half" },
  { type: "suggest", name: "subject", label: "Subject", suggestions: INTEREST_SUGGESTIONS, placeholder: "e.g. Economics", span: "half" },
  { type: "text", name: "academic_year", label: "Academic year", placeholder: "e.g. 2026-27", span: "half" },
  { type: "text", name: "grade_value", label: "Grade (optional)", placeholder: "e.g. A, 5, 7", span: "half" },
  { type: "text", name: "grade_scale", label: "Grade scale (optional)", placeholder: "e.g. A-F, 1-5, 1-7", span: "half" },
  { type: "number", name: "credit_hours", label: "Credit hours (optional)", span: "half" },
];

export const TEST_SCORE_FIELDS: FieldConfig[] = [
  { type: "suggest", name: "test_name", label: "Test name", suggestions: TEST_NAME_SUGGESTIONS, placeholder: "e.g. SAT, IB Predicted", quickAdd: true },
  // Free text, deliberately not `type: "number"` — a strict numeric input would reject
  // legitimate non-numeric scores (IB "38", AP "5", CEFR-style "C1", a letter grade). The
  // score/max_score numeric-relationship check (TestScoreSchema in
  // lib/validation/achievements.ts) still catches an impossible *numeric* pair; a
  // non-numeric score just skips that check rather than being blocked from saving at all.
  { type: "text", name: "score", label: "Score", span: "half", quickAdd: true },
  { type: "text", name: "max_score", label: "Max score", span: "half", quickAdd: true },
  { type: "date", name: "test_date", label: "Date", quickAdd: true },
];

export const CERTIFICATION_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title", quickAdd: true },
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
  { type: "text", name: "title", label: "Goal", placeholder: "e.g. Study Economics in the UK", quickAdd: true },
  { type: "suggest", name: "category", label: "Category (optional)", suggestions: GOAL_CATEGORY_SUGGESTIONS, placeholder: "e.g. Academics, Career", span: "half" },
  { type: "date", name: "target_date", label: "Target date", span: "half" },
  { type: "select", name: "status", label: "Status", options: GOAL_STATUS_OPTIONS },
];

export const SPORTS_FIELDS: FieldConfig[] = [
  { type: "suggest", name: "sport", label: "Sport", suggestions: SPORT_NAME_SUGGESTIONS, placeholder: "e.g. Swimming", span: "half", quickAdd: true },
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
    quickAdd: true,
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
export const LANGUAGE_FIELDS: FieldConfig[] = [
  { type: "suggest", name: "name", label: "Language", suggestions: LANGUAGE_NAME_SUGGESTIONS, placeholder: "e.g. English, Turkish", span: "half" },
  // A select, not a suggest: the whole reason this column holds CEFR values is that they
  // are comparable against a stated university requirement, which free text isn't.
  { type: "select", name: "proficiency", label: "Proficiency", options: LANGUAGE_PROFICIENCY_OPTIONS, span: "half" },
];

export const SKILL_FIELDS: FieldConfig[] = [
  { type: "suggest", name: "name", label: "Skill", suggestions: SKILL_NAME_SUGGESTIONS, placeholder: "e.g. Python, Public speaking", span: "half" },
  { type: "select", name: "category", label: "Category", options: SKILL_CATEGORY_OPTIONS, span: "half" },
  { type: "suggest", name: "proficiency", label: "Proficiency (optional)", suggestions: PROFICIENCY_SUGGESTIONS, placeholder: "e.g. Intermediate" },
];

// ---------------------------------------------------------------------------
// Locale (2026-09-01 first-run i18n pass)
//
// Every FieldConfig array above is English-only source data, same shape as every other
// English map this session has added a locale-aware accessor beside (dimensionLabel,
// eligibilityMessages, completenessChecklistLabel) -- the arrays themselves stay untouched,
// and localizeFields() below is the opt-in path for the three real consumers
// (achievement-section.tsx, dynamic-form-fields.tsx, quick-add-entry.tsx).
//
// Keyed by the exact English source string, not by field `name` -- `name` is already a
// stable identifier (the underlying DB column, e.g. "start_date"), but the SAME name means
// different things in different arrays (SPORTS_FIELDS's "level" is Recreational..
// International; COURSE_FIELDS's "level" is Regular..Dual enrollment) while the SAME
// English text always means the same thing regardless of which array it appears in, which
// is also why STORY_NOTES_FIELD only needs translating once despite being shared by five
// arrays. AP/IB/A-Level/Honors are deliberately absent from the map below and fall through
// to English -- established loanwords for curriculum terms with no natural Turkish
// equivalent, same convention this codebase already uses elsewhere (onboarding-wizard.tsx's
// own curriculum options).
//
// `customLabel` (5 values: employer/institution/organization/school/"team, club, or
// school") is deliberately NOT translated here -- it's free text that belongs to
// features/entities/entity-combobox.tsx and lib/entities/field-policy.ts's territory, and
// that file's own header comment already explains why (the Turkish cantFind/addTitle
// catalog keys are built not to need the noun translated at all).
// ---------------------------------------------------------------------------

const FIELD_TEXT_TR: Record<string, string> = {
  // The 8 LANGUAGE_PROFICIENCY_OPTIONS labels (lib/vocabularies/languages.ts) — kept in sync
  // with that file's own LANGUAGE_PROFICIENCY_TR by hand rather than importing it, since the
  // two are read by genuinely different mechanisms (this map by exact-string lookup inside
  // localizeFields; that file's by CEFR `value` inside languageProficiencyLabel/Hint) and a
  // shared import would couple a presentation-layer resolver to a vocabulary module's
  // internal data shape for no real benefit — same reasoning as every other option-array
  // string in this file living here rather than being re-exported from its source module.
  "A1 — Beginner": "A1 — Başlangıç Düzeyi",
  "A2 — Elementary": "A2 — Temel Düzey",
  "Abandoned": "Vazgeçildi",
  "Academic program": "Akademik program",
  "Academic year": "Akademik yıl",
  "Academics": "Akademik",
  "Achieved": "Ulaşıldı",
  "Achievements / rankings / results": "Başarılar / sıralamalar / sonuçlar",
  "Active": "Aktif",
  "Analytical": "Analitik",
  "Apprenticeship": "Çıraklık",
  "Awarding organization": "Ödülü veren kurum",
  "B1 — Intermediate": "B1 — Orta Düzey",
  "B2 — Upper intermediate": "B2 — Üst Orta Düzey",
  "Bilingual": "İki Dilli",
  "Captain / team leader": "Kaptan / takım lideri",
  "Career": "Kariyer",
  "Category": "Kategori",
  "Category (optional)": "Kategori (opsiyonel)",
  "Cause area": "Amaç alanı",
  "Club": "Kulüp",
  "Communication": "İletişim",
  "Community organization": "Toplum kuruluşu",
  "Community/Leadership": "Topluluk/Liderlik",
  "Competition team": "Yarışma takımı",
  "Competitive level": "Yarışma seviyesi",
  "C1 — Advanced": "C1 — İleri Düzey",
  "C2 — Mastery": "C2 — Ustalık",
  "Country": "Ülke",
  "Course": "Ders",
  "Creative": "Yaratıcı",
  "Credential URL": "Belge URL'si",
  "Credit hours (optional)": "Kredi saati (opsiyonel)",
  "Currently attending": "Şu anda devam ediyor",
  "Curriculum": "Müfredat",
  "Date": "Tarih",
  "Description": "Açıklama",
  "Discipline / event": "Disiplin / etkinlik",
  "Dual enrollment": "Çift kayıt",
  "End date": "Bitiş tarihi",
  "Expiry date": "Geçerlilik bitiş tarihi",
  "Field": "Alan",
  "Financial": "Finansal",
  "Freelance": "Serbest çalışma",
  "Full-time job": "Tam zamanlı iş",
  "GPA scale (e.g. 4.0)": "Not ortalaması ölçeği (örn. 4.0)",
  "Goal": "Hedef",
  "Grade (optional)": "Not (opsiyonel)",
  "Grade scale (optional)": "Not ölçeği (opsiyonel)",
  "High school": "Lise",
  "Hours per week": "Haftalık saat",
  "IB Higher Level (HL)": "IB Üst Düzey (HL)",
  "IB Standard Level (SL)": "IB Standart Düzey (SL)",
  "International": "Uluslararası",
  "Internship": "Staj",
  "Issue date": "Veriliş tarihi",
  "Issuing organization": "Veren kurum",
  "Language": "Dil",
  "Leadership": "Liderlik",
  "Level": "Seviye",
  "Live URL": "Canlı URL",
  "Location": "Konum",
  "Max score": "Azami puan",
  "Mentor": "Mentor",
  "Methodology": "Metodoloji",
  "Middle school": "Ortaokul",
  "Native": "Anadil",
  "National": "Ulusal",
  "National curriculum": "Ulusal müfredat",
  "None yet": "Henüz yok",
  "Notes": "Notlar",
  "Ongoing": "Devam ediyor",
  "Organization": "Kurum",
  "Organization (optional)": "Kurum (opsiyonel)",
  "Organization / institution": "Kurum / enstitü",
  "Oryn program/opportunity this matches (optional)": "Bununla eşleşen Oryn programı/fırsatı (opsiyonel)",
  "Other": "Diğer",
  "Other label (optional, e.g. Varsity)": "Diğer etiket (opsiyonel, örn. Varsity)",
  "Outcome / measurable result": "Sonuç / ölçülebilir kazanım",
  "Output": "Çıktı",
  "Output URL": "Çıktı URL'si",
  "Overall GPA": "Genel not ortalaması",
  "Paid": "Ücretli",
  "Part-time job": "Yarı zamanlı iş",
  "Peer-reviewed publication": "Hakemli yayın",
  "People led": "Yönetilen kişi sayısı",
  "Personal": "Kişisel",
  "Position / role": "Pozisyon / rol",
  "Poster": "Poster",
  "Pre-university": "Üniversite öncesi",
  "Preprint": "Ön baskı",
  "Presentation": "Sunum",
  "Proficiency": "Yeterlilik",
  "Proficiency (optional)": "Yeterlilik (opsiyonel)",
  "Recreational": "Amatör",
  "Regional": "Bölgesel",
  "Regular": "Normal",
  "Repository URL": "Depo URL'si",
  "Revenue (if any)": "Gelir (varsa)",
  "School": "Okul",
  "School journal": "Okul dergisi",
  "School name": "Okul adı",
  "Scope (e.g. school-wide, regional)": "Kapsam (örn. okul geneli, bölgesel)",
  "Score": "Puan",
  "Skill": "Beceri",
  "Sport": "Spor",
  "Sports": "Spor",
  "Stage": "Aşama",
  "Start date": "Başlangıç tarihi",
  "Status": "Durum",
  "Story notes (optional)": "Hikaye notları (opsiyonel)",
  "Student government": "Öğrenci meclisi",
  "Subject": "Konu",
  "Summer program": "Yaz programı",
  "Target date": "Hedef tarih",
  "Team / club / school": "Takım / kulüp / okul",
  "Technical": "Teknik",
  "Test name": "Sınav adı",
  "This is a leadership role": "Bu bir liderlik rolü",
  "Title": "Başlık",
  "Turkish curriculum": "Türk müfredatı",
  "Type": "Tür",
  "Undergraduate": "Lisans",
  "Users reached": "Ulaşılan kullanıcı sayısı",
  "Weeks per year": "Yıllık hafta",
  "Which qualification?": "Hangi müfredat?",
  "Why did you start? What was the hardest moment? What changed? What did you learn? Who did you work with? What was the measurable outcome? Anything you don't want to forget.": "Neden başladın? En zor an neydi? Ne değişti? Neler öğrendin? Kiminle çalıştın? Ölçülebilir sonuç neydi? Unutmak istemediğin başka bir şey var mı?",
  "Your independence (e.g. led data collection)": "Bağımsızlığın (örn. veri toplamayı yönettin)",
  "Your role": "Rolün",
  "e.g. 200m Freestyle": "örn. 200m Serbest",
  "e.g. 2026-27": "örn. 2026-27",
  "e.g. A, 5, 7": "örn. A, 5, 7",
  "e.g. A-F, 1-5, 1-7": "örn. A-F, 1-5, 1-7",
  "e.g. AP Microeconomics": "örn. AP Mikroekonomi",
  "e.g. Academics, Career": "örn. Akademik, Kariyer",
  "e.g. Economics": "örn. Ekonomi",
  "e.g. Education": "örn. Eğitim",
  "e.g. German Abitur, Italian Maturità": "örn. Alman Abitur, İtalyan Maturità",
  "e.g. English, Turkish": "örn. İngilizce, Türkçe",
  "e.g. Intermediate": "örn. Orta düzey",
  "e.g. Python, Public speaking": "örn. Python, Topluluk önünde konuşma",
  "e.g. Robotics Club Captain": "örn. Robotik Kulübü Kaptanı",
  "e.g. SAT, IB Predicted": "örn. SAT, IB Tahmini",
  "e.g. School, National, International": "örn. Okul, Ulusal, Uluslararası",
  "e.g. Study Economics in the UK": "örn. İngiltere'de Ekonomi okumak",
  "e.g. Swimming": "örn. Yüzme",
  "e.g. United States": "örn. Amerika Birleşik Devletleri",
  "e.g. YYGS": "örn. YYGS",
};

/** Exported so a caller that needs one or two translated strings (e.g. the CV-import skill
 * category labels — lib/profile/cv-import.ts's skillCategoryLabel) doesn't need to wrap
 * them in a full FieldConfig just to reach localizeFields below. */
export function fieldText(text: string, locale: Locale): string {
  return locale === "tr" ? (FIELD_TEXT_TR[text] ?? text) : text;
}

/**
 * Returns a copy of `fields` with label/placeholder/option-label resolved to `locale`.
 * Every consumer should call this once where it receives a FieldConfig[] rather than
 * reading `.label`/`.placeholder`/`.options` directly -- `name`, `type`, `quickAdd`,
 * `span`, `scope`, `entityIdField`, `allowCustom`, `customLabel`, and `suggestions`
 * (a separate, much larger translation surface in lib/vocabularies/*, out of scope here)
 * are untouched.
 */
export function localizeFields(fields: FieldConfig[], locale: Locale): FieldConfig[] {
  if (locale !== "tr") return fields;
  return fields.map((field): FieldConfig => {
    const label = fieldText(field.label, locale);
    const withLabel = { ...field, label };
    const withPlaceholder =
      "placeholder" in withLabel && withLabel.placeholder ? { ...withLabel, placeholder: fieldText(withLabel.placeholder, locale) } : withLabel;
    if (withPlaceholder.type === "select") {
      return { ...withPlaceholder, options: withPlaceholder.options.map((o) => ({ ...o, label: fieldText(o.label, locale) })) };
    }
    return withPlaceholder;
  });
}
