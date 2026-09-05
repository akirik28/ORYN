import type { AIProvider } from "@/lib/ai/provider";
import { ADVISOR_SYSTEM_PROMPT } from "@/lib/ai/advisor-prompt";
import { formatContextForPrompt } from "@/lib/ai/student-context";
import { formatOpportunityContext } from "@/lib/ai/opportunity-context";
import {
  formatCounselorGrounding,
  buildWeeklyPlanInstruction,
  resolvePlanSelfContradiction,
  enforceTimeBudget,
  counselorRecommendedTitles,
  WeeklyPlanSchema,
  type WeeklyPlanGeneration,
} from "@/lib/ai/weekly-plan";
import { withOutputLanguage } from "@/lib/ai/output-language";
import { explainCounselorRecommendations, buildCounselorExplanationPrompt, COUNSELOR_EXPLANATION_SYSTEM_PROMPT } from "@/lib/ai/counselor-explain";
import { dimensionLabel, DIMENSION_ORDER } from "@/lib/scoring/labels";
import { runDeterministicChecks } from "./deterministic-checks";
import { buildJudgePrompt, JudgeVerdictSchema, JUDGE_SYSTEM_PROMPT, JUDGE_MAX_TOKENS } from "./judge";
import {
  REGRESSION_CONTEXT,
  BASELINE_CONTEXT,
  REGRESSION_CHAT_QUESTION,
  BASELINE_CHAT_QUESTION,
  REGRESSION_COUNSELOR_RESULT,
  BASELINE_COUNSELOR_RESULT,
  REGRESSION_UNASSESSED_LABELS_EN,
  REGRESSION_UNASSESSED_LABELS_TR,
} from "./fixtures";
import type { EvalCase, EvalCaseFailure, EvalCaseResult, EvalReport } from "./types";

/**
 * Orchestrates one (fixture x target x locale) case: builds the exact prompt the real
 * generator would send (see fixtures.ts's own header for why this replicates rather than
 * calls generateAdvisorReply/generateWeeklyPlan directly), sends it through the given
 * provider, runs the deterministic checks, and optionally the judge.
 *
 * IMPORTANT LIMITATION, narrower than it used to be: buildAdvisorChatPrompt below is still
 * a *faithful reconstruction* of what generateAdvisorReply currently does, built from the
 * same exported pure pieces that function calls — not a call into the production function
 * itself (which isn't possible without a database; see fixtures.ts). That means this
 * harness can silently drift from the product for advisor_chat specifically: if
 * generateAdvisorReply's own prompt assembly changes and buildAdvisorChatPrompt isn't
 * updated to match, the harness keeps grading a request that no student ever actually
 * receives, and would report a clean pass on production code it is no longer actually
 * exercising. Nothing catches that automatically today — checked while closing the
 * weekly_plan gap below: __tests__/ai/advisor-chat-usage.test.ts (the only advisor_chat
 * test file) asserts on token budget and the usage/degraded-flag return shape, not on
 * ADVISOR_SYSTEM_PROMPT's or generateAdvisorReply's actual prompt text — there is no
 * tripwire for this one today, not even the "re-diff by hand" kind weekly_plan had before
 * this fix. A change to generateAdvisorReply's prompt assembly with no matching change to
 * buildAdvisorChatPrompt below would currently pass every gate silently.
 *
 * weekly_plan closed the prompt half of this gap (2026-09-02): buildWeeklyPlanPrompt below
 * now calls lib/ai/weekly-plan.ts's own exported buildWeeklyPlanInstruction() for the one
 * part that used to be hand-copied (context/grounding formatting were already shared via
 * formatContextForPrompt/formatCounselorGrounding).
 *
 * One real gap reopened this claim, 2026-09-05: both buildWeeklyPlanPrompt below (now) and
 * buildAdvisorChatPrompt above (already true since B7, 2026-09-04, just unnoticed until now
 * — found in passing while fixing this for weekly_plan, not a separate investigation) omit
 * lib/ai/university-admission-context.ts's contribution, which neither can add honestly:
 * it needs a real Supabase client reading real target_universities/university_statistics
 * rows, and this whole file's point is running with no database at all. Documented instead
 * of faked — cost-estimate.ts's own projections for both targets understate real prompt size
 * by roughly 234-569 tokens (B7's own measurement) for a student whose target universities
 * have researched admission-rate data, per lib/ai/eval/cost-estimate.ts's own "report a
 * range with stated assumptions" standard. counselor_explain never had this problem:
 * buildCounselorExplainPrompt below calls the real, exported buildCounselorExplanationPrompt
 * directly, and runCounselorExplain calls explainCounselorRecommendations itself — there is
 * nothing to drift.
 *
 * A second, different weekly_plan gap was found and closed the same day (CEO's ruling,
 * following up on the time-budget guardrail package): the prompt was faithfully
 * reconstructed, but runWeeklyPlan below used to score the model's *raw* structured output
 * — generateWeeklyPlan's own two deterministic post-processing passes
 * (resolvePlanSelfContradiction, enforceTimeBudget) were never applied, so every eval run
 * to date graded a plan no real student ever actually received. Both passes are pure and
 * exported specifically so this harness can call them without a database, the same
 * reasoning as buildWeeklyPlanInstruction above. See runWeeklyPlan's own comment for what
 * changed and docs/eval-runs/README.md for what this means for runs recorded before the fix.
 *
 * Never calls getAIProvider() itself — `provider` always comes from the caller, so a test
 * passes a MockAIProvider and the gated CLI script (scripts/run-ai-eval.ts, the only place
 * in this package allowed to construct a real one) passes the real thing. This file cannot
 * spend model credit on its own; something else always has to hand it a live provider.
 *
 * The three `build*Prompt` functions below are pure (no provider, no network) and exported
 * so cost-estimate.ts can measure a real prompt's size instead of guessing at one — the
 * `run*` functions immediately below them are the only things that actually call the
 * provider, and they do so with exactly what the builder returned.
 */

const FIXTURE_USER_ID = "00000000-0000-0000-0000-0000000000ee";

function contextFor(fixtureId: string) {
  return fixtureId === "regression" ? REGRESSION_CONTEXT : BASELINE_CONTEXT;
}
function counselorResultFor(fixtureId: string) {
  return fixtureId === "regression" ? REGRESSION_COUNSELOR_RESULT : BASELINE_COUNSELOR_RESULT;
}
/** Every dimension's display label, so the leak check can tell whose score a number is
 * when one sentence names two dimensions. Derived from the product's own `dimensionLabel`
 * rather than a second hand-written list -- a tenth dimension must not silently go
 * unlisted here. */
function allDimensionLabels(locale: "en" | "tr"): readonly string[] {
  return DIMENSION_ORDER.map((dimension) => dimensionLabel(dimension, locale));
}
function unassessedLabelsFor(fixtureId: string, locale: "en" | "tr") {
  if (fixtureId !== "regression") return [];
  return locale === "tr" ? REGRESSION_UNASSESSED_LABELS_TR : REGRESSION_UNASSESSED_LABELS_EN;
}
function localizedContext(fixtureId: string, locale: "en" | "tr") {
  const context = contextFor(fixtureId);
  return { ...context, student: { ...context.student, preferredLanguage: locale } };
}

export function buildAdvisorChatPrompt(evalCase: EvalCase): { system: string; prompt: string; maxTokens: number } {
  const opportunityContext = formatOpportunityContext(counselorResultFor(evalCase.fixture.id).recommendations);
  const system = withOutputLanguage(
    `${ADVISOR_SYSTEM_PROMPT}\n\nCurrent student context:\n${formatContextForPrompt(localizedContext(evalCase.fixture.id, evalCase.locale), evalCase.locale)}${opportunityContext}`,
    evalCase.locale,
  );
  const prompt = evalCase.fixture.id === "regression" ? REGRESSION_CHAT_QUESTION : BASELINE_CHAT_QUESTION;
  return { system, prompt, maxTokens: 8192 };
}

export function buildWeeklyPlanPrompt(evalCase: EvalCase): { system: string; prompt: string; maxTokens: number } {
  const grounding = formatCounselorGrounding(counselorResultFor(evalCase.fixture.id).recommendations, evalCase.locale);
  const system = withOutputLanguage(ADVISOR_SYSTEM_PROMPT, evalCase.locale);
  const prompt = `Here is the student's current context:\n\n${formatContextForPrompt(localizedContext(evalCase.fixture.id, evalCase.locale), evalCase.locale)}${grounding}\n\n${buildWeeklyPlanInstruction()}`;
  return { system, prompt, maxTokens: 2048 };
}

export function buildCounselorExplainPrompt(evalCase: EvalCase): { system: string; prompt: string; maxTokens: number } {
  const system = withOutputLanguage(COUNSELOR_EXPLANATION_SYSTEM_PROMPT, evalCase.locale);
  const prompt = buildCounselorExplanationPrompt(counselorResultFor(evalCase.fixture.id), evalCase.locale);
  return { system, prompt, maxTokens: 1024 };
}

async function runAdvisorChat(provider: AIProvider, evalCase: EvalCase) {
  const built = buildAdvisorChatPrompt(evalCase);
  const result = await provider.generateText(built);
  return { text: result.text, usage: result.usage, postProcessingChanged: undefined as boolean | undefined };
}

/**
 * Runs the SAME two deterministic post-processing passes generateWeeklyPlan itself applies
 * (its own final two lines) — CEO's ruling, 2026-09-02: the eval measures student-visible
 * quality, and student-visible means post-processing included, not the model's raw
 * structured output. Both passes are pure and exported specifically so this harness can
 * call them without a database (same reasoning as buildWeeklyPlanInstruction's own
 * extraction) — this is not a second, hand-copied implementation, it is the real one.
 *
 * `changed` is computed by reference equality, not a deep diff: both
 * resolvePlanSelfContradiction and enforceTimeBudget already return the exact same object
 * back when they make no change, and a new one only when they actually altered something —
 * true by construction from how each is written (see either function's own early returns),
 * not an assumption this file makes independently. Free (no extra model call), and answers
 * CEO's counter-argument about post-processing masking a prompt regression: if this starts
 * turning true often across a run, the raw model is drifting even though the graded output
 * still looks fine.
 */
function applyWeeklyPlanPostProcessing(raw: WeeklyPlanGeneration, evalCase: EvalCase): { plan: WeeklyPlanGeneration; changed: boolean } {
  const recommendedTitles = counselorRecommendedTitles(counselorResultFor(evalCase.fixture.id).recommendations);
  const resolved = resolvePlanSelfContradiction(raw, recommendedTitles);
  const weeklyTimeBudget = localizedContext(evalCase.fixture.id, evalCase.locale).student.weeklyTimeBudget;
  const plan = enforceTimeBudget(resolved, weeklyTimeBudget);
  return { plan, changed: resolved !== raw || plan !== resolved };
}

async function runWeeklyPlan(provider: AIProvider, evalCase: EvalCase) {
  const built = buildWeeklyPlanPrompt(evalCase);
  const result = await provider.generateStructured<WeeklyPlanGeneration>({
    ...built,
    schema: WeeklyPlanSchema,
    schemaName: "record_weekly_plan",
    schemaDescription: "Records this week's prioritized action plan for the student.",
  });
  const { plan, changed } = applyWeeklyPlanPostProcessing(result.data, evalCase);
  const text = [plan.summary, ...plan.actions.map((a) => `${a.title}: ${a.reason}`), plan.avoidForNow ? `Avoid for now — ${plan.avoidForNow.activity}: ${plan.avoidForNow.reason}` : null]
    .filter((line): line is string => line !== null)
    .join("\n");
  return { text, usage: result.usage, postProcessingChanged: changed };
}

async function runCounselorExplain(provider: AIProvider, evalCase: EvalCase) {
  const result = counselorResultFor(evalCase.fixture.id);
  const explanation = await explainCounselorRecommendations(FIXTURE_USER_ID, result, provider, evalCase.locale);
  if (!explanation) return { text: "", usage: { inputTokens: 0, outputTokens: 0 }, postProcessingChanged: undefined as boolean | undefined };
  const text = [explanation.summary, ...explanation.perRecommendation.map((p) => p.narrative)].join("\n");
  // explainCounselorRecommendations returns CounselorExplanation | null, not usage (it logs
  // usage internally via logAIUsage, which needs a real userId to succeed against a real
  // database) — this harness has no way to observe this target's actual per-case token
  // spend without changing that function's return type, which is out of this package's
  // scope. cost-estimate.ts's separate size measurement (via buildCounselorExplainPrompt
  // above) is where this target's cost projection actually comes from.
  return { text, usage: { inputTokens: 0, outputTokens: 0 }, postProcessingChanged: undefined as boolean | undefined };
}

export async function runEvalCase(provider: AIProvider, evalCase: EvalCase, options: { includeJudge: boolean }): Promise<EvalCaseResult> {
  // All three runners share a return shape (postProcessingChanged included) — only
  // runWeeklyPlan ever sets it to a real boolean; advisor_chat/counselor_explain leave it
  // undefined, matching EvalCaseResult.postProcessingChanged's own "doesn't apply" note.
  const { text, usage: targetUsage, postProcessingChanged } = await (evalCase.target === "advisor_chat"
    ? runAdvisorChat(provider, evalCase)
    : evalCase.target === "weekly_plan"
      ? runWeeklyPlan(provider, evalCase)
      : runCounselorExplain(provider, evalCase));

  const deterministicFindings = runDeterministicChecks(text, unassessedLabelsFor(evalCase.fixture.id, evalCase.locale), allDimensionLabels(evalCase.locale));

  let judge = null;
  let judgeUsage = { inputTokens: 0, outputTokens: 0 };
  if (options.includeJudge) {
    const judgeResult = await provider.generateStructured({
      system: JUDGE_SYSTEM_PROMPT,
      prompt: buildJudgePrompt(evalCase.fixture, text),
      schema: JudgeVerdictSchema,
      schemaName: "record_eval_verdict",
      schemaDescription: "Records the rubric scores and discourage verdict for one graded reply.",
      maxTokens: JUDGE_MAX_TOKENS,
    });
    judge = judgeResult.data;
    judgeUsage = judgeResult.usage;
  }

  return { case: evalCase, responseText: text, deterministicFindings, judge, targetUsage, judgeUsage, postProcessingChanged };
}

/**
 * Runs every case, and **never lets one failure destroy the run.**
 *
 * Before 2026-09-02 this loop was a bare `results.push(await runEvalCase(...))`. A live run
 * threw on a weekly_plan case — the model omitted a required field twice, which
 * anthropic-provider.ts's own retry comment documents as a known, pre-existing model
 * behaviour — and the exception took the whole report with it: every case that had already
 * succeeded, every judge score already paid for, and the usage total. Roughly $0.20-0.30 of
 * real spend produced nothing, and the operator could not even say how much precisely,
 * because the totals are computed at the end.
 *
 * A failing case is now data. The run continues, the report carries what succeeded, and the
 * caller decides whether a partial report is worth reading — which it usually is, since the
 * expensive part already happened.
 */
export async function runEval(provider: AIProvider, cases: readonly EvalCase[], options: { includeJudge: boolean }): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];
  const failures: EvalCaseFailure[] = [];
  for (const evalCase of cases) {
    try {
      results.push(await runEvalCase(provider, evalCase, options));
    } catch (error) {
      failures.push({ case: evalCase, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const totalUsage = results.reduce(
    (sum, r) => ({
      inputTokens: sum.inputTokens + r.targetUsage.inputTokens + r.judgeUsage.inputTokens,
      outputTokens: sum.outputTokens + r.targetUsage.outputTokens + r.judgeUsage.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 },
  );
  return {
    results,
    failures,
    deterministicFailureCount: results.filter((r) => r.deterministicFindings.length > 0).length,
    postProcessingInterventionCount: results.filter((r) => r.postProcessingChanged === true).length,
    totalUsage,
  };
}
