import { z } from "zod";
import { REQUIREMENT_CATEGORIES } from "@/lib/requirements/types";

const CURRICULA = ["ap", "ib", "a_level", "turkish_curriculum", "national_curriculum", "other"] as const;
const COURSE_LEVELS = ["regular", "honors", "ap", "ib_hl", "ib_sl", "a_level", "dual_enrollment", "other"] as const;

const CurriculumRuleSchema = z.object({ kind: z.literal("curriculum"), curricula: z.array(z.enum(CURRICULA)).min(1) });
const CourseworkRuleSchema = z.object({ kind: z.literal("coursework"), subject: z.string().min(1), minLevel: z.enum(COURSE_LEVELS).optional() });
const MinimumGradeRuleSchema = z.object({ kind: z.literal("minimum_grade"), minGpa: z.number().positive(), scale: z.number().positive() });
const TestScoreRuleSchema = z.object({ kind: z.literal("test_score"), testName: z.string().min(1), minScore: z.number().optional() });
const LanguageProficiencyRuleSchema = z.object({
  kind: z.literal("language_proficiency"),
  testName: z.string().optional(),
  minScore: z.number().optional(),
  languageName: z.string().optional(),
  acceptNativeOrFluent: z.boolean().optional(),
});

/** Mirrors lib/requirements/types.ts's StructuredRule — kept as a separate Zod schema
 * (rather than z.custom against the TS type) so AI output and admin-form input are
 * actually validated field-by-field, not just type-asserted. */
export const StructuredRuleSchema = z.discriminatedUnion("kind", [
  CurriculumRuleSchema,
  CourseworkRuleSchema,
  MinimumGradeRuleSchema,
  TestScoreRuleSchema,
  LanguageProficiencyRuleSchema,
]);

/** One schema per `kind`, minus the `kind` literal itself — lib/ai/interpret-requirement.ts
 * asks the model to fill in only the fields for the one kind a given requirement category
 * maps to, rather than choosing among all five (a focused object schema is far more
 * reliable for structured extraction than a discriminated union the model must also pick a
 * branch of). */
export const RULE_FIELD_SCHEMAS_BY_KIND = {
  curriculum: CurriculumRuleSchema.omit({ kind: true }),
  coursework: CourseworkRuleSchema.omit({ kind: true }),
  minimum_grade: MinimumGradeRuleSchema.omit({ kind: true }),
  test_score: TestScoreRuleSchema.omit({ kind: true }),
  language_proficiency: LanguageProficiencyRuleSchema.omit({ kind: true }),
} as const;

/** Admin-authored requirement row (see app/(app)/universities/[id]/requirement-actions.ts).
 * `structuredRule` is optional free-form JSON text so the form can hold an AI suggestion
 * pending review — validated against StructuredRuleSchema only once parsed and non-empty. */
export const RequirementInputSchema = z.object({
  universityId: z.uuid(),
  programId: z.uuid().nullable(),
  requirementType: z.enum(REQUIREMENT_CATEGORIES as [string, ...string[]]),
  title: z.string().min(1, { error: "Title is required." }),
  requirementDetail: z.string().nullable(),
  isRequired: z.boolean(),
  sourceUrl: z.url({ error: "Enter a valid source URL." }),
  structuredRuleJson: z.string().nullable(),
});
export type RequirementInput = z.infer<typeof RequirementInputSchema>;
