import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Confirms AnthropicProvider actually calls recordProviderSuccess/recordProviderFailure —
 * the gap CEO's provider-health package exists to close. Before this pass, `provider_health`
 * held exactly one row (openalex) despite Anthropic being the provider the whole product
 * depends on; live-confirmed against oryn-qa-scratch, 2026-09-01. Same SDK-mocking pattern
 * as __tests__/ai/anthropic-provider-thinking.test.ts (no live model call, ever).
 */

const { createMock, recordSuccessMock, recordFailureMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  recordSuccessMock: vi.fn().mockResolvedValue(undefined),
  recordFailureMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  Anthropic: class {
    messages = { create: createMock };
  },
}));

vi.mock("@/lib/env", () => ({
  env: { anthropic: { apiKey: "test-key-not-a-real-credential", model: "claude-sonnet-5" } },
}));

vi.mock("@/lib/providers/health", () => ({
  recordProviderSuccess: recordSuccessMock,
  recordProviderFailure: recordFailureMock,
}));

import { AnthropicProvider } from "@/lib/ai/anthropic-provider";
import { AIStructuredResponseFailedError } from "@/lib/ai/provider";
import { z } from "zod";

function textMessageFixture(text: string) {
  return { content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } };
}

const TestSchema = z.object({ value: z.string() });

beforeEach(() => {
  createMock.mockReset();
  recordSuccessMock.mockClear();
  recordFailureMock.mockClear();
});

describe("generateText — provider_health recording", () => {
  test("records a success on a clean response", async () => {
    createMock.mockResolvedValue(textMessageFixture("A clean reply."));
    await new AnthropicProvider().generateText({ prompt: "hi" });

    expect(recordSuccessMock).toHaveBeenCalledWith("anthropic");
    expect(recordFailureMock).not.toHaveBeenCalled();
  });

  test("records a failure — not a success — when the SDK call itself throws", async () => {
    createMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(new AnthropicProvider().generateText({ prompt: "hi" })).rejects.toThrow("connect ECONNREFUSED");

    expect(recordFailureMock).toHaveBeenCalledWith("anthropic", "connect ECONNREFUSED");
    expect(recordSuccessMock).not.toHaveBeenCalled();
  });

  test("records a failure when the response has no usable text block (the SEV-1 shape)", async () => {
    createMock.mockResolvedValue({ content: [{ type: "thinking", thinking: "..." }], stop_reason: "max_tokens", usage: { input_tokens: 100, output_tokens: 1024 } });

    await expect(new AnthropicProvider().generateText({ prompt: "hi" })).rejects.toThrow();

    expect(recordFailureMock).toHaveBeenCalledTimes(1);
    expect(recordFailureMock.mock.calls[0][0]).toBe("anthropic");
    expect(recordSuccessMock).not.toHaveBeenCalled();
  });

  test("the original error still propagates to the caller — health recording never swallows it", async () => {
    createMock.mockRejectedValue(new Error("original SDK error"));
    await expect(new AnthropicProvider().generateText({ prompt: "hi" })).rejects.toThrow("original SDK error");
  });
});

describe("generateStructured — provider_health recording", () => {
  function toolMessageFixture(input: unknown) {
    return { content: [{ type: "tool_use", input }], stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 30 } };
  }

  test("records a success when the schema validates on the first attempt", async () => {
    createMock.mockResolvedValue(toolMessageFixture({ value: "ok" }));
    await new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" });

    expect(recordSuccessMock).toHaveBeenCalledWith("anthropic");
    expect(recordFailureMock).not.toHaveBeenCalled();
  });

  test("records exactly one failure — not per-attempt — when the SDK throws on the first attempt (the loop never reaches a second)", async () => {
    createMock.mockRejectedValue(new Error("rate limited"));

    await expect(new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" })).rejects.toThrow("rate limited");

    expect(recordFailureMock).toHaveBeenCalledTimes(1);
    expect(recordFailureMock).toHaveBeenCalledWith("anthropic", "rate limited");
  });

  test("records exactly one failure after both retry attempts fail schema validation — not two", async () => {
    createMock.mockResolvedValue(toolMessageFixture({ wrong_field: "nope" }));

    await expect(
      new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" }),
    ).rejects.toThrow("failed schema validation after retry");

    expect(createMock).toHaveBeenCalledTimes(2); // both retry attempts genuinely happened
    expect(recordFailureMock).toHaveBeenCalledTimes(1); // but recorded as one logical call, not two
    expect(recordSuccessMock).not.toHaveBeenCalled();
  });

  // Found live, 2026-09-02: cv_extraction and achievement_refinement both call
  // generateStructured directly, only ever logged usage on the success path, and a
  // retry-exhausted failure here carried NO usage at all before this — up to two real,
  // billed calls (the retry's whole point) with no way for any caller to ever recover
  // what was spent. AIResponseIncompleteError already solved this for generateText; this
  // is the same fix for generateStructured's own failure shape.
  test("a retry-exhausted failure carries the real, summed usage of both attempts, not zero", async () => {
    createMock
      .mockResolvedValueOnce({ content: [{ type: "tool_use", input: { wrong_field: "nope" } }], stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 30 } })
      .mockResolvedValueOnce({ content: [{ type: "tool_use", input: { wrong_field: "still nope" } }], stop_reason: "tool_use", usage: { input_tokens: 150, output_tokens: 40 } });

    let caught: unknown;
    try {
      await new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AIStructuredResponseFailedError);
    const error = caught as AIStructuredResponseFailedError;
    // Summed across both attempts (100+150, 30+40) -- not just the last one, and not zero.
    expect(error.usage).toEqual({ inputTokens: 250, outputTokens: 70 });
    expect(error.model).toBe("claude-sonnet-5");
  });

  test("a success on the second (retried) attempt records success, not failure", async () => {
    createMock.mockResolvedValueOnce(toolMessageFixture({ wrong_field: "nope" })).mockResolvedValueOnce(toolMessageFixture({ value: "corrected" }));

    const result = await new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" });

    expect(result.data).toEqual({ value: "corrected" });
    expect(recordSuccessMock).toHaveBeenCalledWith("anthropic");
    expect(recordFailureMock).not.toHaveBeenCalled();
  });
});
