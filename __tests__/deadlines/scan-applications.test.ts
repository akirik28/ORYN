import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * scanApplications feeds the deadline-reminder notification job's application source
 * (Phase 24/30 Job B) — untested until this package, same gap as its saved-opportunity
 * sibling closed in __tests__/deadlines/scan.test.ts. Isolated the same way: mocks only
 * `applications`, `target_universities`, `universities`, and `notifications` (via a
 * mocked createNotification), never touching the opportunity/university-deadline sources
 * scanDeadlines also fans out to. `canonicalUniversityId` is exercised with a real, empty
 * `SupersessionMap` (a plain in-memory `Map`, not itself Supabase-backed) rather than
 * mocked — an empty map is the overwhelmingly common real case (most universities aren't
 * duplicates) and lib/universities/canonical.ts's own module comment confirms
 * `canonicalUniversityId` never throws on an id with no entry, just returns it unchanged.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));

import { scanApplications } from "@/lib/deadlines/scan";
import { createNotification } from "@/lib/notifications/create";

type ApplicationRow = {
  id: string;
  user_id: string;
  deadline: string | null;
  target_university_id: string;
  status: string;
};
type TargetUniversityRow = { id: string; university_id: string };
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
  applications: ApplicationRow[];
  target_universities?: TargetUniversityRow[];
  universities?: UniversityRow[];
  notifications?: NotificationRow[];
}) {
  const targetUniversities = tables.target_universities ?? [];
  const universities = tables.universities ?? [];
  const notifications = tables.notifications ?? [];
  return {
    from: vi.fn((table: "applications" | "target_universities" | "universities" | "notifications") => {
      if (table === "applications") return makeQueryBuilder(tables.applications);
      if (table === "target_universities") return makeQueryBuilder(targetUniversities);
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

describe("scanApplications", () => {
  test("an application at a reminder threshold notifies once, with the university name resolved", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });

    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP);

    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, category: "deadline", link: "/applications/app-1", body: "Yale University — application deadline approaching." })
    );
  });

  test("checked counts every fetched application regardless of whether its threshold was hit — differs from the opportunity source's per-row increment", async () => {
    // scanApplications sets checked = applications.length directly (the query itself
    // already filtered to deadline-not-null + active-status), unlike
    // scanSavedOpportunityDeadlines which increments checked inside the loop only for
    // actionable rows. Pinning that real difference so a future refactor toward
    // "consistency" doesn't silently change this function's semantics.
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: "2026-12-25", target_university_id: "target-1", status: "not_started" }],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 0, checked: 1 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("no matching applications returns zero without querying target_universities/universities", async () => {
    const supabase = makeSupabase({ applications: [] });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("two applications, only one at a threshold: exactly one notification", async () => {
    const supabase = makeSupabase({
      applications: [
        { id: "app-due", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "target-1", status: "in_progress" },
        { id: "app-not-due", user_id: STUDENT_ID, deadline: "2026-12-25", target_university_id: "target-1", status: "in_progress" },
      ],
      target_universities: [{ id: "target-1", university_id: "univ-1" }],
      universities: [{ id: "univ-1", name: "Yale University" }],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 1, checked: 2 });
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("an application whose target/university can't be resolved still notifies, with a generic fallback body", async () => {
    const supabase = makeSupabase({
      applications: [{ id: "app-1", user_id: STUDENT_ID, deadline: DEADLINE_7_DAYS_OUT, target_university_id: "missing-target", status: "in_progress" }],
      target_universities: [],
      universities: [],
    });
    const result = await scanApplications(supabase, TODAY, EMPTY_SUPERSESSION_MAP);
    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ body: "An application deadline is approaching." }));
  });
});
