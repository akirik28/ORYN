import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/notifications/create.ts's dedup catch for migration 0087
 * (notifications_new_opportunity_link_unique_idx), and its preference gate for migration 0090
 * (notify_* columns). Both are unapplied-migration guards and both are tested the same way —
 * applied and unapplied, explicitly, not just the happy path — per this codebase's own
 * standing discipline (lib/supabase/errors.ts's isUndefinedColumnError, lib/plan/persist.ts's
 * carried_forward comment).
 */

const { insertMock, profilesSelectMock } = vi.hoisted(() => ({ insertMock: vi.fn(), profilesSelectMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "notifications") return { insert: insertMock };
      if (table === "profiles") return { select: () => ({ eq: () => ({ maybeSingle: profilesSelectMock }) }) };
      throw new Error(`create.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { createNotification } from "@/lib/notifications/create";

const baseParams = { userId: "user-1", category: "new_opportunity" as const, title: "New match: Test Program", link: "/opportunities/abc123" };

beforeEach(() => {
  insertMock.mockReset();
  profilesSelectMock.mockReset();
  // Default: migration 0090 unapplied — today's actual state on most databases this runs
  // against, and the state every test in the describe blocks below (other than the dedicated
  // "preference gate" one) implicitly relies on: the gate must be a no-op unless a test
  // overrides this mock to say otherwise.
  profilesSelectMock.mockResolvedValue({
    data: null,
    error: { code: "PGRST204", message: "Could not find the 'notify_deadline' column of 'profiles' in the schema cache" },
  });
});

describe("createNotification — migration 0087 unapplied (today's actual state)", () => {
  test("no constraint exists yet, so a plain insert always succeeds -- unchanged from before this migration existed", async () => {
    insertMock.mockResolvedValue({ error: null });

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  test("two calls for the identical (user, link) both succeed while unapplied -- this is the exact bug the migration exists to close, reproduced here as the unapplied baseline", async () => {
    insertMock.mockResolvedValue({ error: null });

    const first = await createNotification(baseParams);
    const second = await createNotification(baseParams);

    expect(first).toBe(true);
    expect(second).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(2);
  });
});

describe("createNotification — migration 0087 applied, a genuine race loses cleanly", () => {
  test("a 23505 against the new_opportunity dedupe index returns true, not false -- the wanted state (student has this notification) is already satisfied by whichever call won", async () => {
    insertMock.mockResolvedValue({
      error: { code: "23505", message: 'duplicate key value violates unique constraint "notifications_new_opportunity_link_unique_idx"' },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe("createNotification — a real failure still fails loudly, the catch is narrow", () => {
  test("a unique violation on a DIFFERENT constraint is not swallowed", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505", message: 'duplicate key value violates unique constraint "notifications_pkey"' } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  test("an unrelated error (not a unique violation at all) still returns false and logs", async () => {
    insertMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  test("a thrown exception (e.g. createAdminClient failing outright) still returns false", async () => {
    insertMock.mockImplementation(() => {
      throw new Error("network error");
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("createNotification — other categories are never affected by the new_opportunity-only index", () => {
  test("a weekly_plan insert with a 23505 on an unrelated constraint still fails loudly -- this category was never meant to be covered by 0087", async () => {
    insertMock.mockResolvedValue({ error: { code: "23505", message: 'duplicate key value violates unique constraint "notifications_pkey"' } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification({ userId: "user-1", category: "weekly_plan", title: "Your weekly plan is ready", link: "/plan" });

    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("createNotification — migration 0090 preference gate", () => {
  test("category explicitly disabled -- skips the insert entirely, returns false", async () => {
    profilesSelectMock.mockResolvedValue({ data: { notify_new_opportunity: false }, error: null });

    const result = await createNotification(baseParams);

    expect(result).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("category explicitly enabled -- inserts normally, same as before 0090 existed", async () => {
    profilesSelectMock.mockResolvedValue({ data: { notify_new_opportunity: true }, error: null });
    insertMock.mockResolvedValue({ error: null });

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  test("reads the column for the category actually being created, not a different one", async () => {
    // All seven come back in one row; only weekly_plan is off. A bug that checked the wrong
    // column (e.g. always notify_deadline) would pass the "explicitly enabled" test above by
    // accident -- this is the test that would actually catch it.
    profilesSelectMock.mockResolvedValue({
      data: {
        notify_deadline: true,
        notify_new_opportunity: true,
        notify_weekly_plan: false,
        notify_profile_update: true,
        notify_university_data_changed: true,
        notify_connection: true,
        notify_message: true,
      },
      error: null,
    });
    insertMock.mockResolvedValue({ error: null });

    const weeklyPlanResult = await createNotification({ userId: "user-1", category: "weekly_plan", title: "Your weekly plan is ready", link: "/plan" });
    const opportunityResult = await createNotification(baseParams);

    expect(weeklyPlanResult).toBe(false);
    expect(opportunityResult).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1); // only the enabled category actually inserted
  });

  test("migration unapplied (undefined-column error) -- degrades to enabled, inserts normally, no warning logged", async () => {
    // This is the beforeEach default, asserted explicitly here as its own case instead of
    // staying implicit in every other test in this file.
    insertMock.mockResolvedValue({ error: null });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("an unrelated read failure on the preference check fails OPEN, not closed -- a muted notification that arrives anyway is recoverable, a real one silently dropped over an infra hiccup is not", async () => {
    profilesSelectMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    insertMock.mockResolvedValue({ error: null });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(1); // unlike the undefined-column case, this one is worth knowing about
    warnSpy.mockRestore();
  });

  test("no profile row found -- fails open rather than blocking a notification on a lookup that found nothing", async () => {
    profilesSelectMock.mockResolvedValue({ data: null, error: null });
    insertMock.mockResolvedValue({ error: null });

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  test("a null column value reads as enabled -- the real column is not-null default true, this is defense in depth for the mock layer only", async () => {
    profilesSelectMock.mockResolvedValue({ data: { notify_new_opportunity: null }, error: null });
    insertMock.mockResolvedValue({ error: null });

    const result = await createNotification(baseParams);

    expect(result).toBe(true);
  });
});
