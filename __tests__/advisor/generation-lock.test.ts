import { describe, expect, test, vi } from "vitest";
import { acquireAdvisorGenerationLock, releaseAdvisorGenerationLock } from "@/lib/advisor/generation-lock";

/**
 * lib/advisor/generation-lock.ts wraps migration 0110's two RPC functions. What matters here:
 * a genuinely rejected acquire (a fresh lock already held) is the one outcome that must reach
 * the caller as `null`, never swallowed; every other outcome -- 0110 unapplied, or a real,
 * unanticipated DB error -- must fail OPEN (a real ISO timestamp, generation proceeds), since
 * this mechanism must never be the reason a student's message goes unanswered. Mirrors
 * upgrade-prompt-actions.test.ts's mocking shape (a hand-built client, not the real Supabase
 * client) for the same reason: this is wiring-level coverage, not a re-test of Postgres itself.
 */

function clientWithRpc(rpcImpl: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>) {
  return { rpc: rpcImpl } as unknown as Parameters<typeof acquireAdvisorGenerationLock>[0];
}

const UNDEFINED_FUNCTION_ERROR = (fn: string) => ({ code: "PGRST202", message: `Could not find the function public.${fn} in the schema cache` });
const UNDEFINED_TABLE_ERROR = { code: "PGRST205", message: "Could not find the table 'public.advisor_generation_locks' in the schema cache" };
const UNRELATED_ERROR = { code: "57014", message: "canceling statement due to statement timeout" };

describe("acquireAdvisorGenerationLock", () => {
  test("a real acquire returns the started_at the RPC reports", async () => {
    const client = clientWithRpc(async () => ({ data: "2026-09-03T12:00:00.000Z", error: null }));
    await expect(acquireAdvisorGenerationLock(client)).resolves.toBe("2026-09-03T12:00:00.000Z");
  });

  test("a genuinely rejected acquire (fresh lock already held) returns null -- the one outcome that must not be swallowed", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: null }));
    await expect(acquireAdvisorGenerationLock(client)).resolves.toBeNull();
  });

  test("migration 0110 unapplied (undefined function) fails open with a real ISO timestamp", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: UNDEFINED_FUNCTION_ERROR("acquire_advisor_generation_lock") }));
    const result = await acquireAdvisorGenerationLock(client);
    expect(result).not.toBeNull();
    expect(new Date(result as string).toISOString()).toBe(result); // a real, parseable ISO string, not a sentinel
  });

  test("migration 0110 unapplied (undefined table) fails open the same way", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: UNDEFINED_TABLE_ERROR }));
    const result = await acquireAdvisorGenerationLock(client);
    expect(result).not.toBeNull();
  });

  test("a genuinely unexpected DB error still fails open, but is logged", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: UNRELATED_ERROR }));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await acquireAdvisorGenerationLock(client);

    expect(result).not.toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("releaseAdvisorGenerationLock", () => {
  test("calls the release RPC with the exact receipt it was given", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = clientWithRpc(rpc);

    await releaseAdvisorGenerationLock(client, "2026-09-03T12:00:00.000Z");

    expect(rpc).toHaveBeenCalledWith("release_advisor_generation_lock", { p_started_at: "2026-09-03T12:00:00.000Z" });
  });

  test("migration 0110 unapplied is a silent, expected no-op -- never warns", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: UNDEFINED_FUNCTION_ERROR("release_advisor_generation_lock") }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(releaseAdvisorGenerationLock(client, "2026-09-03T12:00:00.000Z")).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("a genuinely unexpected release failure is logged -- best-effort, but not silent", async () => {
    const client = clientWithRpc(async () => ({ data: null, error: UNRELATED_ERROR }));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await releaseAdvisorGenerationLock(client, "2026-09-03T12:00:00.000Z");

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
