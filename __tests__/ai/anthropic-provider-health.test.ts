import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Confirms AnthropicProvider actually calls recordProviderSuccess/recordProviderFailure —
 * the gap CEO's provider-health package exists to close. Before this pass, `provider_health`
 * held exactly one row (openalex) despite Anthropic being the provider the whole product
 * depends on; live-confirmed against oryn-qa-scratch, 2026-09-01. Same SDK-mocking pattern
 * as __tests__/ai/anthropic-provider-thinking.test.ts (no live model call, ever).
 */

const { createMock, recordSuccessMock, recordFailureMock, reportErrorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  recordSuccessMock: vi.fn().mockResolvedValue(undefined),
  recordFailureMock: vi.fn().mockResolvedValue(undefined),
  reportErrorMock: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/monitoring", () => ({
  reportError: reportErrorMock,
}));

import { AnthropicProvider } from "@/lib/ai/anthropic-provider";
import { z } from "zod";

function textMessageFixture(text: string) {
  return { content: [{ type: "text", text }], stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 } };
}

const TestSchema = z.object({ value: z.string() });

/** A prompt and an uploaded document that must never reach `reportError`'s arguments. */
const SENSITIVE_REQUEST = {
  prompt: "Extract achievements from this CV: SECRET_STUDENT_NAME, attends SECRET_SCHOOL",
  documents: [{ mediaType: "text/plain" as const, data: "SECRET_CV_BODY_TEXT" }],
};

function assertNoSensitiveContentReported() {
  for (const call of reportErrorMock.mock.calls) {
    const serialized = JSON.stringify(call);
    expect(serialized).not.toContain("SECRET_STUDENT_NAME");
    expect(serialized).not.toContain("SECRET_SCHOOL");
    expect(serialized).not.toContain("SECRET_CV_BODY_TEXT");
  }
}

beforeEach(() => {
  createMock.mockReset();
  recordSuccessMock.mockClear();
  recordFailureMock.mockClear();
  reportErrorMock.mockClear();
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

  test("a success on the second (retried) attempt records success, not failure", async () => {
    createMock.mockResolvedValueOnce(toolMessageFixture({ wrong_field: "nope" })).mockResolvedValueOnce(toolMessageFixture({ value: "corrected" }));

    const result = await new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" });

    expect(result.data).toEqual({ value: "corrected" });
    expect(recordSuccessMock).toHaveBeenCalledWith("anthropic");
    expect(recordFailureMock).not.toHaveBeenCalled();
  });
});

describe("reportError — monitoring alongside provider_health, never with request content", () => {
  test("generateText: a transport failure reports once, tagged, with no prompt/document content", async () => {
    createMock.mockRejectedValue(new Error("connect ECONNREFUSED"));

    await expect(new AnthropicProvider().generateText(SENSITIVE_REQUEST)).rejects.toThrow();

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    const [errorArg, context] = reportErrorMock.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe("connect ECONNREFUSED");
    expect(context.tags).toEqual({ provider: "anthropic", model: "claude-sonnet-5", failure_mode: "transport" });
    assertNoSensitiveContentReported();
  });

  test("generateText: an incomplete response (no text block) reports once, tagged", async () => {
    createMock.mockResolvedValue({ content: [{ type: "thinking", thinking: "..." }], stop_reason: "max_tokens", usage: { input_tokens: 100, output_tokens: 1024 } });

    await expect(new AnthropicProvider().generateText(SENSITIVE_REQUEST)).rejects.toThrow();

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock.mock.calls[0][1].tags).toMatchObject({ failure_mode: "incomplete_response", stop_reason: "max_tokens" });
    assertNoSensitiveContentReported();
  });

  test("generateText: a clean success never calls reportError", async () => {
    createMock.mockResolvedValue(textMessageFixture("A clean reply."));
    await new AnthropicProvider().generateText({ prompt: "hi" });
    expect(reportErrorMock).not.toHaveBeenCalled();
  });

  test("generateStructured: a transport failure reports once, tagged with the schema name, no request content", async () => {
    createMock.mockRejectedValue(new Error("rate limited"));

    await expect(
      new AnthropicProvider().generateStructured({ ...SENSITIVE_REQUEST, schema: TestSchema, schemaName: "extract_cv", schemaDescription: "test" }),
    ).rejects.toThrow();

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    expect(reportErrorMock.mock.calls[0][1].tags).toEqual({ provider: "anthropic", model: "claude-sonnet-5", failure_mode: "transport", schema: "extract_cv" });
    assertNoSensitiveContentReported();
  });

  function toolMessageFixture(input: unknown) {
    return { content: [{ type: "tool_use", input }], stop_reason: "tool_use", usage: { input_tokens: 100, output_tokens: 30 } };
  }

  test("generateStructured: a schema-validation failure after retry reports once (not twice), with a Zod issue summary — never the model's actual field values", async () => {
    createMock.mockResolvedValue(toolMessageFixture({ wrong_field: "SECRET_STUDENT_NAME leaked into a field value" }));

    await expect(
      new AnthropicProvider().generateStructured({ ...SENSITIVE_REQUEST, schema: TestSchema, schemaName: "extract_cv", schemaDescription: "test" }),
    ).rejects.toThrow();

    expect(reportErrorMock).toHaveBeenCalledTimes(1);
    const [errorArg] = reportErrorMock.mock.calls[0];
    // The Zod issue path/message ("value: Required") is fine to report; a value the model
    // actually produced is not — this is the one case where a leak could plausibly come
    // from the model's own output rather than the request, so it gets its own assertion.
    expect(errorArg.message).not.toContain("SECRET_STUDENT_NAME leaked into a field value");
    assertNoSensitiveContentReported();
  });

  test("generateStructured: a clean success never calls reportError", async () => {
    createMock.mockResolvedValue(toolMessageFixture({ value: "ok" }));
    await new AnthropicProvider().generateStructured({ prompt: "hi", schema: TestSchema, schemaName: "record_test", schemaDescription: "test" });
    expect(reportErrorMock).not.toHaveBeenCalled();
  });
});
