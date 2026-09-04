import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getUpcomingUniversityDeadlines } from "@/lib/deadlines/upcoming";

/**
 * sourceUnverified (2026-09-04): CEO's ruling on the deadline-honesty audit's item 3 — a
 * dated, unverified deadline stays inline in its own real date-sorted position (unlike the
 * undated case, which gets its own group, since it has no date to sort by at all). This file
 * proves the flag is set correctly per row; it does NOT re-prove sort order, since this
 * package adds a field to getUpcomingUniversityDeadlines's own return values and touches no
 * filtering/sorting logic at all -- getUpcomingDeadlines' merge-then-sort
 * (lib/deadlines/upcoming.ts's own final .sort((a,b) => a.date.localeCompare(b.date))) is
 * unchanged, so an unverified row sorts by date exactly like every other row already did.
 *
 * Same hand-rolled chainable-mock approach as __tests__/deadlines/upcoming-undated.test.ts.
 */

type TargetRow = { university_id: string; program_id: string | null; status: string; user_id: string };
type DeadlineRow = {
  id: string;
  university_id: string;
  program_id: string | null;
  deadline_type: string;
  verification_state: string;
  cycle_label: string | null;
  deadline_text_verbatim: string | null;
  deadline_date: string;
};
type UniversityRow = { id: string; name: string };

function makeQueryBuilder<T extends Record<string, unknown>>(rows: T[]) {
  let filtered = [...rows];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: keyof T, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    }),
    in: vi.fn((column: keyof T, values: unknown[]) => {
      filtered = filtered.filter((row) => values.includes(row[column]));
      return builder;
    }),
    not: vi.fn((column: keyof T, _operator: "is", value: null) => {
      filtered = filtered.filter((row) => row[column] !== value);
      return builder;
    }),
    gte: vi.fn((column: keyof T, value: string) => {
      filtered = filtered.filter((row) => (row[column] as string) >= value);
      return builder;
    }),
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { target_universities: TargetRow[]; university_deadlines: DeadlineRow[]; universities: UniversityRow[] }) {
  return {
    from: vi.fn((table: "target_universities" | "university_deadlines" | "universities") => {
      if (table === "target_universities") return makeQueryBuilder(tables.target_universities);
      if (table === "university_deadlines") return makeQueryBuilder(tables.university_deadlines);
      return makeQueryBuilder(tables.universities);
    }),
  } as unknown as SupabaseClient<Database>;
}

const USER_ID = "student-1";
const TODAY = "2026-08-22";
const EMPTY_MAP = new Map();

describe("getUpcomingUniversityDeadlines — sourceUnverified", () => {
  test("a VERIFIED_CURRENT dated row is marked sourceUnverified: false", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_CURRENT", cycle_label: null, deadline_text_verbatim: null, deadline_date: "2026-09-10" },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });

    const result = await getUpcomingUniversityDeadlines(supabase, USER_ID, TODAY, EMPTY_MAP);

    expect(result).toHaveLength(1);
    expect(result[0].sourceUnverified).toBe(false);
  });

  test("an 'unverified' dated row is marked sourceUnverified: true, and still included -- not filtered out", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "unverified", cycle_label: null, deadline_text_verbatim: null, deadline_date: "2026-09-10" },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });

    const result = await getUpcomingUniversityDeadlines(supabase, USER_ID, TODAY, EMPTY_MAP);

    expect(result).toHaveLength(1);
    expect(result[0].sourceUnverified).toBe(true);
    expect(result[0].title).toBe("Carnegie Mellon University — application");
  });

  test("a mix of verified and unverified rows keeps both, each flagged independently", async () => {
    const supabase = makeSupabase({
      target_universities: [
        { university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID },
        { university_id: "uni-2", program_id: null, status: "target", user_id: USER_ID },
      ],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_CURRENT", cycle_label: null, deadline_text_verbatim: null, deadline_date: "2026-09-10" },
        { id: "d-2", university_id: "uni-2", program_id: null, deadline_type: "scholarship", verification_state: "unverified", cycle_label: null, deadline_text_verbatim: null, deadline_date: "2026-09-15" },
      ],
      universities: [
        { id: "uni-1", name: "Carnegie Mellon University" },
        { id: "uni-2", name: "Massachusetts Institute of Technology" },
      ],
    });

    const result = await getUpcomingUniversityDeadlines(supabase, USER_ID, TODAY, EMPTY_MAP);

    expect(result.map((r) => ({ title: r.title, sourceUnverified: r.sourceUnverified }))).toEqual([
      { title: "Carnegie Mellon University — application", sourceUnverified: false },
      { title: "Massachusetts Institute of Technology — scholarship", sourceUnverified: true },
    ]);
  });
});
