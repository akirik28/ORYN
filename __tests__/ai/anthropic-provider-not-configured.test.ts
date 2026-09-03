import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * AnthropicProvider's getClient() — the third `if (!apiKey)` short-circuit fixed 2026-09-03,
 * alongside Tavily and College Scorecard's. Separate file from anthropic-provider-health.test.ts
 * because that file mocks @/lib/env with a fixed, always-present apiKey (module-scope,
 * shared across all its tests) -- exercising the missing-key branch needs vi.stubEnv +
 * vi.resetModules() + a fresh import per test instead, the same env-read gotcha
 * __tests__/jobs/verify-cron-request.test.ts's own header already names.
 *
 * getClient() went from sync to async specifically so it could await
 * recordProviderNotConfigured before throwing -- these tests would have passed even with a
 * fire-and-forget (unawaited) call, since the mock resolves synchronously in a test
 * environment; the real risk that change avoids (a frozen serverless invocation losing an
 * unawaited write) isn't something a unit test can observe, only code review and the
 * existing awaited-recordProviderFailure precedent right next to it in this same file.
 */

const { createMock, recordNotConfiguredMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  recordNotConfiguredMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  Anthropic: class {
    messages = { create: createMock };
  },
}));
vi.mock("@/lib/providers/health", () => ({
  recordProviderSuccess: vi.fn().mockResolvedValue(undefined),
  recordProviderFailure: vi.fn().mockResolvedValue(undefined),
  recordProviderNotConfigured: recordNotConfiguredMock,
}));
vi.mock("@/lib/monitoring", () => ({ reportError: vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  createMock.mockClear();
  recordNotConfiguredMock.mockClear();
});

describe("AnthropicProvider — ANTHROPIC_API_KEY not configured", () => {
  test("generateText records not-configured and throws AIProviderNotConfiguredError, never reaching the SDK", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { AnthropicProvider } = await import("@/lib/ai/anthropic-provider");
    const { AIProviderNotConfiguredError } = await import("@/lib/ai/provider");

    await expect(new AnthropicProvider().generateText({ prompt: "hi" })).rejects.toBeInstanceOf(AIProviderNotConfiguredError);

    expect(recordNotConfiguredMock).toHaveBeenCalledWith("anthropic", "ANTHROPIC_API_KEY is not set.");
    expect(createMock).not.toHaveBeenCalled();
  });

  test("generateStructured records not-configured too, independently of generateText", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { AnthropicProvider } = await import("@/lib/ai/anthropic-provider");
    const { AIProviderNotConfiguredError } = await import("@/lib/ai/provider");
    const { z } = await import("zod");

    await expect(
      new AnthropicProvider().generateStructured({ prompt: "hi", schema: z.object({ value: z.string() }), schemaName: "t", schemaDescription: "t" }),
    ).rejects.toBeInstanceOf(AIProviderNotConfiguredError);

    expect(recordNotConfiguredMock).toHaveBeenCalledWith("anthropic", "ANTHROPIC_API_KEY is not set.");
    expect(createMock).not.toHaveBeenCalled();
  });

  test("a real key present -- never records not-configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "a-real-key");
    createMock.mockResolvedValue({ content: [{ type: "text", text: "ok" }], stop_reason: "end_turn", usage: { input_tokens: 1, output_tokens: 1 } });
    const { AnthropicProvider } = await import("@/lib/ai/anthropic-provider");

    await new AnthropicProvider().generateText({ prompt: "hi" });

    expect(recordNotConfiguredMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
