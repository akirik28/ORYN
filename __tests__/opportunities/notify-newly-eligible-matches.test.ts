import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * notifyNewlyEligibleMatches is refreshOpportunityMatches' Phase 24 `new_opportunity` writer
 * — previously declared in `NotificationCategory` with no code path anywhere (see
 * docs/handoffs/notification-categories-audit-2026-09-01.md). Pinned directly, the same
 * shape __tests__/deadlines/notify-if-threshold-crossed.test.ts already uses for its own
 * shared-core function, rather than mocking refreshOpportunityMatches' full seven-table
 * read + real matching engine just to reach this one decision.
 *
 * `TRANSLATORS` reproduces messages/en.json / messages/tr.json's real
 * `notifications.newOpportunityMatch` string for the two keys this function calls.
 */

vi.mock("@/lib/notifications/create", () => ({ createNotification: vi.fn() }));
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async ({ locale }: { locale: "en" | "tr" }) => {
    const strings: Record<"en" | "tr", (key: string, values?: Record<string, unknown>) => string> = {
      en: (key, values) => (key === "newOpportunityMatch" ? `New match: ${values?.name}` : key),
      tr: (key, values) => (key === "newOpportunityMatch" ? `Yeni eşleşme: ${values?.name}` : key),
    };
    return strings[locale];
  }),
}));

import { notifyNewlyEligibleMatches } from "@/lib/opportunities/persist-matches";
import { createNotification } from "@/lib/notifications/create";

type NotificationRow = { id: string; user_id: string; category: string; link: string };

function makeNotificationsQueryBuilder(rows: NotificationRow[]) {
  let filtered = [...rows];
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: keyof NotificationRow, value: unknown) => {
      filtered = filtered.filter((row) => row[column] === value);
      return builder;
    }),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve({ data: filtered[0] ?? null, error: null })),
  };
  return builder;
}

function makeSupabase(existingNotifications: NotificationRow[] = []) {
  return { from: vi.fn(() => makeNotificationsQueryBuilder(existingNotifications)) } as unknown as SupabaseClient<Database>;
}

const STUDENT_ID = "student-1";

function row(opportunityId: string, overrides: Partial<{ eligible: boolean; match_score: number }> = {}) {
  return { opportunity_id: opportunityId, eligible: overrides.eligible ?? true, match_score: overrides.match_score ?? 80 };
}

const OPPORTUNITIES = [
  { id: "opp-1", title: "Breakthrough Junior Challenge" },
  { id: "opp-2", title: "Conrad Challenge" },
  { id: "opp-3", title: "LaunchX" },
  { id: "opp-4", title: "Girls Who Code" },
];

beforeEach(() => {
  vi.mocked(createNotification).mockClear();
});

describe("notifyNewlyEligibleMatches — no baseline", () => {
  test("previousMatches === null (never computed before): notifies nothing", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, null);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("previousMatches === [] (computed before, currently empty): notifies nothing", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, []);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe("notifyNewlyEligibleMatches — newly vs. already eligible", () => {
  test("an opportunity eligible now, absent from previousMatches entirely: notifies", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "opp-2", eligible: true }]);
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: STUDENT_ID, category: "new_opportunity", title: "New match: Breakthrough Junior Challenge", link: "/opportunities/opp-1" })
    );
  });

  test("an opportunity eligible now, present but ineligible in previousMatches: notifies (this is the 'newly' case)", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "opp-1", eligible: false }]);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });

  test("an opportunity eligible now AND already eligible in previousMatches: does NOT notify", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "opp-1", eligible: true }]);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("an opportunity ineligible now is never notified, regardless of previous state", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1", { eligible: false })], OPPORTUNITIES, [{ opportunity_id: "opp-9", eligible: true }]);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe("notifyNewlyEligibleMatches — the 3-per-refresh ceiling", () => {
  test("4 newly-eligible matches: only the top 3 by match_score notify", async () => {
    const supabase = makeSupabase([]);
    const rows = [row("opp-1", { match_score: 60 }), row("opp-2", { match_score: 95 }), row("opp-3", { match_score: 80 }), row("opp-4", { match_score: 70 })];
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", rows, OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).toHaveBeenCalledTimes(3);
    const notifiedTitles = vi.mocked(createNotification).mock.calls.map((c) => c[0].title);
    // Highest match_score first: opp-2 (95), opp-3 (80), opp-4 (70) — opp-1 (60) dropped.
    expect(notifiedTitles).toEqual(["New match: Conrad Challenge", "New match: LaunchX", "New match: Girls Who Code"]);
  });
});

describe("notifyNewlyEligibleMatches — dedup", () => {
  test("a notification already exists for this (user, link): does not notify again", async () => {
    const supabase = makeSupabase([{ id: "n1", user_id: STUDENT_ID, category: "new_opportunity", link: "/opportunities/opp-1" }]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test("dedup is scoped per-link — an existing notification for a DIFFERENT opportunity does not suppress this one", async () => {
    const supabase = makeSupabase([{ id: "n1", user_id: STUDENT_ID, category: "new_opportunity", link: "/opportunities/some-other-opp" }]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).toHaveBeenCalledTimes(1);
  });
});

describe("notifyNewlyEligibleMatches — locale", () => {
  test("preferred_language='tr' produces a Turkish title", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "tr", [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ title: "Yeni eşleşme: Breakthrough Junior Challenge" }));
  });

  test("no preferred_language on file defaults to English, not a crash", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, null, [row("opp-1")], OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ title: "New match: Breakthrough Junior Challenge" }));
  });
});

describe("notifyNewlyEligibleMatches — missing opportunity data", () => {
  test("a newly-eligible opportunity_id with no matching row in `opportunities` is skipped, not crashed on", async () => {
    const supabase = makeSupabase([]);
    await notifyNewlyEligibleMatches(supabase, STUDENT_ID, "en", [row("opp-does-not-exist")], OPPORTUNITIES, [{ opportunity_id: "baseline", eligible: true }]);
    expect(createNotification).not.toHaveBeenCalled();
  });
});
