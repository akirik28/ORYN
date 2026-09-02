import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * grantQuota / resetQuotaThisMonth (app/(app)/admin/actions.ts, migration 0096) — the two
 * unlike every other action in that file (none of which have dedicated tests, matching this
 * codebase's established "thin admin-write wrapper" convention, see
 * __tests__/admin/exchange-rate.test.ts's own header), these two carry real logic worth
 * pinning directly: input validation, and resetQuotaThisMonth's own remaining-effective-spend
 * arithmetic (real spend minus grants already applied this month, floored at $0, never
 * inserting a $0 row since quota_grants' own CHECK constraint would reject it anyway).
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireAdminMock } = vi.hoisted(() => ({ requireAdminMock: vi.fn() }));
vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: requireAdminMock }));

interface MockUsageRow {
  estimated_cost: number | null;
}
interface MockGrantRow {
  amount_usd: number;
}

const { insertMock, aiUsageRef, grantRowsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(row: unknown) => Promise<{ error: unknown }>>(async () => ({ error: null })),
  aiUsageRef: { current: { data: null as MockUsageRow[] | null, error: null as unknown } },
  grantRowsRef: { current: [] as MockGrantRow[] },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "quota_grants") {
        return {
          insert: insertMock,
          select: () => ({ eq: () => ({ gte: async () => ({ data: grantRowsRef.current, error: null }) }) }),
        };
      }
      if (table === "ai_usage") {
        return { select: () => ({ eq: () => ({ gte: async () => aiUsageRef.current }) }) };
      }
      throw new Error(`quota-grant-actions.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { grantQuota, resetQuotaThisMonth } from "@/app/(app)/admin/actions";
import { revalidatePath } from "next/cache";

const ADMIN_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ id: ADMIN_ID });
  insertMock.mockReset().mockResolvedValue({ error: null });
  aiUsageRef.current = { data: [], error: null };
  grantRowsRef.current = [];
  vi.mocked(revalidatePath).mockReset();
});

describe("grantQuota", () => {
  test("rejects a non-positive amount, never reaching the database", async () => {
    const zero = await grantQuota(STUDENT_ID, 0);
    const negative = await grantQuota(STUDENT_ID, -5);

    expect(zero.error).toBeDefined();
    expect(negative.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("rejects a non-finite amount", async () => {
    const result = await grantQuota(STUDENT_ID, Number.NaN);
    expect(result.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("rejects an invalid student id before ever building a query", async () => {
    const result = await grantQuota("not-a-uuid", 1);
    expect(result.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("a valid grant inserts with the acting admin's own id and revalidates /admin", async () => {
    const result = await grantQuota(STUDENT_ID, 0.5, "  goodwill top-up  ");

    expect(result).toEqual({});
    expect(insertMock).toHaveBeenCalledWith({ user_id: STUDENT_ID, amount_usd: 0.5, reason: "goodwill top-up", granted_by: ADMIN_ID });
    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  test("an empty/whitespace-only reason is stored as null, not an empty string", async () => {
    await grantQuota(STUDENT_ID, 0.5, "   ");
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  test("an omitted reason is also stored as null", async () => {
    await grantQuota(STUDENT_ID, 0.5);
    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });

  test("a database error surfaces as a message, not a thrown exception", async () => {
    insertMock.mockResolvedValueOnce({ error: { code: "23505", message: "conflict" } });
    const result = await grantQuota(STUDENT_ID, 1);
    expect(result.error).toBeDefined();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("resetQuotaThisMonth — grants exactly the remaining effective spend", () => {
  test("real spend with no prior grant this month: grants the full amount", async () => {
    aiUsageRef.current = { data: [{ estimated_cost: 0.8 }], error: null };

    const result = await resetQuotaThisMonth(STUDENT_ID);

    expect(result).toEqual({});
    expect(insertMock).toHaveBeenCalledWith({ user_id: STUDENT_ID, amount_usd: 0.8, reason: "Reset to $0 for this month", granted_by: ADMIN_ID });
  });

  test("spend partially covered by an existing grant: tops up only the remainder", async () => {
    aiUsageRef.current = { data: [{ estimated_cost: 0.8 }], error: null };
    grantRowsRef.current = [{ amount_usd: 0.3 }];

    await resetQuotaThisMonth(STUDENT_ID);

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ amount_usd: 0.5 }));
  });

  test("already fully covered — a no-op, not a $0 insert (which the CHECK constraint would reject anyway)", async () => {
    aiUsageRef.current = { data: [{ estimated_cost: 0.4 }], error: null };
    grantRowsRef.current = [{ amount_usd: 0.4 }];

    const result = await resetQuotaThisMonth(STUDENT_ID);

    expect(result).toEqual({});
    expect(insertMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("an existing grant larger than real spend is also a no-op, not a negative grant", async () => {
    aiUsageRef.current = { data: [{ estimated_cost: 0.1 }], error: null };
    grantRowsRef.current = [{ amount_usd: 5 }];

    const result = await resetQuotaThisMonth(STUDENT_ID);

    expect(result).toEqual({});
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("no spend at all this month: also a no-op, not an error", async () => {
    const result = await resetQuotaThisMonth(STUDENT_ID);
    expect(result).toEqual({});
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("an unpriced row contributes $0 to the sum, same ?? 0 convention as every other spend total", async () => {
    aiUsageRef.current = { data: [{ estimated_cost: 0.2 }, { estimated_cost: null }], error: null };

    await resetQuotaThisMonth(STUDENT_ID);

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ amount_usd: 0.2 }));
  });

  test("rejects an invalid student id before reading anything", async () => {
    const result = await resetQuotaThisMonth("not-a-uuid");
    expect(result.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("an ai_usage read failure returns an error rather than granting a wrong or zero amount", async () => {
    aiUsageRef.current = { data: null, error: { message: "connection reset" } };

    const result = await resetQuotaThisMonth(STUDENT_ID);

    expect(result.error).toBeDefined();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
