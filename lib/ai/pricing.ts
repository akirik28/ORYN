/**
 * Per-token pricing for cost estimation (Phase 27's `ai_usage.estimated_cost`, previously
 * unpopulated — see F6 in docs/handoffs/gate1-first-counselor-artifact-2026-08-23.md).
 * Standard (non-introductory) per-token USD rates, per million tokens. Deliberately not
 * the temporary intro discount some models carry at launch: a cost *gate* should round up,
 * not silently under-report once an introductory window ends and nobody remembers to
 * bump this file.
 */
const PRICE_PER_MILLION_TOKENS_USD: Record<string, { input: number; output: number }> = {
  "claude-fable-5": { input: 10, output: 50 },
  "claude-mythos-5": { input: 10, output: 50 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

/**
 * Returns the estimated cost in USD, or null when the model isn't in the pricing table
 * (an unrecognized/future model string) -- callers should store null rather than a
 * fabricated number in that case, matching `estimated_cost`'s nullable column.
 */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const rates = PRICE_PER_MILLION_TOKENS_USD[model];
  if (!rates) return null;
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}
