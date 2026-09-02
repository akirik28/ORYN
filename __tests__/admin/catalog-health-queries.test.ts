import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * isAdminActionsTableLive and getAdminActivityTimeline (lib/admin/queries.ts) — the two
 * functions touched by a real bug live-verification caught this session: a first draft used
 * `{ head: true }` for the table-existence check, which returns `{ error: null, status: 204 }`
 * even when the table is genuinely missing (PostgREST/Supabase-js masks PGRST205 specifically
 * on HEAD requests, confirmed live). These tests pin the *logic* against the real error shape
 * a plain select returns, not the masked one — the fix (dropping `head: true`) is what makes
 * that shape actually reach this function; see that function's own comment for the full story.
 */

const { limitMock, orderMock, adminActionsSelectMock, adminActionLogSelectMock, profilesSelectMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  orderMock: vi.fn(),
  adminActionsSelectMock: vi.fn(),
  adminActionLogSelectMock: vi.fn(),
  profilesSelectMock: vi.fn(),
}));

function makeAdmin() {
  return {
    from: (table: string) => {
      if (table === "admin_actions") {
        return {
          select: (cols: string) => {
            if (cols === "id") return { limit: limitMock };
            if (cols === "*") return { order: () => ({ limit: () => adminActionsSelectMock() }) };
            throw new Error(`unexpected admin_actions select "${cols}"`);
          },
        };
      }
      if (table === "admin_action_log") {
        return { select: () => ({ order: () => ({ limit: () => adminActionLogSelectMock() }) }) };
      }
      if (table === "profiles") {
        return { select: () => ({ in: () => profilesSelectMock() }) };
      }
      throw new Error(`catalog-health-queries.test.ts: unexpected table "${table}"`);
    },
  } as never;
}

beforeEach(() => {
  limitMock.mockReset();
  orderMock.mockReset();
  adminActionsSelectMock.mockReset();
  adminActionLogSelectMock.mockReset();
  profilesSelectMock.mockReset();
});

describe("isAdminActionsTableLive", () => {
  test("a real PGRST205 (the shape a plain select actually returns for a missing table) -- reports false", async () => {
    const { isAdminActionsTableLive } = await import("@/lib/admin/queries");
    limitMock.mockResolvedValue({
      data: null,
      error: { code: "PGRST205", message: "Could not find the table 'public.admin_actions' in the schema cache" },
    });

    expect(await isAdminActionsTableLive(makeAdmin())).toBe(false);
  });

  test("no error -- the table genuinely exists -- reports true", async () => {
    const { isAdminActionsTableLive } = await import("@/lib/admin/queries");
    limitMock.mockResolvedValue({ data: [], error: null });

    expect(await isAdminActionsTableLive(makeAdmin())).toBe(true);
  });

  test("an unrecognized error still reports false -- an apply button about to write must default to not-ready, not ready, on an unknown failure", async () => {
    const { isAdminActionsTableLive } = await import("@/lib/admin/queries");
    limitMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await isAdminActionsTableLive(makeAdmin())).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("getAdminActivityTimeline", () => {
  test("merges both tables, sorted newest first, each entry carrying its own source", async () => {
    const { getAdminActivityTimeline } = await import("@/lib/admin/queries");
    adminActionsSelectMock.mockResolvedValue({
      data: [
        {
          id: "a1",
          admin_user_id: "u1",
          action: "apply_description_cleanup",
          target_table: "opportunities",
          target_id: "o1",
          reason: null,
          before_value: {},
          after_value: {},
          created_at: "2026-09-02T10:00:00.000Z",
        },
      ],
      error: null,
    });
    adminActionLogSelectMock.mockResolvedValue({
      data: [
        {
          id: "l1",
          admin_label: "CEO",
          action: "set_plan_tier",
          target_user_id: "u2",
          target_label: "A Student",
          detail: { from: "standard", to: "ultra" },
          created_at: "2026-09-02T12:00:00.000Z",
        },
      ],
      error: null,
    });
    profilesSelectMock.mockResolvedValue({ data: [{ id: "u1", display_name: "Founder" }] });

    const entries = await getAdminActivityTimeline(makeAdmin());

    expect(entries).toHaveLength(2);
    // Newest first: the admin_action_log row (12:00) before the admin_actions row (10:00).
    expect(entries[0]!.source).toBe("admin_action_log");
    expect(entries[0]!.adminLabel).toBe("CEO");
    expect(entries[1]!.source).toBe("admin_actions");
    // The label gap named in getAdminActivityTimeline's own comment: admin_actions has no
    // snapshot, so this resolves it from a batched profiles lookup instead.
    expect(entries[1]!.adminLabel).toBe("Founder");
    expect(entries[1]!.targetLabel).toBe("opportunities:o1");
  });

  test("both tables missing (pre-migration) degrades to an empty list, never throws", async () => {
    const { getAdminActivityTimeline } = await import("@/lib/admin/queries");
    adminActionsSelectMock.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "admin_actions" } });
    adminActionLogSelectMock.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "admin_action_log" } });

    await expect(getAdminActivityTimeline(makeAdmin())).resolves.toEqual([]);
  });
});
