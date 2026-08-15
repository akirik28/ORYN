import { z } from "zod";

const dateField = z.string().min(1).nullable();
const optionalText = z.string().nullable();

export const ActivitySchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
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
});
export type ActivityFormInput = z.infer<typeof ActivitySchema>;

export const ProjectSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
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
});
export type ProjectFormInput = z.infer<typeof ProjectSchema>;

export const AwardSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  level: optionalText,
  description: optionalText,
  award_date: dateField,
  location: optionalText,
});
export type AwardFormInput = z.infer<typeof AwardSchema>;

export const ResearchExperienceSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
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
});
export type ResearchExperienceFormInput = z.infer<typeof ResearchExperienceSchema>;

export const VolunteeringSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
  description: optionalText,
  cause_area: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  weeks_per_year: z.coerce.number().nonnegative().nullable(),
  location: optionalText,
});
export type VolunteeringFormInput = z.infer<typeof VolunteeringSchema>;

export const WorkExperienceSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: z.string().min(1, { error: "Organization is required." }),
  employment_type: z.enum(["internship", "part_time_job", "full_time_job", "apprenticeship", "freelance", "other"]),
  description: optionalText,
  start_date: dateField,
  end_date: dateField,
  ongoing: z.boolean(),
  hours_per_week: z.coerce.number().nonnegative().nullable(),
  paid: z.boolean().nullable(),
  location: optionalText,
});
export type WorkExperienceFormInput = z.infer<typeof WorkExperienceSchema>;

export const EducationRecordSchema = z.object({
  school_name: z.string().min(1, { error: "School name is required." }),
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

export const TestScoreSchema = z.object({
  test_name: z.string().min(1, { error: "Test name is required." }),
  score: z.string().min(1, { error: "Score is required." }),
  max_score: optionalText,
  test_date: dateField,
});
export type TestScoreFormInput = z.infer<typeof TestScoreSchema>;

export const CertificationSchema = z.object({
  title: z.string().min(1, { error: "Title is required." }),
  organization: optionalText,
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
});
export type SportsFormInput = z.infer<typeof SportsSchema>;
