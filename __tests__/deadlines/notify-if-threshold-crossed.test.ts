import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * notifyIfThresholdCrossed is the shared core all three lib/deadlines/scan.ts sources
 * (scanApplications, scanSavedOpportunityDeadlines, scanTargetUniversityDeadlines) call
 * to decide whether to send one deadline-reminder notification — the code that decides
 * whether a student gets told about a deadline at all, and whether they get told twice.
 * Phase 50 names both "date calculations" and "deduplication" as required test surface;
 * until this package only the opportunity source's threshold-crossing had any coverage
 * (via __tests__/deadlines/scan.test.ts, incidentally, at a single 7-day fixture), and
 * dedup had none anywhere — every prior test in this territory used an empty
 * `notifications` table specifically to sidestep it and isolate its own caller's logic.
 * This file pins the shared function directly instead.
 *
 * Coverage-only, per instruction: pin current behavior, no fix even if something looks
 * off — a finding here gets reported, not silently patched, since a "fix" to notification
 * thresholds changes what students actually receive.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));

import { notifyIfThresholdCrossed } from "@/lib/deadlines/scan";
import { createNotification } from "@/lib/notifications/create";

type NotificationRow = { id: string; user_id: string; category: string; link: string; created_at: string };

function makeNotificationsQueryBuilder(rows: NotificationRow[]) {
  let filtered = [...rows];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: keyof NotificationRow, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    }),
    gte: vi.fn((column: keyof NotificationRow, value: string) => {
      filtered = filtered.filter((row) => (row[column] as string) >= value);
      return builder;
    }),
    maybeSingle: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null })),
  };
  return builder;
}

function makeSupabase(notifications: NotificationRow[] = []) {
  return { from: vi.fn(() => makeNotificationsQueryBuilder(notifications)) } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";
const TODAY = new Date("2026-08-22T00:00:00");

function candidate(deadlineDate: string, overrides: { link?: string; userId?: string; body?: string } = {}) {
  return {
    userId: overrides.userId ?? STUDENT_ID,
    deadlineDate,
    link: overrides.link ?? "/applications/app-1",
    body: overrides.body ?? "Yale University — application deadline approaching.",
  };
}

/** Builds the "YYYY-MM-DD" a deadline column would actually hold, N calendar days after
 * TODAY — entirely via UTC arithmetic on TODAY's own (host-timezone-local) Y/M/D parts,
 * deliberately never through a local-Date-then-toISOString() round trip. That round trip
 * is timezone-dependent (this machine is UTC+3; toISOString() would shift a local
 * midnight back across the date line, landing one calendar day early) and produced 8
 * false failures against the correct, unmodified production code on the first version of
 * this file — a test-construction bug, not a product one. Confirmed directly against
 * date-fns's own differenceInCalendarDays before rewriting this way. */
function dateStringDaysFromToday(daysOut: number): string {
  const utcToday = Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  return new Date(utcToday + daysOut * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
});

describe("notifyIfThresholdCrossed — threshold matching", () => {
  const cases: { daysOut: number; expectNotify: boolean; expectedTitle?: string }[] = [
    { daysOut: 14, expectNotify: true, expectedTitle: "14 days until deadline" },
    { daysOut: 7, expectNotify: true, expectedTitle: "7 days until deadline" },
    { daysOut: 3, expectNotify: true, expectedTitle: "3 days until deadline" },
    { daysOut: 1, expectNotify: true, expectedTitle: "Deadline tomorrow" },
    { daysOut: 0, expectNotify: false },
    { daysOut: 2, expectNotify: false },
    { daysOut: 4, expectNotify: false },
    { daysOut: 6, expectNotify: false },
    { daysOut: 8, expectNotify: false },
    { daysOut: 13, expectNotify: false },
    { daysOut: 15, expectNotify: false },
    { daysOut: 30, expectNotify: false },
    { daysOut: -1, expectNotify: false },
    { daysOut: -14, expectNotify: false },
  ];

  for (const { daysOut, expectNotify, expectedTitle } of cases) {
    test(`${daysOut} day(s) out ${expectNotify ? "notifies" : "does NOT notify"}${expectedTitle ? ` (title: "${expectedTitle}")` : ""}`, async () => {
      const supabase = makeSupabase([]);

      const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate(dateStringDaysFromToday(daysOut)));

      expect(result).toBe(expectNotify);
      if (expectNotify) {
        expect(createNotification).toHaveBeenCalledWith(
          expect.objectContaining({ userId: STUDENT_ID, category: "deadline", title: expectedTitle })
        );
      } else {
        expect(createNotification).not.toHaveBeenCalled();
      }
    });
  }

  test("passes through the candidate's own body and link unchanged", async () => {
    const supabase = makeSupabase([]);
    await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29", { link: "/universities/univ-1", body: "Custom body text." }));
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ link: "/universities/univ-1", body: "Custom body text." })
    );
  });
});

describe("notifyIfThresholdCrossed — dedup", () => {
  test("a notification for the same user+category+link sent 1 hour ago suppresses a new one", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: STUDENT_ID, category: "deadline", link: "/applications/app-1", created_at: new Date(TODAY.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29"));

    expect(result).toBe(false);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("a notification sent 19 hours ago (inside the 20h window) still suppresses", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: STUDENT_ID, category: "deadline", link: "/applications/app-1", created_at: new Date(TODAY.getTime() - 19 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29"));

    expect(result).toBe(false);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("a notification sent 21 hours ago (outside the 20h window) does NOT suppress — a new one is sent", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: STUDENT_ID, category: "deadline", link: "/applications/app-1", created_at: new Date(TODAY.getTime() - 21 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29"));

    expect(result).toBe(true);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("a recent notification for a DIFFERENT link does not suppress — dedup is scoped per-link, not per-user", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: STUDENT_ID, category: "deadline", link: "/applications/some-other-app", created_at: new Date(TODAY.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29", { link: "/applications/app-1" }));

    expect(result).toBe(true);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("a recent notification of a DIFFERENT category does not suppress — dedup is scoped to category='deadline'", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: STUDENT_ID, category: "weekly_plan", link: "/applications/app-1", created_at: new Date(TODAY.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29"));

    expect(result).toBe(true);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("a recent notification for a DIFFERENT user does not suppress — dedup never crosses users", async () => {
    const supabase = makeSupabase([
      { id: "n1", user_id: "some-other-student", category: "deadline", link: "/applications/app-1", created_at: new Date(TODAY.getTime() - 1 * 60 * 60 * 1000).toISOString() },
    ]);

    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29", { userId: STUDENT_ID }));

    expect(result).toBe(true);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("no matching notifications at all: notifies normally", async () => {
    const supabase = makeSupabase([]);
    const result = await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-08-29"));
    expect(result).toBe(true);
  });

  test("a non-threshold day never even queries dedup — no notification sent regardless of history", async () => {
    const supabase = makeSupabase([]);
    const fromSpy = vi.mocked(supabase.from);

    await notifyIfThresholdCrossed(supabase, TODAY, candidate("2026-09-15")); // 24 days out, not a threshold

    expect(fromSpy).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
