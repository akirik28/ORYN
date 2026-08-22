import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * scanTargetUniversityDeadlines feeds the deadline-reminder job's target-university source
 * (Phase 24/30 Job B) — untested until this package, same gap closed for its two siblings
 * in __tests__/deadlines/scan.test.ts and scan-applications.test.ts. Isolated the same way:
 * mocks only `target_universities`, `university_deadlines`, `universities`, and
 * `notifications` (via a mocked createNotification). `canonicalUniversityId` is exercised
 * with a real, empty `SupersessionMap` rather than mocked — see scan-applications.test.ts's
 * header for why that's safe and representative of the common case.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));

import { scanTargetUniversityDeadlines } from "@/lib/deadlines/scan";
import { createNotification } from "@/lib/notifications/create";

type TargetUniversityRow = { id: string; user_id: string; university_id: string; program_id: string | null; status: string };
type UniversityDeadlineRow = {
  university_id: string;
  program_id: string | null;
  deadline_type: string;
  deadline_date: string | null;
  verification_state: string;
};
type UniversityRow = { id: string; name: string };
type NotificationRow = { id: string; user_id: string; category: string; link: string; created_at: string };

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
    maybeSingle: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null })),
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: {
  target_universities: TargetUniversityRow[];
  university_deadlines?: UniversityDeadlineRow[];
  universities?: UniversityRow[];
  notifications?: NotificationRow[];
}) {
  const universityDeadlines = tables.university_deadlines ?? [];
  const universities = tables.universities ?? [];
  const notifications = tables.notifications ?? [];
  return {
    from: vi.fn((table: "target_universities" | "university_deadlines" | "universities" | "notifications") => {
      if (table === "target_universities") return makeQueryBuilder(tables.target_universities);
      if (table === "university_deadlines") return makeQueryBuilder(universityDeadlines);
      if (table === "universities") return makeQueryBuilder(universities);
      return makeQueryBuilder(notifications);
    }),
  } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";
const TODAY = new Date("2026-08-22T00:00:00");
const DEADLINE_7_DAYS_OUT = "2026-08-29";
const EMPTY_SUPERSESSION_MAP = new Map();

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
});

describe("scanTargetUniversityDeadlines", () => {
  test("a university-level deadline (program_id null) notifies for any target of that university", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "some-program", status: "target" }],
      university_deadlines: [{ university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });

    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);

    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, link: "/universities/univ-1", body: "Yale University — regular_decision deadline approaching." })
    );
  });

  test("a program-specific deadline only applies to a target that picked that exact program", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [{ university_id: "univ-1", program_id: "econ-ba", deadline_type: "program_specific", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 1, checked: 1 });
  });

  test("a program-specific deadline for a DIFFERENT program than the one targeted does not apply", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [{ university_id: "univ-1", program_id: "physics-ba", deadline_type: "program_specific", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  for (const nonActionableState of ["VERIFIED_HISTORICAL", "CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]) {
    test(`a deadline with verification_state='${nonActionableState}' never notifies, even at a reminder threshold`, async () => {
      const supabase = makeSupabase({
        target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }],
        university_deadlines: [{ university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: nonActionableState }],
        universities: [{ id: "univ-1", name: "Yale University" }],
      });
      const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
      expect(result).toEqual({ notified: 0, checked: 0 });
      expect(createNotification).not.toHaveBeenCalled();
    });
  }

  test("verification_state='unverified' still notifies — only the four named states are excluded, not merely-unconfirmed ones", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }],
      university_deadlines: [{ university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "unverified" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 1, checked: 1 });
  });

  test("a target with two relevant deadlines (university-level + its own program) counts both", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: "econ-ba", status: "target" }],
      university_deadlines: [
        { university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" },
        { university_id: "univ-1", program_id: "econ-ba", deadline_type: "supplemental_essay", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" },
      ],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 2, checked: 2 });
    expect(createNotification).toHaveBeenCalledTimes(2);
  });

  test("only exploring/target/applying statuses are scanned — an accepted/withdrawn target is not", async () => {
    const supabase = makeSupabase({
      target_universities: [{ id: "t1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "accepted" }],
      university_deadlines: [{ university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: DEADLINE_7_DAYS_OUT, verification_state: "VERIFIED_CURRENT" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("no active targets returns zero without querying university_deadlines", async () => {
    const supabase = makeSupabase({ target_universities: [] });
    const result = await scanTargetUniversityDeadlines(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });
});
