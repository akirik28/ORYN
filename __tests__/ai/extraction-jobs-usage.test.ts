import { beforeEach, describe, expect, test, vi } from "vitest";
import { AIStructuredResponseFailedError } from "@/lib/ai/provider";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * Cost-observability coverage for the two background-job extraction features, migrated to
 * withUsageLogging 2026-09-02 alongside cv_extraction/achievement_refinement
 * (structured-output-usage.test.ts). The stakes here are sharper than for those two:
 * lib/ai/limits/job-budget.ts's checkJobBudget sums this exact month's ai_usage rows for
 * the feature to decide whether the NEXT call is allowed — a retry-exhausted failure that
 * logged nothing doesn't just lose one call's spend from view, it makes every subsequent
 * call in the run (and future runs, until the real total catches up) believe there's more
 * budget headroom than actually exists. Both jobs are scheduled to run for the first time
 * ever on the founder's first deploy, at catalogue scale, against exactly this budget.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, monthToDateRowsRef, providerRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  // Backs checkJobBudget's own read (ai_usage filtered by feature + this month) — empty by
  // default so every test here starts comfortably under budget, same reasoning as
  // advisor-chat-usage.test.ts's identical monthToDateRowsRef for the per-user cap.
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
  providerRef: { current: null as MockAIProvider | null },
}));

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

function usageInserts(): RecordedInsert[] {
  return insertMock.mock.calls.map((call) => call[0]).filter((arg) => arg.table === "ai_usage");
}

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
});

describe("extractOpportunityFromContent — usage recording", () => {
  test("a successful extraction is recorded in ai_usage exactly once, with no user_id (a catalog job, not a student's)", async () => {
    const { extractOpportunityFromContent } = await import("@/lib/ai/opportunity-extraction");
    providerRef.current!.queueStructured({
      isRealOpportunity: true,
      title: "Youth Economics Challenge",
      organization: null,
      description: null,
      category: "competition",
      country: null,
      remoteAllowed: null,
      minimumAge: null,
      maximumAge: null,
      eligibleCountries: [],
      fields: [],
      cost: null,
      fundingAvailable: null,
      deadline: null,
      startDate: null,
      endDate: null,
      applicationUrl: null,
    });

    await extractOpportunityFromContent({ sourceUrl: "https://example.org/opp", content: "some page content" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: null, feature: "opportunity_extraction", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage — the exact spend checkJobBudget's next read depends on seeing", async () => {
    const { extractOpportunityFromContent } = await import("@/lib/ai/opportunity-extraction");
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "title: Required", usage: { inputTokens: 4000, outputTokens: 500 }, model: "claude-sonnet-5" }),
    );

    await expect(
      extractOpportunityFromContent({ sourceUrl: "https://example.org/opp", content: "some page content" }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: null, feature: "opportunity_extraction", input_tokens: 4000, output_tokens: 500 });
  });

  test("a JobBudgetExceededError (over budget, before any AI call) never reaches withUsageLogging, so nothing is recorded", async () => {
    monthToDateRowsRef.current = [{ estimated_cost: 999 }]; // comfortably over the $25 default
    const { extractOpportunityFromContent } = await import("@/lib/ai/opportunity-extraction");

    await expect(extractOpportunityFromContent({ sourceUrl: "https://example.org/opp", content: "some page content" })).rejects.toThrow(
      "opportunity_extraction is over its monthly budget",
    );

    expect(providerRef.current!.structuredCalls).toHaveLength(0); // never reached the provider at all
    expect(usageInserts()).toHaveLength(0);
  });
});

describe("extractRequirementsFromContent — usage recording", () => {
  test("a successful extraction is recorded in ai_usage exactly once, with no user_id", async () => {
    const { extractRequirementsFromContent } = await import("@/lib/ai/requirement-extraction");
    providerRef.current!.queueStructured({ requirements: [] });

    await extractRequirementsFromContent({ sourceUrl: "https://example.edu/admissions", content: "some page content" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: null, feature: "requirement_extraction", input_tokens: 10, output_tokens: 10 });
  });

  test("a retry-exhausted failure still records the real, billed usage", async () => {
    const { extractRequirementsFromContent } = await import("@/lib/ai/requirement-extraction");
    providerRef.current!.queueStructured(
      new AIStructuredResponseFailedError({ lastError: "requirements[0].category: Invalid enum value", usage: { inputTokens: 3500, outputTokens: 900 }, model: "claude-sonnet-5" }),
    );

    await expect(
      extractRequirementsFromContent({ sourceUrl: "https://example.edu/admissions", content: "some page content" }),
    ).rejects.toBeInstanceOf(AIStructuredResponseFailedError);

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ user_id: null, feature: "requirement_extraction", input_tokens: 3500, output_tokens: 900 });
  });
});
