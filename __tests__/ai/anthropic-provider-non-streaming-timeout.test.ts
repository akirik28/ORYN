import { beforeEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

/**
 * Proves NON_STREAMING_TIMEOUT_MS and maxRetries: 0 actually reach the real SDK call for
 * generateText and generateStructured — the 2026-09-04 audit found these two methods passed
 * no RequestOptions at all (unlike generateTextStream, fixed the same day for the same
 * reason), so every caller ran on the SDK's own defaults: timeout 600_000ms, maxRetries 2.
 * Same mocked-SDK-client technique as anthropic-provider-stream-timeout.test.ts, adapted for
 * .create() (a plain resolved promise) instead of .stream().
 *
 * generateStructured gets its own retry-attempt test because the options are applied inside
 * its schema-validation retry loop (up to 2 real .create() calls per logical request) — proving
 * it on attempt 1 alone wouldn't show whether attempt 2 quietly fell back to the SDK defaults.
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

const OkSchema = z.object({ ok: z.boolean() });

function textMessageFixture(text: string) {
  return {
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 20 },
  };
}

function toolUseMessageFixture(input: unknown) {
  return {
    content: [{ type: "tool_use", name: "OkSchema", input }],
    stop_reason: "tool_use",
    usage: { input_tokens: 100, output_tokens: 20 },
  };
}

beforeEach(() => {
  createMock.mockReset();
});

describe("AnthropicProvider.generateText — the same stall/retry protection as streaming", () => {
  test("passes { timeout: 120000, maxRetries: 0 } as the SDK's own per-request options", async () => {
    createMock.mockResolvedValue(textMessageFixture("A reply."));
    const provider = new AnthropicProvider();

    await provider.generateText({ system: "s", prompt: "p", maxTokens: 4096 });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [, options] = createMock.mock.calls[0];
    expect(options).toEqual({ timeout: 120_000, maxRetries: 0 });
  });

  test("the request body is unaffected — timeout is additive, not a replacement for the real params", async () => {
    createMock.mockResolvedValue(textMessageFixture("A reply."));
    const provider = new AnthropicProvider();

    await provider.generateText({ system: "You are the advisor.", prompt: "What next?", maxTokens: 4096 });

    const [params] = createMock.mock.calls[0];
    expect(params).toMatchObject({ system: "You are the advisor.", max_tokens: 4096 });
    expect(params.messages).toEqual([{ role: "user", content: "What next?" }]);
  });
});

describe("AnthropicProvider.generateStructured — the same protection on both retry attempts", () => {
  test("attempt 1 passes { timeout: 120000, maxRetries: 0 }", async () => {
    createMock.mockResolvedValue(toolUseMessageFixture({ ok: true }));
    const provider = new AnthropicProvider();

    await provider.generateStructured({
      system: "s",
      prompt: "p",
      maxTokens: 512,
      schema: OkSchema,
      schemaName: "OkSchema",
      schemaDescription: "test",
    });

    expect(createMock).toHaveBeenCalledTimes(1);
    const [, options] = createMock.mock.calls[0];
    expect(options).toEqual({ timeout: 120_000, maxRetries: 0 });
  });

  test("attempt 2 (schema-validation retry) also passes { timeout: 120000, maxRetries: 0 } — not silently left on SDK defaults", async () => {
    // First attempt returns a shape that fails Zod validation (missing "ok"), forcing the
    // real retry-with-correction path; second attempt returns a valid shape.
    createMock.mockResolvedValueOnce(toolUseMessageFixture({ wrong_field: true })).mockResolvedValueOnce(toolUseMessageFixture({ ok: true }));
    const provider = new AnthropicProvider();

    const result = await provider.generateStructured({
      system: "s",
      prompt: "p",
      maxTokens: 512,
      schema: OkSchema,
      schemaName: "OkSchema",
      schemaDescription: "test",
    });

    expect(result.data).toEqual({ ok: true });
    expect(createMock).toHaveBeenCalledTimes(2);
    const [, firstOptions] = createMock.mock.calls[0];
    const [, secondOptions] = createMock.mock.calls[1];
    expect(firstOptions).toEqual({ timeout: 120_000, maxRetries: 0 });
    expect(secondOptions).toEqual({ timeout: 120_000, maxRetries: 0 });
  });
});
