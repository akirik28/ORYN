import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * First direct coverage of updateNotificationPreferences() (app/(app)/settings/actions.ts) —
 * there was none before this, and the function shipped with a real bug as a direct result:
 * no missing-column handling at all, so migration 0090 being unapplied made every single
 * save attempt fail with a generic, unexplained error (found live by oryn-bd, 2026-09-02).
 * lib/notifications/create.ts's read-side equivalent (categoryIsEnabled) had this from the
 * start, with tests; this write-side counterpart had neither, which is exactly the gap
 * oryn-a7 named as "why this shipped."
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));

const { eqMock, updateMock } = vi.hoisted(() => ({ eqMock: vi.fn(), updateMock: vi.fn() }));
updateMock.mockImplementation(() => ({ eq: eqMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`update-notification-preferences.test.ts: unexpected table "${table}"`);
      return { update: updateMock };
    },
  }),
}));

import { updateNotificationPreferences } from "@/app/(app)/settings/actions";
import { requireUser } from "@/lib/security/dal";
import { revalidatePath } from "next/cache";
import type { NotificationCategory } from "@/types/database";

const USER_ID = "11111111-1111-1111-1111-111111111111";

const ALL_ENABLED: Record<NotificationCategory, boolean> = {
  deadline: true,
  new_opportunity: true,
  weekly_plan: true,
  profile_update: true,
  university_data_changed: true,
  connection: true,
  message: true,
};

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  eqMock.mockReset();
  updateMock.mockClear();
  vi.mocked(revalidatePath).mockReset();
});

describe("updateNotificationPreferences — happy path", () => {
  test("no error -- returns {} and revalidates /settings", async () => {
    eqMock.mockResolvedValue({ error: null });

    const result = await updateNotificationPreferences(ALL_ENABLED);

    expect(result).toEqual({});
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  test("maps every category to its real notify_* column, not a mismatched one", async () => {
    eqMock.mockResolvedValue({ error: null });

    await updateNotificationPreferences({ ...ALL_ENABLED, weekly_plan: false, message: false });

    expect(updateMock).toHaveBeenCalledWith({
      notify_deadline: true,
      notify_new_opportunity: true,
      notify_weekly_plan: false,
      notify_profile_update: true,
      notify_university_data_changed: true,
      notify_connection: true,
      notify_message: false,
    });
  });
});

describe("updateNotificationPreferences — migration 0090 unapplied (the bug oryn-bd found)", () => {
  test("a PGRST204 naming a notify_ column returns a specific, true message -- not the generic one, and not 'try again'", async () => {
    eqMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'notify_deadline' column of 'profiles' in the schema cache" },
    });

    const result = await updateNotificationPreferences(ALL_ENABLED);

    expect(result.error).toBeDefined();
    expect(result.error).not.toBe("Couldn't update your notification settings.");
    expect(result.error?.toLowerCase()).not.toContain("try again");
  });

  test("does not call revalidatePath -- nothing actually saved, the page must not act as if it did", async () => {
    eqMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'notify_deadline' column of 'profiles' in the schema cache" },
    });

    await updateNotificationPreferences(ALL_ENABLED);

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("the same 42703 shape (a direct-Postgres read context) is also caught, not just PGRST204", async () => {
    eqMock.mockResolvedValue({
      error: { code: "42703", message: 'column "notify_message" does not exist' },
    });

    const result = await updateNotificationPreferences(ALL_ENABLED);

    expect(result.error).toBeDefined();
    expect(result.error).not.toBe("Couldn't update your notification settings.");
  });
});

describe("updateNotificationPreferences — a real failure still fails loudly, the catch is narrow", () => {
  test("an unrelated error is not mistaken for the unapplied-migration case -- gets the generic message instead", async () => {
    eqMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });

    const result = await updateNotificationPreferences(ALL_ENABLED);

    expect(result.error).toBe("Couldn't update your notification settings.");
  });

  test("a missing column that ISN'T one of the seven notify_ columns still fails generically -- the prefix check is narrow, not 'any PGRST204'", async () => {
    eqMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'display_name' column of 'profiles' in the schema cache" },
    });

    const result = await updateNotificationPreferences(ALL_ENABLED);

    expect(result.error).toBe("Couldn't update your notification settings.");
  });
});
