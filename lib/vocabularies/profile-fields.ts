/**
 * Small closed-ish vocabularies for free-text achievement columns that aren't a subject/test/
 * country (lib/vocabularies/subjects.ts, tests.ts, countries.ts) — each backs a "suggest"
 * FieldConfig (features/entities/suggest-input.tsx), never a "select": none of these DB columns
 * has an enum/CHECK constraint (awards.level, skills.proficiency, volunteering_experiences.
 * cause_area — all plain `text`, see supabase/migrations/0004_achievements.sql), so a hard
 * `<select>` would silently hide any existing value that isn't in the list (dynamic-form-
 * fields.tsx's "select" case has no out-of-list fallback) — "suggest" never rejects.
 */

/** Deliberately narrower than SPORT_LEVEL_OPTIONS (features/profile/field-config.ts) — awards
 * don't have a "recreational"/"club" tier the way sports competitions do. Same wording as that
 * ontology's shared tiers for consistency, not the same list (different underlying column,
 * different DB constraint — see the file header). */
export const AWARD_LEVEL_SUGGESTIONS = ["School", "Regional", "State/Provincial", "National", "International"];

export const CAUSE_AREA_SUGGESTIONS = [
  "Education",
  "Environment & Climate",
  "Health & Medicine",
  "Poverty & Homelessness",
  "Animal Welfare",
  "Human Rights",
  "Youth Mentoring",
  "Elderly Care",
  "Disability Advocacy",
  "Disaster Relief",
  "Food Security & Hunger",
  "Mental Health",
  "Refugee & Immigrant Support",
  "Gender Equality",
  "Arts & Culture",
  "Community Development",
];

export const PROFICIENCY_SUGGESTIONS = ["Beginner", "Intermediate", "Advanced", "Fluent", "Native"];
