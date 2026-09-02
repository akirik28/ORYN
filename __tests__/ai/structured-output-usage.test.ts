import { beforeEach, describe, expect, test, vi } from "vitest";
import { AIStructuredResponseFailedError } from "@/lib/ai/provider";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * Cost-observability regression tests for the generateStructured path — the sibling of
 * __tests__/ai/advisor-chat-usage.test.ts's SEV-1 coverage for generateText.
 *
 * Found live, 2026-09-02, while sweeping for the same "spend recorded, artefact isn't"
 * shape the weekly-plan job bug turned up: cv_extraction and achievement_refinement both
 * called provider.generateStructured directly and only ever called logAIUsage on the
 * success path. A retry-exhausted schema-validation failure is up to two real, billed
 * calls with no way to recover what was spent — the identical shape the original SEV-1
 * fixed for generateText, just never extended to generateStructured's own failure mode.
 * Both now go through withUsageLogging, same as generateAdvisorReply already did.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, providerRef, monthToDateRowsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  providerRef: { current: null as MockAIProvider | null },
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
}));

// Same mock shape as advisor-chat-usage.test.ts's own — see that file's comment for why
// both createAdminClient and tryCreateAdminClient need mocking here.
vi.mock("@/lib/supabase/admin", () => {
  const adminClient = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock({ table, row }),
      select: () => ({
        eq: () => ({
          gte: async () => ({ data: monthToDateRowsRef.current, error: null }),
        }),
      }),
    }),
  };
  return {
    createAdminClient: () => adminClient,
    tryCreateAdminClient: () => adminClient,
  };
});

vi.mock("@/lib/ai/index", () => ({ getAIProvider: () => providerRef.current }));

const USER_ID = "22222222-2222-4222-8222-222222222222";

function usageInserts(): RecordedInsert[] {
  return insertMock.mock.calls.map((call) => call[0]).filter((arg) => arg.table === "ai_usage");
}

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
});

describe("extractCVData — usage recording", () => {
  test("a successful extraction is recorded in ai_usage exactly once", async () => {
    const { extractCVData } = await import("@/lib/ai/cv-extraction");
    providerRef.current!.queueStructured({
      education: [],
      activities: [],
      awards: [],
      projects: [],
      research: [],
      workExperience: [],
      skills: [],
      languages: [],
      unclassified: [],
    });

    await extractCVData({ userId: USER_ID, mimeType: "text/plain", buffer: Buffer.from("a resume") });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "cv_extraction", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage before surfacing as CVExtractionFailedError", async () => {
    const { extractCVData, CVExtractionFailedError } = await import("@/lib/ai/cv-extraction");
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "education[0].title: Required", usage: { inputTokens: 5000, outputTokens: 800 }, model: "claude-sonnet-5" }),
    );

    await expect(extractCVData({ userId: USER_ID, mimeType: "text/plain", buffer: Buffer.from("a resume") })).rejects.toBeInstanceOf(
      CVExtractionFailedError,
    );

    // The whole point: this spend used to be invisible, swallowed into a generic
    // "couldn't read this document" error with no trace in ai_usage at all.
    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "cv_extraction", input_tokens: 5000, output_tokens: 800 });
  });
});

describe("refineAchievementDescription — usage recording", () => {
  test("a successful refinement is recorded in ai_usage exactly once", async () => {
    const { refineAchievementDescription } = await import("@/lib/ai/refine-achievement");
    providerRef.current!.queueStructured({ improvedDescription: "Led weekly meetings for 12 members.", suggestedQuestions: [] });

    await refineAchievementDescription({ userId: USER_ID, achievementType: "activity", title: "Club lead", organization: null, description: "ran a club" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "achievement_refinement", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage rather than throwing silently", async () => {
    const { refineAchievementDescription } = await import("@/lib/ai/refine-achievement");
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "improvedDescription: Expected string, received number", usage: { inputTokens: 900, outputTokens: 200 }, model: "claude-sonnet-5" }),
    );

    await expect(
      refineAchievementDescription({ userId: USER_ID, achievementType: "activity", title: "Club lead", organization: null, description: "ran a club" }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: USER_ID, feature: "achievement_refinement", input_tokens: 900, output_tokens: 200 });
  });
});
