import { z } from "zod";
import { LANGUAGE_PROFICIENCY_VALUES } from "@/lib/vocabularies/languages";

const dateField = z.string().min(1).nullable();
const optionalText = z.string().nullable();
// Canonical Entity Autocomplete System (migration 0038) — a `*_id` linkage column is
// either a real uuid (set by lib/entities's EntityCombobox on selection, re-verified
// server-side against the target table before ever being persisted — see
// lib/entities/resolve.ts) or null (unlinked/legacy-text-only). `.optional()` because a
// field this batch didn't touch simply won't be present in an older call site's payload.
const optionalEntityId = z.string().nullable().optional();

export const ActivitySchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  /** Optional link to the canonical opportunity/program catalog (e.g. an activity that
   * *is* Yale Young Global Scholars). Never required — the activity's own free-text
   * title stays the primary record. */
  opportunity_id: optionalEntityId,
  category: z.enum(["club", "sports", "student_government", "community_org", "summer_program", "academic_program", "competition_team", "other"]),
  description: optionalText,
  is_leadership_role: z.boolean(),
  people_led: z.coerce.number().int().nonnegative().nullable(),
  organization_scope: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  weeks_per_year: z.coerce.number().nonnegative().nullable(),
  location: optionalText,
  story_notes: optionalText,
});
export type ActivityFormInput = z.infer<typeof ActivitySchema>;

export const ProjectSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  description: optionalText,
  role: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  outcome_summary: optionalText,
  users_reached: z.coerce.number().int().nonnegative().nullable(),
  revenue_amount: z.coerce.number().nonnegative().nullable(),
  repo_url: optionalText,
  live_url: optionalText,
  location: optionalText,
  story_notes: optionalText,
});
export type ProjectFormInput = z.infer<typeof ProjectSchema>;

export const AwardSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  level: optionalText,
  description: optionalText,
  award_date: dateField,
  location: optionalText,
  story_notes: optionalText,
});
export type AwardFormInput = z.infer<typeof AwardSchema>;

export const ResearchExperienceSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  mentor_name: optionalText,
  field: optionalText,
  description: optionalText,
  methodology: optionalText,
  independence_level: optionalText,
  output_type: z.enum(["none", "presentation", "poster", "school_journal", "preprint", "peer_reviewed_publication", "other"]),
  output_url: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  location: optionalText,
  story_notes: optionalText,
});
export type ResearchExperienceFormInput = z.infer<typeof ResearchExperienceSchema>;

export const VolunteeringSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  description: optionalText,
  cause_area: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  weeks_per_year: z.coerce.number().nonnegative().nullable(),
  location: optionalText,
  story_notes: optionalText,
});
export type VolunteeringFormInput = z.infer<typeof VolunteeringSchema>;

export const WorkExperienceSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: z.string().min(1, { error: "Organization is required." }),
  organization_entity_id: optionalEntityId,
  employment_type: z.enum(["internship", "part_time_job", "full_time_job", "apprenticeship", "freelance", "other"]),
  description: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  paid: z.boolean().nullable(),
  location: optionalText,
  story_notes: optionalText,
});
export type WorkExperienceFormInput = z.infer<typeof WorkExperienceSchema>;

export const EducationRecordSchema = z.object({
  school_name: z.string().min(1, { error: "School name is required." }),
  school_entity_id: optionalEntityId,
  country: optionalText,
  stage: z.enum(["middle_school", "high_school", "pre_university", "undergraduate", "other"]),
  curriculum: z.enum(["ap", "ib", "a_level", "turkish_curriculum", "national_curriculum", "other"]).nullable(),
  start_date: dateField,
  end_date: dateField,
  is_current: z.boolean(),
  overall_gpa: z.coerce.number().nonnegative().nullable(),
  gpa_scale: z.coerce.number().positive().nullable(),
  notes: optionalText,
});
export type EducationRecordFormInput = z.infer<typeof EducationRecordSchema>;

/** Coursework — the source of truth for AP/IB HL/IB SL/A-Level/honors rigor. Reuses the
 * `course_level` ontology migration 0003 already defines rather than inventing a second
 * one; feeds lib/scoring/dimensions/academics.ts (rigor) and intellectual-curiosity.ts
 * (subject breadth), both of which were previously unreachable from the UI. */
export const CourseSchema = z.object({
  course_name: z.string().min(1, { error: "Course name is required." }),
  subject: optionalText,
  level: z.enum(["regular", "honors", "ap", "ib_hl", "ib_sl", "a_level", "dual_enrollment", "other"]),
  academic_year: optionalText,
  grade_value: optionalText,
  grade_scale: optionalText,
  credit_hours: z.coerce.number().nonnegative().nullable(),
});
export type CourseFormInput = z.infer<typeof CourseSchema>;

/**
 * True only for a value that is unambiguously a plain number — "38", "1450", "5.5", "-5".
 * The leading `-?` matters: a negative value must still parse as numeric so the "can't be
 * negative" refinements below actually catch it, rather than a bare `\d+` treating "-5" as
 * non-numeric and silently skipping the check it exists to run. Deliberately returns null
 * (not 0, not an error) for "C1", "Pass", "5/7" and similar: those are legitimate score
 * formats (CEFR bands, pass/fail, IB predicted grades) that a numeric comparison can't
 * meaningfully validate, so the checks below simply don't apply to them rather than
 * misparsing or rejecting a genuinely valid entry.
 */
function asPlainNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  return Number(trimmed);
}

export const TestScoreSchema = z
  .object({
    test_name: z.string().min(1, { error: "Test name is required." }),
    score: z.string().min(1, { error: "Score is required." }),
    max_score: optionalText,
    test_date: dateField,
  })
  // Three separate refinements (not one combined check) so a student seeing a rejected save
  // gets the specific reason — "can't be higher than the max" reads very differently from
  // "can't be negative" — rather than one generic "invalid score" message.
  .refine((data) => { const n = asPlainNumber(data.score); return n === null || n >= 0; }, {
    error: "Score can't be negative.",
    path: ["score"],
  })
  .refine((data) => { const n = data.max_score ? asPlainNumber(data.max_score) : null; return n === null || n >= 0; }, {
    error: "Max score can't be negative.",
    path: ["max_score"],
  })
  .refine(
    (data) => {
      if (!data.max_score) return true;
      const score = asPlainNumber(data.score);
      const maxScore = asPlainNumber(data.max_score);
      if (score === null || maxScore === null) return true; // only compare when both are plain numbers
      return score <= maxScore;
    },
    { error: "Score can't be higher than the max score.", path: ["score"] },
  );
export type TestScoreFormInput = z.infer<typeof TestScoreSchema>;

export const CertificationSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  organization_entity_id: optionalEntityId,
  description: optionalText,
  issue_date: dateField,
  expiry_date: dateField,
  credential_url: optionalText,
});
export type CertificationFormInput = z.infer<typeof CertificationSchema>;

export const GoalSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  category: optionalText,
  target_date: dateField,
  status: z.enum(["active", "achieved", "abandoned"]),
});
export type GoalFormInput = z.infer<typeof GoalSchema>;

export const SportsSchema = z.object({
  sport: z.string().min(1, { error: "Sport is required." }),
  discipline: optionalText,
  team_name: optionalText,
  team_entity_id: optionalEntityId,
  position: optionalText,
  level: z.enum(["recreational", "school", "club", "regional", "national", "international"]).nullable(),
  us_specific_label: optionalText,
  is_captain: z.boolean(),
  achievements: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  weeks_per_year: z.coerce.number().nonnegative().nullable(),
  location: optionalText,
  description: optionalText,
  story_notes: optionalText,
});
export type SportsFormInput = z.infer<typeof SportsSchema>;

export const SkillSchema = z.object({
  name: z.string().min(1, { error: "Skill name is required." }).max(60, { error: "Keep it under 60 characters." }),
  category: z.enum(["technical", "creative", "analytical", "communication", "leadership", "other"]),
  proficiency: optionalText,
});
export type SkillFormInput = z.infer<typeof SkillSchema>;

/**
 * Proficiency is a closed set, not free text: CEFR is what European universities state
 * their language requirements in, so a stored "c1" is comparable against a requirement
 * while "pretty good" never is. `native` and `bilingual` sit outside the A1-C2 ladder
 * deliberately — see lib/vocabularies/languages.ts.
 */
export const LanguageSchema = z.object({
  name: z.string().min(1, { error: "Language is required." }).max(60, { error: "Keep it under 60 characters." }),
  proficiency: z.enum(LANGUAGE_PROFICIENCY_VALUES, { error: "Choose a proficiency level." }).nullable(),
});
export type LanguageFormInput = z.infer<typeof LanguageSchema>;
