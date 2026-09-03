import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAllResolvedTuitionAmounts } from "@/lib/universities/queries";

// 2026-09-03 — the cost-bucket filter fix: getAllResolvedTuitionAmounts merges
// university_statistics.cost_of_attendance with university_profile_metrics'
// tuition_domestic_annual/tuition_international_annual through deriveTuitionContext's own
// priority order, so a university whose only tuition figure lives in profile_metrics stops
// being misclassified as "cost unknown" by the COST_BUCKETS filter. deriveTuitionContext's
// priority logic itself is already covered by __tests__/universities/counseling-adapter.test.ts;
// what's new and untested here is the merge across two paginated DB reads into one map, so
// these tests exercise that seam, not the priority rules a second time.

function builder(result: { data: unknown[]; count: number; error: unknown }) {
  const b: Record<string, unknown> = {
    select: () => b,
    not: () => b,
    in: () => b,
    order: () => b,
    range: () => b,
    then: (resolve: (r: typeof result) => unknown) => resolve(result),
  };
  return b;
}

/** Each `.from(table)` call consumes the next queued page for that table --
 *  getAllResolvedTuitionAmounts calls university_statistics once (via getAllCostOfAttendance)
 *  and university_profile_metrics once per page of its own loop. */
function makeSupabase(pages: {
  university_statistics?: Array<{ data: unknown[]; count: number }>;
  university_profile_metrics?: Array<{ data: unknown[]; count: number }>;
}) {
  const cursors: Record<string, number> = {};
  return {
    from: (table: string) => {
      const queue = (pages as Record<string, Array<{ data: unknown[]; count: number }> | undefined>)[table] ?? [{ data: [], count: 0 }];
      const idx = cursors[table] ?? 0;
      cursors[table] = idx + 1;
      const page = queue[Math.min(idx, queue.length - 1)];
      return builder({ ...page, error: null });
    },
  } as unknown as SupabaseClient<Database>;
}

const statsRow = (id: string, cost: number | null) => ({ university_id: id, cost_of_attendance: cost });
const metricRow = (id: string, code: string, amount: number, unit = "USD/year", precisionState = "exact") => ({
  university_id: id,
  metric_code: code,
  value_numeric: amount,
  unit,
  precision_state: precisionState,
});

describe("getAllResolvedTuitionAmounts", () => {
  test("cost_of_attendance takes priority over a profile_metrics tuition row for the same university", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [statsRow("u1", 65000)], count: 1 }],
      university_profile_metrics: [{ data: [metricRow("u1", "tuition_international_annual", 40000)], count: 1 }],
    });
    const result = await getAllResolvedTuitionAmounts(supabase);
    expect(result.get("u1")).toBe(65000);
  });

  test("a university with only an international tuition metric resolves to that amount", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [], count: 0 }],
      university_profile_metrics: [{ data: [metricRow("u2", "tuition_international_annual", 9250, "GBP/year")], count: 1 }],
    });
    const result = await getAllResolvedTuitionAmounts(supabase);
    expect(result.get("u2")).toBe(9250);
  });

  test("a university with only a domestic tuition metric resolves to that amount, including a real 0 (e.g. a German-style free public university)", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [], count: 0 }],
      university_profile_metrics: [{ data: [metricRow("u3", "tuition_domestic_annual", 0, "EUR/year")], count: 1 }],
    });
    const result = await getAllResolvedTuitionAmounts(supabase);
    expect(result.get("u3")).toBe(0);
  });

  test("international wins over domestic when both metric rows exist and cost_of_attendance is absent -- same priority deriveTuitionContext gives the browse card", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [], count: 0 }],
      university_profile_metrics: [
        {
          data: [metricRow("u4", "tuition_domestic_annual", 5000, "GBP/year"), metricRow("u4", "tuition_international_annual", 30000, "GBP/year")],
          count: 2,
        },
      ],
    });
    const result = await getAllResolvedTuitionAmounts(supabase);
    expect(result.get("u4")).toBe(30000);
  });

  test("a university with no cost_of_attendance and no tuition metric row is absent from the map, not present with a null or zero placeholder", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [statsRow("u1", 65000)], count: 1 }],
      university_profile_metrics: [{ data: [], count: 0 }],
    });
    const result = await getAllResolvedTuitionAmounts(supabase);
    expect(result.has("u5")).toBe(false);
  });

  test("refuses a partial result when the profile_metrics page count disagrees with the server's exact count", async () => {
    const supabase = makeSupabase({
      university_statistics: [{ data: [], count: 0 }],
      university_profile_metrics: [{ data: [metricRow("u6", "tuition_domestic_annual", 1000)], count: 5 }],
    });
    await expect(getAllResolvedTuitionAmounts(supabase)).rejects.toThrow(/Refusing to return a partial result/);
  });
});
