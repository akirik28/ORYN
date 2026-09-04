import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getUpcomingUndatedUniversityDeadlines } from "@/lib/deadlines/upcoming";

/**
 * getUpcomingUndatedUniversityDeadlines (2026-09-04): a separate group from
 * getUpcomingUniversityDeadlines, for the shape the 2026-09-04 audit found — 140 of 470
 * university_deadlines rows are VERIFIED_RECURRING_UNDATED, real research invisible to a
 * date-sorted feed by construction. Same hand-rolled chainable-mock approach
 * __tests__/deadlines/upcoming.test.ts already uses, extended with .is() for the
 * deadline_date IS NULL filter this function needs that the dated one doesn't.
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
  deadline_date?: string | null;
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
    is: vi.fn((column: keyof T, value: null) => {
      filtered = filtered.filter((row) => (row[column] ?? null) === value);
      return builder;
    }),
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { target_universities: TargetRow[]; university_deadlines: DeadlineRow[]; universities: UniversityRow[] }) {
  // deadline_date defaults to null (undated) so cases about type/verification_state don't
  // also have to spell out the field this function's whole point is filtering on.
  const deadlines = tables.university_deadlines.map((row) => ({ deadline_date: null, ...row }));
  return {
    from: vi.fn((table: "target_universities" | "university_deadlines" | "universities") => {
      if (table === "target_universities") return makeQueryBuilder(tables.target_universities);
      if (table === "university_deadlines") return makeQueryBuilder(deadlines);
      return makeQueryBuilder(tables.universities);
    }),
  } as unknown as SupabaseClient<Database>;
}

const USER_ID = "student-1";
const EMPTY_MAP = new Map();

describe("getUpcomingUndatedUniversityDeadlines", () => {
  test("no active targets returns an empty list without querying deadlines", async () => {
    const supabase = makeSupabase({ target_universities: [], university_deadlines: [], universities: [] });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toEqual([]);
  });

  test("a real, verified, undated deadline is returned", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });

    const result = await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP);

    expect(result).toEqual([{ id: "university-undated-uni-1", title: "Carnegie Mellon University — application", href: "/universities/uni-1" }]);
  });

  test("a VERIFIED_HISTORICAL row is excluded even when undated — historical is never actionable", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_HISTORICAL", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toEqual([]);
  });

  test("an 'unverified' row is excluded -- this group's whole point is real, confirmed research, unlike the dated group which leaves unverified visible", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "unverified", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toEqual([]);
  });

  test("a dated row is excluded from this group even if otherwise actionable -- it belongs to getUpcomingUniversityDeadlines instead", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_CURRENT", cycle_label: null, deadline_text_verbatim: null, deadline_date: "2027-01-05" },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toEqual([]);
  });

  test("a program-specific row for a program the student has not targeted is excluded", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: "prog-other", status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: "prog-cs", deadline_type: "application", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toEqual([]);
  });

  test("a university-level row (program_id null) applies regardless of which specific program is targeted", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: "prog-cs", status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-1", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });
    expect(await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP)).toHaveLength(1);
  });

  test("multiple undated rows for one university collapse into a single entry, preferring the 'application' type", async () => {
    const supabase = makeSupabase({
      target_universities: [{ university_id: "uni-1", program_id: null, status: "target", user_id: USER_ID }],
      university_deadlines: [
        { id: "d-doc", university_id: "uni-1", program_id: null, deadline_type: "document", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
        { id: "d-app", university_id: "uni-1", program_id: null, deadline_type: "application", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
        { id: "d-sch", university_id: "uni-1", program_id: null, deadline_type: "scholarship", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [{ id: "uni-1", name: "Carnegie Mellon University" }],
    });

    const result = await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Carnegie Mellon University — application");
  });

  test("two universities each get exactly one entry, sorted alphabetically (no date to sort by)", async () => {
    const supabase = makeSupabase({
      target_universities: [
        { university_id: "uni-mit", program_id: null, status: "target", user_id: USER_ID },
        { university_id: "uni-cmu", program_id: null, status: "target", user_id: USER_ID },
      ],
      university_deadlines: [
        { id: "d-1", university_id: "uni-mit", program_id: null, deadline_type: "scholarship", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
        { id: "d-2", university_id: "uni-cmu", program_id: null, deadline_type: "document", verification_state: "VERIFIED_RECURRING_UNDATED", cycle_label: null, deadline_text_verbatim: null },
      ],
      universities: [
        { id: "uni-mit", name: "Massachusetts Institute of Technology" },
        { id: "uni-cmu", name: "Carnegie Mellon University" },
      ],
    });

    const result = await getUpcomingUndatedUniversityDeadlines(supabase, USER_ID, EMPTY_MAP);

    expect(result.map((r) => r.title)).toEqual(["Carnegie Mellon University — document", "Massachusetts Institute of Technology — scholarship"]);
  });
});
