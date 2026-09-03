import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * withUsageLogging's `selectModel` override (2026-09-03, the weekly_plan aggregate budget
 * package) — every other test of this function exercises it through a real feature
 * (structured-output-usage.test.ts, advisor-chat-usage.test.ts); this one targets the hook
 * itself directly, since it's shared, general-purpose plumbing every AI feature goes
 * through, not something specific to weekly_plan.
 *
 * The two things that matter: every EXISTING caller (no override passed) is byte-for-byte
 * unaffected, and a caller that DOES pass one gets its result — including the recorded
 * degraded/degradeReason in ai_usage — from the override, not from selectModelForUser,
 * so the audit trail matches what actually ran (the exact class of bug this file's own
 * SEV-1 history already exists to prevent).
 */

interface RecordedInsert {
  row: Record<string, unknown>;
}

const { insertMock, selectModelForUserMock } = vi.hoisted(() => ({
  insertMock: vi.fn<(row: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null })),
  selectModelForUserMock: vi.fn(),
}));

// Spread `actual`, not a bare replacement — resolveModelCostUsd (lib/ai/pricing.ts, a
// concurrent lane's ai_model_pricing work landed 2026-09-03) calls this module's own
// tryCreateAdminClient() independently of the createAdminClient() logAIUsage itself uses.
// A bare `{ createAdminClient: ... }` mock left tryCreateAdminClient undefined, so
// resolveModelCostUsd threw before the insert's argument list even finished evaluating —
// silently swallowed by logAIUsage's own try/catch, so insertMock was never called at all
// (every test here saw an empty usageInserts()). The real tryCreateAdminClient already
// fails open (returns null, no SUPABASE_SECRET_KEY in the test env) exactly the way
// resolveModelCostUsd's own fallback-to-estimateCostUsd path expects, so spreading it
// through needs no additional mocking of its own.
vi.mock("@/lib/supabase/admin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/supabase/admin")>();
  return {
    ...actual,
    createAdminClient: () => ({ from: () => ({ insert: (row: Record<string, unknown>) => insertMock(row) }) }),
  };
});

vi.mock("@/lib/ai/limits/budget", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/limits/budget")>();
  return { ...actual, selectModelForUser: selectModelForUserMock };
});

import { withUsageLogging } from "@/lib/ai/usage";
import type { ModelSelection } from "@/lib/ai/limits/budget";

const USER_ID = "33333333-3333-4333-8333-333333333333";

function usageInserts(): Record<string, unknown>[] {
  return insertMock.mock.calls.map((call): RecordedInsert => ({ row: call[0] })).map((c) => c.row);
}

async function fakeRun(model: string) {
  return { usage: { inputTokens: 100, outputTokens: 20 }, model };
}

beforeEach(() => {
  insertMock.mockClear();
  selectModelForUserMock.mockReset();
});

describe("withUsageLogging — default behavior (no selectModel override)", () => {
  test("every existing caller is unaffected — still resolves via selectModelForUser", async () => {
    selectModelForUserMock.mockResolvedValue({ model: "claude-sonnet-5", degraded: false, reason: "under_target", monthToDateSpendUsd: 0.1 } satisfies ModelSelection);

    await withUsageLogging({ userId: USER_ID, feature: "advisor_chat" }, fakeRun);

    expect(selectModelForUserMock).toHaveBeenCalledWith(USER_ID);
    const [row] = usageInserts();
    expect(row.model).toBe("claude-sonnet-5");
    expect(row.degraded).toBe(false);
    expect(row.degrade_reason).toBeNull();
  });
});

describe("withUsageLogging — with a selectModel override", () => {
  test("the override's result is used instead of selectModelForUser, which is never even called", async () => {
    const overrideSelection: ModelSelection = { model: "claude-haiku-4-5", degraded: true, reason: "aggregate_feature_budget", monthToDateSpendUsd: 0.05 };
    const selectModel = vi.fn().mockResolvedValue(overrideSelection);

    const result = await withUsageLogging({ userId: USER_ID, feature: "weekly_plan", selectModel }, fakeRun);

    expect(selectModel).toHaveBeenCalledWith(USER_ID);
    expect(selectModelForUserMock).not.toHaveBeenCalled();
    expect(result.model).toBe("claude-haiku-4-5");
  });

  test("the model run() actually receives comes from the override, not from selectModelForUser", async () => {
    const overrideSelection: ModelSelection = { model: "claude-haiku-4-5", degraded: true, reason: "aggregate_feature_budget", monthToDateSpendUsd: 0.05 };
    const selectModel = vi.fn().mockResolvedValue(overrideSelection);
    selectModelForUserMock.mockResolvedValue({ model: "claude-sonnet-5", degraded: false, reason: "under_target", monthToDateSpendUsd: 0.1 } satisfies ModelSelection);

    const runSpy = vi.fn(fakeRun);
    await withUsageLogging({ userId: USER_ID, feature: "weekly_plan", selectModel }, runSpy);

    expect(runSpy).toHaveBeenCalledWith("claude-haiku-4-5");
  });

  test("the logged degraded/degradeReason in ai_usage match the override, not a fabricated or default value — the audit trail must reflect what actually ran", async () => {
    const overrideSelection: ModelSelection = { model: "claude-haiku-4-5", degraded: true, reason: "aggregate_feature_budget", monthToDateSpendUsd: 0.05 };
    const selectModel = vi.fn().mockResolvedValue(overrideSelection);

    await withUsageLogging({ userId: USER_ID, feature: "weekly_plan", selectModel }, fakeRun);

    const [row] = usageInserts();
    expect(row.degraded).toBe(true);
    expect(row.degrade_reason).toBe("aggregate_feature_budget");
    expect(row.model).toBe("claude-haiku-4-5");
  });

  test("an override that does NOT degrade logs cleanly, same shape as the no-override path", async () => {
    const overrideSelection: ModelSelection = { model: "claude-sonnet-5", degraded: false, reason: "under_target", monthToDateSpendUsd: 0.1 };
    const selectModel = vi.fn().mockResolvedValue(overrideSelection);

    await withUsageLogging({ userId: USER_ID, feature: "weekly_plan", selectModel }, fakeRun);

    const [row] = usageInserts();
    expect(row.degraded).toBe(false);
    expect(row.degrade_reason).toBeNull();
  });
});
