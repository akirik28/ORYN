import { z } from "zod";
import { EVALUATION_GATES, MANUAL_REVIEW_CATEGORIES, REQUIREMENT_CATEGORIES, SCORE_PROVENANCES } from "@/lib/requirements/types";
import type { RequirementCategory } from "@/types/database";

const CURRICULA = ["ap", "ib", "a_level", "turkish_curriculum", "national_curriculum", "other"] as const;
const COURSE_LEVELS = ["regular", "honors", "ap", "ib_hl", "ib_sl", "a_level", "dual_enrollment", "other"] as const;

const CurriculumRuleSchema = z.object({ kind: z.literal("curriculum"), curricula: z.array(z.enum(CURRICULA)).min(1) });
const CourseworkRuleSchema = z.object({ kind: z.literal("coursework"), subject: z.string().min(1), minLevel: z.enum(COURSE_LEVELS).optional() });
const MinimumGradeRuleSchema = z.object({ kind: z.literal("minimum_grade"), minGpa: z.number().positive(), scale: z.number().positive() });
const TestScoreRuleSchema = z.object({
  kind: z.literal("test_score"),
  testName: z.string().min(1),
  minScore: z.number().optional(),
  /** A RANK, not a score — METU admits on "having ranked in the first 5th percentile in the
   * TR-YÖS exam". Kept as its own field rather than folded into `minScore` precisely so the
   * two can never be silently compared: in the same TR-YÖS cycle Hacettepe publishes 400 of
   * 500 and METU publishes a percentile, and a single numeric column would make "440" look
   * comparable to "5". */
  minPercentileRank: z.number().min(0).max(100).optional(),
});
const LanguageProficiencyRuleSchema = z.object({
  kind: z.literal("language_proficiency"),
  testName: z.string().optional(),
  minScore: z.number().optional(),
  minPercentileRank: z.number().min(0).max(100).optional(),
  languageName: z.string().optional(),
  acceptNativeOrFluent: z.boolean().optional(),
});

/** Mirrors lib/requirements/types.ts's StructuredRule — kept as a separate Zod schema
 * (rather than z.custom against the TS type) so AI output and admin-form input are
 * actually validated field-by-field, not just type-asserted.
 *
 * The refinement is on the union rather than on a branch so the branch schemas stay plain
 * objects (`discriminatedUnion` needs them to be, and `RULE_FIELD_SCHEMAS_BY_KIND` `.omit`s
 * from them). It rejects a rule carrying both a raw threshold and a percentile threshold:
 * those are different kinds of quantity and a rule asserting both is a rule nobody can
 * evaluate — better refused at authoring time than resolved by picking one. */
export const StructuredRuleSchema = z
  .discriminatedUnion("kind", [CurriculumRuleSchema, CourseworkRuleSchema, MinimumGradeRuleSchema, TestScoreRuleSchema, LanguageProficiencyRuleSchema])
  .superRefine((rule, ctx) => {
    if ((rule.kind === "test_score" || rule.kind === "language_proficiency") && rule.minScore !== undefined && rule.minPercentileRank !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "A rule states either a minimum score or a minimum percentile rank, never both — a rank and a score are not the same kind of quantity.",
        path: ["minPercentileRank"],
      });
    }
  });

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

const RecencyRuleSchema = z.object({
  direction: z.enum(["max_age", "not_valid_on_or_after", "not_valid_before"]),
  value: z.number().positive().optional(),
  unit: z.enum(["years", "months"]).optional(),
  anchor: z.enum(["entry", "programme_start", "exam_date", "application_date"]).optional(),
  boundaryDate: z.iso.date().optional(),
});

/**
 * Reads migration 0056's qualifier columns — and migration 0052's `is_exclusion` — off a
 * `university_requirements` row. Input keys are the snake_case column names; output is the
 * camelCase `RequirementQualifiers` the evaluator takes. Extra keys are stripped, so the
 * whole row can be handed to it, which is what every caller does: one argument then carries
 * both the column that exists today (`is_exclusion`, 0052 is applied) and the ones that do
 * not yet (0056's, all absent), with no caller needing to know which is which.
 *
 * FAILS CLOSED on purpose. An `evaluation_gate` or an `excluded_provenances` entry outside
 * the known vocabulary — schema drift, a value added to the CHECK constraint that this code
 * has not learned yet — makes the whole parse fail, and `evaluateRequirement` answers
 * `needs_manual_review` for an unreadable qualifier set. The alternative (ignore what you
 * don't recognise) turns an unrecognised *blocking* reason into no reason at all, which is
 * the confidently-wrong direction.
 *
 * Failing closed is also why the input must be an OBJECT: a bare `true`/`false` (the shape
 * an is_exclusion-only caller would once have passed) does not parse, and lands on
 * `needs_manual_review` rather than being silently read as "no qualifiers at all".
 */
export const RequirementQualifiersSchema = z
  .object({
    evaluation_gate: z.enum(EVALUATION_GATES as [string, ...string[]]).nullish(),
    is_exclusion: z.boolean().nullish(),
    test_scale: z.string().nullish(),
    scale_ambiguity: z.string().nullish(),
    recency_rule: RecencyRuleSchema.nullish(),
    excluded_provenances: z.array(z.enum(SCORE_PROVENANCES as [string, ...string[]])).nullish(),
  })
  .transform((row) => ({
    evaluationGate: (row.evaluation_gate ?? null) as (typeof EVALUATION_GATES)[number] | null,
    isExclusion: row.is_exclusion ?? null,
    testScale: row.test_scale ?? null,
    scaleAmbiguity: row.scale_ambiguity ?? null,
    recencyRule: row.recency_rule ?? null,
    excludedProvenances: (row.excluded_provenances ?? null) as (typeof SCORE_PROVENANCES)[number][] | null,
  }));

/**
 * Text naming an early round whose semantics are a legal commitment rather than a
 * requirement to satisfy. US Early Decision obliges an admitted applicant to enrol and
 * withdraw every other application; Restrictive / Single-Choice Early Action forbids other
 * early applications outright. Deliberately narrow — it must match the named rounds and the
 * explicit obligation sentence, not every use of the word "binding" (which the corpus uses
 * constantly for ordinary things: "the advice is non-binding", "recommended vs required").
 */
const BINDING_COMMITMENT_RE =
  /\bearly decision\b|\bED\s*(?:I{1,2}|1|2)\b|\brestrictive early action\b|\bsingle[-\s]choice early action\b|\bbinding (?:commitment|agreement|application|offer|round)\b|\bif admitted\b[^.]{0,80}?\b(?:must|obliged|obligated|required)\b[^.]{0,40}?\b(?:enrol|enroll|attend|withdraw)/i;

/**
 * Whether a `structured_rule` may be attached to this requirement at all, and why not when
 * it may not. Returns null when authoring is fine.
 *
 * Two refusals, both closing the same hole from opposite ends. `evaluateRequirement` already
 * ignores `structured_rule` for the manual-review categories and for any gated row — but
 * "ignored downstream" is not the same as "cannot exist". A rule sitting on a binding Early
 * Decision row is a rule some future reader, or a later change to
 * `MANUAL_REVIEW_CATEGORIES`/`categoryToRuleKind`, can turn into a green checkmark against a
 * commitment to enrol. This is the guard that stops it being written in the first place.
 */
export function ruleAuthoringRefusal(params: { category: RequirementCategory; title?: string | null; requirementDetail?: string | null }): string | null {
  const text = [params.title, params.requirementDetail].filter(Boolean).join(" — ");
  if (BINDING_COMMITMENT_RE.test(text)) {
    return "This requirement names a binding application round (Early Decision, Restrictive/Single-Choice Early Action). That is a commitment a student makes, not a condition Oryn can mark satisfied, so it cannot carry a structured rule — leave it blank and it will show as needing review.";
  }
  if (MANUAL_REVIEW_CATEGORIES.includes(params.category)) {
    return `"${params.category}" is always reviewed by hand, so a structured rule on it would never be evaluated — leave it blank rather than recording a rule that looks authoritative and is never read.`;
  }
  return null;
}

/** Admin-authored requirement row (see app/(app)/universities/[id]/requirement-actions.ts).
 * `structuredRule` is optional free-form JSON text so the form can hold an AI suggestion
 * pending review — validated against StructuredRuleSchema only once parsed and non-empty,
 * and refused outright by `ruleAuthoringRefusal` for rows that must never carry one. */
export const RequirementInputSchema = z
  .object({
    universityId: z.uuid(),
    programId: z.uuid().nullable(),
    requirementType: z.enum(REQUIREMENT_CATEGORIES as [string, ...string[]]),
    title: z.string().min(1, { error: "Title is required." }),
    requirementDetail: z.string().nullable(),
    isRequired: z.boolean(),
    sourceUrl: z.url({ error: "Enter a valid source URL." }),
    structuredRuleJson: z.string().nullable(),
  })
  .superRefine((input, ctx) => {
    if (!input.structuredRuleJson || input.structuredRuleJson.trim().length === 0) return;
    const refusal = ruleAuthoringRefusal({
      category: input.requirementType as RequirementCategory,
      title: input.title,
      requirementDetail: input.requirementDetail,
    });
    if (refusal) ctx.addIssue({ code: "custom", message: refusal, path: ["structuredRuleJson"] });
  });
export type RequirementInput = z.infer<typeof RequirementInputSchema>;
