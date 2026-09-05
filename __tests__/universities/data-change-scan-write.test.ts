import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Coverage for scanUniversityDataChanges()'s write/count path — untested at the integration
 * level before this file (data-change-scan.test.ts only covers the four pure scan* sources
 * and buildUniversityChangeNotification). Scoped to the 2026-09-05 fix specifically: a
 * genuine createNotification write failure must be counted in `failed`, and a student's own
 * muted-category preference must never inflate that same count — see
 * lib/notifications/create.ts's NotificationSendOutcome and __tests__/deadlines/dedupe-and-
 * aggregation.test.ts's identical pair of tests for the sibling job. Not re-proving
 * aggregation/anti-spam here — that's this function's existing, unrelated behavior, already
 * exercised structurally by the dedupe-key upsert below; only the muted/failed distinction is
 * what changed.
 *
 * `createNotification` is mocked wholesale, same reasoning as the deadlines file: it builds
 * its own admin client internally, unrelated to the one scanUniversityDataChanges() builds.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn(async () => "sent") }));
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
          case "universityDataChangedTitle":
            return `${values?.name} — information updated`;
          case "universityDataChangedDigestTitle":
            return `${values?.count} universities updated`;
          default:
            return key;
        }
      },
      tr: (key) => key,
    };
    return strings[locale];
  }),
}));

import { scanUniversityDataChanges } from "@/lib/universities/data-change-scan";
import { createNotification } from "@/lib/notifications/create";

type Row = Record<string, unknown>;

function readOnlyTable(rows: Row[]) {
  let filtered = [...rows];
  const builder = {
    select: () => builder,
    in: (col: string, vals: unknown[]) => {
      filtered = filtered.filter((r) => vals.includes(r[col]));
      return builder;
    },
    then(onFulfilled: (result: { data: Row[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

/** The one stateful table — same reasoning as dedupe-and-aggregation.test.ts's identical
 * fixture for deadline_notification_log: real reads AND real (deduped) writes against one
 * shared backing array, matching migration 0078/0080's own uniqueness. */
function makeUniversityNotificationLogTable(backing: Row[]) {
  return {
    select: () => ({
      in: (_col: string, userIds: string[]) => Promise.resolve({ data: backing.filter((r) => userIds.includes(r.user_id as string)), error: null }),
    }),
    upsert: (rows: Row[]) => {
      for (const row of rows) {
        const exists = backing.some(
          (r) => r.user_id === row.user_id && r.university_id === row.university_id && r.source === row.source && r.last_changed_at === row.last_changed_at
        );
        if (!exists) backing.push({ ...row });
      }
      return Promise.resolve({ error: null });
    },
  };
}

let universityNotificationLogBacking: Row[];
let db: { target_universities: Row[]; universities: Row[]; profiles: Row[] };

const fakeSupabase = {
  from: (table: string) => {
    if (table === "university_notification_log") return makeUniversityNotificationLogTable(universityNotificationLogBacking);
    return readOnlyTable((db as unknown as Record<string, Row[]>)[table] ?? []);
  },
} as unknown;

const STUDENT_ID = "student-1";

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
  universityNotificationLogBacking = [];
  db = { target_universities: [], universities: [], profiles: [] };
});

/** One student, one active target university whose core facts changed after they started
 * tracking it — the simplest real hit any of the four sources can produce, sufficient to
 * drive one createNotification call without needing all four sources exercised at once. */
function primeOneHit() {
  db.target_universities = [{ user_id: STUDENT_ID, university_id: "univ-1", created_at: "2026-08-01T00:00:00Z", status: "target" }];
  db.universities = [{ id: "univ-1", name: "Yale University", last_changed_at: "2026-09-01T00:00:00Z" }];
  db.profiles = [{ id: STUDENT_ID, preferred_language: "en" }];
}

describe("scanUniversityDataChanges — write/count path (2026-09-05 fix)", () => {
  test("baseline: a genuine change is detected and sent — notified=1, failed=0", async () => {
    primeOneHit();

    const result = await scanUniversityDataChanges();

    expect(result.notified).toBe(1);
    expect(result.failed).toBe(0);
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(universityNotificationLogBacking).toEqual([expect.objectContaining({ user_id: STUDENT_ID, university_id: "univ-1", source: "university" })]);
  });

  test("a failed notification write is NOT logged as delivered, and IS counted as a real error", async () => {
    vi.mocked(createNotification).mockResolvedValueOnce("failed");
    primeOneHit();

    const first = await scanUniversityDataChanges();
    expect(first.notified).toBe(0); // the write failed, so nothing counts as delivered
    expect(first.failed).toBe(1); // 2026-09-05 fix: a genuine write error is now a counted
    // fact, not silently indistinguishable from a student who simply muted this category
    expect(universityNotificationLogBacking).toEqual([]); // and nothing was logged

    const second = await scanUniversityDataChanges(); // createNotification succeeds this time
    expect(second.notified).toBe(1);
    expect(second.failed).toBe(0);
  });

  test("a student who muted this category is NOT counted as a failure — a legitimate preference is not an error", async () => {
    vi.mocked(createNotification).mockResolvedValueOnce("muted");
    primeOneHit();

    const result = await scanUniversityDataChanges();
    expect(result.notified).toBe(0); // nothing was delivered, same observable count as "failed"...
    expect(result.failed).toBe(0); // ...but this is the exact distinction the fix exists for:
    // a muted category must never inflate the job's real error count.
    expect(universityNotificationLogBacking).toEqual([]); // still not logged as delivered either
  });
});
