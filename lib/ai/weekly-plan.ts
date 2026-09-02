import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { logAIUsage } from "./usage";
import { selectModelForUser } from "./limits/budget";
import { ADVISOR_SYSTEM_PROMPT } from "./advisor-prompt";
import { buildStudentAdvisorContext, formatContextForPrompt } from "./student-context";
import { formatEligibilityCaveat } from "./eligibility-text";
import { formatFeeCaveat } from "./fee-text";
import { formatRequirementsCaveat } from "./requirements-text";
import { withOutputLanguage } from "./output-language";
import { getCounselorRecommendations } from "@/lib/counselor";
import type { CounselorRecommendation, RecommendationClass } from "@/lib/counselor/types";

const WeeklyActionSchema = z.object({
  title: z.string(),
  description: z.string(),
  reason: z.string().describe("Why this matters, in terms of the student's actual scores/gaps"),
  category: z.string(),
  estimatedMinutes: z.number().int().positive().max(1200),
  impact: z.enum(["low", "medium", "high", "very_high"]),
});

// Exported (no behavior change) so lib/ai/eval/harness.ts can call provider.generateStructured
// with the real schema instead of a second, hand-copied one that could drift from it —
// same "pure functions exported for testability" pattern this file already applies to
// formatCounselorGrounding above.
export const WeeklyPlanSchema = z.object({
  summary: z.string().describe("One or two sentences on what changed and what matters most this week"),
  actions: z.array(WeeklyActionSchema).min(1).max(3),
  avoidForNow: z
    .object({ activity: z.string(), reason: z.string() })
    .nullable()
    .describe("One thing the student should explicitly NOT prioritize right now, if applicable. Null if nothing stands out."),
});

export type WeeklyPlanGeneration = z.infer<typeof WeeklyPlanSchema>;

/** Counselor Core's four-value `recommendation_class` enum splits cleanly in two, and the
 * prompt must respect that split. `do`/`consider` are things to put in front of the student;
 * `deprioritize`/`avoid_for_now` are Counselor Core's deterministic judgment that the student
 * should NOT spend this week on them (lib/counselor/scoring.ts derives both from real
 * dimension scores). Handing all four to the model under one "prefer these" heading is what
 * produced a dashboard that recommended two actions and then listed those same two under
 * "one thing not to do". */
const RECOMMENDED_CLASSES: readonly RecommendationClass[] = ["do", "consider"];
const RULED_OUT_CLASSES: readonly RecommendationClass[] = ["deprioritize", "avoid_for_now"];

/** Prompt budget, per section (spec Phase 27, context trimming). The recommended section
 * keeps the original list's cap of 8; the ruled-out section is smaller because the plan has
 * exactly one `avoidForNow` slot to fill and scoring.ts only ever emits one
 * `avoid_for_now` — a few `deprioritize` items alongside it are enough context to pick
 * well, and more would just crowd out the half of the prompt that matters. */
const MAX_RECOMMENDED_IN_GROUNDING = 8;
const MAX_RULED_OUT_IN_GROUNDING = 4;

function formatOne(recommendation: CounselorRecommendation): string {
  const parts = [`[${recommendation.recommendationClass}] ${recommendation.title}`];
  if (recommendation.why[0]) {
    parts.push(recommendation.why[0]);
  }
  const eligibilityCaveat = formatEligibilityCaveat(recommendation.eligibility);
  if (eligibilityCaveat) {
    parts.push(eligibilityCaveat);
  }
  const feeCaveat = formatFeeCaveat(recommendation.costOnFile);
  if (feeCaveat) {
    parts.push(feeCaveat);
  }
  const requirementsCaveat = formatRequirementsCaveat(recommendation.applicationRequirements);
  if (requirementsCaveat) {
    parts.push(requirementsCaveat);
  }
  return `- ${parts.join(" — ")}`;
}

function section(heading: string, recommendations: CounselorRecommendation[]): string | null {
  if (recommendations.length === 0) return null;
  return `${heading}\n${recommendations.map(formatOne).join("\n")}`;
}

/**
 * Pure formatting half, exported separately so the assembled prompt is testable without a
 * database or a model call (same split as opportunity-context.ts's
 * formatOpportunityContext and student-context.ts's formatContextForPrompt).
 *
 * Two sections, never one. Ordering inside each section is Counselor Core's own score
 * order, which the pipeline already guarantees — this only groups, it never re-ranks. A
 * section with nothing in it is omitted entirely rather than emitted as an empty heading,
 * so the common case (no ruled-out candidates) reads exactly as it did before.
 */
export function formatCounselorGrounding(recommendations: CounselorRecommendation[]): string {
  const recommended = recommendations
    .filter((r) => RECOMMENDED_CLASSES.includes(r.recommendationClass))
    .slice(0, MAX_RECOMMENDED_IN_GROUNDING);
  const ruledOut = recommendations
    .filter((r) => RULED_OUT_CLASSES.includes(r.recommendationClass))
    .slice(0, MAX_RULED_OUT_IN_GROUNDING);

  const sections = [
    section(
      "Oryn's Counselor Core has already identified these verified candidate actions this week (prefer these over inventing new ones when one genuinely fits — you may still propose something grounded in the student's own existing projects/activities/goals that isn't in this list, but never invent a new external program, competition, or deadline). A line marked ELIGIBILITY UNKNOWN or NOT ELIGIBLE has NOT been confirmed open to this student — pass that caveat on rather than presenting the item as a settled option. Never put one of these in \"avoidForNow\" — they are Counselor Core's recommendations, the opposite of something to discourage, even if you choose not to put it in \"actions\" yourself:",
      recommended,
    ),
    section(
      'Counselor Core has separately ruled these out for this student right now — they are the OPPOSITE of recommendations. Never put any of them in "actions", and never describe one as something worth doing. They are here so you can name one in "avoidForNow" and explain why; the item tagged [avoid_for_now], if there is one, is Counselor Core\'s own pick for that field:',
      ruledOut,
    ),
  ].filter((s): s is string => s !== null);

  if (sections.length === 0) return "";
  return `\n\n${sections.join("\n\n")}`;
}

/**
 * Counselor Core's already-ranked, already-verified candidates as extra grounding for the
 * weekly-plan prompt — additive only (spec §26/§27: reduces how much the model has to
 * invent, never required for weekly-plan generation to work). A failure here is non-fatal:
 * the plan still generates from student context alone, exactly as it did before this
 * existed — Counselor Core being unavailable must never block weekly plans.
 *
 * Returns `recommendedTitles` alongside the formatted text so the caller can also pass them
 * to `resolvePlanSelfContradiction` — Counselor Core's own do/consider list is a second,
 * authoritative source for "this was recommended", independent of whatever the model itself
 * echoed into `actions`. On failure both come back empty, matching the text-only failure
 * mode this function already had: no grounding means no cross-check either, not a blocked
 * plan.
 */
async function buildCounselorGrounding(
  userId: string,
  supabaseClient?: Parameters<typeof getCounselorRecommendations>[2],
): Promise<{ text: string; recommendedTitles: string[] }> {
  try {
    const counselorResult = await getCounselorRecommendations(userId, undefined, supabaseClient);
    const text = formatCounselorGrounding(counselorResult.recommendations);
    const recommendedTitles = counselorResult.recommendations.filter((r) => RECOMMENDED_CLASSES.includes(r.recommendationClass)).map((r) => r.title);
    return { text, recommendedTitles };
  } catch (error) {
    console.error("[weekly-plan] failed to fetch counselor grounding, continuing without it", error);
    return { text: "", recommendedTitles: [] };
  }
}

/** A crude, deliberately un-clever suffix stripper. It exists for one observed failure mode:
 * the model writes an action as "Start another entrepreneurship club" and the matching avoid
 * line as "starting another entrepreneurship club". Only inflectional endings are touched, and
 * because it is applied symmetrically to both sides of a comparison, over-stemming
 * ("business" → "busines") is harmless — it cannot make two genuinely different phrases
 * collide, only make two spellings of the same phrase agree. Not a general-purpose stemmer,
 * and not worth a dependency. */
function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Lowercased, punctuation-stripped, single-spaced, and lightly stemmed — so "Apply to the
 * Economics Challenge!" and "applying to the economics challenge" compare equal. */
function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(stem)
    .join(" ");
}

/**
 * Whether two free-text strings name the same activity. Deliberately not a fuzzy-similarity
 * score: the check has to be explainable, and a threshold nobody can reason about is worse
 * than a slightly narrow rule.
 *
 * Exact match after normalization, or one is a whole-word contiguous phrase inside the other
 * — which is how the contradiction actually shows up, since the model writes "Apply to the
 * Economics Challenge" as an action and "the Economics Challenge" as the thing to avoid
 * rather than repeating a title verbatim. A single shared word is required NOT to match:
 * "research" appearing in both an action and an avoid line is a topic overlap, not the same
 * activity, and treating it as one would delete a legitimate avoidForNow. The space padding
 * keeps matches on word boundaries, so "economics" does not match inside "macroeconomics".
 */
function namesSameActivity(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;

  const [shorter, longer] = left.length <= right.length ? [left, right] : [right, left];
  if (shorter.split(" ").length < 2) return false;
  return ` ${longer} `.includes(` ${shorter} `);
}

/**
 * The plan must not contradict itself. Nothing upstream enforces this: the Zod schema
 * validates each field's shape independently, and a model that has just been told about a
 * ruled-out candidate can still fold it into both `actions` and `avoidForNow` in one
 * response — which is exactly what a benchmark run caught, on two personas, in the same
 * minute. The grounding fix makes that far less likely; this makes it impossible to ship.
 *
 * On a collision we drop `avoidForNow` and keep the action, rather than retrying the call or
 * dropping the action:
 *  - `avoidForNow` is already nullable by design ("Null if nothing stands out"), and
 *    lib/plan/persist.ts already handles null by simply not writing the recommendation row.
 *    `actions` has a `.min(1)` floor, so removing an action can leave a plan with nothing in
 *    it — turning a cosmetic contradiction into an empty dashboard.
 *  - The three actions are what the student is meant to act on; the avoid line is secondary
 *    commentary. When the two disagree, withholding the commentary is the honest resolution.
 *  - A retry would spend a second full model call on every occurrence, with no guarantee the
 *    retry is any more consistent. Dropping is deterministic, free, and testable without a
 *    live call.
 *
 * The collision is logged so the rate stays visible rather than being silently absorbed —
 * without the titles themselves, which are student-derived content that SECURITY.md keeps
 * out of server logs.
 */
export function resolvePlanSelfContradiction(plan: WeeklyPlanGeneration, counselorRecommendedTitles: string[] = []): WeeklyPlanGeneration {
  const avoided = plan.avoidForNow;
  if (!avoided) return plan;

  // Two independent sources of "this was recommended, not something to avoid": the model's
  // own `actions` array (the original collision this guard was built for), and Counselor
  // Core's do/consider list (the 2026-09-02 eval finding — the model can put a Counselor
  // Core recommendation in avoidForNow WITHOUT also putting it in actions, so the first
  // check alone misses it entirely). Either one is enough to drop avoidForNow.
  const collidesWithAction = plan.actions.some((action) => namesSameActivity(action.title, avoided.activity));
  const collidesWithCounselorRecommendation = counselorRecommendedTitles.some((title) => namesSameActivity(title, avoided.activity));
  if (!collidesWithAction && !collidesWithCounselorRecommendation) return plan;

  console.warn("[weekly-plan] model named a recommended activity as the thing to avoid — dropping avoidForNow", {
    collidesWithAction,
    collidesWithCounselorRecommendation,
  });
  return { ...plan, avoidForNow: null };
}

// `supabaseClient` defaults to the session-scoped client via buildStudentAdvisorContext's
// and buildCounselorGrounding's own defaults. lib/plan/generate-for-active-students.ts (the
// scheduled Job D) is the only session-less caller, and passes its admin client through this
// exact chain -- before this parameter existed, every job-triggered call silently built its
// prompt from an empty student profile (RLS-filtered reads under a null auth.uid()) while
// still spending real tokens on a real Anthropic call, logged via ai_usage regardless
// (lib/ai/usage.ts already uses the admin client, independent of this fix).
export async function generateWeeklyPlan(userId: string, supabaseClient?: Parameters<typeof buildStudentAdvisorContext>[1]): Promise<WeeklyPlanGeneration> {
  const context = await buildStudentAdvisorContext(userId, supabaseClient);
  const { text: counselorGrounding, recommendedTitles } = await buildCounselorGrounding(userId, supabaseClient);
  const provider = getAIProvider();
  // Checked here, not just in principle: this is the exact feature the founder's own
  // measured incident came from (2026-09-02) -- one student regenerating this plan 102
  // times in a week, $3.04, 3x the monthly ceiling. See lib/ai/limits/budget.ts.
  const selection = await selectModelForUser(userId);

  const result = await provider.generateStructured({
    system: withOutputLanguage(ADVISOR_SYSTEM_PROMPT, context.student.preferredLanguage),
    prompt: `Here is the student's current context:\n\n${formatContextForPrompt(context, context.student.preferredLanguage)}${counselorGrounding}\n\nGenerate this week's plan: 1-3 highest-impact actions (fewer is fine if that's all that's genuinely high-impact), plus one thing to explicitly avoid prioritizing right now if something stands out. Ground every action in the student's actual gaps and existing work — don't propose generic tasks. Never name the same activity in both "actions" and "avoidForNow" — if you would recommend it, it does not belong in "avoidForNow", and if it belongs in "avoidForNow", do not recommend it. This also applies to anything Counselor Core already recommended above, even if you don't put it in "actions" yourself — a Counselor Core recommendation is never a valid answer for "avoidForNow".`,
    schema: WeeklyPlanSchema,
    schemaName: "record_weekly_plan",
    schemaDescription: "Records this week's prioritized action plan for the student.",
    maxTokens: 2048,
    model: selection.model,
  });

  await logAIUsage({ userId, feature: "weekly_plan", usage: result.usage, model: result.model, degraded: selection.degraded, degradeReason: selection.degraded ? selection.reason : null });
  return resolvePlanSelfContradiction(result.data, recommendedTitles);
}
