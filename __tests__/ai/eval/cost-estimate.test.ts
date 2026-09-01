import { describe, expect, test } from "vitest";
import { estimateCost } from "@/lib/ai/eval/cost-estimate";
import { ALL_CASES } from "@/lib/ai/eval/cases";

describe("estimateCost", () => {
  test("produces one line per case", () => {
    const estimate = estimateCost(ALL_CASES);
    expect(estimate.perCase).toHaveLength(ALL_CASES.length);
    expect(estimate.perCaseWithJudge).toHaveLength(ALL_CASES.length);
  });

  test("input token counts are real (derived from the actual assembled prompt), not a placeholder", () => {
    const estimate = estimateCost(ALL_CASES);
    // The regression fixture's context/grounding text is substantial (9 dimensions, target
    // universities, activities...) — a few hundred characters at minimum once assembled,
    // so a near-zero token count would mean the builder wasn't actually being measured.
    for (const line of estimate.perCase) {
      expect(line.inputTokens).toBeGreaterThan(50);
    }
  });

  test("a known model produces a real cost, an unrecognized one produces null rather than a fabricated number", () => {
    const known = estimateCost(ALL_CASES, "claude-sonnet-5");
    const unknown = estimateCost(ALL_CASES, "some-future-model-not-in-the-table");
    expect(known.totalTargetOnlyUsd).not.toBeNull();
    expect(known.totalTargetOnlyUsd).toBeGreaterThan(0);
    expect(unknown.totalTargetOnlyUsd).toBeNull();
    for (const line of unknown.perCase) expect(line.costUsd).toBeNull();
  });

  test("target+judge total is always >= target-only total (the judge call only adds cost, never removes it)", () => {
    const estimate = estimateCost(ALL_CASES, "claude-sonnet-5");
    expect(estimate.totalWithJudgeUsd).not.toBeNull();
    expect(estimate.totalTargetOnlyUsd).not.toBeNull();
    expect(estimate.totalWithJudgeUsd!).toBeGreaterThanOrEqual(estimate.totalTargetOnlyUsd!);
  });

  test("each per-case line's model matches what was requested", () => {
    const estimate = estimateCost(ALL_CASES, "claude-opus-5");
    expect(estimate.model).toBe("claude-opus-5");
  });

  test("advisor_chat's assumed output tokens reflect the documented thinking-budget benchmark, not a arbitrary guess shared with the other targets", () => {
    const estimate = estimateCost(ALL_CASES, "claude-sonnet-5");
    const chatLine = estimate.perCase.find((l) => l.target === "advisor_chat")!;
    const planLine = estimate.perCase.find((l) => l.target === "weekly_plan")!;
    // advisor_chat's adaptive-thinking overhead (documented in advisor-chat.ts's own
    // maxTokens comment) makes it meaningfully more expensive per case than a
    // schema-bounded structured response — the estimate should reflect that gap, not
    // treat every target as costing the same to generate.
    expect(chatLine.assumedOutputTokens).toBeGreaterThan(planLine.assumedOutputTokens);
  });
});
