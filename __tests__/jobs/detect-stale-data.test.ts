import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DataStatus } from "@/types/database";
import {
  recomputeDataStatus,
  detectStaleUniversities,
  detectStaleUniversityRequirements,
  UNIVERSITY_STALE_AFTER_DAYS,
  UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS,
} from "@/lib/jobs/detect-stale-data";

const NOW = new Date("2026-09-01T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("recomputeDataStatus — the one real decision this job makes", () => {
  it("a fresh row younger than the threshold stays fresh (returns null: no write needed)", () => {
    expect(recomputeDataStatus("fresh", daysAgo(10), 90, NOW)).toBeNull();
  });

  it("a fresh row older than the threshold becomes stale", () => {
    expect(recomputeDataStatus("fresh", daysAgo(91), 90, NOW)).toBe("stale");
  });

  it("exactly at the threshold is not yet stale — the comparison is strictly greater-than", () => {
    expect(recomputeDataStatus("fresh", daysAgo(90), 90, NOW)).toBeNull();
  });

  it("a stale row that becomes young again (a real check landed) self-heals back to fresh", () => {
    expect(recomputeDataStatus("stale", daysAgo(1), 90, NOW)).toBe("fresh");
  });

  it("a stale row that is still old stays stale (returns null: already correct)", () => {
    expect(recomputeDataStatus("stale", daysAgo(200), 90, NOW)).toBeNull();
  });

  it.each<DataStatus>(["needs_review", "unavailable"])("never recomputes a %s row, however old its age reference is", (status) => {
    expect(recomputeDataStatus(status, daysAgo(10_000), 1, NOW)).toBeNull();
  });
});

/** Same thenable chainable-builder shape as __tests__/deadlines/scan-target-universities.test.ts's
 * makeQueryBuilder — extended with order/range (read side, real sort + slice so a future fixture
 * larger than one page would behave correctly too) and update/eq (write side, recording each
 * write rather than mutating the read fixture, so assertions can check exactly what was sent). */
function makeSupabaseMock<T extends { id: string }>(table: string, rows: T[]) {
  const state = [...rows];
  const updates: { table: string; id: string; patch: Partial<T> }[] = [];

  function selectBuilder() {
    let ordered = [...state];
    const builder = {
      order: (column: keyof T, opts?: { ascending?: boolean }) => {
        ordered = [...ordered].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return opts?.ascending === false ? -cmp : cmp;
        });
        return builder;
      },
      range: (from: number, to: number) => Promise.resolve({ data: ordered.slice(from, to + 1), error: null }),
    };
    return builder;
  }

  function updateBuilder(patch: Partial<T>) {
    return {
      eq: (column: keyof T, value: unknown) => {
        const row = state.find((r) => r[column] === value);
        if (row) updates.push({ table, id: row.id, patch });
        return Promise.resolve({ data: null, error: null });
      },
    };
  }

  const supabase = {
    from: (fromTable: string) => ({
      select: () => {
        if (fromTable !== table) throw new Error(`unexpected table in test mock: ${fromTable}`);
        return selectBuilder();
      },
      update: (patch: Partial<T>) => {
        if (fromTable !== table) throw new Error(`unexpected table in test mock: ${fromTable}`);
        return updateBuilder(patch);
      },
    }),
  };

  return { supabase: supabase as unknown as SupabaseClient<Database>, updates };
}

describe("detectStaleUniversities", () => {
  it("flags a university past the threshold as stale, leaves a recent one fresh, and never touches needs_review", async () => {
    const rows = [
      { id: "u-old", data_status: "fresh" as DataStatus, last_checked_at: daysAgo(UNIVERSITY_STALE_AFTER_DAYS + 5), created_at: daysAgo(400) },
      { id: "u-recent", data_status: "fresh" as DataStatus, last_checked_at: daysAgo(2), created_at: daysAgo(400) },
      { id: "u-review", data_status: "needs_review" as DataStatus, last_checked_at: daysAgo(UNIVERSITY_STALE_AFTER_DAYS + 500), created_at: daysAgo(600) },
    ];
    const { supabase, updates } = makeSupabaseMock("universities", rows);

    const { changes, checked } = await detectStaleUniversities(supabase, NOW);

    expect(checked).toBe(3);
    expect(changes).toEqual([{ table: "universities", id: "u-old", from: "fresh", to: "stale" }]);
    expect(updates).toEqual([{ table: "universities", id: "u-old", patch: { data_status: "stale" } }]);
  });

  it("falls back to created_at when last_checked_at was never set — a bulk-created row is aged from its own insert, not treated as ageless", async () => {
    const rows = [{ id: "u-never-checked", data_status: "fresh" as DataStatus, last_checked_at: null, created_at: daysAgo(UNIVERSITY_STALE_AFTER_DAYS + 1) }];
    const { supabase } = makeSupabaseMock("universities", rows);

    const { changes } = await detectStaleUniversities(supabase, NOW);

    expect(changes).toEqual([{ table: "universities", id: "u-never-checked", from: "fresh", to: "stale" }]);
  });
});

describe("detectStaleUniversityRequirements", () => {
  it("prefers last_checked_at over retrieved_at when both are present", async () => {
    // retrieved_at alone would be well past the threshold; last_checked_at (a real, more
    // recent re-check) is what should actually be trusted.
    const rows = [
      {
        id: "r-1",
        data_status: "fresh" as DataStatus,
        last_checked_at: daysAgo(1),
        retrieved_at: daysAgo(UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS + 100),
        created_at: daysAgo(UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS + 100),
      },
    ];
    const { supabase } = makeSupabaseMock("university_requirements", rows);

    const { changes } = await detectStaleUniversityRequirements(supabase, NOW);

    expect(changes).toEqual([]);
  });

  it("falls back to retrieved_at when last_checked_at is null — the shape most of tonight's research-corpus rows are actually in", async () => {
    const rows = [
      {
        id: "r-2",
        data_status: "fresh" as DataStatus,
        last_checked_at: null,
        retrieved_at: daysAgo(UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS + 1),
        created_at: daysAgo(1),
      },
    ];
    const { supabase } = makeSupabaseMock("university_requirements", rows);

    const { changes } = await detectStaleUniversityRequirements(supabase, NOW);

    expect(changes).toEqual([{ table: "university_requirements", id: "r-2", from: "fresh", to: "stale" }]);
  });

  it("falls back all the way to created_at when neither last_checked_at nor retrieved_at is set", async () => {
    const rows = [
      { id: "r-3", data_status: "fresh" as DataStatus, last_checked_at: null, retrieved_at: null, created_at: daysAgo(UNIVERSITY_REQUIREMENT_STALE_AFTER_DAYS + 1) },
    ];
    const { supabase } = makeSupabaseMock("university_requirements", rows);

    const { changes } = await detectStaleUniversityRequirements(supabase, NOW);

    expect(changes).toEqual([{ table: "university_requirements", id: "r-3", from: "fresh", to: "stale" }]);
  });

  it("a stale row that was genuinely re-checked recently self-heals back to fresh", async () => {
    const rows = [
      { id: "r-4", data_status: "stale" as DataStatus, last_checked_at: daysAgo(1), retrieved_at: daysAgo(500), created_at: daysAgo(500) },
    ];
    const { supabase, updates } = makeSupabaseMock("university_requirements", rows);

    const { changes } = await detectStaleUniversityRequirements(supabase, NOW);

    expect(changes).toEqual([{ table: "university_requirements", id: "r-4", from: "stale", to: "fresh" }]);
    expect(updates).toEqual([{ table: "university_requirements", id: "r-4", patch: { data_status: "fresh" } }]);
  });
});
