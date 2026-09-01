import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Full-engine coverage for scanDeadlines() itself — the two properties CEO's brief named
 * directly: aggregation ("a student with four deadlines inside the window gets ONE
 * notification naming four things") and the anti-spam property ("the same deadline must
 * never notify twice... write the test that proves it: same deadline, engine run twice,
 * exactly one notification"). Per-source eligibility (statuses, cycle_status,
 * verification_state) is already covered in scan-applications.test.ts,
 * scan-target-universities.test.ts, and scan.test.ts; digest copy formatting is covered in
 * build-digest-notification.test.ts. This file is scoped to what only shows up when the
 * whole engine runs: hits from different sources landing on the same student, and state
 * that has to persist correctly BETWEEN separate runs (deadline_notification_log,
 * migration 0075).
 *
 * `createNotification` is mocked wholesale — it builds its own admin Supabase client
 * internally (see lib/notifications/create.ts), unrelated to the one scanDeadlines()
 * builds for its own queries, so there's nothing to gain from routing it through the fake
 * client below. `deadline_notification_log` is the one table in the fake client that's
 * genuinely STATEFUL across calls within a test — real reads AND real (deduped) writes
 * against one shared backing array — because "does a fact persisted by run 1 change run
 * 2's behavior" is exactly the property under test.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn(async () => true) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeSupabase }));
vi.mock("@/lib/universities/canonical", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/universities/canonical")>();
  return { ...actual, loadSupersessionMap: vi.fn(async () => new Map()) };
});
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ locale }: { locale: "en" | "tr" }) => {
    const strings: Record<"en" | "tr", (key: string, values?: Record<string, unknown>) => string> = {
      en: (key, values) => {
        switch (key) {
          case "applicationDeadlineApproaching":
            return `${values?.name} — application deadline approaching.`;
          case "applicationDeadlineApproachingGeneric":
            return "An application deadline is approaching.";
          case "universityDeadlineApproaching":
            return `${values?.name} — ${values?.detail} deadline approaching.`;
          case "unnamedTargetUniversity":
            return "A target university";
          case "unnamedApplication":
            return "An application";
          case "deadlineTomorrow":
            return "Deadline tomorrow";
          case "daysUntilDeadline":
            return `${values?.days} days until deadline`;
          case "deadlineDigestTitle":
            return `${values?.count} deadlines coming up`;
          case "deadlineDigestItem":
            return `${values?.name} — ${values?.days} days`;
          case "deadlineDigestItemTomorrow":
            return `${values?.name} — tomorrow`;
          default:
            return key;
        }
      },
      tr: (key) => key, // no test below needs Turkish copy specifically
    };
    return strings[locale];
  }),
}));

import { scanDeadlines } from "@/lib/deadlines/scan";
import { createNotification } from "@/lib/notifications/create";

type Row = Record<string, unknown>;

/** Read-only table: select/eq/in/not, awaitable — same shape as every other scan*.test.ts
 * fixture in this directory. */
function readOnlyTable(rows: Row[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      filtered = filtered.filter((r) => r[col] === val);
      return builder;
    },
    in: (col: string, vals: unknown[]) => {
      filtered = filtered.filter((r) => vals.includes(r[col]));
      return builder;
    },
    not: (col: string, _op: "is", val: null) => {
      filtered = filtered.filter((r) => r[col] !== val);
      return builder;
    },
    then(onFulfilled: (result: { data: Row[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

/** The one stateful table: real reads AND real (deduped) writes against `backing`, shared
 * across every `.from("deadline_notification_log")` call for the life of the test — so a
 * row written by run 1 of scanDeadlines() is genuinely visible to run 2's own read. Upsert
 * respects the same (user_id, source, source_id, threshold_days) uniqueness migration 0075
 * enforces for real, `ignoreDuplicates` included, so this fixture can't itself hide a bug
 * a Postgres unique index would have caught. */
function makeDeadlineNotificationLogTable(backing: Row[]) {
  return {
    select: () => ({
      in: (_col: string, userIds: string[]) => Promise.resolve({ data: backing.filter((r) => userIds.includes(r.user_id as string)), error: null }),
    }),
    // Real onConflict/ignoreDuplicates options aren't needed here — the loop below already
    // implements the same dedup-on-insert behavior directly against `backing`.
    upsert: (rows: Row[]) => {
      for (const row of rows) {
        const exists = backing.some((r) => r.user_id === row.user_id && r.source === row.source && r.source_id === row.source_id && r.threshold_days === row.threshold_days);
        if (!exists) backing.push({ ...row });
      }
      return Promise.resolve({ error: null });
    },
  };
}

let deadlineNotificationLogBacking: Row[];
let db: {
  applications: Row[];
  target_universities: Row[];
  universities: Row[];
  saved_opportunities: Row[];
  opportunities: Row[];
  university_deadlines: Row[];
  profiles: Row[];
};

const fakeSupabase = {
  from: (table: string) => {
    if (table === "deadline_notification_log") return makeDeadlineNotificationLogTable(deadlineNotificationLogBacking);
    return readOnlyTable((db as unknown as Record<string, Row[]>)[table] ?? []);
  },
} as unknown;

const STUDENT_ID = "student-1";

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
  deadlineNotificationLogBacking = [];
  db = {
    applications: [],
    target_universities: [],
    universities: [],
    saved_opportunities: [],
    opportunities: [],
    university_deadlines: [],
    profiles: [],
  };
});

/** "YYYY-MM-DD" N calendar days after a fixed UTC anchor — see
 * threshold-crossed.test.ts's identical helper for why this, not a local-Date round trip. */
function daysFromAnchor(anchor: Date, daysOut: number): string {
  const utcAnchor = Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  return new Date(utcAnchor + daysOut * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

describe("scanDeadlines — aggregation across sources", () => {
  test("one student with an application AND a target-university deadline both crossing a threshold in the same run gets exactly ONE notification naming both", async () => {
    const today = new Date();
    // The application's own target_university_id ("missing-target") deliberately does not
    // resolve to any row in target_universities, so its item falls back to the generic "An
    // application" label — distinguishing it in the assertion below from the (separate,
    // resolvable) target-university-deadline hit on the same student, "target-1".
    db.applications = [{ id: "app-1", user_id: STUDENT_ID, deadline: daysFromAnchor(today, 7), target_university_id: "missing-target", status: "in_progress" }];
    db.target_universities = [{ id: "target-1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }];
    db.universities = [{ id: "univ-1", name: "Yale University" }];
    db.university_deadlines = [
      { id: "ud-1", university_id: "univ-1", program_id: null, deadline_type: "regular_decision", deadline_date: daysFromAnchor(today, 3), verification_state: "VERIFIED_CURRENT" },
    ];

    const result = await scanDeadlines();

    expect(result.notified).toBe(2); // two deadline FACTS surfaced...
    expect(createNotification).toHaveBeenCalledTimes(1); // ...inside exactly one notification ROW.
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: STUDENT_ID,
        category: "deadline",
        title: "2 deadlines coming up",
        link: "/dashboard",
      })
    );
    const body = vi.mocked(createNotification).mock.calls[0][0].body as string;
    expect(body).toContain("Yale University — regular_decision");
    expect(body).toContain("An application");
  });

  test("two DIFFERENT students each with one crossed deadline get two separate notifications, not one merged across students", async () => {
    const today = new Date();
    db.applications = [
      { id: "app-1", user_id: "student-a", deadline: daysFromAnchor(today, 7), target_university_id: "target-1", status: "in_progress" },
      { id: "app-2", user_id: "student-b", deadline: daysFromAnchor(today, 7), target_university_id: "target-1", status: "in_progress" },
    ];
    db.target_universities = [];
    db.universities = [];

    await scanDeadlines();

    expect(createNotification).toHaveBeenCalledTimes(2);
    const userIds = vi.mocked(createNotification).mock.calls.map((call) => call[0].userId).sort();
    expect(userIds).toEqual(["student-a", "student-b"]);
  });
});

describe("scanDeadlines — anti-spam: the same deadline must never notify twice for the same bucket", () => {
  test("one deadline, engine run twice with nothing changed: exactly one notification total, not two", async () => {
    const today = new Date();
    db.applications = [{ id: "app-1", user_id: STUDENT_ID, deadline: daysFromAnchor(today, 7), target_university_id: "target-1", status: "in_progress" }];
    db.target_universities = [{ id: "target-1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }];
    db.universities = [{ id: "univ-1", name: "Yale University" }];

    const first = await scanDeadlines();
    expect(first.notified).toBe(1);
    expect(createNotification).toHaveBeenCalledTimes(1);

    const second = await scanDeadlines();
    expect(second.notified).toBe(0);
    expect(createNotification).toHaveBeenCalledTimes(1); // still 1, not 2 — the whole property.

    // And the fact is genuinely persisted, not just "happened not to re-check":
    expect(deadlineNotificationLogBacking).toEqual([
      expect.objectContaining({ user_id: STUDENT_ID, source: "application", source_id: "app-1", threshold_days: 7 }),
    ]);
  });

  test("a deadline crossing into a NEARER bucket on a later run DOES re-notify — a deliberate choice, not a bug", async () => {
    const anchor = new Date();
    // Same application, same id, but its deadline is re-fetched fresh each scanDeadlines()
    // call against `today = new Date()` inside the function itself — so to simulate "14
    // days out, then later 7 days out" without controlling the clock, shift the stored
    // deadline date backward between runs by the same 7 days that would naturally pass.
    db.applications = [{ id: "app-1", user_id: STUDENT_ID, deadline: daysFromAnchor(anchor, 14), target_university_id: "target-1", status: "in_progress" }];
    db.target_universities = [{ id: "target-1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }];
    db.universities = [{ id: "univ-1", name: "Yale University" }];

    await scanDeadlines();
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: "14 days until deadline" }));

    // The deadline itself hasn't moved — 7 real days have passed, so it's now 7 days out.
    (db.applications[0] as Row).deadline = daysFromAnchor(anchor, 7);

    const second = await scanDeadlines();
    expect(second.notified).toBe(1);
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: "7 days until deadline" }));

    // Running again at the SAME 7-day bucket a third time must not notify a third time.
    const third = await scanDeadlines();
    expect(third.notified).toBe(0);
    expect(createNotification).toHaveBeenCalledTimes(2);

    expect(deadlineNotificationLogBacking).toHaveLength(2);
    expect(deadlineNotificationLogBacking.map((r) => r.threshold_days).sort((a, b) => (a as number) - (b as number))).toEqual([7, 14]);
  });

  test("a failed notification write is NOT logged as delivered — the next run gets another chance rather than silently losing the reminder forever", async () => {
    vi.mocked(createNotification).mockResolvedValueOnce(false);

    const today = new Date();
    db.applications = [{ id: "app-1", user_id: STUDENT_ID, deadline: daysFromAnchor(today, 3), target_university_id: "target-1", status: "in_progress" }];
    db.target_universities = [{ id: "target-1", user_id: STUDENT_ID, university_id: "univ-1", program_id: null, status: "target" }];
    db.universities = [{ id: "univ-1", name: "Yale University" }];

    const first = await scanDeadlines();
    expect(first.notified).toBe(0); // the write failed, so nothing counts as delivered
    expect(deadlineNotificationLogBacking).toEqual([]); // and nothing was logged

    const second = await scanDeadlines(); // this time createNotification succeeds (default mock)
    expect(second.notified).toBe(1);
    expect(createNotification).toHaveBeenCalledTimes(2);
  });
});
