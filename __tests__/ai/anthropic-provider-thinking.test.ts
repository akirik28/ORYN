import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Regression tests for the extended-thinking / max_tokens interaction that broke the
 * advisor (SEV-1, 2026-08-23).
 *
 * `claude-sonnet-5` (lib/env.ts's default ANTHROPIC_MODEL) runs adaptive thinking whenever
 * the request omits a `thinking` parameter — which every call in this repo does. Thinking
 * tokens are drawn from the same `max_tokens` budget as the visible answer, so on a rich
 * student profile the thinking alone could exhaust a small budget and the response came
 * back as `stop_reason: "max_tokens"` with `content: [thinking]` and no text block at all.
 *
 * These tests drive AnthropicProvider against a mocked SDK client — no live model call
 * (a failing live call costs real money against the ai_usage spend gates).
 */

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  Anthropic: class {
    messages = { create: createMock };
  },
}));

vi.mock("@/lib/env", () => ({
  env: { anthropic: { apiKey: "test-key-not-a-real-credential", model: "claude-sonnet-5" } },
}));

import { AnthropicProvider } from "@/lib/ai/anthropic-provider";
import { AIResponseIncompleteError } from "@/lib/ai/provider";

/** Shape of a real Messages API response, trimmed to the fields the provider reads. */
function messageFixture(params: {
  content: Array<{ type: string; text?: string; thinking?: string }>;
  stopReason: string;
  outputTokens: number;
}) {
  return {
    content: params.content,
    stop_reason: params.stopReason,
    usage: { input_tokens: 1800, output_tokens: params.outputTokens },
  };
}

beforeEach(() => {
  createMock.mockReset();
});

describe("AnthropicProvider.generateText — thinking blocks", () => {
  test("(a) returns the text when the response carries a thinking block before the text block", async () => {
    // The 4096-token benchmark run: stop_reason end_turn, 1599 thinking tokens, text complete.
    createMock.mockResolvedValue(
      messageFixture({
        content: [
          { type: "thinking", thinking: "Weighing research gap against leadership strength..." },
          { type: "text", text: "Research is the clearer gap. Finish the economics dataset first." },
        ],
        stopReason: "end_turn",
        outputTokens: 1904,
      }),
    );

    const result = await new AnthropicProvider().generateText({ prompt: "What should I do next?" });

    expect(result.text).toBe("Research is the clearer gap. Finish the economics dataset first.");
    expect(result.usage).toEqual({ inputTokens: 1800, outputTokens: 1904 });
  });

  test("(b) a thinking-only response stopped at max_tokens throws a typed, distinguishable error — not a bare generic one", async () => {
    // The shipped 1024-token case: thinking consumed the whole budget, no text block emitted.
    createMock.mockResolvedValue(
      messageFixture({
        content: [{ type: "thinking", thinking: "Considering the full profile..." }],
        stopReason: "max_tokens",
        outputTokens: 1024,
      }),
    );

    const error = await new AnthropicProvider()
      .generateText({ prompt: "What should I do next?" })
      .then(() => null)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AIResponseIncompleteError);
    const incomplete = error as AIResponseIncompleteError;

    // The caller must be able to tell "budget exhausted" apart from a transport/API failure.
    expect(incomplete.stopReason).toBe("max_tokens");
    // ...and the tokens the failed turn actually burned must survive on the error, so the
    // caller can still record them (they are billed whether or not any text came back).
    expect(incomplete.usage).toEqual({ inputTokens: 1800, outputTokens: 1024 });
  });

  test("(b) a no-text response that stopped for some other reason is still typed, carrying that stop reason", async () => {
    createMock.mockResolvedValue(
      messageFixture({ content: [], stopReason: "end_turn", outputTokens: 3 }),
    );

    const error = await new AnthropicProvider()
      .generateText({ prompt: "hello" })
      .then(() => null)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AIResponseIncompleteError);
    expect((error as AIResponseIncompleteError).stopReason).toBe("end_turn");
  });

  test("the error message never echoes the student's prompt or the model's reasoning", async () => {
    createMock.mockResolvedValue(
      messageFixture({
        content: [{ type: "thinking", thinking: "SECRET-REASONING-CONTENT" }],
        stopReason: "max_tokens",
        outputTokens: 1024,
      }),
    );

    const error = await new AnthropicProvider()
      .generateText({ prompt: "PRIVATE-STUDENT-QUESTION" })
      .then(() => null)
      .catch((caught: unknown) => caught);

    const text = String((error as Error).message);
    expect(text).not.toContain("SECRET-REASONING-CONTENT");
    expect(text).not.toContain("PRIVATE-STUDENT-QUESTION");
  });
});
