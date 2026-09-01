import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

/**
 * scanSavedOpportunityDeadlines feeds the deadline-reminder notification job (Phase 24;
 * see lib/deadlines/scan.ts's own scanDeadlines doc comment for why this is NOT Phase 30
 * Job B). Isolated from scanDeadlines' other two sources (applications, target-university
 * deadlines) the same way upcoming.test.ts isolates its sibling read-side function —
 * neither source is touched by the code under test here, so mocking them would only add
 * noise. createNotification is mocked wholesale (it builds its own admin Supabase client
 * internally, which this unit test has no business constructing) — what's under test is
 * whether scanSavedOpportunityDeadlines decides to call it at all, not notifyIfThresholdCrossed's
 * own dedup/threshold logic, which is pre-existing and untouched by this package.
 *
 * Same ordering as upcoming.test.ts, per ORYN-CEO's instruction for this package: the first
 * describe block pins current behavior for a normal, genuinely-open opportunity and must
 * keep passing after the fix; the second encodes the defect and is expected to fail against
 * the pre-fix code.
 *
 * `TRANSLATORS` (2026-09-01, notification i18n) reproduces messages/en.json's real
 * `applicationDeadlineApproaching` string for this source's body shape.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));

import { scanSavedOpportunityDeadlines } from "@/lib/deadlines/scan";
import { createNotification } from "@/lib/notifications/create";

type OpportunityRow = {
  id: string;
  title: string;
  deadline: string | null;
  cycle_status: Database["public"]["Tables"]["opportunities"]["Row"]["cycle_status"];
  /** Optional in the fixtures, defaulted to "active" by `makeSupabase` below: every real
   * row has one, and spelling it out on the dozen cases that are not about moderation would
   * bury the two that are. Set it explicitly to test the moderation gate. */
  status?: Database["public"]["Tables"]["opportunities"]["Row"]["status"];
};
type SavedOpportunityRow = { opportunity_id: string; user_id: string; status: string };
type ProfileRow = { id: string; preferred_language: string | null };
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
    // notifyIfThresholdCrossed's dedup check — this suite always wants "nothing sent
    // recently" so the threshold logic under test actually gets to run, so an empty
    // notifications table (below) makes this a no-op every time.
    maybeSingle: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null })),
    then(onFulfilled: (result: { data: T[]; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
      return Promise.resolve({ data: filtered, error: null }).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function makeSupabase(tables: { saved_opportunities: SavedOpportunityRow[]; opportunities: OpportunityRow[]; profiles?: ProfileRow[]; notifications?: NotificationRow[] }) {
  const profiles = tables.profiles ?? [];
  const notifications = tables.notifications ?? [];
  // Every real `opportunities` row has a moderation status, and since 2026-08-31 the
  // lifecycle gate reads it. Defaulting here keeps the cases that are about cycles and
  // deadlines saying only what they mean, while a case that sets it explicitly still wins.
  const opportunities = tables.opportunities.map((row) => ({ status: "active" as const, ...row }));
  return {
    from: vi.fn((table: "saved_opportunities" | "opportunities" | "profiles" | "notifications") => {
      if (table === "saved_opportunities") return makeQueryBuilder(tables.saved_opportunities);
      if (table === "opportunities") return makeQueryBuilder(opportunities);
      if (table === "profiles") return makeQueryBuilder(profiles);
      return makeQueryBuilder(notifications);
    }),
  } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";
// A fixed "today" 7 days before the deadline used throughout — 7 is one of
// REMINDER_THRESHOLDS, so a normal open opportunity is expected to notify.
const TODAY = new Date("2026-08-22T00:00:00");
const DEADLINE_7_DAYS_OUT = "2026-08-29";

const TRANSLATORS: Record<Locale, (key: string, values?: Record<string, string | number>) => string> = {
  en: (key, values) => (key === "applicationDeadlineApproaching" ? `${values?.name} — application deadline approaching.` : key),
  tr: (key, values) => (key === "applicationDeadlineApproaching" ? `${values?.name} — başvuru son tarihi yaklaşıyor.` : key),
};

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
});

describe("scanSavedOpportunityDeadlines — pinned current behavior", () => {
  test("a normal, genuinely-open opportunity at a reminder threshold notifies once", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Breakthrough Junior Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" }],
    });

    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);

    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, category: "deadline", link: "/opportunities", body: "Breakthrough Junior Challenge — application deadline approaching." })
    );
  });

  test("a saved opportunity whose deadline is not at any threshold does not notify (unchanged by this package)", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Not Due Soon", deadline: "2026-12-25", cycle_status: "open" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 0, checked: 1 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("no saved opportunities returns zero without checking anything", async () => {
    const supabase = makeSupabase({ saved_opportunities: [], opportunities: [] });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("cycle_status='unverified' at a reminder threshold still notifies — unconfirmed is not the same claim as wrong", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Conrad Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "unverified" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 1, checked: 1 });
  });

  test("a student with preferred_language='tr' gets a Turkish body", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Conrad Challenge", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" }],
      profiles: [{ id: STUDENT_ID, preferred_language: "tr" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ body: "Conrad Challenge — başvuru son tarihi yaklaşıyor." }));
  });
});

describe("scanSavedOpportunityDeadlines — cycle_status guard (this package's fix)", () => {
  test("a closed-cycle opportunity at a reminder threshold does NOT notify", async () => {
    // Same LaunchX shape as upcoming.test.ts's defect case: cycle_status='closed' with a
    // deadline that would otherwise cross a reminder threshold. Before this package's fix,
    // this test fails (a "deadline approaching" notification is sent for a closed cycle).
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "LaunchX", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "closed" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("a historical-cycle opportunity at a reminder threshold does NOT notify", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [{ opportunity_id: "opp-1", user_id: STUDENT_ID, status: "saved" }],
      opportunities: [{ id: "opp-1", title: "Old Program", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "historical" }],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 0, checked: 0 });
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("one actionable and one non-actionable saved opportunity: only the actionable one is checked and notified", async () => {
    const supabase = makeSupabase({
      saved_opportunities: [
        { opportunity_id: "opp-open", user_id: STUDENT_ID, status: "saved" },
        { opportunity_id: "opp-closed", user_id: STUDENT_ID, status: "saved" },
      ],
      opportunities: [
        { id: "opp-open", title: "Still Open", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "open" },
        { id: "opp-closed", title: "LaunchX", deadline: DEADLINE_7_DAYS_OUT, cycle_status: "closed" },
      ],
    });
    const result = await scanSavedOpportunityDeadlines(supabase, TODAY, TRANSLATORS);
    expect(result).toEqual({ notified: 1, checked: 1 });
    expect(createNotification).toHaveBeenCalledTimes(1);
  });
});
