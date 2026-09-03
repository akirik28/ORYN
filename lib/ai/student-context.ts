import "server-only";

import { createClient } from "@/lib/supabase/server";
import { readOr } from "@/lib/supabase/safe-read";
import { assembleScoringFacts } from "@/lib/scoring/assemble-facts";
import { computeCareerProfile } from "@/lib/scoring";
import { outlookLabel } from "@/lib/admissions/outlook";
import { buildProfileSignal, isAssessed, evidenceStateLabel, type EvidenceState } from "@/lib/scoring/signal";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { canonicalUniversityId, loadSupersessionMap, type SupersessionMap } from "@/lib/universities/canonical";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dimensionLabel } from "@/lib/scoring/labels";
import { curriculumLabel } from "@/lib/requirements/copy";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { resolveAdvisorInstructions } from "@/lib/tier/advisor-instructions";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import type {
  ActionStatus,
  CourseLevel,
  CurriculumType,
  Database,
  DataConfidence,
  EmploymentType,
  EvidenceStatus,
  OutlookLabel,
  PlanTier,
  ProfileDimension,
  ReflectionOutcome,
  TargetStatus,
  TimeBudget,
} from "@/types/database";

/**
 * Phase 65: nothing clears `profiles.busy_mode` automatically once `busy_mode_until`
 * passes — it is a plain student-set checkbox with no scheduled job or write-time expiry
 * behind it (confirmed 2026-09-02, docs/time-budget-busy-mode-audit-2026-09-02.md). A
 * student who marks exam week in November and forgets to unmark it should not still read
 * as busy in March, so the raw column is never trusted directly — computed here instead,
 * same "don't trust a persisted flag past its date" discipline as
 * lib/deadlines/lifecycle.ts's isDatedDeadlineUpcoming, and the same explicit-`today`-
 * parameter shape for the same reason: testable without mocking the system clock.
 * `busy_mode_until` is a plain `date` column (migration 0002) — `YYYY-MM-DD`, safe to
 * compare lexicographically against `today` in the same format.
 */
export function isBusyModeActive(busyMode: boolean, busyModeUntil: string | null, today: string): boolean {
  return busyMode && (busyModeUntil === null || busyModeUntil >= today);
}

/**
 * 2026-09-02 raw-enum-leak sweep: formatContextForPrompt used to interpolate
 * `weeklyTimeBudget` raw — "5_10h"/"10h_plus" reaching the model exactly as stored, no
 * `lib/`-level accessor existed anywhere (only the Settings UI's own component-scoped
 * catalog keys, features/settings/capacity-form.tsx's tCapacity("timeBudgetOptions...")).
 * Same wording, reused deliberately rather than invented fresh, so a value the advisor
 * echoes back matches what a student already sees when they set it in Settings.
 * Same synchronous (value, locale) => string shape as dimensionLabel/outlookLabel/
 * curriculumLabel — formatContextForPrompt must stay a plain sync function, so this can't
 * route through the async next-intl catalog the UI component itself uses.
 */
const TIME_BUDGET_LABEL_EN: Record<TimeBudget, string> = {
  under_2h: "under 2 hours",
  "2_5h": "2-5 hours",
  "5_10h": "5-10 hours",
  "10h_plus": "10+ hours",
};

const TIME_BUDGET_LABEL_TR: Record<TimeBudget, string> = {
  under_2h: "2 saatten az",
  "2_5h": "2-5 saat",
  "5_10h": "5-10 saat",
  "10h_plus": "10+ saat",
};

export function timeBudgetLabel(value: TimeBudget, locale: Locale): string {
  return locale === "tr" ? TIME_BUDGET_LABEL_TR[value] : TIME_BUDGET_LABEL_EN[value];
}

/**
 * Same sweep, same reasoning: `reflectionOutcome` was interpolated raw
 * ("did_not_work", "opportunity_no_longer_available"...). The UI already has this solved
 * — features/dashboard/weekly-focus.tsx's page-local reflectionLabel() reads
 * dashboard.weeklyFocus.reflectionOptions.* from the message catalog — but that function
 * is bound to useTranslations (a client hook), not callable from this sync server-only
 * file. The *wording* below is copied from that same catalog rather than reinvented, so
 * a value the advisor echoes back matches what a student already picked when they
 * reflected on the action.
 */
const REFLECTION_OUTCOME_LABEL_EN: Record<ReflectionOutcome, string> = {
  completed_successfully: "Completed successfully",
  partially_completed: "Partially completed",
  did_not_work: "Didn't work",
  opportunity_no_longer_available: "No longer available",
};

const REFLECTION_OUTCOME_LABEL_TR: Record<ReflectionOutcome, string> = {
  completed_successfully: "Başarıyla tamamlandı",
  partially_completed: "Kısmen tamamlandı",
  did_not_work: "İşe yaramadı",
  opportunity_no_longer_available: "Artık mevcut değil",
};

export function reflectionOutcomeLabel(value: ReflectionOutcome, locale: Locale): string {
  return locale === "tr" ? REFLECTION_OUTCOME_LABEL_TR[value] : REFLECTION_OUTCOME_LABEL_EN[value];
}

/**
 * A sixth instance found by oryn-31 during this same sweep, confirmed live rather than
 * theoretical: `application_requirements.requirement_type` has no closed DB enum (unlike
 * curriculum/weeklyTimeBudget) — `DEFAULT_REQUIREMENTS`
 * (app/(app)/applications/actions.ts) is the known seeded set of 8, but a custom/future
 * value could exist too. Same wording as the UI's own
 * features/applications/requirement-chip-grid.tsx (which reads
 * `applications.requirementChecklist.typeLabels.*` from the message catalog), and the
 * same graceful-fallback shape that component already uses for anything unmapped
 * (`.replace(/_/g, " ")`) rather than a hard lookup failure — this can't be a
 * `Record<RequirementType, string>` the way the closed-enum accessors above are, because
 * there's no closed type to index by.
 */
const REQUIREMENT_TYPE_LABEL_EN: Record<string, string> = {
  application: "Application",
  transcript: "Transcript",
  test_score: "Test score",
  essay: "Essay",
  recommendation: "Recommendation",
  portfolio: "Portfolio",
  interview: "Interview",
  financial_aid: "Financial aid",
};

const REQUIREMENT_TYPE_LABEL_TR: Record<string, string> = {
  application: "Başvuru",
  transcript: "Transkript",
  test_score: "Sınav puanı",
  essay: "Deneme yazısı",
  recommendation: "Tavsiye mektubu",
  portfolio: "Portfolyo",
  interview: "Mülakat",
  financial_aid: "Mali yardım",
};

export function requirementTypeLabel(value: string, locale: Locale): string {
  const map = locale === "tr" ? REQUIREMENT_TYPE_LABEL_TR : REQUIREMENT_TYPE_LABEL_EN;
  return map[value] ?? value.replace(/_/g, " ");
}

/**
 * 2026-09-03 — the six-category advisor-context build: `courses.level` is a closed enum
 * ("ib_hl", "a_level", "dual_enrollment"...) reaching a prompt template literal for the first
 * time, so it needs the same label-before-interpolation treatment as every other tracked enum
 * in this file, not just the eight `__tests__/i18n/ai-prompt-enum-labels.test.ts` already knows
 * about. Wording copied verbatim from features/profile/field-config.ts's COURSE_LEVEL_OPTIONS —
 * that file has no locale branching (plain English dropdown labels), so English is reused as-is
 * and Turkish is new, same "don't invent fresh copy where UI wording already exists" standard
 * as curriculumLabel/timeBudgetLabel above.
 */
const COURSE_LEVEL_LABEL_EN: Record<CourseLevel, string> = {
  regular: "Regular",
  honors: "Honors",
  ap: "AP",
  ib_hl: "IB Higher Level (HL)",
  ib_sl: "IB Standard Level (SL)",
  a_level: "A-Level",
  dual_enrollment: "Dual enrollment",
  other: "Other",
};

const COURSE_LEVEL_LABEL_TR: Record<CourseLevel, string> = {
  regular: "Normal",
  honors: "Onur programı",
  ap: "AP",
  ib_hl: "IB Üst Düzey (HL)",
  ib_sl: "IB Standart Düzey (SL)",
  a_level: "A-Level",
  dual_enrollment: "Çift kayıt",
  other: "Diğer",
};

export function courseLevelLabel(value: CourseLevel, locale: Locale): string {
  return locale === "tr" ? COURSE_LEVEL_LABEL_TR[value] : COURSE_LEVEL_LABEL_EN[value];
}

/** Same reasoning as courseLevelLabel above, same source of English wording
 * (field-config.ts's EMPLOYMENT_TYPE_OPTIONS) — `work_experiences.employment_type` is the
 * second closed enum this build adds to the AI-prompt surface. */
const EMPLOYMENT_TYPE_LABEL_EN: Record<EmploymentType, string> = {
  internship: "Internship",
  part_time_job: "Part-time job",
  full_time_job: "Full-time job",
  apprenticeship: "Apprenticeship",
  freelance: "Freelance",
  other: "Other",
};

const EMPLOYMENT_TYPE_LABEL_TR: Record<EmploymentType, string> = {
  internship: "Staj",
  part_time_job: "Yarı zamanlı iş",
  full_time_job: "Tam zamanlı iş",
  apprenticeship: "Çıraklık",
  freelance: "Serbest çalışma",
  other: "Diğer",
};

export function employmentTypeLabel(value: EmploymentType, locale: Locale): string {
  return locale === "tr" ? EMPLOYMENT_TYPE_LABEL_TR[value] : EMPLOYMENT_TYPE_LABEL_EN[value];
}

export interface StudentAdvisorContext {
  student: {
    displayName: string;
    /** Drives the language every AI surface answers in — see lib/ai/output-language.ts. */
    preferredLanguage: Locale;
    country: string | null;
    schoolName: string | null;
    graduationYear: number | null;
    // Both fields below were plain `string | null` until 2026-09-02's eval-fixture-shape
    // sweep — that let lib/ai/eval/fixtures.ts carry display prose ("IB", "5-10 hours")
    // where a real profile stores the closed enum key ("ib", "5_10h") and still typecheck.
    // Tightened to the real DB types so that exact class of drift is a compile error next
    // time, not a silent one only caught because a downstream guardrail happened to stop
    // firing. Both assignments in buildStudentAdvisorContext below already pass a
    // correctly-typed value (profile.curriculum/weekly_time_budget are already
    // CurriculumType/TimeBudget) — this is a no-op for production, and only ever narrows
    // what a hand-built context (a fixture, a test, a future mock) is allowed to claim.
    curriculum: CurriculumType | null;
    weeklyTimeBudget: TimeBudget | null;
    busyMode: boolean;
    busyModeUntil: string | null;
    /** Counselor Core eligibility (age gates on opportunities) — not used in prompt text today. */
    birthYear: number | null;
    /** Counselor Core eligibility (citizenship gates on opportunities, migration 0047) — never
     * inferred from `country` (residence/school location, a separate fact). Not used in
     * prompt text today, same as birthYear. */
    citizenshipCountries: string[];
    /** 2026-09-03, the Ultra tier-economics build: `resolvePlanTier`'s own decision, computed
     * from the same profile row this whole function already fetches — not a second query.
     * The one real consumer so far is `weekly-plan.ts`, which needs it to pass the right
     * tier into `selectModelForWeeklyPlan`/`selectModelForUser` without fetching a profile a
     * second time. Not used in prompt text — a model has no business reasoning about which
     * tier is paying for the call it's making. */
    tier: PlanTier;
    /** Migration 0111, özelleşme piece 1. The student's own standing instruction to the
     * advisor — unlike every other field on this object, this one IS rendered verbatim into
     * the prompt (see formatContextForPrompt's closing line), by design: it's the one piece
     * of context the student authored themselves specifically to reach the model, not a
     * profile fact the model is reasoning about. Null means none set. */
    advisorInstructions: string | null;
  };
  /**
   * `state` is what the student's own surfaces render (lib/scoring/signal.ts). It is here
   * because the model reads this block and writes the prose they see: given a bare number
   * it will quote the number, and a dimension nobody has entered anything for scores 0.
   */
  // confidence was plain `string` until the same sweep — a near-miss, not a live bug (both
  // fixtures' values already happened to be real DataConfidence members), tightened anyway
  // so it can't become one later. See the curriculum/weeklyTimeBudget comment above for why.
  profileScores: { dimension: ProfileDimension; score: number; confidence: DataConfidence; state: EvidenceState }[];
  overallScore: number;
  completenessPercent: number;
  /**
   * The real four-value `EvidenceStatus`, not a collapsed boolean (Package 4,
   * docs/handoffs/feat1-territory-audit-2026-08-22.md Finding 1). Before this, only
   * `self_reported` was distinguishable from everything else — `evidence_added` (uploaded,
   * unreviewed) and `verification_rejected` (reviewed and NOT confirmed) both rendered
   * identically to `verified` in the prompt, so a claim someone actively disbelieved
   * reached the live advisor chat and weekly-plan generator with full certainty.
   * `formatContextForPrompt` below renders all four distinctly.
   */
  activities: { title: string; category: string; isLeadership: boolean; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  projects: { title: string; outcomeSummary: string | null; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  research: { title: string; field: string | null; outputType: string; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  awards: { title: string; level: string | null; evidenceStatus: EvidenceStatus }[];
  /**
   * 2026-09-03 — docs/advisor-context-coverage-2026-09-03.md's headline finding: assembleScoringFacts
   * already fetches all six of educationRecords/courses/testScores/certifications/
   * volunteeringExperiences/workExperiences on every call this function makes (testScores/courses/
   * educationRecords feed the Academics and Intellectual Curiosity dimension scores directly,
   * lib/scoring/dimensions/academics.ts, intellectual-curiosity.ts) — none of it reached the model
   * before this. Zero marginal DB cost; this is a rendering fix, not a new fetch. Kept as separate
   * arrays rather than folded into `activities` — these are genuinely different shapes (a course's
   * grade, a test's score, an education record's GPA) and the scoring engine already treats them as
   * distinct categories; collapsing them here would just mean re-splitting them in formatContextForPrompt.
   */
  educationRecords: { schoolName: string; overallGpa: number | null; gpaScale: number | null }[];
  /** `level` is a closed enum (CourseLevel) — rendered through courseLevelLabel, never raw. */
  courses: { courseName: string; level: CourseLevel; gradeValue: string | null; gradeScale: string | null }[];
  /** `subscores` is a freeform JSON blob (SAT: {math, reading_writing}, IELTS: {reading, writing,
   * speaking, listening}, ...) written by whatever recorded the score, not a closed DB enum — no
   * label accessor applies to its keys the way one does to a real enum column; formatContextForPrompt
   * lightly prettifies them (`_` -> space) the same fallback style requirementTypeLabel already uses
   * for its own unmapped values, not a maintained lookup table. */
  testScores: { testName: string; score: string; maxScore: string | null; subscores: Record<string, unknown> }[];
  certifications: { title: string; organization: string | null; evidenceStatus: EvidenceStatus }[];
  volunteeringExperiences: { title: string; organization: string | null; ongoing: boolean; evidenceStatus: EvidenceStatus }[];
  /** `employmentType` is a closed enum (EmploymentType) — rendered through employmentTypeLabel,
   * never raw. `organization` is NOT NULL on this table (unlike certifications/volunteering's
   * nullable one) — a work experience always names an employer. */
  workExperiences: { title: string; organization: string; employmentType: EmploymentType; ongoing: boolean; paid: boolean | null; evidenceStatus: EvidenceStatus }[];
  /** Chat 4 founder scope update — deliberately NOT part of `assembleScoringFacts`/the
   * scoring engine this pass (see docs/product-decisions.md): sports feeds the advisor's
   * time-budget reasoning ("10 committed hours/week isn't free capacity") and opportunity-
   * cost judgment (a long-term competitive commitment isn't something to casually drop
   * for a superficial new activity), not a profile-strength score. */
  sports: { sport: string; level: string | null; isCaptain: boolean; hoursPerWeek: number | null; ongoing: boolean; achievements: string | null }[];
  goals: { title: string; category: string | null }[];
  /** Counselor Core field/relevance matching (mirrors lib/opportunities/persist-matches.ts's
   * existing use of this table) — not included in formatContextForPrompt today. */
  interests: string[];
  /** `outlook` is the persisted enum, not a free string — typing it loosely is what let the
   *  raw `extreme_reach` reach the prompt and then a student. `status` tightened alongside
   *  it in the same 2026-09-02 sweep that caught curriculum/weeklyTimeBudget/confidence —
   *  this exact lesson (a loosely-typed field next to a correctly-typed one on the same
   *  line) had already been learned once for `outlook` and hadn't propagated to its
   *  neighbor; both real assignments already pass a TargetStatus-typed value regardless. */
  targetUniversities: { id: string; universityId: string; programId: string | null; name: string; status: TargetStatus; outlook: OutlookLabel | null }[];
  upcomingDeadlines: { title: string; date: string; source: string }[];
  recentRecommendationTitles: string[];
  /** Phase 10/62/63 — what actually happened after past advice, so the advisor learns from
   * outcomes instead of only avoiding repeated titles. Sourced from weekly_actions (status +
   * the reflection captured when a student marks one done), not ai_recommendations — that
   * table only ever logs "avoid_for_now" suggestions (see recentRecommendationTitles), never
   * the do/consider actions that make up the bulk of what's actually recommended.
   * `status` tightened from `string` to the real ActionStatus in the same 2026-09-02
   * sweep as targetUniversities' own status field above; `reflectionOutcome` tightened in
   * the follow-up raw-enum-leak sweep the same day, once reflectionOutcomeLabel() needed
   * a real ReflectionOutcome to accept, not a bare string. */
  recentActionOutcomes: { title: string; status: ActionStatus; reflectionOutcome: ReflectionOutcome | null; reflectionNote: string | null }[];
  /** Phase 22/62 — unfinished application checklist items (essay, recommendation, ...),
   * so the advisor can point at a concrete near-term task instead of only reasoning at the
   * profile-dimension level.
   *
   * `requirementTitle`/`requirementType` kept separate rather than pre-merged (same split
   * as recentActionOutcomes' own reflectionOutcome above) — resolving "real title, or a
   * readable label for the type" needs `locale`, which this array's own builder
   * (getPendingApplicationRequirements) doesn't have access to without either threading it
   * through buildStudentAdvisorContext's parallel Promise.all (real added latency on a hot
   * path) or hardcoding English. formatContextForPrompt does the merge instead, where
   * locale is already a parameter. Found live 2026-09-02 (oryn-31, same raw-enum-leak
   * sweep): 100% of live application_requirements rows have title IS NULL — every one of
   * them was hitting the raw requirement_type fallback on every prompt build, not a rare
   * edge case, and a real advisor_messages row had already echoed `"test_score"` verbatim
   * to a student before this was found. */
  pendingApplicationRequirements: { applicationTitle: string; requirementTitle: string | null; requirementType: string }[];
}

/**
 * Unfinished application_requirements rows, resolved to a readable university name via the
 * same batch-fetch-and-zip pattern used elsewhere (e.g. lib/deadlines/upcoming.ts) rather
 * than a nested PostgREST embed (see the Identity<T> note in types/database.ts for why).
 * Capped tightly — this is context for a prompt, not a full application-tracker view.
 *
 * Exported 2026-09-03 (previously module-private) so its own readOr-wrapped reads can be
 * tested directly with a fake client, rather than only indirectly through
 * buildStudentAdvisorContext's much larger dependency graph. No behavior change.
 */
export async function getPendingApplicationRequirements(
  supabase: SupabaseClient<Database>,
  userId: string,
  supersessionMap: SupersessionMap
): Promise<{ applicationTitle: string; requirementTitle: string | null; requirementType: string }[]> {
  const pendingRes = await supabase
    .from("application_requirements")
    .select("title, requirement_type, application_id")
    .eq("user_id", userId)
    .in("status", ["not_started", "in_progress"])
    .limit(15);
  const pending = readOr("pendingApplicationRequirements", pendingRes, [], { userId });
  if (pending.length === 0) return [];

  const applicationIds = [...new Set(pending.map((p) => p.application_id))];
  const applicationsRes = await supabase.from("applications").select("id, target_university_id").in("id", applicationIds);
  const applications = readOr("pendingApplicationRequirements.applications", applicationsRes, [], { userId });
  const targetIdByApplication = new Map(applications.map((a) => [a.id, a.target_university_id]));

  const targetIds = [...new Set([...targetIdByApplication.values()])];
  const targetsRes = targetIds.length > 0 ? await supabase.from("target_universities").select("id, university_id").in("id", targetIds) : { data: [] };
  const targets = readOr("pendingApplicationRequirements.targets", targetsRes, [], { userId });
  // Canonicalized — see lib/universities/canonical.ts.
  const universityIdByTarget = new Map(targets.map((t) => [t.id, canonicalUniversityId(supersessionMap, t.university_id)]));

  const universityIds = [...new Set([...universityIdByTarget.values()])];
  const universitiesRes =
    universityIds.length > 0 ? await supabase.from("universities").select("id, name").in("id", universityIds) : { data: [] };
  const universities = readOr("pendingApplicationRequirements.universities", universitiesRes, [], { userId });
  const universityNameById = new Map(universities.map((u) => [u.id, u.name]));

  return pending.map((p) => {
    const targetId = targetIdByApplication.get(p.application_id);
    const universityId = targetId ? universityIdByTarget.get(targetId) : undefined;
    const universityName = universityId ? universityNameById.get(universityId) : undefined;
    return { applicationTitle: universityName ?? "Application", requirementTitle: p.title, requirementType: p.requirement_type };
  });
}

/**
 * Target universities for the advisor prompt — batch-fetch-and-zip (same convention as
 * getPendingApplicationRequirements above), not the nested `universities(name)` embed this
 * used before: an embed returns whatever row Postgres's FK actually points at, with no way to
 * post-process it through canonicalUniversityId() — a target referencing a known-duplicate
 * loser row would silently hand the advisor the loser's name. See lib/universities/canonical.ts.
 */
export async function getTargetUniversitiesForContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  supersessionMap: SupersessionMap
): Promise<{ id: string; universityId: string; programId: string | null; name: string; status: TargetStatus; outlook: OutlookLabel | null }[]> {
  const targetsRes = await supabase.from("target_universities").select("id, status, outlook, university_id, program_id").eq("user_id", userId);
  const targets = readOr("targetUniversities", targetsRes, [], { userId });
  if (targets.length === 0) return [];

  const universityIds = [...new Set(targets.map((t) => canonicalUniversityId(supersessionMap, t.university_id)))];
  const universitiesRes = await supabase.from("universities").select("id, name").in("id", universityIds);
  const universities = readOr("targetUniversities.universities", universitiesRes, [], { userId });
  const universityNameById = new Map(universities.map((u) => [u.id, u.name]));

  return targets.map((t) => {
    const canonicalId = canonicalUniversityId(supersessionMap, t.university_id);
    return {
      id: t.id,
      universityId: canonicalId,
      programId: t.program_id,
      name: universityNameById.get(canonicalId) ?? "Unknown",
      status: t.status,
      outlook: t.outlook,
    };
  });
}

/**
 * Compact, structured context for the AI Advisor and weekly-plan generator (spec 8.1) —
 * deliberately NOT the whole database. Reuses assembleScoringFacts so this and the
 * scoring engine never drift out of sync on what "the student's data" means.
 *
 * `supabaseClient` defaults to the session-scoped client (correct for every real request
 * this is called from). The scheduled weekly-plan job (lib/plan/generate-for-active-
 * students.ts) is the one caller with no session to scope to — it passes its own admin
 * client through here instead. Before this parameter existed, that job silently built
 * every student's context from nothing (RLS filters a session-less read down to zero rows,
 * not an error), so it paid for real AI calls that generated plans grounded in an empty
 * profile rather than the student's actual one.
 */
export async function buildStudentAdvisorContext(userId: string, supabaseClient?: Awaited<ReturnType<typeof createClient>>): Promise<StudentAdvisorContext> {
  const supabase = supabaseClient ?? (await createClient());
  const facts = await assembleScoringFacts(supabase, userId);
  const { dimensions, overallScore } = computeCareerProfile(facts);
  // Loaded once and threaded into the two helpers below that need it, rather than each loading
  // its own copy — both run inside the same Promise.all, so a single upfront load also avoids
  // two redundant round trips to the same 9-row table. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);

  const [profileRes, targetUniversities, upcomingDeadlines, recentRecsRes, recentActionsRes, pendingApplicationRequirements, sportsRes, interestsRes] = await Promise.all([
    // select("*"), not an explicit column list: an explicit list naming a column that
    // doesn't exist yet on a given environment (citizenship_countries, migration 0047 — same
    // no-DDL-access constraint as 0043/0046) makes PostgREST reject the WHOLE query
    // (42703 "column does not exist"), silently degrading every other field here to its
    // fallback too, not just the missing one. Confirmed live this session. select("*") only
    // returns whatever columns actually exist, self-healing once the migration lands.
    supabase.from("profiles").select("*").eq("id", userId).single(),
    getTargetUniversitiesForContext(supabase, userId, supersessionMap),
    // Reuses the same cross-source Deadline Engine the dashboard's "Due soon" widget and
    // the deadline-reminder job use (lib/deadlines/upcoming.ts) — this used to be a bespoke
    // applications-only query here, so the advisor's view of "what's due" was narrower than
    // what the student can already see on their own dashboard (saved-opportunity and
    // target-university-program deadlines were invisible to it). Real gap, found in this
    // session's audit; fixed by reusing the existing unified source instead of a second,
    // inferior implementation.
    getUpcomingDeadlines(supabase, userId, 5),
    // Explicitly scoped to avoid_for_now: today lib/plan/persist.ts only ever writes that
    // one class to this table (do/consider are never persisted here — see
    // known-issues.md), so this filter is currently a no-op in practice. It's here so the
    // prompt's "previously suggested avoid-for-now items" label (below) stays true if a
    // future change ever starts persisting other classes too — without it, a "do" or
    // "consider" row would silently get relabeled as something to avoid repeating.
    supabase
      .from("ai_recommendations")
      .select("title")
      .eq("user_id", userId)
      .eq("recommendation_class", "avoid_for_now")
      .order("shown_at", { ascending: false })
      .limit(15),
    supabase
      .from("weekly_actions")
      .select("title, status, reflection_outcome, reflection_note")
      .eq("user_id", userId)
      .in("status", ["completed", "skipped", "expired"])
      .order("created_at", { ascending: false })
      .limit(10),
    getPendingApplicationRequirements(supabase, userId, supersessionMap),
    supabase.from("sports_experiences").select("sport, level, is_captain, hours_per_week, ongoing, achievements").eq("user_id", userId),
    supabase.from("student_interests").select("label").eq("user_id", userId),
  ]);

  const profile = readOr("profile", profileRes, null, { userId });

  return {
    student: {
      displayName: profile?.display_name ?? "Student",
      /**
       * The student's own stored preference, not the request cookie. Weekly plans are also
       * generated from cron, where there is no request to read a cookie from, and a plan
       * written in a different language from the one the student reads would be worse than
       * no plan. `isLocale` guards it because the column has no CHECK constraint.
       */
      preferredLanguage: isLocale(profile?.preferred_language) ? profile.preferred_language : DEFAULT_LOCALE,
      country: profile?.country ?? null,
      schoolName: profile?.school_name ?? null,
      graduationYear: profile?.graduation_year ?? null,
      curriculum: profile?.curriculum ?? null,
      weeklyTimeBudget: profile?.weekly_time_budget ?? null,
      // Settings still shows the raw stored value unchanged (it's the student's own toggle
      // to notice and clear) — isBusyModeActive only affects what the AI prompt is told.
      busyMode: isBusyModeActive(profile?.busy_mode ?? false, profile?.busy_mode_until ?? null, new Date().toISOString().slice(0, 10)),
      busyModeUntil: profile?.busy_mode_until ?? null,
      birthYear: profile?.birth_year ?? null,
      citizenshipCountries: profile?.citizenship_countries ?? [],
      tier: resolvePlanTier(profile ?? { plan_tier: "standard", ultra_gift_expires_at: null }),
      advisorInstructions: resolveAdvisorInstructions(profile ?? { advisor_instructions: null }),
    },
    profileScores: buildProfileSignal(dimensions).map((d) => ({
      dimension: d.dimension,
      score: d.score,
      confidence: d.confidence,
      state: d.state,
    })),
    overallScore,
    completenessPercent: profile?.completeness_percent ?? 0,
    activities: facts.activities.map((a) => ({
      title: a.title,
      category: a.category,
      isLeadership: a.is_leadership_role,
      ongoing: a.ongoing,
      evidenceStatus: a.evidence_status,
    })),
    projects: facts.projects.map((p) => ({
      title: p.title,
      outcomeSummary: p.outcome_summary,
      ongoing: p.ongoing,
      evidenceStatus: p.evidence_status,
    })),
    research: facts.researchExperiences.map((r) => ({
      title: r.title,
      field: r.field,
      outputType: r.output_type,
      ongoing: r.ongoing,
      evidenceStatus: r.evidence_status,
    })),
    awards: facts.awards.map((a) => ({ title: a.title, level: a.level, evidenceStatus: a.evidence_status })),
    educationRecords: facts.educationRecords.map((e) => ({ schoolName: e.school_name, overallGpa: e.overall_gpa, gpaScale: e.gpa_scale })),
    courses: facts.courses.map((c) => ({ courseName: c.course_name, level: c.level, gradeValue: c.grade_value, gradeScale: c.grade_scale })),
    testScores: facts.testScores.map((t) => ({ testName: t.test_name, score: t.score, maxScore: t.max_score, subscores: t.subscores })),
    certifications: facts.certifications.map((c) => ({ title: c.title, organization: c.organization, evidenceStatus: c.evidence_status })),
    volunteeringExperiences: facts.volunteeringExperiences.map((v) => ({
      title: v.title,
      organization: v.organization,
      ongoing: v.ongoing,
      evidenceStatus: v.evidence_status,
    })),
    workExperiences: facts.workExperiences.map((w) => ({
      title: w.title,
      organization: w.organization,
      employmentType: w.employment_type,
      ongoing: w.ongoing,
      paid: w.paid,
      evidenceStatus: w.evidence_status,
    })),
    goals: facts.goals.map((g) => ({ title: g.title, category: g.category })),
    interests: readOr("interests", interestsRes, [], { userId }).map((i) => i.label),
    sports: readOr("sports", sportsRes, [], { userId }).map((s) => ({
      sport: s.sport,
      level: s.level,
      isCaptain: s.is_captain,
      hoursPerWeek: s.hours_per_week,
      ongoing: s.ongoing,
      achievements: s.achievements,
    })),
    targetUniversities,
    upcomingDeadlines: upcomingDeadlines.map((d) => ({ title: d.title, date: d.date, source: d.source })),
    recentRecommendationTitles: readOr("recentRecommendationTitles", recentRecsRes, [], { userId }).map((r) => r.title),
    recentActionOutcomes: readOr("recentActionOutcomes", recentActionsRes, [], { userId }).map((a) => ({
      title: a.title,
      status: a.status,
      reflectionOutcome: a.reflection_outcome,
      reflectionNote: a.reflection_note,
    })),
    pendingApplicationRequirements,
  };
}

/**
 * `locale` is additive and defaults to English, matching lib/scoring/labels.ts's own opt-in
 * pattern. Both real callers pass it now — weekly-plan.ts and advisor-chat.ts, from
 * `context.student.preferredLanguage` — so the dimension names in the prompt are already in
 * the student's language. The default remains for any caller that has no locale to hand.
 */
export function formatContextForPrompt(context: StudentAdvisorContext, locale: Locale = "en"): string {
  const lines: string[] = [];
  // curriculum: raw "a_level"/"turkish_curriculum" until 2026-09-02's raw-enum-leak sweep
  // — curriculumLabel() already existed and was already used elsewhere (lib/requirements/
  // evaluate.ts), just never wired in here.
  const curriculumText = context.student.curriculum ? curriculumLabel(context.student.curriculum, locale) : "unknown curriculum";
  // schoolName: fetched into context since the assembler's first version, never rendered — no
  // reasoning comment anywhere explaining the omission (contrast birthYear/citizenshipCountries
  // below, which both have one), so treated as an oversight and closed here rather than left
  // as a silent, undocumented gap. Folded into the existing student line rather than a
  // separate one — it's a fact about the same sentence, not a new category.
  const schoolText = context.student.schoolName ? ` at ${context.student.schoolName}` : "";
  lines.push(`Student: ${context.student.displayName}, graduating ${context.student.graduationYear ?? "unknown"}, ${curriculumText}${schoolText}, ${context.student.country ?? "unknown country"}.`);
  /**
   * CEO finding, 2026-09-02: graduationYear was already in the line above, but nothing told
   * the model it's the thing to calibrate ambition and pacing against — the spec's own
   * words for this (Phase 6.5, §8.2) never had anywhere to land. `birthYear` is fetched
   * into this same context object and deliberately NOT used here: it's null on 4 of 11
   * onboarded profiles, including the founder's own, so a birth-year-based signal would be
   * silently absent for the one real account this product has. graduationYear is present
   * for that account and every other one that's completed onboarding, so it's the signal
   * that actually reaches a real student.
   *
   * Says years remaining, never a computed age — a graduation year implies a range, not a
   * birthday (school-entry cutoffs and birth month both vary), and stating an invented
   * specific age would be exactly the false precision this product's own posture on
   * admission percentages already refuses elsewhere. Omitted entirely when graduationYear
   * is null, not replaced with "calibration: unknown" — an explicit unknown here would
   * only invite the model to hedge in the reply, which costs output tokens and helps no
   * one; the line above already says "graduating unknown" once, that's enough.
   */
  if (context.student.graduationYear !== null) {
    const yearsUntilGraduation = context.student.graduationYear - new Date().getFullYear();
    const timeframe = yearsUntilGraduation > 0 ? `${yearsUntilGraduation} year${yearsUntilGraduation === 1 ? "" : "s"} until they apply to university` : "at or past their expected graduation year";
    lines.push(`${timeframe} — calibrate ambition and pacing to this: more runway supports an exploratory or multi-year commitment, less runway means prioritizing what can realistically strengthen an application in the time left.`);
  }
  const busyNote = context.student.busyMode
    ? ` Currently in a busy period (e.g. exams)${context.student.busyModeUntil ? `, until ${context.student.busyModeUntil}` : ""} — reduce recommendations.`
    : "";
  // Raw "5_10h"/"10h_plus" until 2026-09-02's raw-enum-leak sweep — see timeBudgetLabel above.
  const timeBudgetText = context.student.weeklyTimeBudget ? timeBudgetLabel(context.student.weeklyTimeBudget, locale) : "not set";
  lines.push(`Weekly time budget: ${timeBudgetText}.${busyNote}`);
  lines.push(`Career Profile: ${context.overallScore}/100 overall. Profile completeness: ${context.completenessPercent}%.`);
  /**
   * Display labels, not the raw column values. The model reads this block and then writes
   * prose the student sees, so a bare `career_exploration` in the prompt comes back out as
   * `career_exploration` in the counsel — observed live on the dashboard's "One thing not to
   * do" card, 2026-09-01: "your career_exploration gap is better addressed by...". Nothing
   * in the pipeline was going to catch that; it is a schema identifier that reached a
   * sixteen-year-old through the one component that reformats its input freely.
   *
   * The same argument applies to the numbers. Every student-facing surface deliberately
   * shows an evidence state rather than a strength percentage (UI-V3, founder direction) —
   * and no component renders `overallScore` at all. The model was reintroducing exactly what
   * that decision removed: 18 of 22 stored weekly actions quoted an "X/100" back at the
   * student, including "Academics is 0/100" and "Research is at 0/100" for dimensions whose
   * real state is *nothing recorded yet*. A 0 there is an absence, not a measurement, and
   * saying it as a score tells a student they were assessed and failed.
   *
   * So an unassessed dimension is described, never numbered. Assessed ones keep the score,
   * where it is a real reading and the model needs it to rank.
   *
   * `confidence` (`DataConfidence`) is left raw here deliberately, same standard as
   * `targetUniversities[].status` below: "high"/"medium"/"low" are ordinary words a student
   * would recognise, not identifiers — found undocumented and closed by
   * `__tests__/i18n/ai-prompt-enum-labels.test.ts`'s own first real run, 2026-09-02; see
   * that file's `EXEMPT` list, which now enforces this decision rather than only recording it.
   *
   * Assessed dimensions are pre-sorted weakest-to-strongest here, not left in whatever order
   * buildProfileSignal happens to return (docs/advisor-chat-stability-eval-2026-09-03.md,
   * oryn-80, live-verified 3/3 reads): asking "what are the two weakest dimensions" made the
   * model sort nine numbers by eye mid-reply, and it got the answer wrong every time — not by
   * hedging, by confidently naming the dimension whose number best supported the
   * recommendation already being made (Career Exploration 40, because it fit the argument)
   * over the actual second-lowest (Entrepreneurship 30, correct but narratively inconvenient),
   * while quoting an unrelated score correctly in the same reply. AGENTS.md §6.1's own
   * pipeline is structured facts -> deterministic features -> scoring rules -> AI
   * interpretation — sorting nine integers is a deterministic feature, not something to hand
   * to interpretation. The fix is not a prompt instruction asking the model to sort more
   * carefully; it's to stop asking it to sort at all.
   *
   * The sort only ever runs over `isAssessed` dimensions — an unassessed one has no real score
   * to rank by (its `score` field may still hold a number; see the fixture/type comment above
   * for why that number is never rendered), and letting it enter the ordering would silently
   * revive the exact "absence read as a measurement" defect this file already fixed once.
   * Ties are named explicitly rather than left for position alone to imply: two dimensions
   * sharing the true minimum both get "tied for weakest", not a single arbitrary "weakest".
   *
   * Second pass (docs/advisor-chat-ranking-fix-verification-2026-09-03.md, oryn-80,
   * live-verified 3/3): tagging only the rank-1 boundary closed the worse failure mode
   * (unassessed dimensions entering the ranking) but not the literal symptom that started this
   * fix — a "two weakest dimensions" claim still named the wrong second dimension, 3/3, live,
   * on the exact commit that fixed rank 1. The mechanism was the same one that caused the
   * original bug, just one rank down: a plain, untagged list position is not a strong enough
   * signal on its own for the model to prefer it over a dimension that narratively fits the
   * recommendation already being written, even though the same model reads an untagged
   * position correctly when nothing else in the reply is competing for that slot. An inline
   * tag closes that gap for rank 1; rank 2 needed the same tag, not a stronger header
   * instruction — the header was already "already computed... do not re-rank by eye" and that
   * wasn't enough. So the boundary this file tags is now the weakest AND second-weakest
   * position specifically — still not a general mid-list tie annotation (nothing has found a
   * need for one past rank 2), just the two positions a "name your weakest areas" question
   * actually asks for.
   *
   * Second-weakest is only computed when rank 1 is a clean, untied minimum. When two or more
   * dimensions already tie for weakest, they already are the answer to "two weakest
   * dimensions" — tagging a third, higher-scoring dimension as "second-weakest" alongside them
   * would claim three dimensions share the bottom two slots, which is false.
   */
  lines.push(
    "Dimension states, assessed ones ordered weakest to strongest (this order is already computed — use it directly if asked which dimensions are weakest or strongest; do not re-rank by eye). Never quote a score for a dimension Oryn has not assessed:",
  );
  const assessedScores = context.profileScores.filter((d) => isAssessed(d.state)).sort((a, b) => a.score - b.score);
  const unassessedScores = context.profileScores.filter((d) => !isAssessed(d.state));
  const weakestScore = assessedScores[0]?.score;
  const weakestIsTied = assessedScores.filter((d) => d.score === weakestScore).length > 1;
  const secondWeakestScore = weakestIsTied ? undefined : assessedScores.find((d) => d.score > weakestScore)?.score;
  const secondWeakestIsTied = secondWeakestScore !== undefined && assessedScores.filter((d) => d.score === secondWeakestScore).length > 1;
  for (const d of assessedScores) {
    const label = dimensionLabel(d.dimension, locale);
    let rankTag = "";
    if (d.score === weakestScore) {
      rankTag = weakestIsTied ? " — tied for weakest" : " — weakest";
    } else if (d.score === secondWeakestScore) {
      rankTag = secondWeakestIsTied ? " — tied for second-weakest" : " — second-weakest";
    }
    lines.push(`  - ${label}: ${evidenceStateLabel(d.state, locale)} (${d.score}/100, confidence: ${d.confidence})${rankTag}`);
  }
  for (const d of unassessedScores) {
    const label = dimensionLabel(d.dimension, locale);
    lines.push(`  - ${label}: ${evidenceStateLabel(d.state, locale)} — no score to quote, Oryn has not assessed this`);
  }
  /**
   * `verified` renders silently (no tag) — the "no news is good news" default, unchanged
   * from before. The other three states each get their own explicit tag; before this fix
   * `evidence_added` and `verification_rejected` both fell through to that same silence,
   * indistinguishable from `verified` (Finding 1,
   * docs/handoffs/feat1-territory-audit-2026-08-22.md). `ADVISOR_SYSTEM_PROMPT` below
   * spells out what each tag means so the model doesn't have to guess.
   */
  const evidenceTag = (status: EvidenceStatus): string => {
    if (status === "self_reported") return " [self-reported]";
    if (status === "evidence_added") return " [evidence added, not independently verified]";
    if (status === "verification_rejected") return " [verification rejected]";
    return "";
  };
  const tag = (ongoing: boolean, evidenceStatus: EvidenceStatus) => `${ongoing ? " [ongoing]" : ""}${evidenceTag(evidenceStatus)}`;
  /**
   * Education/courses/test scores: the raw evidence behind the Academics and Intellectual
   * Curiosity dimension states just above, placed directly after them so the model can connect
   * "Academics: strong" to *why* rather than only ever quoting the state. See the interface
   * comment on `educationRecords` for the zero-marginal-fetch-cost provenance.
   */
  lines.push(
    `Education (${context.educationRecords.length}): ${
      context.educationRecords
        .map((e) => `${e.schoolName}${e.overallGpa != null ? ` (GPA ${e.overallGpa}${e.gpaScale != null ? `/${e.gpaScale}` : ""})` : ""}`)
        .join("; ") || "none"
    }`
  );
  lines.push(
    `Courses (${context.courses.length}): ${
      context.courses
        .map((c) => `${c.courseName} [${courseLevelLabel(c.level, locale)}]${c.gradeValue ? `: ${c.gradeValue}${c.gradeScale ? `/${c.gradeScale}` : ""}` : ""}`)
        .join("; ") || "none"
    }`
  );
  lines.push(
    `Test scores (${context.testScores.length}): ${
      context.testScores
        .map((t) => {
          const subscoreEntries = Object.entries(t.subscores);
          const subscoreText = subscoreEntries.length > 0 ? ` (${subscoreEntries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")})` : "";
          return `${t.testName}: ${t.score}${t.maxScore ? `/${t.maxScore}` : ""}${subscoreText}`;
        })
        .join("; ") || "none"
    }`
  );
  lines.push(
    `Activities (${context.activities.length}): ${context.activities.map((a) => `${a.title}${a.isLeadership ? " [leadership]" : ""}${tag(a.ongoing, a.evidenceStatus)}`).join("; ") || "none"}`
  );
  lines.push(`Projects (${context.projects.length}): ${context.projects.map((p) => `${p.title}${tag(p.ongoing, p.evidenceStatus)}`).join("; ") || "none"}`);
  lines.push(`Research (${context.research.length}): ${context.research.map((r) => `${r.title}${tag(r.ongoing, r.evidenceStatus)}`).join("; ") || "none"}`);
  lines.push(`Awards (${context.awards.length}): ${context.awards.map((a) => `${a.title}${evidenceTag(a.evidenceStatus)}`).join("; ") || "none"}`);
  lines.push(
    `Certifications (${context.certifications.length}): ${
      context.certifications.map((c) => `${c.title}${c.organization ? ` — ${c.organization}` : ""}${evidenceTag(c.evidenceStatus)}`).join("; ") || "none"
    }`
  );
  lines.push(
    `Volunteering (${context.volunteeringExperiences.length}): ${
      context.volunteeringExperiences
        .map((v) => `${v.title}${v.organization ? ` — ${v.organization}` : ""}${tag(v.ongoing, v.evidenceStatus)}`)
        .join("; ") || "none"
    }`
  );
  lines.push(
    `Work experience (${context.workExperiences.length}): ${
      context.workExperiences
        .map((w) => `${w.title} — ${w.organization} [${employmentTypeLabel(w.employmentType, locale)}]${w.paid ? " [paid]" : ""}${tag(w.ongoing, w.evidenceStatus)}`)
        .join("; ") || "none"
    }`
  );
  if (context.sports.length > 0) {
    const committedHours = context.sports.filter((s) => s.ongoing).reduce((sum, s) => sum + (s.hoursPerWeek ?? 0), 0);
    lines.push(
      `Sports (${context.sports.length}, ~${committedHours} committed hrs/week from ongoing ones — subtract this from the weekly time budget above, it is not free capacity): ` +
        context.sports
          .map((s) => `${s.sport}${s.level ? ` (${s.level})` : ""}${s.isCaptain ? " [captain]" : ""}${s.ongoing ? " [ongoing]" : ""}${s.achievements ? ` — ${s.achievements}` : ""}`)
          .join("; ")
    );
  }
  // category is free text (career_goals.category is `string | null`, not a closed DB enum, so no
  // label accessor applies — same reasoning as testScores' subscore keys above) and was fetched,
  // typed, and dropped here until this build; folded onto the same line as title rather than a
  // separate one since a goal without its category is still a complete, useful line on its own.
  lines.push(`Goals: ${context.goals.map((g) => `${g.title}${g.category ? ` [${g.category}]` : ""}`).join("; ") || "none set"}`);
  // Fetched since the assembler's first version, never rendered anywhere (verified: weekly-plan.ts
  // uses this same formatter, and research-generator.ts's own interests param is a caller-supplied
  // argument, not context.interests) — a student who set these during onboarding was never once
  // reminded the advisor already has them, on either hot path.
  lines.push(`Interests: ${context.interests.join(", ") || "none set"}`);
  /**
   * `outlook` is a persisted enum (`extreme_reach`, `not_applicable`, …) and the badge that
   * renders it says "Extreme Reach". Handed the raw value, the model writes the raw value:
   * four live advisor replies say `extreme_reach` to a student. Same fix as the dimension
   * names above, and the labels now live in lib/admissions/outlook.ts so the badge and this
   * prompt cannot drift apart.
   *
   * `status` is left as-is deliberately — its values are ordinary words a student would
   * recognise ("applying", "accepted", "waitlisted"), not identifiers. Enforced, not just
   * recorded: `__tests__/i18n/ai-prompt-enum-labels.test.ts`'s `EXEMPT` list names this
   * exact field, so a future accidental removal of this reasoning would still be caught.
   */
  lines.push(
    `Target universities: ${
      context.targetUniversities
        .map((t) => `${t.name} (${t.status}${t.outlook ? `, ${outlookLabel(t.outlook, locale)}` : ""})`)
        .join("; ") || "none yet"
    }`,
  );
  lines.push(`Upcoming deadlines: ${context.upcomingDeadlines.map((d) => `${d.title} on ${d.date} (${d.source})`).join("; ") || "none"}`);
  if (context.pendingApplicationRequirements.length > 0) {
    // requirementTitle ?? raw requirement_type until this same 2026-09-02 sweep (oryn-31's
    // finding) — see requirementTypeLabel above and pendingApplicationRequirements' own
    // interface comment for why the merge happens here rather than at the fetch site.
    lines.push(
      `Unfinished application checklist items: ${context.pendingApplicationRequirements.map((r) => `${r.requirementTitle ?? requirementTypeLabel(r.requirementType, locale)} (${r.applicationTitle})`).join("; ")}`,
    );
  }
  if (context.recentActionOutcomes.length > 0) {
    const describe = (a: StudentAdvisorContext["recentActionOutcomes"][number]) => {
      // Raw "did_not_work"/"opportunity_no_longer_available" until 2026-09-02's
      // raw-enum-leak sweep — see reflectionOutcomeLabel above.
      const outcomeText = a.reflectionOutcome ? ` (outcome: ${reflectionOutcomeLabel(a.reflectionOutcome, locale)})` : "";
      if (a.status === "completed") return `COMPLETED "${a.title}"${outcomeText}${a.reflectionNote ? ` — "${a.reflectionNote}"` : ""}`;
      if (a.status === "skipped") return `SKIPPED "${a.title}"`;
      return `EXPIRED UNDONE "${a.title}"`;
    };
    lines.push(`Recent weekly-action outcomes (learn from these — don't just repeat what was skipped or didn't work):\n  - ${context.recentActionOutcomes.map(describe).join("\n  - ")}`);
  }
  if (context.recentRecommendationTitles.length > 0) {
    lines.push(`Previously suggested "avoid for now" items (don't repeat unless the situation has genuinely changed): ${context.recentRecommendationTitles.join("; ")}`);
  }
  /**
   * Last, deliberately, not grouped with the rest of the student intro near the top: this is
   * the one line in this whole function the student wrote to reach the model directly, not a
   * profile fact the model reasons about — and it should read as the closing word, not one
   * more bullet buried among two dozen others. Quoted verbatim (this is exactly what
   * migration 0111's column is for), with an explicit carve-out rather than an unqualified
   * "always follow this": a raw instruction could otherwise be used to suppress the honest,
   * evidence-based counsel this product's whole advisor character depends on (AGENTS.md
   * Phase 8's "opportunity cost" mandate, Phase 57's "avoid excessive praise") — e.g. "always
   * tell me I'm doing great" — which this line is written to still refuse.
   */
  if (context.student.advisorInstructions) {
    lines.push(
      `Student's own standing instruction to you, in their words — follow it in every reply unless it would conflict with your safety rules or with giving honest, evidence-based advice: "${context.student.advisorInstructions}"`,
    );
  }
  return lines.join("\n");
}
