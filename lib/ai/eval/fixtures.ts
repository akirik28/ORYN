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
    curriculum: "IB",
    weeklyTimeBudget: "5-10 hours",
    busyMode: false,
    busyModeUntil: null,
    birthYear: 2010,
    citizenshipCountries: ["Turkey"],
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
  sports: [],
  goals: [{ title: "Study Economics at a top European university", category: "academic" }],
  interests: ["Economics", "Entrepreneurship"],
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
    curriculum: "AP",
    weeklyTimeBudget: "2-5 hours",
    busyMode: true,
    busyModeUntil: inDays(14),
    birthYear: 2009,
    citizenshipCountries: ["United States"],
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
  sports: [{ sport: "Swimming", level: "varsity", isCaptain: false, hoursPerWeek: 6, ongoing: true, achievements: null }],
  goals: [{ title: "Improve SAT score", category: "academic" }],
  interests: ["Economics", "Data Science"],
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
};

export const BASELINE_COUNSELOR_RESULT: CounselorResult = {
  scoreVersion: "counselor_ranking_v1",
  gaps: [],
  recommendations: [rec({ id: "opportunity:fixture-2", title: "Regional Science Fair" })],
  profileReadiness: { completenessPercent: 68, sufficientForJudgment: true },
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
