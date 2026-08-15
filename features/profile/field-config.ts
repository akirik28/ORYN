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
  | { type: "select"; name: string; label: string; options: { value: string; label: string }[]; span?: "full" | "half" };

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
  { type: "text", name: "organization", label: "Organization", span: "half" },
  { type: "select", name: "category", label: "Category", options: ACTIVITY_CATEGORY_OPTIONS, span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "checkbox", name: "is_leadership_role", label: "This is a leadership role" },
  { type: "number", name: "people_led", label: "People led", span: "half" },
  { type: "text", name: "organization_scope", label: "Scope (e.g. school-wide, regional)", span: "half" },
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
  { type: "text", name: "organization", label: "Organization", span: "half" },
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
  { type: "text", name: "organization", label: "Awarding organization", span: "half" },
  { type: "text", name: "level", label: "Level (school, national, international...)", span: "half" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "date", name: "award_date", label: "Date", span: "half" },
  { type: "text", name: "location", label: "Location", span: "half" },
  STORY_NOTES_FIELD,
];

export const RESEARCH_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  { type: "text", name: "organization", label: "Organization / institution", span: "half" },
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
  { type: "text", name: "organization", label: "Organization", span: "half" },
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
  { type: "text", name: "organization", label: "Organization" },
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
  { type: "text", name: "school_name", label: "School name" },
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

export const TEST_SCORE_FIELDS: FieldConfig[] = [
  { type: "text", name: "test_name", label: "Test name (e.g. SAT, IB Predicted)" },
  { type: "text", name: "score", label: "Score", span: "half" },
  { type: "text", name: "max_score", label: "Max score", span: "half" },
  { type: "date", name: "test_date", label: "Date" },
];

export const CERTIFICATION_FIELDS: FieldConfig[] = [
  { type: "text", name: "title", label: "Title" },
  { type: "text", name: "organization", label: "Issuing organization" },
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
  { type: "text", name: "team_name", label: "Team / club / school", span: "half" },
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
