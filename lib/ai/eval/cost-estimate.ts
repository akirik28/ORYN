import { estimateCostUsd } from "@/lib/ai/pricing";
import { env } from "@/lib/env";
import { buildAdvisorChatPrompt, buildWeeklyPlanPrompt, buildCounselorExplainPrompt } from "./harness";
import { JUDGE_SYSTEM_PROMPT, buildJudgePrompt } from "./judge";
import type { EvalCase, EvalTarget } from "./types";

/**
 * A projection, not a measurement — the whole reason this file exists is to answer "what
 * would one full pass cost" without spending anything to find out. Input-token counts come
 * from the *real* prompt strings (via harness.ts's exported builders — the same functions
 * an actual run calls), so that half is as accurate as a chars-per-token approximation
 * allows. Output-token counts cannot be measured this way — nothing produces the model's
 * reply without calling the model — so they're documented assumptions, sourced from the
 * best real data available where it exists, and marked as estimates everywhere it doesn't.
 * Report this as a range with its assumptions stated, not as a single confident number;
 * presenting it as a `~4 chars/token, +/-` uncertainty band without saying so once would be
 * exactly the false-precision Phase 16 rules out for admissions estimates, applied here to
 * a cost projection instead.
 */

/** ~4 characters per token is the standard rough approximation for English BPE tokenizers,
 * and is used here for Turkish too rather than a second constant — Turkish's agglutinative
 * morphology tends to produce somewhat more tokens per character than English at the same
 * text length, so this likely *undercounts* Turkish-locale cases slightly. Documented here
 * rather than corrected for, since a second unverified fudge factor would trade one
 * approximation for a less-legible one without actually being more accurate. */
const CHARS_PER_TOKEN = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Output-token assumptions, one per target, each sourced rather than picked round:
 *
 * - advisorChat: lib/ai/advisor-chat.ts's own maxTokens comment records a real benchmark —
 *   "4096 completed with 1599 thinking tokens" on a rich profile, i.e. thinking + the
 *   visible reply together landed under 2000. This uses 2000 as a deliberately slightly
 *   high round number over that observed point, since adaptive thinking scales with
 *   context and this harness's fixtures are not smaller than that benchmark's profile.
 * - weeklyPlan / counselorExplain: both are schema-bounded structured output (1-3 short
 *   actions; a summary plus one short narrative per recommendation) with no adaptive-
 *   thinking budget line documented anywhere in their source files, so there's no
 *   equivalent benchmark to cite — these are estimates from the schema's own shape (a
 *   handful of one-or-two-sentence string fields), not from an observed run.
 * - judge: the smallest schema in this package (six 1-5 integers, one enum, one short
 *   notes field) — estimate, same reasoning as the two above.
 */
const ASSUMED_OUTPUT_TOKENS: Record<EvalTarget, number> = {
  advisor_chat: 2000,
  weekly_plan: 600,
  counselor_explain: 400,
};
const ASSUMED_JUDGE_OUTPUT_TOKENS = 150;

export interface CostEstimateLine {
  target: EvalTarget;
  locale: string;
  fixtureId: string;
  inputTokens: number;
  assumedOutputTokens: number;
  costUsd: number | null;
}

export interface CostEstimate {
  model: string;
  perCase: CostEstimateLine[];
  /** Same cases, plus one judge call each — the number that answers "what would grading
   * every reply too, not just generating it, cost". */
  perCaseWithJudge: CostEstimateLine[];
  totalTargetOnlyUsd: number | null;
  totalWithJudgeUsd: number | null;
}

function buildForTarget(evalCase: EvalCase): { system: string; prompt: string } {
  if (evalCase.target === "advisor_chat") return buildAdvisorChatPrompt(evalCase);
  if (evalCase.target === "weekly_plan") return buildWeeklyPlanPrompt(evalCase);
  return buildCounselorExplainPrompt(evalCase);
}

export function estimateCost(cases: readonly EvalCase[], model: string = env.anthropic.model): CostEstimate {
  const perCase: CostEstimateLine[] = [];
  const perCaseWithJudge: CostEstimateLine[] = [];

  for (const evalCase of cases) {
    const built = buildForTarget(evalCase);
    const inputTokens = estimateTokens(built.system) + estimateTokens(built.prompt);
    const outputTokens = ASSUMED_OUTPUT_TOKENS[evalCase.target];
    const line: CostEstimateLine = {
      target: evalCase.target,
      locale: evalCase.locale,
      fixtureId: evalCase.fixture.id,
      inputTokens,
      assumedOutputTokens: outputTokens,
      costUsd: estimateCostUsd(model, inputTokens, outputTokens),
    };
    perCase.push(line);

    const judgePrompt = buildJudgePrompt(evalCase.fixture, "x".repeat(outputTokens * CHARS_PER_TOKEN));
    const judgeInputTokens = estimateTokens(JUDGE_SYSTEM_PROMPT) + estimateTokens(judgePrompt);
    const judgeCost = estimateCostUsd(model, judgeInputTokens, ASSUMED_JUDGE_OUTPUT_TOKENS);
    perCaseWithJudge.push({
      ...line,
      costUsd: line.costUsd !== null && judgeCost !== null ? line.costUsd + judgeCost : null,
    });
  }

  const sum = (lines: CostEstimateLine[]): number | null => {
    if (lines.some((l) => l.costUsd === null)) return null;
    return lines.reduce((total, l) => total + (l.costUsd ?? 0), 0);
  };

  return {
    model,
    perCase,
    perCaseWithJudge,
    totalTargetOnlyUsd: sum(perCase),
    totalWithJudgeUsd: sum(perCaseWithJudge),
  };
}
