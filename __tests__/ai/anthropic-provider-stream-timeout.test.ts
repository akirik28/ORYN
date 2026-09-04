import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Proves ADVISOR_STREAM_TIMEOUT_MS and maxRetries: 0 are actually reaching the real SDK
 * call, not just sitting in a constant nobody reads. Same mocked-SDK-client technique as
 * __tests__/ai/anthropic-provider-thinking.test.ts, adapted for .stream() (which returns an
 * event-emitter-shaped object, not a plain promise like .create()) instead of .create().
 *
 * Why maxRetries: 0 matters enough to test on its own, not just alongside timeout: the SDK
 * retries a timed-out request twice by default (its own documented behavior) — omitting this
 * wouldn't make the timeout not-fire, it would make it silently triple the wait and the
 * billed cost instead, the opposite of what adding a timeout was for.
 */

const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", async () => {
  const actual = await vi.importActual<typeof import("@anthropic-ai/sdk")>("@anthropic-ai/sdk");
  return {
    ...actual,
    Anthropic: class {
      messages = { stream: streamMock };
    },
  };
});

vi.mock("@/lib/env", () => ({
  env: { anthropic: { apiKey: "test-key-not-a-real-credential", model: "claude-sonnet-5" } },
}));

import { AnthropicProvider } from "@/lib/ai/anthropic-provider";

function fakeMessageStream(text: string) {
  return {
    on: vi.fn((event: string, cb: (delta: string) => void) => {
      if (event === "text") cb(text);
    }),
    finalMessage: vi.fn().mockResolvedValue({
      content: [{ type: "text", text }],
      stop_reason: "end_turn",
      usage: { input_tokens: 100, output_tokens: 20 },
    }),
  };
}

beforeEach(() => {
  streamMock.mockReset();
});

describe("AnthropicProvider.generateTextStream — the stall-timeout reaches the real call", () => {
  test("passes { timeout: 120000, maxRetries: 0 } as the SDK's own per-request options, not left at defaults", async () => {
    streamMock.mockReturnValue(fakeMessageStream("A reply."));
    const provider = new AnthropicProvider();

    await provider.generateTextStream({ system: "s", prompt: "p", maxTokens: 4096 }, () => {});

    expect(streamMock).toHaveBeenCalledTimes(1);
    const [, options] = streamMock.mock.calls[0];
    expect(options).toEqual({ timeout: 120_000, maxRetries: 0 });
  });

  test("the request body (model/system/messages) is unaffected — timeout is additive, not a replacement for the real params", async () => {
    streamMock.mockReturnValue(fakeMessageStream("A reply."));
    const provider = new AnthropicProvider();

    await provider.generateTextStream({ system: "You are the advisor.", prompt: "What next?", maxTokens: 4096 }, () => {});

    const [params] = streamMock.mock.calls[0];
    expect(params).toMatchObject({ system: "You are the advisor.", max_tokens: 4096 });
    expect(params.messages).toEqual([{ role: "user", content: "What next?" }]);
  });
});
