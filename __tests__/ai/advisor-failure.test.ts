import { describe, expect, test } from "vitest";
import { classifyAdvisorFailure } from "@/lib/ai/advisor-failure";
import { AIProviderNotConfiguredError, AIResponseIncompleteError } from "@/lib/ai/provider";

describe("classifyAdvisorFailure", () => {
  test("maps AIProviderNotConfiguredError to the existing setup-guidance message", () => {
    const result = classifyAdvisorFailure(new AIProviderNotConfiguredError());
    expect(result.errorMessage).toMatch(/API_SETUP\.md/);
  });

  test("(b) maps a budget-exhausted response to its own actionable message, not the generic one", () => {
    const result = classifyAdvisorFailure(
      new AIResponseIncompleteError({ stopReason: "max_tokens", usage: { inputTokens: 1800, outputTokens: 1024 } }),
    );

    // The SEV-1 symptom was this case being indistinguishable from an unknown failure.
    expect(result.errorMessage).not.toBe("Something went wrong. Please try again.");
    expect(result.status).toBe("failed");
    // Still safe: no provider internals, no stop_reason jargon, no token counts.
    expect(result.errorMessage).not.toMatch(/max_tokens|stop_reason|thinking|1024|Anthropic/i);
  });

  test("maps any other error to a generic, non-leaking retry message", () => {
    const result = classifyAdvisorFailure(new Error("ECONNRESET: socket hang up at 10.0.4.2:443"));
    expect(result.errorMessage).toBe("Something went wrong. Please try again.");
    expect(result.errorMessage).not.toContain("ECONNRESET");
    expect(result.errorMessage).not.toContain("10.0.4.2");
  });

  test("handles a non-Error thrown value without leaking it either", () => {
    const result = classifyAdvisorFailure("raw string throw, not an Error instance");
    expect(result.errorMessage).toBe("Something went wrong. Please try again.");
  });

  test("always returns status 'failed' — this function only classifies failures", () => {
    expect(classifyAdvisorFailure(new Error("x")).status).toBe("failed");
    expect(classifyAdvisorFailure(new AIProviderNotConfiguredError()).status).toBe("failed");
  });
});
