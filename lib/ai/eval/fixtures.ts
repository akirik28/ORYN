import type { StudentAdvisorContext } from "@/lib/ai/student-context";
import type { CounselorRecommendation, CounselorResult } from "@/lib/counselor/types";
import type { EvalFixture } from "./types";

/**
 * Fixture student profiles, shaped as `StudentAdvisorContext` directly rather than built
 * from database rows — `formatContextForPrompt`/`formatOpportunityContext`/
 * `formatCounselorGrounding` are already pure, already-exported functions taking exactly
 * this shape (see each one's own "testable without a database" comment), so a harness that
 * feeds them fixture data needs no database and touches none of the three production
 * generator files. Two fixtures, not the spec's full four-persona set (PHASE 49) — this
 * package's job is the two known regressions plus one general baseline, not an exhaustive
 * persona sweep, which is a reasonable thing to add to this same directory later rather
 * than something this pass needs to front-load.
 */

const NOW = new Date("2026-09-01T12:00:00Z");
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Built specifically to re-trigger both named regressions if the prompt-level fix ever
 * regresses, and to give a demanding-mentor reply an unambiguous occasion to discourage
 * something (Phase 39): leadership and entrepreneurship are both `strong` with real
 * evidence, research is `not_assessed` (the exact "Academics is 0/100" shape, on a
 * different dimension so the label itself isn't the thing the check greps for), and the
 * one target university carries `extreme_reach` — the specific enum CEO named.
 */
export const REGRESSION_CONTEXT: StudentAdvisorContext = {
  student: {
    displayName: "Deniz",
    preferredLanguage: "en",
    country: "Turkey",
    schoolName: "Istanbul International School",
    graduationYear: 2028,
    // The real CurriculumType enum key ("ib"), not the onboarding UI's display label
    // ("IB", lib/validation/onboarding.ts's CURRICULUM_OPTIONS). Same class of drift as
    // weeklyTimeBudget below, found in the same 2026-09-02 shape-drift sweep — confirmed
    // against live data too: every real profile with a curriculum set stores it lowercase
    // ("ap"/"ib"). formatContextForPrompt interpolates this raw, so the old value showed
    // the model prompt text ("...IB, Turkey.") no real student's profile ever produces.
    curriculum: "ib",
    // The real TimeBudget enum key (types/database.ts), not display prose — a production
    // prompt shows exactly this raw string (formatContextForPrompt never translates it),
    // so this fixture previously showed the model prompt text no real student's profile
    // would ever actually produce. Found 2026-09-02 while wiring enforceTimeBudget into
    // the eval harness: the guardrail's bucket lookup needs the exact enum key to fire at
    // all, and "5-10 hours" silently matched nothing, so a grossly over-budget fixture
    // plan would have passed through untrimmed with no error and no warning either.
    weeklyTimeBudget: "5_10h",
    busyMode: false,
    busyModeUntil: null,
    birthYear: 2010,
    citizenshipCountries: ["Turkey"],
    tier: "standard",
    advisorInstructions: null,
  },
  profileScores: [
    { dimension: "leadership", score: 88, confidence: "high", state: "strong" },
    { dimension: "entrepreneurship", score: 82, confidence: "high", state: "strong" },
    { dimension: "academics", score: 71, confidence: "medium", state: "developing" },
    { dimension: "research", score: 0, confidence: "low", state: "not_assessed" },
    { dimension: "intellectual_curiosity", score: 55, confidence: "medium", state: "emerging" },
    { dimension: "community_impact", score: 40, confidence: "low", state: "limited_evidence" },
    { dimension: "awards_distinction", score: 0, confidence: "low", state: "not_assessed" },
    { dimension: "career_exploration", score: 35, confidence: "low", state: "limited_evidence" },
    { dimension: "execution_project_depth", score: 60, confidence: "medium", state: "emerging" },
  ],
  overallScore: 66,
  completenessPercent: 74,
  activities: [
    { title: "Founder, School Investment Club", category: "entrepreneurship", isLeadership: true, ongoing: true, evidenceStatus: "verified" },
    { title: "Student Council President", category: "leadership", isLeadership: true, ongoing: true, evidenceStatus: "verified" },
  ],
  projects: [{ title: "Peer tutoring marketplace (side project)", outcomeSummary: "40 active student users, self-funded", ongoing: true, evidenceStatus: "self_reported" }],
  research: [],
  awards: [{ title: "Regional Young Entrepreneur Award, 2nd place", level: "regional", evidenceStatus: "evidence_added" }],
  // 2026-09-03 six-category build: matches academics sitting at "developing" (71/100, above) —
  // a real IB courseload and a real, mid-range SAT, neither strong enough on their own to
  // explain the score, both present enough that formatContextForPrompt has something to show.
  educationRecords: [{ schoolName: "Istanbul International School", overallGpa: 5.8, gpaScale: 7 }],
  courses: [
    { courseName: "Economics HL", level: "ib_hl", gradeValue: "6", gradeScale: "IB 1-7" },
    { courseName: "Mathematics: Analysis and Approaches SL", level: "ib_sl", gradeValue: "5", gradeScale: "IB 1-7" },
  ],
  testScores: [{ testName: "SAT", score: "1380", maxScore: "1600", subscores: { math: 700, reading_writing: 680 } }],
  certifications: [],
  volunteeringExperiences: [],
  workExperiences: [],
  sports: [],
  goals: [{ title: "Study Economics at a top European university", category: "academic" }],
  interests: ["Economics", "Entrepreneurship"],
  // 2026-09-04, added alongside StudentAdvisorContext's new `skills` field — fits the
  // entrepreneurship/leadership persona, exercises the populated path (BASELINE_CONTEXT
  // below exercises the empty one).
  skills: [
    { name: "Financial modeling", category: "analytical" },
    { name: "Public speaking", category: "communication" },
  ],
  targetUniversities: [{ id: "t1", universityId: "u1", programId: null, name: "London School of Economics", status: "target", outlook: "extreme_reach" }],
  upcomingDeadlines: [{ title: "LSE — personal statement", date: inDays(21), source: "target_university" }],
  recentRecommendationTitles: [],
  recentActionOutcomes: [],
  pendingApplicationRequirements: [],
};

/** No dimension is unassessed, no discourage-worthy imbalance, nothing to trip either
 * regression check — the control case a tone/register score should still hold up on. */
export const BASELINE_CONTEXT: StudentAdvisorContext = {
  student: {
    displayName: "Ada",
    preferredLanguage: "en",
    country: "United States",
    schoolName: "Lincoln High School",
    graduationYear: 2027,
    curriculum: "ap", // see REGRESSION_CONTEXT's comment above — real enum key, not the display label
    weeklyTimeBudget: "2_5h", // see REGRESSION_CONTEXT's comment above — real enum key, not prose
    busyMode: true,
    busyModeUntil: inDays(14),
    birthYear: 2009,
    citizenshipCountries: ["United States"],
    tier: "standard",
    advisorInstructions: null,
  },
  profileScores: [
    { dimension: "academics", score: 85, confidence: "high", state: "strong" },
    { dimension: "research", score: 62, confidence: "medium", state: "developing" },
    { dimension: "intellectual_curiosity", score: 70, confidence: "medium", state: "developing" },
    { dimension: "leadership", score: 45, confidence: "medium", state: "emerging" },
    { dimension: "entrepreneurship", score: 30, confidence: "medium", state: "emerging" },
    { dimension: "community_impact", score: 50, confidence: "medium", state: "emerging" },
    { dimension: "awards_distinction", score: 20, confidence: "medium", state: "emerging" },
    { dimension: "career_exploration", score: 40, confidence: "medium", state: "emerging" },
    { dimension: "execution_project_depth", score: 55, confidence: "medium", state: "emerging" },
  ],
  overallScore: 51,
  completenessPercent: 68,
  activities: [{ title: "Science Olympiad team member", category: "academic", isLeadership: false, ongoing: true, evidenceStatus: "verified" }],
  projects: [{ title: "Youth unemployment dataset (OECD extract)", outcomeSummary: "Data cleaned, analysis in progress", ongoing: true, evidenceStatus: "verified" }],
  research: [{ title: "Youth unemployment and tertiary education across OECD countries", field: "Economics", outputType: "independent study", ongoing: true, evidenceStatus: "self_reported" }],
  awards: [],
  // 2026-09-03 six-category build: matches academics sitting at "strong" (85/100, above) — a
  // strong GPA and a strong SAT, the evidence a demanding-mentor reply should be able to cite
  // instead of only ever quoting the 85.
  educationRecords: [{ schoolName: "Lincoln High School", overallGpa: 3.9, gpaScale: 4 }],
  courses: [
    { courseName: "AP Calculus BC", level: "ap", gradeValue: "A", gradeScale: "4.0" },
    { courseName: "AP Chemistry", level: "ap", gradeValue: "A-", gradeScale: "4.0" },
  ],
  testScores: [{ testName: "SAT", score: "1490", maxScore: "1600", subscores: { math: 760, reading_writing: 730 } }],
  certifications: [],
  volunteeringExperiences: [],
  workExperiences: [],
  sports: [{ sport: "Swimming", level: "varsity", isCaptain: false, hoursPerWeek: 6, ongoing: true, achievements: null }],
  goals: [{ title: "Improve SAT score", category: "academic" }],
  interests: ["Economics", "Data Science"],
  // Empty, same as certifications/volunteeringExperiences/workExperiences above — exercises
  // formatContextForPrompt's "none set" fallback for this field (REGRESSION_CONTEXT exercises
  // the populated path).
  skills: [],
  targetUniversities: [{ id: "t2", universityId: "u2", programId: null, name: "University of Michigan", status: "exploring", outlook: "competitive" }],
  upcomingDeadlines: [{ title: "Economics Challenge — application", date: inDays(6), source: "opportunity" }],
  recentRecommendationTitles: ["Start a school investment club"],
  recentActionOutcomes: [{ title: "Finish the OECD dataset cleanup", status: "completed", reflectionOutcome: "completed_successfully", reflectionNote: "Took longer than expected but done." }],
  pendingApplicationRequirements: [],
};

/** Advisor-chat needs a triggering question, not just a profile — this is the one case
 * spec 8.3 uses verbatim as the canonical example of Phase 39 behavior, on a profile
 * shaped to make "no" the objectively correct answer (leadership/entrepreneurship already
 * strong, research the real gap). */
export const REGRESSION_CHAT_QUESTION = "Should I start another entrepreneurship club?";
export const BASELINE_CHAT_QUESTION = "What should I focus on this week?";

/**
 * Defaults are shaped for REGRESSION_CONTEXT specifically (research `0`/`not_assessed`
 * there, so "currently unassessed" in `why` below is true for it) — any other fixture using
 * `rec()` must override every field whose accuracy depends on the student's own data, not
 * just `id`/`title`. Found live 2026-09-03 (CEO, tracing a model reply back to its source
 * rather than assuming invention): BASELINE_COUNSELOR_RESULT's only recommendation called
 * `rec()` with just an id/title override, leaving this `why` — "currently unassessed" —
 * sitting in the baseline prompt even though BASELINE_CONTEXT's own `profileScores` has
 * research at `62`/`developing`, genuinely assessed. The model was faithfully repeating a
 * false sentence that was already in its context, not fabricating one; every advisor_chat
 * and weekly_plan case built on BASELINE_COUNSELOR_RESULT before this fix carried that
 * contradiction (`why[0]` reaches the model directly — see opportunity-context.ts's/
 * weekly-plan.ts's own `recommendation.why[0]` lines). `matchedGapDimensions: ["research"]`
 * has the identical defect for the identical reason (research is one of BASELINE's
 * *strongest* assessed dimensions, not a gap) but is never rendered into any prompt this
 * package builds (grep confirms no caller reads it) — fixed anyway, for the same reason a
 * data-hygiene bug is worth closing before it becomes a live one.
 */
function rec(overrides: Partial<CounselorRecommendation> = {}): CounselorRecommendation {
  return {
    id: "opportunity:fixture-1",
    title: "Youth Economics Research Fellowship",
    recommendationClass: "do",
    why: ["Addresses Research, currently unassessed — the profile's least-evidenced dimension."],
    matchedGapDimensions: ["research"],
    impact: "high",
    effort: "high",
    urgency: "medium",
    deadline: { date: inDays(30), sourceLabel: "opportunity" },
    costOnFile: null,
    applicationRequirements: [],
    eligibility: { verdict: "known_eligible", notes: [] },
    confidence: "high",
    evidence: [{ sourceType: "opportunity", sourceId: "fixture-1", sourceUrl: "https://example.org", verificationState: "verified_current" }],
    warnings: [],
    nextAction: { label: "View opportunity", type: "VIEW", href: "/opportunities/fixture-1" },
    ...overrides,
  };
}

/** counselor-explain's real input shape — a CounselorResult, not a StudentAdvisorContext.
 * One `do` and one `avoid_for_now`, so the narrated summary has a genuine occasion to
 * discourage something (the `avoid_for_now` item) rather than only ever describing what
 * to pursue. */
export const REGRESSION_COUNSELOR_RESULT: CounselorResult = {
  scoreVersion: "counselor_ranking_v1",
  gaps: [],
  recommendations: [
    rec(),
    rec({
      id: "activity:fixture-club",
      title: "Start a second entrepreneurship club",
      recommendationClass: "avoid_for_now",
      why: ["Leadership and entrepreneurship are already strong; this would not address the real gap."],
      matchedGapDimensions: [],
      impact: "low",
      effort: "medium",
      deadline: null,
      nextAction: { label: "Review", type: "VIEW", href: "/profile" },
    }),
  ],
  profileReadiness: { completenessPercent: 74, sufficientForJudgment: true },
  // Matches REGRESSION_CONTEXT.student below — kept in sync by hand since the two fixtures
  // model the same student through two different types (StudentAdvisorContext vs.
  // CounselorResult's narrower studentIdentity) and there is no single shared source to
  // derive both from.
  studentIdentity: { displayName: "Deniz", country: "Turkey", graduationYear: 2028, curriculum: "ib" },
};

export const BASELINE_COUNSELOR_RESULT: CounselorResult = {
  scoreVersion: "counselor_ranking_v1",
  gaps: [],
  recommendations: [
    rec({
      id: "opportunity:fixture-2",
      title: "Regional Science Fair",
      // Accurate for THIS fixture: research is 62/developing, not unassessed, and already
      // has an ongoing project behind it — the real reason this recommendation makes sense
      // is independent verification, not filling an empty dimension.
      why: ["Builds on the OECD youth-unemployment research already in progress, adding independent, verifiable recognition beyond the current self-reported evidence."],
      // Not a gap dimension for this profile (research is 62, stronger than five other
      // assessed dimensions) — matches REGRESSION's own avoid_for_now rec's use of [] when
      // a recommendation doesn't correspond to a real gap.
      matchedGapDimensions: [],
    }),
  ],
  profileReadiness: { completenessPercent: 68, sufficientForJudgment: true },
  // Matches BASELINE_CONTEXT.student below.
  studentIdentity: { displayName: "Ada", country: "United States", graduationYear: 2027, curriculum: "ap" },
};

/** Display labels for every REGRESSION_CONTEXT dimension `isAssessed()` treats as NOT
 * assessed — that's `not_assessed` (research, awards_distinction) AND `limited_evidence`
 * (career_exploration, community_impact) alike, since formatContextForPrompt's own
 * `isAssessed(d.state) ? ...score... : ...no score to quote...` branch gates on exactly
 * that function, not on `not_assessed` specifically. Started as a hand-typed two-entry
 * list covering only the `not_assessed` pair and missed the other two —
 * __tests__/ai/eval/fixtures.test.ts now derives this same list independently via the
 * real dimensionLabel()/isAssessed() and asserts it matches, so a fixture edit that
 * changes which dimensions are unassessed can't silently drift from this constant again.
 * Matches exactly what dimensionLabel(dimension, locale) produces for each. */
export const REGRESSION_UNASSESSED_LABELS_EN: readonly string[] = ["Research", "Awards & Distinction", "Career Exploration", "Community Impact"];
export const REGRESSION_UNASSESSED_LABELS_TR: readonly string[] = ["Araştırma", "Ödüller ve Başarılar", "Kariyer Keşfi", "Toplumsal Etki"];

export const FIXTURES: readonly EvalFixture[] = [
  { id: "regression", description: "Unassessed dimension + extreme_reach outlook + clear avoid-this occasion (the two named regressions plus Phase 39)", expectDiscourage: "yes" },
  { id: "baseline", description: "Well-rounded profile, nothing to discourage — the control case", expectDiscourage: "no" },
];
