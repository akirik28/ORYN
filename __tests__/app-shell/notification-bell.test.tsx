// @vitest-environment jsdom
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

/**
 * Component-level coverage for NotificationBell (features/app-shell/notification-bell.tsx)
 * — same pattern as __tests__/dashboard/weekly-focus.test.tsx (mock the Server Action
 * module, render for real, assert on behavior via fireEvent/jsdom).
 *
 * Written for docs/feat2-error-surfacing-audit-2026-08-22.md's finding #3, the last of
 * the three: both mark-read actions here discard their result entirely
 * (`void markX(...)`), so a failed write gives the student no signal to retry — lowest
 * severity of the three findings (self-correcting: unread state re-derives from the
 * server on next load, no data loss), but still a genuinely silent failure. Fix is the
 * simplest of the three, matching requirement-checklist.tsx's plain
 * `if (result.error) toast.error(result.error)` — no optimistic client state exists here
 * to roll back (the notification list is a server-rendered prop; nothing changes it
 * client-side before the round-trip), so there's only an error to surface, unlike
 * Package 5's rollback case.
 */

vi.mock("@/app/(app)/notifications/actions", () => ({ markNotificationRead: vi.fn(), markAllNotificationsRead: vi.fn(), markNotificationsRead: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { NotificationBell } from "@/features/app-shell/notification-bell";
import { markNotificationRead, markAllNotificationsRead, markNotificationsRead } from "@/app/(app)/notifications/actions";
import { toast } from "sonner";
import type { Notification } from "@/types/database";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    user_id: "student-1",
    category: "deadline",
    title: "Deadline tomorrow",
    body: "Yale University — application deadline approaching.",
    link: "/applications/app-1",
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(markNotificationRead).mockReset();
  vi.mocked(markAllNotificationsRead).mockReset();
  vi.mocked(markNotificationsRead).mockReset();
  vi.mocked(toast.error).mockReset();
});

afterEach(() => {
  cleanup();
});

/**
 * The bell reads the active locale (`useLocale()`) to render its relative timestamps, so
 * it needs the same provider the root layout gives it in the real app. Pinned to "en" so
 * these assertions stay about mark-read behavior rather than becoming a translation test —
 * catalog content is covered in __tests__/i18n/locale.test.ts.
 */
function renderBell(notifications: Notification[], unreadCount?: number) {
  return render(
    // Real catalog, not {}: the component reads its labels from `notifications` now, and an
    // empty object made next-intl throw MISSING_MESSAGE rather than render.
    //
    // unreadCount defaults to deriving from the passed list, which is fine for these small
    // fixtures — the point of the explicit prop (see the dedicated test below) is that the
    // real caller's count can diverge from the list length once the list is capped.
    <NextIntlClientProvider locale="en" messages={en}>
      <NotificationBell notifications={notifications} unreadCount={unreadCount ?? notifications.filter((n) => !n.read_at).length} />
    </NextIntlClientProvider>,
  );
}

async function openBell() {
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  await screen.findByText("Notifications");
}

describe("NotificationBell — pinned success-path behavior", () => {
  test("clicking an unread notification marks it read, no toast", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({});
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    await waitFor(() => expect(markNotificationRead).toHaveBeenCalledWith("notif-1"));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("'Mark all read' calls the action once, no toast", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({});
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  test("clicking an already-read notification does not call markNotificationRead at all", async () => {
    renderBell([notification({ read_at: new Date().toISOString() })]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  // app/(app)/layout.tsx fetches only the 20 most recent notifications, so a student past
  // that (a real account hit 103 unread from the weekly-plan duplicate bug — see
  // lib/plan/persist.ts) has more unread than the list this component receives. The badge
  // must reflect the caller's real count, not `notifications.length` / a derived filter —
  // pinning that here so a future edit can't quietly go back to deriving it.
  test("the unread badge uses the unreadCount prop, not the length of the notifications list", async () => {
    renderBell([notification()], 103);

    expect(screen.getByText("103 unread")).toBeInTheDocument();
  });
});

describe("NotificationBell — failure path (docs/feat2-error-surfacing-audit-2026-08-22.md finding #3)", () => {
  test("a failed mark-read shows the real server error rather than nothing", async () => {
    vi.mocked(markNotificationRead).mockResolvedValue({ error: "Couldn't update notification." });
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByText("Deadline tomorrow"));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notification."));
  });

  test("a failed 'Mark all read' shows the real server error rather than nothing", async () => {
    vi.mocked(markAllNotificationsRead).mockResolvedValue({ error: "Couldn't update notifications." });
    renderBell([notification()]);
    await openBell();

    fireEvent.click(screen.getByRole("button", { name: /Mark all read/ }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn't update notifications."));
  });
});

/**
 * features/notifications/group.ts's grouping, exercised through the real component rather
 * than only the pure function — deadline (this file's default fixture category) never
 * groups, so none of the tests above touch this path at all.
 */
describe("NotificationBell — grouping (features/notifications/group.ts)", () => {
  test("three unread new_opportunity notifications render as one collapsed row, not three", async () => {
    renderBell([
      notification({ id: "opp-1", category: "new_opportunity", title: "New match: IMO", link: "/opportunities/imo" }),
      notification({ id: "opp-2", category: "new_opportunity", title: "New match: HMMT", link: "/opportunities/hmmt" }),
      notification({ id: "opp-3", category: "new_opportunity", title: "New match: RSI", link: "/opportunities/rsi" }),
    ]);
    await openBell();

    expect(screen.getByText("3 new opportunities match your profile")).toBeInTheDocument();
    expect(screen.queryByText("New match: IMO")).not.toBeInTheDocument();
  });

  test("activating the collapsed row marks every member id read in one call, not one at a time", async () => {
    vi.mocked(markNotificationsRead).mockResolvedValue({});
    renderBell([
      // Explicit, distinct created_at: groupNotifications sorts members most-recent-first,
      // and three notification() calls this close together could otherwise share a
      // millisecond (or land in real-clock order rather than array order), making an
      // exact-array assertion flaky. The set of ids marked read is what this test actually
      // cares about, not which one sorts first.
      notification({ id: "opp-1", category: "new_opportunity", link: "/opportunities/imo", created_at: "2026-09-02T10:00:03.000Z" }),
      notification({ id: "opp-2", category: "new_opportunity", link: "/opportunities/hmmt", created_at: "2026-09-02T10:00:02.000Z" }),
      notification({ id: "opp-3", category: "new_opportunity", link: "/opportunities/rsi", created_at: "2026-09-02T10:00:01.000Z" }),
    ]);
    await openBell();

    fireEvent.click(screen.getByText("3 new opportunities match your profile"));

    await waitFor(() => expect(markNotificationsRead).toHaveBeenCalledTimes(1));
    expect(new Set(vi.mocked(markNotificationsRead).mock.calls[0][0])).toEqual(new Set(["opp-1", "opp-2", "opp-3"]));
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  test("a single unread new_opportunity notification is not grouped -- renders exactly as before", async () => {
    renderBell([notification({ id: "opp-1", category: "new_opportunity", title: "New match: IMO", link: "/opportunities/imo" })]);
    await openBell();

    expect(screen.getByText("New match: IMO")).toBeInTheDocument();
    expect(screen.queryByText(/new opportunities match your profile/)).not.toBeInTheDocument();
  });

  test("mixed read and unread new_opportunity: only the unread ones collapse, the read one stays its own row", async () => {
    renderBell([
      notification({ id: "opp-read", category: "new_opportunity", title: "New match: Already Seen", link: "/opportunities/seen", read_at: new Date().toISOString() }),
      notification({ id: "opp-1", category: "new_opportunity", title: "New match: IMO", link: "/opportunities/imo" }),
      notification({ id: "opp-2", category: "new_opportunity", title: "New match: HMMT", link: "/opportunities/hmmt" }),
    ]);
    await openBell();

    expect(screen.getByText("New match: Already Seen")).toBeInTheDocument();
    expect(screen.getByText("2 new opportunities match your profile")).toBeInTheDocument();
  });

  test("deadline notifications never collapse, however many are unread -- already write-time digested", async () => {
    renderBell([notification({ id: "d1" }), notification({ id: "d2", title: "Another deadline" }), notification({ id: "d3", title: "A third deadline" })]);
    await openBell();

    expect(screen.getAllByText("Deadline tomorrow")).toHaveLength(1);
    expect(screen.getByText("Another deadline")).toBeInTheDocument();
    expect(screen.getByText("A third deadline")).toBeInTheDocument();
  });
});
