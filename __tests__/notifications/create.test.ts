import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/notifications/create.ts's dedup catch for migration 0087
 * (notifications_new_opportunity_link_unique_idx). The whole point of this migration is that
 * it must work identically whether or not it has been applied — both paths are tested
 * explicitly here, not just the happy one, per this codebase's own standing discipline for
 * every unapplied-migration guard (lib/supabase/errors.ts's isUndefinedColumnError,
 * lib/plan/persist.ts's carried_forward comment).
 */

const { insertMock } = vi.hoisted(() => ({ insertMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "notifications") throw new Error(`create.test.ts: unexpected table "${table}"`);
      return { insert: insertMock };
    },
  }),
}));

import { createNotification } from "@/lib/notifications/create";

const baseParams = { userId: "user-1", category: "new_opportunity" as const, title: "New match: Test Program", link: "/opportunities/abc123" };

beforeEach(() => {
  insertMock.mockReset();
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
