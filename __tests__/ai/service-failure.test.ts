import { describe, expect, test } from "vitest";
import { aiServiceFailureMessage } from "@/lib/ai/service-failure";

/**
 * The shared half of the "please try again" fix. Every AI-backed entry point used that
 * wording as its fallback, so a spent balance told the student to repeat an action that
 * could not succeed. This is the function that separates the two cases; the callers own
 * only the noun.
 */
describe("aiServiceFailureMessage", () => {
  const apiError = (status: number) => Object.assign(new Error("upstream said no"), { status });

  test("429 and 5xx invite a later retry", () => {
    for (const status of [429, 500, 503, 529]) {
      expect(aiServiceFailureMessage(apiError(status)), `status ${status}`).toBe("The counselor is busy right now. Try again in a few minutes.");
    }
  });

  test("400/401/403 say it is not the student's fault, and never ask for a retry", () => {
    for (const status of [400, 401, 403]) {
      const message = aiServiceFailureMessage(apiError(status))!;
      expect(message, `status ${status}`).toContain("isn't something you did");
      expect(message, `status ${status}`).not.toMatch(/try again/i);
    }
  });

  test("the subject is the caller's to name", () => {
    expect(aiServiceFailureMessage(apiError(429), "Your plan generator")).toBe("Your plan generator is busy right now. Try again in a few minutes.");
  });

  test("returns null when there is nothing to classify, so the caller's own wording stands", () => {
    expect(aiServiceFailureMessage(new Error("socket hang up"))).toBeNull();
    expect(aiServiceFailureMessage({ status: "429" })).toBeNull(); // a string status is not a status
    expect(aiServiceFailureMessage(null)).toBeNull();
    expect(aiServiceFailureMessage(apiError(404))).toBeNull(); // not a case we can speak to
  });

  test("no provider name, model, status code, or upstream text reaches the student", () => {
    for (const status of [400, 429, 500]) {
      expect(aiServiceFailureMessage(apiError(status))).not.toMatch(/anthropic|claude|upstream said no|\b\d{3}\b/i);
    }
  });
});
