import "server-only";

import { z } from "zod";
import { getAIProvider } from "./index";
import { withUsageLogging } from "./usage";
import { ADVISOR_SYSTEM_PROMPT } from "./advisor-prompt";
import { buildStudentAdvisorContext, formatContextForPrompt } from "./student-context";
import { formatEligibilityCaveat } from "./eligibility-text";
import { formatFeeCaveat } from "./fee-text";
import { formatRequirementsCaveat } from "./requirements-text";
import { withOutputLanguage } from "./output-language";
import { getCounselorRecommendations } from "@/lib/counselor";
import { recommendationClassLabel } from "@/lib/counselor/copy";
import type { BoundedLevel, CounselorRecommendation, RecommendationClass } from "@/lib/counselor/types";
import type { Locale } from "@/lib/i18n/config";
import type { TimeBudget } from "@/types/database";

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
type WeeklyActionGeneration = WeeklyPlanGeneration["actions"][number];

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

function formatOne(recommendation: CounselorRecommendation, locale: Locale): string {
  const parts = [`[${recommendationClassLabel(recommendation.recommendationClass, locale)}] ${recommendation.title}`];
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

function section(heading: string, recommendations: CounselorRecommendation[], locale: Locale): string | null {
  if (recommendations.length === 0) return null;
  return `${heading}\n${recommendations.map((r) => formatOne(r, locale)).join("\n")}`;
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
export function formatCounselorGrounding(recommendations: CounselorRecommendation[], locale: Locale): string {
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
      locale,
    ),
    section(
      // Tag text matches formatOne's own recommendationClassLabel output exactly (was the
      // raw "[avoid_for_now]" until 2026-09-02's raw-enum-leak sweep) — this instruction
      // tells the model what to look for in the list rendered just above it, so it has to
      // name the actual tag that list uses, in whichever language it's rendered in.
      `Counselor Core has separately ruled these out for this student right now — they are the OPPOSITE of recommendations. Never put any of them in "actions", and never describe one as something worth doing. They are here so you can name one in "avoidForNow" and explain why; the item tagged [${recommendationClassLabel("avoid_for_now", locale)}], if there is one, is Counselor Core's own pick for that field:`,
      ruledOut,
      locale,
    ),
  ].filter((s): s is string => s !== null);

  if (sections.length === 0) return "";
  return `\n\n${sections.join("\n\n")}`;
}

/**
 * Pure half of buildCounselorGrounding's own recommendedTitles derivation, exported (2026-
 * 09-02) so lib/ai/eval/harness.ts can compute the same list from a fixture's
 * CounselorRecommendation[] without a database — same "extract the pure piece so the
 * harness reuses it instead of hand-copying RECOMMENDED_CLASSES" reasoning as
 * formatCounselorGrounding/buildWeeklyPlanInstruction above.
 */
export function counselorRecommendedTitles(recommendations: CounselorRecommendation[]): string[] {
  return recommendations.filter((r) => RECOMMENDED_CLASSES.includes(r.recommendationClass)).map((r) => r.title);
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
 *
 * Also returns the raw `recommendations` array (2026-09-02, founder-directed Phase 38
 * wiring) so `rankPlanActions` below can read each candidate's real impact/urgency/
 * confidence/effort — the same data this function already fetched to build the prompt text,
 * not a second query. On failure it comes back empty too, same degrade: no Counselor Core
 * data means `rankPlanActions` falls back to ranking by the model's own stated impact alone,
 * not a blocked plan.
 */
async function buildCounselorGrounding(
  userId: string,
  locale: Locale,
  supabaseClient?: Parameters<typeof getCounselorRecommendations>[2],
): Promise<{ text: string; recommendedTitles: string[]; recommendations: CounselorRecommendation[] }> {
  try {
    // Was `undefined` (silently defaulting to DEFAULT_LOCALE = "en") until this same
    // 2026-09-02 sweep — found as a direct byproduct of threading locale through for
    // recommendationClassLabel, not a separate investigation. getCounselorRecommendations
    // already threads locale into runCounselorPipeline, which generates real, locale-aware
    // "why" reasoning via lib/counselor/copy.ts's gapWhyLine/alreadyStrongWhyLine — so
    // every weekly-plan generation for every Turkish student was quietly grounding the
    // model in English counselor reasoning it then had to translate or paraphrase on the
    // fly, rather than the same authoritative Turkish sentence a student would see
    // elsewhere. Live and unconditional, not an edge case: every call went through this.
    const counselorResult = await getCounselorRecommendations(userId, locale, supabaseClient);
    const text = formatCounselorGrounding(counselorResult.recommendations, locale);
    const recommendedTitles = counselorRecommendedTitles(counselorResult.recommendations);
    return { text, recommendedTitles, recommendations: counselorResult.recommendations };
  } catch (error) {
    console.error("[weekly-plan] failed to fetch counselor grounding, continuing without it", error);
    return { text: "", recommendedTitles: [], recommendations: [] };
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

const LEVEL_WEIGHT: Record<BoundedLevel, number> = { low: 1, medium: 2, high: 3 };
const ACTION_IMPACT_WEIGHT: Record<WeeklyActionGeneration["impact"], number> = { low: 1, medium: 2, high: 3, very_high: 4 };

/** Neutral midpoint on the same 1-3 scale as LEVEL_WEIGHT, substituted for urgency/
 * confidence/effort when an action has no matched Counselor Core candidate. Chosen so its
 * net contribution (urgency + confidence - effort) is a *constant* 2 regardless of match
 * status disagreement, not because "medium" is a meaningful guess — see rankPlanActions'
 * own doc comment for why a constant offset is what makes the no-match case degrade to
 * "rank by impact alone" instead of silently attaching invented signal to an unmatched action. */
const NEUTRAL_LEVEL_WEIGHT = LEVEL_WEIGHT.medium;

/**
 * Phase 38, founder-directed 2026-09-02: connect Counselor Core's real, deterministic
 * impact/urgency/confidence/effort to the dashboard's top-3 ordering. Before this, nothing
 * ranked the three actions at all — `lib/plan/persist.ts` wrote `priority: index + 1`
 * straight from the model's own generation order, and a live check against every plan in
 * the database found 3 of 9 non-monotonic against even `impact`, the one factor that
 * exists in `WeeklyActionSchema` at all (see docs/i18n-coverage.md-adjacent finding,
 * reported to the founder directly). The founder's decision: wire the real engine, don't
 * invent the missing two factors (`profileNeed`/`goalAlignment` exist nowhere outside the
 * unrelated opportunity matcher — not synthesised here either).
 *
 * **Matching, the hard part named explicitly in the assignment**: the model's `actions`
 * carry no candidate id, only a free-text title, so each action is matched back to a
 * Counselor Core recommendation via `namesSameActivity` — the exact function
 * `resolvePlanSelfContradiction` above already uses for the identical "does this free-text
 * title name that free-text title" problem, not a second implementation of title matching.
 * An action with no match (the model proposed something grounded in the student's own
 * existing work rather than a Counselor Core candidate — explicitly allowed by
 * `buildWeeklyPlanInstruction`) is not an error; it is handled by the neutral-weight
 * degrade below, not treated as unranked or dropped.
 *
 * **The formula, and why it can't hit Phase 38's own named failure mode.** Phase 38's spec
 * warns a raw product/quotient of factors is numerically unstable — a near-zero confidence
 * or effort swamps everything. This is additive, not multiplicative, by deliberate choice:
 * `score = impactWeight + (matched ? urgencyWeight + confidenceWeight - effortWeight : neutralConstant)`.
 * Every weight is an integer on a 1-3 (or 1-4 for the action's own 4-value impact) scale —
 * there is no division anywhere, and no weight is ever 0, so there is no factor whose
 * proximity to zero can dominate the sum. The action's own `impact` field is used for every
 * action, matched or not — a single consistent source for the one factor that's always
 * available, rather than switching between the model's 4-value scale and Counselor Core's
 * 3-value one depending on match status.
 *
 * **The no-match fallback is "rank by impact alone" by construction, not a separate branch.**
 * An unmatched action's urgency/confidence/effort terms substitute `NEUTRAL_LEVEL_WEIGHT`
 * for all three, which nets to a *constant* +2 contribution (2 + 2 - 2) — comparing two
 * unmatched actions therefore reduces exactly to comparing their impact weights, which is
 * the fallback the founder's decision asked for, without a second formula to keep in sync
 * with the first.
 *
 * **Ties break to the model's own original order**, via a stable sort keyed last on each
 * action's index in the array `generateStructured` actually returned — not an arbitrary
 * default, and not left to a JS engine's sort-stability guarantee going unstated: when the
 * deterministic signal doesn't distinguish two actions, the model's own judgment about
 * which it wrote first is a real (if weaker) signal, not noise.
 *
 * **This function only reorders `actions` — every downstream consumer of "array order is
 * priority" (`enforceTimeBudget`'s own trim-from-the-end, `lib/plan/persist.ts`'s
 * `priority: index + 1`) keeps working unchanged, because this runs before both**: the
 * order they read is now the ranked order instead of the raw model order, with no other
 * code path needing to change. Must run after `resolvePlanSelfContradiction` (which is
 * order-independent, so the relative sequencing with that function doesn't matter) and
 * before `enforceTimeBudget` (which does depend on it — trimming must remove the actions
 * this ranking considers lowest-priority, not whatever happened to be last in the model's
 * own draft).
 */
export function rankPlanActions(plan: WeeklyPlanGeneration, recommendations: readonly CounselorRecommendation[]): WeeklyPlanGeneration {
  if (plan.actions.length < 2) return plan;

  function score(action: WeeklyActionGeneration): number {
    const matched = recommendations.find((r) => namesSameActivity(action.title, r.title));
    // NEUTRAL_LEVEL_WEIGHT here is the unmatched case's `2 + 2 - 2` collapsed to its own
    // result — see this function's own doc comment for why that constant is what makes the
    // fallback reduce to ranking by impact alone.
    const counselorContribution = matched ? LEVEL_WEIGHT[matched.urgency] + LEVEL_WEIGHT[matched.confidence] - LEVEL_WEIGHT[matched.effort] : NEUTRAL_LEVEL_WEIGHT;
    return ACTION_IMPACT_WEIGHT[action.impact] + counselorContribution;
  }

  const ranked = plan.actions
    .map((action, originalIndex) => ({ action, originalIndex, score: score(action) }))
    .sort((a, b) => b.score - a.score || a.originalIndex - b.originalIndex)
    .map((entry) => entry.action);

  return { ...plan, actions: ranked };
}

/**
 * Upper bound per stated weekly-time-budget bucket, in minutes. Only the upper bound
 * matters here — recommending fewer or shorter actions than a student's stated capacity
 * is never the failure this guards against (Phase 2: "the goal is not maximum activity...
 * maximum development per unit of student time"), only exceeding it is.
 *
 * `10h_plus` is deliberately absent: the spec's own bucket has no stated ceiling, and none
 * is invented here — a student who said they have significant capacity isn't
 * second-guessed with a number they never gave us. WeeklyActionSchema's existing
 * per-action 1200-minute cap still applies to them; only the weekly-total check below
 * doesn't.
 */
const BUDGET_UPPER_BOUND_MINUTES: Partial<Record<TimeBudget, number>> = {
  under_2h: 120,
  "2_5h": 300,
  "5_10h": 600,
};

/**
 * 20% headroom above the upper bound before anything gets trimmed. A self-reported
 * "5-10 hours" is a fuzzy weekly estimate, not a precise contract, and Phase 64's own
 * example is a 5x overshoot (15h recommended against a stated 3h free) — the rule exists
 * to catch gross overcommitment, not to nitpick a plan that runs a few minutes long.
 */
const BUDGET_TOLERANCE = 1.2;

function sumMinutes(actions: WeeklyPlanGeneration["actions"]): number {
  return actions.reduce((total, action) => total + action.estimatedMinutes, 0);
}

/**
 * Deterministic backstop for Phase 64's own rule ("do not recommend 15 hours of new
 * commitments to a student who has 2 hours free") — currently enforced by
 * ADVISOR_SYSTEM_PROMPT alone, confirmed working against real historical weekly_actions
 * data (docs/time-budget-busy-mode-audit-2026-09-02.md) but never structurally
 * guaranteed, and never yet exercised for the two tightest buckets (under_2h/2_5h) live.
 * This does not replace that instruction — ADVISOR_SYSTEM_PROMPT is unchanged — it only
 * ever trims a plan the prompt-based instruction failed to keep in bounds.
 *
 * Must degrade: a null/missing weeklyTimeBudget (2 of 8 live students) returns the plan
 * unchanged rather than blocking generation — same "absent input, no confident output"
 * discipline as everywhere else this codebase applies it.
 *
 * Drops the lowest-priority action(s) first — array order is priority (`lib/plan/
 * persist.ts` writes `priority: index + 1` straight from this order), so trimming from the
 * end preserves what's ranked highest. Must run after `rankPlanActions` (2026-09-02): before
 * that function existed, "priority" here meant only the model's own generation order; it
 * now means `rankPlanActions`' deterministic ranking, and this function's own logic didn't
 * need to change at all — it has always trusted whatever order `actions` arrived in, which
 * is exactly what makes running it after the reorder, not before, sufficient. Never drops to
 * zero: a single over-budget action is a better outcome than an empty plan (`actions` already has a
 * schema-level `.min(1)` floor `resolvePlanSelfContradiction` depends on too), so a plan
 * whose top action alone exceeds the budget is logged, not further reduced.
 */
export function enforceTimeBudget(plan: WeeklyPlanGeneration, weeklyTimeBudget: string | null): WeeklyPlanGeneration {
  // `StudentAdvisorContext.weeklyTimeBudget` is typed as a plain string (it only ever
  // gets interpolated into prompt text elsewhere), not the DB's own TimeBudget enum — the
  // `in` check below both narrows it safely and doubles as the 10h_plus / unrecognized-
  // value guard, since neither is a key of BUDGET_UPPER_BOUND_MINUTES.
  if (!weeklyTimeBudget || !(weeklyTimeBudget in BUDGET_UPPER_BOUND_MINUTES)) return plan;
  const upperBound = BUDGET_UPPER_BOUND_MINUTES[weeklyTimeBudget as TimeBudget]!;

  const threshold = Math.round(upperBound * BUDGET_TOLERANCE);
  const originalTotal = sumMinutes(plan.actions);
  if (originalTotal <= threshold) return plan;

  const trimmed = [...plan.actions];
  while (trimmed.length > 1 && sumMinutes(trimmed) > threshold) {
    trimmed.pop();
  }
  const trimmedTotal = sumMinutes(trimmed);
  console.warn("[weekly-plan] generation exceeded the student's stated time budget — trimmed", {
    weeklyTimeBudget,
    thresholdMinutes: threshold,
    originalTotalMinutes: originalTotal,
    originalActionCount: plan.actions.length,
    trimmedTotalMinutes: trimmedTotal,
    trimmedActionCount: trimmed.length,
    stillOverBudget: trimmedTotal > threshold,
  });
  return { ...plan, actions: trimmed };
}

/**
 * The static half of the weekly-plan user-turn prompt — the instruction sentence that
 * doesn't depend on any student data. Extracted (2026-09-02, the empty-slot-permission
 * package) so lib/ai/eval/harness.ts's buildWeeklyPlanPrompt can call this instead of
 * hand-copying it — the drift risk that file's own header has documented since it was
 * written: formatContextForPrompt and formatCounselorGrounding were already shared, this
 * sentence was the one part that wasn't, and it had already silently drifted once (the
 * harness's copy was missing the Counselor-Core-recommendation sentence below before this
 * extraction). Pure and synchronous, same "exported so it can't drift" shape as
 * formatCounselorGrounding above.
 */
export function buildWeeklyPlanInstruction(): string {
  return `Generate this week's plan: 1-3 highest-impact actions (fewer is fine if that's all that's genuinely high-impact), plus, only when something genuinely stands out, one thing to explicitly avoid prioritizing right now. Leave "avoidForNow" null when nothing does — most weeks, for a well-rounded student, nothing will. Inventing a plausible-sounding candidate just to fill that field is worse than leaving it empty: a fabricated warning teaches the student to stop trusting the real ones. Ground every action in the student's actual gaps and existing work — don't propose generic tasks. Never name the same activity in both "actions" and "avoidForNow" — if you would recommend it, it does not belong in "avoidForNow", and if it belongs in "avoidForNow", do not recommend it. This also applies to anything Counselor Core already recommended above, even if you don't put it in "actions" yourself — a Counselor Core recommendation is never a valid answer for "avoidForNow".`;
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
  const { text: counselorGrounding, recommendedTitles, recommendations } = await buildCounselorGrounding(userId, context.student.preferredLanguage, supabaseClient);
  const provider = getAIProvider();

  // withUsageLogging resolves selectModelForUser(userId) itself and threads degraded/
  // degradeReason into logAIUsage on both the success path AND a retry-exhausted
  // generateStructured failure (added 2026-09-02) -- this feature is the exact one the
  // founder's own measured incident came from (one student regenerating this plan 102
  // times in a week, $3.04, 3x the monthly ceiling, see lib/ai/limits/budget.ts), and it
  // carries roughly 90% of the product's AI spend to date, so a retry-exhausted call here
  // losing its usage entirely would be the largest single instance of the class the
  // 2026-09-02 sweep found in cv_extraction/achievement_refinement.
  const result = await withUsageLogging({ userId, feature: "weekly_plan" }, (model) =>
    provider.generateStructured({
      system: withOutputLanguage(ADVISOR_SYSTEM_PROMPT, context.student.preferredLanguage),
      prompt: `Here is the student's current context:\n\n${formatContextForPrompt(context, context.student.preferredLanguage)}${counselorGrounding}\n\n${buildWeeklyPlanInstruction()}`,
      schema: WeeklyPlanSchema,
      schemaName: "record_weekly_plan",
      schemaDescription: "Records this week's prioritized action plan for the student.",
      maxTokens: 2048,
      model,
    }),
  );

  // Contradiction resolution first, on the model's full original output — trimming or
  // reordering first could remove the very action that made avoidForNow self-contradictory,
  // and resolvePlanSelfContradiction should see everything the model actually said. Ranking
  // next, so the time-budget trim after it removes what's genuinely lowest-priority rather
  // than whatever the model happened to write last (see rankPlanActions' and
  // enforceTimeBudget's own doc comments for why this order is load-bearing).
  const resolved = resolvePlanSelfContradiction(result.data, recommendedTitles);
  const ranked = rankPlanActions(resolved, recommendations);
  return enforceTimeBudget(ranked, context.student.weeklyTimeBudget);
}
