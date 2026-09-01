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
      new AIResponseIncompleteError({ stopReason: "max_tokens", usage: { inputTokens: 1800, outputTokens: 1024 }, model: "claude-sonnet-5" }),
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

/**
 * A student who is told "please try again" retries. If the cause is a spent balance or a bad
 * key, every retry fails identically and the product has taught them the failure is theirs to
 * fix by repeating it. The Anthropic balance on this project is small with auto-reload off, so
 * this is the likely failure, not the exotic one.
 */
describe("service failures are told apart from request failures", () => {
  const apiError = (status: number) => Object.assign(new Error("upstream said no"), { status });

  test("429 and 5xx invite a later retry", () => {
    for (const status of [429, 500, 503, 529]) {
      const { errorMessage } = classifyAdvisorFailure(apiError(status));
      expect(errorMessage, `status ${status}`).toBe("The counselor is busy right now. Try again in a few minutes.");
    }
  });

  test("400/401/403 say it is not the student's fault and do not ask for a retry", () => {
    for (const status of [400, 401, 403]) {
      const { errorMessage } = classifyAdvisorFailure(apiError(status));
      expect(errorMessage, `status ${status}`).toContain("isn't something you did");
      expect(errorMessage, `status ${status}`).not.toMatch(/try again/i);
    }
  });

  test("no provider name, model, or upstream text reaches the student", () => {
    for (const status of [400, 429, 500]) {
      const { errorMessage } = classifyAdvisorFailure(apiError(status));
      expect(errorMessage).not.toMatch(/anthropic|claude|upstream said no|api|token/i);
    }
  });

  test("an error with no status still falls through to the generic message", () => {
    expect(classifyAdvisorFailure(new Error("socket hang up")).errorMessage).toBe("Something went wrong. Please try again.");
  });
});
