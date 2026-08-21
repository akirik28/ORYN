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
  | { kind: "test_score"; testName: string; minScore?: number; minPercentileRank?: number }
  | { kind: "language_proficiency"; testName?: string; minScore?: number; minPercentileRank?: number; languageName?: string; acceptNativeOrFluent?: boolean };

/**
 * Everything about a requirement that governs *whether the comparison in `structured_rule`
 * is legitimate at all*, as opposed to what the comparison is. Field-for-field the columns
 * migration 0056 proposes on `university_requirements` (`evaluation_gate`, `test_scale`,
 * `scale_ambiguity`, `recency_rule`, `excluded_provenances`), camelCased the same way
 * `RequirementFacts` camelCases its own source columns — the caller maps snake_case DB
 * columns onto this shape.
 *
 * 0056 is written and NOT applied, so every field here is absent in production today. That
 * is deliberately safe in one direction only: an absent qualifier can never *unlock* a
 * comparison the evaluator would otherwise refuse, it can only fail to block one. The two
 * qualifiers that must block on their own (an unqualified TOEFL/TR-YÖS threshold, a
 * percentile threshold) are therefore detected from the rule itself as well — see
 * `evaluateTestScore` — rather than relying on a column that does not exist yet.
 */
export interface RequirementQualifiers {
  /**
   * 0056 §4. Non-null means the evaluator MUST return needs_manual_review regardless of
   * what `structured_rule` says or how well the student's number matches. Checked before
   * the category and before the rule, so no later change to either can route around it.
   */
  evaluationGate?: EvaluationGate | null;
  /** 0056 §1 — the scale/version the threshold is expressed against, e.g. `TOEFL_IBT_1_6`.
   * Null means UNKNOWN, never "the default scale". */
  testScale?: string | null;
  /** 0056 §1 — the research lane's own assessment of whether the scale could be pinned
   * down. Anything outside {none, resolved_unambiguous} blocks automatic evaluation. */
  scaleAmbiguity?: string | null;
  /** 0056 §2 — the validity window, INCLUDING its direction. */
  recencyRule?: RecencyRule | null;
  /** 0056 §3 — provenances this institution refuses despite a qualifying number. */
  excludedProvenances?: ScoreProvenance[] | null;
}

/**
 * Why automatic evaluation is refused for a row. Same vocabulary as migration 0056 §4's
 * `university_requirements_evaluation_gate_check`, plus `binding_commitment`, which 0056
 * did not have a value for because binding-round semantics were scoped there to
 * `university_deadlines.binding_policy` (0056 §7) — the companion *requirement* record is
 * what a student actually reads in the requirement check, and it needs its own gate. The
 * unapplied migration's CHECK list was extended to match rather than left to drift.
 */
export type EvaluationGate =
  /** A validity window bounded from below — METU refuses IELTS taken ON OR AFTER
   * 2022-12-24. A max-age model gets this exactly backwards. */
  | "inverted_recency"
  /** An ordinary max-age window whose anchor Oryn cannot resolve. */
  | "recency_window"
  /** A threshold with no resolvable scale — Ankara's "440 points" from TR-YÖS, with no
   * denominator published anywhere. */
  | "unstated_scale"
  /** A rank where the others publish a score — METU's TR-YÖS "first 5th percentile". */
  | "incomparable_scale"
  /** A provenance the institution refuses regardless of the number (Edinburgh: IELTS One
   * Skill Retake). */
  | "named_exclusion"
  /** The rule is expressed as an exclusion or a heading rather than a threshold. */
  | "eligibility_restriction"
  /** Unevaluable from birth year alone, permanently: TU Dublin requires applicants to be 18
   * before 31 December, and Oryn stores birth YEAR only by deliberate minor-safe design
   * (AGENTS.md Phase 2). Never `met`, and never `not_met` either. */
  | "age_bar"
  /** Competing official readings of the same fact, unresolved. */
  | "source_conflict"
  /** Correct for a cycle that has already closed. */
  | "historical"
  /** A legal commitment rather than a checklist item — US Early Decision obliges the
   * applicant to enrol and withdraw other applications; Restrictive Early Action forbids
   * other early applications. Never expressible as a satisfied/unsatisfied checkbox. */
  | "binding_commitment";

export const EVALUATION_GATES: readonly EvaluationGate[] = [
  "inverted_recency",
  "recency_window",
  "unstated_scale",
  "incomparable_scale",
  "named_exclusion",
  "eligibility_restriction",
  "age_bar",
  "source_conflict",
  "historical",
  "binding_commitment",
];

/**
 * Which side of the boundary is refused. `max_age` alone is the model that gets METU
 * inverted, which is why the direction is required rather than defaulted: there is no safe
 * default, and a rule that omits it is a rule Oryn refuses to evaluate.
 */
export type RecencyDirection =
  /** "valid for two years", "no more than two years old" — OLD qualifications expire. */
  | "max_age"
  /** METU: "IELTS exams taken on or after the 24th of December 2022 will not be anymore
   * accepted." FRESH qualifications are refused. The inverse of every other validity rule
   * in the corpus. */
  | "not_valid_on_or_after"
  /** Tilburg: the 1-6 TOEFL threshold applies only to "test reports obtained on or after
   * January 21, 2026". An OLDER report is not measurable against it. */
  | "not_valid_before";

/** The date the window is measured from. Load-bearing and genuinely varied — "no more than
 * two academic years prior to entry", "within 2 years of the expected start of your course"
 * and "valid for 2 years from the exam date" are three different anchors, and collapsing
 * them onto one would silently re-anchor two of them (migration 0056 §2). */
export type RecencyAnchor = "entry" | "programme_start" | "exam_date" | "application_date";

export interface RecencyRule {
  direction: RecencyDirection;
  value?: number;
  unit?: "years" | "months";
  anchor?: RecencyAnchor;
  /** ISO `YYYY-MM-DD`. Required in practice for the two dated directions. */
  boundaryDate?: string;
}

/**
 * HOW a score was obtained. Per-institution, never a global property of the test:
 * Southampton names IELTS One Skill Retake among its accepted tests, Edinburgh states "We
 * do not accept IELTS One Skill Retake to meet our English language requirements". Both
 * official, both current, same number. Vocabulary from migration 0056 §3 plus
 * `online_edition`, which the corpus needs separately from `home_edition` (Erasmus and VU
 * Amsterdam refuse "IELTS Online"/"online versions" while accepting centre-administered
 * sittings, and Bath refuses PTE Academic online while accepting IELTS Online — so the
 * distinction is per test, not a general delivery-mode policy).
 */
export type ScoreProvenance =
  | "one_skill_retake"
  | "mybest"
  | "superscore"
  | "home_edition"
  | "indicator"
  | "online_edition"
  | "multi_sitting_combination";

export const SCORE_PROVENANCES: readonly ScoreProvenance[] = [
  "one_skill_retake",
  "mybest",
  "superscore",
  "home_edition",
  "indicator",
  "online_edition",
  "multi_sitting_combination",
];

export const SCORE_PROVENANCE_LABELS: Record<ScoreProvenance, string> = {
  one_skill_retake: "One Skill Retake",
  mybest: "MyBest Scores",
  superscore: "a superscore combined across sittings",
  home_edition: "the at-home edition",
  indicator: "the Indicator test",
  online_edition: "the online edition",
  multi_sitting_combination: "results combined from different test dates",
};

/**
 * Why `needs_manual_review` was returned, so UI can pick a register without string-matching
 * the reasoning. "You still need to write this essay" and "this is a binding contract to
 * enrol if admitted" are the same *status* and must not read the same way.
 *
 * Optional on the result only to avoid churning the several call sites that pass a
 * `RequirementEvaluationResult` around; `evaluateRequirement` always sets it when the
 * status is `needs_manual_review`, and never sets it otherwise.
 */
export type ManualReviewReason =
  | EvaluationGate
  /** Essay, recommendation, interview, portfolio — material the student submits. */
  | "submitted_material"
  | "no_structured_rule"
  | "unreadable_rule"
  | "unreadable_qualifiers"
  | "gpa_scale_mismatch"
  | "non_numeric_score"
  /** The rule names a scale the student's own recorded score cannot be placed on. */
  | "unstated_student_scale"
  | "incomparable_student_scale"
  | "missing_language_proficiency"
  | "underspecified_rule"
  | "group_exclusion"
  | "group_qualifier"
  | "group_no_alternatives";

export interface RequirementEvaluationResult {
  status: RequirementEvaluationStatus;
  reasoning: string;
  /** Set exactly when `status === "needs_manual_review"`. See ManualReviewReason. */
  reviewReason?: ManualReviewReason;
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
  testScores: StudentTestScore[];
  languages: { name: string; proficiency: string | null }[];
}

/**
 * One score the student recorded. Every field past `score` is optional because
 * `test_scores` carries `max_score`/`test_date` but nothing else, and each absent field
 * makes the evaluator *more* cautious rather than less — an unknown provenance against a
 * requirement that names refused provenances is manual review, not a pass.
 */
export interface StudentTestScore {
  testName: string;
  score: string;
  /** `test_scores.max_score`. The only signal available today for placing a TOEFL or TR-YÖS
   * score on a scale — see `inferStudentScale` in ./evaluate.ts. */
  maxScore?: string | null;
  /** `test_scores.test_date`, ISO `YYYY-MM-DD`. */
  testDate?: string | null;
  /** An explicitly recorded scale, when one ever exists. Nothing writes this today. */
  scale?: string | null;
  /** How the score was obtained. Nothing writes this today, so a requirement naming refused
   * provenances always falls through to manual review in production — the honest answer,
   * and the one the research lane asked for by name. */
  provenance?: ScoreProvenance | null;
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
  /** This member's own qualifier columns, if any. Per-member rather than per-group on
   * purpose: a group is "any one of N alternatives satisfies this", so a gate on the IELTS
   * alternative must not block a student who cleanly meets the TOEFL one. */
  rawQualifiers?: unknown;
}

/** evaluateRequirementGroup's return shape — the combined verdict for the whole group, plus
 * each member's own individually-computed result (e.g. for a future admin/detail view that
 * wants to show which specific alternative was met, not just that one was). */
export interface RequirementGroupEvaluationResult {
  status: RequirementEvaluationStatus;
  reasoning: string;
  memberResults: Map<string, RequirementEvaluationResult>;
}
