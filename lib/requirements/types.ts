import type { CourseLevel, CurriculumType, RequirementCategory, RequirementEvaluationStatus, RequirementGroupRole } from "@/types/database";

export const REQUIREMENT_CATEGORIES: readonly RequirementCategory[] = [
  "curriculum",
  "required_subject",
  "minimum_grade",
  "standardized_test",
  "english_proficiency",
  "language_proficiency",
  "essay",
  "recommendation",
  "interview",
  "portfolio",
  "entrance_exam",
  "prerequisite_coursework",
  "application_deadline",
  "supplemental_requirement",
  "international_requirement",
];

export const REQUIREMENT_CATEGORY_LABELS: Record<RequirementCategory, string> = {
  curriculum: "Curriculum",
  required_subject: "Required subject",
  minimum_grade: "Minimum grade",
  standardized_test: "Standardized test",
  english_proficiency: "English proficiency",
  language_proficiency: "Language proficiency",
  essay: "Essay",
  recommendation: "Recommendation",
  interview: "Interview",
  portfolio: "Portfolio",
  entrance_exam: "Entrance exam",
  prerequisite_coursework: "Prerequisite coursework",
  application_deadline: "Application deadline",
  supplemental_requirement: "Supplemental requirement",
  international_requirement: "International requirement",
};

/** These categories describe something a student submits or performs (an essay, a letter,
 * an interview) — not a fact this product stores anywhere. Always needs_manual_review,
 * never guessed at from unrelated profile data. */
export const MANUAL_REVIEW_CATEGORIES: readonly RequirementCategory[] = [
  "essay",
  "recommendation",
  "interview",
  "portfolio",
  "supplemental_requirement",
  "international_requirement",
];

/** Informational only — the canonical date record is university_deadlines; a requirement
 * row in this category is never scored met/not_met against a student's profile. */
export const INFORMATIONAL_CATEGORIES: readonly RequirementCategory[] = ["application_deadline"];

/**
 * Machine-evaluable shape for a requirement's `structured_rule` column, keyed by `kind`
 * rather than by `RequirementCategory` — `required_subject` and `prerequisite_coursework`
 * both evaluate as `coursework`, `standardized_test` and `entrance_exam` both evaluate as
 * `test_score`, so the evaluator only needs to know one shape per underlying comparison,
 * not one per display category.
 *
 * An admin (or lib/ai/interpret-requirement.ts, reviewed by an admin before saving) sets
 * this from the requirement's actual sourced text — evaluation code only ever compares
 * against a rule that's already here, it never invents one.
 */
export type StructuredRule =
  | { kind: "curriculum"; curricula: CurriculumType[] }
  | { kind: "coursework"; subject: string; minLevel?: CourseLevel }
  | { kind: "minimum_grade"; minGpa: number; scale: number }
  | { kind: "test_score"; testName: string; minScore?: number }
  | { kind: "language_proficiency"; testName?: string; minScore?: number; languageName?: string; acceptNativeOrFluent?: boolean };

export interface RequirementEvaluationResult {
  status: RequirementEvaluationStatus;
  reasoning: string;
}

/** Which StructuredRule shape a given display category evaluates as — several categories
 * share one evaluation shape (e.g. `standardized_test` and `entrance_exam` are both just
 * "a named test with an optional minimum score"). Null for categories with no
 * machine-evaluable shape at all (see MANUAL_REVIEW_CATEGORIES / INFORMATIONAL_CATEGORIES). */
export function categoryToRuleKind(category: RequirementCategory): StructuredRule["kind"] | null {
  switch (category) {
    case "curriculum":
      return "curriculum";
    case "required_subject":
    case "prerequisite_coursework":
      return "coursework";
    case "minimum_grade":
      return "minimum_grade";
    case "standardized_test":
    case "entrance_exam":
      return "test_score";
    case "english_proficiency":
    case "language_proficiency":
      return "language_proficiency";
    default:
      return null;
  }
}

/** Profile facts the deterministic evaluator reads — a narrower slice than
 * lib/scoring's ScoringFacts (adds `languages`, doesn't need achievement tables). */
export interface RequirementFacts {
  curricula: CurriculumType[];
  courses: { subject: string | null; level: CourseLevel; gradeValue: string | null }[];
  gpas: { value: number; scale: number }[];
  testScores: { testName: string; score: string }[];
  languages: { name: string; proficiency: string | null }[];
}

/** One member of a requirement_groups set, as evaluateRequirementGroup needs it — a narrow
 * slice of a university_requirements row (same "narrow slice, caller maps snake_case DB
 * columns onto this" convention as RequirementFacts itself). groupRole is never null here:
 * only rows with a non-null requirement_group_id belong to a group at all (see migration
 * 0052's university_requirements_group_role_consistency constraint) — an ungrouped row is
 * evaluated with the plain evaluateRequirement instead. */
export interface RequirementGroupMember {
  id: string;
  category: RequirementCategory;
  rawStructuredRule: unknown;
  groupRole: RequirementGroupRole;
  title: string | null;
}

/** evaluateRequirementGroup's return shape — the combined verdict for the whole group, plus
 * each member's own individually-computed result (e.g. for a future admin/detail view that
 * wants to show which specific alternative was met, not just that one was). */
export interface RequirementGroupEvaluationResult {
  status: RequirementEvaluationStatus;
  reasoning: string;
  memberResults: Map<string, RequirementEvaluationResult>;
}
