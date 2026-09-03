import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * setModelPricing (app/(app)/admin/actions.ts, migration 0100) — the write side of the
 * unpriced-calls alert's live-adjust lever. Only this one action from that file gets a
 * dedicated test, matching the established "thin admin-write wrapper" convention
 * (__tests__/admin/exchange-rate.test.ts's own header) — its input validation (empty model
 * name, negative rates) is real logic worth pinning; every other action in that file has no
 * test at all.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireAdminMock } = vi.hoisted(() => ({ requireAdminMock: vi.fn() }));
vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: requireAdminMock }));

const { upsertMock } = vi.hoisted(() => ({
  upsertMock: vi.fn<(row: unknown) => Promise<{ error: unknown }>>(async () => ({ error: null })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "ai_model_pricing") throw new Error(`model-pricing-actions.test.ts: unexpected table "${table}"`);
      return { upsert: upsertMock };
    },
  }),
}));

import { setModelPricing } from "@/app/(app)/admin/actions";
import { revalidatePath } from "next/cache";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ id: ADMIN_ID });
  upsertMock.mockReset().mockResolvedValue({ error: null });
  vi.mocked(revalidatePath).mockReset();
});

describe("setModelPricing", () => {
  test("rejects an empty model name", async () => {
    const result = await setModelPricing("", 3, 15);
    expect(result.error).toBeDefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a whitespace-only model name", async () => {
    const result = await setModelPricing("   ", 3, 15);
    expect(result.error).toBeDefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a negative input rate", async () => {
    const result = await setModelPricing("claude-future-6", -1, 15);
    expect(result.error).toBeDefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a negative output rate", async () => {
    const result = await setModelPricing("claude-future-6", 3, -1);
    expect(result.error).toBeDefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a non-finite rate", async () => {
    const result = await setModelPricing("claude-future-6", Number.NaN, 15);
    expect(result.error).toBeDefined();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("accepts a $0 rate -- a real, if unusual, value, not treated as invalid", async () => {
    const result = await setModelPricing("claude-free-tier-model", 0, 0);
    expect(result.error).toBeUndefined();
    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({ input_rate_per_million: 0, output_rate_per_million: 0 }));
  });

  test("a valid rate upserts with the model trimmed and the acting admin's id, then revalidates /admin", async () => {
    const result = await setModelPricing("  claude-future-6  ", 3.5, 17.5);

    expect(result).toEqual({});
    expect(upsertMock).toHaveBeenCalledWith({ model: "claude-future-6", input_rate_per_million: 3.5, output_rate_per_million: 17.5, updated_by: ADMIN_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  test("a database error surfaces as a message, not a thrown exception", async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: "23505", message: "conflict" } });
    const result = await setModelPricing("claude-future-6", 3, 15);
    expect(result.error).toBeDefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("migration 0100 unapplied: a specific 'not set up' message, not the generic save failure", async () => {
    upsertMock.mockResolvedValueOnce({ error: { code: "PGRST205", message: `Could not find the table 'public.ai_model_pricing' in the schema cache` } });
    const result = await setModelPricing("claude-future-6", 3, 15);
    expect(result.error).toContain("0100");
    expect(result.error).not.toBe("Couldn't save that. Please try again.");
  });
});
