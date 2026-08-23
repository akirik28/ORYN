import { describe, expect, test } from "vitest";
import { estimateCostUsd } from "@/lib/ai/pricing";

describe("estimateCostUsd", () => {
  test("computes cost from input/output tokens at the model's per-million rate", () => {
    // claude-sonnet-5: $3/1M input, $15/1M output
    expect(estimateCostUsd("claude-sonnet-5", 1_000_000, 0)).toBe(3);
    expect(estimateCostUsd("claude-sonnet-5", 0, 1_000_000)).toBe(15);
    expect(estimateCostUsd("claude-sonnet-5", 1743, 1024)).toBeCloseTo(1743 * 3e-6 + 1024 * 15e-6, 10);
  });

  test("zero tokens costs zero", () => {
    expect(estimateCostUsd("claude-sonnet-5", 0, 0)).toBe(0);
  });

  test("different models have different rates", () => {
    const sonnetCost = estimateCostUsd("claude-sonnet-5", 1_000_000, 1_000_000);
    const opusCost = estimateCostUsd("claude-opus-5", 1_000_000, 1_000_000);
    const haikuCost = estimateCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(haikuCost).toBeLessThan(sonnetCost!);
    expect(sonnetCost).toBeLessThan(opusCost!);
  });

  test("unrecognized model returns null rather than a fabricated number", () => {
    expect(estimateCostUsd("some-future-model-nobody-added-yet", 1000, 1000)).toBeNull();
  });
});
