// Realistic fixture data for local visual development only (spec Phase 49 personas).
// Never imported by production data paths — only by app/(dev-preview)/**, which 404s
// outside development. See lib/dev/fixtures.ts's sibling README note in
// /docs/design-system.md for why this exists: this sandbox has no Supabase/Docker, so
// authenticated pages can't be rendered against real data during design work.
import type { ImpactLevel, OutlookLabel, Opportunity, ProfileDimension, University, UniversityProgram, UniversityRequirement, UniversityStatistic, WeeklyAction } from "@/types/database";
import type { TargetUniversityWithDetails } from "@/lib/universities/queries";
import type { WeeklyPlanWithActions } from "@/lib/plan/persist";
import { toProfileSignal } from "@/lib/scoring/signal";
import type { ProfileChange } from "@/lib/scoring/change";
import type { MonthlyReview } from "@/lib/scoring/monthly-review";

export const FIXTURE_STUDENT = {
  displayName: "Ada",
  profileStrengthScore: 77,
  trend: 3,
};

const DIMENSION_SCORES: Record<ProfileDimension, number> = {
  academics: 82,
  intellectual_curiosity: 74,
  leadership: 91,
  research: 42,
  entrepreneurship: 68,
  community_impact: 59,
  awards_distinction: 55,
  career_exploration: 71,
  execution_project_depth: 76,
};

/**
 * Scored-student fixture, shaped exactly like a `profile_scores` row.
 *
 * `reason_codes` is populated on purpose. A real scored dimension always carries at least
 * one, and an empty array is how the signal layer represents "this dimension found nothing
 * to score" — so a fixture that left it empty described a student with no evidence at all,
 * regardless of the scores sitting next to it. That is precisely the bug this fixture
 * shipped with: the preview rendered academics 82 / leadership 91 as "Getting started".
 */
export const FIXTURE_SCORES = (Object.entries(DIMENSION_SCORES) as [ProfileDimension, number][]).map(([dimension, score], index) => ({
  id: `score-${index}`,
  user_id: "fixture-user",
  dimension,
  score,
  confidence: "high" as const,
  calculation_version: "career_profile_v1",
  reason_codes: [{ code: `${dimension}_fixture`, detail: "Fixture evidence" }],
  calculated_at: new Date().toISOString(),
}));

/** The signal the preview renders, derived from the same rows rather than a parallel list. */
export const FIXTURE_PROFILE_SIGNAL = toProfileSignal(FIXTURE_SCORES);

/** A month with history, so the harness renders Progress's populated branch. */
export const FIXTURE_MONTHLY_REVIEW: MonthlyReview = {
  hasHistory: true,
  windowDays: 30,
  // Retained on the type for internal consumers; Progress no longer renders any of these.
  overallBefore: 74,
  overallAfter: 77,
  overallDelta: 3,
  dimensionDeltas: [
    { dimension: "research", before: 34, after: 42, delta: 8 },
    { dimension: "community_impact", before: 56, after: 59, delta: 3 },
    { dimension: "entrepreneurship", before: 70, after: 68, delta: -2 },
    { dimension: "academics", before: 82, after: 82, delta: 0 },
    { dimension: "leadership", before: 91, after: 91, delta: 0 },
  ],
  signal: FIXTURE_PROFILE_SIGNAL,
  projectsCompletedRecently: 1,
  applicationsSubmittedRecently: 2,
};

export const FIXTURE_BIGGEST_GAP = { dimension: "research" as ProfileDimension, score: 42 };
/** A month with real movement, so the preview exercises the populated branch. */
export const FIXTURE_PROFILE_CHANGE: ProfileChange = {
  hasHistory: true,
  improved: [
    { dimension: "research", delta: 8 },
    { dimension: "community_impact", delta: 3 },
  ],
  declined: [],
  steady: 7,
};

export const FIXTURE_AVOID_RECOMMENDATION = {
  title: "Starting another entrepreneurship club",
  reason:
    "Leadership and entrepreneurship are already among your strongest areas. Completing your current research project has higher expected value right now.",
};

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export const FIXTURE_WEEKLY_ACTIONS: WeeklyAction[] = [
  {
    id: "action-1",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Finish your economics dataset",
    description: null,
    reason: "This is the last blocker on your research project — the analysis can't start without it.",
    category: "research",
    priority: 1,
    estimated_minutes: 150,
    impact_level: "very_high" as ImpactLevel,
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    carried_forward: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "action-2",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Apply to the Economics Challenge",
    description: null,
    reason: "International, economics-focused, and closes in 6 days — a strong fit for your target field.",
    category: "opportunity",
    priority: 2,
    estimated_minutes: 60,
    impact_level: "high" as ImpactLevel,
    deadline: daysFromNow(6),
    status: "not_started",
    source_type: "opportunity",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    carried_forward: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "action-3",
    plan_id: "plan-1",
    user_id: "fixture-user",
    title: "Write the conclusion of your research paper",
    description: null,
    reason: "Your analysis is done — closing this out finishes your strongest piece of evidence this year.",
    category: "research",
    priority: 3,
    estimated_minutes: 45,
    impact_level: "high" as ImpactLevel,
    deadline: null,
    status: "not_started",
    source_type: "weekly_plan",
    source_id: null,
    reflection_outcome: null,
    reflection_note: null,
    completed_at: null,
    carried_forward: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const FIXTURE_WEEKLY_PLAN: WeeklyPlanWithActions = {
  plan: {
    id: "plan-1",
    user_id: "fixture-user",
    week_start_date: new Date().toISOString().slice(0, 10),
    summary:
      "Your research project is close to done. Finishing it and applying to one strong competition would meaningfully move your profile this month.",
    status: "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  actions: FIXTURE_WEEKLY_ACTIONS,
};

function stubUniversity(id: string, name: string, country: string, city: string): University {
  return {
    id,
    name,
    country,
    city,
    institution_type: null,
    canonical_entity_id: null,
    country_entity_id: null,
    city_entity_id: null,
    website_url: null,
    admissions_url: null,
    application_system: null,
    logo_url: null,
    description: null,
    selectivity: null,
    student_size: null,
    latitude: null,
    longitude: null,
    external_ids: {},
    data_confidence: "medium",
    data_status: "fresh",
    duplicate_status: "canonical",
    superseded_by_id: null,
    last_checked_at: daysFromNow(-5),
    last_changed_at: daysFromNow(-60),
    created_at: daysFromNow(-400),
    updated_at: daysFromNow(-5),
  };
}

function stubTarget(id: string, university: University, outlook: OutlookLabel): TargetUniversityWithDetails {
  return {
    id,
    user_id: "fixture-user",
    university_id: university.id,
    program_id: null,
    status: "target",
    notes: null,
    academic_fit_score: null,
    profile_fit_score: null,
    outlook,
    estimate_range_low: null,
    estimate_range_high: null,
    outlook_confidence: "medium",
    outlook_model_version: "admission_model_v1",
    outlook_calculated_at: daysFromNow(-3),
    created_at: daysFromNow(-40),
    updated_at: daysFromNow(-3),
    university,
  };
}

export const FIXTURE_TARGET_UNIVERSITIES: TargetUniversityWithDetails[] = [
  stubTarget("target-1", stubUniversity("uni-1", "Bocconi University", "Italy", "Milan"), "competitive"),
  stubTarget("target-2", stubUniversity("uni-2", "London School of Economics", "United Kingdom", "London"), "reach"),
  stubTarget("target-3", stubUniversity("uni-3", "Erasmus University Rotterdam", "Netherlands", "Rotterdam"), "strong"),
];

export const FIXTURE_UNIVERSITY: University = {
  id: "uni-2",
  name: "London School of Economics and Political Science",
  country: "United Kingdom",
  city: "London",
  institution_type: "Public research university",
  canonical_entity_id: null,
  country_entity_id: null,
  city_entity_id: null,
  website_url: "https://www.lse.ac.uk",
  admissions_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
  application_system: "UCAS",
  logo_url: null,
  description:
    "A specialist social science institution consistently ranked among the world's leading universities for economics, politics, and law.",
  selectivity: "Very high",
  student_size: 12000,
  latitude: 51.5144,
  longitude: -0.1165,
  external_ids: {},
  data_confidence: "high",
  data_status: "fresh",
  duplicate_status: "canonical",
  superseded_by_id: null,
  last_checked_at: daysFromNow(-2),
  last_changed_at: daysFromNow(-40),
  created_at: daysFromNow(-400),
  updated_at: daysFromNow(-2),
};

// ---------------------------------------------------------------------------------------
// University detail + compare fixtures, 2026-09-03. Built for the three design-preview
// routes the visual QA pass couldn't reach live (no QA credentials configured) —
// oryn-a7's own priority list: the cost caveat, the eligibility/requirement-check empty
// state 6e is about to change, and the tuition row f5 is wiring into compare. Real
// figures where a real figure exists (LSE's actual UCAS code, actual subjects, an actual
// current tuition band), not lorem — same standard this file's own header states.
// ---------------------------------------------------------------------------------------

export const FIXTURE_UNIVERSITY_STATISTICS: UniversityStatistic = {
  id: "stat-1",
  university_id: FIXTURE_UNIVERSITY.id,
  stat_year: 2025,
  admission_rate: 0.09,
  sat_range_low: null,
  sat_range_high: null,
  act_range_low: null,
  act_range_high: null,
  graduation_rate: 0.97,
  // Deliberately null, not a guessed dollar figure — cost_of_attendance is IPEDS-sourced and
  // US-only (this page's own comment on the StatCard branch); LSE's real figure lives in
  // FIXTURE_UNIVERSITY_PROFILE_METRICS's tuition_international_annual instead, exercising
  // the *other* branch of that same conditional.
  cost_of_attendance: null,
  cost_currency: null,
  source: "LSE official statistics, Key Facts 2025",
  data_confidence: "high" as const,
  retrieved_at: daysFromNow(-10),
  last_changed_at: daysFromNow(-70),
  created_at: daysFromNow(-200),
  updated_at: daysFromNow(-10),
};

export const FIXTURE_UNIVERSITY_PROGRAMS: UniversityProgram[] = [
  {
    id: "prog-1",
    university_id: FIXTURE_UNIVERSITY.id,
    name: "BSc Economics",
    normalized_name: "bsc economics",
    degree_level: "Bachelor / first-cycle",
    degree_type: "BSc",
    faculty_or_school: "Department of Economics",
    field: "Economics",
    subject_taxonomy: "economics",
    secondary_subject_tags: [],
    duration_years: 3,
    tuition_amount: null,
    tuition_currency: null,
    language_of_instruction: "English",
    campus: "Houghton Street, London",
    delivery_mode: "in_person",
    full_time_part_time: "full_time",
    international_eligible: true,
    official_program_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/BSc-Economics",
    admissions_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/BSc-Economics",
    source_type: "official_primary",
    verification_state: "verified_current",
    verified_at: daysFromNow(-10),
    notes: null,
    data_confidence: "high",
    created_at: daysFromNow(-200),
    updated_at: daysFromNow(-10),
    kilavuz_kodu: null,
    ucas_code: "L100",
  },
  {
    id: "prog-2",
    university_id: FIXTURE_UNIVERSITY.id,
    name: "BSc Government and Economics",
    normalized_name: "bsc government and economics",
    degree_level: "Bachelor / first-cycle",
    degree_type: "BSc",
    faculty_or_school: "Department of Government",
    field: "Politics",
    subject_taxonomy: "political_science",
    secondary_subject_tags: ["economics"],
    duration_years: 3,
    tuition_amount: null,
    tuition_currency: null,
    language_of_instruction: "English",
    campus: "Houghton Street, London",
    delivery_mode: "in_person",
    full_time_part_time: "full_time",
    international_eligible: true,
    official_program_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/BSc-Government-and-Economics",
    admissions_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/BSc-Government-and-Economics",
    source_type: "official_primary",
    verification_state: "verified_current",
    verified_at: daysFromNow(-10),
    notes: null,
    data_confidence: "high",
    created_at: daysFromNow(-200),
    updated_at: daysFromNow(-10),
    kilavuz_kodu: null,
    ucas_code: "LL12",
  },
  {
    id: "prog-3",
    university_id: FIXTURE_UNIVERSITY.id,
    name: "LLB Laws",
    normalized_name: "llb laws",
    degree_level: "Bachelor / first-cycle",
    degree_type: "LLB",
    faculty_or_school: "Law School",
    field: "Law",
    subject_taxonomy: "law",
    secondary_subject_tags: [],
    duration_years: 3,
    tuition_amount: null,
    tuition_currency: null,
    language_of_instruction: "English",
    campus: "Houghton Street, London",
    delivery_mode: "in_person",
    full_time_part_time: "full_time",
    international_eligible: true,
    official_program_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/LLB-Laws",
    admissions_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Degree-programmes-2026/LLB-Laws",
    source_type: "official_primary",
    verification_state: "verified_current",
    verified_at: daysFromNow(-10),
    notes: null,
    data_confidence: "high",
    created_at: daysFromNow(-200),
    updated_at: daysFromNow(-10),
    kilavuz_kodu: null,
    ucas_code: "M100",
  },
];

/** One shared stub, all the columns `RequirementGroup` itself never reads defaulted to
 * null/false — see that component's own doc comment for the exact subset it touches
 * (title, requirement_type, is_required, requirement_detail, source_url). Kept local
 * rather than exported generally: only this file's own requirement fixtures below use it. */
function stubRequirement(
  id: string,
  overrides: Partial<UniversityRequirement> & Pick<UniversityRequirement, "requirement_type" | "title">
): UniversityRequirement {
  return {
    id,
    university_id: FIXTURE_UNIVERSITY.id,
    program_id: null,
    requirement_detail: null,
    is_required: true,
    structured_rule: null,
    data_confidence: "high",
    data_status: "fresh",
    scope: null,
    verification_state: "verified_current",
    verified_at: daysFromNow(-10),
    requirement_group_id: null,
    group_role: null,
    is_exclusion: false,
    clause_ref: null,
    test_scale: null,
    scale_ambiguity: null,
    recency_rule: null,
    excluded_provenances: null,
    evaluation_gate: null,
    conflict_group_id: null,
    research_record_id: null,
    unmet_consequence: null,
    calendar_bound_fact_class: null,
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    retrieved_at: daysFromNow(-10),
    last_checked_at: daysFromNow(-10),
    created_at: daysFromNow(-30),
    updated_at: daysFromNow(-10),
    ...overrides,
  };
}

/** Requirement Check, populated — university-wide English proficiency plus two
 * programme-specific A-level conditions, exercising three of RequirementEvaluationBadge's
 * five real states (met/not_met/needs_manual_review) rather than one repeated everywhere. */
export const FIXTURE_UNIVERSITY_REQUIREMENTS: UniversityRequirement[] = [
  stubRequirement("req-1", {
    requirement_type: "english_proficiency",
    title: "IELTS Academic, overall band 7.0",
    requirement_detail: "Minimum 7.0 overall, with no individual component below 6.0. A recognised equivalent (TOEFL iBT 107+) is also accepted.",
  }),
  stubRequirement("req-2", {
    program_id: "prog-1",
    requirement_type: "minimum_grade",
    title: "A-levels: A*AA including Mathematics",
    requirement_detail: "Mathematics at A-level (or equivalent) is required for entry to BSc Economics specifically.",
  }),
  stubRequirement("req-3", {
    program_id: "prog-1",
    requirement_type: "essay",
    title: "Personal statement",
    is_required: true,
  }),
  stubRequirement("req-4", {
    program_id: "prog-3",
    requirement_type: "entrance_exam",
    title: "LNAT (Law National Aptitude Test)",
    requirement_detail: "Required for all Law School undergraduate applicants, sat before the UCAS deadline.",
  }),
];

/** The empty state 6e is changing what the Requirement Check section renders for. Not
 * imported by the preview's default render — the page component below reads a `?requirements=empty`
 * query param so both states are one link apart rather than two separate routes to keep in sync. */
export const FIXTURE_UNIVERSITY_REQUIREMENTS_EMPTY: UniversityRequirement[] = [];

/** { requirement_id -> evaluation }, matching student_requirement_evaluations' own shape —
 * met/not_met/needs_manual_review represented, `unknown` deliberately left absent from any
 * row (RequirementEvaluationBadge's own distinct "no entry at all" case, see that
 * component and RequirementGroup's shared doc comment on why absence is never met/not_met). */
export const FIXTURE_REQUIREMENT_EVALUATIONS = new Map<string, { status: "met" | "likely_met" | "not_met" | "unknown" | "needs_manual_review"; reasoning: string }>([
  ["req-1", { status: "met", reasoning: "Your recorded English proficiency (IELTS 7.5) clears this threshold." }],
  ["req-2", { status: "needs_manual_review", reasoning: "Your predicted grades (A*A*A) clear this, but Oryn can't confirm Mathematics is one of your three A-levels from what's on file." }],
  ["req-3", { status: "not_met", reasoning: "No personal statement is recorded on your profile yet." }],
  // req-4 deliberately has no entry — the "no evaluation recorded" case, distinct from any status.
]);

export const FIXTURE_UNIVERSITY_DEADLINES = [
  {
    id: "deadline-1",
    program_id: null,
    deadline_type: "ucas_equal_consideration",
    deadline_date: daysFromNow(120).slice(0, 10),
    recurrence: "dated_specific",
    recurrence_month: null,
    recurrence_day: null,
    cycle_label: "2027 entry",
    verification_state: "verified_current",
    deadline_text_verbatim: "UCAS applications must be received by 18:00 (UK time) on the deadline date to be given equal consideration.",
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    binding_policy: "non_binding",
  },
  {
    id: "deadline-2",
    program_id: "prog-3",
    deadline_type: "lnat_registration",
    deadline_date: null,
    recurrence: "recurring_annual_undated",
    recurrence_month: 1,
    recurrence_day: 20,
    cycle_label: null,
    verification_state: "verified_current",
    deadline_text_verbatim: null,
    source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Applying-to-LSE",
    binding_policy: "binding",
  },
];

export const FIXTURE_UNIVERSITY_RANKINGS = [
  { ranking_provider: "QS", ranking_edition: "2026", rank_display: "45", source_url: "https://www.topuniversities.com/university-rankings/world-university-rankings/2026", verified_at: daysFromNow(-30), data_quality_flag: null },
];

export const FIXTURE_UNIVERSITY_PROFILE_METRICS = [
  { metric_code: "research_topics_top5", value_numeric: null, value_text: "Behavioural economics | Political economy | International trade | Public policy | Econometrics", unit: null, source_url: "https://openalex.org", source_type: "openalex", verified_at: daysFromNow(-15), precision_state: null, data_quality_flag: null },
  { metric_code: "undergraduate_students", value_numeric: 5100, value_text: null, unit: "students", source_url: null, source_type: null, verified_at: daysFromNow(-10), precision_state: null, data_quality_flag: null },
  { metric_code: "postgraduate_students", value_numeric: 6900, value_text: null, unit: "students", source_url: null, source_type: null, verified_at: daysFromNow(-10), precision_state: null, data_quality_flag: null },
  // The branch this exercises on the detail page: no cost_of_attendance (US-only), a real
  // international tuition figure instead — LSE's own published 2025/26 international
  // undergraduate fee, a single exact figure (precision_state "exact"), not a range.
  { metric_code: "tuition_international_annual", value_numeric: 26400, value_text: null, unit: "GBP", source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Fees-and-funding", source_type: "official_primary", verified_at: daysFromNow(-10), precision_state: "exact", data_quality_flag: null },
  { metric_code: "tuition_domestic_annual", value_numeric: 9535, value_text: null, unit: "GBP", source_url: "https://www.lse.ac.uk/study-at-lse/Undergraduate/Fees-and-funding", source_type: "official_primary", verified_at: daysFromNow(-10), precision_state: "exact", data_quality_flag: null },
];

/** DimensionScoreInput[], reusing FIXTURE_SCORES rather than a second hand-typed list —
 * same reasoning as this file's own header: one source of truth per fixture concept. */
export const FIXTURE_DIMENSION_SCORES: { dimension: ProfileDimension; score: number; confidence: "high" | "medium" | "low" }[] = FIXTURE_SCORES.map((s) => ({
  dimension: s.dimension,
  score: s.score,
  confidence: s.confidence,
}));

/** A second and third university, real institutions with real-shaped (not lorem)
 * descriptive fields, for the compare preview — comparing one university against itself
 * proves nothing about the table's own layout logic. */
export const FIXTURE_UNIVERSITY_2: University = {
  ...stubUniversity("uni-1", "Bocconi University", "Italy", "Milan"),
  institution_type: "Private research university",
  website_url: "https://www.unibocconi.it",
  application_system: "Bocconi International Admission Test",
  description: "Italy's leading institution for economics, management and law, with English-taught undergraduate programmes.",
  student_size: 14500,
  data_confidence: "high",
};

export const FIXTURE_UNIVERSITY_3: University = {
  ...stubUniversity("uni-3", "Erasmus University Rotterdam", "Netherlands", "Rotterdam"),
  institution_type: "Public research university",
  website_url: "https://www.eur.nl",
  application_system: "Studielink",
  description: "A research university built around six specialised schools, including the Rotterdam School of Management and Erasmus School of Economics.",
  student_size: 32000,
  data_confidence: "medium",
};

export const FIXTURE_COMPARE_STATISTICS = [
  FIXTURE_UNIVERSITY_STATISTICS,
  { id: "stat-2", university_id: FIXTURE_UNIVERSITY_2.id, stat_year: 2025, admission_rate: 0.12, sat_range_low: null, sat_range_high: null, act_range_low: null, act_range_high: null, graduation_rate: 0.95, cost_of_attendance: null, cost_currency: null, source: "Bocconi official admissions data", data_confidence: "high" as const, retrieved_at: daysFromNow(-12), last_changed_at: daysFromNow(-80), created_at: daysFromNow(-200), updated_at: daysFromNow(-12) },
  // Deliberately no statistics row for Erasmus — the compare table's own "—" cells (the NA
  // constant) are only a real state if at least one column in the fixture actually hits it.
];

export const FIXTURE_COMPARE_RANKINGS = [
  ...FIXTURE_UNIVERSITY_RANKINGS.map((r) => ({ university_id: FIXTURE_UNIVERSITY.id, rank_display: r.rank_display })),
  { university_id: FIXTURE_UNIVERSITY_2.id, rank_display: "158" },
  // Erasmus again deliberately absent — no QS rank on file is a real, current state for a
  // real share of the catalogue, not a fixture gap to paper over.
];

/** Matches the real compare page's own post-2026-09-03 query shape (metric_code IN
 * [research_topics_top5, tuition_domestic_annual, tuition_international_annual]) now that
 * f5's tuition-row change has landed on main — see this file's own comment on
 * FIXTURE_UNIVERSITY_PROFILE_METRICS for LSE's real figures, reused verbatim rather than
 * re-typed. Bocconi and Erasmus deliberately carry no tuition rows: real published,
 * confidently-sourced figures for either weren't in hand to add honestly, and "not yet on
 * file" is itself the real, common state for most of the 173-row rollout — exercising the
 * new column's NA case is as legitimate as exercising its populated one.
 */
export const FIXTURE_COMPARE_PROFILE_METRICS = [
  { university_id: FIXTURE_UNIVERSITY.id, metric_code: "research_topics_top5", value_text: "Behavioural economics | Political economy | International trade", value_numeric: null, unit: null, precision_state: null },
  { university_id: FIXTURE_UNIVERSITY_2.id, metric_code: "research_topics_top5", value_text: "Quantitative finance | Marketing analytics | Public policy", value_numeric: null, unit: null, precision_state: null },
  { university_id: FIXTURE_UNIVERSITY.id, metric_code: "tuition_international_annual", value_text: null, value_numeric: 26400, unit: "GBP", precision_state: "exact" as const },
  { university_id: FIXTURE_UNIVERSITY.id, metric_code: "tuition_domestic_annual", value_text: null, value_numeric: 9535, unit: "GBP", precision_state: "exact" as const },
];

/** A richer opportunity than Browse's own fixtures need — the detail page's cost caveat
 * and eligibility-notes sections only render with real values in these specific fields, so
 * a fixture reused from FIXTURE_OPPORTUNITIES (all null on both) would leave those two
 * sections invisible in exactly the review oryn-a7 asked for. Local to this file's detail-
 * page fixtures rather than folded into FIXTURE_OPPORTUNITIES, for the same single-purpose
 * reasoning the counselor preview's own fixture already uses. */
export const FIXTURE_OPPORTUNITY_DETAIL: Opportunity = {
  id: "opp-detail-1",
  title: "Erasmus Summer Institute in Economics",
  organization: "Erasmus University Rotterdam",
  description:
    "A three-week pre-university programme covering microeconomics, macroeconomics, and applied econometrics, taught by Erasmus School of Economics faculty alongside current undergraduates.",
  category: "summer_program",
  official_url: "https://www.eur.nl/en/education/pre-university/summer-institute-economics",
  application_url: "https://www.eur.nl/en/education/pre-university/summer-institute-economics/apply",
  country: "Netherlands",
  remote_allowed: false,
  minimum_age: 16,
  maximum_age: 18,
  eligible_countries: [],
  fields: ["Economics", "Econometrics"],
  cost: 2450,
  funding_available: true,
  deadline: daysFromNow(35).slice(0, 10),
  start_date: daysFromNow(210).slice(0, 10),
  end_date: daysFromNow(231).slice(0, 10),
  source: "Erasmus University Rotterdam",
  source_url: "https://www.eur.nl/en/education/pre-university/summer-institute-economics",
  source_confidence: "high",
  last_verified_at: daysFromNow(-6),
  status: "active",
  normalized_title: "erasmus summer institute in economics",
  cycle_status: "open",
  selectivity_tier: "selective",
  verification_state: "verified_current",
  application_open_date: daysFromNow(-20).slice(0, 10),
  eligible_grades: [],
  // The eligibility-notes section: a real, specific restriction, not a placeholder string.
  citizenship_restrictions: null,
  residency_restrictions: "Open to students residing anywhere in the EU/EEA or holding a Dutch residence permit; non-EU/EEA applicants require a separate visa-eligibility check before applying.",
  eligible_citizenships: [],
  location_mode: "in_person",
  // The cost caveat's own two branches: a real, non-zero figure AND financial_aid_available
  // both true at once, so the "· financial aid available" suffix actually renders next to a
  // real amount rather than only being exercisable against Free/$0.
  financial_aid_available: true,
  application_requirements: ["transcript", "personal_statement", "teacher_recommendation"],
  languages_of_instruction: ["English"],
  image_url: null,
  image_source_url: null,
  image_attribution: null,
  current_cycle_label: "Summer 2027",
  verified_at: daysFromNow(-6),
  organization_entity_id: null,
  country_entity_id: null,
  access_channel: null,
  country_eligibility_confirmed_open: true,
  created_at: daysFromNow(-25),
  updated_at: daysFromNow(-6),
};

export const FIXTURE_OPPORTUNITY_MATCH = {
  id: "match-detail-1",
  user_id: "fixture-user",
  opportunity_id: FIXTURE_OPPORTUNITY_DETAIL.id,
  eligible: true,
  eligibility_notes: null,
  relevance_score: 88,
  profile_need_score: 74,
  effort_estimate: "medium",
  match_score: 91,
  reason_codes: ["addresses_a_current_gap", "matches_your_interests"],
  calculated_at: daysFromNow(-1),
  match_confidence: "strong" as const,
};

export const FIXTURE_OPPORTUNITY_SOURCES = [
  {
    id: "opp-source-1",
    opportunity_id: FIXTURE_OPPORTUNITY_DETAIL.id,
    source_url: "https://www.eur.nl/en/education/pre-university/summer-institute-economics",
    source_domain: "eur.nl",
    confidence: "high",
    retrieved_at: daysFromNow(-6),
  },
  {
    id: "opp-source-2",
    opportunity_id: FIXTURE_OPPORTUNITY_DETAIL.id,
    source_url: "https://www.eur.nl/en/education/pre-university/summer-institute-economics/apply",
    source_domain: "eur.nl",
    confidence: "high",
    retrieved_at: daysFromNow(-6),
  },
];

export const FIXTURE_OPPORTUNITIES: { opportunity: Opportunity; matchScore: number; reasonCodes: string[] }[] = [
  {
    opportunity: {
      id: "opp-1",
      title: "International Economics Challenge 2027",
      organization: "Global Economics Foundation",
      description:
        "A team-based competition analyzing real-world economic policy questions, open to students aged 15-18 worldwide.",
      category: "competition",
      official_url: "https://example.org/economics-challenge",
      application_url: "https://example.org/economics-challenge/apply",
      country: null,
      remote_allowed: true,
      minimum_age: 15,
      maximum_age: 18,
      eligible_countries: [],
      fields: ["Economics"],
      cost: 0,
      funding_available: false,
      deadline: daysFromNow(6),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/economics-challenge",
      source_confidence: "high",
      last_verified_at: daysFromNow(-3),
      status: "active",
      normalized_title: "international economics challenge",
      cycle_status: "open",
      selectivity_tier: "selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: false,
      application_requirements: [],
      languages_of_instruction: ["English"],
      image_url: null,
      image_source_url: null,
      image_attribution: null,
      current_cycle_label: "2027",
      verified_at: daysFromNow(-3),
      // null on every fixture below, deliberately -- migration 0103's own "no backfill"
      // rule (design doc §8.6) applies here too: a dev fixture claiming this job actually
      // fetched a page would be exactly the fabricated-verification shape this field exists
      // to rule out, even in fixture data nobody reads as production truth.
      source_verified_at: null,
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      // Matches this fixture's own description ("open to students aged 15-18 worldwide") —
      // the research-confirmed-open case, so no "not verified" note renders for it.
      country_eligibility_confirmed_open: true,
      created_at: daysFromNow(-30),
      updated_at: daysFromNow(-3),
    },
    matchScore: 91,
    reasonCodes: ["matches_your_interests", "addresses_a_current_gap"],
  },
  {
    opportunity: {
      id: "opp-2",
      title: "Youth Research Fellows Programme",
      organization: "OECD Youth Network",
      description: "An 8-week mentored research fellowship pairing students with economists on live policy datasets.",
      category: "research",
      official_url: "https://example.org/research-fellows",
      application_url: null,
      country: null,
      remote_allowed: true,
      minimum_age: 16,
      maximum_age: 19,
      eligible_countries: [],
      fields: ["Economics", "Public Policy"],
      cost: 0,
      funding_available: true,
      deadline: daysFromNow(21),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/research-fellows",
      source_confidence: "medium",
      last_verified_at: daysFromNow(-5),
      status: "active",
      normalized_title: "youth research fellows programme",
      cycle_status: "upcoming",
      selectivity_tier: "highly_selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: true,
      application_requirements: [],
      // Bilingual on purpose — exercises the "&"-joined multi-language label, which a
      // single-language fixture would never surface.
      languages_of_instruction: ["English", "Turkish"],
      image_url: null,
      image_source_url: null,
      image_attribution: null,
      current_cycle_label: "2027",
      verified_at: daysFromNow(-5),
      source_verified_at: null,
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      // Deliberately unconfirmed — the live-common case, so dev preview exercises the
      // "Country eligibility not verified yet" advisory note on a realistic row.
      country_eligibility_confirmed_open: false,
      created_at: daysFromNow(-20),
      updated_at: daysFromNow(-5),
    },
    matchScore: 78,
    reasonCodes: ["addresses_a_current_gap"],
  },
  // Three more categories, added 2026-09-03 specifically so this preview exercises the
  // category-glyph placeholder (features/opportunities/opportunity-card.tsx,
  // lib/opportunities/category-glyph.ts) across genuinely different categories side by side
  // — the whole point of a category-keyed glyph is invisible with only "competition" and
  // "research" (the two categories the fixtures above already covered) on screen at once.
  {
    opportunity: {
      id: "opp-3",
      title: "Coastal Ecology Summer Institute",
      organization: "Marine Futures Trust",
      description: "A four-week residential summer programme studying coastal ecosystems, fieldwork included.",
      category: "summer_program",
      official_url: "https://example.org/coastal-ecology",
      application_url: null,
      country: null,
      remote_allowed: false,
      minimum_age: 16,
      maximum_age: 18,
      eligible_countries: [],
      fields: ["Environmental Science"],
      cost: 1200,
      funding_available: true,
      deadline: daysFromNow(45),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/coastal-ecology",
      source_confidence: "medium",
      last_verified_at: daysFromNow(-8),
      status: "active",
      normalized_title: "coastal ecology summer institute",
      cycle_status: "upcoming",
      selectivity_tier: "competitive_award",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "in_person",
      financial_aid_available: true,
      application_requirements: [],
      languages_of_instruction: ["English"],
      image_url: null,
      image_source_url: null,
      image_attribution: null,
      current_cycle_label: null,
      verified_at: daysFromNow(-8),
      source_verified_at: null,
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      country_eligibility_confirmed_open: false,
      created_at: daysFromNow(-15),
      updated_at: daysFromNow(-8),
    },
    matchScore: 64,
    reasonCodes: ["shares_your_interest"],
  },
  {
    opportunity: {
      id: "opp-4",
      title: "Global Merit Scholarship",
      organization: "Open Futures Foundation",
      description: "A full-tuition scholarship for international students pursuing undergraduate study abroad.",
      category: "scholarship",
      official_url: "https://example.org/global-merit-scholarship",
      application_url: null,
      country: null,
      remote_allowed: true,
      minimum_age: null,
      maximum_age: null,
      eligible_countries: [],
      fields: [],
      cost: 0,
      funding_available: true,
      deadline: daysFromNow(90),
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/global-merit-scholarship",
      source_confidence: "high",
      last_verified_at: daysFromNow(-2),
      status: "active",
      normalized_title: "global merit scholarship",
      cycle_status: "open",
      selectivity_tier: "highly_selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: true,
      application_requirements: [],
      languages_of_instruction: ["English"],
      image_url: null,
      image_source_url: null,
      image_attribution: null,
      current_cycle_label: null,
      verified_at: daysFromNow(-2),
      source_verified_at: null,
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      country_eligibility_confirmed_open: true,
      created_at: daysFromNow(-40),
      updated_at: daysFromNow(-2),
    },
    matchScore: 55,
    reasonCodes: [],
  },
  {
    opportunity: {
      id: "opp-5",
      title: "Student Founders Accelerator",
      organization: "Launch Collective",
      description: "A ten-week programme for students building an early-stage startup, with mentorship and seed funding.",
      category: "entrepreneurship",
      official_url: "https://example.org/founders-accelerator",
      application_url: null,
      country: null,
      remote_allowed: true,
      minimum_age: 15,
      maximum_age: 19,
      eligible_countries: [],
      fields: ["Entrepreneurship"],
      cost: 0,
      funding_available: true,
      deadline: null,
      start_date: null,
      end_date: null,
      source: "tavily",
      source_url: "https://example.org/founders-accelerator",
      source_confidence: "medium",
      last_verified_at: daysFromNow(-10),
      status: "active",
      normalized_title: "student founders accelerator",
      cycle_status: "date_not_announced",
      selectivity_tier: "selective",
      verification_state: "verified_current",
      application_open_date: null,
      eligible_grades: [],
      citizenship_restrictions: null,
      residency_restrictions: null,
      eligible_citizenships: [],
      location_mode: "online",
      financial_aid_available: true,
      application_requirements: [],
      languages_of_instruction: [],
      image_url: null,
      image_source_url: null,
      image_attribution: null,
      current_cycle_label: "Rolling",
      verified_at: daysFromNow(-10),
      source_verified_at: null,
      organization_entity_id: null,
      country_entity_id: null,
      access_channel: null,
      country_eligibility_confirmed_open: false,
      created_at: daysFromNow(-10),
      updated_at: daysFromNow(-10),
    },
    matchScore: 47,
    reasonCodes: [],
  },
];

export const FIXTURE_DEADLINES = [
  { id: "d1", title: "Apply to the Economics Challenge", date: daysFromNow(6), href: "/opportunities", source: "opportunity" as const },
  { id: "d2", title: "LSE — Economics, personal statement", date: daysFromNow(12), href: "/applications", source: "application" as const },
  { id: "d3", title: "Erasmus Rotterdam — program deadline", date: daysFromNow(28), href: "/universities/uni-3", source: "university" as const },
];
