import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Coverage for runWithTracking (lib/jobs/run-with-tracking.ts), specifically the
 * errors_encountered write and its degradation path. No prior coverage existed for this
 * function at all before this pass.
 *
 * The degradation branch matters more than it looks: migration 0083 (errors_encountered)
 * is written but not applied, per this repo's standing "write migrations, leave them
 * unapplied" discipline — meaning the column-missing path this file exercises is the
 * NORMAL state in production right now, not an edge case. lib/plan/persist.ts already
 * proved the cost of getting this wrong: an earlier version of the identical pattern
 * without a guard took weekly-plan generation down for hours the same day it shipped.
 */

const h = vi.hoisted(() => ({
  insertResult: { data: { id: "job-1" } } as { data: { id: string } | null },
  // Consumed in call order — lets a test script exactly what each successive update()
  // returns (e.g. the first call fails with 42703, the retry succeeds).
  updateResults: [] as Array<{ error: { code?: string; message?: string } | null }>,
  updateCalls: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "external_sync_jobs") throw new Error(`unexpected table: ${table}`);
      return {
        insert: () => ({
          select: () => ({
            single: async () => h.insertResult,
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          h.updateCalls.push(payload);
          return {
            eq: async () => h.updateResults.shift() ?? { error: null },
          };
        },
      };
    },
  }),
}));

const { runWithTracking } = await import("@/lib/jobs/run-with-tracking");

beforeEach(() => {
  h.insertResult = { data: { id: "job-1" } };
  h.updateResults = [];
  h.updateCalls = [];
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("runWithTracking — errors_encountered", () => {
  test("a normal successful run writes items_processed and errors_encountered together", async () => {
    h.updateResults = [{ error: null }];

    const result = await runWithTracking("some_job", async () => ({ itemsProcessed: 4, errorsEncountered: 2, result: "ok" }));

    expect(result).toBe("ok");
    expect(h.updateCalls).toHaveLength(1);
    expect(h.updateCalls[0]).toMatchObject({ status: "succeeded", items_processed: 4, errors_encountered: 2 });
  });

  test("a job with nothing to catch reports errors_encountered: 0 explicitly, not omitted", async () => {
    h.updateResults = [{ error: null }];

    await runWithTracking("quiet_job", async () => ({ itemsProcessed: 0, errorsEncountered: 0, result: null }));

    expect(h.updateCalls[0]).toHaveProperty("errors_encountered", 0);
  });

  test("when errors_encountered doesn't exist yet (migration 0083 unapplied), retries without it and still records the run as succeeded", async () => {
    h.updateResults = [
      { error: { code: "42703", message: 'column "errors_encountered" of relation "external_sync_jobs" does not exist' } },
      { error: null },
    ];

    const result = await runWithTracking("some_job", async () => ({ itemsProcessed: 4, errorsEncountered: 2, result: "ok" }));

    expect(result).toBe("ok");
    expect(h.updateCalls).toHaveLength(2);
    // First attempt: the real write, including the not-yet-live column.
    expect(h.updateCalls[0]).toMatchObject({ status: "succeeded", items_processed: 4, errors_encountered: 2 });
    // Retry: status/items_processed still land — the column being missing degrades this
    // one field, it does not lose the run's tracked outcome entirely.
    expect(h.updateCalls[1]).toMatchObject({ status: "succeeded", items_processed: 4 });
    expect(h.updateCalls[1]).not.toHaveProperty("errors_encountered");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("errors_encountered column not yet live"), expect.objectContaining({ jobName: "some_job", errorsEncountered: 2 }));
  });

  test("a 42703 for a different column is not mistaken for the errors_encountered case — no silent retry, no thrown error either", async () => {
    h.updateResults = [{ error: { code: "42703", message: 'column "some_other_column" of relation "external_sync_jobs" does not exist' } }];

    const result = await runWithTracking("some_job", async () => ({ itemsProcessed: 1, errorsEncountered: 0, result: "ok" }));

    // The job's own result still returns — a tracking-write problem must never fail the
    // job it's tracking — but no blind retry happens for an error this code didn't
    // specifically diagnose.
    expect(result).toBe("ok");
    expect(h.updateCalls).toHaveLength(1);
    expect(console.error).toHaveBeenCalledWith("[jobs] failed to record job success", expect.objectContaining({ jobName: "some_job" }));
  });

  test("a thrown job body still records status: failed with the real error, unaffected by the errors_encountered change", async () => {
    h.updateResults = [{ error: null }];

    await expect(
      runWithTracking("some_job", async (): Promise<{ itemsProcessed: number; errorsEncountered: number; result: unknown }> => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(h.updateCalls[0]).toMatchObject({ status: "failed", error: "boom" });
    expect(h.updateCalls[0]).not.toHaveProperty("errors_encountered");
  });

  test("a failed insert (no tracked row) still runs the job body and returns its result", async () => {
    h.insertResult = { data: null };

    const result = await runWithTracking("some_job", async () => ({ itemsProcessed: 1, errorsEncountered: 0, result: "ok" }));

    expect(result).toBe("ok");
    expect(h.updateCalls).toHaveLength(0);
  });
});
